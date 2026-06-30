// 世运盘 §16.3 会合盘指示星:木/土在会合座本质尊贵定吉凶 + 元素定气候。
import { mundaneConjunctionIndicator } from '../../divination/mundane/describe';

const mk = (jLon, sLon, sign) => ({ planets: { jupiter: { lon: jLon, sign }, saturn: { lon: sLon, sign } } });

describe('世运盘 会合指示星(§16.3)', () => {
	test('水瓶会合 → 土星得力(凶)·风象（2020 大合相型）', () => {
		const r = mundaneConjunctionIndicator(mk(300.5, 301.0, 'aquarius'));
		expect(r.stronger).toBe('saturn');     // 土星庙水瓶
		expect(r.tone).toBe('凶');
		expect(r.element).toBe('air');
		expect(r.strongerCn).toBe('土星');
		expect(r.sep).toBeLessThanOrEqual(12);
	});

	test('射手会合 → 木星得力(吉)·火象', () => {
		const r = mundaneConjunctionIndicator(mk(245, 246, 'sagittarius'));
		expect(r.stronger).toBe('jupiter');    // 木星庙射手
		expect(r.tone).toBe('吉');
		expect(r.element).toBe('fire');
	});

	test('巨蟹会合 → 木星旺(吉)·水象', () => {
		const r = mundaneConjunctionIndicator(mk(95, 96, 'cancer'));
		expect(r.stronger).toBe('jupiter');    // 木星巨蟹旺
		expect(r.tone).toBe('吉');
		expect(r.element).toBe('water');
	});

	test('天秤会合 → 土星旺(凶)', () => {
		const r = mundaneConjunctionIndicator(mk(185, 186, 'libra'));
		expect(r.stronger).toBe('saturn');     // 土星天秤旺
		expect(r.tone).toBe('凶');
	});

	test('双子会合 → 木土均势(平)', () => {
		const r = mundaneConjunctionIndicator(mk(65, 66, 'gemini'));
		expect(r.stronger).toBeNull();
		expect(r.tone).toBe('平');
	});

	test('非会合(角距>12°)/缺星 → null', () => {
		expect(mundaneConjunctionIndicator(mk(10, 100, 'aries'))).toBeNull();
		expect(mundaneConjunctionIndicator({ planets: {} })).toBeNull();
		expect(mundaneConjunctionIndicator(null)).toBeNull();
	});
});
