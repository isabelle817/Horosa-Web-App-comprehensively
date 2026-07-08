// 紫白飞星 · 年/月入中九宫 + 紫白吉凶（可叠玄空宅盘 M5 联动）。
import { zibaiYearCenter } from './liqiCore';
import { ZIBAI_STAR, ZIBAI_JX, GONG_NAME, GONG_GUA, NINE_STAR_MEANING } from './fengshuiData';

const idxF = (n)=>(n - 5 + 9) % 9;
// 入中星顺飞布九宫。
function flyFromCenter(center) {
	const pan = {};
	for (let g = 1; g <= 9; g++) { pan[g] = (center - 1 + idxF(g)) % 9 + 1; }
	return pan;
}

// 月入中（8.1.2）：年支三组定正月入中星，逐月逆退。
//   子午卯酉年→正月起八白;辰戌丑未年→起五黄;寅申巳亥年→起二黑。
const MONTH_START = { 子: 8, 午: 8, 卯: 8, 酉: 8, 辰: 5, 戌: 5, 丑: 5, 未: 5, 寅: 2, 申: 2, 巳: 2, 亥: 2 };
const YEAR_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];   // 1900=庚子(支子)起
function yearZhi(year) { return YEAR_ZHI[((year - 1900) % 12 + 12) % 12]; }
export function monthCenter(year, month) {
	const start = MONTH_START[yearZhi(year)];
	let c = start - (month - 1);              // 逐月逆退
	c = ((c - 1) % 9 + 9) % 9 + 1;
	return c;
}

function palacesOf(pan) {
	const out = [];
	for (let g = 1; g <= 9; g++) {
		const star = pan[g];
		out.push({
			gong: g, name: GONG_NAME[g], gua: GONG_GUA[g],
			star, starName: ZIBAI_STAR[star], jx: ZIBAI_JX[star],
			meaning: NINE_STAR_MEANING[star],
		});
	}
	return out;
}

export function zibai({ year, month } = {}) {
	const y = year || new Date().getFullYear();
	const yc = zibaiYearCenter(y);
	const yearPan = flyFromCenter(yc);
	let monthPan = null; let mc = null;
	if (month) { mc = monthCenter(y, month); monthPan = flyFromCenter(mc); }
	return {
		available: true, year: y, month: month || null,
		yearCenter: yc, yearCenterStar: ZIBAI_STAR[yc],
		monthCenter: mc, monthCenterStar: mc ? ZIBAI_STAR[mc] : null,
		yearPalaces: palacesOf(yearPan),
		monthPalaces: monthPan ? palacesOf(monthPan) : null,
		note: '一六八九吉、二三五七凶、四绿文昌、五黄大凶（叠宅山向会断 M5）',
	};
}
