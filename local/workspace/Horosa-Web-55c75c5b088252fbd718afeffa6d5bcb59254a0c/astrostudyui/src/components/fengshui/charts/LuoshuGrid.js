// 风水 · 九宫飞星盘（3×3 后天方位布局）SVG。玄空(山/向/运)·紫白(单星)·八宅(游星)共用。
// 成熟设计:圆角瓦片 + 当运/中宫暖金高亮 + 语义吉凶星色 + 角标卦位。亮/暗双主题(--fs-*/--horosa-* 令牌)。
import React from 'react';

// 后天方位 → 3×3 网格 [行,列]（上离9 下坎1 左震3 右兑7 + 四隅 + 中5）。
const GONG_CELL = {
	4: [0, 0], 9: [0, 1], 2: [0, 2],
	3: [1, 0], 5: [1, 1], 7: [1, 2],
	8: [2, 0], 1: [2, 1], 6: [2, 2],
};

function starColor(star) {
	if ([1, 4, 6, 8, 9].indexOf(star) >= 0) { return 'var(--fs-good, #2e9c5a)'; }
	if ([2, 3, 5, 7].indexOf(star) >= 0) { return 'var(--fs-bad, #c0392b)'; }
	return 'var(--fs-text, #888)';
}

// props: palaces[{gong, gua, name, shan, xiang, yun, star, starName, dir, jx}], mode, highlightYun, size。
export default function LuoshuGrid({ palaces = [], mode = 'xuankong', highlightYun = null, size = 324 }) {
	const cell = size / 3;
	const gap = 5;
	const byGong = {};
	palaces.forEach((p)=>{ byGong[p.gong] = p; });
	const cells = [];
	for (let g = 1; g <= 9; g++) {
		const p = byGong[g] || { gong: g };
		const [r, c] = GONG_CELL[g];
		const x = c * cell; const y = r * cell;
		const isCenter = g === 5;
		const isWang = !isCenter && highlightYun && (p.shan === highlightYun || p.xiang === highlightYun || p.star === highlightYun || p.yun === highlightYun);
		const hot = isCenter || isWang;
		const fill = isCenter ? 'var(--fs-cell-hot, rgba(216,173,99,.16))' : (isWang ? 'var(--fs-cell-hot, rgba(216,173,99,.10))' : 'var(--fs-tile, rgba(127,140,170,.10))');
		const stroke = hot ? 'var(--fs-gold, #c0883a)' : 'var(--fs-grid, rgba(127,140,170,.3))';
		cells.push(
			<g key={g} transform={`translate(${x},${y})`}>
				<rect x={gap / 2} y={gap / 2} width={cell - gap} height={cell - gap} rx={9}
					fill={fill} stroke={stroke} strokeWidth={hot ? 1.4 : 1} />
				{/* 卦名·方位 角标 */}
				<text x={gap / 2 + 7} y={gap / 2 + 14} fontSize={10.5} fontWeight={600}
					fill={hot ? 'var(--fs-gold, #c0883a)' : 'var(--fs-muted, #9aa)'}>{mode === 'bazhai' ? (p.gua || (isCenter ? '中' : '')) : (p.name || p.gua || (isCenter ? '中' : ''))}</text>
				{mode === 'xuankong' ? (
					<g>
						<text x={cell * 0.31} y={cell * 0.57} fontSize={cell * 0.27} textAnchor="middle" fontWeight={800}
							fill={starColor(p.shan)}>{p.shan != null ? p.shan : ''}</text>
						<text x={cell * 0.69} y={cell * 0.57} fontSize={cell * 0.27} textAnchor="middle" fontWeight={800}
							fill={starColor(p.xiang)}>{p.xiang != null ? p.xiang : ''}</text>
						<text x={cell * 0.5} y={cell * 0.86} fontSize={cell * 0.135} textAnchor="middle" letterSpacing="0.5"
							fill="var(--fs-muted, #9aa)">运{p.yun != null ? p.yun : ''}</text>
					</g>
				) : mode === 'zibai' ? (
					<g>
						<text x={cell * 0.5} y={cell * 0.56} fontSize={cell * 0.36} textAnchor="middle" fontWeight={800}
							fill={starColor(p.star)}>{p.star != null ? p.star : ''}</text>
						<text x={cell * 0.5} y={cell * 0.82} fontSize={cell * 0.145} textAnchor="middle"
							fill="var(--fs-muted, #9aa)">{p.starName || ''}</text>
					</g>
				) : (
					<g>
						<text x={cell * 0.5} y={cell * 0.54} fontSize={cell * 0.21} textAnchor="middle" fontWeight={760}
							fill={p.jx === 'good' ? 'var(--fs-good, #2e9c5a)' : (p.jx === 'bad' ? 'var(--fs-bad, #c0392b)' : 'var(--fs-text,#888)')}>{p.name || ''}</text>
						<text x={cell * 0.5} y={cell * 0.78} fontSize={cell * 0.135} textAnchor="middle"
							fill="var(--fs-muted, #9aa)">{p.dir || ''}</text>
					</g>
				)}
			</g>,
		);
	}
	return (
		<svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block' }} className="horosa-fs-luoshu">
			{cells}
		</svg>
	);
}
