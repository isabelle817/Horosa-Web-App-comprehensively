import React from 'react';
import { Spin, Empty, Input } from 'antd';
import { fetchSearch, fetchCelestial, fetchFigures, fetchStories, fetchTechniques, fetchDynasties, fetchCelestialTerms } from '../../services/xuanshi';

// 统一搜索 —— 全库覆盖:并行多端点(玄学事件服务端搜 + 天象 + 人物真名) + 客户端过滤参考词条(术数/朝代/天象/故事)。
// 保证「库里任何内容都搜得到」:7类来源合并分组展示。/search 仅覆盖 xuanxue_event,故前端补齐其余表。
const arr = (r) => (Array.isArray(r) ? r : ((r && r.items) || []));

export default class XuanShiSearch extends React.Component {
	constructor(props) {
		super(props);
		const f = (props.ui && props.ui.search) || {};
		this.state = { q: f.q || '', groups: null, loading: false, err: '', refs: null };
	}

	async componentDidMount() {
		await this.loadRefs();
		if (this.state.q) { this.run(this.state.q); }
	}

	async loadRefs() {
		try {
			const [t, d, c, s] = await Promise.all([
				fetchTechniques().catch(() => []), fetchDynasties().catch(() => []),
				fetchCelestialTerms().catch(() => []), fetchStories({}).catch(() => []),
			]);
			this.setState({ refs: { techniques: arr(t), dynasties: arr(d), terms: arr(c), stories: arr(s) } });
		} catch (e) { this.setState({ refs: { techniques: [], dynasties: [], terms: [], stories: [] } }); }
	}

	persist() { if (this.props.onPersist) { this.props.onPersist('search', { q: this.state.q }); } }

	async run(q) {
		if (!q || !q.trim()) { this.setState({ groups: null, q: '' }); return; }
		this.setState({ loading: true, err: '', q });
		try {
			const [ev, cel, fig] = await Promise.all([
				fetchSearch({ q }).catch(() => []),
				fetchCelestial({ q, page_size: 20 }).catch(() => ({})),
				fetchFigures({ status: 'all', q, limit: 24 }).catch(() => ({})),
			]);
			const refs = this.state.refs || { techniques: [], dynasties: [], terms: [], stories: [] };
			const ql = q.toLowerCase();
			const filt = (a) => (a || []).filter((x) => `${x.name || ''}${x.one_liner || ''}${x.alt_names || ''}${x.title || ''}`.toLowerCase().includes(ql));
			const groups = [
				{ key: 'events', label: '玄学事件', items: arr(ev).map((x) => ({ title: x.title, sub: `${x.dynasty || ''}${x.history ? ' · 《' + x.history + '》' : ''}`, snip: x.original_text || x.modern_text })) },
				{ key: 'celestial', label: '天象', items: ((cel && cel.events) || []).map((x) => ({ title: `${x.omen || '天象'} · ${x.dynasty || ''}`, sub: x.modern_date_disp || '', snip: x.original })) },
				{ key: 'figures', label: '人物列传', items: ((fig && fig.items) || []).map((x) => ({ title: x.name, sub: x.dynasty || '', snip: x.one_liner })) },
				{ key: 'stories', label: '故事专题', items: filt(refs.stories).map((x) => ({ title: x.title || x.name, sub: '', snip: x.one_liner || x.summary })) },
				{ key: 'tech', label: '术数词条', items: filt(refs.techniques).map((x) => ({ title: x.name, sub: x.category || '', snip: x.one_liner })) },
				{ key: 'dyn', label: '朝代词条', items: filt(refs.dynasties).map((x) => ({ title: x.name, sub: '', snip: x.one_liner })) },
				{ key: 'terms', label: '天象词条', items: filt(refs.terms).map((x) => ({ title: x.name, sub: x.alt_names && x.alt_names !== 'None' ? x.alt_names : '', snip: x.one_liner })) },
			].filter((g) => g.items.length);
			this.setState({ groups, loading: false });
			this.persist();
		} catch (e) { this.setState({ loading: false, err: `${e && e.message ? e.message : e}` }); }
	}

	render() {
		const { q, groups, loading, err } = this.state;
		const total = groups ? groups.reduce((n, g) => n + g.items.length, 0) : 0;
		return (
			<div>
				<div className="xuanshi-eyebrow">统一搜索</div>
				<h2 className="xuanshi-display is-h2" style={{ marginTop: 6 }}>全库检索 · 事件 / 天象 / 人物 / 词条</h2>
				<div style={{ margin: '16px 0' }}>
					<Input.Search placeholder="搜全库:人名 / 朝代 / 术法 / 天象 / 关键词" allowClear enterButton size="large" style={{ maxWidth: 560 }} defaultValue={q} onSearch={(v) => this.run(v)} />
				</div>
				{loading ? <div className="xuanshi-center"><Spin tip="全库检索…" /></div> : err ? (
					<div className="xuanshi-center"><Empty description={`检索失败:${err}`} /></div>
				) : !groups ? (
					<div className="xuanshi-hint">输入关键词,跨「玄学事件 / 天象 / 人物列传 / 故事 / 术数·朝代·天象词条」全库检索 —— 库里任何内容都搜得到。</div>
				) : !total ? (
					<div className="xuanshi-center"><Empty description={`「${q}」无匹配`} /></div>
				) : (
					<div>
						<div className="xuanshi-section-sub">共 {total} 条匹配,跨 {groups.length} 类来源</div>
						{groups.map((g) => (
							<div key={g.key} style={{ marginBottom: 24 }}>
								<div className="xuanshi-stat-label" style={{ textAlign: 'left', marginBottom: 8 }}>{g.label}({g.items.length})</div>
								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
									{g.items.slice(0, 12).map((it, i) => (
										<div className="xuanshi-card" key={i}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
												<span className="xuanshi-display is-h2" style={{ fontSize: 15 }}>{it.title}</span>
												{it.sub ? <span className="xuanshi-chip is-ink">{it.sub}</span> : null}
											</div>
											{it.snip ? <div className="xuanshi-stat-sub" style={{ fontSize: 12, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.snip}</div> : null}
										</div>
									))}
								</div>
								{g.items.length > 12 ? <div className="xuanshi-stat-sub" style={{ marginTop: 6 }}>…另 {g.items.length - 12} 条</div> : null}
							</div>
						))}
					</div>
				)}
			</div>
		);
	}
}
