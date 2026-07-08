import {
	meanObliquityDeg,
	atmosphericRefractionDeg,
	eclipticToEquatorial,
	equatorialToHorizontal,
	projectedEquatorialItem,
} from '../planetariumProjection';

// 天文馆投影核(v11):前端必须复刻后端 swisseph.azalt 的「视位置 + 大气折射」,
// 否则暂停态(后端投影)与播放/校准态(前端投影)对不上 -> 标签偏移 + 播放瞬跳。
// 本测试用「与历元/时间无关的天文不变量」钉死公式正确性。
const J2000 = 2451545.0;

describe('planetariumProjection — 黄赤交角(按日期,非 J2000 硬编码)', ()=>{
	test('J2000 平黄赤交角 ≈ 23.4392911°', ()=>{
		expect(meanObliquityDeg(J2000)).toBeCloseTo(23.4392911, 4);
	});
	test('交角随历元缓慢减小(1994 < J2000 之后的 2026)', ()=>{
		const jd1994 = 2449493.5;
		const jd2026 = 2461041.5;
		expect(meanObliquityDeg(jd1994)).toBeGreaterThan(meanObliquityDeg(J2000));
		expect(meanObliquityDeg(J2000)).toBeGreaterThan(meanObliquityDeg(jd2026));
	});
});

describe('planetariumProjection — 黄道→赤道', ()=>{
	test('春分点(0°,0°) → ra≈0, decl≈0', ()=>{
		const eq = eclipticToEquatorial(0, 0, J2000);
		expect(eq.ra).toBeCloseTo(0, 6);
		expect(eq.decl).toBeCloseTo(0, 6);
	});
	test('夏至点(90°,0°) → ra≈90, decl≈+ε(交角)', ()=>{
		const eq = eclipticToEquatorial(90, 0, J2000);
		expect(eq.ra).toBeCloseTo(90, 4);
		expect(eq.decl).toBeCloseTo(meanObliquityDeg(J2000), 4);
	});
	test('秋分点(180°,0°) → ra≈180, decl≈0', ()=>{
		const eq = eclipticToEquatorial(180, 0, J2000);
		expect(eq.ra).toBeCloseTo(180, 4);
		expect(eq.decl).toBeCloseTo(0, 6);
	});
});

describe('planetariumProjection — 大气折射(对齐 swisseph 1000mbar/20℃)', ()=>{
	test('天顶折射 ≈ 0', ()=>{
		expect(atmosphericRefractionDeg(90)).toBeLessThan(1e-3);
	});
	test('地平线折射 ≈ 0.35°~0.6°(标准 ~34′ 量级)', ()=>{
		const r = atmosphericRefractionDeg(0);
		expect(r).toBeGreaterThan(0.35);
		expect(r).toBeLessThan(0.6);
	});
	test('折射随高度单调减小', ()=>{
		expect(atmosphericRefractionDeg(5)).toBeGreaterThan(atmosphericRefractionDeg(20));
		expect(atmosphericRefractionDeg(20)).toBeGreaterThan(atmosphericRefractionDeg(45));
		expect(atmosphericRefractionDeg(45)).toBeGreaterThan(atmosphericRefractionDeg(85));
	});
	test('地平线以下不加折射(返回 0)', ()=>{
		expect(atmosphericRefractionDeg(-2)).toBe(0);
	});
});

describe('planetariumProjection — 赤道→地平(不变量)', ()=>{
	// 北天极(decl=90°)的地平高度 = 观测纬度,与 ra/时间无关 —— 经典天文不变量。
	[0, 26.0764, 36, 51.5].forEach((lat)=>{
		test(`北天极真高度 ≈ 观测纬度 ${lat}°`, ()=>{
			const pos = equatorialToHorizontal(123.4, 90, 2449493.5, { lat, lon: 116 });
			expect(pos.altitudeTrue).toBeCloseTo(lat, 5);
		});
	});
	test('地平线以上:视高度 = 真高度 + 折射(> 真高度)', ()=>{
		const pos = equatorialToHorizontal(0, 36, J2000, { lat: 36, lon: 0 });
		// 该星过中天附近(高度高),折射很小但为正
		expect(pos.altitudeAppa).toBeGreaterThan(pos.altitudeTrue);
		expect(pos.altitudeAppa - pos.altitudeTrue).toBeLessThan(0.05);
	});
	test('方位角落在 [0,360)', ()=>{
		const pos = equatorialToHorizontal(200, -10, J2000, { lat: 36, lon: 116 });
		expect(pos.azimuth).toBeGreaterThanOrEqual(0);
		expect(pos.azimuth).toBeLessThan(360);
	});
});

describe('planetariumProjection — projectedEquatorialItem', ()=>{
	test('缺 ra/decl 时按黄经 lon 推导(星宿/黄道标签路径)', ()=>{
		const item = { lon: 90, lat: 0, name: '测试宿' };
		const p = projectedEquatorialItem(item, J2000, { lat: 36, lon: 116 });
		expect(Number.isFinite(p.ra)).toBe(true);
		expect(Number.isFinite(p.decl)).toBe(true);
		// 夏至黄经 → decl 接近 +交角
		expect(p.decl).toBeCloseTo(meanObliquityDeg(J2000), 3);
	});
	test('可见性按视高度标注', ()=>{
		const below = projectedEquatorialItem({ ra: 0, decl: -90 }, J2000, { lat: 36, lon: 116 });
		expect(below.visible).toBe(false);
		expect(below.horizonState).toBe('地平线下');
		const above = projectedEquatorialItem({ ra: 123.4, decl: 90 }, J2000, { lat: 36, lon: 116 });
		expect(above.visible).toBe(true);
		expect(above.horizonState).toBe('可见');
	});
});

describe('planetariumProjection — ① 天球外观去折射开关(applyRefraction)', ()=>{
	const obs = { lat: 40, lon: 116 };
	const jd = 2461041.5;

	test('地表观测(默认 applyRefraction=true):altitudeAppa ≥ altitudeTrue(带折射)', ()=>{
		const g = equatorialToHorizontal(80, 20, jd, obs);
		expect(g.altitudeAppa).toBeGreaterThanOrEqual(g.altitudeTrue);
	});
	test('天球外观(applyRefraction=false):altitudeAppa === altitudeTrue(几何原貌、过地平线不偏转)', ()=>{
		const o = equatorialToHorizontal(80, 20, jd, obs, false);
		expect(o.altitudeAppa).toBeCloseTo(o.altitudeTrue, 10);
	});
	test('折射量:贴地平线>0、天顶≈0(关闭后归零)', ()=>{
		expect(atmosphericRefractionDeg(0)).toBeGreaterThan(0.3);
		expect(atmosphericRefractionDeg(89)).toBeCloseTo(0, 2);
	});
	test('projectedEquatorialItem 透传 applyRefraction', ()=>{
		const item = { ra: 80, decl: 20 };
		const ground = projectedEquatorialItem(item, jd, obs, true);
		const orbit = projectedEquatorialItem(item, jd, obs, false);
		expect(orbit.altitudeAppa).toBeCloseTo(orbit.altitudeTrue, 10);
		expect(ground.altitudeAppa).toBeGreaterThanOrEqual(ground.altitudeTrue);
	});
});
