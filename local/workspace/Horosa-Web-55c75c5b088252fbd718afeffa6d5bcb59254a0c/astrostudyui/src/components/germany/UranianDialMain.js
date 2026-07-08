import { Component } from 'react';
import { Row, Col, Select, Switch, Slider, Tree, Card, Radio, DatePicker, InputNumber, Collapse } from 'antd';
import request from '../../utils/request';
import * as Constants from '../../utils/constants';
import * as AstroConst from '../../constants/AstroConst';
import * as AstroText from '../../constants/AstroText';
import UranianDial from './UranianDial';
import UranianModulusDial from './UranianModulusDial';
import { midpointTree, planetaryPictures, midpointList, spiegelContacts } from '../../utils/uranianDial';
import { getStoredUranianDisplay, saveUranianDisplay, URANIAN_DIAL_BASES, dialBaseLabel } from './UranianDialStyle';

const Option = Select.Option;

const DIAL_BODY_IDS = new Set([
	AstroConst.SUN, AstroConst.MOON, AstroConst.MERCURY, AstroConst.VENUS, AstroConst.MARS,
	AstroConst.JUPITER, AstroConst.SATURN, AstroConst.URANUS, AstroConst.NEPTUNE, AstroConst.PLUTO,
	AstroConst.NORTH_NODE, AstroConst.SOUTH_NODE, AstroConst.ASC, AstroConst.MC,
]);

// 个人点 / Basic Six（日月 + Asc/MC + 南北交 + 白羊点）——扫描器默认只围绕这些展开（spec §5.5）。
const PERSONAL_POINTS = new Set([
	AstroConst.SUN, AstroConst.MOON, AstroConst.ASC, AstroConst.MC,
	AstroConst.NORTH_NODE, AstroConst.SOUTH_NODE, AstroConst.ARIES_POINT,
]);

// 8 颗 TNP 虚星 id 集合——供行星图/中点列表/映点的「含 TNP」优先级排序与锚点剪枝。
const URANIAN_SET = new Set(AstroConst.LIST_URANIAN);

// 行星图常用「盘基」快捷:90°(4 次谐波,默认)/45°(8 次谐波,Ebertin 宇宙生物学)/22.5°(16 次谐波)。
const QUICK_BASES = [90, 45, 22.5];

function sunLon(chartRoot){
	const inner = (chartRoot && chartRoot.chart) ? chartRoot.chart : (chartRoot || {});
	const o = (inner.objects || []).find((x) => x.id === AstroConst.SUN);
	return o && Number.isFinite(Number(o.lon)) ? Number(o.lon) : null;
}

function msg(id){ return AstroText.AstroMsgCN[id] || AstroText.AstroTxtMsg[id] || id; }
const pad = (n) => (n < 10 ? '0' + n : '' + n);

// DateTime 无 valueOf()（之前导致太阳弧/年龄算成 NaN）；从 jdn(儒略日，JD2440587.5=Unix纪元) 取毫秒时间戳。
function birthEpochMs(birth){
	const jdn = birth ? Number(birth.jdn) : NaN;
	if (!Number.isFinite(jdn) || jdn === 0) return NaN;
	return (jdn - 2440587.5) * 86400000;
}

// 右栏因子用字形（与盘一致，hover 显名）：TNP=缩写；白羊点=全站 Aries 字形；其余=AstroMsg+AstroChartFont。
function glyphOf(id){
	const tnp = AstroText.isUranian(id) && id !== AstroConst.ARIES_POINT;
	if (tnp) return <span style={{ fontWeight: 600, letterSpacing: '0.3px' }} title={msg(id)}>{AstroText.uranianGlyph(id)}</span>;
	const ch = id === AstroConst.ARIES_POINT ? AstroText.AstroMsg[AstroConst.ARIES] : AstroText.AstroMsg[id];
	if (ch) return <span style={{ fontFamily: AstroConst.AstroChartFont }} title={msg(id)}>{ch}</span>;
	return <span>{msg(id)}</span>;
}

// 安全取 field 值（field 缺失/未填时返回 undefined，绝不抛错）。
function fv(fields, key){
	const f = fields && fields[key];
	return f ? f.value : undefined;
}
function fmt(val, pattern){
	return (val && typeof val.format === 'function') ? val.format(pattern) : undefined;
}

// 一律先校验再发请求：缺/空的 date/time/zone/lat/lon 会让后端 PerChart→GeoPos/Datetime 抛错、
// 回 {err:'param error'}，而 request() 即便 silent 仍会对抛错弹 message.error 提示——故宁可前端拦下不发。
function dialParamsError(p){
	if (!p) return '请先完善出生信息';
	const need = ['date', 'time', 'zone', 'lat', 'lon'];
	for (const k of need){
		const v = p[k];
		if (v === undefined || v === null || `${v}`.trim() === '') return '请先设置出生日期/时间与经纬度';
	}
	return null;
}

function fieldsToParams(fields){
	if (!fields) return null;
	return {
		date: fmt(fv(fields, 'date'), 'YYYY/MM/DD'), time: fmt(fv(fields, 'time'), 'HH:mm:ss'),
		zone: fv(fields, 'zone'), lat: fv(fields, 'lat'), lon: fv(fields, 'lon'),
		gpsLat: fv(fields, 'gpsLat'), gpsLon: fv(fields, 'gpsLon'),
		hsys: fv(fields, 'hsys'), zodiacal: fv(fields, 'zodiacal'), siderealAyanamsa: fv(fields, 'siderealAyanamsa') || '', tradition: false, predictive: 0,
		name: fv(fields, 'name') || '', pos: fv(fields, 'pos') || '',
	};
}

// 从盘对象（本命/行运同形）取参与点：行星+三王+北交南交+Asc/MC。
function chartToPoints(chartRoot){
	const inner = (chartRoot && chartRoot.chart) ? chartRoot.chart : (chartRoot || {});
	const out = []; const seen = new Set();
	const sp = (v) => (Number.isFinite(Number(v)) ? Number(v) : null); // lonspeed:逆行标记用,缺失=null
	const push = (id, lon, speed) => { if (id && Number.isFinite(Number(lon)) && !seen.has(id)) { out.push({ id, lon: Number(lon), speed: sp(speed) }); seen.add(id); } };
	(inner.objects || []).forEach((o) => { if (DIAL_BODY_IDS.has(o.id)) push(o.id, o.lon, o.lonspeed); });
	(inner.angles || []).forEach((o) => { if (DIAL_BODY_IDS.has(o.id)) push(o.id, o.lon, o.lonspeed); });
	return out;
}

// 全链路 TNP 过滤：showTnp=false 时一并从盘绘制+指针读数+中点树剔除（用户验收口径,2026-06-02）。
function filterByTnp(points, showTnp){
	if (showTnp) return points;
	return (points || []).filter((p) => !AstroText.isUranian(p.id) || p.id === AstroConst.ARIES_POINT);
}

// 数字解析：空串/非数→null（视为「跟本命同地点」）。
function parseNum(v){
	if (v === undefined || v === null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

export default class UranianDialMain extends Component {
	constructor(props){
		super(props);
		const disp = getStoredUranianDisplay();
		this.state = {
			...disp,
			showTransit: disp.showTransit || false,
			showSolarArc: disp.showSolarArc || false,
			onlyPersonal: disp.onlyPersonal === undefined ? true : disp.onlyPersonal,
			natalTnp: [],
			transitPoints: null,
			readout: [],
			dataNote: null,        // 出生信息不全时的友好提示（取代裸 param error）
			dialStyle: disp.dialStyle === 'modulus' ? 'modulus' : 'folded', // 盘式：折叠盘 / 多环模数盘
			saArcDirected: 0,      // 太阳弧环被拖动的定向弧(黄道度)
			saAge: 0,              // 由定向弧按 saKey 反推的年龄
			saKey: disp.saKey === 'oneDeg' ? 'oneDeg' : 'naibod', // 太阳弧换算：Naibod / 1°每年
			transitTime: null,     // 行运时刻(null=此刻)，可调
			// 行运/SA 地点可调(null=同本命)。SA 一般地心黄经无需地点,但允许覆盖以方便 relocated 想法。
			transitLat: null, transitLon: null,
			saLat: null, saLon: null,
			// viewport 高度(用于动态算盘 size + 左右栏滚动 maxHeight;props.height 不含底部 Dock 安全距离,
			// 须用 window.innerHeight 实测 + 减去顶栏/tab/Dock 估算)。
			vh: typeof window !== 'undefined' ? window.innerHeight : 900,
			// 中间盘列的实测可用宽/高(中点盘按 min(列宽, 列高) 最大化,永不超出列的方框)。
			colW: 0,
			colH: 0,
		};
		this.unmounted = false;
		this._measure = this._measure.bind(this);
		this.requestNatalTnp = this.requestNatalTnp.bind(this);
		this.requestTransit = this.requestTransit.bind(this);
		this.onReadout = this.onReadout.bind(this);
		this.onSaArc = this.onSaArc.bind(this);
		this._onResize = this._onResize.bind(this);
		if (this.props.hook) this.props.hook.fun = () => { if (!this.unmounted) { this.requestNatalTnp(); if (this.state.showTransit) this.requestTransit(); this._measure(); } };
	}

	componentDidMount(){
		this.unmounted = false;
		this.requestNatalTnp();
		if (this.state.showTransit) this.requestTransit();
		if (typeof window !== 'undefined') window.addEventListener('resize', this._onResize);
		// 监听中间盘列尺寸变化(含 tab 由隐藏→显示时 0→真实尺寸),据此最大化盘 size。
		if (typeof ResizeObserver !== 'undefined' && this._host){
			this._ro = new ResizeObserver(() => this._measure());
			this._ro.observe(this._host);
		}
		this._measure();
	}
	componentWillUnmount(){
		this.unmounted = true;
		if (typeof window !== 'undefined') window.removeEventListener('resize', this._onResize);
		if (this._ro){ try { this._ro.disconnect(); } catch (e) { /* noop */ } this._ro = null; }
	}
	_onResize(){ if (!this.unmounted) { this.setState({ vh: window.innerHeight }); this._measure(); } }
	// 实测中间盘列的内容框宽/高(列为 grid 居中 + overflow:hidden,故按其 client 尺寸取 min 即「方框内最大」)。
	_measure(){
		if (this.unmounted || !this._host) return;
		const col = this._host.querySelector('.horosa-midpoint-chart-col');
		if (!col) return;
		const w = col.clientWidth, h = col.clientHeight;
		if (w > 0 && h > 0 && (Math.abs(w - this.state.colW) > 2 || Math.abs(h - this.state.colH) > 2)) this.setState({ colW: w, colH: h });
	}
	componentDidUpdate(prev, prevState){
		if (prev.fields !== this.props.fields) {
			// 改本命 → 拨回默认地点(null=同本命),否则用旧本命的覆盖坐标算新本命的行运,误导。
			this.setState({ saArcDirected: 0, saAge: 0, transitLat: null, transitLon: null, saLat: null, saLon: null });
			this.requestNatalTnp();
			if (this.state.showTransit) this.requestTransit();
		}
		// TNP 关 → 即时裁剪现有 readout(否则上次拖动留下的 TNP 行还在;中点树由 render 即时重算,无需处理)。
		if (prevState && prevState.showTnp !== this.state.showTnp && !this.state.showTnp){
			const isTnp = (id) => AstroText.isUranian(id) && id !== AstroConst.ARIES_POINT;
			const filtered = (this.state.readout || []).filter((h) => {
				if (h.kind === 'body') return !isTnp(h.id);
				return !isTnp(h.a) && !isTnp(h.b);
			});
			if (filtered.length !== (this.state.readout || []).length) this.setState({ readout: filtered });
		}
	}
	toggleSolarArc(v){ this.saveDisp({ showSolarArc: v }); }

	async requestNatalTnp(){
		const params = fieldsToParams(this.props.fields);
		const perr = dialParamsError(params);
		if (perr) { if (!this.unmounted) this.setState({ dataNote: perr }); return; }
		if (!this.unmounted && this.state.dataNote) this.setState({ dataNote: null });
		try {
			const data = await request(`${Constants.ServerRoot}/germany/midpoint`, { body: JSON.stringify(params), silent: true });
			const result = data && data[Constants.ResultKey] ? data[Constants.ResultKey] : null;
			if (!this.unmounted && result && Array.isArray(result.tnp)) this.setState({ natalTnp: result.tnp });
		} catch (e) { /* 静默 */ }
	}

	async requestTransit(){
		const base = fieldsToParams(this.props.fields);
		if (dialParamsError(base)) return; // 缺出生地经纬度等 → 不发 transit /chart，避免 param error 提示
		// 行运时刻可调：state.transitTime(moment)优先，否则此刻。
		const tt = this.state.transitTime;
		const dstr = tt ? tt.format('YYYY/MM/DD') : (() => { const n = new Date(); return `${n.getFullYear()}/${pad(n.getMonth() + 1)}/${pad(n.getDate())}`; })();
		const tstr = tt ? tt.format('HH:mm:ss') : (() => { const n = new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}:00`; })();
		// 行运地点可调：null=同本命；显式数字才覆盖（relocated transit）。
		const overrideLat = this.state.transitLat, overrideLon = this.state.transitLon;
		const loc = (overrideLat != null && overrideLon != null) ? { lat: overrideLat, lon: overrideLon, gpsLat: overrideLat, gpsLon: overrideLon } : {};
		const params = { ...base, ...loc, date: dstr, time: tstr };
		try {
			const [chartData, mpData] = await Promise.all([
				request(`${Constants.ServerRoot}/chart`, { body: JSON.stringify({ ...params, cid: null }), silent: true }),
				request(`${Constants.ServerRoot}/germany/midpoint`, { body: JSON.stringify(params), silent: true }),
			]);
			const chartObj = chartData && chartData[Constants.ResultKey] ? chartData[Constants.ResultKey] : null;
			const mp = mpData && mpData[Constants.ResultKey] ? mpData[Constants.ResultKey] : null;
			const pts = chartToPoints(chartObj);
			// TNP 透传(过滤交给 buildRings 统一裁剪,避免开关时还需重发请求);带 lonspeed 供逆行标记。
			if (mp && Array.isArray(mp.tnp)) mp.tnp.forEach((t) => pts.push({ id: t.id, lon: t.lon, speed: Number.isFinite(Number(t.lonspeed)) ? Number(t.lonspeed) : null }));
			if (!this.unmounted) this.setState({ transitPoints: pts });
		} catch (e) { /* 静默 */ }
	}

	natalPoints(){
		const pts = chartToPoints(this.props.chart);
		// 全量入 + filterByTnp 在出口处裁剪,这样 TNP 开关切换无需重发后端请求,即时反映。
		(this.state.natalTnp || []).forEach((t) => pts.push({ id: t.id, lon: t.lon, speed: Number.isFinite(Number(t.lonspeed)) ? Number(t.lonspeed) : null }));
		pts.push({ id: AstroConst.ARIES_POINT, lon: 0 }); // 白羊点/世界轴 = 0°（=AR 对称图）
		return filterByTnp(pts, this.state.showTnp);
	}

	// 真太阳弧：SA = λ_Sun(出生 + age 年) − λ_Sun(出生)，1 历日 = 1 年（spec §7.1，推荐默认）。
	async requestSolarArc(){
		const base = fieldsToParams(this.props.fields);
		const natalSun = sunLon(this.props.chart);
		const birth = this.props.fields && this.props.fields.date ? this.props.fields.date.value : null;
		const ms = birthEpochMs(birth);
		if (dialParamsError(base) || natalSun == null || !Number.isFinite(ms)) return;
		const ageYears = (Date.now() - ms) / (86400000 * 365.2422);
		const d = new Date(ms + ageYears * 86400000); // 出生 + age 日（1日=1年二次推进）
		const overrideLat = this.state.saLat, overrideLon = this.state.saLon;
		const loc = (overrideLat != null && overrideLon != null) ? { lat: overrideLat, lon: overrideLon, gpsLat: overrideLat, gpsLon: overrideLon } : {};
		const params = { ...base, ...loc, date: `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` };
		try {
			const chartData = await request(`${Constants.ServerRoot}/chart`, { body: JSON.stringify({ ...params, cid: null }), silent: true });
			const co = chartData && chartData[Constants.ResultKey] ? chartData[Constants.ResultKey] : null;
			const progSun = sunLon(co);
			if (progSun != null && !this.unmounted) this.setState({ saArcDeg: (((progSun - natalSun) % 360) + 360) % 360 });
		} catch (e) { /* 退回近似 */ }
	}

	solarArcDeg(){
		if (this.state.saArcDeg != null) return this.state.saArcDeg; // 真太阳弧
		try {
			const birth = this.props.fields && this.props.fields.date ? this.props.fields.date.value : null;
			const ms = birthEpochMs(birth);
			if (!Number.isFinite(ms)) return 0;
			const days = (Date.now() - ms) / 86400000;
			return Math.max(0, days / 365.2422 * 0.9856473); // 退回 Naibod 近似
		} catch (e) { return 0; }
	}

	buildRings(){
		const natalPts = this.natalPoints();
		const rings = [{ key: 'natal', label: '本命', points: natalPts }];
		if (this.state.showTransit && this.state.transitPoints) {
			rings.push({ key: 'transit', label: '行运', points: filterByTnp(this.state.transitPoints, this.state.showTnp) });
		}
		// 太阳弧=交互式向运盘：初始贴本命(不预移)，拖动该环=向运,环旋转量即定向弧→反推年龄(见 onSaArc)。
		if (this.state.showSolarArc) {
			rings.push({ key: 'solararc', label: '太阳弧', points: natalPts });
		}
		return rings;
	}

	onReadout(readout){ this.setState({ readout }); }
	// 太阳弧环被拖动 → 报告定向弧(黄道度)；按 SA key 反推对应年龄。
	onSaArc(arc){
		const a = ((Number(arc) % 360) + 360) % 360;
		const rate = this.state.saKey === 'oneDeg' ? 1.0 : 0.9856473354; // 1°/年 或 Naibod
		this.setState({ saArcDirected: a, saAge: a / rate });
	}

	saveDisp(patch){ this.setState(patch); saveUranianDisplay(patch); }
	toggleTransit(v){ this.saveDisp({ showTransit: v }); if (v) this.requestTransit(); }

	buildTreeData(tree){
		return Object.keys(tree).map((pid) => ({
			title: (<span><b>{glyphOf(pid)}</b> <span style={{ color: 'var(--horosa-text-soft)', fontSize: 11 }}>· {tree[pid].length} 组</span></span>),
			key: pid,
			children: tree[pid].map((r, i) => ({
				title: (<span>{glyphOf(r.a)} <span style={{ color: 'var(--horosa-text-soft)' }}>/</span> {glyphOf(r.b)} <span style={{ color: 'var(--horosa-text-soft)', fontSize: 11 }}>- {r.sep.toFixed(2)}°</span></span>),
				key: pid + '_' + i, isLeaf: true,
			})),
		}));
	}

	// 三层叠盘信息（本命/行运/太阳弧）——让用户清楚每环是什么、对应何时。
	// 验收口径(2026-06-02):太阳弧 info 文案精简到只剩用户关心的弧度+年龄,避免左栏被截断。
	layerRows(){
		const f = this.props.fields || {};
		const fmtF = (k, p) => { const v = f[k] && f[k].value; return (v && v.format) ? v.format(p) : '—'; };
		const birthText = `${fmtF('date', 'YYYY-MM-DD')} ${fmtF('time', 'HH:mm')}`.trim();
		const now = new Date();
		const nowText = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
		const transitText = this.state.transitTime ? this.state.transitTime.format('YYYY-MM-DD HH:mm') : `此刻 ${nowText}`;
		const saArc = this.state.saArcDirected || 0;
		const saAge = this.state.saAge || 0;
		const saKeyLabel = this.state.saKey === 'oneDeg' ? '1°/年' : 'Naibod';
		return [
			{ key: 'natal', label: '本命', dot: '#5b6470', info: `出生 ${birthText}`, locked: true, on: true },
			{ key: 'transit', label: '行运', dot: '#c0392b', info: transitText, on: this.state.showTransit, toggle: (v) => this.toggleTransit(v) },
			{ key: 'solararc', label: '太阳弧', dot: '#1f7a5a', info: `弧 ${saArc.toFixed(1)}° → 约 ${saAge.toFixed(1)} 岁（${saKeyLabel}）`, on: this.state.showSolarArc, toggle: (v) => this.toggleSolarArc(v) },
		];
	}

	renderDial(size, rings){
		const common = {
			rings, base: this.state.dialBase, orb: this.state.orb,
			showTnp: this.state.showTnp, size, onCursorChange: this.onReadout, onSaArc: this.onSaArc,
			personal: PERSONAL_POINTS, onlyPersonal: this.state.onlyPersonal,
			showAntiscia: this.state.showAntiscia,
		};
		return this.state.dialStyle === 'modulus'
			? <UranianModulusDial {...common} />
			: <UranianDial {...common} />;
	}

	// 行运/SA 地点输入框（占位=本命的 lat/lon）。空=用本命；填数=覆盖。
	renderLocOverride(latKey, lonKey, onCommit){
		const natalLat = fv(this.props.fields, 'lat');
		const natalLon = fv(this.props.fields, 'lon');
		const set = (k) => (v) => { this.setState({ [k]: parseNum(v) }, () => { if (onCommit) onCommit(); }); };
		const cell = { display: 'inline-block', width: 'calc(50% - 4px)' };
		const headStyle = { fontSize: 11, color: 'var(--horosa-text-soft)', marginBottom: 3 };
		return (
			<div>
				<div style={headStyle}>地点（空=同本命）</div>
				<div style={{ display: 'flex', gap: 8 }}>
					<div style={cell}>
						<InputNumber size="small" placeholder={natalLat != null ? `${natalLat}` : '纬度'} value={this.state[latKey]}
							onChange={set(latKey)} step={0.001} style={{ width: '100%' }} controls={false} />
					</div>
					<div style={cell}>
						<InputNumber size="small" placeholder={natalLon != null ? `${natalLon}` : '经度'} value={this.state[lonKey]}
							onChange={set(lonKey)} step={0.001} style={{ width: '100%' }} controls={false} />
					</div>
				</div>
			</div>
		);
	}

	render(){
		const height = this.props.height ? this.props.height : 760;
		const rings = this.buildRings();
		const natalPts = rings[0].points;
		// 中间盘 size:按实测「中间列」的内容框最大化——取列宽、列高(减盘下 24 padding)较小者,填满方框且永不超出被裁。
		// 列尺寸由 _measure(ResizeObserver)实测;未测得时用 viewport 估算兜底;vh-140 为防底部 Dock 的二级兜底。
		const vh = this.state.vh || 900;
		const fbColW = Math.round((typeof window !== 'undefined' ? window.innerWidth : 1280) * 0.56);
		const colW = this.state.colW || fbColW;
		const colH = this.state.colH || (vh - 240);
		const size = Math.max(420, Math.min(colW - 8, colH - 28, vh - 140));
		// 左右栏滚动 maxHeight:与盘同步,且至少 380(再小就让用户内部滚动);overflowY:auto 即可独立下滑,
		// 修「窗口过小时左/右栏被遮挡且无法下滑」(用户验收口径)。inner div 须 width:100% 否则收缩 h=0。
		const sideMaxH = Math.max(380, vh - 220);
		// 中点树仅本命点(同 §11);TNP 过滤已在 natalPoints() 入口完成。
		const treeOpts = { personal: PERSONAL_POINTS, onlyPersonal: this.state.onlyPersonal };
		const tree = this.state.showPicture ? midpointTree(natalPts, this.state.dialBase, this.state.orb, treeOpts) : {};
		// 行星图(A+B−C=D)/中点列表/映点接触:都在本命点集上算(锚点=个人点∪TNP,排序同优先级)。
		const scanOpts = { personal: PERSONAL_POINTS, uranian: URANIAN_SET };
		const pictures = this.state.showPlanetPicture ? planetaryPictures(natalPts, this.state.dialBase, this.state.orb, { ...scanOpts, limit: 40 }) : [];
		const mpList = this.state.showMidpointList ? midpointList(natalPts, this.state.dialBase, scanOpts) : [];
		const spiegel = this.state.showAntiscia ? spiegelContacts(natalPts, this.state.dialBase, this.state.orb, scanOpts) : [];
		const ringTone = { 本命: 'var(--horosa-text-strong, currentColor)', 行运: '#c0392b', 太阳弧: '#1f7a5a' };
		const cardProps = { size: 'small', bordered: true, className: 'horosa-uranian-card', headStyle: { fontSize: 13, fontWeight: 600, minHeight: 34, padding: '0 12px' }, bodyStyle: { padding: '10px 12px' }, style: { marginBottom: 10 } };
		const rowSty = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
		const layers = this.layerRows();

		const settings = (
			<div style={{ width: '100%' }}>
				<Card {...cardProps} title="盘式与盘基">
					<Radio.Group size="small" value={this.state.dialStyle} onChange={(e) => this.saveDisp({ dialStyle: e.target.value })} style={{ width: '100%', marginBottom: 10 }}>
						<Radio.Button value="folded" style={{ width: '50%', textAlign: 'center' }}>折叠盘</Radio.Button>
						<Radio.Button value="modulus" style={{ width: '50%', textAlign: 'center' }}>多环模数盘</Radio.Button>
					</Radio.Group>
					<div style={{ color: 'var(--horosa-text-soft)', fontSize: 12, marginBottom: 4 }}>盘基（模数）</div>
					<Select value={this.state.dialBase} onChange={(v) => this.saveDisp({ dialBase: Number(v) })} style={{ width: '100%' }} size="small">
						{URANIAN_DIAL_BASES.map((b) => <Option key={b} value={b}>{dialBaseLabel(b)} 盘</Option>)}
					</Select>
					{/* 常用盘基快捷:90°(H4 默认)/45°(H8 宇宙生物学)/22.5°(H16)。 */}
					<div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
						{QUICK_BASES.map((b) => (
							<button key={b} type="button" onClick={() => this.saveDisp({ dialBase: b })}
								style={{ flex: 1, fontSize: 11, padding: '2px 0', cursor: 'pointer', borderRadius: 4,
									border: '1px solid var(--horosa-border-soft, rgba(0,0,0,0.12))',
									background: this.state.dialBase === b ? 'var(--horosa-accent-soft, rgba(91,100,112,0.16))' : 'transparent',
									color: 'inherit', fontWeight: this.state.dialBase === b ? 600 : 400 }}>
								{dialBaseLabel(b)}
							</button>
						))}
					</div>
				</Card>

				<Card {...cardProps} title="叠盘层（除本命外可拖动）">
					{layers.map((L) => (
						<div key={L.key} style={{ ...rowSty, padding: '5px 0', borderBottom: L.key !== 'solararc' ? '1px solid var(--horosa-border-soft, rgba(0,0,0,0.04))' : 'none' }}>
							<div style={{ minWidth: 0, flex: 1 }}>
								<div><span style={{ color: L.dot, marginRight: 5 }}>●</span><b>{L.label}</b>{L.locked ? <span style={{ color: 'var(--horosa-text-soft)', fontSize: 11 }}> · 锁定</span> : null}</div>
								{/* 不截断:换行而非省略号(用户验收口径)。 */}
								<div style={{ color: 'var(--horosa-text-soft)', fontSize: 11, marginLeft: 16, wordBreak: 'break-word', whiteSpace: 'normal' }}>{L.info}</div>
							</div>
							{L.locked ? <span style={{ color: 'var(--horosa-text-soft)', fontSize: 11 }}>内圈</span> : <Switch size="small" checked={L.on} onChange={L.toggle} />}
						</div>
					))}
					{this.state.showTransit ? (
						<div style={{ marginTop: 8 }}>
							<div style={{ fontSize: 11, color: 'var(--horosa-text-soft)', marginBottom: 3 }}>行运时刻</div>
							<DatePicker size="small" showTime format="YYYY-MM-DD HH:mm" value={this.state.transitTime}
								placeholder="此刻" style={{ width: '100%' }}
								onChange={(v) => this.setState({ transitTime: v }, () => this.requestTransit())} />
							<div style={{ marginTop: 6 }}>{this.renderLocOverride('transitLat', 'transitLon', () => this.requestTransit())}</div>
						</div>
					) : null}
					{this.state.showSolarArc ? (
						<div style={{ marginTop: 10 }}>
							<div style={rowSty}>
								<span style={{ fontSize: 11, color: 'var(--horosa-text-soft)' }}>太阳弧换算</span>
								<Radio.Group size="small" value={this.state.saKey} onChange={(e) => { const k = e.target.value; this.saveDisp({ saKey: k }); const rate = k === 'oneDeg' ? 1.0 : 0.9856473354; this.setState({ saAge: (this.state.saArcDirected || 0) / rate }); }}>
									<Radio.Button value="naibod">Naibod</Radio.Button>
									<Radio.Button value="oneDeg">1°/年</Radio.Button>
								</Radio.Group>
							</div>
							<div style={{ marginTop: 6 }}>{this.renderLocOverride('saLat', 'saLon')}</div>
						</div>
					) : null}
				</Card>

				<Card {...cardProps} title="显示与读数">
					<div style={{ ...rowSty, marginBottom: 8 }}><span>TNP 虚星</span><Switch size="small" checked={this.state.showTnp} onChange={(v) => this.saveDisp({ showTnp: v })} /></div>
					<div style={{ ...rowSty, marginBottom: 8 }}><span>中点树扫描</span><Switch size="small" checked={this.state.showPicture} onChange={(v) => this.saveDisp({ showPicture: v })} /></div>
					<div style={{ ...rowSty, marginBottom: 8 }}><span>仅含个人点</span><Switch size="small" checked={this.state.onlyPersonal} onChange={(v) => this.saveDisp({ onlyPersonal: v })} /></div>
					<div style={{ ...rowSty, marginBottom: 8 }}><span>行星图解算 <span style={{ color: 'var(--horosa-text-soft)', fontSize: 11 }}>A+B−C=D</span></span><Switch size="small" checked={this.state.showPlanetPicture} onChange={(v) => this.saveDisp({ showPlanetPicture: v })} /></div>
					<div style={{ ...rowSty, marginBottom: 8 }}><span>中点列表</span><Switch size="small" checked={this.state.showMidpointList} onChange={(v) => this.saveDisp({ showMidpointList: v })} /></div>
					<div style={{ ...rowSty, marginBottom: 10 }}><span>映点 <span style={{ color: 'var(--horosa-text-soft)', fontSize: 11 }}>Spiegelpunkt</span></span><Switch size="small" checked={this.state.showAntiscia} onChange={(v) => this.saveDisp({ showAntiscia: v })} /></div>
					<div style={{ marginBottom: 2, fontSize: 12 }}>容许度 <b>{this.state.orb}°</b></div>
					<Slider min={0.5} max={3} step={0.5} value={this.state.orb} onChange={(v) => this.saveDisp({ orb: v })} />
				</Card>
			</div>
		);

		// 指针读数:用短横线 '-' 标距(原希腊符像三角不友好);单行 nowrap 防换行;TNP 过滤已在源头完成(natalPoints/transit),此处直接信任。
		const readoutBody = this.state.readout.length === 0
			? <div style={{ color: 'var(--horosa-text-soft)', fontSize: 12 }}>拖动行运/太阳弧环或红指针，对齐处的星体/中点会列在这里。</div>
			: this.state.readout.slice(0, 60).map((h, i) => (
				<div key={i} style={{ lineHeight: 2.0, fontSize: 13, whiteSpace: 'nowrap' }}>
					{rings.length > 1 ? <span style={{ color: ringTone[h.ring] || 'var(--horosa-text-soft)', fontSize: 11, fontWeight: 600 }}>[{h.ring}] </span> : null}
					{h.kind === 'body'
						? <span>轴 = <b>{glyphOf(h.id)}</b> <span style={{ color: 'var(--horosa-text-soft)' }}>- {h.sep.toFixed(2)}°</span></span>
						: <span>轴 = {glyphOf(h.a)}<span style={{ color: 'var(--horosa-text-soft)' }}>/</span>{glyphOf(h.b)} <span style={{ color: 'var(--horosa-text-soft)' }}>- {h.sep.toFixed(2)}°</span></span>}
				</div>
			));

		const treeData = this.buildTreeData(tree);
		const treeBody = treeData.length === 0
			? <div style={{ color: 'var(--horosa-text-soft)', fontSize: 12 }}>容许度内暂无中点结构</div>
			: <Tree treeData={treeData} showLine={{ showLeafIcon: false }} blockNode selectable={false} defaultExpandedKeys={treeData.slice(0, 3).map((n) => n.key)} />;

		const rowLine = { lineHeight: 1.9, fontSize: 13, whiteSpace: 'nowrap' };
		const soft = { color: 'var(--horosa-text-soft)' };
		const empty = (t) => <div style={{ color: 'var(--horosa-text-soft)', fontSize: 12 }}>{t}</div>;
		// 行星图 A+B−C=D:个人点/TNP 锚点,命中目标 D 高亮。
		const pictureBody = pictures.length === 0 ? empty('容许度内暂无行星图')
			: pictures.map((p, i) => (
				<div key={i} style={rowLine}>
					{glyphOf(p.a)}<span style={soft}> + </span>{glyphOf(p.b)}<span style={soft}> − </span>{glyphOf(p.c)}<span style={soft}> = </span><b>{glyphOf(p.d)}</b><span style={soft}> · {p.sep.toFixed(2)}°</span>
				</div>
			));
		// 中点扁平列表(含个人点 > TNP > 其他):显中点黄经位。
		const mpListBody = mpList.length === 0 ? empty('暂无中点')
			: mpList.slice(0, 150).map((m, i) => (
				<div key={i} style={rowLine}>
					{glyphOf(m.a)}<span style={soft}>/</span>{glyphOf(m.b)}<span style={soft}> · {m.lon.toFixed(2)}°</span>
				</div>
			));
		// 映点 Spiegelpunkt 接触对。
		const spiegelBody = spiegel.length === 0 ? empty('容许度内暂无映点接触')
			: spiegel.map((s, i) => (
				<div key={i} style={rowLine}>
					{glyphOf(s.a)}<span style={soft}> ⟷ </span>{glyphOf(s.b)}<span style={soft}> · {s.sep.toFixed(2)}°</span>
				</div>
			));
		// 右栏:可收放卡片(antd Collapse),头部左为标题/副标、右为数量徽标;展开项持久化 openPanels。
		const hdr = (title, sub, n) => (
			<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
				<span style={{ fontWeight: 600, fontSize: 13 }}>{title}{sub ? <span style={{ ...soft, fontSize: 11, fontWeight: 400, marginLeft: 5 }}>{sub}</span> : null}</span>
				{n != null ? <span className="horosa-panel-count">{n}</span> : null}
			</span>
		);
		const panelDefs = [
			{ key: 'readout', header: hdr('指针读数', null, this.state.readout.length || null), body: readoutBody, mh: 0.5 },
			{ key: 'tree', header: hdr('中点树', null, treeData.length || null), body: treeBody, mh: 0.42 },
			this.state.showPlanetPicture && { key: 'pic', header: hdr('行星图', 'A+B−C=D', pictures.length), body: pictureBody, mh: 0.4 },
			this.state.showMidpointList && { key: 'list', header: hdr('中点列表', null, mpList.length), body: mpListBody, mh: 0.4 },
			this.state.showAntiscia && { key: 'spiegel', header: hdr('映点', 'Spiegelpunkt', spiegel.length), body: spiegelBody, mh: 0.36 },
		].filter(Boolean);
		const openKeys = Array.isArray(this.state.openPanels) ? this.state.openPanels : ['readout', 'tree', 'pic', 'list', 'spiegel'];
		const rightCol = (
			<Collapse className="horosa-uranian-panels" activeKey={openKeys}
				onChange={(keys) => this.saveDisp({ openPanels: Array.isArray(keys) ? keys : [keys] })}>
				{panelDefs.map((p) => (
					<Collapse.Panel key={p.key} header={p.header}>
						<div style={{ maxHeight: Math.round(size * p.mh), overflowY: 'auto', overflowX: 'auto' }}>{p.body}</div>
					</Collapse.Panel>
				))}
			</Collapse>
		);

		// 列宽:左 4 / 中 16 / 右 4 = 24(从 4/17/3 调整;右栏 +1 防换行,中栏只 -1 仍占主体)。
		// 左右两个 Col 用内层 div 套 maxHeight+overflowY:auto;盘 col 也加底部 paddingBottom 防 Dock 遮挡。
		const sideScroll = { width: '100%', maxHeight: sideMaxH, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4 };
		return (
			<div className="horosa-midpoint-host" ref={(el) => { this._host = el; }}>
				<div className="horosa-midpoint-workbench">
					<Row className="horosa-midpoint-layout" gutter={10}>
						<Col span={4} className="horosa-midpoint-side-col"><div style={sideScroll}>{settings}</div></Col>
						<Col span={16} className="horosa-midpoint-chart-col">
							{natalPts.length === 0 ? (
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: size, color: 'var(--horosa-text-soft)', textAlign: 'center', padding: 24 }}>
									{this.state.dataNote || '请先排出本命盘后查看中点盘'}
								</div>
							) : (
								<div style={{ paddingBottom: 24 }}>
									{this.renderDial(size, rings)}
									{this.state.dataNote ? (
										<div style={{ textAlign: 'center', color: 'var(--horosa-text-soft)', fontSize: 12, marginTop: 6 }}>
											{this.state.dataNote}（TNP/行运/太阳弧 需完整出生信息）
										</div>
									) : null}
								</div>
							)}
						</Col>
						<Col span={4} className="horosa-midpoint-side-col"><div style={sideScroll}>{rightCol}</div></Col>
					</Row>
				</div>
			</div>
		);
	}
}
