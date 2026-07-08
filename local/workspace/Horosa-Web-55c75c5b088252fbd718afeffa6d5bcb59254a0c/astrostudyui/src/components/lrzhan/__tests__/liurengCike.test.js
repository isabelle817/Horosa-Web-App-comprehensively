// 次客「筹支」算法自检:自月将本位起,阳支「后三前五」/阴支「前三后五」取第 N 筹天盘地支,
// 该支再用作「加时」(放占时)重排上下盘——而非只改三传。用户校正例:三筹·月将申(阳)→戌。
import { liurengChouBranch } from '../LiuRengMain';

describe('次客 筹支 liurengChouBranch(自月将起;阳后三前五 / 阴前三后五)', ()=>{
	test('一筹 = 月将本位', ()=>{
		expect(liurengChouBranch('申', 1)).toBe('申');
		expect(liurengChouBranch('戌', 1)).toBe('戌');
		expect(liurengChouBranch('亥', 1)).toBe('亥');
	});

	test('阳支月将·申 → 申 / 巳 / 戌(用户校正例:三筹 = 戌)', ()=>{
		expect(liurengChouBranch('申', 1)).toBe('申');
		expect(liurengChouBranch('申', 2)).toBe('巳');
		expect(liurengChouBranch('申', 3)).toBe('戌');
	});

	test('阳支月将·戌 → 戌 / 未 / 子(河魁戌)', ()=>{
		expect(liurengChouBranch('戌', 2)).toBe('未');
		expect(liurengChouBranch('戌', 3)).toBe('子');
	});

	test('阴支月将·亥 → 亥 / 寅 / 酉(征明亥)', ()=>{
		expect(liurengChouBranch('亥', 2)).toBe('寅');
		expect(liurengChouBranch('亥', 3)).toBe('酉');
	});

	test('阴支月将·丑 → 丑 / 辰 / 亥', ()=>{
		expect(liurengChouBranch('丑', 2)).toBe('辰');
		expect(liurengChouBranch('丑', 3)).toBe('亥');
	});

	test('非法月将返回空串(computeQiXY 据此退回默认起法,零回归)', ()=>{
		expect(liurengChouBranch('', 3)).toBe('');
		expect(liurengChouBranch('X', 2)).toBe('');
	});
});
