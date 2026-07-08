import React from 'react';
import { Spin, Empty, Pagination, Select, Input } from 'antd';
import { fetchEvents, fetchEvent, fetchSummary } from '../../services/xuanshi';
import { marked } from 'marked';
import { resolveChartDate, collapseSoftBreaks } from './xuanshiDate';

// 白话与原文字符集重合度 >0.85 视为近乎相同(源库少数硬古文白话≈原文)→ 隐藏白话免冗余
function nearSame(a, b) { if (!a || !b) { return false; } const sa = new Set(a), sb = new Set(b); let inter = 0; sa.forEach((c) => { if (sb.has(c)) { inter++; } }); return inter / Math.max(sa.size, sb.size, 1) > 0.85; }

// 玄学万象 —— 正史 / 野载 玄学事件浏览(顶部过滤 + 卡片列表 + 分页 + 点击详情)。
// 忠实源 browse.html:tradition 切换 / facet 过滤 / 已选 chip / 列表 / 详情(original_text 原样含出处)。
const TRADITIONS = [
	{ key: '', label: '全部' },
	{ key: '正史', label: '正史' },
	{ key: '野载', label: '野载' },
];

function splitList(s) {
	if (!s) { return []; }
	return `${s}`.split(/[;,、，]\s*/).map((x) => x.trim()).filter(Boolean);
}

export default class XuanShiEvents extends React.Component {
	constructor(props) {
		super(props);
		const f = (props.ui && props.ui.events) || {};
		this.state = {
			tradition: f.tradition || '',
			dynasty: f.dynasty || '',
			q: f.q || '',
			page: f.page || 1,
			items: [], total: 0, pages: 0,
			loading: false, err: '',
			facets: null,
			selected: null, detailLoading: false,
		};
	}

	componentDidMount() {
		this.load();
		fetchSummary().then((s) => this.setState({ facets: s.event_facets || {} })).catch(() => {});
	}

	persist() {
		if (this.props.onPersist) {
			this.props.onPersist('events', { tradition: this.state.tradition, dynasty: this.state.dynasty, q: this.state.q, page: this.state.page });
		}
	}

	async load() {
		this.setState({ loading: true, err: '' });
		try {
			const r = await fetchEvents({
				tradition: this.state.tradition || undefined,
				dynasty: this.state.dynasty || undefined,
				q: this.state.q || undefined,
				page: this.state.page,
				page_size: 20,
			});
			this.setState({ items: r.items || [], total: r.total || 0, pages: r.pages || 0, loading: false });
		} catch (e) {
			this.setState({ loading: false, err: `${e && e.message ? e.message : e}` });
		}
		this.persist();
	}

	setFilter(patch, resetPage = true) {
		this.setState({ ...patch, ...(resetPage ? { page: 1 } : {}) }, () => this.load());
	}

	async openDetail(id) {
		this.setState({ detailLoading: true, selected: { event_id: id } });
		try {
			const d = await fetchEvent(id);
			this.setState({ selected: d, detailLoading: false });
		} catch (e) {
			this.setState({ detailLoading: false, selected: { event_id: id, _err: `${e}` } });
		}
	}

	renderDetail() {
		const d = this.state.selected;
		if (this.state.detailLoading || !d.title) {
			if (!d._err) { return <div className="xuanshi-center"><Spin tip="载入事件…" /></div>; }
		}
		if (d._err) { return <div className="xuanshi-center"><Empty description={`载入失败:${d._err}`} /></div>; }
		const field = (label, val) => (val ? (
			<div style={{ marginBottom: 14 }}>
				<div className="xuanshi-stat-label" style={{ textAlign: 'left', letterSpacing: '.1em' }}>{label}</div>
				<div className="xuanshi-prose" style={{ marginTop: 4 }} dangerouslySetInnerHTML={{ __html: marked.parse(collapseSoftBreaks(String(val)), { gfm: true, breaks: false }) }} />
			</div>
		) : null);
		const metaText = (label, val) => (val && String(val).trim() ? (
			<div style={{ marginBottom: 11 }}>
				<div className="xuanshi-stat-label" style={{ textAlign: 'left', fontSize: 11 }}>{label}</div>
				<div style={{ marginTop: 2, fontSize: 12.5, lineHeight: 1.65, color: 'var(--ink-soft)' }}>{val}</div>
			</div>
		) : null);
		const metaChips = (label, val) => { const arr = splitList(val); return arr.length ? (
			<div style={{ marginBottom: 11 }}>
				<div className="xuanshi-stat-label" style={{ textAlign: 'left', fontSize: 11 }}>{label}</div>
				<div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>{arr.map((t, i) => <span className="xuanshi-chip is-ink" key={i}>{t}</span>)}</div>
			</div>
		) : null; };
		const hasMeta = d.operators || d.targets || d.techniques || d.region || d.period || d.trigger || d.reliability_note || d.version_risk || d.cross_ref;
		return (
			<div>
				<span className="xuanshi-link" onClick={() => this.setState({ selected: null })}>← 返回列表</span>
				<h2 className="xuanshi-display is-h2" style={{ marginTop: 12 }}>{d.title}</h2>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 18px' }}>
					{d.tradition ? <span className="xuanshi-chip is-vermilion">{d.tradition}</span> : null}
					{d.dynasty ? <span className="xuanshi-chip is-ink">{d.dynasty}</span> : null}
					{d.history ? <span className="xuanshi-chip is-gold">《{d.history}》{d.volume_no ? `卷${d.volume_no}` : ''}</span> : null}
					{d.evidence ? <span className="xuanshi-chip">证据 {d.evidence}</span> : null}
				</div>
				<div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
					<div style={{ flex: '1 1 440px', minWidth: 0, maxWidth: 880 }}>
						{field('原文', d.original_text)}
						{nearSame(d.modern_text, d.original_text) ? null : field('白话', d.modern_text)}
						{field('解读', d.reading)}
						{field('过程', d.procedure)}
						{field('结果', d.outcome)}
						{field('点睛', d.dianjing)}
						{(() => {
							const rd = this.props.onChartLink ? resolveChartDate(d) : null;
							if (!rd) { return null; }
							return (
								<div style={{ marginTop: 18 }}>
									<div className="xuanshi-hint" style={{ marginTop: 0, marginBottom: 8 }}>{rd.exact ? `公历 ${rd.md}` : `此事${d.period ? `「${d.period}」` : ''}——按 ${rd.disp} 正午起盘`} · 地点按朝代都城近似</div>
									<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
										<span className="xuanshi-btn is-primary" onClick={() => this.props.onChartLink(d, 'astrochart')}>排此时 · 占星盘</span>
										<span className="xuanshi-btn" onClick={() => this.props.onChartLink(d, 'guolao')}>排此时 · 七政四余</span>
										<span className="xuanshi-btn" onClick={() => this.props.onChartLink(d, 'planetarium')}>此时此地 · 天文馆</span>
									</div>
								</div>
							);
						})()}
					</div>
					{hasMeta ? (
						<aside className="xuanshi-card" style={{ flex: '0 0 300px', alignSelf: 'flex-start' }}>
							<div className="xuanshi-stat-label" style={{ textAlign: 'left', marginBottom: 12, color: 'var(--vermilion)', letterSpacing: '.1em' }}>事件档案</div>
							{metaChips('术者', d.operators)}
							{metaChips('对象', d.targets)}
							{metaChips('技法', d.techniques)}
							{metaText('地域', d.region)}
							{metaText('时期', d.period)}
							{metaText('触发', d.trigger)}
							{metaText('可靠性', d.reliability_note)}
							{metaText('版本风险', d.version_risk)}
							{metaText('互见', d.cross_ref)}
						</aside>
					) : null}
				</div>
			</div>
		);
	}

	render() {
		if (this.state.selected) { return this.renderDetail(); }
		const { items, total, pages, page, loading, err, facets } = this.state;
		const dynastyOpts = ((facets && facets.dynasties) || []).map((d) => Array.isArray(d) ? { value: d[0], label: `${d[0]} (${d[1]})` } : { value: d, label: d });
		return (
			<div>
				<div className="xuanshi-eyebrow">玄学万象</div>
				<h2 className="xuanshi-display is-h2" style={{ marginTop: 6 }}>正史 · 野载 · 玄学事件</h2>
				{/* 过滤条 */}
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', margin: '16px 0 14px' }}>
					<div style={{ display: 'inline-flex', gap: 4, padding: 3, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--paper-card)' }}>
						{TRADITIONS.map((t) => (
							<span key={t.key}
								className={`xuanshi-chip ${this.state.tradition === t.key ? 'is-vermilion' : 'is-ink'}`}
								style={{ cursor: 'pointer', border: 'none' }}
								onClick={() => this.setFilter({ tradition: t.key })}>{t.label}</span>
						))}
					</div>
					<Select allowClear showSearch placeholder="朝代 / 类别" size="small" style={{ minWidth: 160 }}
						value={this.state.dynasty || undefined}
						options={dynastyOpts}
						onChange={(v) => this.setFilter({ dynasty: v || '' })}
						filterOption={(i, o) => (o.label || '').indexOf(i) >= 0} />
					<Input.Search placeholder="标题 / 关键词" allowClear size="small" style={{ width: 220 }}
						defaultValue={this.state.q}
						onSearch={(v) => this.setFilter({ q: v })} />
					<span className="xuanshi-stat-sub" style={{ marginLeft: 'auto' }}>{total.toLocaleString()} 条</span>
				</div>

				{loading ? <div className="xuanshi-center"><Spin tip="检索…" /></div> : err ? (
					<div className="xuanshi-center"><Empty description={`载入失败:${err}`} /><span className="xuanshi-link" onClick={() => this.load()}>重试</span></div>
				) : !items.length ? <div className="xuanshi-center"><Empty description="无匹配事件" /></div> : (
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 14 }}>
						{items.map((e) => (
							<div className="xuanshi-card is-link" key={e.event_id} onClick={() => this.openDetail(e.event_id)}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
									<span className={`xuanshi-chip ${e.tradition === '正史' ? 'is-gold' : 'is-ink'}`}>{e.tradition}</span>
									{e.dynasty ? <span className="xuanshi-chip is-ink">{e.dynasty}</span> : null}
								</div>
								<div className="xuanshi-display is-h2" style={{ fontSize: 16, lineHeight: 1.4 }}>{e.title}</div>
								<div className="xuanshi-stat-sub" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.65, opacity: 0.85, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
									{e.outcome || e.procedure || e.trigger || ''}
								</div>
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 9 }}>
									{splitList(e.techniques).slice(0, 3).map((t) => <span className="xuanshi-chip is-jade" key={t}>{t}</span>)}
								</div>
							</div>
						))}
					</div>
				)}

				{pages > 1 ? (
					<div style={{ marginTop: 20, textAlign: 'center' }}>
						<Pagination simple current={page} total={total} pageSize={20} showSizeChanger={false}
							onChange={(p) => this.setState({ page: p }, () => this.load())} />
					</div>
				) : null}
			</div>
		);
	}
}
