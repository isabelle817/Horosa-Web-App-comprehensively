const LocalChartsKey = 'horosa.localCharts.v1';
const AstroAiSnapshotKey = 'horosa.ai.snapshot.astro.v1';
const ModuleAiSnapshotPrefix = 'horosa.ai.snapshot.module.v1.';
let fallbackToMemoryStore = false;
let fallbackWarned = false;
let memoryCharts = [];

function getLocalStorage(){
	try{
		if(typeof window !== 'undefined' && window.localStorage){
			return window.localStorage;
		}
		if(typeof localStorage !== 'undefined'){
			return localStorage;
		}
	}catch(e){
		return null;
	}
	return null;
}

function warnMemoryFallback(){
	if(fallbackWarned){
		return;
	}
	fallbackWarned = true;
	if(typeof console !== 'undefined' && console && typeof console.warn === 'function'){
		console.warn('[horosa] localStorage unavailable, chart data falls back to memory for this session.');
	}
}

function enableMemoryFallback(){
	fallbackToMemoryStore = true;
	warnMemoryFallback();
}

function isQuotaError(err){
	if(!err){
		return false;
	}
	const name = `${err.name || ''}`;
	const code = Number(err.code || 0);
	const message = `${err.message || ''}`.toLowerCase();
	if(code === 22 || code === 1014){
		return true;
	}
	if(name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'){
		return true;
	}
	return message.indexOf('quota') >= 0;
}

function purgeHeavyLocalCache(){
	const storage = getLocalStorage();
	if(!storage){
		return;
	}
	try{
		storage.removeItem(AstroAiSnapshotKey);
	}catch(e){
		// ignore
	}
	const keys = [];
	try{
		for(let i=0; i<storage.length; i++){
			const key = storage.key(i);
			if(key && key.indexOf(ModuleAiSnapshotPrefix) === 0){
				keys.push(key);
			}
		}
	}catch(e){
		return;
	}
	keys.forEach((key)=>{
		try{
			storage.removeItem(key);
		}catch(e){
			// ignore
		}
	});
}

function safeParseJson(txt, defVal){
	if(!txt){
		return defVal;
	}
	try{
		return JSON.parse(txt);
	}catch(e){
		return defVal;
	}
}

function nowStr(){
	const dt = new Date();
	const y = dt.getFullYear();
	const m = String(dt.getMonth() + 1).padStart(2, '0');
	const d = String(dt.getDate()).padStart(2, '0');
	const hh = String(dt.getHours()).padStart(2, '0');
	const mm = String(dt.getMinutes()).padStart(2, '0');
	const ss = String(dt.getSeconds()).padStart(2, '0');
	return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function normalizeGroup(group){
	if(group === undefined || group === null || group === ''){
		return null;
	}
	if(group instanceof Array){
		return JSON.stringify(group);
	}
	if(typeof group === 'string'){
		const parsed = safeParseJson(group, null);
		if(parsed instanceof Array){
			return JSON.stringify(parsed);
		}
		return group;
	}
	return JSON.stringify([group]);
}

function normalizePayload(payload){
	if(payload === undefined || payload === null){
		return null;
	}
	if(typeof payload === 'string'){
		return payload;
	}
	try{
		return JSON.stringify(payload);
	}catch(e){
		return `${payload}`;
	}
}

function sortByUpdateTimeDesc(list){
	return list.sort((a, b)=>{
		const ta = Date.parse(a.updateTime || '') || 0;
		const tb = Date.parse(b.updateTime || '') || 0;
		return tb - ta;
	});
}

function readRawCharts(){
	if(fallbackToMemoryStore){
		return memoryCharts.slice();
	}
	const storage = getLocalStorage();
	if(!storage){
		enableMemoryFallback();
		return memoryCharts.slice();
	}
	let raw = null;
	try{
		raw = storage.getItem(LocalChartsKey);
	}catch(e){
		enableMemoryFallback();
		return memoryCharts.slice();
	}
	const ary = safeParseJson(raw, []);
	if(!(ary instanceof Array)){
		return [];
	}
	memoryCharts = ary.slice();
	return ary;
}

function writeRawCharts(list){
	const next = list instanceof Array ? list.slice() : [];
	memoryCharts = next;
	if(fallbackToMemoryStore){
		return true;
	}
	const storage = getLocalStorage();
	if(!storage){
		enableMemoryFallback();
		return true;
	}
	const text = JSON.stringify(next);
	try{
		storage.setItem(LocalChartsKey, text);
		return true;
	}catch(e){
		if(isQuotaError(e)){
			purgeHeavyLocalCache();
			try{
				storage.setItem(LocalChartsKey, text);
				return true;
			}catch(e2){
				// ignore and fallback below
			}
		}
		enableMemoryFallback();
		return true;
	}
}

export function listLocalCharts(filter){
	let list = readRawCharts();
	if(filter && filter.name){
		const name = (filter.name + '').trim().toLowerCase();
		if(name !== ''){
			list = list.filter((item)=>{
				const txt = item && item.name ? (item.name + '').toLowerCase() : '';
				return txt.indexOf(name) >= 0;
			});
		}
	}
	if(filter && filter.tag){
		const tag = filter.tag + '';
		if(tag !== ''){
			list = list.filter((item)=>{
				const grp = safeParseJson(item.group, []);
				return grp instanceof Array && grp.indexOf(tag) >= 0;
			});
		}
	}
	return sortByUpdateTimeDesc(list);
}

export function getPagedLocalCharts(params){
	const pidx = params && params.PageIndex ? parseInt(params.PageIndex + '', 10) : 1;
	const psz = params && params.PageSize ? parseInt(params.PageSize + '', 10) : 30;
	const list = listLocalCharts(params || {});
	const start = (pidx - 1) * psz;
	const end = start + psz;
	return {
		List: list.slice(start, end),
		Total: list.length,
		PageIndex: pidx,
		PageSize: psz,
	};
}

export function buildLocalChartRecord(values){
	const cid = values && values.cid ? values.cid : `local-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
	let birth = values.birth;
	if(birth && typeof birth.format === 'function'){
		birth = birth.format('YYYY-MM-DD HH:mm:ss');
	}
	const sourceModule = values.sourceModule ? values.sourceModule : null;
	const record = {
		cid: cid,
		name: values.name ? values.name : '',
		birth: birth ? birth : nowStr(),
		zone: values.zone !== undefined && values.zone !== null ? values.zone : '+08:00',
		lat: values.lat,
		lon: values.lon,
		gpsLat: values.gpsLat,
		gpsLon: values.gpsLon,
		pos: values.pos ? values.pos : '',
		gender: values.gender !== undefined && values.gender !== null ? parseInt(values.gender + '', 10) : -1,
		isPub: values.isPub !== undefined && values.isPub !== null ? parseInt(values.isPub + '', 10) : 0,
		doubingSu28: values.doubingSu28 !== undefined && values.doubingSu28 !== null ? Number(values.doubingSu28) : undefined,
		group: normalizeGroup(values.group),
		creator: values.creator ? values.creator : 'local',
		updateTime: values.preserveUpdateTime && values.updateTime ? values.updateTime : nowStr(),
		memoAstro: values.memoAstro ? values.memoAstro : null,
		memoBaZi: values.memoBaZi ? values.memoBaZi : null,
		memoZiWei: values.memoZiWei ? values.memoZiWei : null,
		memo74: values.memo74 ? values.memo74 : null,
		memoGua: values.memoGua ? values.memoGua : null,
		memoLiuReng: values.memoLiuReng ? values.memoLiuReng : null,
		memoQiMeng: values.memoQiMeng ? values.memoQiMeng : null,
		memoSuZhan: values.memoSuZhan ? values.memoSuZhan : null,
		payload: normalizePayload(values.payload),
		sourceModule: sourceModule,
		chartType: values.chartType ? values.chartType : sourceModule,
		// 非地点/坐标参数: 必须随命盘存档,否则下次打开会被全局默认覆盖,导致日柱/时柱计算与保存时不一致。
		after23NewDay: values.after23NewDay !== undefined && values.after23NewDay !== null
			? parseInt(values.after23NewDay + '', 10)
			: (values.after23NewDay === undefined ? undefined : 1),
		orbs: (values.orbs && typeof values.orbs === 'object' && Object.keys(values.orbs).length) ? values.orbs : undefined,
		orbScale: (values.orbScale !== undefined && values.orbScale !== null && values.orbScale !== 1) ? values.orbScale : undefined,
		lateZiHourUseNextDay: values.lateZiHourUseNextDay !== undefined && values.lateZiHourUseNextDay !== null
			? parseInt(values.lateZiHourUseNextDay + '', 10)
			: undefined,
		timeAlg: values.timeAlg !== undefined && values.timeAlg !== null
			? parseInt(values.timeAlg + '', 10)
			: undefined,
		// 主限法视图配置(方法/时间换算/方向类型/顺逆/映点/界):随命盘存档,AI 挂载时 recordToFields 复原,
		// 否则重新打开/挂载会回退默认 Alcabitius+Ptolemy+黄道,与保存时的推运视图不一致。仅在 values 提供时落库。
		pdMethod: values.pdMethod !== undefined && values.pdMethod !== null ? values.pdMethod : undefined,
		pdTimeKey: values.pdTimeKey !== undefined && values.pdTimeKey !== null ? values.pdTimeKey : undefined,
		pdtype: values.pdtype !== undefined && values.pdtype !== null ? parseInt(values.pdtype + '', 10) : undefined,
		pdDirect: values.pdDirect !== undefined && values.pdDirect !== null ? parseInt(values.pdDirect + '', 10) : undefined,
		pdConverse: values.pdConverse !== undefined && values.pdConverse !== null ? parseInt(values.pdConverse + '', 10) : undefined,
		pdAntiscia: values.pdAntiscia !== undefined && values.pdAntiscia !== null ? parseInt(values.pdAntiscia + '', 10) : undefined,
		pdTerms: values.pdTerms !== undefined && values.pdTerms !== null ? parseInt(values.pdTerms + '', 10) : undefined,
		// AI 挂载「每技法设置」可调的占星排盘开关 + 数算/八字取用 + 七政命度模式:仅在 values 提供时落库
		// (present 才落库,对齐 pd* 写法),否则 buildFieldObject 回退现状默认 → 不破坏既有命盘。
		hsys: values.hsys !== undefined && values.hsys !== null ? values.hsys : undefined,
		zodiacal: values.zodiacal !== undefined && values.zodiacal !== null ? parseInt(values.zodiacal + '', 10) : undefined,
		siderealAyanamsa: values.siderealAyanamsa !== undefined && values.siderealAyanamsa !== null ? (values.siderealAyanamsa + '') : undefined,
		tradition: values.tradition !== undefined && values.tradition !== null ? parseInt(values.tradition + '', 10) : undefined,
		strongRecption: values.strongRecption !== undefined && values.strongRecption !== null ? parseInt(values.strongRecption + '', 10) : undefined,
		simpleAsp: values.simpleAsp !== undefined && values.simpleAsp !== null ? parseInt(values.simpleAsp + '', 10) : undefined,
		virtualPointReceiveAsp: values.virtualPointReceiveAsp !== undefined && values.virtualPointReceiveAsp !== null ? parseInt(values.virtualPointReceiveAsp + '', 10) : undefined,
		southchart: values.southchart !== undefined && values.southchart !== null ? parseInt(values.southchart + '', 10) : undefined,
		phaseType: values.phaseType !== undefined && values.phaseType !== null ? parseInt(values.phaseType + '', 10) : undefined,
		godKeyPos: values.godKeyPos !== undefined && values.godKeyPos !== null ? values.godKeyPos : undefined,
		adjustJieqi: values.adjustJieqi !== undefined && values.adjustJieqi !== null ? parseInt(values.adjustJieqi + '', 10) : undefined,
		guolaoLifeMode: values.guolaoLifeMode !== undefined && values.guolaoLifeMode !== null ? values.guolaoLifeMode : undefined,
		indiaHsys: values.indiaHsys !== undefined && values.indiaHsys !== null ? values.indiaHsys : undefined,
		indiaAyanamsa: values.indiaAyanamsa !== undefined && values.indiaAyanamsa !== null ? (values.indiaAyanamsa + '') : undefined,
		guolaoNodeMode: values.guolaoNodeMode !== undefined && values.guolaoNodeMode !== null ? values.guolaoNodeMode : undefined,
	};
	return record;
}

export function upsertLocalChart(values){
	const list = readRawCharts();
	const cid = values && values.cid ? values.cid : null;
	const idx = cid ? list.findIndex((item)=> item.cid === cid) : -1;
	const base = idx >= 0 ? list[idx] : {};
	const next = buildLocalChartRecord({
		...base,
		...(values || {}),
	});
	if(idx >= 0){
		list[idx] = {
			...list[idx],
			...next,
		};
	}else{
		list.push(next);
	}
	const saved = writeRawCharts(sortByUpdateTimeDesc(list));
	if(!saved){
		throw new Error('local.chart.save.failed');
	}
	return next;
}

export function removeLocalChart(cid){
	const list = readRawCharts();
	const next = list.filter((item)=> item.cid !== cid);
	const saved = writeRawCharts(next);
	if(!saved){
		throw new Error('local.chart.delete.failed');
	}
}

export function exportLocalChartsBackup(){
	const charts = sortByUpdateTimeDesc(readRawCharts().slice());
	return {
		format: 'horosa-local-charts',
		version: 1,
		exportedAt: nowStr(),
		total: charts.length,
		charts: charts,
	};
}

export function importLocalChartsBackup(payload){
	if(!payload || typeof payload !== 'object'){
		return { imported: 0, total: readRawCharts().length };
	}
	const incoming = payload.charts;
	if(!(incoming instanceof Array)){
		return { imported: 0, total: readRawCharts().length };
	}
	let imported = 0;
	incoming.forEach((item)=>{
		if(!item || typeof item !== 'object'){
			return;
		}
		upsertLocalChart({
			...item,
			preserveUpdateTime: true,
		});
		imported += 1;
	});
	const total = readRawCharts().length;
	return { imported, total };
}
