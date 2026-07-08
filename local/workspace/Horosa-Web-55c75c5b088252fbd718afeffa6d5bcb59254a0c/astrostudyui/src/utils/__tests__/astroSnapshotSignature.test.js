import { createAstroSnapshotSignature } from '../astroAiSnapshot';

// 自检：恒星黄道 ayanāṃśa 必须进入 AI 快照签名末位，否则换 ayanāṃśa 后
// hasMatchingSavedAstroSnapshot 会误判旧快照可复用（Lahiri 盘的快照套到 Raman 盘）。
// 见 astroAiSnapshot.js createAstroSnapshotSignature + aiAnalysisContext.js 匹配守卫。
describe('createAstroSnapshotSignature 恒星黄道 ayanāṃśa 入签名', ()=>{
	const baseParams = {
		birth: '1991-03-12 10:30:00', zone: '+08:00', lon: '121e28', lat: '31n14',
	};
	const mk = (ayan)=>({
		chart: { zodiacal: '恒星黄道', hsys: 'Placidus', isDiurnal: true },
		params: { ...baseParams, siderealAyanamsa: ayan },
	});

	it('ayanāṃśa 作为签名最后一段（| 分隔）', ()=>{
		const sig = createAstroSnapshotSignature(mk('raman'), {});
		expect(sig.split('|').pop()).toBe('raman');
	});

	it('仅 ayanāṃśa 不同 → 签名不同（核心：避免旧快照误复用）', ()=>{
		const lahiri = createAstroSnapshotSignature(mk('lahiri'), {});
		const raman = createAstroSnapshotSignature(mk('raman'), {});
		const fagan = createAstroSnapshotSignature(mk('fagan_bradley'), {});
		expect(lahiri).not.toBe(raman);
		expect(lahiri).not.toBe(fagan);
		expect(raman).not.toBe(fagan);
		// 其余身份段一致：仅末位 ayanāṃśa 段不同。
		expect(lahiri.split('|').slice(0, -1)).toEqual(raman.split('|').slice(0, -1));
	});

	it('回归盘/未设 ayanāṃśa → 末位为空（向后兼容：旧签名无此段）', ()=>{
		const sig = createAstroSnapshotSignature({
			chart: { zodiacal: '回归黄道', hsys: 'Placidus' },
			params: { ...baseParams },
		}, {});
		expect(sig.split('|').pop()).toBe('');
	});

	it('fields 兜底：params 无 ayanāṃśa 时读 fields.siderealAyanamsa', ()=>{
		const sig = createAstroSnapshotSignature(
			{ chart: { zodiacal: '恒星黄道', hsys: 'Placidus' }, params: { ...baseParams } },
			{ siderealAyanamsa: { value: 'kp_senthil' } },
		);
		expect(sig.split('|').pop()).toBe('kp_senthil');
	});
});
