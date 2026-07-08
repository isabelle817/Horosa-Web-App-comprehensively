// 天文馆新增 4 功能的「纯天文」核钉死:坐标反算往返一致 + 星等边界 + 角距几何。
// PlanetariumBabylon.js 顶层有 `new BABYLON.Color3()` 等(取自 window.BABYLON),
// 故导入前先注入最小 BABYLON 桩(Color3/Color4/Vector3),让模块可在 node/jsdom 编译加载。
// 这同时充当「该文件 babel/语法 OK」的编译冒烟测试(导入即编译整文件)。

class V3 {
	constructor(x, y, z){ this.x = x; this.y = y; this.z = z; }
	length(){ return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
	normalize(){ const l = this.length() || 1; return new V3(this.x / l, this.y / l, this.z / l); }
	clone(){ return new V3(this.x, this.y, this.z); }
	scale(s){ return new V3(this.x * s, this.y * s, this.z * s); }
}
const BABYLON_STUB = {
	Color3: function(r, g, b){ this.r = r; this.g = g; this.b = b; },
	Color4: function(r, g, b, a){ this.r = r; this.g = g; this.b = b; this.a = a; },
	Vector3: V3,
};
BABYLON_STUB.Color3.White = ()=>new BABYLON_STUB.Color3(1, 1, 1);
BABYLON_STUB.Vector3.Zero = ()=>new V3(0, 0, 0);

global.window = global.window || {};
global.window.BABYLON = BABYLON_STUB;
global.BABYLON = BABYLON_STUB;

// eslint-disable-next-line import/first
const {
	inverseRefractionDeg,
	horizontalToEquatorial,
	equatorialToEcliptic,
	skyDirectionFromVector,
	angularSeparationDeg,
	STAR_MAG_LIMIT_MIN,
	STAR_MAG_LIMIT_MAX,
} = require('../PlanetariumBabylon');
// eslint-disable-next-line import/first
const {
	eclipticToEquatorial,
	equatorialToHorizontal,
	atmosphericRefractionDeg,
	localSiderealDeg,
} = require('../planetariumProjection');

const J2000 = 2451545.0;
const OBS = { lat: 39.9, lon: 116.4 }; // 北京量级观测点
const JD = 2461041.7; // 2026 量级

describe('天文馆 — 编译冒烟 + 边界常量', ()=>{
	test('PlanetariumBabylon 可导入(整文件编译通过),反算辅助为函数', ()=>{
		expect(typeof horizontalToEquatorial).toBe('function');
		expect(typeof equatorialToEcliptic).toBe('function');
		expect(typeof inverseRefractionDeg).toBe('function');
		expect(typeof skyDirectionFromVector).toBe('function');
		expect(typeof angularSeparationDeg).toBe('function');
	});
	test('星等边界:默认上限 6.5(全 BSC5)、下限 1.0', ()=>{
		expect(STAR_MAG_LIMIT_MAX).toBe(6.5);
		expect(STAR_MAG_LIMIT_MIN).toBe(1.0);
	});
});

describe('天文馆 — 水平↔赤道 往返一致(equatorialToHorizontal 的逆)', ()=>{
	// 取若干赤道坐标 → 正向到 alt/az(geometric, 不折射)→ 逆向回 ra/decl,应复原。
	const samples = [
		{ ra: 30, decl: 20 },
		{ ra: 200, decl: -35 },
		{ ra: 280, decl: 60 },
		{ ra: 95.0, decl: 5.0 },
		{ ra: 350, decl: -10 },
	];
	samples.forEach(({ ra, decl })=>{
		test(`ra=${ra}, decl=${decl} 往返复原(几何,无折射)`, ()=>{
			const h = equatorialToHorizontal(ra, decl, JD, OBS, false);
			expect(h).not.toBeNull();
			// 地平线下点也应能反算(读坐标允许俯视),但折射逆只对 alt>-1 有意义,这里关折射。
			const back = horizontalToEquatorial(h.altitudeAppa, h.azimuth, JD, OBS, false);
			expect(back).not.toBeNull();
			// 赤经按圆周比较(跨 0/360)
			const dRa = ((back.ra - ra + 540) % 360) - 180;
			expect(Math.abs(dRa)).toBeLessThan(1e-6);
			expect(back.decl).toBeCloseTo(decl, 6);
		});
	});

	test('ground 折射对称:正向加折射 → 逆向去折射,复原 ra/decl(地平线以上)', ()=>{
		// 取 RA=LST(过中天,HA≈0)+ decl≈纬度 → 接近天顶,稳在地平线以上。
		const ra = localSiderealDeg(JD, OBS.lon);
		const decl = 40;
		const h = equatorialToHorizontal(ra, decl, JD, OBS, true); // 视高度(含折射)
		expect(h.altitudeAppa).toBeGreaterThan(0);
		const back = horizontalToEquatorial(h.altitudeAppa, h.azimuth, JD, OBS, true);
		const dRa = ((back.ra - ra + 540) % 360) - 180;
		// 折射逆(Bennett)与正向(Saemundsson)非严格互逆,容差放宽到 ~0.05°。
		expect(Math.abs(dRa)).toBeLessThan(0.06);
		expect(back.decl).toBeCloseTo(decl, 1);
	});
});

describe('天文馆 — 赤道↔黄道 往返一致(eclipticToEquatorial 的逆)', ()=>{
	const samples = [
		{ lon: 0, lat: 0 },
		{ lon: 90, lat: 5 },
		{ lon: 180, lat: -20 },
		{ lon: 256, lat: 12 },
		{ lon: 333, lat: -3 },
	];
	samples.forEach(({ lon, lat })=>{
		test(`lon=${lon}, lat=${lat} 黄道→赤道→黄道 复原`, ()=>{
			const eq = eclipticToEquatorial(lon, lat, J2000);
			const back = equatorialToEcliptic(eq.ra, eq.decl, J2000);
			const dLon = ((back.lon - lon + 540) % 360) - 180;
			expect(Math.abs(dLon)).toBeLessThan(1e-6);
			expect(back.lat).toBeCloseTo(lat, 6);
		});
	});
});

describe('天文馆 — 大气折射逆(Bennett)伴随 Saemundsson', ()=>{
	test('天顶附近折射≈0,逆也≈0', ()=>{
		expect(inverseRefractionDeg(89)).toBeLessThan(0.01);
	});
	test('视高度 → 去折射真高度,再正向加折射应近似复原', ()=>{
		[5, 10, 30, 60].forEach((appAlt)=>{
			const trueAlt = appAlt - inverseRefractionDeg(appAlt);
			const reApp = trueAlt + atmosphericRefractionDeg(trueAlt);
			expect(reApp).toBeCloseTo(appAlt, 1); // 两公式互逆到 ~0.05°
		});
	});
});

describe('天文馆 — 角距几何 + 方向反算', ()=>{
	test('球面角距:正交=90°、同向=0°、反向=180°', ()=>{
		const x = new V3(1, 0, 0); const y = new V3(0, 1, 0); const nx = new V3(-1, 0, 0);
		expect(angularSeparationDeg(x, y)).toBeCloseTo(90, 6);
		expect(angularSeparationDeg(x, x)).toBeCloseTo(0, 6);
		expect(angularSeparationDeg(x, nx)).toBeCloseTo(180, 6);
	});
	test('skyDirectionFromVector:+y 轴 = 天顶(高度 90°)', ()=>{
		const up = skyDirectionFromVector(new V3(0, 1, 0));
		expect(up.altitudeAppa).toBeCloseTo(90, 6);
	});
	test('skyDirectionFromVector:水平方向高度=0', ()=>{
		const horiz = skyDirectionFromVector(new V3(0, 0, 1));
		expect(horiz.altitudeAppa).toBeCloseTo(0, 6);
	});
});
