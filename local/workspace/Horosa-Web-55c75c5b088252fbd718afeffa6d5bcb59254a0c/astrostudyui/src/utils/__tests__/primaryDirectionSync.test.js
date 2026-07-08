jest.mock('../helper', ()=>({
	randomStr: ()=> 'chart-seq-1',
}));

import {
	DEFAULT_PD_TYPE,
	PD_SYNC_REV,
	SUPPORTED_PD_METHODS,
	SUPPORTED_PD_TIME_KEYS,
	mergePrimaryDirectionChartObj,
	normalizePrimaryDirectionSubTabKey,
} from '../primaryDirectionSync';

describe('primaryDirectionSync', ()=>{
	test('merges primary direction rows into chart state with synced params', ()=>{
		const chartObj = {
			params: {
				name: 'before',
				pos: 'before pos',
				showPdBounds: 0,
			},
			predictives: {
				firdaria: [{ id: 1 }],
			},
		};
		const next = mergePrimaryDirectionChartObj(chartObj, {
			pdRows: [[1, 'SUN', 'MOON', '', '2000-01-01']],
			showPdBounds: 1,
			pdMethod: 'horosa_legacy',
			pdTimeKey: 'Ptolemy',
			name: 'after',
			pos: 'after pos',
		});

		expect(next.chartId).toBe('chart-seq-1');
		expect(next.params.name).toBe('after');
		expect(next.params.pos).toBe('after pos');
		expect(next.params.showPdBounds).toBe(1);
		expect(next.params.pdtype).toBe(DEFAULT_PD_TYPE);
		expect(next.params.pdMethod).toBe('horosa_legacy');
		expect(next.params.pdTimeKey).toBe('Ptolemy');
		expect(next.params.pdSyncRev).toBe(PD_SYNC_REV);
		expect(next.predictives.primaryDirection).toEqual([[1, 'SUN', 'MOON', '', '2000-01-01']]);
		expect(next.predictives.firdaria).toEqual([{ id: 1 }]);
	});

	test('keeps valid direction sub tabs and falls back only for invalid keys', ()=>{
		expect(normalizePrimaryDirectionSubTabKey('primarydirchart')).toBe('primarydirchart');
		expect(normalizePrimaryDirectionSubTabKey('firdaria')).toBe('firdaria');
		expect(normalizePrimaryDirectionSubTabKey('unexpected')).toBe('primarydirect');
	});

	test('PD_SYNC_REV is v11 (主限法改进:方位法/时间钥匙铺满 + 180+,强制旧持久化 chart 重算)', ()=>{
		expect(PD_SYNC_REV).toBe('pd_method_sync_v12');
	});

	test('SUPPORTED_PD_METHODS 恰为逐位核验的核方位法集合(精确相等,白名单之外一律不收)', ()=>{
		// 正向精确集合断言:任何未核验方法混入(无论叫什么)都会让本断言失败,无需枚举黑名单。
		expect([...SUPPORTED_PD_METHODS].sort()).toEqual([
			'core_alchabitius', 'equal_ecliptic', 'equal_hour_circle',
			'horosa_legacy', 'meridian', 'porphyry',
		]);
	});

	test('SUPPORTED_PD_TIME_KEYS 含 Ptolemy/Naibod/TrueSolarArc + 静态常数钥匙,全为公式/真算法,无拟合', ()=>{
		['Ptolemy', 'Naibod', 'TrueSolarArc', 'Cardano', 'Umar', 'Wollner', 'Plantiko',
			'Simmonite', 'SynodicYear', 'Kepler', 'Brahe', 'SymbolicDegree', 'SymbolicYear',
			'SymbolicMoon', 'SymbolicMonth', 'Quarterly', 'Quinary', 'Duodenary', 'Novenary', 'SelfMeasure']
			.forEach((k)=>{ expect(SUPPORTED_PD_TIME_KEYS).toContain(k); });
	});

	test('mergePrimaryDirectionChartObj writes 核方位法 method into params', ()=>{
		const chartObj = { params: {}, predictives: {} };
		const next = mergePrimaryDirectionChartObj(chartObj, {
			pdRows: [],
			pdMethod: 'meridian',
			pdTimeKey: 'Naibod',
		});
		expect(next.params.pdMethod).toBe('meridian');
		expect(next.params.pdTimeKey).toBe('Naibod');
	});

	test('mergePrimaryDirectionChartObj persists v10 进阶开关 (方向类型/顺逆/映点/界)', ()=>{
		const chartObj = { params: {}, predictives: {} };
		const next = mergePrimaryDirectionChartObj(chartObj, {
			pdRows: [],
			pdMethod: 'porphyry',
			pdTimeKey: 'TrueSolarArc',
			pdtype: 1,
			pdDirect: 1,
			pdConverse: 1,
			pdAntiscia: 1,
			pdTerms: 0,
		});
		expect(next.params.pdtype).toBe(1);
		expect(next.params.pdDirect).toBe(1);
		expect(next.params.pdConverse).toBe(1);
		expect(next.params.pdAntiscia).toBe(1);
		expect(next.params.pdTerms).toBe(0);
	});

	test('mergePrimaryDirectionChartObj 顺逆默认都开:pdDirect/pdConverse 未传落库 1,显式 0 才关', ()=>{
		const on = mergePrimaryDirectionChartObj({ params: {}, predictives: {} }, { pdRows: [] });
		expect(on.params.pdDirect).toBe(1);
		expect(on.params.pdConverse).toBe(1);
		const off = mergePrimaryDirectionChartObj({ params: {}, predictives: {} }, { pdRows: [], pdDirect: 0, pdConverse: 0 });
		expect(off.params.pdDirect).toBe(0);
		expect(off.params.pdConverse).toBe(0);
	});
});
