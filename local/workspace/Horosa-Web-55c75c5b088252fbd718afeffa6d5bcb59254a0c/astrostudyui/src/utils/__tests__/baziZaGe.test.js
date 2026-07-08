/**
 * 杂格识别器 golden（§9.4，仅规则明确者）。flagged 候选，正格优先。
 */
import { computeZaGe } from '../baziZaGe';
import { buildLocalBaziResult } from '../baziLunarLocal';

function P(gz, sEl, bEl){ return { stem: { cell: gz.charAt(0), element: sEl }, branch: { cell: gz.charAt(1), element: bEl } }; }
function four(y, m, d, t){ return { year: y, month: m, day: d, time: t }; }
function names(r){ return (r || []).map((x) => x.name); }

describe('杂格识别（§9.4 明确规则项）', () => {
	test('天元一气格：四天干相同', () => {
		expect(names(computeZaGe(four(P('甲子'), P('甲戌'), P('甲申'), P('甲午'))))).toContain('天元一气格');
	});
	test('地支一气格：四地支相同', () => {
		expect(names(computeZaGe(four(P('甲子'), P('丙子'), P('戊子'), P('庚子'))))).toContain('地支一气格');
	});
	test('两干不杂格：天干仅两干交互', () => {
		expect(names(computeZaGe(four(P('甲子'), P('庚午'), P('甲戌'), P('庚辰'))))).toContain('两干不杂格');
	});
	test('五行俱足格：五行齐全', () => {
		const r = computeZaGe(four(P('甲子', 'Wood', 'Water'), P('丙寅', 'Fire', 'Wood'), P('戊辰', 'Earth', 'Earth'), P('庚申', 'Metal', 'Metal')));
		expect(names(r)).toContain('五行俱足格');
	});
	test('日德格：日柱丙辰', () => {
		expect(names(computeZaGe(four(P('甲子'), P('乙丑'), P('丙辰'), P('庚寅'))))).toContain('日德格');
	});
	test('日贵格：日坐天乙 丁酉', () => {
		expect(names(computeZaGe(four(P('甲子'), P('乙丑'), P('丁酉'), P('庚寅'))))).toContain('日贵格');
	});
	test('福德秀气格：乙巳日', () => {
		expect(names(computeZaGe(four(P('甲子'), P('丙寅'), P('乙巳'), P('庚辰'))))).toContain('福德秀气格');
	});
	test('金神格：时柱己巳', () => {
		expect(names(computeZaGe(four(P('甲子'), P('丙寅'), P('戊午'), P('己巳'))))).toContain('金神格');
	});

	test('集成 + 不误报：2026-06-22（丙午甲午丁卯己酉）无杂格', () => {
		const gy = buildLocalBaziResult({
			date: '2026-06-22', time: '18:00:00', zone: '+08:00',
			lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0, gender: 1, timeAlg: 1,
		}).bazi.gejuYongShen;
		expect(gy.zaGe).toBeNull();
	});
});
