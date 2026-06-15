// 报告功能 - 流派清单 + 流派指引（注入 systemPrompt 的 {{schoolGuideline}}）
// 用户在生成器里手动选；自由文本输入也允许（仅缺 guideline 注入）。

export const KNOWN_SCHOOLS = {
	bazi: [
		{ key: 'ziping',     name: '子平派',         guideline: '严格遵循《渊海子平》《三命通会》框架；以日干为我、十神格局为核；用神取调候/扶抑；避免使用盲派的子时分早晚、纳音等非主流概念。' },
		{ key: 'mang',       name: '盲派',           guideline: '采用盲派术语（如阴阳/虚实/调候/纳音/旺衰应期）；不强求格局法；重六亲应期 + 神煞实义；可用"四正""分野"等概念。' },
		{ key: 'xinpai',     name: '新派（段建业）', guideline: '以段建业体系为准：调候为核、八字旺衰、宫位定向、十神虚实；不混用日主旺衰传统判法。' },
		{ key: 'ditianhsui', name: '滴天髓派',       guideline: '遵循《滴天髓》理路：以中和为体、流通为用、寒暖燥湿调候并重；尊滴天髓原文用语。' },
		{ key: 'tongkao',    name: '神峰通考派',     guideline: '以《神峰通考》为本：扶抑用神为主、动静喜忌、五行寒暖；判断病药须明示。' },
	],
	ziwei: [
		{ key: 'feixing',    name: '北派飞星',        guideline: '以飞星为核心：四化飞宫、宫位互涉、三方四正动态分析；不重三合派的"对宫照"为主，而重四化具体路径。' },
		{ key: 'zhongzhou',  name: '中州派',          guideline: '以王亭之为代表：星曜组合 + 三方四正 + 性质重于亮度；不强调四化飞宫；术语用"星情""三方""组合"。' },
		{ key: 'sanhe',      name: '三合派',          guideline: '重宫位三合四正 + 主星组合本性 + 庙旺利陷亮度判吉凶；轻四化飞宫；可参《紫微斗数全书》原文。' },
		{ key: 'qintian',    name: '钦天四化派',      guideline: '以钦天门四化论为核：生年四化 + 自化 + 飞化三层并用；术语极重"忌煞冲""禄权科"组合应期。' },
	],
};

export function getSchoolList(technique){
	return KNOWN_SCHOOLS[technique] || [];
}

// 给定多个用户选的 schoolKey/name，返回 prompt 注入用的文本
// 输入：['ziping', '盲派']（key 或 name 都可）
// 输出：{ schoolDisplay: '子平派、盲派', schoolGuideline: '... ...合并' }
export function resolveSchoolPrompt(technique, selected){
	const list = getSchoolList(technique);
	const items = (selected || []).map((s)=>{
		const key = `${s || ''}`.trim();
		if(!key) return null;
		const found = list.find((x)=>x.key === key) || list.find((x)=>x.name === key);
		if(found) return found;
		// 未知流派给个通用 guideline,避免空字符串混入 prompt 让 AI 困惑(audit 修)
		return {
			key,
			name: key,
			guideline: `用户自定义流派"${key}"在内置库中未注册。请尝试按该流派名的字面含义和常识推测其术语体系输出，如不确定就采用主流共识。`,
		};
	}).filter(Boolean);
	if(items.length === 0){
		return {
			schoolDisplay: '通用',
			schoolGuideline: '请综合多家流派的共识来判断，避免使用某一派特有的小众术语。',
		};
	}
	return {
		schoolDisplay: items.map((x)=>x.name).join('、'),
		// 每项都保证有 guideline,join 不会出现空项(audit 修)
		schoolGuideline: items.map((x)=>`【${x.name}】${x.guideline || '请按该流派字面含义推测。'}`).join(' '),
	};
}

// 用户编辑资料时建议的常见流派（含 ziwei/bazi 两类汇总）
export function suggestSchoolNames(){
	const out = [];
	Object.keys(KNOWN_SCHOOLS).forEach((tech)=>{
		KNOWN_SCHOOLS[tech].forEach((s)=>{
			if(!out.includes(s.name)) out.push(s.name);
		});
	});
	return out;
}
