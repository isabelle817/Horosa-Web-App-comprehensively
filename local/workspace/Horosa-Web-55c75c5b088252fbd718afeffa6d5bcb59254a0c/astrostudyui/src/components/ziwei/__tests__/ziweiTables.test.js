import {
	NORTH_MAIN_STEP, SOUTH_MAIN_STEP, STARS_YEAR_GAN, STARS_HUOLIN, STARS_JIANG,
	XIAOXIAN_START, HOUSES, CHANGSHENG_12, STARS_BOSI, STARS_TAISUI,
	LIFE_MASTER, BODY_MASTER, DOUJUN, STAR_LIGHT, GE_PATTERNS, monthCnOf,
} from '../data/ziweiTables';

const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

describe('ziweiTables · 数据表 loader 完整性', ()=>{
	test('主星步长:北6南8', ()=>{
		expect(Object.keys(NORTH_MAIN_STEP).length).toBe(6);
		expect(Object.keys(SOUTH_MAIN_STEP).length).toBe(8);
		expect(NORTH_MAIN_STEP['紫微']).toBe(0);
		expect(SOUTH_MAIN_STEP['破军']).toBe(10);
	});
	test('年干系含 禄存/擎羊/陀罗/魁钺/截空,各 10 干;截空双字', ()=>{
		['天魁', '天钺', '禄存', '擎羊', '陀罗', '截空', '天官', '天福', '天厨'].forEach((s)=>{
			expect(STARS_YEAR_GAN[s]).toBeTruthy();
			expect(Object.keys(STARS_YEAR_GAN[s].pos).length).toBe(10);
		});
		expect(STARS_YEAR_GAN['禄存'].pos['甲']).toBe('寅');     // 甲禄存在寅(锚点)
		expect(STARS_YEAR_GAN['截空'].pos['甲'].length).toBe(2); // 双星 2 字
	});
	test('三合组表已拆成 12 支:火铃/将前/小限', ()=>{
		ZHI.forEach((zhi)=>{
			expect(STARS_HUOLIN[zhi]).toBeTruthy();
			expect(STARS_HUOLIN[zhi]['火星']).toBeTruthy();
			expect(STARS_HUOLIN[zhi]['铃星']).toBeTruthy();
			expect(STARS_JIANG[zhi]).toBeTruthy();
			expect(XIAOXIAN_START[zhi]).toBeTruthy();
		});
		// 寅午戌 同组 → 火星起宫一致
		expect(STARS_HUOLIN['寅']).toEqual(STARS_HUOLIN['午']);
		expect(STARS_HUOLIN['午']).toEqual(STARS_HUOLIN['戌']);
	});
	test('小星组 12 长度 + 命主身主 12 支 + 斗君 12 月 + 庙旺/格局非空', ()=>{
		expect(HOUSES.length).toBe(12);
		expect(CHANGSHENG_12.length).toBe(12);
		expect(STARS_BOSI.length).toBe(12);
		expect(STARS_TAISUI.length).toBe(12);
		expect(Object.keys(LIFE_MASTER).length).toBe(12);
		expect(Object.keys(BODY_MASTER).length).toBe(12);
		expect(Object.keys(DOUJUN).length).toBe(12);
		expect(Object.keys(STAR_LIGHT).length).toBeGreaterThan(0);
		expect(Object.keys(GE_PATTERNS).length).toBeGreaterThan(0);
	});
	test('月名映射:1→正月,11→冬月,12→腊月', ()=>{
		expect(monthCnOf(1)).toBe('正月');
		expect(monthCnOf(11)).toBe('冬月');
		expect(monthCnOf(12)).toBe('腊月');
	});
});
