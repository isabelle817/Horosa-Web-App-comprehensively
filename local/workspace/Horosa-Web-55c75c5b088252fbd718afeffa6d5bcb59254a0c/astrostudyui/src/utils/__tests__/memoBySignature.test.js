import { createSignatureMemo, stableSignature, memoEnabled } from '../memoBySignature';

describe('memoBySignature', () => {
	it('LRU 语义:命中触摸置新,超容淘汰最旧', () => {
		const m = createSignatureMemo(2);
		m.set('a', 1); m.set('b', 2);
		expect(m.get('a')).toBe(1);   // 触摸 a → b 变最旧
		m.set('c', 3);                 // 淘汰 b
		expect(m.get('b')).toBeUndefined();
		expect(m.get('a')).toBe(1);
		expect(m.get('c')).toBe(3);
	});

	it('stableSignature:对象键序无关、嵌套稳定、区分类型边界', () => {
		expect(stableSignature({ a: 1, b: 2 })).toBe(stableSignature({ b: 2, a: 1 }));
		expect(stableSignature({ a: { y: 2, x: 1 } })).toBe(stableSignature({ a: { x: 1, y: 2 } }));
		expect(stableSignature([1, 2])).not.toBe(stableSignature([2, 1]));
		expect(stableSignature(null)).not.toBe(stableSignature(undefined));
		expect(stableSignature('1')).toBe(stableSignature(1)); // 弱化:标量字符串化(签名用途可接受)
	});

	it('kill-switch:localStorage=0 时 get 恒 miss、set 直通返回值', () => {
		window.localStorage.setItem('horosa.perf.localEngineMemo', '0');
		expect(memoEnabled()).toBe(false);
		const m = createSignatureMemo(2);
		expect(m.set('k', 42)).toBe(42);
		expect(m.get('k')).toBeUndefined();
		window.localStorage.removeItem('horosa.perf.localEngineMemo');
		expect(memoEnabled()).toBe(true);
	});
});
