// 风水 · 理气六派共享原语（纯函数，无 DOM，可单测）。
// 飞星核心移植 golden feixing.py / gen2.py，须与 out_grid8/9 · out_sanhe · out_qkgb · out_zibai 字节级一致。
import {
	SHAN_24, OPP_GONG, SANHE_ZHI, SANHE_SHUANGSHAN, SANHE_STAGE, SANHE_JU_CS,
	XIANTIAN_POS, HOUTIAN_POS, POS_NAME, ZIBAI_STAR, TIXING_SHEN, TIXING_DISPUTED,
} from './fengshuiData';

// ── 飞星原语（feixing.py）──────────────────────────────────────────────
// 飞泊步序：5→0,6→1,7→2,8→3,9→4,1→5,2→6,3→7,4→8。
export function idx(n) { return (n - 5 + 9) % 9; }
export function val(center, n, forward) {
	return forward ? ((center - 1 + idx(n)) % 9 + 1) : (((center - 1 - idx(n)) % 9 + 9) % 9 + 1);
}

// 宫(洛书数)+元龙 → 山名（入中本宫取同元龙之山定阴阳）。
const GONG_YUAN = (()=>{
	const m = {};
	Object.keys(SHAN_24).forEach((s)=>{ const [g, y, yy] = SHAN_24[s]; m[`${g}|${y}`] = [s, yy]; });
	return m;
})();

// 玄空飞星 下卦排盘（pan 移植）。入参：元运 yun(1-9)、向首山 xiangShan。
// 返回 {zuoShan, yunPan, shanPan, xiangPan, ge, gZuo, gXiang, yuanLong}。
export function flyChart(yun, xiangShan) {
	const meta = SHAN_24[xiangShan];
	if (!meta) { return null; }
	const [gXiang, yXiang, yyXiang] = meta;
	const gZuo = OPP_GONG[gXiang];
	const zuoShan = GONG_YUAN[`${gZuo}|${yXiang}`][0];   // 坐山：与向同元龙、在坐宫
	const yunPan = {};
	for (let n = 1; n <= 9; n++) { yunPan[n] = val(yun, n, true); }
	// 向盘
	const Vx = yunPan[gXiang];
	const fx = (Vx === 5) ? (yyXiang === +1) : (GONG_YUAN[`${Vx}|${yXiang}`][1] === +1);
	const xiangPan = {};
	for (let n = 1; n <= 9; n++) { xiangPan[n] = val(Vx, n, fx); }
	// 山盘（坐山元龙 = 向山元龙）
	const Vs = yunPan[gZuo];
	const yyZuo = SHAN_24[zuoShan][2];
	const fs = (Vs === 5) ? (yyZuo === +1) : (GONG_YUAN[`${Vs}|${yXiang}`][1] === +1);
	const shanPan = {};
	for (let n = 1; n <= 9; n++) { shanPan[n] = val(Vs, n, fs); }
	// 格局
	const ge = geOf(shanPan, xiangPan, gZuo, gXiang, yun);
	return { zuoShan, xiangShan, yun, yunPan, shanPan, xiangPan, ge, gZuo, gXiang, yuanLong: yXiang };
}

// 四大格局判定（下卦/替卦共用，逻辑与原内联一致）。
function geOf(shanPan, xiangPan, gZuo, gXiang, yun) {
	const wmt = (shanPan[gZuo] === yun);     // 旺山（当运山星到坐）
	const wmx = (xiangPan[gXiang] === yun);  // 旺向（当运向星到向）
	const ssx = (shanPan[gXiang] === yun);   // 当运山星到向
	const sxz = (xiangPan[gZuo] === yun);    // 当运向星到坐
	if (wmt && wmx) { return '旺山旺向'; }
	if (ssx && sxz) { return '上山下水'; }
	if (ssx && xiangPan[gXiang] === yun) { return '双星到向'; }
	if (shanPan[gZuo] === yun && sxz) { return '双星到坐'; }
	return '其他/侧局';
}

// 替星查询（方案 shen 沈氏 / youbi 右弼9 / bengong 本宫数）。手册 4.5。
export function tixingOf(shan, variant = 'shen') {
	if (TIXING_DISPUTED.has(shan)) {
		if (variant === 'youbi') { return 9; }
		if (variant === 'bengong') { return SHAN_24[shan][0]; }
	}
	return TIXING_SHEN[shan];
}

// 替卦（兼向起星）排盘：入中数改用替星，顺逆/元龙判定同下卦。手册 4.12。
//   variant: shen|youbi|bengong；五黄无替仍用 5。
export function flyChartTi(yun, xiangShan, variant = 'shen') {
	const meta = SHAN_24[xiangShan];
	if (!meta) { return null; }
	const [gXiang, yXiang, yyXiang] = meta;
	const gZuo = OPP_GONG[gXiang];
	const zuoShan = GONG_YUAN[`${gZuo}|${yXiang}`][0];
	const yunPan = {};
	for (let n = 1; n <= 9; n++) { yunPan[n] = val(yun, n, true); }
	// 向盘替卦：运盘向首数所落宫、与向首同元龙之山 → 替星入中。
	const Vx = yunPan[gXiang];
	let cx; let fx;
	if (Vx === 5) { cx = 5; fx = (yyXiang === +1); }
	else { const [sX, yyX] = GONG_YUAN[`${Vx}|${yXiang}`]; cx = tixingOf(sX, variant); fx = (yyX === +1); }
	const xiangPan = {};
	for (let n = 1; n <= 9; n++) { xiangPan[n] = val(cx, n, fx); }
	// 山盘替卦
	const Vs = yunPan[gZuo];
	const yyZuo = SHAN_24[zuoShan][2];
	let cs; let fs;
	if (Vs === 5) { cs = 5; fs = (yyZuo === +1); }
	else { const [sS, yyS] = GONG_YUAN[`${Vs}|${yXiang}`]; cs = tixingOf(sS, variant); fs = (yyS === +1); }
	const shanPan = {};
	for (let n = 1; n <= 9; n++) { shanPan[n] = val(cs, n, fs); }
	const ge = geOf(shanPan, xiangPan, gZuo, gXiang, yun);
	return {
		zuoShan, xiangShan, yun, yunPan, shanPan, xiangPan, ge, gZuo, gXiang, yuanLong: yXiang,
		method: '替卦', tiVariant: variant, sameAsXiaGua: (cx === Vx && cs === Vs),
	};
}

// ── 三合 十二长生（gen2.py）：某双山地支在某局处第几长生 ──────────────────
export function sanheStageAt(zhi, ju) {
	const cs = SANHE_JU_CS[ju];
	const off = ((SANHE_ZHI.indexOf(zhi) - SANHE_ZHI.indexOf(cs)) % 12 + 12) % 12;
	return SANHE_STAGE[off];
}
// 全周表：12 双山 × 4 局。
export function sanheChangshengTable() {
	return SANHE_ZHI.map((z)=>({
		zhi: z,
		shuangshan: SANHE_SHUANGSHAN[z],
		火局: sanheStageAt(z, '火局'),
		金局: sanheStageAt(z, '金局'),
		水局: sanheStageAt(z, '水局'),
		木局: sanheStageAt(z, '木局'),
	}));
}

// ── 乾坤国宝 先后天位（gen2.py）：坐山卦 → {后天方位, 先天位(主丁), 后天位(主财)} ──
export function qkgbPositions(zuoGua) {
	if (!(zuoGua in HOUTIAN_POS)) { return null; }
	const XT_AT = {};   // 方位→先天卦（反查）
	Object.keys(XIANTIAN_POS).forEach((k)=>{ XT_AT[XIANTIAN_POS[k]] = k; });
	const xtw = XIANTIAN_POS[zuoGua];           // 先天位 = 坐卦在先天图方位
	const zw = HOUTIAN_POS[zuoGua];             // 坐卦后天方位
	const guaAtXt = XT_AT[zw];                  // 该方位在先天属什么卦
	const htw = HOUTIAN_POS[guaAtXt];           // 该卦后天方位
	return {
		zuoGua,
		houtianFang: POS_NAME[zw], houtianFangPos: zw,
		xianTianWei: POS_NAME[xtw], xianTianWeiPos: xtw,     // 主丁
		houTianWei: POS_NAME[htw], houTianWeiPos: htw,       // 主财
	};
}

// ── 紫白 年入中（gen2.py year_center）：11 − 年数字根，三元逐年逆退 ────────
export function zibaiYearCenter(year) {
	// 净化:负/小数/非数 → 取绝对整数,避免 '-' 等字符令数字根 NaN(非法流年防御)。
	let s = String(Math.abs(Math.trunc(Number(year) || 0))).split('').reduce((a, d)=>a + (+d), 0);
	while (s > 9) { s = String(s).split('').reduce((a, d)=>a + (+d), 0); }
	let c = 11 - s;
	if (c > 9) { c -= 9; }
	if (c <= 0) { c += 9; }
	return c;
}
export function zibaiYearStar(year) {
	const c = zibaiYearCenter(year);
	return { center: c, star: ZIBAI_STAR[c] };
}

// ── 八宅 命卦（手册 3.3「数字相加古法」，跨世纪通用，与公式法等价）──────────
//   n = 出生公历年四位数字反复相加至个位(1-9);男 = 11−n(得10还原1)、女 = 4+n(>9减9);
//   余 5 → 男坤(2)/女艮(8);余 0 作 9。立春为界由调用方传所属命理年(默认公历年)。
export function mingGua(year, isMale) {
	let n = String(year).split('').reduce((a, d)=>a + (+d), 0);
	while (n > 9) { n = String(n).split('').reduce((a, d)=>a + (+d), 0); }
	let g = isMale ? (11 - n) : (4 + n);
	if (g === 10) { g = 1; }          // 男得 10 还原 1
	if (g > 9) { g -= 9; }            // 女 >9 减 9
	if (g === 0) { g = 9; }           // 余 0 作 9（离）
	if (g === 5) { return isMale ? 2 : 8; }   // 中宫寄坤(男)/艮(女)
	return g;
}

// 命卦 → 东西四命组（坎离震巽=东四 / 乾坤艮兑=西四）。
const EAST_GROUP = new Set([1, 9, 3, 4]);   // 坎离震巽
export function mingGroup(gua) { return EAST_GROUP.has(gua) ? '东四命' : '西四命'; }
