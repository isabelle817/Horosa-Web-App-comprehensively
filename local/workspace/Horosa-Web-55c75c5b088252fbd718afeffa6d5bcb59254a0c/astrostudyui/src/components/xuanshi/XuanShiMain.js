import React from 'react';
import { Spin, Empty } from 'antd';
import {
	XUANSHI_SUBPAGES,
	loadXuanShiState,
	saveXuanShiState,
} from '../../utils/xuanshiState';
import { fetchSummary, fetchEvents, fetchDaily } from '../../services/xuanshi';
import XuanShiEvents from './XuanShiEvents';
import XuanShiCelestial from './XuanShiCelestial';
import XuanShiStories from './XuanShiStories';
import { resolveChartDate } from './xuanshiDate';
import XuanShiFigures from './XuanShiFigures';
import XuanShiMap from './XuanShiMap';
import XuanShiPersons from './XuanShiPersons';
import XuanShiTimeline from './XuanShiTimeline';
import XuanShiEncyclopedia from './XuanShiEncyclopedia';
import XuanShiSearch from './XuanShiSearch';
import DateTime from '../comp/DateTime';

// 玄学史(中国玄学史)主页 —— 忠实移植源 app 的「宣纸×墨×朱砂」古籍美学。
// 设计系统类在 xuanshiTheme.less(经 app.less @import 全局加载);三栏:左 子页导航 / 中 主区。
// 子页内容按阶段填充;本版:总览(/summary 真数据,hero + 统计 + 入口卡)+ 10 子页路由占位。

// 各子页入口卡(印章字 + 描述 + chip);desc 注入真实计数
const ENTRY_DEFS = [
	{ key: 'celestial', seal: '象', title: '星象大典', chip: '核心', chipCls: 'is-vermilion', desc: (c) => `${(c.celestial_events || 0).toLocaleString()} 条天象，按朝代 × 类型 × 史书三维聚合，热力矩阵与十年时序。` },
	{ key: 'events', seal: '玄', title: '玄学万象', chip: '检索', chipCls: 'is-ink', desc: (c) => `${(c.xuanxue_events || 0).toLocaleString()} 条正史与野载里的玄学事件，按朝代 / 史书 / 术法检索。` },
	{ key: 'figures', seal: '传', title: '人物列传', chip: '名家', chipCls: 'is-jade', desc: (c, e) => `${(e.figures_total || 0).toLocaleString()} 位术数名家列传与关联事件。` },
	{ key: 'map', seal: '舆', title: '玄学地图', chip: '空间', chipCls: 'is-ink', desc: (c) => `${c.map_points || 0} 处古都钉点，按朝代切片看活动中心迁移。` },
	{ key: 'persons', seal: '系', title: '人物关系', chip: '图谱', chipCls: 'is-gold', desc: (c) => `${(c.person_nodes || 0).toLocaleString()} 人共现网络，力导关系图谱。` },
	{ key: 'timeline', seal: '史', title: '朝代时间轴', chip: '时间', chipCls: 'is-ink', desc: () => '从先秦到明清，材料按朝代堆叠，可下钻到具体证据。' },
	{ key: 'encyclopedia', seal: '典', title: '词条百科', chip: '释义', chipCls: 'is-jade', desc: (c, e) => `术数 ${e.techniques_published || 0} · 天象 ${e.celestial_terms || 0} 词条与朝代释义，典源体例。` },
	{ key: 'stories', seal: '话', title: '故事专题', chip: '专题', chipCls: 'is-gold', desc: (c, e) => `${(e.stories_published || 0)} 篇玄学史话专题 —— 人物 × 术法 × 朝代串讲,可读可考。` },
	{ key: 'search', seal: '搜', title: '统一搜索', chip: '全库', chipCls: 'is-vermilion', desc: () => '跨事件 / 天象 / 人物 / 故事 / 词条全库检索 —— 库里任何内容都搜得到。' },
];

// 朝代 → 都城 [lng, lat, 名](联动排盘用;无朝代则按年代推断)
const CAPITALS = {
	'西周': [108.9, 34.27, '镐京'], '春秋': [112.45, 34.62, '洛邑'], '战国': [112.45, 34.62, '洛邑'], '秦': [108.9, 34.27, '咸阳'],
	'西汉': [108.9, 34.27, '长安'], '新莽': [108.9, 34.27, '长安'], '东汉': [112.45, 34.62, '洛阳'], '三国': [112.45, 34.62, '洛阳'],
	'西晋': [112.45, 34.62, '洛阳'], '东晋': [118.8, 32.06, '建康'], '十六国': [112.45, 34.62, '中原'], '南朝': [118.8, 32.06, '建康'],
	'北朝': [112.45, 34.62, '洛阳'], '隋': [108.9, 34.27, '大兴'], '唐': [108.9, 34.27, '长安'], '五代': [114.3, 34.8, '开封'],
	'北宋': [114.3, 34.8, '开封'], '南宋': [120.15, 30.27, '临安'], '辽': [116.4, 39.9, '燕京'], '金': [116.4, 39.9, '中都'],
	'元': [116.4, 39.9, '大都'], '明': [116.4, 39.9, '北京'], '清': [116.4, 39.9, '北京'],
};
function capitalForYear(y) {
	if (y < -256) { return [112.45, 34.62, '洛邑']; }   // 先秦 → 洛邑
	if (y < 25) { return [108.9, 34.27, '长安']; }        // 秦西汉 → 长安
	if (y < 589) { return [112.45, 34.62, '洛阳']; }      // 东汉魏晋南北朝 → 洛阳
	if (y < 907) { return [108.9, 34.27, '长安']; }       // 隋唐 → 长安
	if (y < 1127) { return [114.3, 34.8, '开封']; }       // 五代北宋 → 开封
	if (y < 1279) { return [120.15, 30.27, '临安']; }     // 南宋 → 临安
	return [116.4, 39.9, '北京'];                          // 元明清 → 北京
}

// 十进制度 → app 经纬字符串("DDDeMM"/"DDnMM");后端 convertLonStrToDegree 按此格式 split,传数字会 IndexOutOfBounds
function degToDM(d, posSym, negSym) {
	let a = Math.abs(d), deg = Math.floor(a), mn = Math.round((a - deg) * 60);
	if (mn >= 60) { deg += 1; mn -= 60; }
	return `${deg}${d >= 0 ? posSym : negSym}${mn < 10 ? '0' + mn : mn}`;
}

// 今日推送 pick_kind → 中文徽标(对齐参考 repo daily_pick)
const DAILY_KIND = { figure: '人物', story: '故事', technique: '术数', celestial_term: '天象', celestial_event: '星象', dynasty_term: '朝代' };

export default class XuanShiMain extends React.Component {
	constructor(props) {
		super(props);
		const persisted = loadXuanShiState();
		this.state = {
			subpage: persisted.subpage || 'overview',
			ui: persisted,
			summary: null,
			summaryLoading: false,
			summaryErr: '',
			daily: null,
			featured: null,
		};
	}

	componentDidMount() { this.loadSummary(); }

	persist(patch) {
		const ui = { ...this.state.ui, ...patch };
		this.setState({ ui });
		saveXuanShiState(ui);
	}

	setSubpage = (key) => {
		this.setState({ subpage: key });
		this.persist({ subpage: key });
	};

	// 联动:用某历史天象的公历日 + 朝代都城经纬,切到占星/七政并排该日之盘
	chartLink = (ev, tab) => {
		const { fields, dispatch, predictHook } = this.props;
		if (!fields || !dispatch || !ev) { return; }
		// 统一解析可起盘日期:精确 modern_date → year → 文本帝王纪年(襄公十四年)→ period 朝代段最早;无则不跳(不用 dynasty 兜底)
		const rd = resolveChartDate(ev);
		if (!rd) { return; }
		const md = rd.md, mdDisp = rd.disp;
		const m = /^(-?\d{1,4})-(\d{1,2})-(\d{1,2})/.exec(md);
		if (!m) { return; }
		const y = parseInt(m[1], 10), mo = parseInt(m[2], 10), da = parseInt(m[3], 10);
		if (!y || !mo || !da) { return; }
		const cap = CAPITALS[ev.dynasty] || capitalForYear(y);
		const baseZone = (fields.date && fields.date.value && fields.date.value.zone) || (fields.zone && fields.zone.value) || '+08:00';
		// 自定义 DateTime 构造历史日:ad=±1 支持公元前全范围;缺具体时刻默认中午 12 点
		const tm = new DateTime({ ad: y < 0 ? -1 : 1, year: Math.abs(y), month: mo, date: da, hour: 12, minute: 0, second: 0, zone: baseZone });
		if (typeof tm.calcJdn === 'function') { tm.calcJdn(); } // 算 jdn(构造器未算;部分下游依赖)
		// 地点名并入 name(避免改 pos 类型破坏 fieldsToParams);经纬走 lat/lon
		const nameStr = `玄学史·${ev.omen || ev.title || '事件'}·${cap[2] || ''}·${mdDisp || md}`;
		const newFields = {
			...fields,
			date: { ...fields.date, value: tm },
			time: { ...fields.time, value: tm },
			lon: { ...fields.lon, value: degToDM(cap[0], 'e', 'w') },  // 字符串格式,勿传数字
			lat: { ...fields.lat, value: degToDM(cap[1], 'n', 's') },
			gpsLon: fields.gpsLon ? { ...fields.gpsLon, value: cap[0] } : fields.gpsLon,
			gpsLat: fields.gpsLat ? { ...fields.gpsLat, value: cap[1] } : fields.gpsLat,
			pos: fields.pos ? { ...fields.pos, value: cap[2] || nameStr } : fields.pos,
			name: fields.name ? { ...fields.name, value: nameStr } : fields.name,
		};
		const t = tab || 'astrochart';
		if (t === 'planetarium') {
			// 天文馆:设 fields(日期/经纬)+切 tab + 触发其重算(纯天文,不走排盘)
			dispatch({ type: 'astro/save', payload: { currentTab: t, fields: newFields } });
			if (predictHook && predictHook.planetarium && predictHook.planetarium.fun) { predictHook.planetarium.fun(newFields); }
		} else {
			// 同步设 fields(名称/地点/日期立即反映,不用手动按确定)+切 tab;再算盘
			dispatch({ type: 'astro/save', payload: { currentTab: t, fields: newFields } });
			dispatch({ type: 'astro/nowChart', payload: { fields: newFields } });
		}
	};

	async loadSummary() {
		if (this.state.summary || this.state.summaryLoading) { return; }
		this.setState({ summaryLoading: true, summaryErr: '' });
		try {
			const summary = await fetchSummary();
			this.setState({ summary, summaryLoading: false });
		} catch (e) {
			this.setState({ summaryLoading: false, summaryErr: `${e && e.message ? e.message : e}` });
		}
		// 首页 taster(对齐参考 repo 首页):今日观象 + 玄典甄选;失败静默,不挡总览主体
		fetchDaily().then((d) => { if (d && !d.err && (d.title || d.blurb)) { this.setState({ daily: d }); } }).catch(() => {});
		fetchEvents({ page: 1, page_size: 6 }).then((r) => { this.setState({ featured: (r && r.items) || [] }); }).catch(() => {});
	}

	renderOverview() {
		const { summary, summaryLoading, summaryErr, daily, featured } = this.state;
		if (summaryLoading) { return <div className="xuanshi-center"><Spin tip="载入玄学史…" /></div>; }
		if (summaryErr) {
			return (
				<div className="xuanshi-center">
					<Empty description={`总览载入失败:${summaryErr}`} />
					<span className="xuanshi-link" onClick={() => this.loadSummary()}>重试</span>
				</div>
			);
		}
		if (!summary) { return <div className="xuanshi-center"><Empty description="暂无数据" /></div>; }
		const c = summary.counts || {};
		const trad = summary.events_by_tradition || {};
		const ed = summary.editorial || {};
		const cs = summary.celestial_summary || {};
		const stats = [
			{ num: c.xuanxue_events, label: '玄学事件', sub: `正史 ${trad['正史'] || 0} · 野载 ${trad['野载'] || 0}` },
			{ num: c.celestial_events, label: '星象事件', sub: `带公历 ${(cs.with_year || 0).toLocaleString()}` },
			{ num: ed.figures_total, label: '人物列传', sub: `已成 ${ed.figures_published || 0} · 共现 ${c.person_nodes || 0}` },
			{ num: ed.stories_published, label: '故事专题', sub: `术数词条 ${ed.techniques_published || 0}` },
			{ num: c.map_points, label: '地理钉点', sub: '玄学地图' },
			{ num: ed.translations_published, label: '白话译文', sub: `天象词条 ${ed.celestial_terms || 0} · 频道 ${ed.channels || 0}` },
		];
		return (
			<div>
				{/* hero */}
				<div className="xuanshi-eyebrow">中国玄学史 · 千年术数与玄虚之学</div>
				<h1 className="xuanshi-display is-hero" style={{ marginTop: 10 }}>
					二十四史里的玄虚与术数
				</h1>
				<div className="xuanshi-section-sub" style={{ maxWidth: 640, marginTop: 12 }}>
					正史与野载交叉的玄学事件、星象大典、人物列传，与玄学地图、关系图谱、朝代时间轴 ——
					一处可看、可学、可浏览的玄学史。星象事件可联动占星 / 七政四余排该历史日之盘。
				</div>

				{/* 统计卡 */}
				<div className="xuanshi-card" style={{ marginTop: 22 }}>
					<div className="xuanshi-stat-grid">
						{stats.map((s) => (
							<div className="xuanshi-stat" key={s.label}>
								<div className="xuanshi-stat-num">{s.num != null ? s.num.toLocaleString() : '—'}</div>
								<div className="xuanshi-stat-label">{s.label}</div>
								{s.sub ? <div className="xuanshi-stat-sub">{s.sub}</div> : null}
							</div>
						))}
					</div>
				</div>

				{/* 今日观象(对齐参考首页 daily_pick）*/}
				{daily && (daily.title || daily.blurb) ? (
					<div style={{ marginTop: 24 }}>
						<h2 className="xuanshi-display is-h2">今日观象</h2>
						<div className="xuanshi-card">
							<div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
								<span className="xuanshi-chip is-vermilion">{DAILY_KIND[daily.pick_kind] || '推送'}</span>
								<span className="xuanshi-display is-h2" style={{ fontSize: 18 }}>{daily.title}</span>
							</div>
							{daily.blurb ? <div className="xuanshi-prose" style={{ marginTop: 8, fontSize: 14 }}>{daily.blurb}</div> : null}
						</div>
					</div>
				) : null}

				{/* 玄典甄选(对齐参考首页 featured taster)*/}
				{featured && featured.length ? (
					<div style={{ marginTop: 24 }}>
						<div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
							<h2 className="xuanshi-display is-h2" style={{ margin: 0 }}>玄典甄选</h2>
							<span className="xuanshi-link" onClick={() => this.setSubpage('events')}>看更多 →</span>
						</div>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 14, marginTop: 12 }}>
							{featured.map((e) => (
								<div className="xuanshi-card is-link" key={e.event_id} onClick={() => this.setSubpage('events')}>
									<div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
										<span className={`xuanshi-chip ${e.tradition === '正史' ? 'is-gold' : 'is-ink'}`}>{e.tradition}</span>
										{e.dynasty ? <span className="xuanshi-chip is-ink">{e.dynasty}</span> : null}
									</div>
									<div className="xuanshi-display is-h2" style={{ fontSize: 15, lineHeight: 1.4 }}>{e.title}</div>
									<div className="xuanshi-stat-sub" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, opacity: 0.85, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
										{e.outcome || e.procedure || e.trigger || ''}
									</div>
								</div>
							))}
						</div>
					</div>
				) : null}

				<div className="xuanshi-deco-line" />

				<h2 className="xuanshi-display is-h2">分析视图</h2>
				<div className="xuanshi-section-sub">沿时间 / 空间 / 人物 / 术类四个轴看玄学史 —— 点卡进入。</div>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 16 }}>
					{ENTRY_DEFS.map((d) => (
						<div className="xuanshi-card is-link" key={d.key} onClick={() => this.setSubpage(d.key)}>
							<div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
								<span className="xuanshi-seal">{d.seal}</span>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<span className="xuanshi-display is-h2" style={{ fontSize: 18 }}>{d.title}</span>
										<span className={`xuanshi-chip ${d.chipCls}`}>{d.chip}</span>
									</div>
									<div className="xuanshi-stat-sub" style={{ marginTop: 7, fontSize: 12.5, lineHeight: 1.7, opacity: 0.85 }}>
										{d.desc(c, ed)}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>

				<div className="xuanshi-hint">原文与引文保留典籍出处标记,原样展示。全部数据(玄学事件 / 星象 / 人物列传 / 地理 / 关系 / 编辑层)随模块内置于本仓,离线可用、无外部依赖。</div>
			</div>
		);
	}

	renderSubpage() {
		const { subpage } = this.state;
		if (subpage === 'overview') { return this.renderOverview(); }
		if (subpage === 'events') {
			return <XuanShiEvents ui={this.state.ui} onPersist={(k, p) => this.persist({ [k]: { ...(this.state.ui[k] || {}), ...p } })} onChartLink={this.chartLink} />;
		}
		if (subpage === 'celestial') {
			return <XuanShiCelestial ui={this.state.ui} onPersist={(k, p) => this.persist({ [k]: { ...(this.state.ui[k] || {}), ...p } })} onChartLink={this.chartLink} />;
		}
		if (subpage === 'figures') {
			return <XuanShiFigures ui={this.state.ui} onPersist={(k, p) => this.persist({ [k]: { ...(this.state.ui[k] || {}), ...p } })} />;
		}
		if (subpage === 'map') {
			return <XuanShiMap ui={this.state.ui} onPersist={(k, p) => this.persist({ [k]: { ...(this.state.ui[k] || {}), ...p } })} />;
		}
		if (subpage === 'persons') {
			return <XuanShiPersons ui={this.state.ui} onPersist={(k, p) => this.persist({ [k]: { ...(this.state.ui[k] || {}), ...p } })} />;
		}
		if (subpage === 'stories') {
			return <XuanShiStories ui={this.state.ui} onPersist={(k, p) => this.persist({ [k]: { ...(this.state.ui[k] || {}), ...p } })} />;
		}
		if (subpage === 'timeline') {
			return <XuanShiTimeline ui={this.state.ui} onPersist={(k, p) => this.persist({ [k]: { ...(this.state.ui[k] || {}), ...p } })} />;
		}
		if (subpage === 'encyclopedia') {
			return <XuanShiEncyclopedia ui={this.state.ui} onPersist={(k, p) => this.persist({ [k]: { ...(this.state.ui[k] || {}), ...p } })} />;
		}
		if (subpage === 'search') {
			return <XuanShiSearch ui={this.state.ui} onPersist={(k, p) => this.persist({ [k]: { ...(this.state.ui[k] || {}), ...p } })} />;
		}
		const label = (XUANSHI_SUBPAGES.find((s) => s.key === subpage) || {}).label || subpage;
		return <div className="xuanshi-center"><Empty description={`「${label}」建设中`} /></div>;
	}

	render() {
		const height = this.props.height || 800;
		const { subpage } = this.state;
		return (
			<div className="xuanshi-app" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
				<div className="xuanshi-side">
					<div className="xuanshi-brand">
						<span className="xuanshi-seal">玄</span>
						<span className="xuanshi-brand-name">玄学史</span>
					</div>
					{XUANSHI_SUBPAGES.map((s) => (
						<div
							key={s.key}
							className={`xuanshi-nav-item${subpage === s.key ? ' is-active' : ''}`}
							onClick={() => this.setSubpage(s.key)}
						>{s.label}</div>
					))}
				</div>
				<div className="xuanshi-stage"><div className="xuanshi-stage-inner">{this.renderSubpage()}</div></div>
			</div>
		);
	}
}
