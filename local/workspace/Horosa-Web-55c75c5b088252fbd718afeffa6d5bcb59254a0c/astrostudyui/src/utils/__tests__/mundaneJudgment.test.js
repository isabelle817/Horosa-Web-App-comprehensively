// 世运盘 WP-3 §13 判读真值源 golden:三栏宫义/两栏曜义/座气质/22恒星+4王星/岁差校正/合点命中。
import {
	MUNDANE_HOUSE_FULL, PLANET_MUNDANE_FULL, SIGN_MUNDANE_TEMPER,
	MUNDANE_FIXED_STARS, MUNDANE_ASPECT_FRAME, mundaneStarLon, mundaneFixedStarHits,
} from '../../divination/mundane/describe';

const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

describe('世运盘 §13 判读真值源', () => {
	test('§13.1 十二宫三栏(国家本体/机构/事务)齐全', () => {
		for (let h = 1; h <= 12; h++) {
			const x = MUNDANE_HOUSE_FULL[h];
			expect(x).toBeTruthy();
			expect(x.body).toBeTruthy();
			expect(x.institution).toBeTruthy();
			expect(x.affairs).toBeTruthy();
		}
		expect(MUNDANE_HOUSE_FULL[10].body).toContain('元首');
		expect(MUNDANE_HOUSE_FULL[4].institution).toContain('反对');
	});

	test('§13.2 十曜两栏(人·权力/领域·行业)齐全', () => {
		PLANETS.forEach((k) => {
			const x = PLANET_MUNDANE_FULL[k];
			expect(x.powerRole).toBeTruthy();
			expect(x.domains).toBeTruthy();
		});
		expect(PLANET_MUNDANE_FULL.neptune.domains).toContain('石油');
		expect(PLANET_MUNDANE_FULL.uranus.domains).toContain('科技');
	});

	test('§13.3 十二座气质(模式·元素+气质)齐全', () => {
		SIGNS.forEach((k) => {
			const x = SIGN_MUNDANE_TEMPER[k];
			expect(x.modeElement).toBeTruthy();
			expect(x.temper).toBeTruthy();
		});
		expect(SIGN_MUNDANE_TEMPER.aquarius.temper).toContain('革命');
		expect(SIGN_MUNDANE_TEMPER.capricorn.modeElement).toBe('基本·土');
	});

	test('§13.4 恒星 = 22 主星 + 4 王星(东南西北),黄经在域', () => {
		expect(MUNDANE_FIXED_STARS.length).toBe(22);
		const royals = MUNDANE_FIXED_STARS.filter((s) => s.royal).map((s) => s.royal).sort();
		expect(royals).toEqual(['东', '南', '西', '北'].sort());
		MUNDANE_FIXED_STARS.forEach((s) => {
			expect(s.lon2000).toBeGreaterThanOrEqual(0);
			expect(s.lon2000).toBeLessThan(360);
			expect(s.nameCn).toBeTruthy();
			expect(s.meaning).toBeTruthy();
			expect(s.nature).toBeTruthy();
		});
		// Algol 金牛26°10′ ≈ 56.167°;Spica 天秤23°50′ ≈ 203.833°
		const algol = MUNDANE_FIXED_STARS.find((s) => s.key === 'algol');
		expect(Math.abs(algol.lon2000 - (30 + 26 + 10 / 60))).toBeLessThan(0.001);
		const spica = MUNDANE_FIXED_STARS.find((s) => s.key === 'spica');
		expect(Math.abs(spica.lon2000 - (180 + 23 + 50 / 60))).toBeLessThan(0.001);
		expect(MUNDANE_ASPECT_FRAME.hard).toContain('硬相位');
	});

	test('岁差校正:恒星黄经随年前移 ~50.29″/yr', () => {
		const spica = MUNDANE_FIXED_STARS.find((s) => s.key === 'spica');
		expect(mundaneStarLon(spica, 2000)).toBeCloseTo(spica.lon2000, 5);
		const delta = ((mundaneStarLon(spica, 2072) - mundaneStarLon(spica, 2000)) + 360) % 360;
		expect(delta).toBeCloseTo(72 * 50.29 / 3600, 3);  // ~1°
	});

	test('恒星合点命中(orb 1.5°,按盘年校正)', () => {
		// 用孤立星 Algol(最近邻 Alcyone 3.8° 外)避免相邻星双命中(Spica↔Arcturus 仅 0.4°)。
		const algol = MUNDANE_FIXED_STARS.find((s) => s.key === 'algol');
		const slon = mundaneStarLon(algol, 2000);
		const hits = mundaneFixedStarHits(
			[{ key: 'sun', cn: '太阳', lon: slon + 0.5 }, { key: 'moon', cn: '月亮', lon: slon + 10 }], 2000, 1.5);
		expect(hits.length).toBe(1);
		expect(hits[0].star).toBe('algol');
		expect(hits[0].point).toBe('sun');
		expect(hits[0].orb).toBeLessThanOrEqual(1.5);
		// 相邻星(Spica+Arcturus 0.4°)正确双命中,验证检测不漏。
		const spica = MUNDANE_FIXED_STARS.find((s) => s.key === 'spica');
		const dbl = mundaneFixedStarHits([{ key: 'mc', cn: '天顶', lon: mundaneStarLon(spica, 2000) }], 2000, 1.5);
		expect(dbl.map((h) => h.star).sort()).toEqual(['arcturus', 'spica']);
	});
});
