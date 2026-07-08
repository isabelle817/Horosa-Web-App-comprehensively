// 演禽(二十八宿禽星术)· 数据底座常量(单一真值源)。
// 全部逐字来自两份权威复原文档(公有古籍:四库本《禽星易见》《演禽通纂》、《协纪辨方书》、
// 《象吉通书》、天玉宫 tianyugong.com 等),纯前端、零后端。算法见 yanqinEngine.js。
//
// 命名键说明:idx = 二十八宿标准序 1..28(1=角…28=轸);yao = 宿名第二字(七曜);
// 七曜恒按「木金土日月火水」每象循环,故 yao 可由 idx 派生,但此处显存以便逐字核对。

// —— 1. 二十八宿全表(序/宿/曜/动物/四象)✅ 大全§1.1 ——
export const MANSIONS = [
	{ idx: 1,  name: '角木蛟', yao: '木', animal: '蛟', quad: '东' },
	{ idx: 2,  name: '亢金龙', yao: '金', animal: '龙', quad: '东' },
	{ idx: 3,  name: '氐土貉', yao: '土', animal: '貉', quad: '东' },
	{ idx: 4,  name: '房日兔', yao: '日', animal: '兔', quad: '东' },
	{ idx: 5,  name: '心月狐', yao: '月', animal: '狐', quad: '东' },
	{ idx: 6,  name: '尾火虎', yao: '火', animal: '虎', quad: '东' },
	{ idx: 7,  name: '箕水豹', yao: '水', animal: '豹', quad: '东' },
	{ idx: 8,  name: '斗木獬', yao: '木', animal: '獬', quad: '北' },
	{ idx: 9,  name: '牛金牛', yao: '金', animal: '牛', quad: '北' },
	{ idx: 10, name: '女土蝠', yao: '土', animal: '蝠', quad: '北' },
	{ idx: 11, name: '虚日鼠', yao: '日', animal: '鼠', quad: '北' },
	{ idx: 12, name: '危月燕', yao: '月', animal: '燕', quad: '北' },
	{ idx: 13, name: '室火猪', yao: '火', animal: '猪', quad: '北' },
	{ idx: 14, name: '壁水貐', yao: '水', animal: '貐', quad: '北' },
	{ idx: 15, name: '奎木狼', yao: '木', animal: '狼', quad: '西' },
	{ idx: 16, name: '娄金狗', yao: '金', animal: '狗', quad: '西' },
	{ idx: 17, name: '胃土雉', yao: '土', animal: '雉', quad: '西' },
	{ idx: 18, name: '昴日鸡', yao: '日', animal: '鸡', quad: '西' },
	{ idx: 19, name: '毕月乌', yao: '月', animal: '乌', quad: '西' },
	{ idx: 20, name: '觜火猴', yao: '火', animal: '猴', quad: '西' },
	{ idx: 21, name: '参水猿', yao: '水', animal: '猿', quad: '西' },
	{ idx: 22, name: '井木犴', yao: '木', animal: '犴', quad: '南' },
	{ idx: 23, name: '鬼金羊', yao: '金', animal: '羊', quad: '南' },
	{ idx: 24, name: '柳土獐', yao: '土', animal: '獐', quad: '南' },
	{ idx: 25, name: '星日马', yao: '日', animal: '马', quad: '南' },
	{ idx: 26, name: '张月鹿', yao: '月', animal: '鹿', quad: '南' },
	{ idx: 27, name: '翼火蛇', yao: '火', animal: '蛇', quad: '南' },
	{ idx: 28, name: '轸水蚓', yao: '水', animal: '蚓', quad: '南' },
];

// 宿名 → idx 反查(含逐字标准名)
export const MANSION_NAME_TO_IDX = MANSIONS.reduce((m, x) => { m[x.name] = x.idx; return m; }, {});
// 单字宿名(角/亢/…/轸)→ idx(口诀/古籍多用单字)
export const MANSION_HEAD_TO_IDX = MANSIONS.reduce((m, x) => { m[x.name[0]] = x.idx; return m; }, {});

// 取宿(idx 1..28,自动环绕)
export function mansionByIdx(idx) {
	const i = ((Math.round(idx) - 1) % 28 + 28) % 28;
	return MANSIONS[i];
}

// —— 2. 七曜 / 五行 / 星期 ✅ 大全§1.2-1.3 ——
// 每象七宿曜序恒为「木金土日月火水」
export const YAO_CYCLE = ['木', '金', '土', '日', '月', '火', '水'];
// 七曜 → 五行(罗计紫炁等四余另算;此处为禽星生克用的本曜五行)
export const YAO_TO_WUXING = { 日: '火', 月: '水', 火: '火', 水: '水', 木: '木', 金: '金', 土: '土' };
// 七曜 → 星期(0=周日…6=周六):日↔周日 月↔周一 火↔周二 水↔周三 木↔周四 金↔周五 土↔周六
export const YAO_TO_WEEKDAY = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
export const WEEKDAY_TO_YAO = ['日', '月', '火', '水', '木', '金', '土'];
// 七曜序(用于时禽元元相轮 R 环索引):日0 月1 火2 水3 木4 金5 土6
export const YAO_ORDER = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };

// 五行生克:WUXING_KE[a] = a 所克者
export const WUXING_KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
export const WUXING_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

// —— 3. 干支 ✅ ——
export const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const DIZHI_TO_IDX = DIZHI.reduce((m, z, i) => { m[z] = i; return m; }, {});

// —— 4. 七元甲子日起宿(甲子日值宿)✅ 大全§1.1 / 核心§1.2 ——
// 口诀「虚奎毕鬼翼氐箕」;一元甲子起虚日。
export const QIYUAN_JIAZI_START = ['虚', '奎', '毕', '鬼', '翼', '氐', '箕']; // 一..七元

// —— 5. 时禽元元相轮 R 环(七曜基准起宿)✅ 大全§4.3 / §10.5 ——
// R = 虚→鬼→箕→毕→氐→奎→翼;§4.3「七元甲子时禽表」= base R[(曜序+元-1) mod 7],
// 非甲子日再加旬头位移(见 yanqinEngine.hourQin)。
export const R_RING = ['虚', '鬼', '箕', '毕', '氐', '奎', '翼'];

// —— 6. 七元四将起诀(每元 甲子/己卯/甲午/己酉 四将将头起宿)⚠️ 大全§1.2 ——
// 一、二、三、五、七元确认无误;四元末将、六元三/四将原典待校(凑韵不明,见缺口补全)。
export const QIYUAN_SIJIANG_START = [
	['虚', '张', '室', '轸'], // 一元
	['奎', '亢', '胃', '房'], // 二元
	['毕', '尾', '参', '斗'], // 三元
	['鬼', '女', '星', '危'], // 四元(末将"危"凑韵,待校)
	['翼', '壁', '角', '娄'], // 五元
	['氐', '昴', '觜', null], // 六元(三将觜;四将待校)
	['箕', '井', '牛', '柳'], // 七元
];

// —— 7. 月禽:年禽曜 → 正月起宿(A版,主流)✅ 大全§3.1 / §10.3 ——
export const MONTHQIN_START_BY_YAO = {
	日: '角木蛟', 月: '室火猪', 火: '星日马', 水: '牛金牛', 木: '参水猿', 金: '心月狐', 土: '胃土雉',
};
// 月禽 B 版(异系/讹传;「日室月星火寻牛,水参木心金胃是,土宿还从角起头」)⚠️ 大全§3.2
export const MONTHQIN_START_BY_YAO_B = {
	日: '室火猪', 月: '星日马', 火: '牛金牛', 水: '参水猿', 木: '心月狐', 金: '胃土雉', 土: '角木蛟',
};

// —— 8. 活曜头诀(番禽活曜,自寅位起)✅ 大全§5.4 ——
// 「日毕月尾金牛头,木虚水氐火奎流,土翼常将寅上转」
export const HUOYAO_START_BY_YAO = { 日: '毕', 月: '尾', 金: '牛', 木: '虚', 水: '氐', 火: '奎', 土: '翼' };
// 翻活曜诀(翻禽系异本,《禽星易见》系):土曜起宿不同(箕 vs 翼)
export const FANHUOYAO_START_BY_YAO = { 日: '毕', 月: '尾', 火: '奎', 水: '氐', 木: '虚', 金: '牛', 土: '箕' };

// —— 9. 合宿歌全14对(地支六合)✅ 大全§11.1《演禽通纂》卷上 ——
// 「角昴亢胃氐合娄,奎房心壁斗虚收,箕危尾室牛兼女,嘴翼参张柳鬼求。毕轸井星为六合」
export const HESU_PAIRS = [
	['角', '昴'], ['亢', '胃'], ['氐', '娄'], ['奎', '房'], ['心', '壁'], ['参', '张'], ['毕', '轸'],
	['斗', '虚'], ['箕', '危'], ['尾', '室'], ['牛', '女'], ['觜', '翼'], ['柳', '鬼'], ['井', '星'],
];
// 单字宿 → 合宿(单字)双向表
export const HESU_OF = HESU_PAIRS.reduce((m, [a, b]) => { m[a] = b; m[b] = a; return m; }, {});

// —— 10. 投胎度数·十二禽兽(体系A 禄命)✅ 大全§5.1 ——
// 按"度"反序成环:寅时正月固定起凤凰(1°);月进一→度退一,时进一→度进一。
export const TOUTAI_BIRDS = [
	'凤凰', '鸿雁', '白鸽', '金鸡', '孔雀', '双雁', '朱雀', '燕子', '白鹿', '仙鹤', '鸳鸯', '狮子',
]; // 环序(度反序):凤凰(1)→鸿雁(12)→白鸽(11)→…→狮子(2)→回凤凰

// —— 11. 四季歌:二十八宿四时生旺(各季旺七禽,单字宿)✅ 大全§11.2 ——
export const SIJI_WANG = {
	春: ['角', '亢', '轸', '胃', '危', '昴', '翼'],
	夏: ['房', '柳', '张', '女', '心', '氐', '鬼'],
	秋: ['尾', '井', '参', '觜', '星', '斗', '壁'],
	冬: ['奎', '娄', '毕', '室', '虚', '箕', '牛'],
};
