import { liurengWangXiang } from '../LRZhangSheng';

describe('LRZhangSheng · 旺相休囚死(§20.1) liurengWangXiang', ()=>{
	it('五行当令为旺:木寅/火午/金申/水子;土四季旺(辰戌丑未)', ()=>{
		expect(liurengWangXiang('木', '寅')).toBe('旺');
		expect(liurengWangXiang('火', '午')).toBe('旺');
		expect(liurengWangXiang('金', '申')).toBe('旺');
		expect(liurengWangXiang('水', '子')).toBe('旺');
		expect(liurengWangXiang('土', '辰')).toBe('旺'); // 默认四季土旺
		expect(liurengWangXiang('土', '未')).toBe('旺');
	});
	it('生我休/克我囚/我克死/我生相:木在四时', ()=>{
		expect(liurengWangXiang('木', '亥')).toBe('相'); // 冬水生木
		expect(liurengWangXiang('木', '巳')).toBe('休'); // 夏木生火→休
		expect(liurengWangXiang('木', '辰')).toBe('囚'); // 四季土,木克土→囚
		expect(liurengWangXiang('木', '申')).toBe('死'); // 秋金克木→死
	});
	it('火土同宫(huotu):土随火,辰戌丑未归邻季', ()=>{
		expect(liurengWangXiang('土', '未', 'huotu')).toBe('旺'); // 夏土旺(同火)
		expect(liurengWangXiang('土', '辰', 'huotu')).toBe('相'); // 辰归春,土随火(火春相)
		expect(liurengWangXiang('木', '辰', 'huotu')).toBe('旺'); // 辰归春→木旺(非土按邻季)
	});
	it('非法返回空串', ()=>{ expect(liurengWangXiang('木', '')).toBe(''); expect(liurengWangXiang('', '寅')).toBe(''); });
});
