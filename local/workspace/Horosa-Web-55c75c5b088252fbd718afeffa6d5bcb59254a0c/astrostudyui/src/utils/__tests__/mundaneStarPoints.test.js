// 世运盘 §13.4 恒星命中卡:buildMundaneStarPoints(行星+四轴)→ mundaneFixedStarHits 集成。
import { buildMundaneStarPoints, mundaneFixedStarHits, MUNDANE_FIXED_STARS, mundaneStarLon } from '../../divination/mundane/describe';

describe('世运盘 恒星命中卡 点表 + 集成', () => {
	test('buildMundaneStarPoints:10 行星 + 上升/天顶,缺则跳过', () => {
		const facts = { planets: { sun: { lon: 56.5 }, moon: { lon: 200 }, mars: { lon: 10 } }, lons: { asc: 100, mc: 56.7 } };
		const pts = buildMundaneStarPoints(facts);
		expect(pts.map((p) => p.key)).toEqual(expect.arrayContaining(['sun', 'moon', 'mars', 'asc', 'mc']));
		expect(pts.find((p) => p.key === 'asc').cn).toBe('上升');
		expect(pts.find((p) => p.key === 'mc').cn).toBe('天顶');
		expect(pts.every((p) => typeof p.lon === 'number')).toBe(true);
		expect(buildMundaneStarPoints(null)).toEqual([]);
		expect(buildMundaneStarPoints({})).toEqual([]);
		expect(buildMundaneStarPoints({ planets: { sun: { lon: 56 } } })).toHaveLength(1);   // 无 lons
	});

	test('集成:太阳/天顶合 Algol → 恒星命中(各 1)', () => {
		const algol = MUNDANE_FIXED_STARS.find((s) => s.key === 'algol');
		const aLon = mundaneStarLon(algol, 2000);
		const facts = { planets: { sun: { lon: aLon + 0.4 }, moon: { lon: (aLon + 90) % 360 } }, lons: { asc: 100, mc: aLon + 0.6 } };
		const hits = mundaneFixedStarHits(buildMundaneStarPoints(facts), 2000, 1.5);
		const algolHits = hits.filter((h) => h.star === 'algol');
		expect(algolHits.map((h) => h.point).sort()).toEqual(['mc', 'sun']);
		expect(algolHits[0].meaning).toBeTruthy();
	});
});
