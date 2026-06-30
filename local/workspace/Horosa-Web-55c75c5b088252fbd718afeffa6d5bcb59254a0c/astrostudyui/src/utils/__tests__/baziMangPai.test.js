/**
 * 盲派结构（§6.4）golden：宾主(主=日柱)、体用(体=日主/比劫/印枭/食、用=财官伤)、做功(主体取宾用)。
 * 结构判定为主，标「参考」；不冒充扶抑/格局唯一答案。
 */
import { computeMangPai } from '../baziMangPai';
import { buildLocalBaziResult } from '../baziLunarLocal';

function four(date, time){
	return buildLocalBaziResult({
		date, time, zone: '+08:00', lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0,
		gender: 1, timeAlg: 1,
	}).bazi.fourColumns;
}

function P(gz, ben, benRel, ganRel){
	return {
		stem: { cell: gz[0], element: EL[gz[0]], relative: ganRel },
		branch: { cell: gz[1] },
		stemInBranch: [{ cell: ben, element: EL[ben], relative: benRel }],
	};
}
const EL = { 甲: 'Wood', 乙: 'Wood', 丙: 'Fire', 丁: 'Fire', 戊: 'Earth', 己: 'Earth', 庚: 'Metal', 辛: 'Metal', 壬: 'Water', 癸: 'Water' };

describe('盲派结构 · 集成', () => {
	test('真实盘：日柱=主、年月时=宾；note 标盲派；结构完整', () => {
		const mp = computeMangPai(four('2026-06-22', '18:00:00'));
		expect(mp).toBeTruthy();
		expect(mp.cells.length).toBe(4);
		expect(mp.cells[2].role).toBe('主');
		expect(mp.cells[0].role).toBe('宾');
		expect(mp.cells[2].ganGod).toBe('日元');
		expect(Array.isArray(mp.tiyong)).toBe(true);
		expect(Array.isArray(mp.zuogong)).toBe(true);
		expect(Array.isArray(mp.feishen)).toBe(true);
		expect(mp.note).toContain('盲派');
	});
});

describe('盲派结构 · 单元', () => {
	test('体用分类 + 做功(日主比劫克宾位财)', () => {
		// 日丙(火)、日支寅(比/木?)… 用纯构造: 日丙坐午(劫)，年位见庚申(偏财=用)
		const f = {
			day: P('丙午', '丁', '劫', '日元'),
			year: P('庚申', '庚', '才', '才'),
			month: P('甲寅', '甲', '枭', '枭'),
			time: P('戊戌', '戊', '食', '食'),
		};
		const mp = computeMangPai(f);
		// 体: 日主/劫/枭/食; 用: 才(财)
		expect(mp.tiyong.some((t) => t.god === '才' && t.cat === '用')).toBe(true);
		expect(mp.tiyong.some((t) => t.cat === '体')).toBe(true);
		// 日主丙火 克 宾位庚申金(才) → 取用做功
		expect(mp.zuogong.some((z) => z.kind === '克' && /才/.test(z.to))).toBe(true);
	});
});
