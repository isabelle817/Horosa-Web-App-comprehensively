import { detectGuiSpecials } from './LRBiFa';

describe('LRBiFa · 贵人治事 detectGuiSpecials(§22.3)', ()=>{
	const base = (over)=>Object.assign({ guizi: '丑', xunKongBranches: [], guirenForward: true, branchGodMap: {}, branchUpMap: {} }, over);
	it('励德:贵人临卯/酉', ()=>{
		const r = detectGuiSpecials(base({ branchGodMap: { '卯': '贵人' } }));
		expect(r.map((x)=>x.type)).toContain('励德');
	});
	it('贵登天门:贵人临地盘亥 + 顺治', ()=>{
		const r = detectGuiSpecials(base({ branchGodMap: { '亥': '贵人' }, guirenForward: true }));
		const t = r.map((x)=>x.type);
		expect(t).toContain('贵登天门');
		expect(t).toContain('顺治');
	});
	it('逆治:guirenForward=false', ()=>{
		const r = detectGuiSpecials(base({ branchGodMap: { '午': '贵人' }, guirenForward: false }));
		expect(r.map((x)=>x.type)).toContain('逆治');
		expect(r.map((x)=>x.type)).not.toContain('顺治');
	});
	it('魁度天门(关隔):天罡辰加天门亥', ()=>{
		const r = detectGuiSpecials(base({ branchUpMap: { '亥': '辰' } }));
		expect(r.map((x)=>x.type)).toContain('魁度天门（关隔）');
	});
	it('既有态保留:贵人临狱(辰戌)/坐空', ()=>{
		expect(detectGuiSpecials(base({ guizi: '辰' })).map((x)=>x.type)).toContain('贵人临狱');
		expect(detectGuiSpecials(base({ guizi: '丑', xunKongBranches: ['丑'] })).map((x)=>x.type)).toContain('贵人坐空');
	});
	it('无 guizi → 空', ()=>{ expect(detectGuiSpecials({})).toEqual([]); });
});
