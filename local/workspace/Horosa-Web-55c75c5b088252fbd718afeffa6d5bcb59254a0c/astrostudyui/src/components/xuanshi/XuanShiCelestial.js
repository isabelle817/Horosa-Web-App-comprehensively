import React from 'react';
import { Spin, Empty, Pagination, Select, Input } from 'antd';
import { fetchCelestial, fetchMicrochronology } from '../../services/xuanshi';
import { marked } from 'marked';
import { resolveChartDate, collapseSoftBreaks } from './xuanshiDate';

// 白话与原文字符集重合 >0.85 视为近乎相同(硬古文白话≈原文)→ 隐藏白话免冗余
function nearSame(a, b) { if (!a || !b) { return false; } const sa = new Set(a), sb = new Set(b); let inter = 0; sa.forEach((c) => { if (sb.has(c)) { inter++; } }); return inter / Math.max(sa.size, sb.size, 1) > 0.85; }

// 星象大典(核心)—— 忠实源 celestial.html:朝代×天象热力矩阵 + 十年密度 + 过滤 + 列表 + 详情。
// 点矩阵格 = 按该朝代+天象下钻;omen chip 单选过滤;dynasty Select;关键词搜索。
function cellColor(n, max) {
	if (!n || !max) { return 'transparent'; }
	const t = Math.min(1, 0.12 + 0.88 * (n / max)); // 0.12~1 强度
	return `rgba(166, 61, 42, ${t.toFixed(3)})`; // 朱砂强度(暗黑下 vermilion 偏亮,用半透明叠 paper 仍可读)
}

export default class XuanShiCelestial extends React.Component {
	constructor(props) {
		super(props);
		const f = (props.ui && props.ui.celestial) || {};
		this.state = {
			dynasty: f.dynasty || '', omen: (typeof f.omen === 'string' ? f.omen : ''), q: f.q || '', page: f.page || 1,
			events: [], total: 0, pages: 0, summary: null,
			loading: false, err: '', selected: null,
			micro: null, microDecade: null, microLoading: false, microPage: 1,
		};
	}

	componentDidMount() { this.load(); }

	persist() {
		if (this.props.onPersist) {
			this.props.onPersist('celestial', { dynasty: this.state.dynasty, omen: this.state.omen, q: this.state.q, page: this.state.page });
		}
	}

	async load() {
		this.setState({ loading: true, err: '' });
		try {
			const r = await fetchCelestial({
				dynasty: this.state.dynasty || undefined,
				omen: this.state.omen || undefined,
				q: this.state.q || undefined,
				page: this.state.page, page_size: 20,
			});
			this.setState({
				events: r.events || r.items || [], total: r.total || 0, pages: r.pages || 0,
				summary: r.global_summary || r.filtered_summary || null, loading: false,
			});
		} catch (e) { this.setState({ loading: false, err: `${e && e.message ? e.message : e}` }); }
		this.persist();
	}

	setFilter(patch) { this.setState({ ...patch, page: 1 }, () => this.load()); }

	// 十年密度下钻:取该年代逐年天象(微年表);再点同一年代则收起
	async loadMicro(decade) {
		if (this.state.microDecade === decade) { this.setState({ microDecade: null, micro: null }); return; }
		this.setState({ microDecade: decade, micro: null, microLoading: true, microPage: 1 });
		try {
			const r = await fetchMicrochronology({ decade }); // 该年代全部事件(不受列表 omen 过滤影响)
			// 源数据同一天象在多个 topic CSV 各存一份(原文最多重复 32 次)→ 按(原文+日期)去重
			const seen = new Set();
			const events = (r.events || []).filter((e) => { const k = `${e.original || e.interpretation || ''}|${e.modern_date_disp || e.date_phrase || ''}`; if (seen.has(k)) { return false; } seen.add(k); return true; });
			this.setState({ micro: { ...r, events }, microLoading: false });
		} catch (e) { this.setState({ microLoading: false }); }
	}

	renderMatrix() {
		const s = this.state.summary;
		if (!s || !s.matrix_rows || !s.matrix_omens) { return null; }
		const omens = s.matrix_omens;
		const max = s.max_cell || 1;
		return (
			<div className="xuanshi-card" style={{ marginTop: 16, padding: 14, overflowX: 'auto' }}>
				<div className="xuanshi-stat-label" style={{ textAlign: 'left', marginBottom: 8 }}>朝代 × 天象 热力矩阵(点格下钻)</div>
				<table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
					<thead>
						<tr>
							<th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--ink-muted)', fontWeight: 500 }}>朝代</th>
							{omens.map((o) => <th key={o} style={{ padding: '4px 5px', color: 'var(--ink-muted)', fontWeight: 500, whiteSpace: 'nowrap', writingMode: 'vertical-rl', height: 52 }}>{o}</th>)}
							<th style={{ padding: '4px 8px', color: 'var(--ink-muted)', fontWeight: 500 }}>计</th>
						</tr>
					</thead>
					<tbody>
						{s.matrix_rows.map((row) => (
							<tr key={row.macro}>
								<td style={{ padding: '3px 8px', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{row.macro}</td>
								{row.cells.map((c) => (
									<td key={c.omen}
										onClick={() => c.n ? this.setFilter({ dynasty: row.macro, omen: c.omen }) : null}
										title={`${row.macro}·${c.omen}:${c.n}`}
										style={{
											textAlign: 'center', padding: '3px 5px', minWidth: 30,
											background: cellColor(c.n, max), color: c.n / max > 0.5 ? '#fff7ef' : 'var(--ink-soft)',
											cursor: c.n ? 'pointer' : 'default', borderRadius: 3,
										}}>{c.n || ''}</td>
								))}
								<td style={{ padding: '3px 8px', textAlign: 'right', color: 'var(--ink-muted)', fontVariantNumeric: 'tabular-nums' }}>{row.total}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	renderDecades() {
		const s = this.state.summary;
		if (!s || !s.by_decade || !s.by_decade.length) { return null; }
		const maxN = s.max_decade_n || Math.max(...s.by_decade.map((d) => d[1]), 1);
		return (
			<div className="xuanshi-card" style={{ marginTop: 14, padding: 14 }}>
				<div className="xuanshi-stat-label" style={{ textAlign: 'left', marginBottom: 10 }}>十年密度 · 点柱下钻逐年微年表</div>
				<div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 70, overflowX: 'auto' }}>
					{s.by_decade.map((d) => (
						<div key={d[0]} title={`${d[0]}年代:${d[1]} 条(点看微年表)`} onClick={() => this.loadMicro(d[0])} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', cursor: 'pointer' }}>
							<div style={{ width: 7, height: `${Math.max(2, 60 * d[1] / maxN)}px`, background: this.state.microDecade === d[0] ? 'var(--vermilion)' : 'var(--jade)', borderRadius: '2px 2px 0 0', transition: 'background .15s' }} />
						</div>
					))}
				</div>
			</div>
		);
	}

	renderMicro() {
		const { micro, microDecade, microLoading } = this.state;
		if (microDecade == null) { return null; }
		const decLabel = microDecade < 0 ? `公元前 ${Math.abs(microDecade)}` : `公元 ${microDecade}`;
		const evs = (micro && micro.events) || [];
		const PAGE = 50;
		const mp = this.state.microPage || 1;
		const pageEvs = evs.slice((mp - 1) * PAGE, mp * PAGE);
		return (
			<div className="xuanshi-card" style={{ marginTop: 12, padding: 14 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
					<span className="xuanshi-stat-label" style={{ textAlign: 'left' }}>{decLabel} 年代 · 微年表{evs.length ? `(${evs.length} 条)` : ''}</span>
					<span className="xuanshi-link" style={{ fontSize: 12, marginLeft: 'auto' }} onClick={() => this.setState({ microDecade: null, micro: null })}>收起</span>
				</div>
				{microLoading ? <div className="xuanshi-center" style={{ minHeight: 80 }}><Spin tip="载入微年表…" /></div>
					: !evs.length ? <Empty description="该年代无带年天象" image={Empty.PRESENTED_IMAGE_SIMPLE} />
						: (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
								{pageEvs.map((e) => (
									<div key={e.event_id} className="xuanshi-card is-link" style={{ padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => this.setState({ selected: e })}>
										<span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--vermilion)', fontFamily: 'var(--xs-serif)', minWidth: 64, fontSize: 13 }}>{e.modern_date_disp || (e.year != null ? (e.year < 0 ? `前${-e.year}` : e.year) : '—')}</span>
										<span className="xuanshi-chip is-vermilion">{e.omen}</span>
										<span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.original || e.date_phrase || e.interpretation || ''}</span>
										{e.history ? <span className="xuanshi-chip is-ink">{`《${e.history}》`}</span> : null}
									</div>
								))}
								{evs.length > PAGE ? <div style={{ marginTop: 12, textAlign: 'center' }}><Pagination simple current={mp} total={evs.length} pageSize={PAGE} showSizeChanger={false} onChange={(p) => this.setState({ microPage: p })} /></div> : null}
							</div>
						)}
			</div>
		);
	}

	renderDetail() {
		const d = this.state.selected;
		const field = (label, val) => (val ? (
			<div style={{ marginBottom: 13 }}>
				<div className="xuanshi-stat-label" style={{ textAlign: 'left' }}>{label}</div>
				<div className="xuanshi-prose" style={{ marginTop: 4 }} dangerouslySetInnerHTML={{ __html: marked.parse(collapseSoftBreaks(String(val)), { gfm: true, breaks: false }) }} />
			</div>
		) : null);
		const metaText = (label, val) => (val && String(val).trim() ? (
			<div style={{ marginBottom: 11 }}>
				<div className="xuanshi-stat-label" style={{ textAlign: 'left', fontSize: 11 }}>{label}</div>
				<div style={{ marginTop: 2, fontSize: 12.5, lineHeight: 1.65, color: 'var(--ink-soft)' }}>{val}</div>
			</div>
		) : null);
		const hasMeta = d.citation || d.date_phrase || d.era || d.subject || d.action || d.target || d.routing_theme;
		return (
			<div>
				<span className="xuanshi-link" onClick={() => this.setState({ selected: null })}>← 返回</span>
				<h2 className="xuanshi-display is-h2" style={{ marginTop: 12 }}>{d.omen || '天象'} · {d.dynasty || ''}{d.modern_date_disp ? ` · ${d.modern_date_disp}` : ''}</h2>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 18px' }}>
					{d.omen ? <span className="xuanshi-chip is-vermilion">{d.omen}</span> : null}
					{d.dynasty ? <span className="xuanshi-chip is-ink">{d.dynasty}</span> : null}
					{d.history ? <span className="xuanshi-chip is-gold">《{d.history}》{d.volume_no ? `卷${d.volume_no}` : ''}</span> : null}
					{d.has_crosswalk ? <span className="xuanshi-chip is-jade">有交叉</span> : null}
				</div>
				<div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
					<div style={{ flex: '1 1 440px', minWidth: 0, maxWidth: 880 }}>
						{field('原文', d.original)}
						{nearSame(d.modern, d.original) ? null : field('白话', d.modern)}
						{field('解读', d.interpretation)}
						{(() => {
							const rd = this.props.onChartLink ? resolveChartDate(d) : null;
							if (!rd) { return null; }
							return (
								<div style={{ marginTop: 14 }}>
									<div className="xuanshi-hint" style={{ marginBottom: 8 }}>{rd.exact ? `公历 ${rd.md}` : `${rd.disp}(按年份最早)`} —— 排此历史日之盘(按朝代都城近似经纬)</div>
									<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
										<span className="xuanshi-btn is-primary" onClick={() => this.props.onChartLink(d, 'astrochart')}>排此日 · 占星盘</span>
										<span className="xuanshi-btn" onClick={() => this.props.onChartLink(d, 'guolao')}>排此日 · 七政四余</span>
										<span className="xuanshi-btn" onClick={() => this.props.onChartLink(d, 'planetarium')}>此时此地 · 天文馆</span>
									</div>
								</div>
							);
						})()}
					</div>
					{hasMeta ? (
						<aside className="xuanshi-card" style={{ flex: '0 0 300px', alignSelf: 'flex-start' }}>
							<div className="xuanshi-stat-label" style={{ textAlign: 'left', marginBottom: 12, color: 'var(--vermilion)', letterSpacing: '.1em' }}>天象档案</div>
							{metaText('出处', d.citation)}
							{metaText('原历日', d.date_phrase)}
							{metaText('纪年', d.era)}
							{metaText('主体', d.subject)}
							{metaText('动作', d.action)}
							{metaText('对象', d.target)}
							{metaText('公历', d.modern_date_disp || d.modern_date)}
							{metaText('主题', d.routing_theme)}
						</aside>
					) : null}
				</div>
			</div>
		);
	}

	render() {
		if (this.state.selected) { return this.renderDetail(); }
		const { events, total, pages, page, loading, err, summary } = this.state;
		const omens = (summary && summary.matrix_omens) || [];
		const dyns = (summary && summary.by_dynasty) || [];
		return (
			<div>
				<div className="xuanshi-eyebrow">星象大典</div>
				<h2 className="xuanshi-display is-h2" style={{ marginTop: 6 }}>二十四史天象 · 朝代 × 类型</h2>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '14px 0 6px' }}>
					<span className={`xuanshi-chip ${this.state.omen === '' ? 'is-vermilion' : 'is-ink'}`} style={{ cursor: 'pointer' }} onClick={() => this.setFilter({ omen: '' })}>全部天象</span>
					{omens.map((o) => (
						<span key={o} className={`xuanshi-chip ${this.state.omen === o ? 'is-vermilion' : 'is-ink'}`} style={{ cursor: 'pointer' }} onClick={() => this.setFilter({ omen: o })}>{o}</span>
					))}
				</div>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '8px 0' }}>
					<Select allowClear showSearch placeholder="朝代" size="small" style={{ minWidth: 130 }} value={this.state.dynasty || undefined}
						options={dyns.map((d) => Array.isArray(d) ? { value: d[0], label: `${d[0]} (${d[1]})` } : { value: d, label: d })}
						onChange={(v) => this.setFilter({ dynasty: v || '' })} filterOption={(i, o) => (o.label || '').indexOf(i) >= 0} />
					<Input.Search placeholder="关键词" allowClear size="small" style={{ width: 200 }} defaultValue={this.state.q} onSearch={(v) => this.setFilter({ q: v })} />
					<span className="xuanshi-stat-sub" style={{ marginLeft: 'auto' }}>{total.toLocaleString()} 条</span>
				</div>

				{this.renderMatrix()}
				{this.renderDecades()}
				{this.renderMicro()}

				<div style={{ marginTop: 18 }}>
					{loading ? <div className="xuanshi-center"><Spin tip="检索…" /></div> : err ? (
						<div className="xuanshi-center"><Empty description={`载入失败:${err}`} /><span className="xuanshi-link" onClick={() => this.load()}>重试</span></div>
					) : !events.length ? <div className="xuanshi-center"><Empty description="无匹配天象" /></div> : (
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
							{events.map((e) => (
								<div className="xuanshi-card is-link" key={e.event_id} onClick={() => this.setState({ selected: e })}>
									<div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
										<span className="xuanshi-chip is-vermilion">{e.omen}</span>
										{e.dynasty ? <span className="xuanshi-chip is-ink">{e.dynasty}</span> : null}
										{e.modern_date_disp ? <span className="xuanshi-chip is-gold">{e.modern_date_disp}</span> : null}
									</div>
									<div className="xuanshi-stat-sub" style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-soft)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
										{e.original || e.interpretation || e.date_phrase || ''}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
				{pages > 1 ? (
					<div style={{ marginTop: 18, textAlign: 'center' }}>
						<Pagination simple current={page} total={total} pageSize={20} showSizeChanger={false} onChange={(p) => this.setState({ page: p }, () => this.load())} />
					</div>
				) : null}
			</div>
		);
	}
}
