// 报告功能 - pipeline 工具函数 + ConcurrentQueue + RAG 过滤

import { __testing__ } from '../reportPipeline';
import { ConcurrentQueue } from '../reportConcurrentQueue';
import { filterMaterialsBySchools, rankChunksByKeywordWithExtra } from '../aiAnalysisRag';
import { resolveSchoolPrompt, suggestSchoolNames } from '../reportSchools';

describe('reportPipeline.isContentEmpty', ()=>{
	const { isContentEmpty } = __testing__;
	test('空字符串 → true', ()=>{
		expect(isContentEmpty('')).toBe(true);
		expect(isContentEmpty('   \n')).toBe(true);
	});
	test('< 80 字 → true', ()=>{
		expect(isContentEmpty('简短回复')).toBe(true);
		expect(isContentEmpty('a'.repeat(79))).toBe(true);
	});
	test('>= 80 字 且无 stop-word → false', ()=>{
		expect(isContentEmpty('a'.repeat(120))).toBe(false);
	});
	test('短 + stop-word → true', ()=>{
		expect(isContentEmpty('抱歉，资料不足，无法分析。仅供参考。')).toBe(true);
	});
});

describe('reportPipeline.classifyError', ()=>{
	const { classifyError } = __testing__;
	test('401 / 403 → auth', ()=>{
		expect(classifyError(new Error('HTTP 401 unauthorized')).category).toBe('auth');
		expect(classifyError(new Error('invalid API key')).category).toBe('auth');
	});
	test('429 → rate, retriable', ()=>{
		expect(classifyError(new Error('429 rate limit')).category).toBe('rate');
		expect(classifyError(new Error('rate-limit exceeded')).retriable).toBe(true);
	});
	test('5xx → server, retriable', ()=>{
		expect(classifyError(new Error('500 internal error')).category).toBe('server');
		expect(classifyError(new Error('502 Bad Gateway')).retriable).toBe(true);
	});
	test('timeout → timeout, retriable', ()=>{
		expect(classifyError(new Error('request timeout')).category).toBe('timeout');
	});
});

describe('reportPipeline.extractSnapshotSegments', ()=>{
	const { extractSnapshotSegments } = __testing__;
	const SAMPLE = `[起盘信息]
出生日期：1990-01-01

[四柱与三元]
天干：甲乙丙丁
地支：子丑寅卯

[神煞]
天乙贵人 / 文昌

[大运]
10年：庚午`;

	test('按段名抽取', ()=>{
		const result = extractSnapshotSegments(SAMPLE, ['起盘信息', '大运']);
		expect(result).toContain('[起盘信息]');
		expect(result).toContain('1990-01-01');
		expect(result).toContain('[大运]');
		expect(result).toContain('庚午');
		expect(result).not.toContain('天乙贵人');
	});

	test('段名空 → 返回全文', ()=>{
		expect(extractSnapshotSegments(SAMPLE, []).length).toBeGreaterThan(50);
		expect(extractSnapshotSegments(SAMPLE, null).length).toBeGreaterThan(50);
	});

	test('部分匹配（包含关系）也成功', ()=>{
		const result = extractSnapshotSegments(SAMPLE, ['四柱']);
		expect(result).toContain('天干：甲乙丙丁');
	});
});

describe('ConcurrentQueue', ()=>{
	test('限制并发数', async ()=>{
		const q = new ConcurrentQueue(2);
		let running = 0;
		let maxConcurrent = 0;
		const make = (ms)=>async ()=>{
			running++;
			maxConcurrent = Math.max(maxConcurrent, running);
			await new Promise((r)=>setTimeout(r, ms));
			running--;
		};
		const tasks = [50, 50, 50, 50, 50].map((ms)=>q.add(make(ms)));
		await q.drain();
		expect(maxConcurrent).toBeLessThanOrEqual(2);
	});

	test('drain 在空队列上立即 resolve', async ()=>{
		const q = new ConcurrentQueue(2);
		await expect(q.drain()).resolves.toBeUndefined();
	});
});

describe('filterMaterialsBySchools', ()=>{
	const materials = [
		{ id: '1', schools: ['子平派'] },
		{ id: '2', schools: ['盲派', '新派（段建业）'] },
		{ id: '3', schools: [] },              // 通用
		{ id: '4', /* schools undefined */ },  // 通用
		{ id: '5', schools: ['北派飞星'] },
	];

	test('selectedSchools=[] → 全量', ()=>{
		expect(filterMaterialsBySchools(materials, []).length).toBe(5);
	});

	test('单选 子平 → 含子平 + 通用', ()=>{
		const out = filterMaterialsBySchools(materials, ['子平派']);
		expect(out.map((m)=>m.id).sort()).toEqual(['1', '3', '4']);
	});

	test('多选 (or)', ()=>{
		const out = filterMaterialsBySchools(materials, ['子平派', '北派飞星']);
		expect(out.map((m)=>m.id).sort()).toEqual(['1', '3', '4', '5']);
	});

	test('选了但都不匹配 → 仍含通用', ()=>{
		const out = filterMaterialsBySchools(materials, ['不存在的流派']);
		expect(out.map((m)=>m.id).sort()).toEqual(['3', '4']);
	});
});

describe('rankChunksByKeywordWithExtra', ()=>{
	test('extra 关键词加权', ()=>{
		const chunks = [
			{ id: 'a', content: '事业宫坐紫微，宜从政经商', searchText: '事业宫坐紫微宜从政经商' },
			{ id: 'b', content: '感情温和，与配偶相敬', searchText: '感情温和与配偶相敬' },
		];
		const ranked = rankChunksByKeywordWithExtra('婚姻', ['配偶', '夫妻'], chunks);
		expect(ranked[0].id).toBe('b'); // 'b' 含配偶 extra 高分
	});
});

describe('reportSchools', ()=>{
	test('resolveSchoolPrompt 空选择 → 通用', ()=>{
		const r = resolveSchoolPrompt('bazi', []);
		expect(r.schoolDisplay).toBe('通用');
		expect(r.schoolGuideline).toContain('综合多家');
	});

	test('resolveSchoolPrompt 用 key 查找', ()=>{
		const r = resolveSchoolPrompt('bazi', ['ziping']);
		expect(r.schoolDisplay).toBe('子平派');
		expect(r.schoolGuideline).toContain('子平');
	});

	test('resolveSchoolPrompt 用 name 查找', ()=>{
		const r = resolveSchoolPrompt('bazi', ['盲派']);
		expect(r.schoolDisplay).toBe('盲派');
	});

	test('resolveSchoolPrompt 多选合并', ()=>{
		const r = resolveSchoolPrompt('bazi', ['子平派', '盲派']);
		expect(r.schoolDisplay).toContain('子平派');
		expect(r.schoolDisplay).toContain('盲派');
	});

	test('suggestSchoolNames 含八字 + 紫微', ()=>{
		const names = suggestSchoolNames();
		expect(names).toContain('子平派');
		expect(names).toContain('北派飞星');
	});
});
