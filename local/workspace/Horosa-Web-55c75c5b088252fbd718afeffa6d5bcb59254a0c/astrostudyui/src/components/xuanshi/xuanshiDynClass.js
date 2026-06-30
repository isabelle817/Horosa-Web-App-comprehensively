// 朝代 → 族色类(pre/han/six/tang/song/late)—— 照搬参考 参考的朝代族色映射:
// 先查族名索引(_DYN_GROUPS),再关键词回退,默认 pre。供 chip-dyn-* 用。
const DYN_GROUPS = {
	pre: ['西周', '东周', '春秋', '战国', '秦', '周', '先秦'],
	han: ['西汉', '东汉', '汉', '新', '前汉', '后汉'],
	six: ['三国', '魏', '蜀', '吴', '曹魏', '蜀汉', '孙吴', '晋', '西晋', '东晋', '南朝', '北朝', '宋（南朝）', '齐', '梁', '陈', '北魏', '东魏', '西魏', '北齐', '北周', '十六国', '六朝'],
	tang: ['隋', '唐', '武周', '五代', '五代十国', '后梁', '后唐', '后晋', '后汉', '后周'],
	song: ['宋', '北宋', '南宋', '辽', '西夏', '金', '元'],
	late: ['明', '清', '南明', '民国', '近代'],
};
const DYN_INDEX = {};
Object.keys(DYN_GROUPS).forEach((grp) => { DYN_GROUPS[grp].forEach((n) => { DYN_INDEX[n] = grp; }); });
const KEYWORDS = [['汉', 'han'], ['唐', 'tang'], ['宋', 'song'], ['元', 'song'], ['明', 'late'], ['清', 'late'], ['晋', 'six'], ['魏', 'six'], ['梁', 'six'], ['陈', 'six'], ['齐', 'six'], ['周', 'pre'], ['秦', 'pre'], ['隋', 'tang']];

export function dynClass(name) {
	if (!name) { return 'pre'; }
	const s = String(name).trim();
	if (DYN_INDEX[s]) { return DYN_INDEX[s]; }
	for (let i = 0; i < KEYWORDS.length; i++) { if (s.indexOf(KEYWORDS[i][0]) >= 0) { return KEYWORDS[i][1]; } }
	return 'pre';
}
