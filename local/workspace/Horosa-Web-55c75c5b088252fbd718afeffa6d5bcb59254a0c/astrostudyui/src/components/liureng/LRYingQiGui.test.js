import { detectGuiSpecials } from './LRBiFa';
import { computeYingQi } from './LRYingQiDoc';

describe('LRBiFa · detectGuiSpecials 贵神特殊态', ()=>{
	it('贵人临辰戌 → 贵人临狱', ()=>{
		expect(detectGuiSpecials({ guizi: '辰' }).map((g)=>g.type)).toContain('贵人临狱');
		expect(detectGuiSpecials({ guizi: '戌' }).map((g)=>g.type)).toContain('贵人临狱');
	});
	it('贵人临戌且旬空 → 临狱 + 坐空（两态）', ()=>{
		const r = detectGuiSpecials({ guizi: '戌', xunKongBranches: ['戌'] }).map((g)=>g.type);
		expect(r).toContain('贵人临狱');
		expect(r).toContain('贵人坐空');
	});
	it('贵人临子不空 → 无特殊态', ()=>{
		expect(detectGuiSpecials({ guizi: '子' })).toEqual([]);
	});
	it('缺 guizi / null 不抛错', ()=>{
		expect(detectGuiSpecials(null)).toEqual([]);
		expect(detectGuiSpecials({})).toEqual([]);
	});
});

describe('LRYingQiDoc · computeYingQi 应期参考', ()=>{
	it('有旬空 → 旬空填实，方向为空亡支', ()=>{
		const r = computeYingQi({ xunKongBranches: ['戌', '亥'] });
		const m = r.find((x)=>x.method === '旬空填实');
		expect(m).toBeTruthy();
		expect(m.dirs).toEqual(['戌', '亥']);
	});
	it('有驿马 → 驿马动', ()=>{
		const r = computeYingQi({ horseBranches: ['申'] });
		expect(r.map((x)=>x.method)).toContain('驿马动');
	});
	it('空 context → 空数组、不抛错', ()=>{
		expect(computeYingQi(null)).toEqual([]);
		expect(computeYingQi({})).toEqual([]);
	});
});
