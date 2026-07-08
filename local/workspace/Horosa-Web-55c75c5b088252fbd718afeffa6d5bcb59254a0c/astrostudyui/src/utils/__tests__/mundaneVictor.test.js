// 世运盘 WP-2 定局 victor(§16.2)golden:5 hylegiacal 点尊贵累加 → 年主/盘主;复用主限法 computeAlmuten。
import { describeMundaneVictor } from '../../divination/mundane/describe';

const FACTS = {
	meta: { sect: 'day', ascLon: 125.5, ascSign: 'leo', ascDegree: 5.5 },   // ASC 狮子(太阳庙)
	houses: {},
	planets: {
		sun: { lon: 130, sign: 'leo', house: 10 },        // 太阳居狮子(庙)·10宫(角)
		moon: { lon: 35, sign: 'taurus', house: 7 },
		mercury: { lon: 100, sign: 'cancer', house: 9 },
		venus: { lon: 60, sign: 'gemini', house: 8 },
		mars: { lon: 200, sign: 'libra', house: 3 },
		jupiter: { lon: 250, sign: 'sagittarius', house: 5 },
		saturn: { lon: 290, sign: 'capricorn', house: 6 },
	},
};

describe('世运盘 定局 victor describeMundaneVictor(§16.2)', () => {
	test('5 点尊贵累加 → 年主/盘主结构', () => {
		const v = describeMundaneVictor(FACTS);
		expect(v).toBeTruthy();
		expect(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']).toContain(v.victor);
		for (let i = 1; i < v.scores.length; i++) {
			expect(v.scores[i - 1].score).toBeGreaterThanOrEqual(v.scores[i].score);   // 累分降序
		}
		expect(v.victor).toBe(v.scores[0].planet);
		expect(v.victorMundane.powerRole).toBeTruthy();                                 // 年主星世运义
		expect(v.points).toEqual(expect.arrayContaining(['上升', '太阳', '月亮']));
	});

	test('ASC狮子 + 太阳居狮子角宫 → 太阳为年主(庙×2 + 三分 + 角宫)', () => {
		expect(describeMundaneVictor(FACTS).victor).toBe('sun');
	});

	test('缺 facts / meta → null(不臆造)', () => {
		expect(describeMundaneVictor(null)).toBeNull();
		expect(describeMundaneVictor({ planets: {} })).toBeNull();
	});
});
