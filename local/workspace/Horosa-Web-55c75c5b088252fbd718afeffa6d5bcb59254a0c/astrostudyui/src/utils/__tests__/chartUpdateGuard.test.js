import { sameDisplayList, shallowPropsEqual } from '../chartUpdateGuard';

// chartUpdateGuard 是盘面叶子组件 sCU 的浅比较内核。逐分支自检:
//  - sameDisplayList:同引用 / 都数组(等长逐元素)/ 不等长 / 退化 ===(含都 undefined/null、一数组一非数组)。
//  - shallowPropsEqual:同引用快路 / 任一 null / comparator 命中 / Object.is 兜底(含 NaN、±0 边角)。
// 取向「宁可多渲不漏渲」:任一差异都必须判不等(返回 false)→ 上层照渲。

describe('chartUpdateGuard.sameDisplayList', ()=>{
	it('同引用(同一数组对象)→ true', ()=>{
		const a = [1, 2, 3];
		expect(sameDisplayList(a, a)).toBe(true);
	});

	it('都 undefined / 都 null → true(同引用快路)', ()=>{
		expect(sameDisplayList(undefined, undefined)).toBe(true);
		expect(sameDisplayList(null, null)).toBe(true);
	});

	it('内容相同的两个不同数组(引用不同)→ true(内容比)', ()=>{
		expect(sameDisplayList([2, 4, 6], [2, 4, 6])).toBe(true);
		expect(sameDisplayList([], [])).toBe(true);
		expect(sameDisplayList(['Sun', 'Moon'], ['Sun', 'Moon'])).toBe(true);
	});

	it('元素值不同 → false', ()=>{
		expect(sameDisplayList([1, 2, 3], [1, 2, 4])).toBe(false);
		expect(sameDisplayList(['Sun'], ['Moon'])).toBe(false);
	});

	it('长度不同 → false', ()=>{
		expect(sameDisplayList([1, 2], [1, 2, 3])).toBe(false);
		expect(sameDisplayList([1, 2, 3], [1, 2])).toBe(false);
		expect(sameDisplayList([], [1])).toBe(false);
	});

	it('元素顺序不同 → false(逐位严格比)', ()=>{
		expect(sameDisplayList([1, 2], [2, 1])).toBe(false);
	});

	it('一边数组一边非数组 → 退化 ===(→ false)', ()=>{
		expect(sameDisplayList([1, 2], undefined)).toBe(false);
		expect(sameDisplayList(null, [1])).toBe(false);
		expect(sameDisplayList([1], 'x')).toBe(false);
	});

	it('两个非数组标量 → 退化 ===', ()=>{
		expect(sameDisplayList('a', 'a')).toBe(true);
		expect(sameDisplayList('a', 'b')).toBe(false);
		expect(sameDisplayList(undefined, null)).toBe(false); // 不同引用且非数组 → ===false
	});
});

describe('chartUpdateGuard.shallowPropsEqual', ()=>{
	const KEYS = ['value', 'flag', 'list'];

	it('同引用对象 → true(快路,不看 keys)', ()=>{
		const o = { value: 1 };
		expect(shallowPropsEqual(o, o, KEYS)).toBe(true);
	});

	it('恰一边为 null/undefined → false(无法逐键比,保守判不等)', ()=>{
		expect(shallowPropsEqual(null, { value: 1 }, KEYS)).toBe(false);
		expect(shallowPropsEqual({ value: 1 }, null, KEYS)).toBe(false);
		expect(shallowPropsEqual({ value: 1 }, undefined, KEYS)).toBe(false);
		expect(shallowPropsEqual(undefined, { value: 1 }, KEYS)).toBe(false);
	});

	it('两边同为 undefined / 同为 null → true(同引用快路,a===b)', ()=>{
		// React 不会以 undefined/null 调 sCU 的 props/state,但内核语义上「同引用即相等」自洽。
		expect(shallowPropsEqual(undefined, undefined, KEYS)).toBe(true);
		expect(shallowPropsEqual(null, null, KEYS)).toBe(true);
	});

	it('所有 key 引用/值相等(无 comparator)→ true', ()=>{
		const shared = { x: 1 };
		const a = { value: shared, flag: true, list: 'same' };
		const b = { value: shared, flag: true, list: 'same' };
		expect(shallowPropsEqual(a, b, KEYS)).toBe(true);
	});

	it('某 key 大对象引用变(无 comparator)→ false(大对象引用比)', ()=>{
		const a = { value: { x: 1 }, flag: true, list: 'same' };
		const b = { value: { x: 1 }, flag: true, list: 'same' }; // value 不同引用
		expect(shallowPropsEqual(a, b, KEYS)).toBe(false);
	});

	it('某标量 key 值变 → false', ()=>{
		const shared = { x: 1 };
		expect(shallowPropsEqual(
			{ value: shared, flag: true, list: 's' },
			{ value: shared, flag: false, list: 's' },
			KEYS,
		)).toBe(false);
	});

	it('comparator 命中:list 用 sameDisplayList 内容比 → 内容同(引用不同)判 true', ()=>{
		const shared = { x: 1 };
		const a = { value: shared, flag: true, list: [1, 2, 3] };
		const b = { value: shared, flag: true, list: [1, 2, 3] }; // list 不同引用但内容同
		expect(shallowPropsEqual(a, b, KEYS, { list: sameDisplayList })).toBe(true);
	});

	it('comparator 命中:list 内容不同 → false', ()=>{
		const shared = { x: 1 };
		const a = { value: shared, flag: true, list: [1, 2, 3] };
		const b = { value: shared, flag: true, list: [1, 2, 4] };
		expect(shallowPropsEqual(a, b, KEYS, { list: sameDisplayList })).toBe(false);
	});

	it('Object.is 兜底:NaN 视为相等(避免无意义重渲)', ()=>{
		expect(shallowPropsEqual({ value: NaN }, { value: NaN }, ['value'])).toBe(true);
	});

	it('Object.is 兜底:+0 与 -0 视为不等(判不等 → 多渲一次,安全侧)', ()=>{
		expect(shallowPropsEqual({ value: 0 }, { value: -0 }, ['value'])).toBe(false);
	});

	it('空 keys → 恒 true(无可比项)', ()=>{
		expect(shallowPropsEqual({ a: 1 }, { a: 2 }, [])).toBe(true);
	});

	it('未列入 keys 的字段变化被忽略(只比声明的 keys)', ()=>{
		const a = { value: 1, ignored: 'x' };
		const b = { value: 1, ignored: 'y' };
		expect(shallowPropsEqual(a, b, ['value'])).toBe(true);
	});
});
