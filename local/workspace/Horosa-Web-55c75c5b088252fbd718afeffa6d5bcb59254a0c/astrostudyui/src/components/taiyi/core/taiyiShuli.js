// 太乙「数理十类」标签(卷二 §22)。纯派生:据主算/客算/定算等数字 + 太乙宫阴阳,
// 贴重阳/重阴/上和/次和/下和/无门/三才(无天无地无人)/长短/不和 等标签。文案为公有领域术数通则,逐字取自方法骨架。
// 移植自文档「古法复原」引擎 shuli_label;前端纯函数,零触碰后端立成表 golden。

// 八正宫阴阳(§22:艮震巽离为阳,坤兑乾坎为阴;中宫不计)。键=太乙宫名(pan.taiyiPalace)。
export const PALACE_YINYANG = {
	艮: '阳', 震: '阳', 巽: '阳', 离: '阳',
	坤: '阴', 兑: '阴', 乾: '阴', 坎: '阴',
};

export function palaceYinYang(palace){
	if(!palace){ return ''; }
	const key = String(palace).charAt(0); // 兼容「艮」「艮宫」
	return PALACE_YINYANG[key] || '';
}

// 数字 n 的数理标签列表;taiyiYinYang 为太乙宫阴阳(用于「不和」判定),缺省则跳过不和。
export function shuliLabel(n, taiyiYinYang){
	if(n === undefined || n === null || isNaN(n)){ return ['—']; }
	const tags = [];
	if(n === 33 || n === 39){ tags.push('重阳数(主火·亢旱)'); }
	if(n === 22 || n === 26){ tags.push('重阴数(主水·阴疫)'); }
	if([12, 16, 21, 27, 34, 38].includes(n)){ tags.push('下和数'); }
	if([1, 4, 8].includes(n)){ tags.push('上和数'); }
	if([2, 6, 3, 9].includes(n)){ tags.push('次和数'); }
	if([5, 15, 25, 35].includes(n)){ tags.push('无门·主大灾'); }
	if(n >= 1 && n <= 9){ tags.push('无天(无十)·短'); }
	if(n >= 11){ tags.push('长数'); }
	if(n % 10 === 0){ tags.push('无人(无一)'); }
	if(taiyiYinYang === '阳' && n % 2 === 1){ tags.push('不和(阳宫得奇)'); }
	if(taiyiYinYang === '阴' && n % 2 === 0){ tags.push('不和(阴宫得偶)'); }
	return tags.length ? tags : ['平'];
}

// 标签吉凶倾向(用于 UI 着色):凶 / 吉 / 中。
export function shuliTone(tag){
	if(/大灾|重阳|重阴|不和/.test(tag)){ return 'bad'; }
	if(/上和|次和|下和/.test(tag)){ return 'good'; }
	return 'neutral';
}

// 据 pan 计算三算数理:{ home:[...], away:[...], set:[...], yinYang }。
export function computeTaiyiShuli(pan){
	if(!pan){ return null; }
	const yy = palaceYinYang(pan.taiyiPalace);
	const toNum = (v) => (typeof v === 'number' ? v : parseInt(v, 10));
	return {
		yinYang: yy,
		home: shuliLabel(toNum(pan.homeCal), yy),
		away: shuliLabel(toNum(pan.awayCal), yy),
		set: shuliLabel(toNum(pan.setCal), yy),
	};
}
