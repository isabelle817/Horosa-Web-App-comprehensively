// utils/astroPatternOverview.js
// 占星「格局速览 / 格局」技法判定 —— 纯前端派生、单一真值源。据《Horosa 古典占星》《正统占星技法·围攻》两文档：
//   龙截龙拥(龙脉分盘) · 孤月独明 · 月水心性智识 · 职业/皇室伴寝(东升西没) · 有情无情(联结纯粹) · 强吉木星·照耀 ·
//   主宰循环(复用 dispositorChain) · 后天凶星。
// 全部源自活盘对象(perchart.objects / chart.mutuals/receptions/aspects)，不依赖 /astroextra 分析端。
// buildPatternOverview → 结构化 data(格局 tab 完整卡 + AI 快照用)；toOverviewRows(data) → 紧凑行(信息 tab 速览用)。
import { SIGNS } from '../divination/data/signs';
import { computeDispositors, chartIdOfKey, keyOfChartId } from './dispositorChain';
import * as AstroConst from '../constants/AstroConst';

const { SUN, MOON, MERCURY, VENUS, MARS, JUPITER, SATURN, NORTH_NODE } = AstroConst;
const SEVEN = [SUN, MOON, MERCURY, VENUS, MARS, JUPITER, SATURN];
const MALEFIC_HOUSES = new Set([6, 8, 12]);      // 后天凶宫(主宰即后天凶星)
const JUP_WEAK_HOUSES = new Set([3, 6, 8, 12]);  // 木非强吉的凶宫
const OTHERWORLDLY = new Set([6, 8, 12]);        // 反世俗宫=6/8/12 三大凶宫(用户订正,文档146-147「6/8/12大凶」)
const MODALITY_CN = { cardinal: '转宫', fixed: '定宫', mutable: '二体宫' };

function norm360(x){ return ((x % 360) + 360) % 360; }
function houseNumOf(h){ if(typeof h === 'number') return h; const m = /(\d+)/.exec(String(h == null ? '' : h)); return m ? parseInt(m[1], 10) : null; }
function signKey(s){ return s ? String(s).toLowerCase() : null; }
function dignToken(sd){
	if(!Array.isArray(sd)) return '';
	if(sd.includes('ruler')) return '庙';
	if(sd.includes('exalt')) return '旺';
	if(sd.includes('exile')) return '陷';
	if(sd.includes('fall')) return '落';
	return '';
}

export function buildPatternOverview(perchart, chart){
	const objs = (perchart && perchart.objects) || [];
	if(!objs.length){ return { empty: true }; }
	const byId = {};
	objs.forEach((o)=>{ if(o && o.id){ byId[o.id] = o; } });
	const seven = SEVEN.map((id)=> byId[id]).filter(Boolean);
	const isDay = !!(perchart && perchart.isDiurnal);
	const disp = computeDispositors(objs);

	const ruleHousesOf = (o)=> ((o && o.ruleHouses) || []).map(houseNumOf).filter((n)=> n != null);
	const houseOf = (o)=> houseNumOf(o && o.house);
	const afflictFlags = (o)=>{ const f = []; if(!o) return f;
		if((o.lonspeed || 0) < 0){ f.push('逆'); }
		if(o.feral){ f.push('野逸'); }
		const t = dignToken(o.selfDignity); if(t === '陷' || t === '落'){ f.push(t); }
		return f; };

	// ── 联结纯粹度(有情/无情)：双方「主宰宫∪落宫」全集，全世俗→有情·世俗 / 全{8,12}→有情·玄 / 混杂→无情；互换=A落B主宫且B落A主宫 ──
	const realmPurity = (houses)=>{ const all = houses.filter((n)=> n != null); if(!all.length){ return null; }
		const anyWorld = all.some((h)=> !OTHERWORLDLY.has(h));
		const anyOther = all.some((h)=> OTHERWORLDLY.has(h));
		const pure = !(anyWorld && anyOther);
		const realm = (anyOther && !anyWorld) ? '玄' : '世俗';
		return { pure, realm, label: pure ? `有情·${realm}纯粹` : '无情' }; };
	const housesOfPlanets = (list)=> list.reduce((acc, o)=> acc.concat(ruleHousesOf(o)).concat([houseOf(o)]), []);
	const connectionPurity = (a, b)=>{ if(!a || !b){ return null; }
		const p = realmPurity(housesOfPlanets([a, b])); if(!p){ return null; }
		const swap = ruleHousesOf(a).includes(houseOf(b)) && ruleHousesOf(b).includes(houseOf(a));
		return { ...p, swap }; };

	// ── 两星是否高层联结(互容/接纳/合相)：供龙截 2:5 判定 ──
	const pairLinked = (idA, idB)=>{
		const inList = (list)=> (list || []).some((it)=>{
			const x = it.planetA ? it.planetA.id : it.beneficiary;
			const y = it.planetB ? it.planetB.id : it.supplier;
			return (x === idA && y === idB) || (x === idB && y === idA); });
		const m = (chart && chart.mutuals) || {}; const r = (chart && chart.receptions) || {};
		if(inList(m.normal) || inList(m.abnormal) || inList(r.normal) || inList(r.abnormal)){ return true; }
		const na = chart && chart.aspects && chart.aspects.normalAsp;
		if(na && na[idA]){ const all = ['Exact', 'Applicative', 'Separative'].reduce((acc, c)=> acc.concat(na[idA][c] || []), []);
			if(all.some((x)=> x.id === idB && Number(x.asp) === 0)){ return true; } }
		return false;
	};

	// ── 龙截龙拥：北交黄经为轴分盘，统计 7 真星各半 ──
	let dragon;
	const nn = byId[NORTH_NODE];
	if(!nn || nn.lon == null){ dragon = { has: false, reason: '无交点数据' }; }
	else if(seven.length < 7){ dragon = { has: false, reason: '行星不足' }; }
	else {
		const axis = norm360(nn.lon); const sideA = []; const sideB = [];
		seven.forEach((o)=>{ (norm360(o.lon - axis) < 180 ? sideA : sideB).push(o); });
		const small = sideA.length <= sideB.length ? sideA : sideB;
		const big = small === sideA ? sideB : sideA;
		if(small.length === 0){ dragon = { has: true, kind: '龙拥', note: `七星聚一侧（${isDay ? '昼' : '夜'}限）` }; }
		else if(small.length === 1){ const lone = small[0];
			dragon = { has: true, kind: '龙截', lone: lone.id, loneHouse: houseOf(lone), loneSign: lone.sign, loneRules: ruleHousesOf(lone) }; }
		else if(small.length === 2 && pairLinked(small[0].id, small[1].id)){
			dragon = { has: true, kind: '龙截', pair: [small[0].id, small[1].id], pairHouses: [houseOf(small[0]), houseOf(small[1])], note: '两星联结' }; }
		else { dragon = { has: false, reason: `分布 ${big.length}:${small.length}` }; }
	}

	// ── 孤月独明：夜生且 7 星中唯月在地平上 ──
	let loneMoon;
	if(isDay){ loneMoon = { has: false, reason: '昼生盘' }; }
	else {
		const above = (o)=> (o.aboveHorizon != null ? !!o.aboveHorizon : (()=>{ const h = houseOf(o); return h != null && h >= 7 && h <= 12; })());
		const aboveList = seven.filter(above);
		loneMoon = { has: aboveList.length === 1 && aboveList[0].id === MOON, aboveCount: aboveList.length, aboveIds: aboveList.map((o)=> o.id) };
	}

	// ── 月水心性智识(文档 573)：座·模式·主宰星·主宰星资质·受损旗标 ──
	const moonMercuryOne = (id, role)=>{ const o = byId[id]; if(!o){ return null; }
		const sg = SIGNS[signKey(o.sign)] || {};
		const dk = disp.step[keyOfChartId(id)]; const dispId = dk ? chartIdOfKey(dk) : null; const dispObj = dispId ? byId[dispId] : null;
		return { id, role, sign: o.sign, modality: MODALITY_CN[sg.modality] || '', ruler: dispId, rulerDign: dispObj ? dignToken(dispObj.selfDignity) : '', flags: afflictFlags(o) }; };
	const moonMercury = { moon: moonMercuryOne(MOON, '生性'), mercury: moonMercuryOne(MERCURY, '智识') };

	// ── 职业/皇室伴寝(东升西没)：西没=逆时针(黄经在前)、东升=顺时针(黄经在后)，各取最近为第一 ──
	const companionsOf = (refId)=>{ const ref = byId[refId]; if(!ref){ return null; }
		const others = seven.filter((o)=> o.id !== refId);
		const occ = others.map((o)=>({ id: o.id, d: norm360(o.lon - ref.lon) })).filter((x)=> x.d > 0 && x.d < 180).sort((a, b)=> a.d - b.d);
		const ori = others.map((o)=>({ id: o.id, d: norm360(ref.lon - o.lon) })).filter((x)=> x.d > 0 && x.d < 180).sort((a, b)=> a.d - b.d);
		return { firstOccidental: occ[0] ? occ[0].id : null, occidental: occ.map((x)=> x.id), oriental: ori.map((x)=> x.id) }; };
	const detailOf = (id)=>{ const o = id ? byId[id] : null; return o ? { id, sign: o.sign, house: houseOf(o), rules: ruleHousesOf(o), flags: afflictFlags(o) } : null; };
	const moonComp = companionsOf(MOON); const sunComp = companionsOf(SUN);
	const vocation = { moon: moonComp, sun: sunComp,
		career: moonComp ? detailOf(moonComp.firstOccidental) : null,   // 月第一西没 = 一生主业
		style: sunComp ? detailOf(sunComp.firstOccidental) : null };     // 日第一西没 = 行事方式

	// ── 强吉木星：不主 {3,6,8,12}(例外 ruleHouses=={6,9}) + 照耀星数(遵当前容许度的 normalAsp) ──
	let jupiter;
	const jup = byId[JUPITER];
	if(!jup){ jupiter = { present: false }; }
	else {
		const rh = ruleHousesOf(jup); const rhSet = new Set(rh);
		const is69 = rhSet.size === 2 && rhSet.has(6) && rhSet.has(9);
		const strong = !rh.some((h)=> JUP_WEAK_HOUSES.has(h)) || is69;
		const lit = []; const ja = (chart && chart.aspects && chart.aspects.normalAsp) ? chart.aspects.normalAsp[JUPITER] : null;
		// 照耀=与木星「在当前容许度下成相位」者(含合相);四类(含 None 无明确出入相)皆为容许度内真相位,全算。
		if(ja){ ['Exact', 'Applicative', 'Separative', 'None'].forEach((cat)=>{ (ja[cat] || []).forEach((a)=>{
			if(a && a.id && SEVEN.indexOf(a.id) >= 0 && a.id !== JUPITER && lit.indexOf(a.id) < 0){ lit.push(a.id); } }); }); }
		jupiter = { present: true, strong, ruleHouses: rh, sign: jup.sign, dign: dignToken(jup.selfDignity), lit, litCount: lit.length };
	}

	// ── 主宰循环：终极主宰 + 互容环(带纯粹标) ──
	const finals = [...disp.finals].map((k)=> chartIdOfKey(k)).filter(Boolean);
	const loops = (disp.loops || []).map((loop)=>{ const ids = loop.map((k)=> chartIdOfKey(k)).filter(Boolean);
		const purity = ids.length >= 2 ? realmPurity(housesOfPlanets(ids.map((id)=> byId[id]).filter(Boolean))) : null;
		return { ids, purity }; });
	const dispositor = { finals, loops };

	// ── 后天凶星：主宰 6/8/12 者 ──
	const afflictedRulers = seven.filter((o)=> ruleHousesOf(o).some((h)=> MALEFIC_HOUSES.has(h))).map((o)=> o.id);

	// ── 联结(互容/接纳)带纯粹标，供速览接纳/互容行 & 古典 tab 增标 ──
	const connList = (list, kind)=> (list || []).map((it)=>{ const a = it.planetA ? it.planetA.id : it.beneficiary; const b = it.planetB ? it.planetB.id : it.supplier;
		const oa = byId[a]; const ob = byId[b]; const purity = connectionPurity(oa, ob);
		return { kind, a, b, purity, abnormal: false }; });
	const m = (chart && chart.mutuals) || {}; const r = (chart && chart.receptions) || {};
	const connections = {
		mutual: connList(m.normal, '互容').concat(connList(m.abnormal, '互容').map((x)=> ({ ...x, abnormal: true }))),
		reception: (r.normal || []).map((it)=> ({ kind: '接纳', beneficiary: it.beneficiary, supplier: it.supplier, dign: dignToken(it.supplierRulerShip), purity: connectionPurity(byId[it.beneficiary], byId[it.supplier]), refuse: false }))
			.concat((r.abnormal || []).map((it)=> ({ kind: '接纳', beneficiary: it.beneficiary, supplier: it.supplier, dign: dignToken(it.supplierRulerShip), purity: connectionPurity(byId[it.beneficiary], byId[it.supplier]), refuse: true }))),
	};

	// ── 先验权力(文档784-802/问答287-311):8th 与 12th 或 8th 与 1th 之联结(接纳/互容/合相/主宰环);夜生 → 八杀朝天大贵 ──
	const aprioriLink = (oa, ob)=>{ if(!oa || !ob){ return null; }
		const hs = new Set(ruleHousesOf(oa).concat([houseOf(oa)]).concat(ruleHousesOf(ob)).concat([houseOf(ob)]));
		if(hs.has(8) && hs.has(12)){ return '8·12'; }
		if(hs.has(8) && hs.has(1)){ return '8·1'; }
		return null; };
	const apriori = { has: false, links: [] };
	const checkApriori = (aId, bId, kind)=>{ const w = aprioriLink(byId[aId], byId[bId]); if(w){ apriori.has = true; apriori.links.push({ a: aId, b: bId, which: w, kind }); } };
	[...(m.normal || []), ...(m.abnormal || [])].forEach((it)=> checkApriori(it.planetA && it.planetA.id, it.planetB && it.planetB.id, '互容'));
	[...(r.normal || []), ...(r.abnormal || [])].forEach((it)=> checkApriori(it.beneficiary, it.supplier, '接纳'));
	(dispositor.loops || []).forEach((lp)=>{ for(let x = 0; x < lp.ids.length; x++){ for(let y = x + 1; y < lp.ids.length; y++){ checkApriori(lp.ids[x], lp.ids[y], '主宰环'); } } });
	apriori.night = !isDay;
	apriori.eightKill = apriori.has && !isDay;   // 八杀朝天大贵格须夜生

	return { empty: false, dragon, loneMoon, moonMercury, vocation, jupiter, dispositor, afflictedRulers, apriori, connections };
}

// 独立导出：供古典 tab 的接纳/互容显示直接增「有情/无情(+互换)」纯粹标。objects = perchart.objects。
export function connectionPurityById(idA, idB, objects){
	const byId = {}; (objects || []).forEach((o)=>{ if(o && o.id){ byId[o.id] = o; } });
	const a = byId[idA]; const b = byId[idB]; if(!a || !b){ return null; }
	const rh = (o)=> ((o.ruleHouses) || []).map(houseNumOf).filter((n)=> n != null);
	const ho = (o)=> houseNumOf(o.house);
	const houses = rh(a).concat([ho(a)]).concat(rh(b)).concat([ho(b)]).filter((n)=> n != null);
	if(!houses.length){ return null; }
	const anyWorld = houses.some((h)=> !OTHERWORLDLY.has(h));
	const anyOther = houses.some((h)=> OTHERWORLDLY.has(h));
	const pure = !(anyWorld && anyOther);
	const realm = (anyOther && !anyWorld) ? '玄' : '世俗';
	const swap = rh(a).includes(ho(b)) && rh(b).includes(ho(a));
	return { pure, realm, swap, label: pure ? `有情·${realm}纯粹` : '无情' };
}

// ── 信息 tab 速览紧凑行：Row={key,label,items,empty}；Item={parts:[{g:id}|{t:text}],note,tone} ──
export function toOverviewRows(data){
	if(!data || data.empty){ return []; }
	const rows = [];
	const g = (id)=> ({ g: id });
	const t = (txt)=> ({ t: txt });

	const tone = (p, refuse)=> (refuse ? 'bad' : (p ? (p.pure ? 'good' : 'bad') : undefined));
	// 互容
	const mu = (data.connections && data.connections.mutual) || [];
	rows.push({ key: 'mutual', label: '互容', empty: mu.length ? null : '无',
		items: mu.map((c)=> ({ parts: [g(c.a), t('与'), g(c.b)], note: purityNote(c.purity), tone: tone(c.purity) })) });
	// 接纳
	const rc = (data.connections && data.connections.reception) || [];
	rows.push({ key: 'reception', label: '接纳', empty: rc.length ? null : '无',
		items: rc.map((c)=> ({ parts: [g(c.beneficiary), t('被'), g(c.supplier), t('接纳')], note: `${c.dign ? c.dign : ''}${c.refuse ? '·拒绝' : ''}${purityNote(c.purity, true)}`, tone: tone(c.purity, c.refuse) })) });
	// 先验权力(8·12 / 8·1 联结;夜生=八杀朝天大贵)
	const ap = data.apriori || {};
	rows.push({ key: 'apriori', label: '先验权力', empty: ap.has ? null : '无',
		items: ap.has ? ap.links.map((lk)=> ({ parts: [g(lk.a), t(`${lk.kind}`), g(lk.b)], note: `${lk.which}联结·${ap.eightKill ? '夜生·八杀朝天大贵' : '昼生·非八杀朝天'}`, tone: ap.eightKill ? 'good' : undefined })) : [] });
	// 龙截龙拥
	rows.push(dragonRow(data.dragon, g, t));
	// 孤月独明
	rows.push({ key: 'loneMoon', label: '孤月独明', empty: data.loneMoon && data.loneMoon.has ? null : '否',
		items: data.loneMoon && data.loneMoon.has ? [{ parts: [g(MOON)], note: '夜·独明上半盘' }] : [] });
	// 月水心性智识
	rows.push(moonMercuryRow(data.moonMercury, g, t));
	// 职业
	rows.push({ key: 'vocation', label: '职业·主业', empty: data.vocation && data.vocation.career ? null : '不明',
		items: data.vocation && data.vocation.career ? [{ parts: [g(data.vocation.career.id)], note: `${signCnOf(data.vocation.career.sign)}${data.vocation.career.house ? `·${data.vocation.career.house}宫` : ''}（月第一西没）` }] : [] });
	// 强吉木星
	if(data.jupiter && data.jupiter.present){
		rows.push({ key: 'jupiter', label: '强吉木星',
			items: [{ parts: [g(JUPITER)], note: `${data.jupiter.strong ? '强吉' : '非强吉'}·照耀${data.jupiter.litCount}星${data.jupiter.dign ? `·${data.jupiter.dign}` : ''}`, tone: data.jupiter.strong ? 'good' : undefined }] });
	}
	// 主宰循环
	rows.push(dispositorRow(data.dispositor, g, t));
	// 后天凶星
	rows.push({ key: 'afflicted', label: '后天凶星', empty: (data.afflictedRulers || []).length ? null : '无',
		items: (data.afflictedRulers || []).map((id)=> ({ parts: [g(id)], tone: 'bad' })) });

	return rows.filter(Boolean);
}

function signCnOf(s){ const k = s ? String(s).toLowerCase() : null; return (SIGNS[k] && SIGNS[k].cn) || s || ''; }
function purityNote(p, prefixDot){ if(!p){ return ''; } return `${prefixDot ? '·' : ''}${p.label}${p.swap ? '·互换' : ''}`; }

function dragonRow(d, g, t){
	if(!d || !d.has){ return { key: 'dragon', label: '龙脉', empty: d && d.reason ? d.reason : '无龙截/龙拥', items: [] }; }
	if(d.kind === '龙拥'){ return { key: 'dragon', label: '龙脉', items: [{ parts: [t('龙拥')], note: d.note }] }; }
	if(d.pair){ return { key: 'dragon', label: '龙脉', items: [{ parts: [t('龙截 '), g(d.pair[0]), g(d.pair[1])], note: d.note }] }; }
	return { key: 'dragon', label: '龙脉', items: [{ parts: [t('龙截 '), g(d.lone)], note: `${signCnOf(d.loneSign)}${d.loneHouse ? `·${d.loneHouse}宫` : ''}` }] };
}

function moonMercuryRow(mm, g, t){
	if(!mm){ return { key: 'moonMercury', label: '心性·智识', empty: '--', items: [] }; }
	const part = (one)=>{ if(!one){ return null; } return { parts: [g(one.id)], note: `${signCnOf(one.sign)}${one.modality ? `·${one.modality}` : ''}${one.ruler ? `·主${glyphCn(one.ruler)}${one.rulerDign || ''}` : ''}${one.flags && one.flags.length ? `·${one.flags.join('')}` : ''}` }; };
	const items = [part(mm.moon), part(mm.mercury)].filter(Boolean);
	return { key: 'moonMercury', label: '心性·智识', empty: items.length ? null : '--', items };
}

function dispositorRow(d, g, t){
	if(!d || (!d.finals.length && !d.loops.length)){ return { key: 'dispositor', label: '主宰循环', empty: '无环·无终极', items: [] }; }
	const items = [];
	if(d.finals.length){ items.push({ parts: [t('终极 ')].concat(d.finals.map((id)=> g(id))) }); }
	d.loops.forEach((lp)=>{ items.push({ parts: [t('环 ')].concat(lp.ids.map((id)=> g(id))), note: lp.purity ? lp.purity.label : '' }); });
	return { key: 'dispositor', label: '主宰循环', items };
}

// 主宰星等用单字符不便处直接给中文名(速览 note 内)
function glyphCn(id){ const map = { Sun: '日', Moon: '月', Mercury: '水', Venus: '金', Mars: '火', Jupiter: '木', Saturn: '土' }; return map[id] || id; }
