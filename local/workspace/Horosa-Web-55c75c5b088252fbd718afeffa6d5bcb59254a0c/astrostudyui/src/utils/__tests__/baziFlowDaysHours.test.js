// 批A：八字多运限 buildFlowDays / buildFlowHours 干支正确性（纯 lunar.js，与四柱同口径）。
// 已知参照：2024-01-01 = 甲子日；2024-06-05 = 庚子日，14 时(未时)= 癸未；0 时(子时)= 丙子。
import { buildFlowDays, buildFlowHours } from '../baziLunarLocal';

describe('buildFlowDays · 公历某月逐日干支', () => {
	test('2024-06 全月共 30 天，干支序列连续（首日 2024-06-01 与已知参照一致）', () => {
		const days = buildFlowDays(2024, 6, '庚');
		expect(days.length).toBe(30); // 6 月 30 天
		// 6/1 到 6/5 的干支按 60 甲子连续推；6/5 = 庚子（已知）。
		const d5 = days.find((x) => x.day === 5);
		expect(d5.ganzi).toBe('庚子');
		const d1 = days.find((x) => x.day === 1);
		expect(d1.ganzi).toBe('丙申'); // 庚子往前 4 天 = 丙申
		// 每项含十神/纳音字段（pillarFromGanzi 同口径）。
		expect(d5.stem && d5.stem.cell).toBe('庚');
		expect(d5.branch && d5.branch.cell).toBe('子');
		expect(typeof d5.naying).toBe('string');
	});

	test('2024-01-01 = 甲子日（lunar.js 经典锚点）', () => {
		const days = buildFlowDays(2024, 1, '甲');
		const d1 = days.find((x) => x.day === 1);
		expect(d1.ganzi).toBe('甲子');
		expect(days.length).toBe(31); // 1 月 31 天
	});

	test('2 月天数正确（2024 闰年 29 天 / 2023 平年 28 天），无越界假日', () => {
		expect(buildFlowDays(2024, 2, '甲').length).toBe(29);
		expect(buildFlowDays(2023, 2, '甲').length).toBe(28);
	});

	test('坏入参 → 空数组（绝不抛）', () => {
		expect(buildFlowDays(NaN, 6, '甲')).toEqual([]);
		expect(buildFlowDays(2024, undefined, '甲')).toEqual([]);
	});
});

describe('buildFlowHours · 某日 12 时辰干支', () => {
	test('2024-06-05（庚子日）12 时辰：子=丙子、未(14时序7)=癸未', () => {
		const hours = buildFlowHours(2024, 6, 5, '庚');
		expect(hours.length).toBe(12);
		const zi = hours.find((x) => x.hourIdx === 0);
		expect(zi.ganzi).toBe('丙子'); // 庚日五鼠遁：庚日起丙子
		const wei = hours.find((x) => x.hourIdx === 7); // 未时
		expect(wei.ganzi).toBe('癸未');
		// 十神字段在位。
		expect(zi.stem && zi.stem.cell).toBe('丙');
		expect(typeof zi.naying).toBe('string');
	});

	test('时辰序 0–11 完整且唯一', () => {
		const hours = buildFlowHours(2024, 6, 5, '庚');
		const idxs = hours.map((x) => x.hourIdx);
		expect(idxs).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
	});

	test('坏入参 → 空数组（绝不抛）', () => {
		expect(buildFlowHours(2024, 6, NaN, '甲')).toEqual([]);
		expect(buildFlowHours(NaN, 6, 5, '甲')).toEqual([]);
	});
});
