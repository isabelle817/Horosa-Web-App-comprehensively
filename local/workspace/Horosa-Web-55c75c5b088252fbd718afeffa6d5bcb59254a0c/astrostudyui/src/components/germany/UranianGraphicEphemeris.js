import { Component } from 'react';
import moment from 'moment';
import { DatePicker, Radio, Spin, Empty, Checkbox } from 'antd';
import request from '../../utils/request';
import * as Constants from '../../utils/constants';
import * as AstroConst from '../../constants/AstroConst';
import * as AstroText from '../../constants/AstroText';

const { RangePicker } = DatePicker;

// 汉堡/宇宙生物学「图形星历」(graphic ephemeris):X=时间、Y=黄经折叠到盘基(90°/45°)。
// 行运行星折叠后随时间画成斜线(快星呈锯齿),本命点为水平参考线;两者相交≈该折叠相位(0/90/180/270)应期。
// 数据复用现成 /astroextra/ephemeris 的 dailyPositions(逐日黄经,后端封 Swiss Ephemeris),折叠纯前端算,改盘基即时重折叠不重取。

// 默认行运行星:日 + 火 + 木土天海冥(月太快,90°盘约每 7.5 天绕一圈,默认不画;可勾选)。
const DEFAULT_PLANETS = [
	AstroConst.SUN, AstroConst.MARS, AstroConst.JUPITER, AstroConst.SATURN,
	AstroConst.URANUS, AstroConst.NEPTUNE, AstroConst.PLUTO,
];
// 本命参考线:行星 + 南北交 + Asc/MC + 白羊点(TNP 移动极慢,作参考线意义小,v1 不画)。
const NATAL_LINE_IDS = new Set([
	AstroConst.SUN, AstroConst.MOON, AstroConst.MERCURY, AstroConst.VENUS, AstroConst.MARS,
	AstroConst.JUPITER, AstroConst.SATURN, AstroConst.URANUS, AstroConst.NEPTUNE, AstroConst.PLUTO,
	AstroConst.NORTH_NODE, AstroConst.SOUTH_NODE, AstroConst.ASC, AstroConst.MC,
]);

const fold = (lon, base) => (((Number(lon) % base) + base) % base);
const fv = (fields, key) => { const f = fields && fields[key]; return f ? f.value : undefined; };
const fmt = (val, pattern) => ((val && typeof val.format === 'function') ? val.format(pattern) : undefined);

function fieldsToBase(fields){
	if (!fields) return null;
	return {
		date: fmt(fv(fields, 'date'), 'YYYY/MM/DD'), time: fmt(fv(fields, 'time'), 'HH:mm:ss'),
		zone: fv(fields, 'zone'), lat: fv(fields, 'lat'), lon: fv(fields, 'lon'),
		gpsLat: fv(fields, 'gpsLat'), gpsLon: fv(fields, 'gpsLon'),
		hsys: fv(fields, 'hsys'), zodiacal: fv(fields, 'zodiacal'), siderealAyanamsa: fv(fields, 'siderealAyanamsa'),
	};
}
function paramsReady(p){
	if (!p) return false;
	return ['date', 'time', 'zone', 'lat', 'lon'].every((k) => p[k] !== undefined && p[k] !== null && `${p[k]}`.trim() !== '');
}

// 本命参考点(行星/角点/白羊点)——从已排的本命盘对象取,无需额外请求。
function natalLines(chartRoot){
	const inner = (chartRoot && chartRoot.chart) ? chartRoot.chart : (chartRoot || {});
	const out = []; const seen = new Set();
	const push = (id, lon) => { if (id && Number.isFinite(Number(lon)) && !seen.has(id)) { out.push({ id, lon: Number(lon) }); seen.add(id); } };
	(inner.objects || []).forEach((o) => { if (NATAL_LINE_IDS.has(o.id)) push(o.id, o.lon); });
	(inner.angles || []).forEach((o) => { if (NATAL_LINE_IDS.has(o.id)) push(o.id, o.lon); });
	push(AstroConst.ARIES_POINT, 0);
	return out;
}

function planetGlyph(id, color, size){
	const tnp = AstroText.isUranian(id) && id !== AstroConst.ARIES_POINT;
	if (tnp) return <tspan style={{ fontWeight: 600 }}>{AstroText.uranianGlyph(id)}</tspan>;
	const ch = id === AstroConst.ARIES_POINT ? AstroText.AstroMsg[AstroConst.ARIES] : AstroText.AstroMsg[id];
	if (ch) return <tspan style={{ fontFamily: AstroConst.AstroChartFont }} fill={color}>{ch}</tspan>;
	return <tspan>{AstroText.AstroMsgCN[id] || id}</tspan>;
}

export default class UranianGraphicEphemeris extends Component {
	constructor(props){
		super(props);
		const disp = (() => { try { return JSON.parse(localStorage.getItem('horosa.uranian.gephem.v1') || '{}') || {}; } catch (e) { return {}; } })();
		this.state = {
			base: disp.base === 45 ? 45 : 90,
			includeMoon: !!disp.includeMoon,
			start: moment().startOf('day'),
			end: moment().add(364, 'days').startOf('day'),
			rows: null,
			loading: false,
			note: null,
			vw: typeof window !== 'undefined' ? window.innerWidth : 1200,
			vh: typeof window !== 'undefined' ? window.innerHeight : 900,
			cw: 0, // 实测容器内宽(像素空间渲染用)
		};
		this.unmounted = false;
		this.requestData = this.requestData.bind(this);
		this._onResize = this._onResize.bind(this);
		this._measure = this._measure.bind(this);
		if (this.props.hook) this.props.hook.fun = () => { if (!this.unmounted) this.requestData(); };
	}
	componentDidMount(){ this.unmounted = false; this.requestData(); this._measure(); if (typeof window !== 'undefined') window.addEventListener('resize', this._onResize); }
	componentWillUnmount(){ this.unmounted = true; if (typeof window !== 'undefined') window.removeEventListener('resize', this._onResize); }
	componentDidUpdate(prev){ if (prev.fields !== this.props.fields) this.requestData(); this._measure(); }
	_onResize(){ if (!this.unmounted) { this.setState({ vw: window.innerWidth, vh: window.innerHeight }); this._measure(); } }
	_measure(){ if (this.unmounted || !this._wrap) return; const w = this._wrap.clientWidth - 16; if (w > 0 && Math.abs(w - this.state.cw) > 2) this.setState({ cw: w }); }

	saveDisp(patch, cb){ this.setState(patch, cb); try { const cur = JSON.parse(localStorage.getItem('horosa.uranian.gephem.v1') || '{}') || {}; localStorage.setItem('horosa.uranian.gephem.v1', JSON.stringify({ ...cur, ...patch })); } catch (e) { /* noop */ } }

	planetSet(){ return this.state.includeMoon ? [AstroConst.MOON, ...DEFAULT_PLANETS] : DEFAULT_PLANETS; }

	async requestData(){
		const base = fieldsToBase(this.props.fields);
		if (!paramsReady(base)) { if (!this.unmounted) this.setState({ note: '请先完善出生信息后查看图形星历', rows: null }); return; }
		// 后端 dailyPositions 上限 ~370 天;范围超限则截断并提示。
		let s = this.state.start, e = this.state.end;
		if (e.diff(s, 'days') > 366) { e = s.clone().add(366, 'days'); }
		const params = {
			...base,
			startDate: s.format('YYYY/MM/DD'), endDate: e.format('YYYY/MM/DD'),
			startTime: '00:00:00', endTime: '00:00:00',
			planets: this.planetSet(), includeTransits: false,
		};
		this.setState({ loading: true, note: null });
		try {
			const data = await request(`${Constants.ServerRoot}/astroextra/ephemeris`, { body: JSON.stringify(params), silent: true });
			const res = data && data[Constants.ResultKey] ? data[Constants.ResultKey] : null;
			const rows = res && Array.isArray(res.dailyPositions) ? res.dailyPositions : [];
			if (!this.unmounted) this.setState({ rows, loading: false, note: rows.length ? null : '该区间无星历数据' });
		} catch (err) { if (!this.unmounted) this.setState({ loading: false, note: '星历获取失败' }); }
	}

	render(){
		const height = this.props.height ? this.props.height : 720;
		const base = this.state.base;
		const rows = this.state.rows || [];
		const planets = this.planetSet();
		const nat = natalLines(this.props.chart);

		// 像素空间渲染(viewBox=像素,width/height=同值像素 → 1:1 不拉伸字形)。
		// 宽=实测容器内宽;高=按 viewport 钳位(vh-240)+ 父高(height-78),防被底部 Dock 遮/超出页面。
		const vh = this.state.vh || 900;
		const W = Math.max(680, Math.round(this.state.cw || ((this.state.vw || 1280) - 220)));
		// 高度:占满分配高度(减去顶部控件行 + 底部说明行),并以 vh 兜底防底部 Dock 遮挡(对齐中点盘口径)。
		const H = Math.max(340, Math.round(Math.min(height - 66, vh - 286)));
		const mL = 46, mR = 64, mT = 14, mB = 30; // 右留双列字形(本命内列 / 行运外列)
		const plotW = W - mL - mR, plotH = H - mT - mB;
		const n = rows.length;
		const xAt = (i) => mL + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
		const yAt = (f) => mT + (f / base) * plotH;

		// 行运折线:每星折叠后按日连线,跨 0/base 边界(相邻样本差 > base/2)断开重接。
		const series = planets.map((pid) => {
			const color = AstroConst.AstroColor[pid] || '#888';
			const segs = []; let cur = [];
			for (let i = 0; i < n; i++){
				const pos = rows[i].positions && rows[i].positions[pid];
				if (!pos || !Number.isFinite(Number(pos.lon))) { if (cur.length) { segs.push(cur); cur = []; } continue; }
				const f = fold(pos.lon, base);
				if (cur.length){ const prevF = cur[cur.length - 1].f; if (Math.abs(f - prevF) > base / 2) { segs.push(cur); cur = []; } }
				cur.push({ x: xAt(i), y: yAt(f), f });
			}
			if (cur.length) segs.push(cur);
			const d = segs.map((seg) => seg.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')).join(' ');
			const last = rows[n - 1] && rows[n - 1].positions && rows[n - 1].positions[pid];
			return { pid, color, d, endY: last ? yAt(fold(last.lon, base)) : null };
		});

		// 月份竖网格 + 标签。
		const monthMarks = [];
		let lastMonth = null;
		for (let i = 0; i < n; i++){
			const ym = (rows[i].date || '').slice(0, 7); // 'YYYY-MM'
			if (ym && ym !== lastMonth){ lastMonth = ym; monthMarks.push({ x: xAt(i), label: ym.replace('-', '/') }); }
		}

		// Y 轴刻度(0..base 五等分);非整度显示一位小数(45°盘的 11.25°/33.75° 等)。
		const fmtDeg = (v) => (Number.isInteger(v) ? `${v}°` : `${v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}°`);
		const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ v: (base * t), y: yAt(base * t) }));

		// 字形标签垂直避让(本命点常折叠到相近高度 → 原全堆一起;此处按 minGap 顶开 + 连线回真位)。
		const vspread = (items, minGap, lo, hi) => {
			const s = items.slice().sort((a, b) => a.y - b.y);
			let prev = -Infinity;
			s.forEach((it) => { const g = Math.max(it.y, prev + minGap); it.labelY = g; prev = g; });
			const over = s.length ? (s[s.length - 1].labelY - hi) : 0;
			if (over > 0) s.forEach((it) => { it.labelY = Math.max(lo, it.labelY - over); });
			return s;
		};
		const softTone = 'var(--horosa-text-soft)';
		// 本命字形=内列(x=plot 右缘+6);行运字形=外列(x=+26)。各自避让,互不挤。
		const natLabels = vspread(nat.map((p) => ({ id: p.id, y: yAt(fold(p.lon, base)), color: AstroConst.AstroColor[p.id] || softTone })), 13, mT + 2, mT + plotH - 2);
		const traLabels = vspread(series.filter((s) => s.endY != null).map((s) => ({ id: s.pid, y: s.endY, color: s.color })), 13, mT + 2, mT + plotH - 2);

		const stroke = 'var(--horosa-chart-stroke, currentColor)';
		const soft = 'var(--horosa-text-soft)';

		const controls = (
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 8 }}>
				<RangePicker size="small" value={[this.state.start, this.state.end]} allowClear={false}
					onChange={(v) => { if (v && v[0] && v[1]) this.setState({ start: v[0].clone().startOf('day'), end: v[1].clone().startOf('day') }, () => this.requestData()); }} />
				<Radio.Group size="small" value={base} onChange={(e) => this.saveDisp({ base: e.target.value })}>
					<Radio.Button value={90}>90° (H4)</Radio.Button>
					<Radio.Button value={45}>45° (H8)</Radio.Button>
				</Radio.Group>
				<Checkbox checked={this.state.includeMoon} onChange={(e) => this.saveDisp({ includeMoon: e.target.checked }, this.requestData)}>含月亮</Checkbox>
				<span style={{ color: soft, fontSize: 12 }}>行运行星折叠到盘基,与本命水平线相交≈应期(最长约 366 天/次)</span>
			</div>
		);

		const natX = mL + plotW + 6;   // 本命字形内列
		const traX = mL + plotW + 26;  // 行运字形外列

		if (this.state.note){
			return <div ref={(el) => { this._wrap = el; }} className="horosa-uranian-gephem" style={{ padding: '4px 8px' }}>{controls}<Empty description={this.state.note} /></div>;
		}

		return (
			<div ref={(el) => { this._wrap = el; }} className="horosa-uranian-gephem" style={{ padding: '4px 8px' }}>
				{controls}
				<Spin spinning={this.state.loading}>
					<div style={{ width: '100%' }}>
						<svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block', maxWidth: '100%', color: stroke }}
							className="xq-chart-renderer xq-chart-renderer-astro">
							{/* 外框 */}
							<rect x={mL} y={mT} width={plotW} height={plotH} fill="none" stroke={stroke} strokeWidth="1" opacity="0.5" />
							{/* Y 网格 + 刻度 */}
							{yTicks.map((t, i) => (
								<g key={`y${i}`}>
									<line x1={mL} y1={t.y} x2={mL + plotW} y2={t.y} stroke={stroke} strokeWidth="0.6" opacity="0.18" />
									<text x={mL - 6} y={t.y} dy="0.32em" textAnchor="end" fontSize="10" fill={soft}>{fmtDeg(t.v)}</text>
								</g>
							))}
							{/* 月份竖网格 */}
							{monthMarks.map((mm, i) => (
								<g key={`m${i}`}>
									<line x1={mm.x} y1={mT} x2={mm.x} y2={mT + plotH} stroke={stroke} strokeWidth="0.5" opacity="0.12" />
									{i % 2 === 0 ? <text x={mm.x} y={mT + plotH + 16} textAnchor="middle" fontSize="9" fill={soft}>{mm.label}</text> : null}
								</g>
							))}
							{/* 本命参考线(水平虚线) */}
							{nat.map((p, i) => {
								const y = yAt(fold(p.lon, base));
								const color = AstroConst.AstroColor[p.id] || soft;
								return <line key={`n${i}`} x1={mL} y1={y} x2={mL + plotW} y2={y} stroke={color} strokeWidth="0.9" strokeDasharray="3,3" opacity="0.45" />;
							})}
							{/* 行运折线 */}
							{series.map((s, i) => (
								<path key={`s${i}`} d={s.d} fill="none" stroke={s.color} strokeWidth="1.5" opacity="0.92" />
							))}
							{/* 本命字形(内列,避让 + 连线回真位) */}
							{natLabels.map((l, i) => (
								<g key={`nl${i}`}>
									{Math.abs(l.labelY - l.y) > 1 ? <line x1={mL + plotW} y1={l.y} x2={natX - 1} y2={l.labelY} stroke={l.color} strokeWidth="0.5" opacity="0.4" /> : null}
									<text x={natX} y={l.labelY} dy="0.32em" textAnchor="start" fontSize="12" fill={l.color} opacity="0.85">{planetGlyph(l.id, l.color)}</text>
								</g>
							))}
							{/* 行运字形(外列,粗,避让 + 连线回末端) */}
							{traLabels.map((l, i) => (
								<g key={`tl${i}`}>
									{Math.abs(l.labelY - l.y) > 1 ? <line x1={mL + plotW} y1={l.y} x2={traX - 1} y2={l.labelY} stroke={l.color} strokeWidth="0.5" opacity="0.5" /> : null}
									<text x={traX} y={l.labelY} dy="0.32em" textAnchor="start" fontSize="13" fontWeight="600" fill={l.color}>{planetGlyph(l.id, l.color)}</text>
								</g>
							))}
						</svg>
					</div>
				</Spin>
				<div style={{ color: soft, fontSize: 11, marginTop: 6 }}>
					实线=行运行星(折叠盘基);虚线=本命参考。右侧内列=本命字形、外列=行运字形(均自动避让)。折叠位相交即该硬相位(0/90/180/270)触发期。月亮默认不画(过快)。
				</div>
			</div>
		);
	}
}
