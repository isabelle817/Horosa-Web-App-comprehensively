// 报告功能 - 预置只读模板（首启灌入 IndexedDB；用户不可改，下版做编辑器）
// 6 套：八字 8/12/20 节 + 紫微 8/12/20 节
// 每节遵循「身份+边界+格式+反偷懒」四件套
// 参考 plan 「每节 Prompt 模板细节示范」

// ============ 工具：构造一节 ============

// 节级默认参数。可被 mkSection 入参覆盖。
// 修复用户反馈"内容被截断"：maxTokens 全节大幅上调，给充足缓冲;
// per-section temperature/topP 按场景：分析性强(用神/格局/喜忌)0.4-0.5、推断性中等(性格/事业/婚姻)0.6-0.7、应期/时段类 0.55。
const DEFAULT_MAX_TOKENS = 3500;

function mkSection({key, title, order, role, focus, sub, segments, keywords, embed, maxTokens, retryHint, temperature, topP}){
	// stability 修：用 ### 三级标题分子段（之前 ## 与节级 H2 撞级，导出 HTML/Word 视觉混乱）
	const subBullets = (sub || []).map((s)=>`  ### ${s}`).join('\n');
	const focusLine = focus || title;
	const segListText = (segments || []).join('、');
	const formatBlock = subBullets
		? `- 用 Markdown **三级标题**（### 三个井号）分以下子段，不要用 ## 二级标题：\n${subBullets}\n- 每个子段 200-400 字，必须基于命盘事实展开。`
		: `- 用 Markdown **四级标题**（#### 四个井号）分若干小段，不要用 ## ###；每段 150-300 字，必须基于命盘事实。`;
	// 流年/大运/流月等"时间敏感节"需要显式锚定今年, 否则 AI 会用训练数据的某年作"近期"导致错乱(用户反馈"流年判断不准"根因)
	const isTimeSensitive = /^(liunian|dayun|daxian|liuyue|liuri|liushi|year|dayun)$/.test(`${key}`) || /流年|大运|大限|流月|流日|应期|近\s*\d+\s*年/.test(`${title} ${focus || ''}`);
	const timeAnchorBlock = isTimeSensitive ? [
		'',
		'【时间锚定·铁律】（针对流年/大运/流月类时间敏感节, 必须严格遵守, 此规则优先于其他规则）',
		'- 今天是 {{currentDate}}, 今年是公元 **{{currentYear}}** 年(干支 {{currentGanZhi}}, 农历 {{lunarYearText}})。',
		'- 命主出生于 {{birthDate}}, 当前实足年龄 **{{currentAge}}** 岁。',
		'- **命主当前正行 {{currentDayun}}**——已为你从命盘快照中提取,请直接使用,不要二次推算。',
		'- 不允许引用 {{currentYearMinus1}} 年及更早作"近期/即将到来"——必须以 **{{currentYear}}** 为基准。',
		'- 流年请按 **{{currentYear}}/{{currentYearGanZhi}}, {{currentYearPlus1}}, {{currentYearPlus2}}, ..., {{currentYearPlus9}}** 等真实未来 N 年逐年分析(命主在这些年份的年龄分别是 {{currentAge}}, {{currentAgePlus1}}, ...)。',
		'- 如对 {{currentDayun}} 不确定, 必须从命盘快照中的【大运】或【运限】段实际数据读出, 不要凭空推算。',
		'',
		'【数据真实性·铁律】(对每个具体时段必须使用 snapshot 该时段的真实数据)',
		'- 你说某年/某段时间会发生什么时, 必须先从 snapshot 中找到该时段的具体数据(干支/宫位/星曜/四化/三方四正/流耀), 再据数据作判断, 不允许"我推算 2027 年是…"这种凭空构造。',
		'- 紫微斗数: 必须明确引用该年/该大限的"运命宫【某宫·干支】 + 运迁移宫【某宫·干支】(对宫) + 运财帛宫【某宫·干支】 + 运官禄宫【某宫·干支】" 4 宫位 + 各自星曜 + 四化落宫 + 流耀。注意"运财帛宫"指该段时间的财帛宫(可能落在原命盘的兄弟/疾厄等位置),不是原命盘的财帛宫。',
		'- 八字: 必须明确引用该流年的真实干支(从【流年行运概略】段取) + 当前大运干支 + 该大运下的十神变化。',
		'- 如 snapshot 中**没有**该时段数据(用户未挂载该层 / 数据不全), 必须明说"snapshot 未提供该年(月/日)的精确数据, 仅按大势推论, 准确度有限", 不允许臆造干支。',
		'- 严禁出现"2024 年壬寅大运""2025 年甲辰流年"等与 snapshot 不符的伪造干支(如 2024 实际是甲辰, 2025 实际是乙巳)。',
	].join('\n') : '';
	return {
		key,
		title,
		order,
		systemPrompt: [
			`你是${role || '资深命理师'}。本节专门分析【${focusLine}】。`,
			'',
			`【任务边界】只谈本节主题，不重复其他节内容。`,
			`【流派要求】严格按 {{school}} 流派的术语、判断标准和理论框架输出。{{schoolGuideline}}`,
			timeAnchorBlock,
			`【输出格式】`,
			formatBlock,
			`- 引用参考资料时必须写明资料的完整名称（例如 [滴天髓·调候篇.pdf]），不要只用「资料N」这种数字编号，便于读者核对来源；不要整段照抄原文。`,
			`【markdown 格式·铁律】子段标题一律用 ### 三级标题，且标题前必须另起一行并空一行；严禁"。###""文字###"这种与上文粘连的写法；段落与列表之间都要留空行。`,
			`【输出完整性·铁律】（用户反馈截断问题，本规则最高优先级）`,
			`- 整段输出必须以完整的句号「。」、感叹号「！」、问号「？」结尾。绝不允许在词组中间、句中、子段标题后、或子段末尾突然停止。`,
			`- 若临近 token 上限，宁可省略下一个子段，也要把当前句和当前子段完整写完。`,
			`- 不允许出现"。。。"、"..."、"等等"做收尾。`,
			`【反偷懒】不允许出现"需结合实际综合判断""仅供参考"等模糊回避词；如某方面命盘信息不足，明说"命盘未提供 X 信息，无法判断 Y"，不要回避。`,
			'',
			`【数据真实性·最高铁律 v1.14】（用户反馈"AI 把午宫说成迁移宫但实际是福德宫"、"大运段编错"等真实事故）`,
			`- 用户消息中如出现【代码计算·必须严格使用】块,该块中的宫位↔地支映射、大限运命宫位置、三方四正、流年干支均由代码精确算出。`,
			`- 你必须 100% 严格使用该块中的数据；禁止把"福德宫"说成"迁移宫"、禁止把"壬辰大限"说成"甲午大运"、禁止编造任何未列出的星曜或干支。`,
			`- 如代码块中标注"无法判断"或没有提供你需要的数据，明说"snapshot 未提供 X，无法判断"，不允许凭训练数据补充。`,
			`- 引用宫位/干支/星曜时,以代码块为唯一真值,与命盘快照其他段冲突时也以代码块为准。`,
		].filter(Boolean).join('\n'),
		userPromptTemplate: [
			isTimeSensitive ? `【时间锚定·复述】今天 {{currentDate}}, 命主 {{currentAge}} 岁(生于 {{birthDate}}), 现行大运请按命盘快照读出。请严格使用 {{currentYear}} 及以后的年份做流年分析。` : '',
			`【案例快照（${segListText}）】`,
			'{{source}}',
			'',
			`【相关参考资料】`,
			'{{retrieved}}',
			'',
			// v1.16: sectionData 移到末尾 — Claude/Gemini 等长 context 模型对末尾内容关注度高(防"middle lost")
			// 块包含全 12 宫 overview + 命/身宫定位 + 生年四化 + 三方四正/大限/流年(节相关)
			'{{sectionData}}',
			'',
			`【任务·最终输出要求】请按系统提示分析【${title}】节。`,
			`【铁律·最后强调】上方【ground-truth · 代码计算·必须严格使用】块中的宫位↔干支↔星曜对应是代码精确算出, 你必须 100% 严格使用; 禁止把"福德宫"说成"迁移宫"、禁止把"壬辰大限"说成"癸巳大限"、禁止编造任何未列出的星曜或干支。引用宫位/干支/星曜时, 该块是唯一真值。最终输出必须以完整句号收尾。`,
		].filter(Boolean).join('\n'),
		requiredSnapshotSegments: segments || [],
		retrievalKeywords: keywords || [],
		maxTokens: maxTokens || DEFAULT_MAX_TOKENS,
		temperature: temperature == null ? 0.6 : temperature,
		topP: topP == null ? 0.9 : topP,
		embedChartType: embed || null,
		retryOnEmpty: true,
		retryFallbackPrompt: retryHint
			? `请重新输出本节内容。务必：${retryHint}`
			: `请重新输出本节内容。务必：1）紧扣【${title}】主题；2）至少引用 3 处命盘事实；3）不允许笼统术语；4）最终必须以完整句号结尾。`,
	};
}

// ============ 通用辅助节 ============

// 辅助节 maxTokens 按实际产出贴近(audit 修复:之前 2500 严重过大):
// intro 30 字 → 100 token 足；outro 6 bullets × 30字 → 400 token 足。
const INTRO_SECTION = {
	key: '__intro__',
	title: '一句话结论',
	systemPrompt: '你是一位精炼的命理总结者。基于用户的整份报告内容，给出一句 30 字以内的中文结论；只返回结论文本，不要前后缀、不要引号、不要标点结尾。',
	userPromptTemplate: '以下是已完成的命理报告各节摘要：\n\n{{sectionsSummary}}\n\n请给出一句 30 字以内的总结性结论：',
	maxTokens: 120,
};

const OUTRO_SECTION = {
	key: '__outro__',
	title: '重点提醒',
	// 时间锚定:让 AI 严格用 currentYear 起步,不用过去年份。
	systemPrompt: '你是命理报告的"重点提醒"作者。基于报告中的【大运】【流年】节内容，列出 **{{currentYear}}、{{currentYearPlus1}}、{{currentYearPlus2}} 年（即未来 3 年）** 的关键事件 + 应防范要点；用 Markdown bullets 输出，每条 30 字内，最多 6 条；绝不引用 {{currentYearMinus1}} 年及更早的年份。',
	userPromptTemplate: '今天是 {{currentDate}}, 今年 {{currentYear}}。以下是报告中的大运/流年相关内容：\n\n{{dynamicsSummary}}\n\n请给出 **{{currentYear}}、{{currentYearPlus1}}、{{currentYearPlus2}} 年（共 3 年）** 的重点提醒清单（Markdown bullets，最多 6 条）：',
	maxTokens: 500,
};

// ============ 八字 8 节 ============

const BAZI_SEG_BASIC = ['起盘信息', '四柱与三元'];
const BAZI_SEG_FULL = ['起盘信息', '四柱与三元', '神煞（四柱与三元）', '大运', '流年行运概略'];

function baziSections8(){
	return [
		mkSection({key:'basic', title:'命主基本', order:0, role:'资深八字命理师', focus:'命主基本信息（性别/出生时空/八字）',
			segments: BAZI_SEG_BASIC, keywords:['命主','性别','四柱','出生'], maxTokens:2500}),
		mkSection({key:'gegu', title:'格局总论', order:1, role:'资深八字命理师', focus:'格局判断与喜忌',
			segments: BAZI_SEG_FULL, keywords:['格局','十神','正官','七杀','正财','偏财','食神','伤官'], maxTokens:3500,
			retryHint:'1）明确指出本命格局名（如：正官格/伤官格/从财格）；2）明确写出喜用神/忌神；3）至少引用 2 处命盘事实。'}),
		mkSection({key:'xingge', title:'性格特质', order:2, role:'资深八字命理师', focus:'命主性格、心性、行为风格',
			segments: BAZI_SEG_FULL, keywords:['性格','性情','心性','日主'], maxTokens:2500}),
		mkSection({key:'career_wealth', title:'事业财运', order:3, role:'资深八字命理师', focus:'事业方向 + 财运起伏',
			sub:['事业方向 · 适合行业','财运层级与来源','关键时段（起伏点）'],
			segments: BAZI_SEG_FULL, keywords:['事业','财运','行业','财星','官星','禄'], maxTokens:3500,
			retryHint:'1）明确给出 3-5 个适合行业方向；2）明确财运层级（高/中/低）；3）至少标注 2 个关键时段。'}),
		mkSection({key:'marriage', title:'婚姻感情', order:4, role:'资深八字命理师', focus:'婚姻吉凶与配偶特质',
			sub:['配偶特质','感情质量与互动','婚姻稳定度与潜在风险'],
			segments: BAZI_SEG_FULL, keywords:['婚姻','配偶','夫妻宫','红鸾','桃花'], maxTokens:3500}),
		mkSection({key:'health', title:'健康疾厄', order:5, role:'资深八字命理师', focus:'健康与五行配脏腑',
			segments: BAZI_SEG_FULL, keywords:['健康','疾病','五行配脏','伤病'], maxTokens:2500}),
		mkSection({key:'dayun', title:'大运简述', order:6, role:'资深八字命理师', focus:'大运 10 步的总体格局走向',
			segments: BAZI_SEG_FULL, keywords:['大运','十年','起运'], maxTokens:3500, embed:'bazi-luckyDecade'}),
		mkSection({key:'liunian', title:'近 5 年流年', order:7, role:'资深八字命理师', focus:'最近 5 个流年的吉凶要点',
			segments: BAZI_SEG_FULL, keywords:['流年','当年','应期'], maxTokens:3500}),
	];
}

// ============ 八字 12 节（中粒度，推荐）============

function baziSections12(){
	return [
		mkSection({key:'basic', title:'命主基本信息', order:0, role:'资深八字命理师', focus:'命主基本（性别/出生/四柱）',
			segments: BAZI_SEG_BASIC, keywords:['命主','性别','四柱'], maxTokens:2500}),
		mkSection({key:'sizhu', title:'四柱五行强弱', order:1, role:'资深八字命理师', focus:'四柱五行配置 + 旺衰',
			sub:['五行配置','日主旺衰','调候需求'],
			segments: ['起盘信息','四柱与三元','神煞（四柱与三元）'], keywords:['五行','强弱','旺衰','扶抑','调候'],
			maxTokens:3500, embed:'bazi-fourColumns'}),
		mkSection({key:'yongshen', title:'用神喜忌', order:2, role:'资深八字命理师', focus:'用神选取 + 喜忌',
			segments: ['起盘信息','四柱与三元','神煞（四柱与三元）'], keywords:['用神','忌神','调候','病药'], maxTokens:3500,
			retryHint:'1）明确写出用神；2）明确写出忌神；3）说明取用神依据。'}),
		mkSection({key:'gegu', title:'十神格局', order:3, role:'资深八字命理师', focus:'十神组合与格局命中',
			segments: BAZI_SEG_FULL, keywords:['十神','格局','正官','七杀','正财','偏财','食神','伤官'], maxTokens:3500}),
		mkSection({key:'liuqin', title:'六亲', order:4, role:'资深八字命理师', focus:'父母/配偶/子女/兄弟关系',
			sub:['父母','配偶','子女','兄弟'],
			segments: BAZI_SEG_FULL, keywords:['父母','配偶','子女','兄弟','宫位','六亲'], maxTokens:3500}),
		mkSection({key:'xingge', title:'性格', order:5, role:'资深八字命理师', focus:'性格、心性、行为风格',
			segments: BAZI_SEG_FULL, keywords:['性格','性情','心性','日主'], maxTokens:2500}),
		mkSection({key:'career_wealth', title:'事业财运', order:6, role:'资深八字命理师', focus:'事业方向 + 财运起伏',
			sub:['事业方向 · 适合行业','财运层级与来源','关键时段（起伏点）'],
			segments: BAZI_SEG_FULL, keywords:['事业','财运','行业','财星','官星','禄'], maxTokens:3500,
			retryHint:'1）明确给出 3-5 个适合行业方向；2）明确财运层级（高/中/低）；3）至少标注 2 个关键时段。'}),
		mkSection({key:'health', title:'健康', order:7, role:'资深八字命理师', focus:'健康与五行配脏腑',
			segments: BAZI_SEG_FULL, keywords:['健康','疾病','五行配脏','伤病'], maxTokens:2500}),
		mkSection({key:'marriage', title:'婚姻', order:8, role:'资深八字命理师', focus:'婚姻吉凶与配偶特质',
			sub:['配偶特质','感情质量与互动','婚姻稳定度与潜在风险'],
			segments: BAZI_SEG_FULL, keywords:['婚姻','配偶','夫妻宫','红鸾','桃花'], maxTokens:3500}),
		mkSection({key:'xueye', title:'学业文昌', order:9, role:'资深八字命理师', focus:'学业表现与文昌运',
			segments: BAZI_SEG_FULL, keywords:['文昌','学业','印星','华盖'], maxTokens:2500}),
		mkSection({key:'dayun', title:'大运 10 步', order:10, role:'资深八字命理师', focus:'大运 10 步逐步要点',
			segments: BAZI_SEG_FULL, keywords:['大运','十年','起运'], maxTokens:4000, embed:'bazi-luckyDecade'}),
		mkSection({key:'liunian', title:'近 10 年流年', order:11, role:'资深八字命理师', focus:'最近 10 个流年的吉凶要点',
			segments: BAZI_SEG_FULL, keywords:['流年','当年','应期'], maxTokens:4000}),
	];
}

// ============ 八字 20 节（细粒度）============

function baziSections20(){
	return [
		mkSection({key:'basic', title:'命主基本', order:0, role:'资深八字命理师', focus:'命主基本信息',
			segments: BAZI_SEG_BASIC, keywords:['命主','性别','四柱'], maxTokens:2500}),
		mkSection({key:'fourcols', title:'四柱总览', order:1, role:'资深八字命理师', focus:'四柱整体格局',
			segments: ['起盘信息','四柱与三元'], keywords:['四柱','八字'], maxTokens:2500, embed:'bazi-fourColumns'}),
		mkSection({key:'year', title:'年柱·祖辈根基', order:2, role:'资深八字命理师', focus:'年柱意义、祖辈、根基',
			segments: ['四柱与三元','神煞（四柱与三元）'], keywords:['年柱','祖辈','根基'], maxTokens:2500}),
		mkSection({key:'month', title:'月柱·父母青年', order:3, role:'资深八字命理师', focus:'月柱意义、父母、青年运',
			segments: ['四柱与三元','神煞（四柱与三元）'], keywords:['月柱','父母','青年'], maxTokens:2500}),
		mkSection({key:'day', title:'日柱·自身配偶', order:4, role:'资深八字命理师', focus:'日柱意义、自身、配偶',
			segments: ['四柱与三元','神煞（四柱与三元）'], keywords:['日柱','日主','自身','配偶'], maxTokens:2500}),
		mkSection({key:'hour', title:'时柱·晚年子女', order:5, role:'资深八字命理师', focus:'时柱意义、子女、晚年运',
			segments: ['四柱与三元','神煞（四柱与三元）'], keywords:['时柱','子女','晚年'], maxTokens:2500}),
		mkSection({key:'wuxing', title:'五行强弱', order:6, role:'资深八字命理师', focus:'五行旺衰、得令失令',
			segments: ['四柱与三元'], keywords:['五行','强弱','旺衰','得令'], maxTokens:2500}),
		mkSection({key:'yongshen', title:'用神选取', order:7, role:'资深八字命理师', focus:'取用神思路',
			segments: ['四柱与三元'], keywords:['用神','调候','扶抑'], maxTokens:2500,
			retryHint:'1）明确写出用神；2）说明取用神方法。'}),
		mkSection({key:'xiji', title:'喜忌格局', order:8, role:'资深八字命理师', focus:'喜忌确定 + 格局命中',
			segments: BAZI_SEG_FULL, keywords:['喜忌','格局','病药'], maxTokens:3500}),
		mkSection({key:'shishen_main', title:'十神主气', order:9, role:'资深八字命理师', focus:'天干主气十神配置',
			segments: BAZI_SEG_FULL, keywords:['十神','正官','七杀','正财','偏财','食神','伤官','正印','偏印','比肩','劫财'], maxTokens:3500}),
		mkSection({key:'shishen_sub', title:'十神辅气', order:10, role:'资深八字命理师', focus:'地支藏干辅气十神',
			segments: BAZI_SEG_FULL, keywords:['藏干','十神','辅气'], maxTokens:3500}),
		mkSection({key:'gegu', title:'格局命中', order:11, role:'资深八字命理师', focus:'命中的特殊格局',
			segments: BAZI_SEG_FULL, keywords:['格局','从格','化格','专旺'], maxTokens:3500}),
		mkSection({key:'xingge', title:'性格', order:12, role:'资深八字命理师', focus:'性格特质',
			segments: BAZI_SEG_FULL, keywords:['性格','性情'], maxTokens:2500}),
		mkSection({key:'xueye', title:'学业', order:13, role:'资深八字命理师', focus:'学业与文昌',
			segments: BAZI_SEG_FULL, keywords:['学业','文昌','印星','华盖'], maxTokens:2500}),
		mkSection({key:'career', title:'事业方向', order:14, role:'资深八字命理师', focus:'事业方向 · 适合行业',
			segments: BAZI_SEG_FULL, keywords:['事业','行业','官星'], maxTokens:3500,
			retryHint:'明确给出 3-5 个适合行业方向。'}),
		mkSection({key:'wealth', title:'财运', order:15, role:'资深八字命理师', focus:'财运层级与来源',
			segments: BAZI_SEG_FULL, keywords:['财运','财星','禄'], maxTokens:3500,
			retryHint:'明确财运层级（高/中/低）+ 主要财源类型。'}),
		mkSection({key:'marriage', title:'婚姻', order:16, role:'资深八字命理师', focus:'婚姻吉凶 + 配偶特质',
			segments: BAZI_SEG_FULL, keywords:['婚姻','配偶','夫妻宫','桃花'], maxTokens:3500}),
		mkSection({key:'health', title:'健康', order:17, role:'资深八字命理师', focus:'健康与五行配脏',
			segments: BAZI_SEG_FULL, keywords:['健康','疾病','五行配脏'], maxTokens:2500}),
		mkSection({key:'dayun', title:'大运 10 步', order:18, role:'资深八字命理师', focus:'大运 10 步逐步要点',
			segments: BAZI_SEG_FULL, keywords:['大运','十年','起运'], maxTokens:4000, embed:'bazi-luckyDecade'}),
		mkSection({key:'liunian', title:'近 10 年流年', order:19, role:'资深八字命理师', focus:'最近 10 个流年要点',
			segments: BAZI_SEG_FULL, keywords:['流年','应期'], maxTokens:4000}),
	];
}

// ============ 紫微 8 节 ============

const ZIWEI_SEG_BASIC = ['起盘信息', '宫位总览'];
const ZIWEI_SEG_FULL = ['起盘信息', '宫位总览', '来因宫', '命中格局'];
const ZIWEI_SEG_PERIOD = ['起盘信息', '宫位总览', '来因宫', '命中格局', '运限'];

function ziweiSections8(){
	return [
		mkSection({key:'basic', title:'命主基本', order:0, role:'资深紫微斗数命理师', focus:'命主基本信息（性别/出生/命宫身宫）',
			segments: ZIWEI_SEG_BASIC, keywords:['命主','性别','命宫','身宫','四化'], maxTokens:2500}),
		mkSection({key:'minggong', title:'命宫主星', order:1, role:'资深紫微斗数命理师', focus:'命宫主星及其本性',
			segments: ZIWEI_SEG_BASIC, keywords:['命宫','主星','对宫','三方四正'], maxTokens:3500}),
		mkSection({key:'gegu', title:'格局总论', order:2, role:'资深紫微斗数命理师', focus:'格局命中与命格层级',
			segments: ZIWEI_SEG_FULL, keywords:['格局','君臣庆会','明珠出海','府相朝垣'], maxTokens:3500}),
		mkSection({key:'career_wealth', title:'事业财帛', order:3, role:'资深紫微斗数命理师', focus:'事业宫 + 财帛宫合参',
			sub:['事业方向','财源结构','起伏要点'],
			segments: ZIWEI_SEG_FULL, keywords:['事业宫','财帛宫','官禄','田宅'], maxTokens:3500,
			embed:{type:'ziwei-palace-highlight', palace:'guanlu'}}),
		mkSection({key:'marriage', title:'婚姻', order:4, role:'资深紫微斗数命理师', focus:'婚姻吉凶 + 配偶特质',
			segments: ZIWEI_SEG_FULL, keywords:['夫妻宫','配偶','红鸾','天喜','贪狼','天同'], maxTokens:3500,
			embed:{type:'ziwei-palace-highlight', palace:'fuqi'}}),
		mkSection({key:'health', title:'健康', order:5, role:'资深紫微斗数命理师', focus:'疾厄宫 + 健康风险',
			segments: ZIWEI_SEG_FULL, keywords:['疾厄宫','健康','伤病'], maxTokens:2500}),
		mkSection({key:'daxian', title:'大限', order:6, role:'资深紫微斗数命理师', focus:'大限 10 年的总体走向',
			segments: ZIWEI_SEG_PERIOD, keywords:['大限','十年运','限运','三方四正','对宫','迁移宫','运财帛','运官禄','运迁移','三合','本宫'], maxTokens:3500}),
		mkSection({key:'liunian', title:'近 5 年流年', order:7, role:'资深紫微斗数命理师', focus:'最近 5 个流年的吉凶要点',
			segments: ZIWEI_SEG_PERIOD, keywords:['流年','化忌冲','应期','三方四正','对宫','迁移宫','运财帛','运官禄','运迁移','三合','本宫','流耀'], maxTokens:3500}),
	];
}

// ============ 紫微 12 节（中粒度，推荐）============

function ziweiSections12(){
	return [
		mkSection({key:'basic', title:'命主基本信息', order:0, role:'资深紫微斗数命理师', focus:'命主基本信息',
			segments: ZIWEI_SEG_BASIC, keywords:['命主','性别','命宫','身宫'], maxTokens:2500}),
		mkSection({key:'minggong', title:'命宫与身宫', order:1, role:'资深紫微斗数命理师', focus:'命宫 + 身宫合参',
			segments: ZIWEI_SEG_BASIC, keywords:['命宫','身宫','主星','对宫','三方四正'], maxTokens:3500}),
		mkSection({key:'shier', title:'12 宫主辅星', order:2, role:'资深紫微斗数命理师', focus:'12 宫主星 + 辅星组合',
			segments: ZIWEI_SEG_BASIC, keywords:['十二宫','主星','辅星','组合'], maxTokens:5000, embed:'ziwei-12palace'}),
		mkSection({key:'sihua', title:'四化分析', order:3, role:'资深紫微斗数命理师', focus:'生年四化 + 自化 + 飞化',
			segments: ZIWEI_SEG_FULL, keywords:['四化','化禄','化权','化科','化忌','生年四化','自化'], maxTokens:4000,
			retryHint:'1）明确指出生年四化具体宫位；2）解读各化的实义。'}),
		mkSection({key:'gegu', title:'格局命中', order:4, role:'资深紫微斗数命理师', focus:'命中的特殊格局',
			segments: ZIWEI_SEG_FULL, keywords:['格局','君臣庆会','明珠出海','府相朝垣','机月同梁'], maxTokens:3500}),
		mkSection({key:'xingge', title:'性格', order:5, role:'资深紫微斗数命理师', focus:'性格 + 命宫主星定调',
			segments: ZIWEI_SEG_FULL, keywords:['性格','性情','命宫主星'], maxTokens:2500}),
		mkSection({key:'career_wealth', title:'事业财帛', order:6, role:'资深紫微斗数命理师', focus:'事业宫 + 财帛宫合参',
			sub:['事业方向','财源结构','起伏要点'],
			segments: ZIWEI_SEG_FULL, keywords:['事业宫','财帛宫','官禄','田宅'], maxTokens:3500,
			embed:{type:'ziwei-palace-highlight', palace:'guanlu'}}),
		mkSection({key:'marriage', title:'婚姻夫妻', order:7, role:'资深紫微斗数命理师', focus:'婚姻吉凶 + 配偶特质 + 感情起伏',
			sub:['配偶星性与外在特质','感情质量与互动模式','婚姻稳定度与潜在风险','适宜的相处方式'],
			segments: ZIWEI_SEG_FULL, keywords:['夫妻宫','配偶','红鸾','天喜','贪狼','天同','太阴','太阳'], maxTokens:3500,
			embed:{type:'ziwei-palace-highlight', palace:'fuqi'},
			retryHint:'1）必须引用夫妻宫具体星曜（主星+辅星+四化）；2）不要笼统讨论。'}),
		mkSection({key:'health', title:'健康疾厄', order:8, role:'资深紫微斗数命理师', focus:'疾厄宫 + 健康风险',
			segments: ZIWEI_SEG_FULL, keywords:['疾厄宫','健康','伤病'], maxTokens:2500}),
		mkSection({key:'parent', title:'父母子女', order:9, role:'资深紫微斗数命理师', focus:'父母宫 + 子女宫合参',
			sub:['父母关系','子女缘分'],
			segments: ZIWEI_SEG_FULL, keywords:['父母宫','子女宫'], maxTokens:3500}),
		mkSection({key:'daxian', title:'大限 10 年', order:10, role:'资深紫微斗数命理师', focus:'大限 10 年的总体走向',
			segments: ZIWEI_SEG_PERIOD, keywords:['大限','十年运','限运','三方四正','对宫','迁移宫','运财帛','运官禄','运迁移','三合','本宫'], maxTokens:4000}),
		mkSection({key:'liunian', title:'流年流月', order:11, role:'资深紫微斗数命理师', focus:'近期流年流月要点',
			segments: ZIWEI_SEG_PERIOD, keywords:['流年','流月','化忌冲','应期','三方四正','对宫','迁移宫','运财帛','运官禄','运迁移','三合','本宫','流耀'], maxTokens:4000}),
	];
}

// ============ 紫微 20 节（细粒度）============

function ziweiSections20(){
	return [
		mkSection({key:'basic', title:'命主基本', order:0, role:'资深紫微斗数命理师', focus:'命主基本信息',
			segments: ZIWEI_SEG_BASIC, keywords:['命主','性别'], maxTokens:2500}),
		mkSection({key:'minggong', title:'命宫', order:1, role:'资深紫微斗数命理师', focus:'命宫详解',
			segments: ZIWEI_SEG_BASIC, keywords:['命宫','主星','对宫'], maxTokens:3500}),
		mkSection({key:'shengong', title:'身宫', order:2, role:'资深紫微斗数命理师', focus:'身宫详解',
			segments: ZIWEI_SEG_BASIC, keywords:['身宫'], maxTokens:2500}),
		mkSection({key:'laiyin_sihua', title:'来因宫与生年四化', order:3, role:'资深紫微斗数命理师', focus:'来因宫 + 生年四化',
			segments: ZIWEI_SEG_FULL, keywords:['来因宫','生年四化','化禄','化权','化科','化忌'], maxTokens:3500}),
		mkSection({key:'minggong_star', title:'命宫主星', order:4, role:'资深紫微斗数命理师', focus:'命宫主星深度解读',
			segments: ZIWEI_SEG_FULL, keywords:['命宫','主星','紫微','天府','武曲','贪狼','太阳','太阴'], maxTokens:3500}),
		mkSection({key:'p_xiongdi', title:'兄弟宫', order:5, role:'资深紫微斗数命理师', focus:'兄弟宫详解',
			segments: ZIWEI_SEG_FULL, keywords:['兄弟宫'], maxTokens:2500,
			embed:{type:'ziwei-palace-highlight', palace:'xiongdi'}}),
		mkSection({key:'p_fuqi', title:'夫妻宫', order:6, role:'资深紫微斗数命理师', focus:'夫妻宫详解',
			segments: ZIWEI_SEG_FULL, keywords:['夫妻宫','配偶','红鸾','天喜'], maxTokens:3500,
			embed:{type:'ziwei-palace-highlight', palace:'fuqi'}}),
		mkSection({key:'p_zinv', title:'子女宫', order:7, role:'资深紫微斗数命理师', focus:'子女宫详解',
			segments: ZIWEI_SEG_FULL, keywords:['子女宫'], maxTokens:2500,
			embed:{type:'ziwei-palace-highlight', palace:'zinv'}}),
		mkSection({key:'p_caibo', title:'财帛宫', order:8, role:'资深紫微斗数命理师', focus:'财帛宫详解',
			segments: ZIWEI_SEG_FULL, keywords:['财帛宫','财运'], maxTokens:3500,
			embed:{type:'ziwei-palace-highlight', palace:'caibo'}}),
		mkSection({key:'p_jie', title:'疾厄宫', order:9, role:'资深紫微斗数命理师', focus:'疾厄宫详解',
			segments: ZIWEI_SEG_FULL, keywords:['疾厄宫','健康'], maxTokens:2500,
			embed:{type:'ziwei-palace-highlight', palace:'jie'}}),
		mkSection({key:'p_qianyi', title:'迁移宫', order:10, role:'资深紫微斗数命理师', focus:'迁移宫详解',
			segments: ZIWEI_SEG_FULL, keywords:['迁移宫','外出','驿马'], maxTokens:2500,
			embed:{type:'ziwei-palace-highlight', palace:'qianyi'}}),
		mkSection({key:'p_jiaoyou', title:'交友宫', order:11, role:'资深紫微斗数命理师', focus:'交友/奴仆宫详解',
			segments: ZIWEI_SEG_FULL, keywords:['交友宫','奴仆宫','朋友'], maxTokens:2500,
			embed:{type:'ziwei-palace-highlight', palace:'jiaoyou'}}),
		mkSection({key:'p_guanlu', title:'事业宫', order:12, role:'资深紫微斗数命理师', focus:'事业宫详解',
			segments: ZIWEI_SEG_FULL, keywords:['事业宫','官禄宫'], maxTokens:3500,
			embed:{type:'ziwei-palace-highlight', palace:'guanlu'}}),
		mkSection({key:'p_tianzhai', title:'田宅宫', order:13, role:'资深紫微斗数命理师', focus:'田宅宫详解',
			segments: ZIWEI_SEG_FULL, keywords:['田宅宫','房产','家庭'], maxTokens:3500,
			embed:{type:'ziwei-palace-highlight', palace:'tianzhai'}}),
		mkSection({key:'p_fude', title:'福德宫', order:14, role:'资深紫微斗数命理师', focus:'福德宫详解',
			segments: ZIWEI_SEG_FULL, keywords:['福德宫','享受','心境'], maxTokens:2500,
			embed:{type:'ziwei-palace-highlight', palace:'fude'}}),
		mkSection({key:'p_fumu', title:'父母宫', order:15, role:'资深紫微斗数命理师', focus:'父母宫详解',
			segments: ZIWEI_SEG_FULL, keywords:['父母宫'], maxTokens:2500,
			embed:{type:'ziwei-palace-highlight', palace:'fumu'}}),
		mkSection({key:'sihua_full', title:'四化全盘', order:16, role:'资深紫微斗数命理师', focus:'四化全盘动态',
			segments: ZIWEI_SEG_FULL, keywords:['四化','化禄','化权','化科','化忌','自化','飞化'], maxTokens:4000}),
		mkSection({key:'gegu', title:'格局命中', order:17, role:'资深紫微斗数命理师', focus:'命中的特殊格局',
			segments: ZIWEI_SEG_FULL, keywords:['格局','君臣庆会','明珠出海'], maxTokens:3500}),
		mkSection({key:'daxian', title:'大限分析', order:18, role:'资深紫微斗数命理师', focus:'大限 10 年逐步分析',
			segments: ZIWEI_SEG_PERIOD, keywords:['大限','十年运','三方四正','对宫','迁移宫','运财帛','运官禄','运迁移','三合','本宫'], maxTokens:4000}),
		mkSection({key:'liunian', title:'流年流月', order:19, role:'资深紫微斗数命理师', focus:'流年流月要点',
			segments: ZIWEI_SEG_PERIOD, keywords:['流年','流月','化忌冲','应期','三方四正','对宫','迁移宫','运财帛','运官禄','运迁移','三合','本宫','流耀'], maxTokens:4000}),
	];
}

// ============ 模板装配 ============

function mkTemplate({id, technique, granularity, name, sections, schools}){
	return {
		id,
		technique,
		granularity,
		name,
		sections,
		introSection: INTRO_SECTION,
		outroSection: OUTRO_SECTION,
		schools: schools || [],
		version: 1,
		readOnly: true,
	};
}

export function getBuiltinReportTemplates(){
	return [
		mkTemplate({id:'bazi-8-v1',  technique:'bazi',  granularity:8,  name:'八字综合报告 · 8 节精炼 v1',    sections: baziSections8()}),
		mkTemplate({id:'bazi-12-v1', technique:'bazi',  granularity:12, name:'八字综合报告 · 12 节中粒度 v1', sections: baziSections12()}),
		mkTemplate({id:'bazi-20-v1', technique:'bazi',  granularity:20, name:'八字综合报告 · 20 节细粒度 v1', sections: baziSections20()}),
		mkTemplate({id:'ziwei-8-v1', technique:'ziwei', granularity:8,  name:'紫微综合报告 · 8 节精炼 v1',    sections: ziweiSections8()}),
		mkTemplate({id:'ziwei-12-v1',technique:'ziwei', granularity:12, name:'紫微综合报告 · 12 节中粒度 v1', sections: ziweiSections12()}),
		mkTemplate({id:'ziwei-20-v1',technique:'ziwei', granularity:20, name:'紫微综合报告 · 20 节细粒度 v1', sections: ziweiSections20()}),
	];
}

export function findReportTemplate(templates, technique, granularity){
	return (templates || []).find((t)=>t.technique === technique && t.granularity === granularity) || null;
}

// 渲染单节 userPromptTemplate 时的简单 Mustache 替换（{{var}} → 值）。
// vars: { source, retrieved, sectionData, school, schoolGuideline, sectionsSummary, dynamicsSummary }
//
// v1.16-V 修:空值时连同上下空行一起清掉(否则 prompt 里留孤立 \n\n 块, AI 视为脏数据)。
// v1.14 修:防嵌套替换 — 若 source/retrieved 文本本身含 `{{xxx}}` (如用户从模板笔记复制),
// 不能让它被二次替换误删。用单次扫描避免无限循环。
export function renderTemplateVars(text, vars){
	if(typeof text !== 'string') return '';
	// String.prototype.replace 的 replacer function 是**单次扫描**(不会对 replacer 返回值再次扫描),
	// 所以不需要 placeholder 转义机制 — 单次替换即安全。
	let result = text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key)=>{
		const path = key.split('.');
		let val = vars;
		for(const p of path){
			if(val == null) return '';
			val = val[p];
		}
		if(val == null) return '';
		return `${val}`;
	});
	// v1.16-V: 清孤立空行 (\n\n\n+ → \n\n) 防 空 sectionData 留大块空白污染 prompt
	result = result.replace(/\n{3,}/g, '\n\n');
	return result;
}
