// 次客「筹支」算法自检:自月将本位起,阳支「后三前五」/阴支「前三后五」取第 N 筹天盘地支,
// 该支再用作「加时」(放占时)重排上下盘——而非只改三传。用户校正例:三筹·月将申(阳)→戌。
import { liurengChouBranch, computeQiXY } from '../LiuRengMain';

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

describe('WP-A6 报数/端法 活时(÷12 定支) computeQiXY baoshu', ()=>{
	const chartObj = { nongli: { time: '甲子', dayGanZi: '甲辰', monthGanZi: '甲午', yearGanZi: '丙午' } };
	const Y = (n)=>computeQiXY('baoshu', chartObj, '亥', { yanShuNum: String(n) }).Y;
	test('÷12 折支:子1…亥12,余0=亥(子1/丑2/亥12/13→子/23→戌)', ()=>{
		expect(Y(1)).toBe('子');
		expect(Y(2)).toBe('丑');
		expect(Y(12)).toBe('亥');
		expect(Y(13)).toBe('子');
		expect(Y(23)).toBe('戌'); // 文档实例:报数23→戌
		expect(Y(24)).toBe('亥');
	});
	test('X=月将(月将加报数支);非数字退回正时(零回归)', ()=>{
		expect(computeQiXY('baoshu', chartObj, '亥', { yanShuNum: '7' }).X).toBe('亥');
		expect(computeQiXY('baoshu', chartObj, '亥', { yanShuNum: '' }).Y).toBe('子'); // 退回 timeBranch(甲子→子)
	});
});
