// 世运盘 WP-1b 入境判读骨架(§8.5)golden:上升主星状态/政权(10宫主+太阳)/民生(月亮)/临四轴星/外行星落宫。
import { describeIngressSkeleton } from '../../divination/mundane/describe';

const FACTS = {
	meta: { ascSign: 'aries' },     // ASC 白羊 → 主星火星
	houses: { 1: { sign: 'aries' }, 10: { ruler: 'saturn', planets: ['sun', 'mars'] } },
	planets: {
		sun: { house: 10, sign: 'capricorn', angularity: 'angular' },
		moon: { house: 4, sign: 'cancer', angularity: 'angular' },
		mars: { house: 10, sign: 'capricorn', angularity: 'angular' },
		saturn: { house: 7, sign: 'libra', angularity: 'angular', retro: true },
		mercury: { house: 9, sign: 'sagittarius', angularity: 'cadent' },
		uranus: { house: 11, sign: 'aquarius' },
		neptune: { house: 12, sign: 'pisces' },
		pluto: { house: 8, sign: 'scorpio' },
	},
};

describe('世运盘 入境判读骨架 describeIngressSkeleton(§8.5)', () => {
	test('上升座 + 主星状态', () => {
		const sk = describeIngressSkeleton(FACTS);
		expect(sk.ascSign).toBe('aries');
		expect(sk.ascRuler).toBe('mars');          // 白羊域主 = 火星
		expect(sk.ascRulerHouse).toBe(10);         // 火星落 10 宫
		expect(sk.ascRulerAngular).toBe(true);
		expect(sk.ascTemper.temper).toContain('军事');
	});

	test('政权 = 10 宫主星 + 太阳;民生 = 月亮', () => {
		const sk = describeIngressSkeleton(FACTS);
		expect(sk.tenthRuler).toBe('saturn');
		expect(sk.tenthPlanets.map((p) => p.key)).toEqual(['sun', 'mars']);
		expect(sk.sun.house).toBe(10);
		expect(sk.moon.house).toBe(4);
		expect(sk.moon.houseMeaning).toBeTruthy();
	});

	test('临四轴星(凶星标记)', () => {
		const sk = describeIngressSkeleton(FACTS);
		const ang = sk.angular.map((a) => a.key);
		expect(ang).toEqual(expect.arrayContaining(['sun', 'moon', 'mars', 'saturn']));
		expect(ang).not.toContain('mercury');     // cadent 不临轴
		expect(sk.angular.find((a) => a.key === 'mars').malefic).toBe(true);
		expect(sk.angular.find((a) => a.key === 'sun').malefic).toBe(false);
	});

	test('外行星落宫', () => {
		const sk = describeIngressSkeleton(FACTS);
		expect(sk.outers.map((o) => o.key)).toEqual(['uranus', 'neptune', 'pluto']);
		expect(sk.outers.find((o) => o.key === 'pluto').house).toBe(8);
		expect(sk.outers.find((o) => o.key === 'uranus').houseMeaning).toBeTruthy();
	});

	test('缺 facts → null(不臆造)', () => {
		expect(describeIngressSkeleton(null)).toBeNull();
		expect(describeIngressSkeleton({})).toBeNull();
	});
});
