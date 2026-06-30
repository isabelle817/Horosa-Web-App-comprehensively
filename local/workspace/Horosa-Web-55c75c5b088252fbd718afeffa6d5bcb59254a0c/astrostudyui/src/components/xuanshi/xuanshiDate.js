// 玄学事件「排此时之盘」用:把朝代/纪年文字解析成该时段「最早公历年」。
// 玄学事件多数无精确日期,只有 period(如「唐开元」「西汉武帝」「南朝陈」)或 dynasty(朝代/类目)。
// 按用户约定:时间段 → 取该段最早的公历时间、正午 12 点起盘(朝代级近似,按钮文案明确标「约」)。
// TABLE 顺序 = 匹配优先级:更长/更具体的在前(西周>周、北宋>宋、西汉>汉),首个命中即返回。
const TABLE = [
	['西周', -1046], ['东周', -770], ['春秋', -770], ['战国', -475], ['先秦', -1046],
	['西汉', -202], ['前汉', -202], ['新莽', 9], ['东汉', 25], ['后汉', 25], ['两汉', -202], ['蜀汉', 221],
	['曹魏', 220], ['孙吴', 222], ['三国', 220],
	['西晋', 265], ['东晋', 317], ['十六国', 304], ['两晋', 265],
	['南北朝', 420], ['南朝', 420], ['北朝', 386], ['刘宋', 420],
	['北宋', 960], ['南宋', 1127], ['南唐', 937], ['后蜀', 934], ['五代', 907], ['十国', 902],
	['西夏', 1038], ['辽', 916], ['金', 1115], ['元', 1271], ['明', 1368], ['清', 1644], ['民国', 1912],
	['隋', 581], ['唐', 618], ['秦', -221],
	// 单字兜底(放最后,避免吃掉「西汉/北宋」等)
	['汉', -202], ['晋', 265], ['周', -1046], ['宋', 960], ['魏', 220],
];

// 返回 { year, era } 或 null(无法判断朝代,如「不详」「上古/不详」)。year<0 为公元前。
export function periodToDate(period, dynasty) {
	const probe = (s) => {
		if (!s) { return null; }
		const str = String(s);
		for (let i = 0; i < TABLE.length; i++) {
			if (str.indexOf(TABLE[i][0]) >= 0) { return { year: TABLE[i][1], era: TABLE[i][0] }; }
		}
		return null;
	};
	return probe(period) || probe(dynasty);
}

// 公历年 → 人读标签(公元前 X / 公元 X)
export function gregYearLabel(y) {
	return y < 0 ? `公元前 ${Math.abs(y)}` : `公元 ${y}`;
}

// 中文数字(元/一~九十九)→ 整数
function cnNumToInt(s) {
	if (!s) { return null; }
	if (s === '元') { return 1; }
	const M = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
	const idx = s.indexOf('十');
	if (idx >= 0) {
		const tens = idx === 0 ? 1 : (M[s[0]] || 0);
		const ones = idx === s.length - 1 ? 0 : (M[s[idx + 1]] || 0);
		return tens * 10 + ones;
	}
	return M[s] || null;
}

// 春秋鲁十二公在位元年公历(《春秋》/史书五行志多以鲁纪年)→ 反查「襄公十四年」等文本纪年
const LU_REIGN_START = [
	['隐公', -722], ['桓公', -711], ['庄公', -693], ['闵公', -661], ['僖公', -659], ['文公', -626],
	['宣公', -608], ['成公', -590], ['襄公', -572], ['昭公', -541], ['定公', -509], ['哀公', -494],
];

// 从文本提取帝王/诸侯纪年 → 公历年(取该年;干支日不解析,按年份最早起盘)。无则 null。
export function textToYear(text) {
	if (!text) { return null; }
	const str = String(text);
	for (let i = 0; i < LU_REIGN_START.length; i++) {
		const m = new RegExp(`${LU_REIGN_START[i][0]}([元一二三四五六七八九十]+)年`).exec(str);
		if (m) { const y = cnNumToInt(m[1]); if (y != null) { return LU_REIGN_START[i][1] + (y - 1); } }
	}
	return null;
}

// 解析事件/天象可起盘的公历日期(优先级:精确 modern_date → 已抽取 year → 文本帝王纪年 → period 朝代段最早)。
// 不用 dynasty 兜底:天象 dynasty 是史书朝代(汉书载春秋事会误导);「只有朝代无时间」→ 返 null(不显排盘按钮)。
export function resolveChartDate(ev) {
	if (!ev) { return null; }
	if (ev.modern_date && /^-?\d{1,4}-\d{1,2}-\d{1,2}/.test(ev.modern_date)) {
		return { md: ev.modern_date, disp: ev.modern_date_disp || ev.modern_date, exact: true };
	}
	let y = null;
	if (ev.year != null && ev.year !== '' && Number.isFinite(Number(ev.year))) { y = Number(ev.year); }
	// 不再从文本帝王纪年/朝代段推断(防止搞错):无 year/modern_date 即不显排盘按钮
	if (y == null) { return null; }
	return { md: `${y}-01-01`, disp: `约 ${gregYearLabel(y)}`, exact: false };
}

// marked breaks 关闭后段内单软换行会渲成空格;中文之间不应有空格 → CJK(及中文标点)间的单换行直接相接。
// 保留 \n\n 段落、列表(- * +)、标题(#)、引用(>)等行首块级标记;do-while 处理连续软换行。
export function collapseSoftBreaks(s) {
	if (!s) { return String(s); }
	// ① 段内单软换行(\n)在 CJK 间相接(保留 \n\n、列表/标题/引用行)
	const reN = /([㐀-鿿，。、；：！？「」『』（）【】《》·…—])\n(?!\n|\s*[-*+>#]|\s*\d+[.、)])([㐀-鿿「『（【《])/g;
	// ② CJK 之间夹带的字面空格/制表(中文不该有;另一侧为 latin/符号则不在此类,空格保留)→ 去掉
	const reSp = /([㐀-鿿，。、；：！？「」『』（）【】《》·…—])[ \t]+([㐀-鿿「『（【《])/g;
	// 先清行尾/行首多余空格(源里常有「后 \n做」行尾空格,使 reN 漏判 → breaks 后残留空格)
	let out = String(s).replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n');
	let prev;
	do { prev = out; out = out.replace(reN, '$1$2').replace(reSp, '$1$2'); } while (out !== prev);
	return out;
}
