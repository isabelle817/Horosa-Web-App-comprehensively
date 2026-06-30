import React from 'react';
import { Spin, Empty } from 'antd';
import { fetchTimeline } from '../../services/xuanshi';

// 朝代时间轴 —— 忠实源 timeline.html:编年时间轴(横轴=公元纪年,柱高∝事件数)+ 朝代×术类热力矩阵。
const W = 820, TH = 150;
function cellColor(n, max) {
	if (!n || !max) { return 'transparent'; }
	const t = Math.min(1, 0.12 + 0.88 * (n / max));
	return `rgba(166, 61, 42, ${t.toFixed(3)})`;
}

export default class XuanShiTimeline extends React.Component {
	constructor(props) { super(props); this.state = { data: null, loading: false, err: '', selected: null }; }

	componentDidMount() { this.load(); }

	async load() {
		this.setState({ loading: true, err: '' });
		try { const r = await fetchTimeline({}); this.setState({ data: r, loading: false }); }
		catch (e) { this.setState({ loading: false, err: `${e && e.message ? e.message : e}` }); }
	}

	render() {
		const { data, loading, err, selected } = this.state;
		if (loading) { return <div className="xuanshi-center" style={{ minHeight: 400 }}><Spin tip="载入时间轴…" /></div>; }
		if (err) { return <div className="xuanshi-center"><Empty description={`载入失败:${err}`} /><span className="xuanshi-link" onClick={() => this.load()}>重试</span></div>; }
		if (!data) { return <div className="xuanshi-center"><Empty /></div>; }
		const series = data.series || [], matrix = data.matrix || [], techs = data.top_techs || [];
		const maxTotal = series.reduce((m, s) => Math.max(m, s.total || 0), 1);
		const maxCell = matrix.reduce((m, row) => Math.max(m, ...techs.map((t) => row[t] || 0)), 1);
		const span = (s) => (s.span_start == null ? '' : `${s.span_start < 0 ? '前' + (-s.span_start) : s.span_start}–${s.span_end < 0 ? '前' + (-s.span_end) : s.span_end}`);
		return (
			<div>
				<div className="xuanshi-eyebrow">朝代时间轴</div>
				<h2 className="xuanshi-display is-h2" style={{ marginTop: 6 }}>玄学事件 · 朝代编年</h2>
				<div style={{ display: 'flex', gap: 14, margin: '12px 0' }}>
					<span className="xuanshi-stat-sub">{(data.total || 0).toLocaleString()} 条 · 已归类 {(data.classified || 0).toLocaleString()} · 未归类 {(data.unclassified || 0).toLocaleString()}{selected ? ` · 选中:${selected}` : ''}</span>
					{selected ? <span className="xuanshi-link" onClick={() => this.setState({ selected: null })}>看全部朝代</span> : null}
				</div>

				<div className="xuanshi-card" style={{ padding: 14, overflowX: 'auto' }}>
					<div className="xuanshi-stat-label" style={{ textAlign: 'left', marginBottom: 8 }}>编年(朝代顺序,柱高∝事件数,点柱筛下方术类;悬停看起止)</div>
					<svg viewBox={`0 0 ${W} ${TH + 22}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
						<line x1={10} y1={TH} x2={W - 10} y2={TH} stroke="var(--line)" strokeWidth={1} />
						{series.map((s, i) => {
							const slotW = (W - 20) / series.length;
							const cx = 10 + i * slotW + slotW / 2;
							const barW = Math.min(slotW - 8, 36);
							const h = Math.max(2, (TH - 20) * ((s.total || 0) / maxTotal));
							const sel = selected === s.macro;
							return (
								<g key={i} style={{ cursor: 'pointer' }} onClick={() => this.setState({ selected: sel ? null : s.macro })}>
									<title>{s.macro} {span(s)}:{s.total} 条</title>
									<rect x={cx - barW / 2} y={TH - h} width={barW} height={h} fill="var(--vermilion)" fillOpacity={sel ? 0.92 : 0.5} rx={2} />
									<text x={cx} y={TH + 14} textAnchor="middle" style={{ fontSize: 10, fontWeight: 400, fill: 'var(--ink-muted)', fontFamily: 'var(--xs-serif)' }}>{s.macro}</text>
									{h > 12 ? <text x={cx} y={TH - h - 3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 400, fill: 'var(--ink-soft)' }}>{s.total}</text> : null}
								</g>
							);
						})}
					</svg>
				</div>

				<div className="xuanshi-card" style={{ marginTop: 14, padding: 14, overflowX: 'auto' }}>
					<div className="xuanshi-stat-label" style={{ textAlign: 'left', marginBottom: 8 }}>朝代 × 术类 热力矩阵</div>
					<table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
						<thead>
							<tr>
								<th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--ink-muted)', fontWeight: 500 }}>朝代</th>
								{techs.map((t) => <th key={t} style={{ padding: '4px 5px', color: 'var(--ink-muted)', fontWeight: 500, whiteSpace: 'nowrap', writingMode: 'vertical-rl', height: 56 }}>{t}</th>)}
							</tr>
						</thead>
						<tbody>
							{matrix.filter((row) => !selected || row.macro === selected).map((row, i) => (
								<tr key={i}>
									<td style={{ padding: '3px 8px', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{row.macro}</td>
									{techs.map((t) => (
										<td key={t} title={`${row.macro}·${t}:${row[t] || 0}`} style={{ textAlign: 'center', padding: '3px 5px', minWidth: 30, background: cellColor(row[t] || 0, maxCell), color: (row[t] || 0) / maxCell > 0.5 ? '#fff7ef' : 'var(--ink-soft)', borderRadius: 3 }}>{row[t] || ''}</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	}
}
