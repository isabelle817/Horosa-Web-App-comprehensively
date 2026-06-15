import { computeLunationPhase, buildLunationPhases, buildLunationPhaseSnapshotText } from '../lunationPhase';
import * as AstroConst from '../../constants/AstroConst';

describe('lunationPhase', ()=>{
	it('按日月差角定 8 相', ()=>{
		expect(computeLunationPhase(10).key).toBe('new');
		expect(computeLunationPhase(100).key).toBe('first');
		expect(computeLunationPhase(190).key).toBe('full');
		expect(computeLunationPhase(320).key).toBe('balsamic');
		expect(computeLunationPhase(370).key).toBe('new'); // 环绕
	});

	it('本命月相由日月黄经差得出', ()=>{
		const chart = { chart: { objects: [
			{ id: 'Sun', lon: 10 }, { id: 'Moon', lon: 200 },
		] }, params: { birth: '1990-01-01 12:00:00' } };
		const r = buildLunationPhases(chart, { maxAge: 90 });
		expect(r.natalElong).toBeCloseTo(190, 0);
		expect(r.natalPhase.key).toBe('full');
		expect(r.timeline.length).toBeGreaterThan(1);
	});

	it('快照含 [月相推运];缺日月返回空串', ()=>{
		const chart = { chart: { objects: [{ id: 'Sun', lon: 10 }, { id: 'Moon', lon: 50 }] }, params: {} };
		expect(buildLunationPhaseSnapshotText(chart)).toContain('[月相推运]');
		expect(buildLunationPhaseSnapshotText({ chart: { objects: [] } })).toBe('');
	});
});
