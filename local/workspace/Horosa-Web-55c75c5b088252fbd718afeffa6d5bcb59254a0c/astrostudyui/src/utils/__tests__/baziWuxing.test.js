/**
 * 五行力量统计 golden（通行示例权重：天干100/本气100/中气60/余气30/月令×1.5）。
 * 学理见八字大全 §9.1.1；权重可配置，此处锁默认方案的派生结果做防回归。
 * 值由 lunar.js 藏干 + 该权重独立核算（见 PR 说明）。
 */
import { buildLocalBaziResult } from '../baziLunarLocal';
import { computeWuxingStrength } from '../baziWuxing';

function statAt(date, time){
	const cols = buildLocalBaziResult({
		date, time, zone: '+08:00', lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0,
		gender: 1, timeAlg: 1,
	}).bazi;
	return cols.wuxingStat;
}

function pct(stat){
	const o = {};
	stat.scores.forEach((s) => { o[s.label] = s.percent; });
	return o;
}

describe('八字 五行力量统计（通行示例方案）', () => {
	test('2026-06-22 18:00（丙午 甲午 丁卯 己酉）→ 火旺·身强·缺水', () => {
		const stat = statAt('2026-06-22', '18:00:00');
		expect(pct(stat)).toEqual({ 木: 20, 火: 45, 土: 25, 金: 10, 水: 0 });
		expect(stat.dominant).toBe('火');
		expect(stat.weakest).toBe('水');
		expect(stat.dayMaster.element).toBe('火');
		expect(stat.dayMaster.verdict).toBe('身强');
		expect(stat.dayMaster.samePercent).toBe(65);
	});

	test('2000-01-01 12:00（己卯 丙子 戊午 戊午）→ 土旺·身强·缺金', () => {
		const stat = statAt('2000-01-01', '12:00:00');
		expect(pct(stat)).toEqual({ 木: 10.3, 火: 30.9, 土: 43.3, 金: 0, 水: 15.5 });
		expect(stat.dominant).toBe('土');
		expect(stat.weakest).toBe('金');
		expect(stat.dayMaster.element).toBe('土');
		expect(stat.dayMaster.verdict).toBe('身强');
	});

	test('权重可配置：opts.weights 覆盖默认（月令加成关闭→分布改变）', () => {
		const cols = buildLocalBaziResult({
			date: '2026-06-22', time: '18:00:00', zone: '+08:00',
			lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0, gender: 1, timeAlg: 1,
		}).bazi;
		const custom = computeWuxingStrength(cols.fourColumns, { weights: { monthMult: 1 } });
		// 月令×1 后火比重应较默认(×1.5)下降
		const fireDefault = cols.wuxingStat.scores.find((s) => s.label === '火').percent;
		const fireCustom = custom.scores.find((s) => s.label === '火').percent;
		expect(fireCustom).toBeLessThan(fireDefault);
	});

	test('total 与 scores 自洽（百分比合计≈100）', () => {
		const stat = statAt('1988-02-29', '03:30:00');
		const sum = stat.scores.reduce((a, s) => a + s.percent, 0);
		expect(Math.round(sum)).toBe(100);
	});
});

describe('八字 藏干版本（cangVersion=fenye 分野加权 真接打分·bug 修复）', () => {
	function statWith(date, time, cangVersion){
		return buildLocalBaziResult({
			date, time, zone: '+08:00', lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0,
			gender: 1, timeAlg: 1, cangVersion,
		}).bazi.wuxingStat;
	}

	test('默认 common 与历史 golden 字节一致（零回归）：2026-06-22 18:00 仍为 火45/木20/土25/金10/水0', () => {
		const stat = statWith('2026-06-22', '18:00:00', 'common');
		expect(pct(stat)).toEqual({ 木: 20, 火: 45, 土: 25, 金: 10, 水: 0 });
		expect(stat.cangVersion).toBe('common');
		expect(stat.method).toBe('通行示例');
	});

	test('切到 fenye 后五行力量分布发生改变（修复前：恒不变=死）', () => {
		const common = statWith('2026-06-22', '18:00:00', 'common');
		const fenye = statWith('2026-06-22', '18:00:00', 'fenye');
		expect(fenye.cangVersion).toBe('fenye');
		expect(fenye.method).toBe('分野加权');
		// 月柱(甲午)藏干非整月匀加权 → 至少一个五行比重与通行版不同
		const cmp = pct(common);
		const fyp = pct(fenye);
		const changed = ['木', '火', '土', '金', '水'].some((k) => cmp[k] !== fyp[k]);
		expect(changed).toBe(true);
	});

	test('fenye 下「司令≠本气」之月 必与通行版不同（自动取一例，避免依赖具体历法）', () => {
		// 月支藏干>1 且当前司令不是本气时,分野加权才与通行有别(司令=本气时两法重合,属正常)。
		// 扫一段日期,取首个满足条件者断言其分布必变,使断言对任何历法实现稳定。
		const EL_KEYS2 = ['木', '火', '土', '金', '水'];
		let foundChanged = false;
		let foundCandidate = false;
		for(let m = 1; m <= 12 && !foundChanged; m += 1){
			for(let d = 3; d <= 27 && !foundChanged; d += 4){
				const date = `2024-${`${m}`.padStart(2, '0')}-${`${d}`.padStart(2, '0')}`;
				const r = buildLocalBaziResult({
					date, time: '12:00:00', zone: '+08:00', lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0,
					gender: 1, timeAlg: 1, cangVersion: 'fenye',
				}).bazi;
				const monthBranch = r.fourColumns.month;
				const hidden = (monthBranch.stemInBranch || []).map((s) => s.cell);
				const ruler = r.fenYe && r.fenYe.ruler ? r.fenYe.ruler.gan : '';
				// 候选：月支藏干>1 且司令不是本气(末位)
				if(hidden.length > 1 && ruler && ruler !== hidden[hidden.length - 1]){
					foundCandidate = true;
					const common = statWith(date, '12:00:00', 'common');
					const fenye = statWith(date, '12:00:00', 'fenye');
					const a = pct(common); const b = pct(fenye);
					if(EL_KEYS2.some((k) => a[k] !== b[k])){ foundChanged = true; }
				}
			}
		}
		expect(foundCandidate).toBe(true);   // 一年内必有「司令≠本气」之月
		expect(foundChanged).toBe(true);     // 该类月份 分野必改打分（修复前恒不变）
	});

	test('司令缺省（无 siLingGan）退回通行整月加权，不塌成 0', () => {
		// 直接调引擎、cangVersion=fenye 但不给 siLingGan → 等价 common（月柱整月 ×1.5）。
		const cols = buildLocalBaziResult({
			date: '2026-06-22', time: '18:00:00', zone: '+08:00',
			lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0, gender: 1, timeAlg: 1,
		}).bazi.fourColumns;
		const fallback = computeWuxingStrength(cols, { cangVersion: 'fenye', siLingGan: '' });
		const common = computeWuxingStrength(cols, { cangVersion: 'common' });
		const a = {}; fallback.scores.forEach((s) => { a[s.label] = s.percent; });
		const b = {}; common.scores.forEach((s) => { b[s.label] = s.percent; });
		expect(a).toEqual(b);
	});
});
