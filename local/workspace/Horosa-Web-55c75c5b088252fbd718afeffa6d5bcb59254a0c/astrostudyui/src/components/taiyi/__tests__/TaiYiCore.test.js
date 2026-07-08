// 太乙数 JS 旁路 ↔ Python 引擎 对齐(防 TaiYiCore.js 与后端 kintaiyi 漂移):
//   ① 主客定算立成表 findCal 已固定;② 五福/大游/小游 按「年」落宫(宫数 1-9)。
// 真值与后端回归测试(test_taiyi_kintaiyi_golden.py)同源;失败=重核真值,勿改测试将就。
import { findCal, getWufu, getBigYo, getSmallYo } from '../core/TaiYiCore';

describe('太乙 主客定算立成表 findCal(已固定)', ()=>{
	test('阳局关键行 == 后端', ()=>{
		expect(findCal('阳', 1)).toEqual([7, 13, 13]);
		expect(findCal('阳', 42)).toEqual([27, 12, 34]);
		expect(findCal('阳', 49)).toEqual([24, 25, 25]);
	});
	test('阴局关键行 == 后端', ()=>{
		expect(findCal('阴', 1)).toEqual([5, 29, 7]);
	});
	test('全 72 局 × 阴阳:返回 [主算,客算,定算]、值域 [1,40]', ()=>{
		['阳', '阴'].forEach((yy)=>{
			for(let n = 1; n <= 72; n++){
				const row = findCal(yy, n);
				expect(Array.isArray(row) && row.length === 3).toBe(true);
				row.forEach((v)=>{ expect(v >= 1 && v <= 40).toBe(true); });
			}
		});
	});
});

describe('太乙 游神(五福/大游/小游)按年落宫', ()=>{
	test('724 → 五福艮(3)·大游巽(9)·小游乾(1)', ()=>{
		expect(getWufu(724)).toBe(3);
		expect(getBigYo(724)).toBe(9);
		expect(getSmallYo(724)).toBe(1);
	});
	test('634 → 五福中(5)', ()=>{
		expect(getWufu(634)).toBe(5);
	});
	test('不变量:五福恒 ∈ {乾艮巽坤中}=(1,3,9,7,5);大游/小游不入中(5)', ()=>{
		for(let y = 1; y < 2200; y += 7){
			expect([1, 3, 9, 7, 5]).toContain(getWufu(y));
			expect(getBigYo(y)).not.toBe(5);
			expect(getSmallYo(y)).not.toBe(5);
		}
	});
	test('负年(公元前)零年修正不崩、值域合法', ()=>{
		[-1, -100, -213].forEach((y)=>{
			expect([1, 3, 9, 7, 5]).toContain(getWufu(y));
			expect(getBigYo(y)).toBeGreaterThanOrEqual(1);
			expect(getSmallYo(y)).toBeGreaterThanOrEqual(1);
		});
	});
});
