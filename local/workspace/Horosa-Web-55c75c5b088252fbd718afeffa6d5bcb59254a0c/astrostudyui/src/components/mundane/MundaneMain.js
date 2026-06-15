// components/mundane/MundaneMain.js
// 世俗盘 Mundane：类型选择器统辖多种世俗盘——
//   入宫盘（四正入宫，精确入宫时刻）/ 新月图 / 满月图 / 日食图 / 月食图 / 地区盘 / 行星周期（木土大合相纪元）。
// 入宫：/jieqi 精确节气种子 + /chart。新月满月/日月食：momentPipeline（/astroextra/ephemeris）扫描事件 → 选中按精确时刻排盘。
// 地区盘：预置/自定义历史建置时刻 + 12 世俗宫义。行星周期：/astroextra/greatconj 精算木土大合。
// 解读层：divination/mundane/describe（行星落世俗宫判词、食的元素/分度判词）。
import { Component } from 'react';
import { InputNumber, Spin, Input } from 'antd';
import { XQSelect, XQButton } from '../xq-ui';
import DivinationChartShell from '../divination/DivinationChartShell';
import DateTime from '../comp/DateTime';
import { fetchPreciseJieqiSeed } from '../../utils/preciseCalcBridge';
import { SIGNS } from '../../divination/data/signs';
import { buildFacts } from '../../divination/engine/chartFacts';
import { buildAstroSnapshotContent } from '../../utils/astroAiSnapshot';
import { fetchMundaneEvents, momentToDateTime, ingressDurationMonths } from '../../divination/mundane/momentPipeline';
import { describeMundaneChart, describeEclipse, MUNDANE_HOUSE_MEANINGS, PLANET_CN as MUN_PLANET_CN } from '../../divination/mundane/describe';
import { allRegions, saveUserRegion } from '../../divination/data/regionCharts';
import { astroSymbol } from '../astro/AstroExtraCommon';
import request from '../../utils/request';
import * as Constants from '../../utils/constants';

const Option = XQSelect.Option;

const MUNDANE_TYPES = [
	{ key: 'ingress', label: '入宫盘' },
	{ key: 'newmoon', label: '新月图' },
	{ key: 'fullmoon', label: '满月图' },
	{ key: 'solecl', label: '日食图' },
	{ key: 'lunecl', label: '月食图' },
	{ key: 'region', label: '地区盘' },
	{ key: 'cycles', label: '行星周期' },
];

const INGRESSES = [
	{ term: '春分', label: '春分 · 白羊入宫（年盘）', signKey: 'aries' },
	{ term: '夏至', label: '夏至 · 巨蟹入宫', signKey: 'cancer' },
	{ term: '秋分', label: '秋分 · 天秤入宫', signKey: 'libra' },
	{ term: '冬至', label: '冬至 · 摩羯入宫', signKey: 'capricorn' },
];

const SIGN_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const SEVEN = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const PLANET_CN = { sun: '太阳', moon: '月亮', mercury: '水星', venus: '金星', mars: '火星', jupiter: '木星', saturn: '土星' };
const PLANET_ZH = { sun: '日', moon: '月', mercury: '水', venus: '金', mars: '火', jupiter: '木', saturn: '土' };
const ELEMENT_COLOR = { fire: '#c0392b', earth: '#8a6d3b', air: '#2c7fb8', water: '#1a7f6b' };
const ELEMENT_BG = { fire: 'rgba(192,57,43,0.08)', earth: 'rgba(138,109,59,0.08)', air: 'rgba(44,127,184,0.08)', water: 'rgba(26,127,107,0.08)' };
const ELEMENT_CN = { fire: '火象', earth: '土象', air: '风象', water: '水象' };
const ELEMENT_SHORT = { fire: '火', earth: '土', air: '风', water: '水' };

const MODALITY_CN = { cardinal: '基本', fixed: '固定', mutable: '变动' };

// 复用 App 自带的占星字体 glyph（AstroFont），不用 unicode 符号。
const PLANET_ASTRO_ID = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto' };
function pGlyph(k){ return astroSymbol(PLANET_ASTRO_ID[k] || k); }
function sGlyph(signKey){ const s = signKey ? SIGNS[signKey] : null; return (s && s.en) ? astroSymbol(s.en) : null; }

// 行星周期：可选慢星对 + 合/冲。木土合走既有「时代纪元」富视图；其余走 /astroextra/planetcycles 平铺时间轴。
const CYCLE_PAIRS = [
	{ key: 'jupiter-saturn', cn: '木 ✕ 土（时代纪元）' },
	{ key: 'saturn-uranus', cn: '土 ✕ 天王' },
	{ key: 'saturn-neptune', cn: '土 ✕ 海王' },
	{ key: 'saturn-pluto', cn: '土 ✕ 冥王' },
	{ key: 'uranus-neptune', cn: '天王 ✕ 海王' },
	{ key: 'uranus-pluto', cn: '天王 ✕ 冥王' },
	{ key: 'neptune-pluto', cn: '海王 ✕ 冥王' },
	{ key: 'jupiter-uranus', cn: '木 ✕ 天王' },
	{ key: 'jupiter-neptune', cn: '木 ✕ 海王' },
	{ key: 'jupiter-pluto', cn: '木 ✕ 冥王' },
	{ key: 'mars-saturn', cn: '火 ✕ 土' },
];
const CYCLE_ASPECTS = [{ v: 0, cn: '合相 0°' }, { v: 180, cn: '对分 180°' }];

// 一组（约60年/3次）合相的大三合相态：纯X(全本象) / 摄Y(2本1邻) / 摄大Y(1本2邻)。
function triadPhase(triad, ageEl){
	const els = triad.map((c) => (SIGNS[SIGN_KEYS[c.sign]] || {}).element);
	const match = els.filter((e) => e === ageEl).length;
	const other = els.find((e) => e && e !== ageEl) || ageEl;
	if(match >= triad.length){ return { label: '纯' + ELEMENT_SHORT[ageEl], el: ageEl }; }
	if(match >= 2){ return { label: '摄' + ELEMENT_SHORT[other], el: other }; }
	return { label: '摄大' + ELEMENT_SHORT[other], el: other };
}

const AGE_EPOCHS = [
	{ y: -1199, s: 6 }, { y: -959, s: 7 },
	{ y: -720, s: 8 }, { y: -541, s: 9 }, { y: -302, s: 10 }, { y: -124, s: 11 },
	{ y: 114, s: 0 }, { y: 292, s: 1 }, { y: 411, s: 2 }, { y: 590, s: 3 },
	{ y: 769, s: 4 }, { y: 1007, s: 5 }, { y: 1186, s: 6 }, { y: 1305, s: 7 },
	{ y: 1603, s: 8 }, { y: 1842, s: 9 }, { y: 2020, s: 10 }, { y: 2259, s: 11 },
	{ y: 2497, s: 0 }, { y: 2676, s: 1 },
];

function currentYear(){
	try{ return new Date().getFullYear(); }catch(e){ return 2026; }
}

function clampYear(v, dflt){
	const n = Number(v);
	if(!Number.isFinite(n)){ return dflt; }
	return Math.max(-3000, Math.min(3000, Math.round(n)));
}

function yearLabel(y){
	return y <= 0 ? `前${1 - y}` : `${y}`;
}

// year → 'YYYY-MM-DD'（正年补零；负年加 -）。
function ymd(year, m, d){
	const y = year < 0 ? `-${String(-year).padStart(4, '0')}` : String(year).padStart(4, '0');
	return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function ageEpochFor(year){
	let ep = AGE_EPOCHS[0];
	for(let i = 0; i < AGE_EPOCHS.length; i++){
		if(AGE_EPOCHS[i].y <= year){ ep = AGE_EPOCHS[i]; } else { break; }
	}
	return ep;
}

function dignities(idx){
	const s = SIGNS[SIGN_KEYS[idx]] || {};
	const ruler = s.domicile;
	const exalt = (s.exaltation && SEVEN.indexOf(s.exaltation.planet) >= 0) ? s.exaltation.planet : null;
	const detr = (SIGNS[SIGN_KEYS[(idx + 6) % 12]] || {}).domicile;
	return { ruler, exalt, detr };
}

function dignityText(d){
	const z = (p) => PLANET_ZH[p] || p;
	const parts = [];
	if(d.ruler && d.exalt && d.ruler === d.exalt){ parts.push(z(d.ruler) + '主强'); }
	else { if(d.ruler){ parts.push(z(d.ruler) + '主'); } if(d.exalt){ parts.push(z(d.exalt) + '强'); } }
	if(d.detr){ parts.push(z(d.detr) + '落'); }
	return parts.join('·');
}

function computeAges(conjs){
	const ages = [];
	let cur = null;
	(conjs || []).forEach((c) => {
		const ep = ageEpochFor(c.year);
		if(!cur || cur.epochY !== ep.y){
			if(cur){ ages.push(cur); }
			const sign = SIGNS[SIGN_KEYS[ep.s]] || {};
			cur = {
				epochY: ep.y, leadingCn: sign.cn, leadingSignKey: SIGN_KEYS[ep.s],
				element: sign.element, dignities: dignities(ep.s), conjs: [],
			};
		}
		cur.conjs.push(c);
	});
	if(cur){ ages.push(cur); }
	return ages;
}

// 入宫盘上升座 → 域主星 = 年主星。
function ascRuler(chart){
	let key = null;
	let lon = null;
	try{
		const facts = buildFacts(chart);
		if(facts && facts.meta){
			if(facts.meta.ascSign){ key = facts.meta.ascSign; }
			else if(facts.meta.ascLon != null){ lon = facts.meta.ascLon; }
		}
		if(key == null && facts && facts.lons && facts.lons.asc != null){ lon = facts.lons.asc; }
	}catch(e){ /* noop */ }
	if(key == null && lon != null){ key = SIGN_KEYS[Math.floor((((lon % 360) + 360) % 360) / 30)]; }
	const sign = key ? SIGNS[key] : null;
	if(!sign){ return null; }
	return { signKey: key, signCn: sign.cn, modality: sign.modality, rulerKey: sign.domicile, rulerCn: PLANET_CN[sign.domicile] || sign.domicile };
}

const CARD = {
	border: '1px solid var(--horosa-border, rgba(128,128,128,0.16))',
	borderRadius: 12,
	padding: '14px 16px',
	marginBottom: 14,
	background: 'var(--horosa-card-bg, rgba(128,128,128,0.025))',
};
const CARD_TITLE = { fontSize: 13.5, fontWeight: 700, marginBottom: 12, letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: 8 };

class MundaneMain extends Component{
	constructor(props){
		super(props);
		this.state = {
			casting: false, err: '',
			gcStart: 1300, gcEnd: 2200, gcLoading: false, gcResults: null, gcErr: '', gcPair: 'jupiter-saturn', gcAspect: 0, gcMode: 'ages',
			scanLoading: false, scanRows: null, scanErr: '', scanType: '', eclipseDetail: null,
			regionAddOpen: false, regionForm: { name: '', date: '', time: '12:00:00', zone: '+08:00', lon: '116e23', lat: '39n54', gpsLon: 116.38, gpsLat: 39.9 },
		};
		this.castIngress = this.castIngress.bind(this);
		this.computeGreatConj = this.computeGreatConj.bind(this);
		this.scanEvents = this.scanEvents.bind(this);
	}

	componentDidMount(){
		this.computeGreatConj();
	}

	geoFromFields(fields){
		return {
			zone: fields.zone ? fields.zone.value : '+08:00',
			lon: fields.lon ? fields.lon.value : '116e23',
			lat: fields.lat ? fields.lat.value : '23n26',
			gpsLat: fields.gpsLat ? fields.gpsLat.value : 23.43,
			gpsLon: fields.gpsLon ? fields.gpsLon.value : 116.38,
		};
	}

	async castIngress(extra, setExtra, fields, setTime){
		const term = extra.ingressTerm || '春分';
		const year = clampYear(extra.ingressYear, currentYear());
		const zone = fields.zone ? fields.zone.value : '+08:00';
		this.setState({ casting: true, err: '' });
		try{
			const params = {
				year: String(year),
				ad: fields.ad ? fields.ad.value : 1,
				zone,
				lon: fields.lon ? fields.lon.value : '116e23',
				lat: '23n26',
				gpsLat: 23.43,
				gpsLon: fields.gpsLon ? fields.gpsLon.value : (fields.lon ? fields.lon.value : 0),
				timeAlg: 0,
				jieqis: [term],
			};
			const seed = await fetchPreciseJieqiSeed(params);
			const hit = seed && seed[term];
			if(!hit || !hit.time){ throw new Error('未取到入宫时刻'); }
			const dt = new DateTime();
			dt.parse(hit.time, 'YYYY-MM-DD HH:mm:ss');
			dt.zone = zone;
			dt.calcJdn();
			setExtra({ mundaneType: 'ingress', ingressTerm: term, ingressYear: year, ingressMoment: hit.time });
			setTime(dt);
			this.setState({ casting: false });
		}catch(e){
			this.setState({ casting: false, err: (e && e.message) || '入宫盘排盘失败' });
		}
	}

	async scanEvents(type, extra, fields){
		const year = clampYear(extra.scanYear, currentYear());
		const geo = this.geoFromFields(fields);
		const kinds = (type === 'solecl' || type === 'lunecl') ? ['eclipses'] : ['lunations'];
		this.setState({ scanLoading: true, scanErr: '', scanType: type, scanRows: null });
		const res = await fetchMundaneEvents({
			startDate: ymd(year, 1, 1), endDate: ymd(year, 12, 31),
			zone: geo.zone, lon: geo.lon, lat: geo.lat, gpsLat: geo.gpsLat, gpsLon: geo.gpsLon,
			kinds,
		});
		if(res.err){ this.setState({ scanLoading: false, scanErr: '事件扫描失败：请确认本地服务运行。' }); return; }
		let rows = [];
		if(type === 'newmoon'){ rows = (res.lunations || []).filter((l) => l.phase === 'New Moon'); }
		else if(type === 'fullmoon'){ rows = (res.lunations || []).filter((l) => l.phase === 'Full Moon'); }
		else if(type === 'solecl'){ rows = (res.eclipses || []).filter((e) => e.kind === 'solar'); }
		else if(type === 'lunecl'){ rows = (res.eclipses || []).filter((e) => e.kind === 'lunar'); }
		this.setState({ scanLoading: false, scanRows: rows });
	}

	useMoment(row, type, setExtra, fields, setTime){
		const geo = this.geoFromFields(fields);
		const dt = momentToDateTime(row.localTime, geo.zone);
		if(!dt){ return; }
		const patch = { mundaneType: type, selectedMoment: row.localTime, selectedSign: row.sign };
		if(type === 'solecl' || type === 'lunecl'){
			patch.eclipseKind = row.kind; patch.eclipseTypeText = row.eclipseType;
			this.setState({ eclipseDetail: null });
			this.fetchEclipseDetail(row.localTime, row.kind, geo);
		}
		setExtra(patch);
		setTime(dt);
	}

	// 食时长定则：日食 N 小时→约 N 年、月食 N 小时→约 N 月（/astroextra/eclipsedetail，swisseph 接触时刻）。
	fetchEclipseDetail(moment, kind, geo){
		const parts = `${moment || ''}`.split(' ');
		request(`${Constants.ServerRoot}/astroextra/eclipsedetail`, {
			body: JSON.stringify({ date: parts[0], time: parts[1] || '00:00:00', zone: geo.zone, lat: geo.lat, lon: geo.lon, eclipseKind: kind }),
			timeoutMs: 60000,
		}).then((data) => {
			const r = (data && data.Result) ? data.Result : data;
			this.setState({ eclipseDetail: (r && !r.err) ? r : null });
		}).catch(() => { this.setState({ eclipseDetail: null }); });
	}

	applyRegion(key, setExtra, patchFields){
		const rec = allRegions()[key];
		if(!rec){ return; }
		const dt = new DateTime();
		if(dt.setZone){ dt.setZone(rec.zone || '+00:00'); }
		dt.parse(`${rec.date} ${rec.time || '12:00:00'}`, 'YYYY-MM-DD HH:mm:ss');
		if(dt.calcJdn){ dt.calcJdn(); }
		setExtra({ mundaneType: 'region', regionKey: key, regionCn: rec.cn });
		patchFields({
			date: dt, time: dt.clone ? dt.clone() : dt, zone: dt.zone, ad: dt.ad,
			lon: rec.lon, lat: rec.lat, gpsLon: rec.gpsLon, gpsLat: rec.gpsLat, pos: rec.cn,
		});
	}

	// 成熟方案：把「当前盘」（上方「时间」+「地点」设定好的时刻与坐标）命名后存为地区盘。
	addRegion(setExtra, patchFields, fields){
		const f = this.state.regionForm;
		if(!f.name || !f.name.trim()){ this.setState({ scanErr: '请填地区/事件名称' }); return; }
		const dt = fields && fields.date && fields.date.value;
		const dateStr = dt && dt.format ? dt.format('YYYY-MM-DD') : '';
		const timeStr = dt && dt.format ? dt.format('HH:mm:ss') : '12:00:00';
		const zone = (fields && fields.zone && fields.zone.value) || (dt && dt.zone) || '+08:00';
		const lon = (fields && fields.lon && fields.lon.value) || '116e23';
		const lat = (fields && fields.lat && fields.lat.value) || '39n54';
		const gpsLon = (fields && fields.gpsLon && fields.gpsLon.value != null) ? fields.gpsLon.value : 0;
		const gpsLat = (fields && fields.gpsLat && fields.gpsLat.value != null) ? fields.gpsLat.value : 0;
		if(!dateStr){ this.setState({ scanErr: '请先用上方「时间」设定建置时刻' }); return; }
		const key = `user_${f.name.trim()}_${dateStr}`.replace(/\s+/g, '');
		const rec = { cn: f.name.trim(), date: dateStr, time: timeStr, zone, lon, lat, gpsLon: Number(gpsLon) || 0, gpsLat: Number(gpsLat) || 0, note: '用户自定义' };
		saveUserRegion(key, rec);
		this.setState({ regionAddOpen: false, scanErr: '', regionForm: { ...this.state.regionForm, name: '' } });
		this.applyRegion(key, setExtra, patchFields);
	}

	async computeGreatConj(){
		const startYear = clampYear(this.state.gcStart, 1300);
		const endYear = clampYear(this.state.gcEnd, 2200);
		if(endYear < startYear){ this.setState({ gcErr: '结束年须不小于起始年' }); return; }
		const pair = this.state.gcPair || 'jupiter-saturn';
		const aspect = this.state.gcAspect || 0;
		const richJuSa = (pair === 'jupiter-saturn' && aspect === 0);
		this.setState({ gcLoading: true, gcErr: '' });
		try{
			if(richJuSa){
				const data = await request(`${Constants.ServerRoot}/astroextra/greatconj`, {
					body: JSON.stringify({ startYear, endYear }),
					timeoutMs: 90000,
				});
				const r = (data && data.Result) ? data.Result : data;
				const list = (r && r.conjunctions) ? r.conjunctions : (Array.isArray(r) ? r : []);
				this.setState({ gcLoading: false, gcResults: list, gcMode: 'ages' });
			}else{
				const parts = pair.split('-');
				const data = await request(`${Constants.ServerRoot}/astroextra/planetcycles`, {
					body: JSON.stringify({ startYear, endYear, p1: PLANET_ASTRO_ID[parts[0]], p2: PLANET_ASTRO_ID[parts[1]], aspect }),
					timeoutMs: 90000,
				});
				const r = (data && data.Result) ? data.Result : data;
				const list = (r && r.events) ? r.events : [];
				this.setState({ gcLoading: false, gcResults: list, gcMode: 'flat' });
			}
		}catch(e){
			this.setState({ gcLoading: false, gcErr: '行星周期计算失败' });
		}
	}

	// ---------- 左栏 ----------
	renderLeftExtra({ extra, setExtra, fields, setTime, patchFields }){
		const type = extra.mundaneType || 'ingress';
		return (
			<div className="horosa-field-block horosa-mundane-left">
				<div className="horosa-field-label">世俗盘类型</div>
				<XQSelect style={{ width: '100%' }} size="small" value={type}
					onChange={(v) => setExtra({ mundaneType: v })}>
					{MUNDANE_TYPES.map((t) => (<Option key={t.key} value={t.key}>{t.label}</Option>))}
				</XQSelect>
				<div className="horosa-mundane-controls">
					{type === 'ingress' ? this.renderIngressLeft(extra, setExtra, fields, setTime) : null}
					{(type === 'newmoon' || type === 'fullmoon' || type === 'solecl' || type === 'lunecl') ? this.renderScanLeft(type, extra, setExtra, fields, setTime) : null}
					{type === 'region' ? this.renderRegionLeft(extra, setExtra, patchFields, fields) : null}
					{type === 'cycles' ? (<div className="horosa-mundane-hint">「行星周期」在右栏设定年段，计算木土大合相时代纪元。</div>) : null}
				</div>
			</div>
		);
	}

	renderIngressLeft(extra, setExtra, fields, setTime){
		const term = extra.ingressTerm || '春分';
		const year = extra.ingressYear != null ? extra.ingressYear : currentYear();
		return (
			<div>
				<div className="horosa-field-label sub">入宫节气</div>
				<XQSelect style={{ width: '100%' }} size="small" value={term}
					onChange={(v) => setExtra({ ingressTerm: v })}>
					{INGRESSES.map((it) => (<Option key={it.term} value={it.term}>{it.label}</Option>))}
				</XQSelect>
				<div className="horosa-field-label sub">年份</div>
				<InputNumber size="small" style={{ width: '100%' }} value={year} min={-3000} max={3000}
					onChange={(v) => setExtra({ ingressYear: clampYear(v, currentYear()) })} />
				<XQButton size="small" style={{ width: '100%', marginTop: 10 }} disabled={this.state.casting}
					onClick={() => this.castIngress(extra, setExtra, fields, setTime)}>{this.state.casting ? '排盘中…' : '排入宫盘'}</XQButton>
				{this.state.err ? (<div className="horosa-mundane-err">{this.state.err}</div>) : null}
			</div>
		);
	}

	renderScanLeft(type, extra, setExtra, fields, setTime){
		const year = extra.scanYear != null ? extra.scanYear : currentYear();
		const isEcl = (type === 'solecl' || type === 'lunecl');
		const rows = (this.state.scanType === type) ? this.state.scanRows : null;
		const evName = type === 'newmoon' ? '新月' : (type === 'fullmoon' ? '满月' : '食相');
		return (
			<div>
				<div className="horosa-field-label sub">年份</div>
				<InputNumber size="small" style={{ width: '100%' }} value={year} min={-3000} max={3000}
					onChange={(v) => setExtra({ scanYear: clampYear(v, currentYear()) })} />
				<XQButton size="small" style={{ width: '100%', marginTop: 10 }} disabled={this.state.scanLoading}
					onClick={() => this.scanEvents(type, extra, fields)}>{this.state.scanLoading ? '扫描中…' : `扫描当年${evName}`}</XQButton>
				{this.state.scanErr ? (<div className="horosa-mundane-err">{this.state.scanErr}</div>) : null}
				{rows ? (
					<div className="horosa-mundane-scanlist">
						{rows.length === 0 ? (<div className="empty">该年无{evName}。</div>) : rows.map((row, i) => {
							const sg = row.sign ? SIGNS[row.sign] : null;
							const active = extra.selectedMoment === row.localTime;
							return (
								<div key={i} className={'row' + (active ? ' active' : '')} onClick={() => this.useMoment(row, type, setExtra, fields, setTime)}>
									<span className="t">{row.localTime}</span>
									<span className="s">
										{sg ? <span style={{ color: ELEMENT_COLOR[sg.element] }}>{sGlyph(row.sign)} {sg.cn}</span> : ''}
										{isEcl && row.eclipseType ? <em>{row.eclipseType}</em> : null}
									</span>
								</div>
							);
						})}
					</div>
				) : (<div className="horosa-mundane-hint">点「扫描」列出该年事件，再点选某条按精确时刻起盘。</div>)}
			</div>
		);
	}

	renderRegionLeft(extra, setExtra, patchFields, fields){
		const regions = allRegions();
		const keys = Object.keys(regions);
		const f = this.state.regionForm;
		const setF = (k, v) => this.setState({ regionForm: { ...this.state.regionForm, [k]: v } });
		return (
			<div>
				<div className="horosa-field-label sub">选择地区盘</div>
				<XQSelect style={{ width: '100%' }} size="small" value={extra.regionKey || undefined} placeholder="选择地区盘"
					onChange={(v) => this.applyRegion(v, setExtra, patchFields)}>
					{keys.map((k) => (<Option key={k} value={k}>{regions[k].cn}</Option>))}
				</XQSelect>
				<XQButton size="small" style={{ width: '100%', marginTop: 10 }} onClick={() => this.setState({ regionAddOpen: !this.state.regionAddOpen })}>{this.state.regionAddOpen ? '收起' : '＋ 存当前盘为地区盘'}</XQButton>
				{this.state.regionAddOpen ? (
					<div className="horosa-mundane-regionform">
						<ol className="horosa-mundane-steps">
							<li>用上方「<b>时间</b>」设定历史建置日期时刻</li>
							<li>用上方「<b>地点</b>」选取该地区坐标</li>
							<li>下方命名后保存</li>
						</ol>
						<Input size="small" placeholder="地区 / 事件名称" value={f.name} onChange={(e) => setF('name', e.target.value)} onPressEnter={() => this.addRegion(setExtra, patchFields, fields)} />
						<XQButton size="small" style={{ width: '100%' }} onClick={() => this.addRegion(setExtra, patchFields, fields)}>保存当前盘为地区盘</XQButton>
						{this.state.scanErr ? (<div className="horosa-mundane-err">{this.state.scanErr}</div>) : null}
					</div>
				) : null}
			</div>
		);
	}

	// ---------- 右栏 ----------
	renderJudgmentCards(chart){
		if(!chart){ return null; }
		let rows = [];
		try{ rows = describeMundaneChart(buildFacts(chart)); }catch(e){ rows = []; }
		if(!rows.length){ return null; }
		return (
			<div style={CARD}>
				<div style={CARD_TITLE}><span style={{ width: 3, height: 14, background: '#8a6d3b', borderRadius: 2, display: 'inline-block' }} />行星落世俗宫</div>
				{rows.map((r, i) => (
					<div key={i} style={{ padding: '6px 0', borderTop: i ? '1px solid rgba(128,128,128,0.07)' : 'none' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600 }}>
							<span style={{ fontSize: 14 }}>{pGlyph(r.planet)}</span>{r.planetCn}
							<span style={{ opacity: 0.55, fontWeight: 400 }}>第{r.house}宫 · {r.houseMeaning}</span>
							{r.retro ? <span style={{ fontSize: 10, color: '#c0392b', opacity: 0.8 }}>逆</span> : null}
						</div>
						<div style={{ fontSize: 11.5, opacity: 0.7, lineHeight: '17px', marginTop: 2 }}>{r.text}</div>
					</div>
				))}
				<div style={{ fontSize: 10.5, opacity: 0.45, marginTop: 8 }}>判词为概括之象，须结合相位、宫主星状态与时势综合论断。</div>
			</div>
		);
	}

	renderYearChart(chart, extra){
		const yl = chart ? ascRuler(chart) : null;
		const ing = INGRESSES.find((i) => i.term === (extra.ingressTerm || '春分'));
		const months = yl ? ingressDurationMonths(yl.signKey) : null;
		return (
			<div style={CARD}>
				<div style={CARD_TITLE}><span style={{ width: 3, height: 14, background: '#b8860b', borderRadius: 2, display: 'inline-block' }} />年盘概要</div>
				{extra.ingressMoment ? (
					<div>
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
							<span style={{ fontSize: 16, fontWeight: 700 }}>{extra.ingressYear != null ? extra.ingressYear : currentYear()} 年</span>
							<span style={{ fontSize: 12, opacity: 0.7 }}>{ing ? ing.label.split('（')[0] : '春分入宫'}</span>
						</div>
						<div style={{ fontSize: 11.5, opacity: 0.55, marginBottom: 12 }}>入宫时刻 {extra.ingressMoment}</div>
						{yl ? (
							<div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(184,134,11,0.10)', border: '1px solid rgba(184,134,11,0.18)' }}>
								<div style={{ textAlign: 'center' }}>
									<div style={{ fontSize: 10, opacity: 0.6 }}>上升</div>
									<div style={{ fontSize: 20, lineHeight: '24px' }}>{sGlyph(yl.signKey)}</div>
									<div style={{ fontSize: 12 }}>{yl.signCn}</div>
								</div>
								<span style={{ opacity: 0.4, fontSize: 18 }}>→</span>
								<div style={{ textAlign: 'center' }}>
									<div style={{ fontSize: 10, opacity: 0.6, color: '#b8860b' }}>年主星 · 命主</div>
									<div style={{ fontSize: 22, lineHeight: '26px', color: '#b8860b' }}>{pGlyph(yl.rulerKey)}</div>
									<div style={{ fontSize: 13, fontWeight: 700, color: '#b8860b' }}>{yl.rulerCn}</div>
								</div>
							</div>
						) : null}
						{yl && months ? (
							<div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 8 }}>本盘上升 {MODALITY_CN[yl.modality] || ''}星座 → 掌管约 <b>{months}</b> 个月{months >= 12 ? '（白羊入宫若为固定座，则本年以年盘为主、后续季盘从属）' : ''}。</div>
						) : null}
						<div style={{ fontSize: 11, opacity: 0.5, marginTop: 10, lineHeight: '16px' }}>年主星即入宫盘上升座之域主星，主导该年/季世俗主题；再综合四轴、十宫（政权）、各宫主星状态论断。</div>
					</div>
				) : (
					<div style={{ fontSize: 12, opacity: 0.55 }}>左栏选年份与入宫节气，点「排入宫盘」按精确入宫时刻起盘。春分白羊入宫盘 = 该年年盘。</div>
				)}
			</div>
		);
	}

	renderLunationCard(chart, extra, type){
		const facts = chart ? (() => { try{ return buildFacts(chart); }catch(e){ return null; } })() : null;
		const moon = facts && facts.planets ? facts.planets.moon : null;
		const sg = moon && moon.sign ? SIGNS[moon.sign] : null;
		const title = type === 'newmoon' ? '新月图' : '满月图';
		return (
			<div style={CARD}>
				<div style={CARD_TITLE}><span style={{ width: 3, height: 14, background: type === 'newmoon' ? '#555' : '#b8860b', borderRadius: 2, display: 'inline-block' }} />{title}</div>
				{extra.selectedMoment ? (
					<div>
						<div style={{ fontSize: 12.5, marginBottom: 6 }}>时刻 <b>{extra.selectedMoment}</b></div>
						{sg ? <div style={{ fontSize: 12.5 }}>月亮 <span style={{ color: ELEMENT_COLOR[sg.element] }}>{sGlyph(moon.sign)} {sg.cn}</span>{moon.house ? ` · 第${moon.house}宫（${MUNDANE_HOUSE_MEANINGS[moon.house]}）` : ''}</div> : null}
						<div style={{ fontSize: 11, opacity: 0.55, marginTop: 8, lineHeight: '16px' }}>{type === 'newmoon' ? '新月（日月合相）影响约一个月，主新启与变动；' : '满月（日月对分）影响约一个月，主成熟与张力；'}与当季入宫盘对照（入宫为时针、朔望为分针）。</div>
					</div>
				) : (<div style={{ fontSize: 12, opacity: 0.55 }}>左栏扫描并选取一个{type === 'newmoon' ? '新月' : '满月'}时刻起盘。</div>)}
			</div>
		);
	}

	renderEclipseCard(chart, extra, type){
		const facts = chart ? (() => { try{ return buildFacts(chart); }catch(e){ return null; } })() : null;
		const kind = type === 'lunecl' ? 'lunar' : 'solar';
		const ec = facts ? describeEclipse(facts, kind) : null;
		const sg = ec && ec.sign ? SIGNS[ec.sign] : null;
		const title = type === 'lunecl' ? '月食图' : '日食图';
		return (
			<div style={CARD}>
				<div style={CARD_TITLE}><span style={{ width: 3, height: 14, background: '#7a3b8a', borderRadius: 2, display: 'inline-block' }} />{title}</div>
				{extra.selectedMoment && ec ? (
					<div>
						<div style={{ fontSize: 12.5, marginBottom: 6 }}>时刻 <b>{extra.selectedMoment}</b>{extra.eclipseTypeText ? ` · ${extra.eclipseTypeText}` : ''}</div>
						<div style={{ fontSize: 12.5 }}>{ec.luminaryCn} <span style={{ color: sg ? ELEMENT_COLOR[sg.element] : undefined }}>{sg ? <>{sGlyph(ec.sign)} {sg.cn}</> : ec.sign}</span> · {ec.decanLabel}{ec.house ? ` · 第${ec.house}宫` : ''}</div>
						{ec.elementText ? <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 8, lineHeight: '17px' }}>元素：{ec.elementText}</div> : null}
						{ec.decanText ? <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 4, lineHeight: '17px' }}>分度：{ec.decanText}</div> : null}
						{this.state.eclipseDetail && this.state.eclipseDetail.durationHours ? (
							<div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 8, lineHeight: '17px' }}>时长：约 <b>{this.state.eclipseDetail.durationHours}</b> 小时 → 影响约 <b>{this.state.eclipseDetail.influence}</b> {this.state.eclipseDetail.influenceUnit}（食时长定则）。</div>
						) : null}
						<div style={{ fontSize: 10.5, opacity: 0.45, marginTop: 8 }}>食以可见地区最应；日食时长→影响年数、月食时长→影响月数。</div>
					</div>
				) : (<div style={{ fontSize: 12, opacity: 0.55 }}>左栏扫描并选取一个{title}时刻起盘。</div>)}
			</div>
		);
	}

	renderRegionCard(chart, extra){
		let facts = null;
		try{ facts = chart ? buildFacts(chart) : null; }catch(e){ facts = null; }
		return (
			<div style={CARD}>
				<div style={CARD_TITLE}><span style={{ width: 3, height: 14, background: '#2c7fb8', borderRadius: 2, display: 'inline-block' }} />地区盘 · 12 世俗宫{extra.regionCn ? ` · ${extra.regionCn}` : ''}</div>
				{facts && facts.houses ? (
					<div>
						{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
							const hi = facts.houses[h];
							const occKeys = (hi && hi.planets || []).filter((k) => MUN_PLANET_CN[k]);
							const sg = hi && hi.sign ? SIGNS[hi.sign] : null;
							return (
								<div key={h} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0', borderTop: h > 1 ? '1px solid rgba(128,128,128,0.06)' : 'none', fontSize: 11.5 }}>
									<span style={{ width: 22, opacity: 0.6, fontWeight: 700 }}>{h}</span>
									<span style={{ flex: 1 }}>{MUNDANE_HOUSE_MEANINGS[h]}</span>
									<span style={{ width: 74, textAlign: 'right', opacity: 0.85, display: 'inline-flex', gap: 3, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>{sg ? sGlyph(hi.sign) : null}{occKeys.map((k, ix) => <span key={ix}>{pGlyph(k)}</span>)}</span>
								</div>
							);
						})}
						<div style={{ fontSize: 10.5, opacity: 0.45, marginTop: 8 }}>各宫义结合宫内行星与宫主星状态论该地区相关事务。</div>
					</div>
				) : (<div style={{ fontSize: 12, opacity: 0.55 }}>左栏选择或添加地区盘起盘。</div>)}
			</div>
		);
	}

	renderAge(age, i){
		const col = ELEMENT_COLOR[age.element] || '#888';
		const triads = [];
		for(let k = 0; k < age.conjs.length; k += 3){ triads.push(age.conjs.slice(k, k + 3)); }
		return (
			<div key={i} style={{ border: '1px solid rgba(128,128,128,0.14)', borderLeft: `3px solid ${col}`, borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: ELEMENT_BG[age.element] }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<span style={{ fontSize: 17 }}>{sGlyph(age.leadingSignKey)}</span>
						<span style={{ fontSize: 14, fontWeight: 700 }}>{age.leadingCn}时代</span>
						<span style={{ fontSize: 11, color: col, border: `1px solid ${col}`, borderRadius: 4, padding: '0 5px', opacity: 0.9 }}>{ELEMENT_CN[age.element]}</span>
					</div>
					<span style={{ fontSize: 12, fontWeight: 600, color: col }}>{dignityText(age.dignities)}</span>
				</div>
				<div style={{ padding: '4px 12px 8px' }}>
					{triads.map((triad, ti) => {
						const ph = triadPhase(triad, age.element);
						const pcol = ELEMENT_COLOR[ph.el] || col;
						return (
							<div key={ti}>
								<div style={{ fontSize: 11, color: pcol, fontWeight: 600, margin: ti ? '8px 0 2px' : '4px 0 2px', letterSpacing: '0.05em' }}>{ph.label}</div>
								{triad.map((g, j) => {
									const sg = SIGNS[SIGN_KEYS[g.sign]] || {};
									const el = sg.element || 'earth';
									const transit = el !== age.element;
									const deg = g.lon != null ? `${(g.lon % 30).toFixed(1)}°` : '';
									return (
										<div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2.5px 0', fontSize: 12.5, borderTop: j ? '1px solid rgba(128,128,128,0.06)' : 'none' }}>
											<span style={{ width: 76, opacity: 0.65, whiteSpace: 'nowrap' }}>{yearLabel(g.year)}-{String(g.month).padStart(2, '0')}</span>
											<span style={{ flex: 1, whiteSpace: 'nowrap' }}>
												<span style={{ color: ELEMENT_COLOR[el], marginRight: 4 }}>{sGlyph(SIGN_KEYS[g.sign])}</span>{sg.cn}
												{transit ? <span style={{ fontSize: 10, opacity: 0.45, marginLeft: 6 }}>过渡</span> : null}
											</span>
											<span style={{ width: 46, textAlign: 'right', opacity: 0.65 }}>{deg}</span>
										</div>
									);
								})}
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	renderGreatConj(fill){
		const isFlat = this.state.gcMode === 'flat';
		const ages = (!isFlat && this.state.gcResults) ? computeAges(this.state.gcResults) : null;
		const flatList = isFlat ? (this.state.gcResults || []) : null;
		const total = this.state.gcResults ? this.state.gcResults.length : 0;
		const cardStyle = fill ? { ...CARD, marginBottom: 0, minHeight: '100%', boxSizing: 'border-box' } : CARD;
		const listStyle = fill ? { paddingRight: 4 } : { maxHeight: 460, overflowY: 'auto', paddingRight: 4 };
		const pairCn = (CYCLE_PAIRS.find((p) => p.key === this.state.gcPair) || {}).cn || '木土';
		const aspCn = this.state.gcAspect === 180 ? '对分' : '合相';
		return (
			<div style={cardStyle}>
				<div style={CARD_TITLE}><span style={{ width: 3, height: 14, background: '#2c7fb8', borderRadius: 2, display: 'inline-block' }} />行星周期 · {isFlat ? `${pairCn}` : '木土大合相·时代纪元'}</div>
				<div style={{ fontSize: 11, opacity: 0.6, marginBottom: 10, lineHeight: '17px' }}>慢星周期标记时代脉动。木土合每约 20 年一会、约 200 年轮转一象（大三合）；其余慢星对的合/冲亦为重大历史节点（如土冥、天海循环）。</div>
				<div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
					<XQSelect size="small" style={{ width: 158 }} value={this.state.gcPair} onChange={(v) => this.setState({ gcPair: v })}>
						{CYCLE_PAIRS.map((p) => (<Option key={p.key} value={p.key}>{p.cn}</Option>))}
					</XQSelect>
					<XQSelect size="small" style={{ width: 104 }} value={this.state.gcAspect} onChange={(v) => this.setState({ gcAspect: v })}>
						{CYCLE_ASPECTS.map((a) => (<Option key={a.v} value={a.v}>{a.cn}</Option>))}
					</XQSelect>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
					<InputNumber size="small" style={{ width: 80 }} value={this.state.gcStart} min={-3000} max={3000}
						onChange={(v) => this.setState({ gcStart: clampYear(v, 1300) })} />
					<span style={{ fontSize: 12, opacity: 0.6 }}>至</span>
					<InputNumber size="small" style={{ width: 80 }} value={this.state.gcEnd} min={-3000} max={3000}
						onChange={(v) => this.setState({ gcEnd: clampYear(v, 2200) })} />
					<XQButton size="small" disabled={this.state.gcLoading} onClick={this.computeGreatConj}>{this.state.gcLoading ? '计算中…' : '计算'}</XQButton>
					<span style={{ fontSize: 11, opacity: 0.45 }}>前3000–3000</span>
				</div>
				{this.state.gcErr ? <div style={{ fontSize: 11, color: '#c0392b', marginBottom: 8 }}>{this.state.gcErr}</div> : null}
				<Spin spinning={this.state.gcLoading}>
					{isFlat ? (
						flatList && flatList.length ? (
							<div style={listStyle}>
								{flatList.map((c, i) => {
									const sk = SIGN_KEYS[c.sign];
									const sg = SIGNS[sk] || {};
									return (
										<div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5, borderTop: i ? '1px solid rgba(128,128,128,0.06)' : 'none' }}>
											<span style={{ opacity: 0.65, width: 86, whiteSpace: 'nowrap' }}>{yearLabel(c.year)}-{String(c.month).padStart(2, '0')}</span>
											<span style={{ flex: 1, whiteSpace: 'nowrap' }}><span style={{ color: ELEMENT_COLOR[sg.element], marginRight: 4 }}>{sGlyph(sk)}</span>{sg.cn || ''}</span>
											<span style={{ width: 46, textAlign: 'right', opacity: 0.65 }}>{c.lon != null ? `${(c.lon % 30).toFixed(1)}°` : ''}</span>
										</div>
									);
								})}
								<div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>{pairCn} · {total} 次{aspCn}（swisseph 精算）。</div>
							</div>
						) : (<div style={{ fontSize: 12, opacity: 0.55, padding: '6px 0' }}>设定年段与星对、相位后点「计算」，列出该区间全部{aspCn}时刻。</div>)
					) : (
						ages && ages.length ? (
							<div style={listStyle}>
								{ages.map((a, i) => this.renderAge(a, i))}
								<div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>{ages.length} 个时代 · {total} 次合相（swisseph 精算，含三重合相分列；「过渡」= 该次合相落入下一象，预示大转换）。</div>
							</div>
						) : (
							<div style={{ fontSize: 12, opacity: 0.55, padding: '6px 0' }}>设定年段后点「计算」，按星历精算木土合相并归入各时代（座 / 度 / 象 / 主强落）。</div>
						)
					)}
				</Spin>
			</div>
		);
	}

	renderRight({ chart, extra }){
		const type = extra.mundaneType || 'ingress';
		if(type === 'cycles'){
			return <div style={{ fontSize: 13, height: '100%' }}>{this.renderGreatConj(true)}</div>;
		}
		return (
			<div style={{ fontSize: 13 }}>
				{type === 'ingress' ? this.renderYearChart(chart, extra) : null}
				{(type === 'newmoon' || type === 'fullmoon') ? this.renderLunationCard(chart, extra, type) : null}
				{(type === 'solecl' || type === 'lunecl') ? this.renderEclipseCard(chart, extra, type) : null}
				{type === 'region' ? this.renderRegionCard(chart, extra) : null}
				{this.renderJudgmentCards(chart)}
			</div>
		);
	}

	buildAiSnapshot(chart, fields, extra){
		const ex = extra || {};
		const type = ex.mundaneType || 'ingress';
		const TITLE = { ingress: '世俗入宫', newmoon: '新月图', fullmoon: '满月图', solecl: '日食图', lunecl: '月食图', region: '地区盘', cycles: '行星周期' };
		const headLines = [`[${TITLE[type] || '世俗入宫'}]`];
		if(type === 'ingress'){ headLines.push(`入宫节气：${ex.ingressTerm || '-'}`, `年份：${ex.ingressYear || '-'}`); }
		else if(type === 'newmoon' || type === 'fullmoon'){ headLines.push(`时刻：${ex.selectedMoment || '-'}`); }
		else if(type === 'solecl' || type === 'lunecl'){ headLines.push(`时刻：${ex.selectedMoment || '-'}`, `类型：${ex.eclipseTypeText || '-'}`); }
		else if(type === 'region'){ headLines.push(`地区：${ex.regionCn || '-'}`); }
		// 世俗宫义判词段
		let judge = '';
		try{
			const rows = describeMundaneChart(buildFacts(chart));
			if(rows && rows.length){ judge = '[世俗宫义]\n' + rows.map((r) => `${r.planetCn} 第${r.house}宫(${r.houseMeaning})：${r.text}`).join('\n'); }
		}catch(e){ /* noop */ }
		const head = headLines.join('\n');
		const body = buildAstroSnapshotContent(chart, fields) || '';
		return [head, judge, body].filter(Boolean).join('\n\n');
	}

	render(){
		return (
			<DivinationChartShell
				title="世俗盘"
				kicker="世俗设置"
				pageClass="horosa-mundane-page"
				castNowLabel="此刻起盘"
				defaults={{ tradition: 1, zodiacal: 0, hsys: 0 }}
				initialExtra={{ mundaneType: 'ingress', ingressTerm: '春分', ingressYear: currentYear(), scanYear: currentYear() }}
				fields={this.props.fields}
				height={this.props.height}
				chartDisplay={this.props.chartDisplay}
				planetDisplay={this.props.planetDisplay}
				lotsDisplay={this.props.lotsDisplay}
				showAstroMeaning={this.props.showAstroMeaning}
				dispatch={this.props.dispatch}
				saveModule="mundane"
				buildAiSnapshot={(chart, fields, extra) => this.buildAiSnapshot(chart, fields, extra)}
				renderLeftExtra={(args) => this.renderLeftExtra(args)}
				renderRight={(args) => this.renderRight(args)}
			/>
		);
	}
}

export default MundaneMain;
