// 风水 QA 轮2:替卦三方案真异 + 5入中无替 + 极端/非法/空/冲突输入(边界穷举)。
import { xuankong } from '../xuankong';
import { flyChartTi } from '../liqiCore';
import { zibai, monthCenter } from '../zibai';
import { jinsuo } from '../jinsuo';
import { qiankun } from '../qiankun';
import { SHAN_ORDER } from '../fengshuiData';

describe('替卦三方案 真异(非摆设) + 5入中无替', ()=>{
	it('8运向午:沈氏/右弼/本宫 向盘入中各异(卯◇山:沈2/弼9/本宫3)', ()=>{
		expect(flyChartTi(8, '午', 'shen').xiangPan[5]).toBe(2);
		expect(flyChartTi(8, '午', 'youbi').xiangPan[5]).toBe(9);
		expect(flyChartTi(8, '午', 'bengong').xiangPan[5]).toBe(3);   // 本宫=下卦运星3(向盘同下卦)
	});
	it('全运全山:存在组合使三方案两两不同(方案确实生效)', ()=>{
		let distinct = 0;
		for (let yun = 1; yun <= 9; yun++) {
			for (const x of SHAN_ORDER) {
				const a = JSON.stringify(flyChartTi(yun, x, 'shen').xiangPan);
				const b = JSON.stringify(flyChartTi(yun, x, 'youbi').xiangPan);
				const c = JSON.stringify(flyChartTi(yun, x, 'bengong').xiangPan);
				if (a !== b && a !== c && b !== c) { distinct++; }
			}
		}
		expect(distinct).toBeGreaterThan(0);
	});
	it('5入中无替:1运向午(向宫运盘=5) 三方案向盘全同、中宫=5', ()=>{
		const s = flyChartTi(1, '午', 'shen');
		const y = flyChartTi(1, '午', 'youbi');
		const b = flyChartTi(1, '午', 'bengong');
		expect(s.xiangPan[5]).toBe(5);
		expect(s.xiangPan).toEqual(y.xiangPan);
		expect(s.xiangPan).toEqual(b.xiangPan);
	});
});

describe('极端/非法/空/冲突 输入不产 NaN、不崩', ()=>{
	it('紫白极端/非法年(负/0/超大)→ 入中星恒 1-9、绝不 NaN', ()=>{
		[-50, 0, 1, 1700, 2200, 9999].forEach((yr)=>{
			const z = zibai({ year: yr });
			expect(Number.isNaN(z.yearCenter)).toBe(false);
			expect(z.yearCenter).toBeGreaterThanOrEqual(1);
			expect(z.yearCenter).toBeLessThanOrEqual(9);
		});
	});
	it('玄空极端流年/流月 → 年月盘 1-9 排列、月入中不 NaN', ()=>{
		[-50, 1, 9999].forEach((yr)=>{
			const r = xuankong(8, '午', { year: yr });
			expect(Object.values(r.yearPan).sort((a, b)=>a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		});
		[1, 6, 12].forEach((m)=>{ expect(Number.isNaN(monthCenter(2024, m))).toBe(false); });
	});
	it('金锁空 sectors / 乾坤空 waters:中性、不崩', ()=>{
		expect(jinsuo({}).deCount).toBe(0);
		expect(qiankun({ zuoGua: '坎' }).positions.every((p)=>p.jx === 'neutral')).toBe(true);
	});
	it('乾坤冲突水(先天来水吉 + 案劫来水忌)同盘各自判', ()=>{
		const r = qiankun({ zuoGua: '坎', waters: { xianTian: 'come', anJie: 'come' } });
		expect(r.positions.find((p)=>p.key === 'xianTian').jx).toBe('good');
		expect(r.positions.find((p)=>p.key === 'anJie').jx).toBe('bad');
	});
});

describe('玄空流月五黄定位唯一', ()=>{
	it('给定年月,五黄宫唯一可定位', ()=>{
		const r = xuankong(9, '午', { year: 2024, month: 3 });
		const wu = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((g)=>r.monthPan[g] === 5);
		expect(wu.length).toBe(1);
	});
});
