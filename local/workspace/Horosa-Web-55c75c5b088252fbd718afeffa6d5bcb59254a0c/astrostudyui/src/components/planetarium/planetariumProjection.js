// Pure celestial-coordinate projection helpers for the planetarium.
//
// IMPORTANT: this module must stay free of any BABYLON / DOM dependency so it
// can be unit-tested in node (jest). PlanetariumBabylon.js imports these and is
// the ONLY place that turns the returned alt/az into 3D vectors.
//
// Design goal (v11): the FRONTEND projection here must reproduce the backend
// Swiss Ephemeris `swisseph.azalt` (EQU2HOR / ECL2HOR, press=1000 mbar /
// temp=20 C) *apparent* alt/az — including atmospheric refraction — so that the
// paused frame (initial backend draw) and every re-projected frame (playback /
// calibration) land on the same place. Two pipelines that disagree were the
// root cause of the "labels offset" + "snap on play" bugs.
//
// Backend reference (Horosa-Web/astropy/websrv/webplanetariumsrv.py):
//   swisseph.azalt(jd, EQU2HOR|ECL2HOR, [lon,lat,height], 1000, 20, [...])
//   -> { azimuth, altitudeTrue, altitudeAppa }

const REFRACTION_PRESSURE_MBAR = 1000; // matches backend azalt press
const REFRACTION_TEMP_C = 20; // matches backend azalt temp

function degToRad(deg) {
	return (Number(deg) || 0) * Math.PI / 180;
}

function radToDeg(rad) {
	return (Number(rad) || 0) * 180 / Math.PI;
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function normalizeDegrees(deg) {
	return ((Number(deg) % 360) + 360) % 360;
}

// Greenwich Mean Sidereal Time (degrees), IAU 1982 polynomial.
function gmstDegrees(jd) {
	const d = Number(jd) - 2451545.0;
	const t = d / 36525;
	return normalizeDegrees(
		280.46061837
		+ 360.98564736629 * d
		+ 0.000387933 * t * t
		- (t * t * t) / 38710000,
	);
}

// Mean obliquity of the ecliptic (degrees), IAU 1980 — date-correct, replacing
// the previous hard-coded J2000 value (23.4392911) so coordinates track epoch.
function meanObliquityDeg(jd) {
	const t = (Number(jd) - 2451545.0) / 36525;
	const seconds = 23 * 3600 + 26 * 60 + 21.448
		- 46.8150 * t
		- 0.00059 * t * t
		+ 0.001813 * t * t * t;
	return seconds / 3600;
}

// Nutation in longitude Δψ (degrees), Meeus low-accuracy. Used only for the
// equation of the equinoxes (apparent sidereal time); ~17" magnitude.
function nutationLongitudeDeg(jd) {
	const t = (Number(jd) - 2451545.0) / 36525;
	const omega = degToRad(125.04452 - 1934.136261 * t);
	const lSun = degToRad(280.4665 + 36000.7698 * t);
	const lMoon = degToRad(218.3165 + 481267.8813 * t);
	const arcsec = -17.20 * Math.sin(omega)
		- 1.32 * Math.sin(2 * lSun)
		- 0.23 * Math.sin(2 * lMoon)
		+ 0.21 * Math.sin(2 * omega);
	return arcsec / 3600;
}

// Apparent sidereal time (degrees) = GMST + equation of the equinoxes.
function apparentSiderealDegrees(jd) {
	const eps = degToRad(meanObliquityDeg(jd));
	const eqEquinoxes = nutationLongitudeDeg(jd) * Math.cos(eps);
	return normalizeDegrees(gmstDegrees(jd) + eqEquinoxes);
}

// Atmospheric refraction (degrees) to add to a TRUE/geometric altitude.
// Saemundsson's formula, scaled to the backend's pressure/temperature so the
// frontend "apparent" altitude matches swisseph.azalt's altitudeAppa.
// Returns ~34' at the horizon, ~0 at the zenith, 0 below ~-1°.
function atmosphericRefractionDeg(trueAltDeg) {
	const alt = Number(trueAltDeg);
	if (!Number.isFinite(alt) || alt < -1) {
		return 0;
	}
	const arg = alt + 10.3 / (alt + 5.11); // degrees
	let rArcmin = 1.02 / Math.tan(degToRad(arg));
	rArcmin *= (REFRACTION_PRESSURE_MBAR / 1010) * (283 / (273 + REFRACTION_TEMP_C));
	return Math.max(0, rArcmin) / 60;
}

// Ecliptic (lon/lat, degrees) -> equatorial (ra/decl, degrees) using the
// date-correct mean obliquity. `jd` optional: falls back to J2000 obliquity.
function eclipticToEquatorial(lon, lat = 0, jd) {
	if (!Number.isFinite(Number(lon)) || !Number.isFinite(Number(lat))) {
		return null;
	}
	const obliquity = degToRad(Number.isFinite(Number(jd)) ? meanObliquityDeg(jd) : 23.4392911);
	const lonRad = degToRad(lon);
	const latRad = degToRad(lat);
	const sinDec = Math.sin(latRad) * Math.cos(obliquity)
		+ Math.cos(latRad) * Math.sin(obliquity) * Math.sin(lonRad);
	const dec = Math.asin(clamp(sinDec, -1, 1));
	const y = Math.sin(lonRad) * Math.cos(obliquity) - Math.tan(latRad) * Math.sin(obliquity);
	const x = Math.cos(lonRad);
	const ra = Math.atan2(y, x);
	return {
		ra: normalizeDegrees(radToDeg(ra)),
		decl: radToDeg(dec),
	};
}

// Equatorial (ra/decl) -> horizontal (alt/az) for the observer at `jd`.
// `altitudeAppa` is the apparent (refracted) altitude — what toSkyVector uses —
// matching swisseph; `altitudeTrue` is the geometric altitude. Azimuth keeps the
// existing convention (south-referenced; PlanetariumBabylon adds +180 in
// normalizeAzimuth/toSkyVector — do NOT change here).
function equatorialToHorizontal(ra, decl, jd, observer, applyRefraction = true) {
	if (!Number.isFinite(Number(ra)) || !Number.isFinite(Number(decl)) || !Number.isFinite(Number(jd))) {
		return null;
	}
	const obs = observer || {};
	const lat = degToRad(obs.lat || 0);
	const dec = degToRad(decl);
	const lst = normalizeDegrees(apparentSiderealDegrees(jd) + Number(obs.lon || 0));
	const ha = degToRad(normalizeDegrees(lst - Number(ra)));
	const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
	const alt = Math.asin(clamp(sinAlt, -1, 1));
	const az = Math.atan2(
		-Math.sin(ha),
		Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha),
	);
	const standardAz = normalizeDegrees(radToDeg(az));
	const trueAltDeg = radToDeg(alt);
	// 天球外观(orbit)展示几何原貌 → 不加大气折射;只有地表观测(ground)才折射(贴地平线处最大,正是用户看到的「线/星过地平线偏转」)。
	const apparentAltDeg = applyRefraction ? (trueAltDeg + atmosphericRefractionDeg(trueAltDeg)) : trueAltDeg;
	return {
		altitudeTrue: trueAltDeg,
		altitudeAppa: apparentAltDeg,
		azimuth: normalizeDegrees(standardAz + 180),
	};
}

// Project a catalog/overlay item to horizontal coords at `jd`. Prefers an
// explicit ra/decl; otherwise derives them from ecliptic lon/lat (date obliquity).
function projectedEquatorialItem(item, jd, observer, applyRefraction = true) {
	let ra = item && item.ra;
	let decl = item && item.decl;
	if ((!Number.isFinite(Number(ra)) || !Number.isFinite(Number(decl))) && item && item.lon !== undefined) {
		const eq = eclipticToEquatorial(item.lon, item.lat || 0, jd);
		if (eq) {
			ra = eq.ra;
			decl = eq.decl;
		}
	}
	const pos = equatorialToHorizontal(ra, decl, jd, observer, applyRefraction);
	if (!pos) {
		return item;
	}
	return {
		...item,
		ra,
		decl,
		...pos,
		visible: pos.altitudeAppa > 0,
		horizonState: pos.altitudeAppa > 0 ? '可见' : '地平线下',
	};
}

export {
	degToRad,
	radToDeg,
	clamp,
	normalizeDegrees,
	gmstDegrees,
	meanObliquityDeg,
	nutationLongitudeDeg,
	apparentSiderealDegrees,
	atmosphericRefractionDeg,
	eclipticToEquatorial,
	equatorialToHorizontal,
	projectedEquatorialItem,
};
