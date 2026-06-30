// 六爻装卦表 + 用神 + 动变 + 旬空(展示层)。纯展示:吃 analyzeLiuyao 产出,流派/开关一变即随之刷新。
// 配色统一走 --horosa-* 暗黑令牌 + 五行(八字)色板,明暗两态均清晰。
import React from 'react';
import { CHISHI_JUE, FADONG_JUE, LIUSHEN_FADONG, YAOWEI_XIANG, ZHANLEI_GANGYAO } from '../gua/liuyaoReference';

// 设计令牌(暗黑友好,带回落)
const C = {
	text: 'var(--horosa-astro-text, #efe4d2)',
	muted: 'var(--horosa-astro-muted, #928b82)',
	label: 'var(--horosa-astro-label, #d6c7b0)',
	line: 'var(--horosa-astro-line, rgba(215,173,105,0.18))',
	lineStrong: 'var(--horosa-astro-line-strong, rgba(231,190,119,0.42))',
	panel: 'var(--horosa-astro-panel, #0d1d2b)',
	accent: 'var(--horosa-accent, #e7bd75)',
	accentSoft: 'var(--horosa-accent-soft, rgba(231,189,117,0.14))',
	danger: 'var(--horosa-danger, #ff756c)',
	jade: 'var(--horosa-jade, #73c59a)',
	cinnabar: 'var(--horosa-cinnabar, #ec644e)',
};
// 五行(八字)色 —— 六亲按其爻五行着色,与全 app 干支配色统一
const WX_COLOR = {
	木: 'var(--horosa-bazi-wood, #66c486)',
	火: 'var(--horosa-bazi-fire, #ff5f50)',
	土: 'var(--horosa-bazi-earth, #c08a4c)',
	金: 'var(--horosa-bazi-metal, #f0c979)',
	水: 'var(--horosa-bazi-water, #5f8fff)',
};
const WANGSHUAI_COLOR = { 旺: C.jade, 相: C.jade, 休: C.muted, 囚: C.danger, 死: C.danger };

function yaoSymbol(yin){ return yin ? '⚋' : '⚊'; }

function Cell({ children, style, title, align }){
	return (
		<td title={title} style={{ padding: '5px 7px', borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap', textAlign: align || 'left', ...style }}>{children}</td>
	);
}
function Th({ children, style }){
	return <th style={{ padding: '6px 7px', borderBottom: `1.5px solid ${C.lineStrong}`, color: C.label, fontWeight: 600, fontSize: 12, textAlign: 'left', whiteSpace: 'nowrap', ...style }}>{children}</th>;
}

// ── 旬空卡(右栏顶) ──
export function LiuYaoXunKong({ analysis }){
	if(!analysis){ return null; }
	const day = analysis.kongPair || '—';
	const mon = analysis.monthKong || '';
	return (
		<div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 10px', marginBottom: 8, background: C.accentSoft, border: `1px solid ${C.line}`, borderRadius: 6, fontSize: 13, color: C.text }}>
			<span style={{ color: C.label, fontWeight: 600 }}>旬空</span>
			<span>日空 <b style={{ color: C.accent }}>{day}</b></span>
			{mon ? <span>月空 <b style={{ color: C.accent }}>{mon}</b></span> : null}
		</div>
	);
}

export function LiuYaoZhuangTable({ analysis, movingSet, title, hideXunKong }){
	if(!analysis || !analysis.yaos){ return null; }
	const { yaos, shenSha, liuShen, fushenAll, guaShen, palaceType, settings, guaXing, heHui } = analysis;
	const moving = movingSet || new Set();
	const shaPer = shenSha && shenSha.perYao ? shenSha.perYao : null;
	const shenBody = guaShen ? guaShen.body : null;
	const showSha = !!(settings && settings.shensha && settings.shensha.on);
	const showLiu = !!(settings && settings.sixGods);
	const showBian = moving.size > 0;
	const rows = yaos.slice().reverse(); // 上爻在上
	return (
		<div>
			{title ? <div style={{ fontSize: 13, fontWeight: 600, color: C.label, margin: '2px 0 6px' }}>{title}</div> : null}
			{hideXunKong ? null : <LiuYaoXunKong analysis={analysis} />}
			<div style={{ overflowX: 'auto', border: `1px solid ${C.line}`, borderRadius: 8 }}>
				<table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', color: C.text }}>
					<thead>
						<tr style={{ background: C.accentSoft }}>
							{showLiu ? <Th>六神</Th> : null}
							<Th>伏神</Th>
							<Th>本卦六爻</Th>
							<Th style={{ textAlign: 'center' }}>世应</Th>
							<Th style={{ textAlign: 'center' }}>旺衰</Th>
							<Th>状态</Th>
							{showSha ? <Th>神煞</Th> : null}
							{showBian ? <Th>动→变</Th> : null}
						</tr>
					</thead>
					<tbody>
						{rows.map((y) => {
							const idx = y.pos - 1;
							const isMoving = moving.has(y.pos);
							const fu = (fushenAll && fushenAll[idx]) || y.fushen;
							const liu = showLiu && liuShen && liuShen[idx] ? liuShen[idx].liushen : '';
							const shaList = shaPer && shaPer[idx] ? shaPer[idx].shensha : [];
							const statusTags = [];
							if(y.yuePo){ statusTags.push({ t: '月破' + (settings && settings.yuepoMode === 'always' ? '·长期' : '·当月'), c: C.danger }); }
							if(y.xunKong){ statusTags.push({ t: y.voidKind || '旬空', c: y.voidKind === '真空' ? C.danger : C.accent }); }
							if(y.ruMu){ statusTags.push({ t: '入墓', c: C.accent }); }
							if(y.changsheng === '长生' || y.changsheng === '帝旺'){ statusTags.push({ t: y.changsheng, c: C.jade }); }
							else if(y.changsheng === '绝'){ statusTags.push({ t: '绝', c: C.danger }); }
							const isShen = shenBody && y.zhi === shenBody;
							return (
								<tr key={y.pos} style={isMoving ? { background: C.accentSoft } : null}>
									{showLiu ? <Cell style={{ color: C.muted }}>{liu}</Cell> : null}
									<Cell style={{ color: C.muted, fontSize: 12 }}>
										{fu && fu.liuqin ? <span><span style={{ color: WX_COLOR[fu.wuxing] || C.muted }}>{fu.zhi}{fu.wuxing}</span>{fu.liuqin}</span> : '—'}
									</Cell>
									<Cell>
										<span style={{ fontFamily: 'monospace', fontSize: 16, color: isMoving ? C.accent : C.text, marginRight: 6 }}>{yaoSymbol(y.yin)}</span>
										<span style={{ color: WX_COLOR[y.wuxing] || C.text, fontWeight: 600 }}>{y.zhi}{y.wuxing}</span>
										<span style={{ color: C.text, marginLeft: 2 }}>{y.liuqin}</span>
										{isMoving ? <span style={{ color: C.accent, marginLeft: 4, fontSize: 12 }}>{y.yin ? '✕' : '○'}</span> : null}
										{isShen ? <span title="卦身" style={{ marginLeft: 4, color: C.cinnabar }}>★</span> : null}
									</Cell>
									<Cell align="center" style={{ fontWeight: 700, color: y.shiYing === '世' ? C.cinnabar : (y.shiYing === '应' ? C.accent : C.muted) }}>{y.shiYing || ''}</Cell>
									<Cell align="center" style={{ color: WANGSHUAI_COLOR[y.wangShuai] || C.text, fontWeight: 600 }}>{y.wangShuai}</Cell>
									<Cell style={{ fontSize: 12 }}>
										{statusTags.length ? statusTags.map((s, i) => (<span key={i} style={{ color: s.c, marginRight: 5 }}>{s.t}</span>)) : <span style={{ color: C.muted }}>—</span>}
									</Cell>
									{showSha ? <Cell style={{ fontSize: 12, color: C.muted }}>{(shaList || []).join('·') || '—'}</Cell> : null}
									{showBian ? <Cell style={{ fontSize: 12 }}>{renderBianCell(analysis, y.pos)}</Cell> : null}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>
				卦序：<span style={{ color: C.label }}>{palaceType ? `${palaceType.palace}宫·${palaceType.type}` : '—'}</span>
				{guaShen ? <span>　卦身：<span style={{ color: C.cinnabar }}>{guaShen.body}</span>{guaShen.onChart ? '' : '(不上卦)'}</span> : ''}
				{guaXing && guaXing.ben ? <span>　卦象：<span style={{ color: C.accent }}>{guaXing.ben}</span>{guaXing.bian ? <span>→{guaXing.bian}</span> : ''}</span> : ''}
				{heHui && heHui.length ? <span>　<span style={{ color: C.jade }}>{heHui.map((h) => `${h.type}(${h.zhis}${h.wuxing}${h.hasMoving ? '·动' : ''})`).join('、')}</span></span> : ''}
			</div>
		</div>
	);
}

function renderBianCell(analysis, pos){
	const db = analysis.dongBian;
	if(!db || !db.moves){ return ''; }
	const m = db.moves.find((x) => x.pos === pos);
	if(!m){ return <span style={{ color: C.muted }}>—</span>; }
	const tags = [];
	if(m.jinShen){ tags.push('进神'); }
	if(m.tuiShen){ tags.push('退神'); }
	if(m.fanYin){ tags.push('反吟'); }
	if(m.fuYin){ tags.push('伏吟'); }
	if(m.huiTou.sheng){ tags.push('回头生'); }
	if(m.huiTou.ke){ tags.push('回头克'); }
	if(m.huiTou.chong){ tags.push('回头冲'); }
	if(m.huiTou.he){ tags.push('回头合'); }
	if(m.huaKong){ tags.push('化空'); }
	if(m.huaPo){ tags.push('化破'); }
	if(m.huaMu){ tags.push('化墓'); }
	if(m.huaJue){ tags.push('化绝'); }
	return (
		<span>
			<span style={{ color: WX_COLOR[m.bian.wuxing] || C.text }}>{m.bian.zhi}{m.bian.wuxing}</span>
			<span>{m.bian.liuqin}</span>
			{tags.length ? <span style={{ color: C.accent, marginLeft: 4 }}>{tags.join('·')}</span> : null}
		</span>
	);
}

// ── 关联卦(之/互/伏神/综/错):各卦完整装卦(与本卦同口径,六亲以本卦宫为我) ──
const EMPTY_SET = new Set();
export function LiuYaoRelatedCards({ analysis }){
	if(!analysis || !analysis.related){ return null; }
	const r = analysis.related;
	const cards = [
		{ key: 'bian', label: '之卦', a: r.bian },
		{ key: 'hu', label: '互卦', a: r.hu },
		{ key: 'fu', label: '伏神卦', a: r.fu },
		{ key: 'zong', label: '综卦', a: r.zong },
		{ key: 'cuo', label: '错卦', a: r.cuo },
	].filter((c) => c.a && c.a.yaos);
	if(!cards.length){ return null; }
	return (
		<div style={{ marginTop: 14 }}>
			<div style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginBottom: 8, borderTop: `1px solid ${C.lineStrong}`, paddingTop: 10 }}>关联卦（完整装卦 · 六亲皆按本卦宫）</div>
			{cards.map((c) => {
				const typ = c.a.palaceType ? `${c.a.palaceType.palace}宫·${c.a.palaceType.type}` : '';
				return (
					<div key={c.key} style={{ marginBottom: 14 }}>
						<LiuYaoZhuangTable analysis={c.a} movingSet={EMPTY_SET} title={`${c.label}　${c.a.name}${typ ? `（${typ}）` : ''}`} hideXunKong />
					</div>
				);
			})}
		</div>
	);
}

// ── 用神视图 ──
export function LiuYaoYongShenView({ analysis }){
	if(!analysis || !analysis.yongShen){ return null; }
	const ys = analysis.yongShen;
	const locTxt = (loc) => {
		if(!loc || !loc.candidates || loc.candidates.length === 0){ return <span style={{ color: C.muted }}>不上卦{hasFu(analysis) ? '(看伏神)' : ''}</span>; }
		return loc.candidates.map((cc) => `第${cc.pos}爻${cc.flags && cc.flags.length ? '(' + cc.flags.join('·') + ')' : ''}`).join('、');
	};
	const rows = [
		{ k: '占测事项', v: ys.label, hi: C.accent },
		{ k: '用神', v: <span><b style={{ color: C.cinnabar }}>{ys.yong}</b>　{locTxt(ys.located.yong)}</span> },
	];
	if(ys.secondary && ys.located.secondary){ rows.push({ k: '次用神', v: <span><b>{ys.secondary}</b>　{locTxt(ys.located.secondary)}</span> }); }
	if(ys.roles){
		rows.push({ k: '原神(生用神)', v: <span><b style={{ color: C.jade }}>{ys.roles.yuan}</b>　{locTxt(ys.located.yuan)}</span> });
		rows.push({ k: '忌神(克用神)', v: <span><b style={{ color: C.danger }}>{ys.roles.ji}</b>　{locTxt(ys.located.ji)}</span> });
		rows.push({ k: '仇神(生忌神)', v: <span><b style={{ color: C.accent }}>{ys.roles.chou}</b>　{locTxt(ys.located.chou)}</span> });
	}
	if(analysis.guaShen){ rows.push({ k: '卦身', v: <span><b style={{ color: C.cinnabar }}>{analysis.guaShen.body}</b>{analysis.guaShen.onChart ? '(上卦)' : '(不上卦)'}</span> }); }
	if(ys.note){ rows.push({ k: '取用说明', v: <span style={{ color: C.muted }}>{ys.note}</span> }); }
	return (
		<div style={{ fontSize: 13, color: C.text, border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
			{rows.map((r, i) => (
				<div key={r.k} style={{ display: 'flex', padding: '7px 10px', background: i % 2 ? 'transparent' : C.accentSoft, borderBottom: i < rows.length - 1 ? `1px solid ${C.line}` : 'none' }}>
					<div style={{ width: 104, color: C.label, flex: '0 0 auto', fontWeight: 600 }}>{r.k}</div>
					<div style={{ flex: 1, color: r.hi || C.text }}>{r.v}</div>
				</div>
			))}
		</div>
	);
}

function hasFu(analysis){ return analysis.yaos && analysis.yaos.some((y) => y.fushen); }

// ── 神煞视图(概览):各神煞落支 + 临爻 ──
export function LiuYaoShenShaView({ analysis }){
	if(!analysis || !analysis.shenSha){ return null; } // 神煞开关关 → 不显
	const shaMap = analysis.shenSha.shaMap || {};
	const perYao = analysis.shenSha.perYao || [];
	const names = Object.keys(shaMap);
	if(!names.length){ return <div style={{ color: C.muted, fontSize: 12 }}>(已启用神煞,本盘无落支)</div>; }
	return (
		<div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
			{names.map((nm, i) => {
				const zhis = shaMap[nm] || [];
				const onYao = perYao.filter((y) => y.shensha && y.shensha.indexOf(nm) >= 0).map((y) => `${y.pos}爻`);
				return (
					<div key={nm} style={{ display: 'flex', padding: '6px 10px', background: i % 2 ? 'transparent' : C.accentSoft, borderBottom: i < names.length - 1 ? `1px solid ${C.line}` : 'none', fontSize: 13 }}>
						<div style={{ width: 84, color: C.label, fontWeight: 600, flex: '0 0 auto' }}>{nm}</div>
						<div style={{ flex: 1 }}>
							<span style={{ color: C.accent }}>{zhis.join('、')}</span>
							<span style={{ color: onYao.length ? C.cinnabar : C.muted, marginLeft: 10 }}>{onYao.length ? `临 ${onYao.join('/')}` : '不上卦'}</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}

// ── 动变视图 ──
export function LiuYaoDongBianView({ analysis }){
	if(!analysis || !analysis.dongBian){ return null; }
	const db = analysis.dongBian;
	const related = analysis.related || {};
	if(db.movingCount === 0){
		return (
			<div style={{ fontSize: 13, color: C.text }}>
				<div style={{ color: C.muted, padding: '8px 10px', background: C.accentSoft, borderRadius: 6 }}>无动爻,卦不变(静卦,以世应、用神旺衰断)。</div>
				<RelatedLine related={related} />
			</div>
		);
	}
	return (
		<div style={{ fontSize: 13, color: C.text }}>
			<div style={{ marginBottom: 8, padding: '7px 10px', background: C.accentSoft, borderRadius: 6 }}>
				变卦：<b style={{ color: C.accent }}>{db.bianGua ? db.bianGua.name : '—'}</b>
				{db.guaFuYin ? <span style={{ color: C.danger }}>　(卦伏吟)</span> : ''}{db.guaFanYin ? <span style={{ color: C.danger }}>　(卦反吟)</span> : ''}
			</div>
			<div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
				{db.moves.map((m, i) => (
					<div key={m.pos} style={{ padding: '7px 10px', borderBottom: i < db.moves.length - 1 ? `1px solid ${C.line}` : 'none' }}>
						<span style={{ color: C.label }}>第{m.pos}爻</span>
						<span style={{ color: WX_COLOR[m.ben.wuxing] || C.text }}>{m.ben.zhi}{m.ben.wuxing}</span>{m.ben.liuqin}
						<span style={{ color: C.muted, margin: '0 6px' }}>→</span>
						<span style={{ color: WX_COLOR[m.bian.wuxing] || C.text }}>{m.bian.zhi}{m.bian.wuxing}</span>{m.bian.liuqin}
						<span style={{ marginLeft: 8, color: C.accent, fontSize: 12 }}>{bianTags(m)}</span>
					</div>
				))}
			</div>
			{db.blindEffects && db.blindEffects.length ? (
				<div style={{ marginTop: 8, padding: '7px 10px', background: C.accentSoft, borderRadius: 6 }}>
					<div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 4 }}>盲派 · 变爻作用本卦他爻</div>
					{db.blindEffects.map((e, i) => (
						<div key={i} style={{ fontSize: 12, color: C.text, padding: '1px 0' }}>
							第{e.from}爻(变)<span style={{ color: C.muted, margin: '0 4px' }}>{e.rel}</span>第{e.to}爻 {e.toLiuqin}
						</div>
					))}
				</div>
			) : null}
			<RelatedLine related={related} />
		</div>
	);
}

function bianTags(m){
	const t = [];
	if(m.jinShen){ t.push('进神'); } if(m.tuiShen){ t.push('退神'); }
	if(m.fanYin){ t.push('反吟'); } if(m.fuYin){ t.push('伏吟'); }
	if(m.huiTou.sheng){ t.push('回头生'); } if(m.huiTou.ke){ t.push('回头克'); }
	if(m.huiTou.chong){ t.push('回头冲'); } if(m.huiTou.he){ t.push('回头合'); }
	if(m.huaKong){ t.push('化空'); } if(m.huaPo){ t.push('化破'); } if(m.huaMu){ t.push('化墓'); } if(m.huaJue){ t.push('化绝'); }
	return t.join('·');
}

// ── 参考(只读卡):持世诀/六亲发动/六神发动/爻位象/常见占类(WP-L);高亮当前持世六亲 ──
function RefBlock({ title, children }){
	return (
		<div style={{ marginBottom: 12 }}>
			<div style={{ fontSize: 12, fontWeight: 600, color: C.accent, margin: '4px 0 6px' }}>{title}</div>
			<div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>{children}</div>
		</div>
	);
}
function RefRow({ k, v, hi, i, n }){
	return (
		<div style={{ display: 'flex', padding: '5px 9px', fontSize: 12, background: hi ? C.accentSoft : (i % 2 ? 'transparent' : 'rgba(127,127,127,0.04)'), borderBottom: i < n - 1 ? `1px solid ${C.line}` : 'none' }}>
			<div style={{ width: 92, flex: '0 0 auto', color: hi ? C.cinnabar : C.label, fontWeight: 600 }}>{k}{hi ? ' ◀持世' : ''}</div>
			<div style={{ flex: 1, color: C.text }}>{v}</div>
		</div>
	);
}
export function LiuYaoReference({ analysis }){
	const chiShi = analysis && analysis.yaos ? (analysis.yaos.find((y) => y.shiYing === '世') || {}).liuqin : '';
	const liuqinList = ['父母', '兄弟', '子孙', '妻财', '官鬼'];
	const liushenList = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
	return (
		<div>
			<RefBlock title="诸爻持世诀">
				{liuqinList.map((lq, i) => (<RefRow key={lq} k={lq + '持世'} v={CHISHI_JUE[lq]} hi={chiShi === lq} i={i} n={liuqinList.length} />))}
			</RefBlock>
			<RefBlock title="六亲发动诀(发动必生一克一)">
				{liuqinList.map((lq, i) => (<RefRow key={lq} k={lq + '动'} v={<span><span style={{ color: C.danger }}>{FADONG_JUE[lq].ke}</span>　<span style={{ color: C.jade }}>{FADONG_JUE[lq].sheng}</span></span>} i={i} n={liuqinList.length} />))}
			</RefBlock>
			<RefBlock title="六神发动歌">
				{liushenList.map((sn, i) => (<RefRow key={sn} k={sn + '动'} v={LIUSHEN_FADONG[sn]} i={i} n={liushenList.length} />))}
			</RefBlock>
			<RefBlock title="爻位象(身/宅/人事)">
				{YAOWEI_XIANG.slice().reverse().map((y, i) => (<RefRow key={y.pos} k={['初', '二', '三', '四', '五', '上'][y.pos - 1] + '爻'} v={`${y.body}｜${y.home}｜${y.person}`} i={i} n={6} />))}
			</RefBlock>
			<RefBlock title="常见占类断法纲要">
				{ZHANLEI_GANGYAO.map((z, i) => (<RefRow key={z.key} k={z.name} v={<span>用神<b style={{ color: C.cinnabar }}>{z.yong}</b>;<span style={{ color: C.jade }}>吉</span>:{z.ji};<span style={{ color: C.danger }}>凶</span>:{z.xiong}</span>} i={i} n={ZHANLEI_GANGYAO.length} />))}
			</RefBlock>
		</div>
	);
}

function RelatedLine({ related }){
	return (
		<div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
			错卦：<span style={{ color: C.label }}>{related.cuo ? related.cuo.name : '—'}</span>
			综卦：<span style={{ color: C.label }}>{related.zong ? related.zong.name : '—'}</span>
			互卦：<span style={{ color: C.label }}>{related.hu ? related.hu.name : '—'}</span>
		</div>
	);
}
