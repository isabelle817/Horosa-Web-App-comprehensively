import {
	saveAstroAISnapshot,
	saveAstroAISnapshotLazy,
	loadAstroAISnapshot,
	createAstroSnapshotSignature,
	ASTRO_AI_SNAPSHOT_KEY,
} from '../astroAiSnapshot';

// astro 主快照惰性化自检:内容与同步路径逐字节一致、signature 注册时即正确、
// read-time 强制物化、latest-wins。fixture 取最小可产出内容的盘面。
describe('saveAstroAISnapshotLazy 惰性构建语义', ()=>{
	const mkChart = (tag)=>({
		chartId: `cid-${tag}`,
		chart: {
			zodiacal: '回归黄道',
			hsys: 'Alcabitius',
			isDiurnal: true,
			planets: [
				{ id: 'Sun', name: '太阳', lon: 351.5, lat: 0, house: 10, sign: '双鱼', speed: 1.0 },
				{ id: 'Moon', name: '月亮', lon: 102.3, lat: 2.1, house: 1, sign: '巨蟹', speed: 12.5 },
			],
			houses: [],
			aspects: [],
		},
		params: { birth: '1991-03-12 10:30:00', zone: '+08:00', lon: '121e28', lat: '31n14' },
	});
	const fields = {};

	beforeEach(()=>{
		window.localStorage.clear();
	});

	it('lazy 与 sync 内容逐字节一致;signature/chartId 注册时打点', ()=>{
		const chartA = mkChart('a');
		const syncPayload = saveAstroAISnapshot(chartA, fields);
		expect(syncPayload).not.toBeNull();
		const chartB = { ...mkChart('a'), chartId: 'cid-b' };
		saveAstroAISnapshotLazy(chartB, fields);
		const loaded = loadAstroAISnapshot();
		expect(loaded.content).toBe(syncPayload.content);
		expect(loaded.signature).toBe(createAstroSnapshotSignature(chartB, fields));
		expect(loaded.chartId).toBe('cid-b');
	});

	it('read-time 强制物化:localStorage 还是旧值时读取仍拿到新内容', ()=>{
		const oldPayload = saveAstroAISnapshot(mkChart('old'), fields);
		window.localStorage.setItem(ASTRO_AI_SNAPSHOT_KEY, JSON.stringify(oldPayload));
		const next = mkChart('new');
		saveAstroAISnapshotLazy(next, fields);
		const loaded = loadAstroAISnapshot();
		// 读到的是 pending 物化结果(chartId/signature 为新),而非 localStorage 里的旧 payload
		expect(loaded.chartId).toBe('cid-new');
		expect(loaded.signature).toBe(createAstroSnapshotSignature(next, fields));
		expect(loaded.signature).not.toBe(oldPayload.signature);
		expect(loaded.content.length).toBeGreaterThan(0);
	});

	it('latest-wins:连发两次 lazy,读到最后一次', ()=>{
		const c1 = mkChart('one');
		const c2 = mkChart('two');
		c2.chart.planets[0].lon = 200.25;
		saveAstroAISnapshotLazy(c1, fields);
		saveAstroAISnapshotLazy(c2, fields);
		expect(loadAstroAISnapshot().chartId).toBe('cid-two');
	});

	it('lazy 后 sync save → 读到 sync 内容', ()=>{
		saveAstroAISnapshotLazy(mkChart('stale'), fields);
		saveAstroAISnapshot(mkChart('truth'), fields);
		expect(loadAstroAISnapshot().chartId).toBe('cid-truth');
	});

	it('kill-switch(horosa.perf.lazySnapshot=0) → 同步构建立即可读', ()=>{
		window.localStorage.setItem('horosa.perf.lazySnapshot', '0');
		try{
			const p = saveAstroAISnapshotLazy(mkChart('ks'), fields);
			expect(p && p.content && p.content.length > 0).toBe(true);
			expect(loadAstroAISnapshot().chartId).toBe('cid-ks');
		}finally{
			window.localStorage.removeItem('horosa.perf.lazySnapshot');
		}
	});
});
