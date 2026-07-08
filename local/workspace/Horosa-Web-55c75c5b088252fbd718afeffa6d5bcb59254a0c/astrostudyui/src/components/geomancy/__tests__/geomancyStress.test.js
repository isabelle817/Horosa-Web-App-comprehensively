// 天文地占穷尽压测:地占核算在后端(Kentang /geomancy/reading),前端可压测面 = 快照编排器 buildGeomancySnapshotText
//   (中右栏/AI 挂载据此渲染)。穷举对后端返回的全选项形态(7流派×11问类×5范围×2黄道 + 各 technique 形态 + 缺字)
//   → ①不抛 ②含关键段([判定]/十二宫/十六图形/解读技法) ③传本注记正确。后端核算本身不在前端 jest 范围(已标注)。
import { buildGeomancySnapshotText } from '../GeomancyMain';

// 后端返回 result 形态枚举(对照 GeomancyMain 选项与 README 真值源)。
const PROFILES = ['european_classical', 'european_planetary', 'european_modern', 'arabic_raml', 'india_ramal', 'sikidy', 'hakata'];
const QUESTION_TYPES = ['life', 'health', 'wealth', 'marriage', 'career', 'children', 'journey', 'religion', 'enemy', 'death', 'custom'];
const SCOPES = ['L0', 'L1', 'L2', 'L3', 'L4'];
const ZODIACS = ['classical', 'planetary'];
const PERFECTIONS = ['occupation', 'conjunction', 'mutation', 'translation', 'none'];
const ASPECTS = ['conjunction', 'sextile', 'square', 'trine', 'opposition', 'none'];

function fig(i){ return { nameZh: `图${i}`, nameEn: `Figure${i}`, planetZh: '太阳', elementZh: '火', keywordsZh: '阳刚' }; }
// 构造一份合法 reading(可按 scope 裁剪宫/图形以模拟各范围档返回)。
function makeResult(over){
	const o = over || {};
	const scope = o.readingScope || 'L3';
	const houses = scope === 'L0' || scope === 'L1' ? [] : Array.from({ length: 12 }, (_, i)=>({
		house: i + 1, nameZh: `第${i + 1}宫`, figure: fig(i), roles: i === 9 ? ['quesited'] : (i === 0 ? ['querent'] : []), reading: '断语示例',
	}));
	const figures16 = scope === 'L0' ? [] : Array.from({ length: 16 }, (_, i)=> fig(i));
	return {
		reading: {
			question: o.question || '测事',
			questionType: o.questionType || 'career',
			questionTypeZh: '事业与名誉',
			profileId: o.profileId || 'european_classical',
			zodiacSystem: o.zodiacSystem || 'classical',
			readingScope: scope,
			ascendantFigure: fig(0), ascendantSignZh: '白羊',
			judge: fig(14), reconciler: fig(15),
			rightWitness: fig(12), leftWitness: fig(13),
			primaryHouse: o.primaryHouse || 10,
			technique: o.technique !== undefined ? o.technique : { perfection: 'occupation', aspect: 'trine', prohibition: 0, points_parity: { total: 96, parity: 'even' }, timing: { speed: 'fast', unit: '日' }, via_puncti: { through: true }, natural_cosignificator: true },
			houses, figures16,
		},
		aiPrompt: o.aiPrompt,
	};
}

function snapOk(text){
	return typeof text === 'string' && text.length > 20;
}

describe('天文地占穷尽压测 · 快照编排器(后端核算不在前端范围)', ()=>{
	// 主笛卡尔:7流派 × 11问类 × 5范围 × 2黄道 = 770 → buildGeomancySnapshotText 不抛 + 非空 + 含判定段。
	test('7流派 × 11问类 × 5范围 × 2黄道(770):snapshot 不抛 + 非空 + 含[判定]段', ()=>{
		let n = 0;
		PROFILES.forEach((profileId)=>{
			QUESTION_TYPES.forEach((questionType)=>{
				SCOPES.forEach((readingScope)=>{
					ZODIACS.forEach((zodiacSystem)=>{
						const result = makeResult({ profileId, questionType, readingScope, zodiacSystem });
						let text = null;
						expect(()=>{ text = buildGeomancySnapshotText(result); }).not.toThrow();
						expect(snapOk(text)).toBe(true);
						expect(text).toContain('[判定]');
						n++;
					});
				});
			});
		});
		expect(n).toBe(7 * 11 * 5 * 2); // 770
	});

	// 解读技法形态:完美(5)×相位(6) = 30 → 不抛 + [解读技法] 段在位。
	test('解读技法 完美(5)×相位(6)(30):snapshot 不抛 + 含[解读技法]', ()=>{
		let n = 0;
		PERFECTIONS.forEach((perfection)=>{
			ASPECTS.forEach((aspect)=>{
				const result = makeResult({ technique: { perfection, aspect, points_parity: { total: 50, parity: 'odd' }, timing: { speed: 'slow', unit: '月' }, via_puncti: { through: false, broken_at: 5 } } });
				let text = null;
				expect(()=>{ text = buildGeomancySnapshotText(result); }).not.toThrow();
				expect(text).toContain('[解读技法]');
				n++;
			});
		});
		expect(n).toBe(5 * 6); // 30
	});

	test('传本注记:非默认流派/行星黄道/非L3范围 → 出「传本设置」;全默认 → 不注记', ()=>{
		const dflt = buildGeomancySnapshotText(makeResult({ profileId: 'european_classical', zodiacSystem: 'classical', readingScope: 'L3' }));
		expect(dflt).not.toContain('传本设置');
		const sikidy = buildGeomancySnapshotText(makeResult({ profileId: 'sikidy' }));
		expect(sikidy).toContain('传本设置');
		expect(sikidy).toContain('异或表盘');
		const planetary = buildGeomancySnapshotText(makeResult({ zodiacSystem: 'planetary' }));
		expect(planetary).toContain('黄道=行星归属体系');
		const l4 = buildGeomancySnapshotText(makeResult({ readingScope: 'L4' }));
		expect(l4).toContain('范围=L4');
	});

	test('aiPrompt 优先:有 aiPrompt → 以其为首;十二宫含问者/所问角标', ()=>{
		const withPrompt = buildGeomancySnapshotText(makeResult({ aiPrompt: 'AI-PROMPT-HEAD' }));
		expect(withPrompt.startsWith('AI-PROMPT-HEAD')).toBe(true);
		const full = buildGeomancySnapshotText(makeResult({ readingScope: 'L3' }));
		expect(full).toContain('【所问】');
		expect(full).toContain('【问者】');
		expect(full).toContain('[十二宫·图形入宫]');
		expect(full).toContain('[十六图形]');
	});

	test('缺字/空容错(后端异常返回也不崩):null/空 reading/无 technique/无宫', ()=>{
		expect(buildGeomancySnapshotText(null)).toBe('暂无地占数据');
		expect(()=> buildGeomancySnapshotText({})).not.toThrow();
		expect(()=> buildGeomancySnapshotText({ reading: {} })).not.toThrow();
		// 无 technique / 无 houses(L0)→ 不抛
		expect(()=> buildGeomancySnapshotText(makeResult({ technique: null, readingScope: 'L0' }))).not.toThrow();
	});

	test('本地编排单次耗时<阈值(期望<500ms,>1s 标红):全宫全图形快照', ()=>{
		const result = makeResult({ readingScope: 'L3' });
		const t0 = Date.now();
		buildGeomancySnapshotText(result);
		expect(Date.now() - t0).toBeLessThan(1000);
	});
});
