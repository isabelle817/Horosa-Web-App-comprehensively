import { judgeKongWang } from '../LRZhangSheng';

describe('LRZhangSheng · 空亡真假 judgeKongWang(§22.1)', ()=>{
	it('旺相居空=假空(旺空):木在寅月(旺)/亥月(相)', ()=>{
		expect(judgeKongWang('木', '寅').kind).toBe('假空');
		expect(judgeKongWang('木', '亥').kind).toBe('假空');
	});
	it('休囚死居空=真空(衰空):木在巳月(休)/辰月(囚)/申月(死)', ()=>{
		expect(judgeKongWang('木', '巳').kind).toBe('真空');
		expect(judgeKongWang('木', '辰').kind).toBe('真空');
		expect(judgeKongWang('木', '申').kind).toBe('真空');
	});
	it('带 basis 断语 + 非法返回 null', ()=>{
		expect(judgeKongWang('火', '午').basis).toMatch(/空而不空|旺空/);
		expect(judgeKongWang('木', '')).toBeNull();
	});
});
