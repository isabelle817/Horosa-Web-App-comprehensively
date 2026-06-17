// astroPatternOverview 单测：龙截龙拥 / 孤月独明 / 第一西没(职业) / 强吉木 6&9 例外·照耀 / 主宰循环 / 联结纯粹(有情无情)。
import { buildPatternOverview, toOverviewRows } from '../astroPatternOverview';

// 造对象：id 用图表 ID('Sun'..)，sign PascalCase，house 'HouseN'。
const O = (id, lon, sign, house, ruleHouses = [], extra = {}) => ({ id, lon, sign, house: `House${house}`, ruleHouses, lonspeed: 1, ...extra });

// 升狮(Asc Leo)基准下的一组合理落点；node 轴用于龙截。
function chartWith(objects, opts = {}){
	return {
		objects,
		isDiurnal: opts.isDiurnal != null ? opts.isDiurnal : true,
		houses: [{ id: 'House1', sign: 'Leo' }],
	};
}
const wrap = (perchart, extra = {}) => ({ chart: perchart, mutuals: extra.mutuals || { normal: [], abnormal: [] }, receptions: extra.receptions || { normal: [], abnormal: [] }, aspects: extra.aspects || { normalAsp: {} } });

describe('astroPatternOverview', () => {
	test('空对象 → empty', () => {
		expect(buildPatternOverview({ objects: [] }, {}).empty).toBe(true);
	});

	test('龙截 1:6 —— 孤星被点名 + 落宫', () => {
		// 北交 0°(白羊0)。轴 0..180。把 6 星塞在 10..160(同侧 A)，火星塞在 200(对侧 B 唯一)。
		const objs = [
			O('North Node', 0, 'Aries', 3), O('South Node', 180, 'Libra', 9),
			O('Sun', 10, 'Aries', 9), O('Moon', 30, 'Taurus', 10), O('Mercury', 50, 'Gemini', 11),
			O('Venus', 70, 'Cancer', 12), O('Jupiter', 110, 'Leo', 1), O('Saturn', 150, 'Virgo', 2),
			O('Mars', 200, 'Libra', 3, [4, 11]),
		];
		const data = buildPatternOverview(chartWith(objs), wrap(chartWith(objs)));
		expect(data.dragon.has).toBe(true);
		expect(data.dragon.kind).toBe('龙截');
		expect(data.dragon.lone).toBe('Mars');
		expect(data.dragon.loneHouse).toBe(3);
	});

	test('龙拥 0:7 —— 七星聚一侧', () => {
		const objs = [
			O('North Node', 0, 'Aries', 1), O('South Node', 180, 'Libra', 7),
			O('Sun', 10, 'Aries', 1), O('Moon', 30, 'Taurus', 2), O('Mercury', 50, 'Gemini', 3),
			O('Venus', 70, 'Cancer', 4), O('Mars', 90, 'Cancer', 4), O('Jupiter', 130, 'Leo', 5), O('Saturn', 160, 'Virgo', 6),
		];
		const data = buildPatternOverview(chartWith(objs), wrap(chartWith(objs)));
		expect(data.dragon.has).toBe(true);
		expect(data.dragon.kind).toBe('龙拥');
	});

	test('孤月独明 —— 夜生且唯月在地平上', () => {
		const objs = [
			O('Sun', 10, 'Aries', 4, [], { aboveHorizon: false }),
			O('Moon', 200, 'Libra', 10, [], { aboveHorizon: true }),
			O('Mercury', 20, 'Aries', 3, [], { aboveHorizon: false }),
			O('Venus', 40, 'Taurus', 5, [], { aboveHorizon: false }),
			O('Mars', 60, 'Gemini', 6, [], { aboveHorizon: false }),
			O('Jupiter', 80, 'Cancer', 2, [], { aboveHorizon: false }),
			O('Saturn', 120, 'Leo', 1, [], { aboveHorizon: false }),
		];
		const data = buildPatternOverview(chartWith(objs, { isDiurnal: false }), wrap(chartWith(objs, { isDiurnal: false })));
		expect(data.loneMoon.has).toBe(true);
		// 昼生盘 → 否
		const day = buildPatternOverview(chartWith(objs, { isDiurnal: true }), wrap(chartWith(objs, { isDiurnal: true })));
		expect(day.loneMoon.has).toBe(false);
	});

	test('职业 = 月第一西没星(黄经在前最近者)', () => {
		// 月 0°；火 350(在后=东升)，水 20(在前最近=第一西没)，金 80(在前更远)。
		const objs = [
			O('Sun', 300, 'Aquarius', 7), O('Moon', 0, 'Aries', 9),
			O('Mercury', 20, 'Aries', 9, [2, 11]), O('Venus', 80, 'Gemini', 11),
			O('Mars', 350, 'Pisces', 8), O('Jupiter', 150, 'Virgo', 2), O('Saturn', 200, 'Libra', 3),
		];
		const data = buildPatternOverview(chartWith(objs), wrap(chartWith(objs)));
		expect(data.vocation.career.id).toBe('Mercury');
	});

	test('强吉木星：主 6&9 仍强吉；照耀计数据 normalAsp(Exact/Applicative/Separative)', () => {
		const objs = [
			O('Sun', 10, 'Aries', 1), O('Moon', 40, 'Taurus', 2), O('Mercury', 70, 'Gemini', 3),
			O('Venus', 100, 'Cancer', 4), O('Mars', 130, 'Leo', 5),
			O('Jupiter', 250, 'Sagittarius', 5, [6, 9]), O('Saturn', 280, 'Capricorn', 6),
		];
		const aspects = { normalAsp: { Jupiter: {
			Exact: [{ id: 'Sun', asp: 120, orb: 1 }],
			Applicative: [{ id: 'Moon', asp: 90, orb: 2 }],
			Separative: [{ id: 'Mars', asp: 60, orb: 3 }],
			None: [{ id: 'Venus', asp: 180, orb: 9 }],
		} } };
		const data = buildPatternOverview(chartWith(objs), wrap(chartWith(objs), { aspects }));
		expect(data.jupiter.strong).toBe(true);            // 6&9 例外
		expect(data.jupiter.litCount).toBe(4);             // Sun/Moon/Mars + None 的 Venus(容许度内真相位,无明确出入相也算)
		expect(data.jupiter.lit.sort()).toEqual(['Mars', 'Moon', 'Sun', 'Venus']);
		// 木主 8 → 非强吉
		const objs2 = objs.map((o)=> o.id === 'Jupiter' ? { ...o, ruleHouses: [6, 8] } : o);
		const data2 = buildPatternOverview(chartWith(objs2), wrap(chartWith(objs2)));
		expect(data2.jupiter.strong).toBe(false);
	});

	test('联结纯粹(有情无情)：全{8,12}→有情·玄；混杂→无情；互换标', () => {
		// A=Sun 主12 落8th；B=Mars 主8 落12th → 全{8,12} 有情·玄 + 互换。
		const objs = [
			O('Sun', 10, 'Aries', 8, [12]), O('Mars', 200, 'Libra', 12, [8]),
			O('Moon', 40, 'Taurus', 2), O('Mercury', 70, 'Gemini', 3), O('Venus', 100, 'Cancer', 4),
			O('Jupiter', 130, 'Leo', 5), O('Saturn', 160, 'Virgo', 6),
		];
		const mutuals = { normal: [{ planetA: { id: 'Sun' }, planetB: { id: 'Mars' } }], abnormal: [] };
		const data = buildPatternOverview(chartWith(objs), wrap(chartWith(objs), { mutuals }));
		const c = data.connections.mutual[0];
		expect(c.purity.pure).toBe(true);
		expect(c.purity.realm).toBe('玄');
		expect(c.purity.swap).toBe(true);
	});

	test('反世俗={6,8,12}：含6宫的全反世俗联结→有情·玄(用户订正6/8/12皆凶宫)', () => {
		// A=Sun 主6 落8th；B=Mars 主8 落6th → 全 {6,8} ∈ {6,8,12} → 有情·玄。
		const objs = [
			O('Sun', 10, 'Aries', 8, [6]), O('Mars', 200, 'Libra', 6, [8]),
			O('Moon', 40, 'Taurus', 2), O('Mercury', 70, 'Gemini', 3), O('Venus', 100, 'Cancer', 4),
			O('Jupiter', 130, 'Leo', 5), O('Saturn', 160, 'Virgo', 7),
		];
		const mutuals = { normal: [{ planetA: { id: 'Sun' }, planetB: { id: 'Mars' } }], abnormal: [] };
		const data = buildPatternOverview(chartWith(objs, { isDiurnal: false }), wrap(chartWith(objs, { isDiurnal: false }), { mutuals }));
		expect(data.connections.mutual[0].purity.pure).toBe(true);
		expect(data.connections.mutual[0].purity.realm).toBe('玄');
	});

	test('先验权力：8·12 联结 + 夜生 = 八杀朝天大贵；昼生不成', () => {
		const objs = [
			O('Sun', 10, 'Aries', 8, [12]), O('Mars', 200, 'Libra', 12, [8]),
			O('Moon', 40, 'Taurus', 2), O('Mercury', 70, 'Gemini', 3), O('Venus', 100, 'Cancer', 4),
			O('Jupiter', 130, 'Leo', 5), O('Saturn', 160, 'Virgo', 7),
		];
		const mutuals = { normal: [{ planetA: { id: 'Sun' }, planetB: { id: 'Mars' } }], abnormal: [] };
		const night = buildPatternOverview(chartWith(objs, { isDiurnal: false }), wrap(chartWith(objs, { isDiurnal: false }), { mutuals }));
		expect(night.apriori.has).toBe(true);
		expect(night.apriori.links[0].which).toBe('8·12');
		expect(night.apriori.eightKill).toBe(true);
		const day = buildPatternOverview(chartWith(objs, { isDiurnal: true }), wrap(chartWith(objs, { isDiurnal: true }), { mutuals }));
		expect(day.apriori.has).toBe(true);
		expect(day.apriori.eightKill).toBe(false);
	});

	test('toOverviewRows 产出行且不抛', () => {
		const objs = [
			O('North Node', 0, 'Aries', 1), O('South Node', 180, 'Libra', 7),
			O('Sun', 10, 'Aries', 1), O('Moon', 30, 'Taurus', 2), O('Mercury', 50, 'Gemini', 3),
			O('Venus', 70, 'Cancer', 4), O('Mars', 90, 'Cancer', 4), O('Jupiter', 130, 'Leo', 5), O('Saturn', 160, 'Virgo', 6),
		];
		const data = buildPatternOverview(chartWith(objs), wrap(chartWith(objs)));
		const rows = toOverviewRows(data);
		expect(Array.isArray(rows)).toBe(true);
		expect(rows.find((r)=> r.key === 'dragon')).toBeTruthy();
		expect(rows.find((r)=> r.key === 'jupiter')).toBeTruthy();
	});
});
