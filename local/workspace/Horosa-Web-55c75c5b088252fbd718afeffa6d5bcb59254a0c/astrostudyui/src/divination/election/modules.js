// divination/election/modules.js
// 13 个分析模块（择日清单 §3），按优先级=UI 顺序。每模块产 section{key,title,verdict,score,findings,detail}。
import { planetCondition } from '../engine/conditions';
import { moonReport } from '../engine/moon';
import { aspectsOf } from '../engine/aspectsEngine';
import { receptionsOf } from '../engine/reception';
import { SIGNS } from '../data/signs';
import { PLANETS } from '../data/planets';
import { FIXED_STARS, starLonAt } from '../data/fixedStars';
import { angularDist } from '../engine/utils';

function cn(k){ return (PLANETS[k] || {}).cn || k; }
function clamp(x){ return Math.max(0, Math.min(100, Math.round(x))); }
function verdictOf(s){ return s >= 70 ? 'good' : (s >= 52 ? 'neutral' : (s >= 38 ? 'caution' : 'bad')); }
function scoreFromFindings(findings, baseSeed){
	let s = baseSeed === undefined ? 60 : baseSeed;
	findings.forEach((f) => { s += (f.polarity === 'positive' ? 1 : (f.polarity === 'negative' ? -1 : 0)) * (f.weight || 1) * 6; });
	return clamp(s);
}
function lord1Of(facts){ const sg = facts.meta.ascSign; return SIGNS[sg] ? SIGNS[sg].domicile : null; }
const BENEFICS = ['jupiter', 'venus'];
const MALEFICS = ['mars', 'saturn'];

function mkFinding(polarity, message, weight){ return { polarity, message, text_zh: message, weight: weight || 1 }; }

function normLon(x){ return ((Number(x) % 360) + 360) % 360; }
// 取本盘公历年（用于恒星岁差修正）：优先读 /chart 回传的 params.birth/date；缺则用中性年（岁差差异 <1° 可忽略）。
function getChartYear(facts){
	try{
		const p = facts && facts.result && facts.result.params;
		const ds = p && (p.birth || p.date);
		if(ds){ const m = String(ds).match(/(-?\d{3,4})/); if(m){ return Number(m[1]); } }
	}catch(e){ /* noop */ }
	return 2000;
}
// 两点的短弧中点（落入两点夹角较小一侧）。
function shortMidpoint(a, b){
	const m1 = normLon((Number(a) + Number(b)) / 2);
	const m2 = normLon(m1 + 180);
	return angularDist(m1, a) <= 90 ? m1 : m2;
}

function moonModule(facts){
	const r = moonReport(facts);
	const findings = r.findings.map((f) => ({ ...f, message: f.text_zh }));
	const score = scoreFromFindings(findings, 64);
	return { key: 'moon', title: '月亮（第一考量）', verdict: verdictOf(score), score, findings, detail_md: `月落 ${SIGNS[facts.planets.moon.sign] ? SIGNS[facts.planets.moon.sign].cn : ''}，${r.phase === 'waxing' ? '盈' : '亏'}。` };
}

function ascRulerModule(facts){
	const l = lord1Of(facts);
	const findings = [];
	if(l && facts.planets[l]){
		const p = facts.planets[l];
		if(p.retro) findings.push(mkFinding('negative', `命主星 ${cn(l)} 逆行（命主不可逆行）`, 3));
		if(p.dignityScore >= 4) findings.push(mkFinding('positive', `命主星 ${cn(l)} 有力（+${p.dignityScore}）`, 2));
		else if(p.dignityScore <= -4) findings.push(mkFinding('negative', `命主星 ${cn(l)} 落陷/弱`, 2));
		if(p.angularity === 'angular' || p.angularity === 'succedent') findings.push(mkFinding('positive', `命主星入${p.angularity === 'angular' ? '角' : '续'}宫`, 1));
		else if([3, 6, 9, 12].indexOf(p.house) >= 0) findings.push(mkFinding('negative', `命主星入弱宫(${p.house})`, 1));
	}
	const score = scoreFromFindings(findings, 60);
	return { key: 'asc_ruler', title: '命主星（第二考量）', verdict: verdictOf(score), score, findings, detail_md: l ? `命主星 = ${cn(l)}` : '命主星未定' };
}

function ascendantModule(facts, topic){
	const findings = [];
	const sg = facts.meta.ascSign;
	const mod = SIGNS[sg] ? SIGNS[sg].modality : null;
	const pref = (topic.preferred_asc_modality) || [];
	if(mod && pref.length){
		if(pref.indexOf(mod) >= 0) findings.push(mkFinding('positive', `命宫三方四正(${mod})匹配本用事偏好`, 2));
		else if(mod === 'mutable' && (topic.topic_id === 'marriage' || topic.topic_id === 'business')) findings.push(mkFinding('negative', '变动宫坐命（婚姻/事业忌）', 2));
	}
	const ad = facts.meta.ascDegree;
	if(ad !== null && ad !== undefined){
		if(ad > 28) findings.push(mkFinding('negative', `命度 ${ad.toFixed(1)}°>28°（变动气质）`, 1));
		else if(ad >= 1 && ad <= 5) findings.push(mkFinding('positive', `命度 ${ad.toFixed(1)}°（1–5°，固定性强）`, 1));
	}
	const score = scoreFromFindings(findings, 60);
	return { key: 'ascendant', title: '命度/上升（第三考量）', verdict: verdictOf(score), score, findings, detail_md: `上升 ${SIGNS[sg] ? SIGNS[sg].cn : ''} ${ad !== null ? ad.toFixed(1) + '°' : ''}` };
}

function sunModule(facts){
	const findings = [];
	const s = facts.planets.sun;
	if(s){
		if([12].indexOf(s.house) >= 0) findings.push(mkFinding('negative', '太阳落 12 宫（出版/魅力类用事尤忌）', 1));
		const asp = aspectsOf(facts, 'sun').filter((a) => [60, 120].indexOf(a.angle) >= 0 && BENEFICS.indexOf(a.other) >= 0);
		if(asp.length) findings.push(mkFinding('positive', `太阳与吉星${asp[0].angle}°`, 1));
	}
	const score = scoreFromFindings(findings, 60);
	return { key: 'sun', title: '太阳', verdict: verdictOf(score), score, findings, detail_md: '' };
}

function anglesModule(facts){
	const findings = [];
	[1, 4, 7, 10].forEach(() => {});
	Object.keys(facts.planets).forEach((k) => {
		const p = facts.planets[k];
		if(p.angularity !== 'angular') return;
		if(BENEFICS.indexOf(k) >= 0 && p.dignityScore >= 0) findings.push(mkFinding('positive', `吉星 ${cn(k)} 入角宫`, 2));
		if(MALEFICS.indexOf(k) >= 0 && (p.dignityScore <= 0 || p.retro)) findings.push(mkFinding('negative', `凶星 ${cn(k)} 受剋入角宫`, 2));
		if(k === 'uranus' && (p.house === 1 || p.house === 7)) findings.push(mkFinding('negative', '天王星在 1/7 宫（变动/分离）', 2));
	});
	const score = scoreFromFindings(findings, 60);
	return { key: 'angles', title: '角宫吉凶分布（纳吉排凶）', verdict: verdictOf(score), score, findings, detail_md: '' };
}

function maleficHandlingModule(facts){
	const findings = [];
	MALEFICS.forEach((k) => {
		const p = facts.planets[k]; if(!p) return;
		const hardNoHelp = aspectsOf(facts, k).filter((a) => [90, 180].indexOf(a.angle) >= 0);
		const benefHelp = aspectsOf(facts, k).filter((a) => [60, 120].indexOf(a.angle) >= 0 && BENEFICS.indexOf(a.other) >= 0);
		if(hardNoHelp.length && !benefHelp.length) findings.push(mkFinding('negative', `${cn(k)} 凶相无吉相援助`, 2));
		else if(benefHelp.length) findings.push(mkFinding('positive', `${cn(k)} 有吉相援助（化解）`, 1));
	});
	const score = scoreFromFindings(findings, 62);
	return { key: 'malefic_handling', title: '凶星处理', verdict: verdictOf(score), score, findings, detail_md: '' };
}

function topicSigModule(facts, topic){
	const findings = [];
	(topic.natural_significators || []).forEach((k) => {
		const p = facts.planets[k]; if(!p) return;
		const c = planetCondition(k, facts);
		if(c.score > 0) findings.push(mkFinding('positive', `自然徵象星 ${cn(k)} 有力(+${c.score})`, 2));
		else if(c.score < 0) findings.push(mkFinding('negative', `自然徵象星 ${cn(k)} 受剋(${c.score})`, 2));
		if(p.retro) findings.push(mkFinding('negative', `自然徵象星 ${cn(k)} 逆行`, 2));
	});
	(topic.key_houses || []).slice(0, 2).forEach((hn) => {
		const lord = facts.houses[hn] && facts.houses[hn].ruler;
		if(lord && facts.planets[lord]){
			const c = planetCondition(lord, facts);
			if(c.score < 0) findings.push(mkFinding('negative', `${hn}宫主 ${cn(lord)} 受剋`, 1));
			else if(c.score > 0) findings.push(mkFinding('positive', `${hn}宫主 ${cn(lord)} 有力`, 1));
		}
	});
	const score = scoreFromFindings(findings, 60);
	return { key: 'topic_significators', title: '徵象星（自然+宫主）', verdict: verdictOf(score), score, findings, detail_md: '' };
}

function topicHouseModule(facts, topic){
	const findings = [];
	const hn = (topic.key_houses || [])[0];
	if(hn && facts.houses[hn]){
		(facts.houses[hn].planets || []).forEach((k) => {
			if(BENEFICS.indexOf(k) >= 0) findings.push(mkFinding('positive', `吉星 ${cn(k)} 在用事宫(${hn})`, 1));
			if(MALEFICS.indexOf(k) >= 0) findings.push(mkFinding('negative', `凶星 ${cn(k)} 在用事宫(${hn})`, 1));
		});
	}
	const score = scoreFromFindings(findings, 60);
	return { key: 'topic_house', title: '用事宫本身', verdict: verdictOf(score), score, findings, detail_md: hn ? `用事宫 = ${hn} 宫` : '' };
}

function aspectPatternsModule(facts){
	// 检测：大三角 / 风筝 / 三刑会沖(T) / 大十字 / 星聚。择日喜大三角·风筝·小三角·矩形，忌 T·大十字。
	const findings = [];
	const ps = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'].filter((k) => facts.planets[k]);
	const has = (a, b, ang) => aspectsOf(facts, a).some((x) => x.other === b && x.angle === ang);
	// 大三角：三星两两 120°
	let grandTrine = null;
	for(let i = 0; i < ps.length && !grandTrine; i++){
		for(let j = i + 1; j < ps.length && !grandTrine; j++){
			for(let k = j + 1; k < ps.length && !grandTrine; k++){
				if(has(ps[i], ps[j], 120) && has(ps[j], ps[k], 120) && has(ps[i], ps[k], 120)){ grandTrine = [ps[i], ps[j], ps[k]]; }
			}
		}
	}
	if(grandTrine){
		findings.push(mkFinding('positive', `大三角格局（${grandTrine.map(cn).join('·')}，能量和谐·吉）`, 2));
		// 风筝：第四星对冲大三角某顶点
		let kite = false;
		grandTrine.forEach((v) => { if(!kite){ const opp = ps.find((p) => grandTrine.indexOf(p) < 0 && has(v, p, 180)); if(opp){ kite = true; } } });
		if(kite){ findings.push(mkFinding('positive', '风筝格局（大三角 + 对冲焦点，聚力·吉）', 1)); }
	}
	// 三刑会沖 T：两星对冲 + 皆 90° 第三星
	let tsquare = null;
	for(let i = 0; i < ps.length && !tsquare; i++){
		for(let j = i + 1; j < ps.length && !tsquare; j++){
			if(has(ps[i], ps[j], 180)){
				const apex = ps.find((p) => p !== ps[i] && p !== ps[j] && has(p, ps[i], 90) && has(p, ps[j], 90));
				if(apex){ tsquare = [ps[i], ps[j], apex]; }
			}
		}
	}
	if(tsquare){ findings.push(mkFinding('negative', `三刑会沖 T 格局（${tsquare.map(cn).join('·')}，张力·避）`, 2)); }
	// 大十字：≥2 组对冲
	const oppPairs = [];
	for(let i = 0; i < ps.length; i++){ for(let j = i + 1; j < ps.length; j++){ if(has(ps[i], ps[j], 180)){ oppPairs.push([ps[i], ps[j]]); } } }
	if(oppPairs.length >= 2){ findings.push(mkFinding('negative', '疑似大十字（两组对冲交织，巨张力·避）', 2)); }
	// 星聚：≥3 星同座
	const bySign = {};
	ps.forEach((k) => { const s = facts.planets[k].sign; if(s){ (bySign[s] = bySign[s] || []).push(k); } });
	Object.keys(bySign).forEach((s) => { if(bySign[s].length >= 3){ findings.push(mkFinding('neutral', `星聚 ${SIGNS[s] ? SIGNS[s].cn : s}（${bySign[s].map(cn).join('·')}，能量集中）`, 1)); } });
	const score = scoreFromFindings(findings, 60);
	return { key: 'aspect_patterns', title: '相位格局', verdict: verdictOf(score), score, findings, detail_md: '大三角 / 风筝 / 三刑会沖 / 大十字 / 星聚' };
}

function receptionModule(facts, topic){
	const findings = [];
	const recs = receptionsOf(facts, 'moon').filter((r) => r.strong);
	if(recs.length) findings.push(mkFinding('positive', '存在强接纳（可救援用事星）', 1));
	// 日月中点：吉/凶星合日月短弧中点（婚庆/合作类用事尤重）。
	const sun = facts.planets.sun; const moon = facts.planets.moon;
	if(sun && moon && sun.lon != null && moon.lon != null){
		const mid = shortMidpoint(sun.lon, moon.lon);
		['venus', 'jupiter', 'mars', 'saturn'].forEach((k) => {
			const p = facts.planets[k]; if(!p || p.lon == null) return;
			if(angularDist(p.lon, mid) <= 1.5){
				if(BENEFICS.indexOf(k) >= 0) findings.push(mkFinding('positive', `${cn(k)} 合日月中点（和合·吉）`, 1));
				else findings.push(mkFinding('negative', `${cn(k)} 合日月中点（扰动·忌）`, 1));
			}
		});
	}
	const score = scoreFromFindings(findings, 60);
	return { key: 'reception_fixedstar_midpoint', title: '接纳 / 日月中点', verdict: verdictOf(score), score, findings, detail_md: '强接纳救援 + 吉凶星合日月中点（≤1.5°）' };
}

function fixedStarsModule(facts, topic){
	const findings = [];
	const year = getChartYear(facts);
	const points = { 命度: facts.meta.ascLon, 天顶: facts.meta.mcLon, 太阳: facts.planets.sun && facts.planets.sun.lon, 月亮: facts.planets.moon && facts.planets.moon.lon };
	// 命主星
	const l1 = lord1Of(facts);
	if(l1 && facts.planets[l1]){ points[`命主星(${cn(l1)})`] = facts.planets[l1].lon; }
	// 用事自然徵象星
	(topic && topic.natural_significators || []).forEach((k) => { const p = facts.planets[k]; if(p && p.lon != null){ points[`用事星(${cn(k)})`] = p.lon; } });
	Object.keys(points).forEach((label) => {
		const lon = points[label]; if(lon === null || lon === undefined) return;
		FIXED_STARS.forEach((st) => {
			if(angularDist(lon, starLonAt(st.lon_1995, year)) <= 1){
				if(st.election && st.election.avoid) findings.push(mkFinding('negative', `${label} 会合凶恒星 ${st.name_cn}（${st.meaning}）`, 2));
				else findings.push(mkFinding('positive', `${label} 会合吉恒星 ${st.name_cn}（${st.meaning}）`, 2));
			}
		});
	});
	const score = scoreFromFindings(findings, 60);
	return { key: 'fixed_stars', title: '恒星会合', verdict: verdictOf(score), score, findings, detail_md: `≤1° 会合关键点才计（岁差修正至 ${year} 年）` };
}

export function runModules(facts, topic){
	return [
		moonModule(facts),
		ascRulerModule(facts),
		ascendantModule(facts, topic),
		topicSigModule(facts, topic),
		anglesModule(facts),
		topicHouseModule(facts, topic),
		sunModule(facts),
		maleficHandlingModule(facts),
		aspectPatternsModule(facts),
		receptionModule(facts, topic),
		fixedStarsModule(facts, topic),
	];
}

export default runModules;
