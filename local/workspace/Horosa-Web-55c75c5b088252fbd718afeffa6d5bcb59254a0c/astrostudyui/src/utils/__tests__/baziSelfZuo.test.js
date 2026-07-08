/**
 * 星运 / 自坐 十二长生 golden（getSelfZuo）。
 * 星运 = 日干在各支长生；自坐 = 本柱干自坐本柱支长生。阳干顺行、阴干逆行。
 */
import { getSelfZuo, hiddenStemsOf, xunKongOf, buildLocalBaziResult, resolveDiShiByPhaseType } from '../baziLunarLocal';

describe('getSelfZuo 十二长生', () => {
	test.each([
		['丁', '午', '临官'], // 日主丁在午（星运·年柱）
		['丁', '卯', '病'],
		['丁', '酉', '长生'],
		['丙', '午', '帝旺'], // 丙午自坐
		['甲', '午', '死'],   // 甲午自坐
		['己', '酉', '长生'], // 己酉自坐
		['甲', '亥', '长生'], // 阳干顺行起点
		['乙', '午', '长生'], // 阴干逆行起点
		['壬', '申', '长生'],
		['癸', '卯', '长生'],
	])('%s 在 %s → %s', (gan, zhi, expected) => {
		expect(getSelfZuo(gan, zhi)).toBe(expected);
	});

	test('缺参数返回空', () => {
		expect(getSelfZuo('', '午')).toBe('');
		expect(getSelfZuo('丁', '')).toBe('');
	});
});

describe('流年/大运列补算 hiddenStemsOf / xunKongOf', () => {
	test('hiddenStemsOf(戌,丁) → 戊伤·辛才·丁比', () => {
		expect(hiddenStemsOf('戌', '丁')).toEqual([
			{ cell: '戊', relative: '伤' },
			{ cell: '辛', relative: '才' },
			{ cell: '丁', relative: '比' },
		]);
	});
	test('hiddenStemsOf(午,丁) → 丁比·己食', () => {
		expect(hiddenStemsOf('午', '丁')).toEqual([
			{ cell: '丁', relative: '比' },
			{ cell: '己', relative: '食' },
		]);
	});
	test('xunKongOf 空亡', () => {
		expect(xunKongOf('庚戌')).toBe('寅卯');
		expect(xunKongOf('丙午')).toBe('寅卯');
		expect(xunKongOf('')).toBe('');
	});
});

describe('星运/自坐 · 集成（2026-06-22 丙午/甲午/丁卯/己酉，日干丁）', () => {
	const four = buildLocalBaziResult({
		date: '2026-06-22', time: '18:00:00', zone: '+08:00',
		lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0, gender: 1, timeAlg: 1,
	}).bazi.fourColumns;
	const dayGan = four.day.stem.cell;

	test('星运（日干丁 vs 各支）= 临官/临官/病/长生', () => {
		expect(['year', 'month', 'day', 'time'].map((k) => getSelfZuo(dayGan, four[k].branch.cell)))
			.toEqual(['临官', '临官', '病', '长生']);
	});
	test('自坐（各柱干自坐本支）= 帝旺/死/病/长生', () => {
		expect(['year', 'month', 'day', 'time'].map((k) => getSelfZuo(four[k].stem.cell, four[k].branch.cell)))
			.toEqual(['帝旺', '死', '病', '长生']);
	});
});

// 死选项接线·phaseType（长生派别）覆盖（仅水土同 + 土日元改起点；其余 byte-perfect）。
describe('phaseType 长生派别覆盖（resolveDiShiByPhaseType）', () => {
	test('phaseType=0/2 或 非土日元 → 恒返回 fallback（byte-perfect）', () => {
		expect(resolveDiShiByPhaseType('戊', '寅', 0, '长生')).toBe('长生');
		expect(resolveDiShiByPhaseType('戊', '申', 2, 'KEEP')).toBe('KEEP'); // 阳顺阴逆=lunar现状
		expect(resolveDiShiByPhaseType('己', '酉', 0, 'KEEP')).toBe('KEEP');
		expect(resolveDiShiByPhaseType('己', '酉', 2, 'KEEP')).toBe('KEEP');
		expect(resolveDiShiByPhaseType('甲', '亥', 1, 'KEEP')).toBe('KEEP'); // 非土日元
		expect(resolveDiShiByPhaseType('壬', '申', 1, 'KEEP')).toBe('KEEP');
	});
	test('phaseType=1 水土同 土日元（戊/己）→ 长生在申、顺行（对 Java suitutong 表）', () => {
		// 戊/己 水土同整列一致：申=长生、酉=沐浴、戌=冠带、亥=临官、子=帝旺、午=胎、寅=病。
		const expectRow = { 申: '长生', 酉: '沐浴', 戌: '冠带', 亥: '临官', 子: '帝旺', 午: '胎', 寅: '病' };
		['戊', '己'].forEach((gan) => {
			Object.keys(expectRow).forEach((zhi) => {
				expect(resolveDiShiByPhaseType(gan, zhi, 1, '__')).toBe(expectRow[zhi]);
			});
		});
	});
});

// 死选项接线·phaseType 引擎级：默认(0) diShi == lunar 现状；切水土同(1) 对戊/己日元四柱 diShi 改变。
describe('phaseType 引擎级（buildLocalBaziResult）', () => {
	// 2000-01-01 = 己卯年/丙子月/戊午日（日元戊=土），用于验证水土同覆盖。
	const base = { date: '2000-01-01', time: '12:00:00', zone: '+08:00', lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0, gender: 1, timeAlg: 1 };
	const dishis = (params) => {
		const c = buildLocalBaziResult(params).bazi.fourColumns;
		return ['year', 'month', 'day', 'time'].map((k) => c[k].ganziPhase);
	};
	test('默认（无 phaseType）与 phaseType=0 / phaseType=2 一致（lunar 现状）', () => {
		const def = dishis({ ...base });
		expect(dishis({ ...base, phaseType: 0 })).toEqual(def);
		expect(dishis({ ...base, phaseType: 2 })).toEqual(def);
	});
	test('日元为土（戊/己）时 phaseType=1（水土同）改四柱 diShi；默认不变', () => {
		const c = buildLocalBaziResult({ ...base }).bazi.fourColumns;
		const dayGan = c.day.stem.cell;
		expect(['戊', '己']).toContain(dayGan); // 锁定该盘日元为土（戊午日）
		expect(dishis({ ...base, phaseType: 1 })).not.toEqual(dishis({ ...base, phaseType: 0 }));
	});
});

// 死选项接线·godKeyPos 引擎级：默认 '年'；'年日' 为旧全集（神煞含日基更多）。
describe('godKeyPos 引擎级（buildLocalBaziResult，神煞主位）', () => {
	const base = { date: '2026-06-22', time: '18:00:00', zone: '+08:00', lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0, gender: 1, timeAlg: 1 };
	const allShenSha = (params) => {
		const c = buildLocalBaziResult(params).bazi.fourColumns;
		return ['year', 'month', 'day', 'time'].reduce((s, k) => s.concat(c[k].shenSha || []), []);
	};
	test('默认（无 godKeyPos）== godKeyPos="年"', () => {
		expect(allShenSha({ ...base })).toEqual(allShenSha({ ...base, godKeyPos: '年' }));
	});
	test('godKeyPos="年日" 神煞数 ≥ 默认"年"（含日主位基组更多或相等）', () => {
		const nian = allShenSha({ ...base, godKeyPos: '年' }).length;
		const nianri = allShenSha({ ...base, godKeyPos: '年日' }).length;
		expect(nianri).toBeGreaterThanOrEqual(nian);
	});
});
