// 世运盘 WP-6 一国多候选盘:同一历史盘例的「建置时刻」候选数据完整性。
import { REGION_CANDIDATES, regionCandidates, REGION_CHARTS } from '../../divination/data/regionCharts';

describe('世运盘 多候选建置时刻(WP-6)', () => {
	test('每条候选结构完整(key/label/time/note)且时刻合法', () => {
		Object.keys(REGION_CANDIDATES).forEach((k) => {
			const list = REGION_CANDIDATES[k];
			expect(Array.isArray(list)).toBe(true);
			expect(list.length).toBeGreaterThanOrEqual(2);   // 「多」候选至少 2 个才有对比义
			list.forEach((c) => {
				expect(c.key).toBeTruthy();
				expect(c.label).toBeTruthy();
				expect(c.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
				expect(typeof c.note).toBe('string');
			});
			// key 不重复
			const keys = list.map((c) => c.key);
			expect(new Set(keys).size).toBe(keys.length);
		});
	});

	test('候选键挂靠已存在的预置盘', () => {
		Object.keys(REGION_CANDIDATES).forEach((k) => {
			expect(REGION_CHARTS[k]).toBeTruthy();   // 不能为不存在的盘登记候选
		});
	});

	test('费城 1776 三候选 · 首候选为最通行 17:10', () => {
		const list = regionCandidates('philadelphia_1776');
		expect(list).toHaveLength(3);
		expect(list[0].time).toBe('17:10:00');        // 首候选=最通行(applyRegion 默认取首)
		expect(list.map((c) => c.time)).toEqual(['17:10:00', '02:13:00', '12:00:00']);
	});

	test('无候选的键 → null', () => {
		expect(regionCandidates('nonexistent')).toBeNull();
	});
});
