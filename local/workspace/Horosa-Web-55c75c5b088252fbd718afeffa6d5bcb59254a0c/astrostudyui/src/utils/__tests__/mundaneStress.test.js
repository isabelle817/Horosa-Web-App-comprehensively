// 世俗盘(Mundane)穷尽压测:纯前端判读层(describe* / ruleset / momentPipeline 纯函数)× 4 规则集 × 多 facts × 12 座 × 食类
//   → ①不抛 ②结构完整 ③单次<阈值。事件抓取(fetchMundaneEvents/chartAtMoment)是后端依赖,不在前端压测范围(已标注)。
//   无 byte-perfect golden;victor 复用主限法 computeAlmuten(其 golden 在 pytest 守),此处只断结构+不抛。
import {
	describeMundaneChart, describeMundaneVictor, describeEclipse, describeEclipseAfflictions,
	describeIngressSkeleton, buildMundaneStarPoints, mundaneFixedStarHits, MUNDANE_FIXED_STARS,
} from '../../divination/mundane/describe';
import { MUNDANE_RULESETS, MUNDANE_RULESET_DEFAULT, rulesetConfig } from '../../divination/mundane/ruleset';
import { signKeyFromLon, nodeDistance, ingressDurationMonths, ingressGovernance } from '../../divination/mundane/momentPipeline';

const SIGN_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const RULESET_KEYS = MUNDANE_RULESETS.map((r)=> r.key); // ptolemaic/medieval/modern/barbault
const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

// 构造一张合法 facts(同 mundaneVictor.test.js 口径):10 行星散布、含 meta.sect/ascSign、houses。
function makeFacts(ascSignIdx, seed){
	const planets = {};
	PLANETS.forEach((k, i)=>{
		const lon = ((ascSignIdx * 30) + (i * 37) + (seed || 0) * 13) % 360;
		const si = Math.floor(lon / 30);
		planets[k] = {
			lon, sign: SIGN_KEYS[si], signlon: lon % 30,
			house: ((i + (seed || 0)) % 12) + 1,
			angularity: (i % 3 === 0) ? 'angular' : (i % 3 === 1 ? 'succedent' : 'cadent'),
			retro: i % 4 === 0,
		};
	});
	const ascLon = ascSignIdx * 30 + 5.5;
	const houses = {};
	for(let h = 1; h <= 12; h += 1){
		houses[h] = { sign: SIGN_KEYS[(ascSignIdx + h - 1) % 12], ruler: PLANETS[(h) % 7], planets: [] };
	}
	return { meta: { sect: seed % 2 ? 'night' : 'day', ascLon, ascSign: SIGN_KEYS[ascSignIdx], ascDegree: 5.5 }, lons: { asc: ascLon, mc: (ascLon + 270) % 360 }, houses, planets };
}

describe('世俗盘穷尽压测 · 纯前端判读层', ()=>{
	test('4 规则集登记齐全 + rulesetConfig 各档开关完整 + 未知键回落默认', ()=>{
		expect(RULESET_KEYS).toEqual(['ptolemaic', 'medieval', 'modern', 'barbault']);
		RULESET_KEYS.forEach((k)=>{
			const c = rulesetConfig(k);
			expect(c.key).toBe(k);
			['bodies', 'ingressRule', 'eclipseTiming', 'orbScheme', 'termsVariant', 'triplicityVariant', 'chorographyDataset'].forEach((f)=>{
				expect(c[f]).toBeTruthy();
			});
			expect(typeof c.showOuterPlanets).toBe('boolean');
		});
		expect(rulesetConfig('nonexistent').key).toBe(MUNDANE_RULESET_DEFAULT);
		expect(rulesetConfig(undefined).key).toBe(MUNDANE_RULESET_DEFAULT);
	});

	// 主笛卡尔:4 规则集 × 12 上升座 × 2 sect 种子 = 96 → 全套 describe* 不抛 + 结构完整。
	test('4规则集 × 12上升座 × 2种子(96):describeChart/Victor/IngressSkeleton/StarPoints 不抛 + 结构完整', ()=>{
		let n = 0;
		RULESET_KEYS.forEach((rk)=>{
			SIGN_KEYS.forEach((_, ascIdx)=>{
				[0, 1].forEach((seed)=>{
					const facts = makeFacts(ascIdx, seed);
					let rows = null, victor = null, skel = null, pts = null;
					expect(()=>{ rows = describeMundaneChart(facts); }).not.toThrow();
					expect(Array.isArray(rows)).toBe(true);
					rows.forEach((r)=>{ expect(r.planet).toBeTruthy(); expect(r.house >= 1 && r.house <= 12).toBe(true); });
					expect(()=>{ victor = describeMundaneVictor(facts, rk); }).not.toThrow();
					// victor 可为 null(computeAlmuten 缺点),非 null 时须降序累分
					if(victor){
						expect(PLANETS).toContain(victor.victor);
						for(let i = 1; i < victor.scores.length; i += 1){ expect(victor.scores[i - 1].score).toBeGreaterThanOrEqual(victor.scores[i].score); }
					}
					expect(()=>{ skel = describeIngressSkeleton(facts); }).not.toThrow();
					expect(skel && skel.ascSign).toBeTruthy();
					expect(()=>{ pts = buildMundaneStarPoints(facts); }).not.toThrow();
					expect(Array.isArray(pts) && pts.length >= 10).toBe(true);
					n++;
				});
			});
		});
		expect(n).toBe(4 * 12 * 2); // 96
	});

	// 食盘:日食/月食 × 12 座 × orbScheme(by_aspect/moiety)→ describeEclipse + describeEclipseAfflictions 不抛 + 结构。
	test('食盘 日/月食 × 12座 × orbScheme(2)(48):describeEclipse + Afflictions 不抛 + 元素/分度结构', ()=>{
		let n = 0;
		['solar', 'lunar'].forEach((kind)=>{
			SIGN_KEYS.forEach((_, ascIdx)=>{
				['by_aspect', 'moiety'].forEach((orb)=>{
					const facts = makeFacts(ascIdx, kind === 'lunar' ? 1 : 0);
					let ec = null, aff = null;
					expect(()=>{ ec = describeEclipse(facts, kind); }).not.toThrow();
					expect(ec && ec.luminary).toBe(kind === 'lunar' ? 'moon' : 'sun');
					expect(ec.decan >= 0 && ec.decan <= 2).toBe(true);
					expect(ec.element).toBeTruthy();
					expect(()=>{ aff = describeEclipseAfflictions(facts, kind, orb); }).not.toThrow();
					// 返回 { afflictors:[], house, orbScheme, maxOrb }
					expect(aff && Array.isArray(aff.afflictors)).toBe(true);
					expect(aff.maxOrb).toBe(orb === 'moiety' ? 2 : 3);
					n++;
				});
			});
		});
		expect(n).toBe(2 * 12 * 2); // 48
	});

	test('momentPipeline 纯函数全域:signKeyFromLon 全圈 + ingressDuration/Governance 全座 + nodeDistance 边界', ()=>{
		// signKeyFromLon:0..359 全覆盖落正确座 + 越界归一 + 非法 null
		for(let lon = 0; lon < 360; lon += 1){
			expect(signKeyFromLon(lon)).toBe(SIGN_KEYS[Math.floor(lon / 30)]);
		}
		expect(signKeyFromLon(365)).toBe('aries');
		expect(signKeyFromLon(-5)).toBe('pisces');
		expect(signKeyFromLon('bad')).toBeNull();
		// ingressDurationMonths / Governance:12 座 × 3 入境规则
		SIGN_KEYS.forEach((sk)=>{
			const dur = ingressDurationMonths(sk);
			expect([3, 6, 12]).toContain(dur);
			['quarterly', 'aries_annual', 'capricorn_year'].forEach((rule)=>{
				const g = ingressGovernance(sk, rule);
				expect([3, 6, 12]).toContain(g.spanMonths);
				expect(Array.isArray(g.needSeasonal)).toBe(true);
			});
		});
		// nodeDistance:0..360 对若干交点,结果 0..180
		[0, 90, 180, 270].forEach((node)=>{
			for(let lon = 0; lon < 360; lon += 30){
				const d = nodeDistance(lon, node);
				expect(d).toBeGreaterThanOrEqual(0);
				expect(d).toBeLessThanOrEqual(180);
			}
		});
		expect(nodeDistance('x', 0)).toBeNull();
	});

	test('恒星命中 mundaneFixedStarHits 对 facts 星点不抛 + 命中项结构合法', ()=>{
		expect(MUNDANE_FIXED_STARS.length).toBeGreaterThan(0);
		SIGN_KEYS.forEach((_, ascIdx)=>{
			const facts = makeFacts(ascIdx, 0);
			const pts = buildMundaneStarPoints(facts);
			let hits = null;
			expect(()=>{ hits = mundaneFixedStarHits(pts, 2026, 2); }).not.toThrow();
			expect(Array.isArray(hits)).toBe(true);
		});
	});

	test('缺/空 facts 容错(不臆造):null/无 planets → 空数组或 null,不抛', ()=>{
		expect(describeMundaneChart(null)).toEqual([]);
		expect(describeMundaneChart({})).toEqual([]);
		expect(describeMundaneVictor(null)).toBeNull();
		expect(describeMundaneVictor({ planets: {} })).toBeNull();
		expect(describeEclipse(null, 'solar')).toBeNull();
		expect(describeIngressSkeleton(null)).toBeNull();
		expect(buildMundaneStarPoints(null)).toEqual([]);
	});

	test('规则集切档真换:medieval 界主=ptolemaic、modern 界主=egyptian(victor 据之可重算)', ()=>{
		expect(rulesetConfig('medieval').termsVariant).toBe('ptolemaic');
		expect(rulesetConfig('modern').termsVariant).toBe('egyptian');
		expect(rulesetConfig('ptolemaic').triplicityVariant).toBe('ptolemaic');
		expect(rulesetConfig('modern').orbScheme).toBe('by_aspect');
		expect(rulesetConfig('ptolemaic').orbScheme).toBe('moiety');
	});

	test('本地引擎单次耗时<阈值(期望<500ms,>1s 标红):全套 describe* 一次', ()=>{
		const facts = makeFacts(4, 0);
		const t0 = Date.now();
		describeMundaneChart(facts);
		describeMundaneVictor(facts, 'modern');
		describeIngressSkeleton(facts);
		describeEclipse(facts, 'solar');
		describeEclipseAfflictions(facts, 'solar', 'by_aspect');
		expect(Date.now() - t0).toBeLessThan(1000);
	});
});
