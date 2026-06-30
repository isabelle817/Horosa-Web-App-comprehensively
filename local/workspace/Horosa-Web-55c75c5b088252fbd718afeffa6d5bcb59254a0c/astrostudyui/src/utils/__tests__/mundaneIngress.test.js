// 世运盘 WP-1 入境主管(§8.3 季度递归)golden:四轴座模式→主管时长+须补季盘;规则集联动。
import { ingressGovernance } from '../../divination/mundane/momentPipeline';

describe('世运盘 入境主管 ingressGovernance(§8.3)', () => {
	test('quarterly · 四轴基本座(白羊) → 首季 3 月 + 补 夏至/秋分/冬至 三盘', () => {
		const g = ingressGovernance('aries', 'quarterly');
		expect(g.spanMonths).toBe(3);
		expect(g.needSeasonal).toEqual(['cancer', 'libra', 'capricorn']);
		expect(g.modality).toBe('cardinal');
	});

	test('quarterly · 四轴变动座(双子) → 半年 6 月 + 补 秋分(天秤)', () => {
		const g = ingressGovernance('gemini', 'quarterly');
		expect(g.spanMonths).toBe(6);
		expect(g.needSeasonal).toEqual(['libra']);
		expect(g.modality).toBe('mutable');
	});

	test('quarterly · 四轴固定座(金牛) → 整年,无须补盘', () => {
		const g = ingressGovernance('taurus', 'quarterly');
		expect(g.spanMonths).toBe(12);
		expect(g.needSeasonal).toEqual([]);
		expect(g.modality).toBe('fixed');
	});

	test('aries_annual(默认) · 任意四轴恒全年、无须补盘', () => {
		['aries', 'taurus', 'gemini', 'cancer'].forEach((k) => {
			const g = ingressGovernance(k, 'aries_annual');
			expect(g.spanMonths).toBe(12);
			expect(g.needSeasonal).toEqual([]);
		});
		expect(ingressGovernance('aries').spanMonths).toBe(12);   // 缺省 rule = aries_annual
	});

	test('capricorn_year(摩羯优先) · 冬至为年首、全年', () => {
		const g = ingressGovernance('aries', 'capricorn_year');
		expect(g.spanMonths).toBe(12);
		expect(g.note).toContain('冬至');
	});
});
