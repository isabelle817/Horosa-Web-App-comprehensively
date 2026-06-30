import React from 'react';
import { Spin, Empty } from 'antd';
import * as d3 from 'd3';
import { fetchPersonsGraph } from '../../services/xuanshi';

// 人物关系 —— 真实人物共现网络力导图谱(全部两千余位有共现的人物)。
// 标签按共现权重「贪心去重叠」:屏幕空间无碰撞才显示 → 永不堆积;放大后节点拉开,自动显示更多名字。
// d3-zoom 滚轮缩放/拖拽平移:直接改 <g> 的 DOM transform(不触发 React 重渲染,两千节点也流畅);缩放结束再重算标签。
// 字体不加粗(400)、不描边;圆点亦无描边。
const W = 1000, H = 720;
const FS = 13; // 标签固定屏幕字号(随缩放反向补偿,保持恒定大小;不随缩放无限放大→缩小不挤)

export default class XuanShiPersons extends React.Component {
	constructor(props) {
		super(props);
		this.state = { nodes: [], edges: [], loading: false, err: '', selected: null, zoom: null };
		this.gRef = React.createRef();
	}

	componentDidMount() { this.load(); }
	componentWillUnmount() { if (this._svg) { d3.select(this._svg).on('.zoom', null); } }

	nodeR(n) { return 2 + Math.min(11, Math.sqrt(n.weight || 1) * 0.85); }

	setSvgRef = (el) => { this._svg = el; this.attachZoom(el); };

	attachZoom = (svg) => {
		if (!svg || this._zoomAttached) { return; }
		this._zoomAttached = true;
		this._zoom = d3.zoom().scaleExtent([0.25, 14])
			.on('zoom', (event) => {
				this._t = event.transform;
				if (this.gRef.current) { this.gRef.current.setAttribute('transform', event.transform.toString()); } // 直改 DOM,不重渲染
			})
			.on('end', (event) => { this.setState({ zoom: event.transform }); }); // 缩放停下后重算标签去重叠
		d3.select(svg).call(this._zoom);
	};

	resetZoom = () => {
		if (this._svg && this._zoom) { d3.select(this._svg).call(this._zoom.transform, d3.zoomIdentity); }
		this._t = null;
		this.setState({ zoom: null });
	};

	async load() {
		this.setState({ loading: true, err: '' });
		try {
			const r = await fetchPersonsGraph({ top_n: 2400, min_weight: 1 }); // 全部有共现者
			const nodes = (r.nodes || []).map((n) => ({ ...n }));
			const links = (r.edges || r.links || []).map((e) => ({ ...e }));
			const sim = d3.forceSimulation(nodes)
				.force('link', d3.forceLink(links).id((d) => d.id).distance(30).strength(0.11))
				.force('charge', d3.forceManyBody().strength(-42).distanceMax(300))
				.force('x', d3.forceX(W / 2).strength(0.045))
				.force('y', d3.forceY(H / 2).strength(0.045))
				.force('collide', d3.forceCollide().radius((d) => this.nodeR(d) + 1.2))
				.stop();
			const ticks = nodes.length > 1200 ? 250 : 340;
			for (let i = 0; i < ticks; i++) { sim.tick(); }
			const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
			const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
			const pad = 28, s = Math.min((W - 2 * pad) / Math.max(1, maxX - minX), (H - 2 * pad) / Math.max(1, maxY - minY));
			nodes.forEach((n) => { n.x = pad + (n.x - minX) * s; n.y = pad + (n.y - minY) * s; });
			this.setState({ nodes, edges: links, loading: false });
		} catch (e) { this.setState({ loading: false, err: `${e && e.message ? e.message : e}` }); }
	}

	// 贪心标签去重叠:按权重降序,屏幕空间矩形无碰撞才显示 → 永不堆积;k 变大节点拉开 → 更多标签可见。
	visibleLabels(nodes, t, selected, neighbors) {
		const k = t ? t.k : 1, tx = t ? t.x : 0, ty = t ? t.y : 0;
		const placed = [];
		const show = new Set();
		const sorted = [...nodes].sort((a, b) => (b.weight || 0) - (a.weight || 0));
		const hit = (a, b) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
		sorted.forEach((n) => {
			const sx = n.x * k + tx, sy = n.y * k + ty;
			if (sx < -40 || sx > W + 40 || sy < -20 || sy > H + 20) { return; } // 视口外不占名额
			const half = (String(n.id).length * FS * 0.6) / 2 + 5, h = FS + 7;
			const top = sy - this.nodeR(n) - h;
			const box = { x1: sx - half, x2: sx + half, y1: top, y2: top + h };
			if (placed.every((p) => !hit(p, box))) { show.add(n.id); placed.push(box); }
		});
		if (selected) { show.add(selected); neighbors.forEach((nb) => show.add(nb)); } // 选中及邻居强制显示
		return show;
	}

	render() {
		const { nodes, edges, loading, err, selected } = this.state;
		const t = this.state.zoom;
		const k = t ? t.k : 1;
		const neighbors = new Set();
		if (selected) {
			edges.forEach((e) => {
				const s = (e.source && e.source.id) || e.source, tt = (e.target && e.target.id) || e.target;
				if (s === selected) { neighbors.add(tt); }
				if (tt === selected) { neighbors.add(s); }
			});
		}
		// 边整合成单 path(主干 weight>=2 降噪降 DOM;弱边仅在其端点选中时显示)
		let basePath = '', selPath = '';
		edges.forEach((e) => {
			const s = e.source, tg = e.target;
			if (!s || !tg || s.x == null) { return; }
			const sid = (s && s.id) || s, tid = (tg && tg.id) || tg;
			const touchesSel = selected && (sid === selected || tid === selected);
			if ((e.weight || 1) < 2 && !touchesSel) { return; }
			const seg = `M${s.x.toFixed(1)} ${s.y.toFixed(1)}L${tg.x.toFixed(1)} ${tg.y.toFixed(1)}`;
			if (touchesSel) { selPath += seg; } else { basePath += seg; }
		});
		const show = nodes.length ? this.visibleLabels(nodes, t, selected, neighbors) : new Set();
		const tf = t ? `translate(${t.x},${t.y}) scale(${t.k})` : null;
		return (
			<div>
				<div className="xuanshi-eyebrow">人物关系</div>
				<h2 className="xuanshi-display is-h2" style={{ marginTop: 6 }}>共现网络 · 力导图谱</h2>
				<div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '14px 0', flexWrap: 'wrap' }}>
					<span className="xuanshi-stat-sub">{nodes.length} 位人物 · {edges.length} 共现关系{selected ? ` · 选中:${selected}` : ''}</span>
					<span className="xuanshi-link" onClick={this.resetZoom}>重置缩放</span>
					{selected ? <span className="xuanshi-link" onClick={() => this.setState({ selected: null })}>清除选中</span> : null}
					<span className="xuanshi-stat-sub" style={{ marginLeft: 'auto' }}>滚轮放大看更多名字 · 拖拽平移 · 点人高亮共现</span>
				</div>
				{loading ? <div className="xuanshi-center" style={{ minHeight: 460 }}><Spin tip="布局图谱…" /></div> : err ? (
					<div className="xuanshi-center"><Empty description={`载入失败:${err}`} /><span className="xuanshi-link" onClick={() => this.load()}>重试</span></div>
				) : !nodes.length ? <div className="xuanshi-center"><Empty description="无关系数据" /></div> : (
					<div className="xuanshi-card" style={{ padding: 8, overflow: 'hidden' }}>
						<svg ref={this.setSvgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', cursor: 'grab', touchAction: 'none', background: 'transparent' }}>
							<g ref={this.gRef} transform={tf || undefined}>
								<path d={basePath} stroke="var(--ink-muted)" strokeWidth={0.6} strokeOpacity={selected ? 0.05 : 0.2} fill="none" vectorEffect="non-scaling-stroke" />
								{selPath ? <path d={selPath} stroke="var(--vermilion)" strokeWidth={1.1} strokeOpacity={0.55} fill="none" vectorEffect="non-scaling-stroke" /> : null}
								{nodes.map((n, i) => {
									const dim = selected && n.id !== selected && !neighbors.has(n.id);
									const isSel = n.id === selected;
									return <circle key={i} cx={n.x} cy={n.y} r={this.nodeR(n) / k} fill="var(--vermilion)" fillOpacity={isSel ? 0.95 : (dim ? 0.12 : 0.72)} stroke="none" style={{ cursor: 'pointer' }} onClick={() => this.setState({ selected: selected === n.id ? null : n.id })} />;
								})}
								{nodes.map((n, i) => {
									if (!show.has(n.id)) { return null; }
									const isSel = n.id === selected;
									const dim = selected && !isSel && !neighbors.has(n.id);
									return <text key={`t${i}`} transform={`translate(${n.x},${n.y}) scale(${1 / k})`} y={-(this.nodeR(n) + 3)} textAnchor="middle" style={{ fontSize: isSel ? FS + 2 : FS, fontWeight: 400, fill: isSel ? 'var(--vermilion)' : 'var(--ink-soft)', fillOpacity: dim ? 0.22 : 1, fontFamily: '"Noto Sans SC", -apple-system, sans-serif', pointerEvents: 'none' }}>{n.id}</text>;
								})}
							</g>
						</svg>
					</div>
				)}
				<div className="xuanshi-hint">共 {nodes.length} 位有共现关系的人物;圆越大共现越频繁,连线=同事件共现。名字按重要度自动避让、永不重叠 —— <span style={{ color: 'var(--vermilion)' }}>滚轮放大可看清更多名字</span>;点击人物高亮其全部共现关系。</div>
			</div>
		);
	}
}
