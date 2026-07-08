import React from 'react';
import { Spin, Empty, Select, Input, Pagination } from 'antd';
import { fetchFigures, fetchFigure } from '../../services/xuanshi';

const PAGE_SIZE = 60; // 列传全列 3469,分页防 DOM 过重(保 <1s)

// 人物列传 —— 忠实源 person.html:列传网格(印章+生卒+一句话)+ 详情(biography_html 走 prose markdown 渲染 + 关联事件/故事)。
function lifeSpan(b, d) {
	const f = (y) => (y == null || y === '' ? '' : (Number(y) < 0 ? `前${-Number(y)}` : `${y}`));
	const a = f(b), z = f(d);
	if (!a && !z) { return ''; }
	return `${a || '?'}—${z || '?'}`;
}

export default class XuanShiFigures extends React.Component {
	constructor(props) {
		super(props);
		const f = (props.ui && props.ui.figures) || {};
		this.state = {
			dynasty: f.dynasty || '', q: f.q || '', page: f.page || 1,
			items: [], total: 0, dynasties: [], loading: false, err: '',
			selected: null, detailLoading: false,
		};
	}

	componentDidMount() { this.load(); }

	persist() { if (this.props.onPersist) { this.props.onPersist('figures', { dynasty: this.state.dynasty, q: this.state.q, page: this.state.page }); } }

	async load() {
		this.setState({ loading: true, err: '' });
		try {
			const r = await fetchFigures({ status: 'all', dynasty: this.state.dynasty || undefined, q: this.state.q || undefined, limit: PAGE_SIZE, offset: (this.state.page - 1) * PAGE_SIZE });
			this.setState({ items: r.items || r.figures || [], total: r.total || 0, dynasties: r.dynasties || this.state.dynasties, loading: false });
		} catch (e) { this.setState({ loading: false, err: `${e && e.message ? e.message : e}` }); }
		this.persist();
	}

	setFilter(patch) { this.setState({ ...patch, page: 1 }, () => this.load()); }

	async openDetail(slug) {
		this.setState({ detailLoading: true, selected: { slug } });
		try {
			const r = await fetchFigure(slug);
			this.setState({ selected: r.figure ? { ...r.figure, links: r.links, related_events: r.related_events } : r, detailLoading: false });
		} catch (e) { this.setState({ detailLoading: false, selected: { slug, _err: `${e}` } }); }
	}

	renderDetail() {
		const d = this.state.selected;
		if (this.state.detailLoading || (!d.name && !d._err)) { return <div className="xuanshi-center"><Spin tip="载入列传…" /></div>; }
		if (d._err) { return <div className="xuanshi-center"><Empty description={`载入失败:${d._err}`} /></div>; }
		const span = lifeSpan(d.birth_year, d.death_year);
		const rel = d.related_events || [];
		const facts = (label, val) => (val && String(val).trim() ? (
			<div style={{ marginBottom: 11 }}>
				<div className="xuanshi-stat-label" style={{ textAlign: 'left', fontSize: 11 }}>{label}</div>
				<div style={{ marginTop: 2, fontSize: 12.5, lineHeight: 1.65, color: 'var(--ink-soft)' }}>{val}</div>
			</div>
		) : null);
		const hasAside = rel.length > 0; // 朝代/生卒/别名 已在 body_html 元数据行,aside 只补「关联事件」(无则单栏)
		return (
			<div>
				<span className="xuanshi-link" onClick={() => this.setState({ selected: null })}>← 返回列传</span>
				<div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, margin: '14px 0 6px' }}>
					<span className="xuanshi-seal is-lg">{(d.name || '·')[0]}</span>
					<div>
						<h2 className="xuanshi-display is-h2" style={{ marginTop: 2 }}>{d.name}</h2>
						{d.pinyin ? <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4, letterSpacing: '.05em' }}>{d.pinyin}</div> : null}
					</div>
				</div>
				{d.one_liner ? <div className="xuanshi-section-sub" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{d.one_liner}</div> : null}
				<div style={{ marginTop: 12, display: 'flow-root' }}>
					{hasAside ? (
						<aside className="xuanshi-card" style={{ float: 'right', width: 264, marginLeft: 22, marginBottom: 14 }}>
							<div className="xuanshi-stat-label" style={{ textAlign: 'left', marginBottom: 10, color: 'var(--vermilion)', letterSpacing: '.1em' }}>关联事件 · {rel.length}</div>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
								{rel.slice(0, 24).map((e, i) => <span className="xuanshi-chip is-jade" key={i}>{e.title || e.name || e.event_id || ''}</span>)}
							</div>
						</aside>
					) : null}
					{d.biography_html
						? <div className="xuanshi-prose" dangerouslySetInnerHTML={{ __html: d.biography_html }} />
						: (d.biography_md ? <div className="xuanshi-prose" style={{ whiteSpace: 'pre-wrap' }}>{d.biography_md}</div> : null)}
				</div>
			</div>
		);
	}

	render() {
		if (this.state.selected) { return this.renderDetail(); }
		const { items, total, loading, err, dynasties } = this.state;
		return (
			<div>
				<div className="xuanshi-eyebrow">人物列传</div>
				<h2 className="xuanshi-display is-h2" style={{ marginTop: 6 }}>术数名家 · 列传</h2>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '16px 0 14px' }}>
					<Select allowClear showSearch placeholder="朝代" size="small" style={{ minWidth: 140 }} value={this.state.dynasty || undefined}
						options={(dynasties || []).map((x) => Array.isArray(x) ? { value: x[0], label: `${x[0]} (${x[1]})` } : { value: x, label: x })}
						onChange={(v) => this.setFilter({ dynasty: v || '' })} filterOption={(i, o) => (o.label || '').indexOf(i) >= 0} />
					<Input.Search placeholder="姓名 / 关键词" allowClear size="small" style={{ width: 220 }} defaultValue={this.state.q} onSearch={(v) => this.setFilter({ q: v })} />
					<span className="xuanshi-stat-sub" style={{ marginLeft: 'auto' }}>{(total || items.length).toLocaleString()} 位</span>
				</div>
				{loading ? <div className="xuanshi-center"><Spin tip="载入…" /></div> : err ? (
					<div className="xuanshi-center"><Empty description={`载入失败:${err}`} /><span className="xuanshi-link" onClick={() => this.load()}>重试</span></div>
				) : !items.length ? <div className="xuanshi-center"><Empty description="无匹配人物" /></div> : (
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
						{items.map((m) => (
							<div className="xuanshi-card is-link" key={m.slug || m.id} onClick={() => this.openDetail(m.slug)}>
								<div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
									<span className="xuanshi-seal">{(m.name || '·')[0]}</span>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
											<span className="xuanshi-display is-h2" style={{ fontSize: 17 }}>{m.name}</span>
											{m.dynasty ? <span className="xuanshi-chip is-ink">{m.dynasty}</span> : null}
										</div>
										<div className="xuanshi-stat-sub" style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
											{m.one_liner || ''}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
				{total > PAGE_SIZE ? (
					<div style={{ marginTop: 18, textAlign: 'center' }}>
						<Pagination simple current={this.state.page} total={total} pageSize={PAGE_SIZE} showSizeChanger={false} onChange={(p) => this.setState({ page: p, selected: null }, () => this.load())} />
					</div>
				) : null}
			</div>
		);
	}
}
