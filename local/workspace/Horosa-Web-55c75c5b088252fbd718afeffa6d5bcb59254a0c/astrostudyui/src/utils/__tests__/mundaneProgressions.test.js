// 世运盘 WP-6 国家盘推运(§11.2)golden:小限 Profections + 法达 Firdaria。
import { mundaneProfection, mundaneFirdaria } from '../../divination/mundane/progressions';

describe('世运盘 小限 Profections(§11.2)', () => {
	test('age=0 → 命盘 ASC 座、1宫、座主', () => {
		const p = mundaneProfection('aries', 0);
		expect(p.profectedSign).toBe('aries');
		expect(p.activatedHouse).toBe(1);
		expect(p.lord).toBe('mars');           // 白羊主火星
		expect(p.months).toHaveLength(12);
		expect(p.months[0].sign).toBe('aries');
	});

	test('每年进一座、12 年一轮', () => {
		expect(mundaneProfection('aries', 3).profectedSign).toBe('cancer');  // 白羊+3=巨蟹
		expect(mundaneProfection('aries', 3).activatedHouse).toBe(4);
		expect(mundaneProfection('aries', 3).lord).toBe('moon');             // 巨蟹主月
		expect(mundaneProfection('aries', 12).profectedSign).toBe('aries');  // 12 年回到本位
		expect(mundaneProfection('aries', 12).activatedHouse).toBe(1);
		expect(mundaneProfection('leo', 5).profectedSign).toBe('capricorn'); // 狮子+5=摩羯
		expect(mundaneProfection('leo', 5).lord).toBe('saturn');
	});

	test('月小限:自年小限座起每月进一座', () => {
		const p = mundaneProfection('aries', 1);   // 年小限=金牛
		expect(p.profectedSign).toBe('taurus');
		expect(p.months[0].sign).toBe('taurus');
		expect(p.months[1].sign).toBe('gemini');
		expect(p.months[11].sign).toBe('aries');   // 第12月回到白羊
	});

	test('非法输入 → null', () => {
		expect(mundaneProfection('nope', 5)).toBeNull();
		expect(mundaneProfection('aries', -1)).toBeNull();
	});
});

describe('世运盘 法达 Firdaria(§11.2)', () => {
	test('昼生序列 70+5=75 年;首期太阳', () => {
		const f = mundaneFirdaria('day', 0);
		expect(f.sectCn).toBe('昼生');
		expect(f.major.planet).toBe('sun');
		const total = f.sequence.reduce((s, x) => s + x.years, 0);
		expect(total).toBe(75);                    // 七政 70 + 南北交 5
		expect(f.sequence[0].planet).toBe('sun');
		expect(f.sequence[8].planet).toBe('southnode');
	});

	test('昼 age=5 → 太阳大期 / 月亮子期(自太阳起第4段)', () => {
		const f = mundaneFirdaria('day', 5);
		expect(f.major.planet).toBe('sun');
		expect(f.major.end).toBe(10);
		expect(f.sub.planet).toBe('moon');         // sun,venus,mercury,moon → subPos 3
	});

	test('昼 age=11 → 金星大期(10–18)/金星子期', () => {
		const f = mundaneFirdaria('day', 11);
		expect(f.major.planet).toBe('venus');
		expect(f.major.start).toBe(10);
		expect(f.sub.planet).toBe('venus');
	});

	test('夜生首期月亮;node 期无子期', () => {
		expect(mundaneFirdaria('night', 0).major.planet).toBe('moon');
		const node = mundaneFirdaria('day', 71);   // 北交 70–73
		expect(node.major.planet).toBe('northnode');
		expect(node.major.isNode).toBe(true);
		expect(node.sub).toBeNull();
	});

	test('75 年后取模循环', () => {
		expect(mundaneFirdaria('day', 80).major.planet).toBe(mundaneFirdaria('day', 5).major.planet);
		expect(mundaneFirdaria('day', -1)).toBeNull();
	});
});
