// 世运盘 WP-5 食增强 受冲星(§10.3)golden:对食点 合/刑/冲 ≤3° 的行星(凶星标红),日/月食各以日/月为食点。
import { describeEclipseAfflictions } from '../../divination/mundane/describe';

const FACTS = {
	planets: {
		sun: { lon: 100, house: 10 },     // 日食点
		moon: { lon: 280, house: 4 },     // 月食点
		mars: { lon: 102 },               // 距日 2°(合) / 距月 178°(冲)
		saturn: { lon: 190 },             // 距日 90°(刑) / 距月 90°(刑)
		jupiter: { lon: 281 },            // 距日 179°(冲) / 距月 1°(合)
		venus: { lon: 130 },              // 距日 30°(无)
		mercury: { lon: 105 },            // 距日 5°(>3 无)
	},
};

describe('世运盘 食增强 受冲星 describeEclipseAfflictions(§10.3)', () => {
	test('日食:受冲星(合/刑/冲 ≤3°)按 orb 升序;食点落宫', () => {
		const r = describeEclipseAfflictions(FACTS, 'solar');
		expect(r.house).toBe(10);
		expect(r.houseMeaning).toBeTruthy();
		expect(r.afflictors.map((a) => a.planet)).toEqual(['saturn', 'jupiter', 'mars']);   // orb 0/1/2
		expect(r.afflictors[0].aspect).toBe('刑');
		expect(r.afflictors[0].orb).toBeCloseTo(0, 1);
		expect(r.afflictors.find((a) => a.planet === 'saturn').malefic).toBe(true);
		expect(r.afflictors.find((a) => a.planet === 'jupiter').malefic).toBe(false);
		expect(r.afflictors.find((a) => a.planet === 'mercury')).toBeUndefined();           // 5° > 3
	});

	test('月食:以月亮为食点(太阳冲月为定义不计)', () => {
		const r = describeEclipseAfflictions(FACTS, 'lunar');
		expect(r.house).toBe(4);
		expect(r.afflictors.find((a) => a.planet === 'jupiter').aspect).toBe('合');          // 距月 1°
		expect(r.afflictors.find((a) => a.planet === 'sun')).toBeUndefined();                // 太阳冲月=定义,不计受冲
	});

	test('缺 facts / 缺光体 → null', () => {
		expect(describeEclipseAfflictions(null, 'solar')).toBeNull();
		expect(describeEclipseAfflictions({ planets: {} }, 'solar')).toBeNull();
	});
});
