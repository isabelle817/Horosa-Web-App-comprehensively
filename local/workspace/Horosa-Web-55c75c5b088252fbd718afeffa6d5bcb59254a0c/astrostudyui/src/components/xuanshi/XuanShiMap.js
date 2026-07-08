import React from 'react';
import { Spin, Empty, Input } from 'antd';
import * as d3 from 'd3';
import chinaGeo from '../../assets/china.geo.json';
import { fetchMap } from '../../services/xuanshi';

// 玄学地图 —— 忠实源 map.html:中国底图(宣纸×墨)+ 古都钉点(朱砂,半径 ∝ 活动量)+ 点击看古今名。
// china.geo.json = GeoJSON FeatureCollection(36 省 Polygon),d3.geoPath 直接渲染;period 为自由文本(593 值)→ 搜索过滤。
const W = 820, H = 620;

export default class XuanShiMap extends React.Component {
	constructor(props) {
		super(props);
		const f = (props.ui && props.ui.map) || {};
		this.state = { period: f.period || '', points: [], total: 0, loading: false, err: '', selected: null };
		// 投影 + 底图路径(只算一次);chinaGeo 可能被打包成 .default
		const CHINA = (chinaGeo && chinaGeo.features) ? chinaGeo : ((chinaGeo && chinaGeo.default) || chinaGeo);
		try {
			// 固定中国 mercator 投影(fitSize 对该 geojson 的 geoBounds 异常会压扁,改手动)
			this.projection = d3.geoMercator().center([104, 37.5]).scale(720).translate([W / 2, H / 2]);
			const proj = this.projection;
			// 手动投影建平面路径(不用 d3.geoPath:该 geojson 环绕方向不合 RFC7946,geoPath 按球面取补集→整省翻转/溢出、西藏等被误删)
			const ringPath = (ring) => {
				let s = '', started = false;
				for (const c of ring) {
					const p = proj(c);
					if (!p || isNaN(p[0]) || isNaN(p[1])) { continue; }
					s += (started ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
					started = true;
				}
				return started ? s + 'Z' : '';
			};
			const featPath = (f) => {
				const g = f.geometry; if (!g) { return ''; }
				if (g.type === 'Polygon') { return g.coordinates.map(ringPath).join(''); }
				if (g.type === 'MultiPolygon') { return g.coordinates.map((poly) => poly.map(ringPath).join('')).join(''); }
				return '';
			};
			this.basePaths = ((CHINA && CHINA.features) || []).map((f, i) => ({ d: featPath(f), key: (f.properties && f.properties.code) || f.id || i })).filter((p) => p.d);
		} catch (e) {
			this.projection = null; this.basePaths = []; this._geoErr = `${e && e.message ? e.message : e}`;
		}
	}

	componentDidMount() { this.load(); }

	persist() { if (this.props.onPersist) { this.props.onPersist('map', { period: this.state.period }); } }

	async load() {
		this.setState({ loading: true, err: '' });
		try {
			const r = await fetchMap(this.state.period || undefined);
			this.setState({ points: r.points || [], total: r.total || 0, loading: false });
		} catch (e) { this.setState({ loading: false, err: `${e && e.message ? e.message : e}` }); }
		this.persist();
	}

	setPeriod(period) { this.setState({ period, selected: null }, () => this.load()); }

	render() {
		const { points, total, loading, err, selected, period } = this.state;
		const maxCount = points.reduce((m, p) => Math.max(m, p.count || 0), 1);
		const radius = (c) => 3 + 17 * Math.sqrt((c || 0) / maxCount);
		return (
			<div>
				<div className="xuanshi-eyebrow">玄学地图</div>
				<h2 className="xuanshi-display is-h2" style={{ marginTop: 6 }}>古都钉点 · 活动中心</h2>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '14px 0' }}>
					<Input.Search placeholder="朝代 / 时期(如 唐 · 西汉武帝),空=全部" allowClear size="small" style={{ width: 280 }}
						defaultValue={period} onSearch={(v) => this.setPeriod(v || '')} />
					<span className="xuanshi-stat-sub" style={{ marginLeft: 'auto' }}>{points.length} 处钉点 · {(total || 0).toLocaleString()} 条记载</span>
				</div>
				{err ? (
					<div className="xuanshi-center"><Empty description={`载入失败:${err}`} /><span className="xuanshi-link" onClick={() => this.load()}>重试</span></div>
				) : (
					<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
						<div className="xuanshi-card" style={{ flex: '1 1 560px', padding: 10, minWidth: 0 }}>
							{loading ? <div className="xuanshi-center" style={{ minHeight: 380 }}><Spin tip="载入舆图…" /></div> : !points.length ? (
								<div className="xuanshi-center" style={{ minHeight: 380 }}><Empty description={period ? `「${period}」无钉点` : '无数据'} /></div>
							) : !this.projection ? (
								<div className="xuanshi-center" style={{ minHeight: 380 }}><Empty description={`底图载入失败:${this._geoErr || ''}`} /></div>
							) : (
								<svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
									{this.basePaths.map((p) => <path key={p.key} d={p.d} fill="var(--paper-soft)" fillRule="evenodd" stroke="var(--ink-soft)" strokeWidth={0.7} strokeOpacity={0.85} />)}
									{points.map((p, i) => {
										const xy = this.projection([p.lng, p.lat]);
										if (!xy || isNaN(xy[0])) { return null; }
										const sel = selected && selected.modern === p.modern;
										return (
											<g key={i} style={{ cursor: 'pointer' }} onClick={() => this.setState({ selected: p })}>
												<circle cx={xy[0]} cy={xy[1]} r={radius(p.count)} fill="var(--vermilion)" fillOpacity={sel ? 0.92 : 0.5} stroke="#fff7ef" strokeWidth={sel ? 1.6 : 0.5} />
												{p.count >= maxCount * 0.28 ? <text x={xy[0]} y={xy[1] - radius(p.count) - 3} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--ink-soft)', fontFamily: 'var(--xs-serif)' }}>{p.modern}</text> : null}
												<title>{p.modern}:{p.count}</title>
											</g>
										);
									})}
								</svg>
							)}
						</div>
						<div style={{ flex: '0 0 248px', minWidth: 0 }}>
							{selected ? (
								<div className="xuanshi-card">
									<div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
										<span className="xuanshi-seal">{(selected.modern || '·')[0]}</span>
										<span className="xuanshi-display is-h2" style={{ fontSize: 20 }}>{selected.modern}</span>
									</div>
									<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
										<span className="xuanshi-chip is-vermilion">{selected.count} 条记载</span>
										<span className="xuanshi-chip is-ink">{(selected.lng || 0).toFixed(2)}, {(selected.lat || 0).toFixed(2)}</span>
									</div>
									{(selected.ancient_names || []).length ? (
										<div>
											<div className="xuanshi-stat-label" style={{ textAlign: 'left' }}>古名 / 别称({(selected.ancient_names || []).length})</div>
											<div style={{ marginTop: 7, maxHeight: 300, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
												{(selected.ancient_names || []).slice(0, 80).map((n, i) => <span className="xuanshi-chip" key={i} style={{ fontSize: 10.5 }}>{n}</span>)}
											</div>
										</div>
									) : null}
								</div>
							) : (
								<div className="xuanshi-hint">点地图上的钉点,看该地古今名与活动量。圆越大,该地玄学 / 天象记载越多。搜朝代可看活动中心迁移。</div>
							)}
						</div>
					</div>
				)}
			</div>
		);
	}
}
