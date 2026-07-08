// 世运盘 §14.2 托勒密天气占星(best-effort)golden:临角或合月(≤12°)行星 → 天气因子。
import { describeMundaneWeather } from '../../divination/mundane/describe';

describe('世运盘 天气占星 describeMundaneWeather(§14.2)', () => {
	test('临角/合月行星入选,余者排除', () => {
		const facts = { planets: {
			moon: { lon: 100, angularity: 'cadent' },
			saturn: { lon: 200, angularity: 'angular' },    // 临角
			mars: { lon: 105, angularity: 'cadent' },       // 合月(距月 5°)
			jupiter: { lon: 50, angularity: 'succedent' },  // 不临角·不合月 → 排除
			venus: { lon: 96, angularity: 'cadent' },       // 合月(距月 4°)
		} };
		const w = describeMundaneWeather(facts);
		expect(w).toBeTruthy();
		const keys = w.factors.map((f) => f.key);
		expect(keys).toEqual(expect.arrayContaining(['saturn', 'mars', 'venus']));
		expect(keys).not.toContain('jupiter');
		expect(keys).not.toContain('moon');                // 月不作自身因子
		const sat = w.factors.find((f) => f.key === 'saturn');
		expect(sat.angular).toBe(true);
		expect(sat.weather).toContain('寒冷');
		expect(sat.malefic).toBe(true);
		const mars = w.factors.find((f) => f.key === 'mars');
		expect(mars.nearMoon).toBe(true);
		expect(mars.weather).toContain('炎热');
	});

	test('无临角/合月 → null;缺 facts → null', () => {
		expect(describeMundaneWeather({ planets: { saturn: { lon: 10, angularity: 'cadent' }, moon: { lon: 200 } } })).toBeNull();
		expect(describeMundaneWeather(null)).toBeNull();
		expect(describeMundaneWeather({})).toBeNull();
	});
});
