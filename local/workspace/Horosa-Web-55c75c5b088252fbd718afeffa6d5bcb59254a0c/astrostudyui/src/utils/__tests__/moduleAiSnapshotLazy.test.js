import { saveModuleAISnapshot, saveModuleAISnapshotLazy, loadModuleAISnapshot } from '../moduleAiSnapshot';
import { flushStorageWrites } from '../deferredStorage';

// 惰性快照铁律自检:内容与同步路径逐字一致、读取强制物化、latest-wins、空内容/异常回落旧值。
// 任何一条破 = AI 挂载/导出可能读到旧/缺快照 → 零降级承诺失守。
describe('saveModuleAISnapshotLazy 惰性构建语义', ()=>{
	beforeEach(()=>{
		window.localStorage.clear();
	});

	it('lazy 与 sync 内容逐字一致;读取强制物化(localStorage 还是旧值时不走旧分支)', ()=>{
		const text = '[宫位]\n命宫:紫微、天府\n[运限]\n大限 25-34';
		const meta = { date: '1991-03-12', zone: '+08:00' };
		const syncPayload = saveModuleAISnapshot('lazyt-a-sync', text, meta);
		saveModuleAISnapshotLazy('lazyt-a', ()=>text, meta);
		// 物化前 localStorage 无新值(延迟落盘),读取必须仍拿到新内容(read-time 物化)
		expect(window.localStorage.getItem('horosa.ai.snapshot.module.v1.lazyt-a')).toBeNull();
		const loaded = loadModuleAISnapshot('lazyt-a');
		expect(loaded.content).toBe(syncPayload.content);
		expect(loaded.meta).toEqual(meta);
		expect(typeof loaded.createdAt).toBe('string');
		expect(loaded.createdAt.length).toBeGreaterThan(0);
	});

	it('flushStorageWrites 物化并落盘,持久 JSON 内容与同步路径一致', ()=>{
		const text = '盘面文本-flush';
		saveModuleAISnapshotLazy('lazyt-b', ()=>text, {});
		flushStorageWrites();
		const raw = window.localStorage.getItem('horosa.ai.snapshot.module.v1.lazyt-b');
		expect(raw).not.toBeNull();
		const data = JSON.parse(raw);
		expect(data.content).toBe(text);
		expect(data.module).toBe('lazyt-b');
	});

	it('latest-wins:连发两次 lazy,旧 factory 永不执行', ()=>{
		const first = jest.fn(()=>'第一次');
		const second = jest.fn(()=>'第二次');
		saveModuleAISnapshotLazy('lazyt-c', first, {});
		saveModuleAISnapshotLazy('lazyt-c', second, {});
		const loaded = loadModuleAISnapshot('lazyt-c');
		expect(loaded.content).toBe('第二次');
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
		// flush 不再重复构建(幂等物化)
		flushStorageWrites();
		expect(second).toHaveBeenCalledTimes(1);
	});

	it('空内容物化 → 回落旧快照、不落盘(与同步版语义一致)', ()=>{
		saveModuleAISnapshot('lazyt-d', '旧快照内容', {});
		flushStorageWrites();
		saveModuleAISnapshotLazy('lazyt-d', ()=>'   ', {});
		const loaded = loadModuleAISnapshot('lazyt-d');
		expect(loaded.content).toBe('旧快照内容');
	});

	it('factory 抛错 → 保留旧快照', ()=>{
		saveModuleAISnapshot('lazyt-e', '抛错前的旧值', {});
		flushStorageWrites();
		saveModuleAISnapshotLazy('lazyt-e', ()=>{ throw new Error('boom'); }, {});
		const loaded = loadModuleAISnapshot('lazyt-e');
		expect(loaded.content).toBe('抛错前的旧值');
	});

	it('lazy 后 sync save → 读到 sync 内容,旧 lazy factory 不执行', ()=>{
		const stale = jest.fn(()=>'过期的 lazy');
		saveModuleAISnapshotLazy('lazyt-f', stale, {});
		saveModuleAISnapshot('lazyt-f', '同步真值', {});
		const loaded = loadModuleAISnapshot('lazyt-f');
		expect(loaded.content).toBe('同步真值');
		expect(stale).not.toHaveBeenCalled();
	});

	it('kill-switch(horosa.perf.lazySnapshot=0) → 退化为同步构建', ()=>{
		window.localStorage.setItem('horosa.perf.lazySnapshot', '0');
		try{
			const factory = jest.fn(()=>'同步退化内容');
			saveModuleAISnapshotLazy('lazyt-g', factory, {});
			// 关闭时 factory 立即执行(同步路径)
			expect(factory).toHaveBeenCalledTimes(1);
			expect(loadModuleAISnapshot('lazyt-g').content).toBe('同步退化内容');
		}finally{
			window.localStorage.removeItem('horosa.perf.lazySnapshot');
		}
	});
});
