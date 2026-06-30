// 量化盘(汉堡学派)含义词典 —— 单一真值源(SSOT)。
// 纯数据 + 纯函数,零副作用。含义文本为技法语义本身,不署来源。
// 流派中性名:原始汉堡 / 纯净派 / 美国对称 / 宇宙生物学。
//
// 结构:
//   FACTOR_MEANINGS —— 10 行星 + 8 虚星 + 5 个人点 基义(关键词);个人点附时间轴义。
//   PAIR_MEANINGS   —— 个人点轴中性义表(键 pairKey)。
//   PICTURE_MEANINGS—— 含虚星行星图样例。
//   MEDICAL_MIDPOINTS—四液中点(倾向/留意措辞,不替代医疗诊断)。
//   纯函数:pairKey / factorLabel / compose / composeShort / pairMeaning / medicalMeaning。

import * as AstroConst from '../constants/AstroConst';

// ───────────────────────── 基义:因子关键词 ─────────────────────────
// keyword=合成主题用的简义;label=单因子中文标签;axis=个人点时间轴义(仅个人点)。
export const FACTOR_MEANINGS = {
	// — 10 真实行星(汉堡语境关键词)—
	[AstroConst.SUN]: { label: '太阳', keyword: '自我·生命力·身体·父亲·白天·当权者' },
	[AstroConst.MOON]: { label: '月亮', keyword: '情绪·女性·母亲·公众·容受' },
	[AstroConst.MERCURY]: { label: '水星', keyword: '思维·言语·信息·交易·神经·年轻人' },
	[AstroConst.VENUS]: { label: '金星', keyword: '爱·和谐·审美·女性魅力·价值' },
	[AstroConst.MARS]: { label: '火星', keyword: '能量·行动·冲动·性·争斗·男性' },
	[AstroConst.JUPITER]: { label: '木星', keyword: '扩张·幸运·成功·乐观·法律·宗教' },
	[AstroConst.SATURN]: { label: '土星', keyword: '限制·责任·时间·收缩·分离·苦干·损失' },
	[AstroConst.URANUS]: { label: '天王星', keyword: '突变·革命·闪现·科技·独立·惊扰' },
	[AstroConst.NEPTUNE]: { label: '海王星', keyword: '消融·幻想·灵性·欺瞒·海洋·媒介' },
	[AstroConst.PLUTO]: { label: '冥王星', keyword: '转化·权力·毁灭与再生·深层强迫' },

	// — 8 虚星(海外因子)—
	[AstroConst.CUPIDO]: { label: '丘比特', keyword: '聚合·群体·家庭·婚姻·社会·合伙·组织·艺术' },
	[AstroConst.HADES]: { label: '哈迪斯', keyword: '腐朽·匮乏·污垢·疾病·秘密·过去·古旧·深度·前世' },
	[AstroConst.ZEUS]: { label: '宙斯', keyword: '受控之能·定向能量·机器·创造·领导·火·军事·驱力' },
	[AstroConst.KRONOS]: { label: '克洛诺斯', keyword: '优越·最高品质·权威·政府·精通·顶尖·高处' },
	[AstroConst.APOLLON]: { label: '阿波罗', keyword: '倍增·扩张·众多·科学·商业·贸易·和平·大局观' },
	[AstroConst.ADMETOS]: { label: '阿德墨托斯', keyword: '稳固·不动·阻滞·原料·专精·耐久·收窄·起终·死亡·不动产' },
	[AstroConst.VULCANUS]: { label: '伏尔甘', keyword: '巨力·强度·势能·权力·命运·剧烈喷发' },
	[AstroConst.POSEIDON]: { label: '波塞冬', keyword: '灵性·真理·理念·启蒙·照明·智慧·文化·精神' },

	// — 个人点(Asc/MC/北交/白羊点;日/月已在真实行星条目)+ 时间轴义 —
	// 个人点是"自我"核心象征,触发器,筛盘优先级最高。
	[AstroConst.ASC]: { label: '上升', keyword: '我与所在环境·与之相遇者·地点', axis: '地点', axisDetail: '地点;会面发生之地' },
	[AstroConst.MC]: { label: '天顶', keyword: '我之核心·目标·生涯顶点·当下', axis: '分/瞬', axisDetail: '分/瞬;影响世界的当下一刻' },
	[AstroConst.NORTH_NODE]: { label: '北交', keyword: '纽带·联结·互补关系·血缘', axis: '联结', axisDetail: '纽带;互补关系;血缘联结' },
	[AstroConst.ARIES_POINT]: { label: '白羊点', keyword: '与世界/公众的连接·名声·社会意义', axis: '世界点', axisDetail: '世界点;与世界/每件事的连接;最广社会接触' },
};

// 日/月既是真实行星也是个人点,其时间轴义另存(不污染上方真实行星基义)。
export const PERSONAL_POINT_AXIS = {
	[AstroConst.SUN]: { axis: '日', axisDetail: '日;自我·生命·父' },
	[AstroConst.MOON]: { axis: '时', axisDetail: '时;情绪·公众·母' },
	[AstroConst.ASC]: { axis: '地点', axisDetail: '地点;会面发生之地' },
	[AstroConst.MC]: { axis: '分/瞬', axisDetail: '分/瞬;影响世界的当下一刻' },
	[AstroConst.NORTH_NODE]: { axis: '联结', axisDetail: '纽带;互补关系;血缘联结' },
	[AstroConst.ARIES_POINT]: { axis: '世界点', axisDetail: '世界点;与世界/每件事的连接;最广社会接触' },
};

// 五个人点 id(日/月/上升/天顶/北交);白羊点为原始汉堡第六个人点,另列以便两派区分。
export const PERSONAL_POINTS_FIVE = [
	AstroConst.SUN, AstroConst.MOON, AstroConst.ASC, AstroConst.MC, AstroConst.NORTH_NODE,
];
export const PERSONAL_POINT_ARIES = AstroConst.ARIES_POINT;

// ───────────────────────── 纯函数:键 / 标签 ─────────────────────────

// 对称排序键:pairKey(a,b) === pairKey(b,a)。用于 PAIR/MEDICAL 查表。
export function pairKey(a, b){
	return [a, b].sort().join('|');
}

// 单因子中文标签(优先 FACTOR_MEANINGS.label,缺则回退 id)。
export function factorLabel(id){
	const f = FACTOR_MEANINGS[id];
	if (f && f.label) return f.label;
	return id == null ? '' : String(id);
}

// 取单因子合成用关键词主题(缺则回退标签)。
function factorKeyword(id){
	const f = FACTOR_MEANINGS[id];
	if (f && f.keyword) return f.keyword;
	return factorLabel(id);
}

// 取个人点时间轴义(日/时/分/地点/世界);非个人点返回 null。
export function axisOf(id){
	const a = PERSONAL_POINT_AXIS[id];
	return a ? a.axis : null;
}

// ───────────────────── 个人点轴中性义表(上色前) ─────────────────────
// 键统一用 pairKey(对称)。义为中性轴义,临盘按上下文上色。
const RAW_PAIR = [
	[AstroConst.MC, AstroConst.ARIES_POINT, '自我于世界;命运;影响世界的"一刻"'],
	[AstroConst.MC, AstroConst.SUN, '自我的肉身表达;我的身体;个人生活体验;对父亲的体验'],
	[AstroConst.MC, AstroConst.ASC, '市场;日常事务/与人互动'],
	[AstroConst.MC, AstroConst.MOON, '对潜意识的感知;我的情绪/反应/人格;对母亲的体验'],
	[AstroConst.MC, AstroConst.NORTH_NODE, '个人关系;对家庭的体验'],
	[AstroConst.ARIES_POINT, AstroConst.SUN, '地上的生命;知名人物与世界级事物'],
	[AstroConst.ARIES_POINT, AstroConst.ASC, '地上的某处;会面发生之地'],
	[AstroConst.ARIES_POINT, AstroConst.MOON, '民族/部落/人群;公众情绪与人气'],
	[AstroConst.ARIES_POINT, AstroConst.NORTH_NODE, '知名的结合;公开条约/协议;全球连接'],
	[AstroConst.SUN, AstroConst.ASC, '肉身在场;男性影响;父之屋'],
	[AstroConst.SUN, AstroConst.MOON, '身与魂;男与女;人格的肉身显化;内在平衡("内在婚姻")'],
	[AstroConst.ASC, AstroConst.MOON, '某地之氛围;公共场所;情感伙伴;母之屋'],
	[AstroConst.MOON, AstroConst.NORTH_NODE, '情感联结;本能纽带;母系连接;国家联盟'],
];
export const PAIR_MEANINGS = RAW_PAIR.reduce((acc, [a, b, txt]) => {
	acc[pairKey(a, b)] = txt;
	return acc;
}, {});

// 个人点轴中性义查表(对称);无则 null。
export function pairMeaning(a, b){
	return PAIR_MEANINGS[pairKey(a, b)] || null;
}

// ───────────────────── 含虚星的行星图样例(重构) ─────────────────────
// 按造句法重构的两因子图样,键用 pairKey。
const RAW_PICTURE = [
	[AstroConst.SUN, AstroConst.CUPIDO, '自我融入群体/家庭;善社交者;自我的"成婚";艺术家'],
	[AstroConst.MARS, AstroConst.ZEUS, '受控定向之力;工程/武器/受命之火;有目标的进取;生殖驱力'],
	[AstroConst.JUPITER, AstroConst.KRONOS, '大成功 + 高权威;登顶;幸运的专家;经官方而扩张'],
	[AstroConst.MERCURY, AstroConst.APOLLON, '思维广远;心智倍增;科学/商业沟通;教学/出版/贸易;多念并起'],
	[AstroConst.SATURN, AstroConst.HADES, '腐朽成痼;慢病/贫困/深匮;旧弃之物;哀伤;对深埋过往的研究'],
	[AstroConst.SATURN, AstroConst.ADMETOS, '深重阻塞;彻底停滞;收束至一点;不可移之障;深刻的终/始;严酷收缩'],
	[AstroConst.MARS, AstroConst.VULCANUS, '巨力;压倒性的力量施加;蛮力;爆发性能量;不可挡之推进'],
	[AstroConst.NEPTUNE, AstroConst.POSEIDON, '纯然灵性与照明;高度灵感 vs 幻惑;非物质/通灵;对"灵"的启蒙或欺瞒'],
];
export const PICTURE_MEANINGS = RAW_PICTURE.reduce((acc, [a, b, txt]) => {
	acc[pairKey(a, b)] = txt;
	return acc;
}, {});

// 含虚星行星图样例查表(对称);无则 null。
export function pictureMeaning(a, b){
	return PICTURE_MEANINGS[pairKey(a, b)] || null;
}

// ─────────────────────── 医学:四液中点 ───────────────────────
// 四体液中点(键用 pairKey);仅在被激活(占据/触发)时显示病理倾向。
// 措辞全程"倾向/留意",末句明示不替代医疗诊断。
const MED_DISCLAIMER = '仅为体质倾向参考,不替代医疗诊断。';
const RAW_MEDICAL = [
	[AstroConst.SUN, AstroConst.MARS, '胆汁质', '偏热、偏动、易急躁亢奋的体质倾向;留意上火、炎症与冲动耗损。'],
	[AstroConst.VENUS, AstroConst.JUPITER, '多血质', '偏温润、丰盈、循环旺盛的体质倾向;留意过盈、代谢与糖脂负担。'],
	[AstroConst.MERCURY, AstroConst.SATURN, '忧郁质', '偏冷、偏燥、偏紧的体质倾向;留意神经紧张、消化迟滞与情绪低落。'],
	[AstroConst.MOON, AstroConst.NEPTUNE, '黏液质', '偏湿、偏寒、偏滞的体质倾向;留意水湿停聚、易倦怠与免疫波动。'],
];
export const MEDICAL_MIDPOINTS = RAW_MEDICAL.reduce((acc, [a, b, temperament, note]) => {
	acc[pairKey(a, b)] = { temperament, note: note + MED_DISCLAIMER };
	return acc;
}, {});

// 四液中点查表(对称);返回 {temperament, note} 或 null。
export function medicalMeaning(a, b){
	return MEDICAL_MIDPOINTS[pairKey(a, b)] || null;
}

// ───────────────────────── 造句法 ─────────────────────────
// 中点对 A/B 取主题,占据者 C 定"经何显现"。
// 句式:C = A/B → "[A/B 主题] 通过 [C] 表达"。

// compose(a,b,c):完整造句。c 可省(仅给主题)。
export function compose(a, b, c){
	const theme = factorKeyword(a) + '/' + factorKeyword(b);
	if (c == null || c === '') {
		return factorLabel(a) + '/' + factorLabel(b) + ' 主题:' + theme;
	}
	return '[' + factorLabel(a) + '/' + factorLabel(b) + ' 主题] 通过 [' + factorLabel(c) + '] 表达';
}

// composeShort(...):读数行短句。
//   1 因子 → 单星基义;2 因子 → 标签对 + 优先查个人点轴义/行星图样例;3 因子 → C=A/B 造句。
export function composeShort(a, b, c){
	// 单因子:标签 + 基义关键词。
	if ((b == null || b === '') && (c == null || c === '')) {
		const kw = factorKeyword(a);
		return factorLabel(a) + (kw && kw !== factorLabel(a) ? ' · ' + kw : '');
	}
	// 三因子:C = A/B。
	if (c != null && c !== '') {
		const head = factorLabel(c) + ' = ' + factorLabel(a) + '/' + factorLabel(b);
		const theme = factorKeyword(a) + '/' + factorKeyword(b);
		return head + ' · ' + theme + ' 经 ' + factorLabel(c) + ' 显现';
	}
	// 两因子:优先个人点轴中性义 → 含虚星图样例 → 合成主题。
	const pm = pairMeaning(a, b);
	if (pm) return factorLabel(a) + '/' + factorLabel(b) + ' · ' + pm;
	const pic = pictureMeaning(a, b);
	if (pic) return factorLabel(a) + '/' + factorLabel(b) + ' · ' + pic;
	return factorLabel(a) + '/' + factorLabel(b) + ' · ' + factorKeyword(a) + '/' + factorKeyword(b);
}

// 兼容旧 URANIAN_MEANING 形态:8 虚星 id → 单行关键词串(从 FACTOR_MEANINGS 派生,物理唯一份)。
export const URANIAN_MEANING = AstroConst.LIST_URANIAN.reduce((acc, id) => {
	const f = FACTOR_MEANINGS[id];
	if (f && f.keyword) acc[id] = f.keyword;
	return acc;
}, {});
