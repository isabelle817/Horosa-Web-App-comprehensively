/**
 * 调候用神（速查版）golden（§6.3 十干×十二月速查表）。
 * 逐抽样核对转录（主用在前），并验集成 + 寒暖燥湿标注。
 */
import { computeTiaoHou } from '../baziTiaoHou';
import { buildLocalBaziResult } from '../baziLunarLocal';

function P(gan, zhi){ return { day: { stem: { cell: gan } }, month: { branch: { cell: zhi } } }; }

describe('调候用神速查版 · 转录抽样', () => {
	test.each([
		['甲', '寅', ['丙', '癸']],
		['甲', '子', ['丁', '庚', '丙']],
		['乙', '子', ['丙']],
		['丙', '午', ['壬', '庚']],
		['丁', '午', ['壬', '庚', '癸']],
		['庚', '卯', ['丁', '甲', '丙', '庚']],
		['辛', '子', ['丙', '戊', '壬', '甲']],
		['壬', '申', ['戊', '丁']],
		['癸', '巳', ['辛']],
		['癸', '未', ['庚', '辛', '壬', '癸']],
	])('%s日%s月 → %s', (gan, zhi, expected) => {
		const r = computeTiaoHou(P(gan, zhi));
		expect(r.yong).toEqual(expected);
		expect(r.primary).toBe(expected[0]);
	});

	test('寒暖燥湿标注（冬寒/夏热）', () => {
		expect(computeTiaoHou(P('甲', '子')).climate).toBe('寒');
		expect(computeTiaoHou(P('丙', '午')).climate).toBe('燥热');
	});
});

describe('调候 · 集成', () => {
	test('2026-06-22（丁日午月）→ 调候 壬·庚·癸、燥热', () => {
		const gy = buildLocalBaziResult({
			date: '2026-06-22', time: '18:00:00', zone: '+08:00',
			lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0, gender: 1, timeAlg: 1,
		}).bazi.gejuYongShen;
		expect(gy.tiaohou.yong).toEqual(['壬', '庚', '癸']);
		expect(gy.tiaohou.climate).toBe('燥热');
		expect(gy.tiaohou.version).toBe('速查版');
	});
});
