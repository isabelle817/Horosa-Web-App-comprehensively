// 世运盘 §8.4 产前朔望 describeMundaneSyzygy:从后端 Result 的 Syzygy 对象取点 + 新/满月按月相。
import { describeMundaneSyzygy } from '../../divination/mundane/describe';

describe('世运盘 产前朔望 describeMundaneSyzygy(§8.4)', () => {
	test('Result.objectMap.Syzygy 取点;渐盈→新月', () => {
		const facts = { meta: { moonPhase: { phase: 'waxing' } }, result: { objectMap: { Syzygy: { id: 'Syzygy', lon: 125.5, sign: 'Leo', signlon: 5.5 } } } };
		const s = describeMundaneSyzygy(facts);
		expect(s.sign).toBe('leo');
		expect(s.signCn).toBe('狮子');
		expect(s.signlon).toBe(5.5);
		expect(s.kind).toMatch(/新月/);
	});

	test('chart.objects 回退;渐亏→满月;lon 推座', () => {
		const f2 = { meta: { moonPhase: { phase: 'waning' } }, result: { chart: { objects: [{ id: 'Sun' }, { id: 'Syzygy', lon: 5.0 }] } } };
		const s = describeMundaneSyzygy(f2);
		expect(s.sign).toBe('aries');          // lon 5 → 白羊
		expect(s.signlon).toBeCloseTo(5, 5);
		expect(s.kind).toMatch(/满月/);
	});

	test('无 Syzygy / 无 result → null', () => {
		expect(describeMundaneSyzygy({ result: { objectMap: {} } })).toBeNull();
		expect(describeMundaneSyzygy({})).toBeNull();
		expect(describeMundaneSyzygy(null)).toBeNull();
	});
});
