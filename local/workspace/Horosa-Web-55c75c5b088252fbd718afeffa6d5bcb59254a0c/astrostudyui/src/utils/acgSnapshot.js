// 占星地图(ACG)AI 导出专属真值快照。
// AstroAcg 每次 /location/acg 响应后调 setAcgSnapshot 存"最近一次地图状态"(模块级,零持久化);
// aiExport 在导出键为 astrochart_like 且当前上下文为占星地图时,经 buildAcgSectionText 拼入
//【占星地图】段(受导出段开关控制)。单一真值源:全部数字来自后端 ACGraph 响应,不在此重算。

const PLANET_CN = {
	Sun: '太阳', Moon: '月亮', Mercury: '水星', Venus: '金星', Mars: '火星',
	Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星',
	'North Node': '北交点', 'South Node': '南交点', Chiron: '凯龙星',
	'Dark Moon': '莉莉丝', 'Purple Clouds': '紫炁',
};
const MODE_CN = { mundo: '本体(in-mundo·真黄纬)', zodiac: '黄道度(β=0)' };
const COORD_CN = { geo: '地心', helio: '日心' };
const REL_CN = { davison: '戴维森时空中点盘', composite: '中点合盘', synastry: '双人叠加' };
const KIND_CN = { transit: '行运', progressed: '二次推运' };

let latest = null;

export function setAcgSnapshot(data, uiState){
	if(!data || !data.planets){
		return;
	}
	latest = { data, uiState: uiState || {}, at: Date.now() };
}

export function clearAcgSnapshot(){
	latest = null;
}

function fmtLon(v){
	if(v === undefined || v === null || !isFinite(v)){
		return '—';
	}
	const abs = Math.abs(v).toFixed(2);
	return `${abs}°${v >= 0 ? 'E' : 'W'}`;
}

function ascAnchor(pts){
	// 升/降线是曲线:取 |纬度| 最小点(赤道附近)作代表经度
	if(!Array.isArray(pts) || !pts.length){
		return null;
	}
	let best = pts[0];
	for(let i = 1; i < pts.length; i++){
		if(Math.abs(pts[i].lat) < Math.abs(best.lat)){
			best = pts[i];
		}
	}
	return best;
}

// 生成【占星地图】导出段。无快照(用户没开过占星地图 tab)返回 ''(优雅降级,不报错)。
export function buildAcgSectionText(){
	if(!latest || !latest.data || !latest.data.planets){
		return '';
	}
	const d = latest.data;
	const meta = d.meta || {};
	const lines = [];
	lines.push('【占星地图】');
	const head = [];
	head.push(`口径 ${MODE_CN[meta.mode] || meta.mode || '本体'}`);
	head.push(`坐标系 ${COORD_CN[meta.coord] || meta.coord || '地心'}`);
	if(meta.ayanLabel){
		head.push(`恒星黄道读数 ${meta.ayanLabel}(岁差 ${meta.ayanVal}°)`);
	}
	if(meta.relMode){
		let rel = `关系盘 ${REL_CN[meta.relMode] || meta.relMode}`;
		if(meta.davison){
			rel += `(合成 ${meta.davison.date} ${meta.davison.time} UT @ ${meta.davison.lat}°, ${meta.davison.lon}°)`;
		}
		head.push(rel);
	}
	lines.push(head.join(' · '));
	lines.push('主要行星角化线(中天/天底=经线;上升/下降取赤道附近代表点):');
	Object.keys(d.planets).forEach((pk) => {
		const p = d.planets[pk];
		const L = p.lines || {};
		const asc = ascAnchor(L.asc);
		const desc = ascAnchor(L.desc);
		const parts = [
			`MC ${fmtLon(L.mc && L.mc.lon)}`,
			`IC ${fmtLon(L.ic && L.ic.lon)}`,
			`ASC ${asc ? fmtLon(asc.lon) : '—'}`,
			`DSC ${desc ? fmtLon(desc.lon) : '—'}`,
		];
		let extra = '';
		if(p.oob){
			extra += ' · 超界OOB';
		}
		if(typeof p.sidLon === 'number'){
			extra += ` · 恒星黄经 ${p.sidLon.toFixed(2)}°`;
		}
		lines.push(`- ${PLANET_CN[pk] || pk}:${parts.join(' / ')}${extra}`);
	});
	if(d.ccg && d.ccg.planets){
		lines.push(`CCG 时间地图(${d.ccg.date} ${d.ccg.time || ''} · ${d.ccg.mix === 'mixed' ? '内二推/外行运' : (d.ccg.mix === 'transit' ? '全行运' : '全二次推运')}):`);
		Object.keys(d.ccg.planets).forEach((pk) => {
			const p = d.ccg.planets[pk];
			lines.push(`- ${KIND_CN[p.kind] || p.kind}${PLANET_CN[pk] || pk}:MC ${fmtLon(p.lines && p.lines.mc && p.lines.mc.lon)}(黄经 ${p.lon}°)`);
		});
	}
	if(d.second && d.second.planets){
		const bs = Object.keys(d.second.planets).slice(0, 10).map((pk) => {
			const p = d.second.planets[pk];
			return `${PLANET_CN[pk] || pk} MC ${fmtLon(p.lines && p.lines.mc && p.lines.mc.lon)}`;
		});
		lines.push(`B 盘(双人叠加)四轴 MC:${bs.join(';')}`);
	}
	if(Array.isArray(d.stars) && d.stars.length){
		lines.push(`固定星线(${d.stars.length} 恒星):${d.stars.map((s) => `${s.name} MC ${fmtLon(s.lines && s.lines.mc && s.lines.mc.lon)}`).join(';')}`);
	}
	const point = latest.uiState && latest.uiState.pointReport;
	if(point && Array.isArray(point.hits)){
		lines.push(`落点分析(${Math.abs(point.lat).toFixed(2)}°${point.lat >= 0 ? 'N' : 'S'} ${fmtLon(point.lon)},orb ${point.orb}°):` + (point.hits.length
			? point.hits.map((h) => `${PLANET_CN[h.planet] || h.planet}${({ Asc: '上升', Desc: '下降', MC: '中天', IC: '天底' })[h.angle] || h.angle}线(偏差 ${h.orb}°)`).join('、')
			: '无行星线经过'));
	}
	return lines.join('\n');
}
