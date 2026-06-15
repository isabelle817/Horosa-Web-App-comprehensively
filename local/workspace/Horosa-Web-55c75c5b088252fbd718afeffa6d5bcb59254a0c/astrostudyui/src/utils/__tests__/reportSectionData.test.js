// 报告 ground-truth 数据修复回归门禁：
//   ① 八字大运读后端真实字段 bazi.direction[].mainDirect.ganzi（原误读不存在的 mainDirection → 当前大运无法定位）。
//   ② 紫微流年命宫按 ganzi.charAt(1) 搜（原 liuMingIdx=zhiIdx → houses 非地支序 → 流年宫位全错位）。

import {
	resolveBaziDayunList,
	extractBaziCurrentDayun,
	extractBaziAllDayun,
	extractZwLiunianSeries,
} from '../reportSectionData';

// 后端 /bazi/direct 的真实结构：bazi.direction[] = FateDirect {startYear, age=起运岁, mainDirect:{ganzi}, subDirect[]}
const baziFromBackend = {
	direction: [
		{ startYear: 1994, age: 0,  mainDirect: { ganzi: '丁丑' }, subDirect: [] },
		{ startYear: 2004, age: 10, mainDirect: { ganzi: '丙子' }, subDirect: [] },
		{ startYear: 2014, age: 20, mainDirect: { ganzi: '乙亥' }, subDirect: [] },
		{ startYear: 2024, age: 30, mainDirect: { ganzi: '甲戌' }, subDirect: [] },
	],
};

describe('八字大运 ground-truth 字段修复', ()=>{
	test('resolveBaziDayunList 读 direction[].mainDirect.ganzi', ()=>{
		const list = resolveBaziDayunList(baziFromBackend);
		expect(list.length).toBe(4);
		expect(list.map((d)=>d.ganzi)).toEqual(['丁丑', '丙子', '乙亥', '甲戌']);
		expect(list.map((d)=>d.year)).toEqual([1994, 2004, 2014, 2024]);
		expect(list[3].age).toBe(30);
	});

	test('extractBaziCurrentDayun 用 direction 定位当前大运（原 bug：读 mainDirection 返回 null）', ()=>{
		// 命主 32 岁 / 2026 年 → 落在 2024 起的「甲戌」运。
		const cur = extractBaziCurrentDayun(baziFromBackend, 32, 2026);
		expect(cur).not.toBeNull();
		expect(cur.ganZhi).toBe('甲戌');
		expect(cur.startYear).toBe(2024);
	});

	test('回归守卫：缺 mainDirection 字段也能定位（修复前必为 null）', ()=>{
		// 模拟真实后端响应：只有 direction、无 mainDirection。
		expect(baziFromBackend.mainDirection).toBeUndefined();
		expect(extractBaziCurrentDayun(baziFromBackend, 25, 2019)).not.toBeNull();
		expect(extractBaziAllDayun(baziFromBackend).length).toBe(4);
	});

	test('兼容旧别名 mainDirection/luckyDecade（向后兼容）', ()=>{
		const legacy = { mainDirection: [{ ganzi: '庚午', year: 2020, age: 26 }] };
		expect(resolveBaziDayunList(legacy)[0].ganzi).toBe('庚午');
	});
});

describe('紫微流年命宫定位修复（houseIdxByBranch vs zhiIdx）', ()=>{
	// houses[] 故意「不从子起」：houses[0]=寅 … 让 zhiIdx 当下标必然错位。
	const ZHI_ORDER = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
	const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
	const PALACE = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
	const chart = {
		houses: ZHI_ORDER.map((zhi, i)=>({
			name: PALACE[i],
			ganzi: `${GAN[i % 10]}${zhi}`,
			stars: [`星${zhi}`],
			starsMain: [`星${zhi}`],
			direction: [i * 8 + 2, i * 8 + 11],
		})),
	};

	test('流命宫地支 == 流年地支（2026 丙午 → 流命宫落「午」宫，而非 zhiIdx=6 的「申」宫）', ()=>{
		const series = extractZwLiunianSeries(chart, 2026, 32, 1);
		expect(series.length).toBe(1);
		expect(series[0].ganZhi).toBe('丙午');
		// 流命宫地支必须是「午」(houses 里 ganzi 末字为午的那宫)；原 bug 会落到 houses[6]=申。
		expect(series[0].palaces[0].zhi).toBe('午');
		// 流迁移 = 对宫 = 子。
		expect(series[0].palaces[1].zhi).toBe('子');
	});

	test('多年序列：每年流命宫地支都等于该年地支', ()=>{
		const series = extractZwLiunianSeries(chart, 2024, 30, 5);
		expect(series.length).toBe(5);
		series.forEach((y)=>{
			expect(y.palaces[0].zhi).toBe(y.zhi);
		});
	});
});
