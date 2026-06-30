// 风水 · 二十四山环 SVG（三合长生环 / 坐向 dial）。外环 24 山(各15°)+ 长生阶 + 坐向高亮。
// 成熟设计:暖金外环 + 柔色内盘 + 长生阶语义色 + 坐向高亮。亮/暗双主题(--fs-* 令牌)。
import React from 'react';
import { SHAN_ORDER, SHAN_CENTER_DEG } from '../fengshuiData';

const STAGE_JX_COLOR = { good: 'var(--fs-good,#2e9c5a)', bad: 'var(--fs-bad,#c0392b)', neutral: 'var(--fs-muted,#9aa)' };

function polar(cx, cy, r, deg) {
	const a = (deg - 90) * Math.PI / 180;   // 0°=正上(北),顺时针
	return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

// props: ring[{shuangshan, zhi, stage, jx}]、zuoShan、xiangShan、size。
export default function TwentyFourShanRing({ ring = null, zuoShan = null, xiangShan = null, size = 332 }) {
	const cx = size / 2; const cy = size / 2;
	const rOuter = size / 2 - 4; const rInner = rOuter - 28; const rStage = rInner - 20;
	const stageByShan = {};
	if (Array.isArray(ring)) {
		ring.forEach((c)=>{ (c.shuangshan || '').split('').forEach((s)=>{ stageByShan[s] = c; }); });
	}
	const sectors = SHAN_ORDER.map((s)=>{
		const deg = SHAN_CENTER_DEG[s];
		const [lx, ly] = polar(cx, cy, rOuter, deg - 7.5);
		const [rx, ry] = polar(cx, cy, rOuter, deg + 7.5);
		const [lix, liy] = polar(cx, cy, rInner, deg - 7.5);
		const [rix, riy] = polar(cx, cy, rInner, deg + 7.5);
		const [tx, ty] = polar(cx, cy, (rOuter + rInner) / 2, deg);
		const isZuo = s === zuoShan; const isXiang = s === xiangShan;
		const hot = isZuo || isXiang;
		const path = `M ${lix} ${liy} L ${lx} ${ly} A ${rOuter} ${rOuter} 0 0 1 ${rx} ${ry} L ${rix} ${riy} A ${rInner} ${rInner} 0 0 0 ${lix} ${liy} Z`;
		const cellInfo = stageByShan[s];
		return (
			<g key={s}>
				<path d={path} fill={isZuo ? 'var(--fs-zuo,rgba(47,125,241,.18))' : (isXiang ? 'var(--fs-xiang,rgba(216,173,99,.20))' : 'var(--fs-tile,rgba(127,140,170,.06))')}
					stroke="var(--fs-grid,rgba(127,140,170,.3))" strokeWidth={0.7} />
				<text x={tx} y={ty + 4} fontSize={hot ? 13 : 12} textAnchor="middle"
					fill={isZuo ? 'var(--fs-accent,#2f7df1)' : (isXiang ? 'var(--fs-gold,#b8862f)' : 'var(--fs-text,#999)')}
					fontWeight={hot ? 800 : 500}>{s}</text>
				{cellInfo ? (()=>{ const [sx, sy] = polar(cx, cy, rStage, deg); return (
					<text x={sx} y={sy + 3} fontSize={9} textAnchor="middle" fontWeight={600} fill={STAGE_JX_COLOR[cellInfo.jx] || 'var(--fs-muted,#9aa)'}>{cellInfo.stage}</text>
				); })() : null}
			</g>
		);
	});
	return (
		<svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block' }} className="horosa-fs-ring">
			<circle cx={cx} cy={cy} r={rStage - 8} fill="var(--fs-tile, rgba(127,140,170,.06))" stroke="none" />
			<circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="var(--fs-gold, #c0883a)" strokeWidth={1.2} strokeOpacity={0.5} />
			<circle cx={cx} cy={cy} r={rInner} fill="none" stroke="var(--fs-grid, rgba(127,140,170,.28))" strokeWidth={0.8} />
			{sectors}
			{(zuoShan || xiangShan) ? (
				<text x={cx} y={cy + 5} fontSize={14} textAnchor="middle" fontWeight={700} fill="var(--fs-text, #aaa)">{zuoShan ? `坐${zuoShan}` : ''}{xiangShan ? ` 向${xiangShan}` : ''}</text>
			) : null}
		</svg>
	);
}
