// 风水 · 八方盘 SVG（3×3 后天布局,八外宫+中宫摘要）。金锁(砂水得位)/乾坤国宝(水位)/八宅(游星)共用。
// 成熟设计:圆角瓦片 + 吉凶柔色底 + 中宫暖金摘要 + 角标卦位。亮/暗双主题(--fs-*/--horosa-* 令牌)。
import React from 'react';

const GONG_CELL = { 4: [0, 0], 9: [0, 1], 2: [0, 2], 3: [1, 0], 5: [1, 1], 7: [1, 2], 8: [2, 0], 1: [2, 1], 6: [2, 2] };
const JX_COLOR = { good: 'var(--fs-good,#2e9c5a)', bad: 'var(--fs-bad,#c0392b)', neutral: 'var(--fs-muted,#9aa)' };

// props: palaces[{gong, gua, dir, primary, secondary, jx}]、centerLabel、size。
export default function EightPalaceDisk({ palaces = [], centerLabel = '', size = 324 }) {
	const cell = size / 3;
	const gap = 5;
	const byGong = {};
	palaces.forEach((p)=>{ byGong[p.gong] = p; });
	const cells = [];
	for (let g = 1; g <= 9; g++) {
		const [r, c] = GONG_CELL[g];
		const x = c * cell; const y = r * cell;
		if (g === 5) {
			cells.push(
				<g key={g} transform={`translate(${x},${y})`}>
					<rect x={gap / 2} y={gap / 2} width={cell - gap} height={cell - gap} rx={9}
						fill="var(--fs-cell-hot, rgba(216,173,99,.14))" stroke="var(--fs-gold, #c0883a)" strokeWidth={1.3} />
					<text x={cell * 0.5} y={cell * 0.53} fontSize={cell * 0.155} textAnchor="middle" fontWeight={700} fill="var(--fs-gold, #c0883a)">{centerLabel}</text>
				</g>);
			continue;
		}
		const p = byGong[g] || { gong: g };
		const hot = p.jx === 'good' || p.jx === 'bad';
		const fill = p.jx === 'good' ? 'var(--fs-good-soft, rgba(46,156,90,.13))' : (p.jx === 'bad' ? 'var(--fs-bad-soft, rgba(192,57,43,.12))' : 'var(--fs-tile, rgba(127,140,170,.10))');
		const stroke = hot ? JX_COLOR[p.jx] : 'var(--fs-grid, rgba(127,140,170,.3))';
		cells.push(
			<g key={g} transform={`translate(${x},${y})`}>
				<rect x={gap / 2} y={gap / 2} width={cell - gap} height={cell - gap} rx={9}
					fill={fill} stroke={stroke} strokeWidth={hot ? 1.2 : 1} strokeOpacity={hot ? 0.55 : 1} />
				<text x={gap / 2 + 7} y={gap / 2 + 14} fontSize={10.5} fontWeight={600} fill="var(--fs-muted, #9aa)">{p.gua || ''}{p.dir ? ` ${p.dir.replace(/[（(].*/, '')}` : ''}</text>
				<text x={cell * 0.5} y={cell * 0.55} fontSize={cell * 0.21} textAnchor="middle" fontWeight={800}
					fill={JX_COLOR[p.jx] || 'var(--fs-text,#999)'}>{p.primary || ''}</text>
				{p.secondary ? <text x={cell * 0.5} y={cell * 0.79} fontSize={cell * 0.125} textAnchor="middle" fill="var(--fs-muted, #9aa)">{p.secondary}</text> : null}
			</g>);
	}
	return (
		<svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block' }} className="horosa-fs-disk">
			{cells}
		</svg>
	);
}
