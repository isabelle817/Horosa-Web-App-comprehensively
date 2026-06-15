// 批B P4「区间扫描」builder 循环行为 round-trip（守铁律「默认即现状」）：
//  - 不设区间(datetimeEnd/scanStep 空) → 单点 → 输出无「时段 N/M」分段（与扫描前逐字节一致路径）。
//  - 设 datetimeEnd + scanStep → 循环多段 → 输出含多个「时段 N/M」段头。
//  - 段数上限 30：超大区间被截断 + 追加截断提示。
// 通过 getAnalysisTechniqueContextWithOptions(profection) 走真实分派；mock request/predictiveAiSnapshot 产确定性 marker。

// 每个目标时刻型推运请求都回一个非空 Result（让 builder 走 buildPredictiveSnapshotText 而非空返）。
jest.mock('../request', () => ({
	__esModule: true,
	default: jest.fn(async () => ({ Result: { chart: { aspects: [] } } })),
}));

// predictive 快照 builder 回固定 marker（含传入 datetime 便于核对每段对应不同时刻）。
jest.mock('../predictiveAiSnapshot', () => ({
	__esModule: true,
	buildPredictiveSnapshotText: jest.fn((chartObj, params) => `PRED@${params && params.datetime ? params.datetime : '?'}`),
}));

// 取盘：返回带 params 的西洋盘（含本命经纬时区，供 buildPredictivePeriodSnapshot 组请求体）。
jest.mock('../../services/astro', () => ({
	__esModule: true,
	fetchChart: jest.fn(async () => ({
		Result: {
			chart: { objects: [], stars: [] },
			lots: [],
			params: {
				birth: '1990-05-18 10:00:00',
				date: '1990-05-18',
				time: '10:00:00',
				zone: '+08:00',
				lon: '118e27',
				lat: '31n38',
				ad: 1,
			},
			predictives: {},
		},
	})),
}));

jest.mock('../localcharts', () => ({ listLocalCharts: jest.fn(() => []), __esModule: true }));
jest.mock('../localcases', () => ({
	listLocalCases: jest.fn(() => []),
	getCaseTypeLabel: jest.fn((t) => t),
	getCaseTypeMeta: jest.fn(() => ({ module: '', value: '' })),
	__esModule: true,
}));
jest.mock('../astroAiSnapshot', () => ({
	buildAstroSnapshotContent: jest.fn(() => 'snapshot'),
	loadAstroAISnapshot: jest.fn(() => null),
}));
jest.mock('../moduleAiSnapshot', () => ({
	loadModuleAISnapshot: jest.fn(() => null),
	saveModuleAISnapshot: jest.fn(),
}));
jest.mock('../aiAnalysisStore', () => ({
	AI_ANALYSIS_STORES: { contextCache: 'contextCache' },
	getStoreRecord: jest.fn(async () => null),
	putStoreRecord: jest.fn(async (s, r) => r),
}));

import { getAnalysisTechniqueContextWithOptions } from '../aiAnalysisContext';

const SOURCE = {
	id: 'chart-scan',
	sourceType: 'chart',
	record: {
		cid: 'chart-scan',
		name: 'scan 测试',
		birth: '1990-05-18 10:00:00',
		zone: '+08:00',
		lon: '118e27',
		lat: '31n38',
	},
};

function countSegments(text) {
	const m = `${text || ''}`.match(/——\s+时段\s+\d+\/\d+/g);
	return m ? m.length : 0;
}

describe('P4 区间扫描 profection round-trip', () => {
	it('默认（无 datetimeEnd/scanStep）→ 单点：无「时段」分段（=现状路径）', async () => {
		// 仅给非 datetime 字段一个非默认值以触发 override 路径（asporb），但不设区间扫描 → 仍单点。
		const ctx = await getAnalysisTechniqueContextWithOptions(SOURCE, 'profection', { asporb: 2 });
		expect(ctx).toBeTruthy();
		expect(ctx.content).toContain('PRED@');
		expect(countSegments(ctx.content)).toBe(0); // 单点不加段头
	});

	it('设 datetime 起点 + datetimeEnd + scanStep=y → 多段，每段时刻递增', async () => {
		const ctx = await getAnalysisTechniqueContextWithOptions(SOURCE, 'profection', {
			datetime: '2020-01-01 12:00',
			datetimeEnd: '2024-01-01 12:00',
			scanStep: 'y',
		});
		expect(ctx).toBeTruthy();
		// 2020,2021,2022,2023,2024 = 5 段。
		expect(countSegments(ctx.content)).toBe(5);
		expect(ctx.content).toContain('2020-01-01 12:00');
		expect(ctx.content).toContain('2024-01-01 12:00');
		expect(ctx.content).toContain('—— 时段 1/5');
		expect(ctx.content).toContain('—— 时段 5/5');
	});

	it('终点早于起点 → 退回单点（不空、不反向）', async () => {
		const ctx = await getAnalysisTechniqueContextWithOptions(SOURCE, 'profection', {
			datetime: '2024-01-01 12:00',
			datetimeEnd: '2020-01-01 12:00',
			scanStep: 'y',
		});
		expect(ctx).toBeTruthy();
		expect(countSegments(ctx.content)).toBe(0);
		expect(ctx.content).toContain('2024-01-01 12:00');
	});

	it('超大区间（逐日跨多年）→ 截断到 30 段 + 截断提示', async () => {
		const ctx = await getAnalysisTechniqueContextWithOptions(SOURCE, 'profection', {
			datetime: '2020-01-01 12:00',
			datetimeEnd: '2025-01-01 12:00', // >30 天，逐日远超上限
			scanStep: 'd',
		});
		expect(ctx).toBeTruthy();
		expect(countSegments(ctx.content)).toBe(30); // 上限封顶
		expect(ctx.content).toContain('已达单次上限');
	});
});
