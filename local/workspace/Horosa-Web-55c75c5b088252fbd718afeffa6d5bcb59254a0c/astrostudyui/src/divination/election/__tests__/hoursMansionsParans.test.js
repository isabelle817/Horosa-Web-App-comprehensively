// WP-3..6:行星时/月宿/映点/恒星交映——数学锚 + 模块行为分支。
import { eclToEq, starEq, riseHourAngle, axisLstDeg, paransAt } from '../../engine/paransLocal';
import { mansionOf, LUNAR_MANSIONS, MANSION_SPAN } from '../../data/lunarMansions';
import { runElection } from '../electionEngine';
import { buildMockResult } from './electionFixture';

function sectionOf(j, key){ return j.sections.find((s) => s.key === key); }
function msgs(sec){ return (sec.findings || []).map((f) => f.message).join('\n'); }
function setObj(r, id, patch){ Object.assign(r.chart.objects.find((o) => o.id === id), patch); return r; }

describe('paransLocal 球面三角锚', () => {
	it('eclToEq 已知点:春分0°/夏至90°/秋分180°', () => {
		expect(eclToEq(0, 0)).toEqual({ ra: 0, dec: 0 });
		const solstice = eclToEq(90, 0);
		expect(solstice.ra).toBeCloseTo(90, 6);
		expect(solstice.dec).toBeCloseTo(23.4367, 4);
		const autumn = eclToEq(180, 0);
		expect(autumn.ra).toBeCloseTo(180, 6);
		expect(autumn.dec).toBeCloseTo(0, 6);
	});

	it('starEq 反解自洽:eclToEq(λ,β) 产出的 (λ,δ) 反推得同一 (α,δ)', () => {
		[[56.17, 12], [203.85, -2], [285.32, 61]].forEach(([lon, beta]) => {
			const eq = eclToEq(lon, beta);
			const back = starEq(lon, eq.dec);
			expect(back.ra).toBeCloseTo(eq.ra, 4);
			expect(back.dec).toBeCloseTo(eq.dec, 6);
		});
	});

	it('riseHourAngle:赤道天体恒 90°;拱极返回 null', () => {
		expect(riseHourAngle(39.9, 0)).toBeCloseTo(90, 6);
		expect(riseHourAngle(60, 40)).toBeNull();   // tan60·tan40 > 1 拱极
		expect(riseHourAngle(0, 89)).toBeCloseTo(90, 4); // 赤道观测者万物半日弧 90°
	});

	it('axisLstDeg:四轴几何关系(升+落对称于中天)', () => {
		const ax = axisLstDeg(100, 20, 39.9);
		expect(ax.mc).toBe(100);
		expect(ax.ic).toBe(280);
		const dRise = (ax.mc - ax.rise + 360) % 360;
		const dSet = (ax.set - ax.mc + 360) % 360;
		expect(dRise).toBeCloseTo(dSet, 6);
	});

	it('paransAt:同赤纬同赤经天体升-升交映差 0', () => {
		const stars = [{ name_cn: '测试星', lon: 100, dec: eclToEq(100, 0).dec, avoid: false, meaning: 'x' }];
		const bodies = [{ key: 'sun', cn: '太阳', lon: 100 }];
		const hits = paransAt(39.9, bodies, stars, 2);
		const riseRise = hits.find((h) => h.starAxis === '升' && h.bodyAxis === '升');
		expect(riseRise.diffDeg).toBeCloseTo(0, 6);
	});
});

describe('月宿(28宿)边界与匹配', () => {
	it('均分边界:0°=第1宿;12.857°=第2宿;359.9°=第28宿', () => {
		expect(mansionOf(0).n).toBe(1);
		expect(mansionOf(MANSION_SPAN - 0.01).n).toBe(1);
		expect(mansionOf(MANSION_SPAN + 0.01).n).toBe(2);
		expect(mansionOf(359.9).n).toBe(28);
		expect(LUNAR_MANSIONS.length).toBe(28);
	});

	it('marriage 遇爱宿(第8宿 Alnaza)宜;travel 遇第9宿忌', () => {
		const j = runElection(buildMockResult(), 'marriage'); // fixture 月 97°→ 巨蟹7°=第8宿
		const m = msgs(sectionOf(j, 'mansions'));
		expect(m).toContain('第 8 宿 Alnaza');
		expect(m).toContain('正宜此用事');
		const r2 = setObj(buildMockResult(), 'Moon', { lon: 110, sign: 'Cancer', signlon: 20 }); // 巨蟹20°=第9宿
		const m2 = msgs(sectionOf(runElection(r2, 'travel'), 'mansions'));
		expect(m2).toContain('第 9 宿');
		expect(m2).toContain('忌此用事');
	});
});

describe('行星时模块', () => {
	it('用事星当时+值日星判定(fixture 金星时/土星日/marriage)', () => {
		const j = runElection(buildMockResult(), 'marriage');
		const m = msgs(sectionOf(j, 'planetary_hours'));
		expect(m).toContain('现值 金星 之时、土星 之日');
		expect(m).toContain('用事星 金星 正当其时');
	});

	it('凶星之时(非其所辖)给负项;日时合一给强正项', () => {
		const r = buildMockResult();
		r.chart.timerStar = 'Mars'; r.chart.dayerStar = 'Mars';
		const m = msgs(sectionOf(runElection(r, 'marriage'), 'planetary_hours'));
		expect(m).toContain('凶星 火星 之时');
		const r2 = buildMockResult();
		r2.chart.timerStar = 'Venus'; r2.chart.dayerStar = 'Venus';
		const m2 = msgs(sectionOf(runElection(r2, 'marriage'), 'planetary_hours'));
		expect(m2).toContain('日时合一');
	});
});

describe('映点模块', () => {
	it('fixture:金星反映点(335°)隐冲土星(335.5°)', () => {
		const j = runElection(buildMockResult(), 'marriage');
		const m = msgs(sectionOf(j, 'antiscia'));
		expect(m).toContain('反映点隐冲：金星');
		expect(m).toContain('土星');
	});

	it('映点隐合:构造 λ=80 映点 100 合月(97 超差)→移月至 99.5 命中', () => {
		const r = setObj(buildMockResult(), 'Jupiter', { lon: 80, sign: 'Gemini', signlon: 20 });
		setObj(r, 'Moon', { lon: 99.5, sign: 'Cancer', signlon: 9.5 });
		const m = msgs(sectionOf(runElection(r, 'marriage'), 'antiscia'));
		// 映点为对称关系,引擎按序去重报一次(月亮映点 80.5° 合木星 = 同一事实)
		const line = m.split('\n').find((x) => x.includes('映点隐合') && x.includes('木星') && x.includes('月亮'));
		expect(line).toBeTruthy();
		expect(line).toContain('差 0.5°');
	});
});

describe('恒星交映模块', () => {
	it('fixture(北纬39.9)有交映输出;缺纬度优雅跳过', () => {
		const j = runElection(buildMockResult(), 'marriage');
		const sec = sectionOf(j, 'parans');
		expect(sec.findings.length).toBeGreaterThan(0);
		const r2 = buildMockResult();
		delete r2.params.gpsLat;
		const m2 = msgs(sectionOf(runElection(r2, 'marriage'), 'parans'));
		expect(m2).toContain('缺地理纬度');
	});
});
