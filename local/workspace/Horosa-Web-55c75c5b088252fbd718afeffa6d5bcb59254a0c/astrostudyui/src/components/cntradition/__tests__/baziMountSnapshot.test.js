// 批A：八字「AI 挂载·多运限」round-trip——流年/流月/流日/流时多选真实改变快照输出。
// 守铁律：默认(不带 period)→ 快照与现状逐字一致；选了 → 追加 [多运限·指定时段] 段并含对应行。
// 本地 lunar.js 引擎直算（无需 mock 后端）。
import { buildBaziSnapshotForParams } from '../BaZi';

const BASE_PARAMS = {
	date: '1990-05-18',
	time: '10:00:00',
	zone: '+08:00',
	lon: 118.45,
	gpsLon: 118.45,
	lat: 31.63,
	gpsLat: 31.63,
	gender: 1,
	timeAlg: 1, // 锁定时分，跳过真太阳时调整
	after23NewDay: 1,
};

describe('八字挂载 round-trip：多运限', () => {
	test('默认（无 period）：不含 [多运限·指定时段] 段（守「默认即现状」）', async () => {
		const text = await buildBaziSnapshotForParams({ ...BASE_PARAMS });
		expect(text).toContain('[四柱与三元]');
		expect(text).not.toContain('[多运限·指定时段]');
	});

	test('默认 vs period 全空数组：输出逐字一致（空选择不挂段）', async () => {
		const a = await buildBaziSnapshotForParams({ ...BASE_PARAMS });
		const b = await buildBaziSnapshotForParams({ ...BASE_PARAMS, period: { liunian: [], liuyue: [], liuri: [], liushi: [] } });
		// period 字段存在但全空 → buildBaziPeriodLines 返回 []，不追加段。
		// 注：a 无 period、b 有空 period，二者经过同一 build 路径，多运限段都不出现。
		expect(b).not.toContain('[多运限·指定时段]');
		// 主体段（四柱/大运/流年概略）相同。
		const stripA = a.slice(0, a.indexOf('[多运限') >= 0 ? a.indexOf('[多运限') : a.length);
		const stripB = b.slice(0, b.indexOf('[多运限') >= 0 ? b.indexOf('[多运限') : b.length);
		expect(stripA).toEqual(stripB);
	});

	test('选流年（多年）：追加段并含多条「流年：」', async () => {
		const text = await buildBaziSnapshotForParams({ ...BASE_PARAMS, period: { liunian: [2020, 2021], liuyue: [], liuri: [], liushi: [] } });
		expect(text).toContain('[多运限·指定时段]');
		// 段内含 2020 / 2021 两条流年。
		const section = text.slice(text.indexOf('[多运限·指定时段]'));
		expect(section).toContain('流年：2020年');
		expect(section).toContain('流年：2021年');
	});

	test('流年×流月笛卡尔：2 年×2 月 → 4 条「流月：」', async () => {
		const text = await buildBaziSnapshotForParams({ ...BASE_PARAMS, period: { liunian: [2020, 2021], liuyue: [1, 6], liuri: [], liushi: [] } });
		const section = text.slice(text.indexOf('[多运限·指定时段]'));
		expect((section.match(/流月：/g) || []).length).toBe(4);
	});

	test('流日/流时锚定首个上层：选多日多时 → 各一条，不爆炸', async () => {
		const text = await buildBaziSnapshotForParams({ ...BASE_PARAMS, period: { liunian: [2020], liuyue: [3], liuri: [1, 2, 3], liushi: [0, 6] } });
		const section = text.slice(text.indexOf('[多运限·指定时段]'));
		expect((section.match(/流日：/g) || []).length).toBe(3);
		expect((section.match(/流时：/g) || []).length).toBe(2);
	});

	test('不同选择 → 段内容不同（证明参数真生效，非写死）', async () => {
		const a = await buildBaziSnapshotForParams({ ...BASE_PARAMS, period: { liunian: [2020], liuyue: [], liuri: [], liushi: [] } });
		const b = await buildBaziSnapshotForParams({ ...BASE_PARAMS, period: { liunian: [2030], liuyue: [], liuri: [], liushi: [] } });
		const secA = a.slice(a.indexOf('[多运限·指定时段]'));
		const secB = b.slice(b.indexOf('[多运限·指定时段]'));
		expect(secA).not.toEqual(secB);
	});

	test('段数上限：远超 50 组合 → 截断并含上限提示', async () => {
		const manyMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
		// 5 年 × 12 月 = 60 流月段 > 50。
		const text = await buildBaziSnapshotForParams({ ...BASE_PARAMS, period: { liunian: [2020, 2021, 2022, 2023, 2024], liuyue: manyMonths, liuri: [], liushi: [] } });
		expect(text).toContain('多运限段已达上限');
	});

	test('未选流年只选流月 → 用大运最早流年兜底（仍产流月段，不空挂）', async () => {
		const text = await buildBaziSnapshotForParams({ ...BASE_PARAMS, period: { liunian: [], liuyue: [1, 2], liuri: [], liushi: [] } });
		expect(text).toContain('[多运限·指定时段]');
		expect((text.slice(text.indexOf('[多运限·指定时段]')).match(/流月：/g) || []).length).toBe(2);
	});

	test('流日锚定到所选流月的公历月份，干支与 lunar.js 同口径', async () => {
		const text = await buildBaziSnapshotForParams({ ...BASE_PARAMS, period: { liunian: [2020], liuyue: [3], liuri: [1], liushi: [] } });
		const section = text.slice(text.indexOf('[多运限·指定时段]'));
		// 2020 年第 3 个节气月 = 清明月（公历 4 月）；流日 1 号 = 2020-04-01 = 甲戌（lunar.js 经典推算）。
		expect(section).toContain('流日：2020-04-01 甲戌');
	});

	// 坑修 B-1：生年的 flowMonths 从出生月之节气起过滤（数组<12 项），曾用 months[ord-1] 索引导致按月序错位/静默丢。
	// 改为按节气月号(term)匹配。生年(1990,5 月生)选「第1月=立春」→ 出生前 → 输出提示行而非错位月；非生年仍逐字对齐。
	const TERM_BY_ORD = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
	test('生年选流月不静默错位：每条「流月：第N月」的节气名必 === 该月序的节气（或为「出生前/无」提示）', async () => {
		// 1990-05-18 生；选生年 1990 全 12 月序，逐条核对 term 与月序一致（杜绝 ord-1 索引错位）。
		const text = await buildBaziSnapshotForParams({
			...BASE_PARAMS,
			period: { liunian: [1990], liuyue: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], liuri: [], liushi: [] },
		});
		const section = text.slice(text.indexOf('[多运限·指定时段]'));
		const lines = section.split('\n').filter((l) => /^流月：1990年 第\d+月/.test(l));
		expect(lines.length).toBe(12); // 每个月序各一行（在出生前者为提示行，不静默吞）。
		lines.forEach((line) => {
			const m = line.match(/^流月：1990年 第(\d+)月（([^，）]+)/);
			expect(m).toBeTruthy();
			const ord = Number(m[1]);
			const term = m[2];
			// 出生前被过滤的早月走提示文案（term 槽位即该月序的节气名）；有数据的月其 term 也必 === 该月序节气。
			expect(term).toBe(TERM_BY_ORD[ord - 1]);
		});
	});
});

// 断命流派挂载 round-trip（BUG-1 守）：params.school → 快照「当前主用流派」标注随所选派变，非恒「传统综合」。
// 对称紫微 sihuaSchool round-trip；缺省 school → 传统综合 = 现状字节级一致。
describe('八字挂载 round-trip：断命流派', () => {
	test('默认（无 school）：当前主用流派=传统综合（守「默认即现状」）', async () => {
		const text = await buildBaziSnapshotForParams({ ...BASE_PARAMS });
		expect(text).toContain('当前主用流派：传统综合');
	});

	test('school=fuyi：当前主用流派=扶抑派（随所选派，非恒综合）', async () => {
		const text = await buildBaziSnapshotForParams({ ...BASE_PARAMS, school: 'fuyi' });
		expect(text).toContain('当前主用流派：扶抑派');
		expect(text).not.toContain('当前主用流派：传统综合');
	});

	test('school=mangpai：当前主用流派=盲派', async () => {
		const text = await buildBaziSnapshotForParams({ ...BASE_PARAMS, school: 'mangpai' });
		expect(text).toContain('当前主用流派：盲派');
	});
});
