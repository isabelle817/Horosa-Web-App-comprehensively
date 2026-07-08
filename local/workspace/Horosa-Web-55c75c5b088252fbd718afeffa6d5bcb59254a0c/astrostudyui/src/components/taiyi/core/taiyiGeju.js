// 太乙格局判定(§14)。纯派生:据 kintaiyi pan 的太乙/文昌/始击落点 + 主客大将宫,识别 掩/迫(内外)/囚/格/对。
// 断辞为公有领域术数通则,移植自文档「古法复原」引擎 detect_geju(以 kintaiyi 现成落点为输入,非重算)。

// 16 神环落点序(= 文档 POS2INDEX;与 TaiYiCore GONG16_ORDER 一致)
const RING16 = '子丑艮寅卯辰巽巳午未坤申酉戌乾亥'.split('');
// 太乙九宫方位对冲(乾1↔坤7、离2↔坎8、艮3↔兑6、震4↔巽9)
const OPPO_GONG = { 1: 7, 7: 1, 2: 8, 8: 2, 3: 6, 6: 3, 4: 9, 9: 4 };

function ringIdx(pos){ return pos ? RING16.indexOf(pos) : -1; }

// 据 pan 判格局。返回 [{ name, text, kind }]。kind 用于盘面连线/着色(掩/迫/囚/格/对)。
export function computeGeju(pan){
	if(!pan || !pan.taiyiPalace){ return []; }
	const taiyiPos = pan.taiyiPalace;          // 太乙落点(正宫)
	const taiyiIdx = ringIdx(taiyiPos);
	const taiyiNum = Number(pan.taiyiNum);     // 太乙宫数
	const wcPos = pan.skyeyes, sjPos = pan.sf;
	const wcIdx = ringIdx(wcPos), sjIdx = ringIdx(sjPos);
	const zhuDj = Number(pan.homeGeneral), keDj = Number(pan.awayGeneral);
	const out = [];
	// 掩:文昌/始击与太乙同落点
	if(wcPos && wcPos === taiyiPos){ out.push({ name: '掩(文昌掩太乙)', text: '阴盛阳衰,主将不得力、权移他手。', kind: 'yan', from: '文昌', to: '太乙' }); }
	if(sjPos && sjPos === taiyiPos){ out.push({ name: '掩(始击掩太乙)', text: '客方掩我,谋窃倾夺之象。', kind: 'yan', from: '始击', to: '太乙' }); }
	// 迫:文昌/始击在太乙前后一位(环上相邻)
	[['文昌', wcIdx, '文昌'], ['始击', sjIdx, '始击']].forEach(([nm, idx, src]) => {
		if(idx < 0 || taiyiIdx < 0){ return; }
		if((idx - taiyiIdx + 16) % 16 === 1){ out.push({ name: `迫(${nm}在太乙后一位)`, text: '外迫,外来不利。', kind: 'po', from: src, to: '太乙' }); }
		if((taiyiIdx - idx + 16) % 16 === 1){ out.push({ name: `迫(${nm}在太乙前一位)`, text: '内迫,事由内起。', kind: 'po', from: src, to: '太乙' }); }
	});
	// 囚:主大将与太乙同宫
	if(zhuDj && taiyiNum && zhuDj === taiyiNum){ out.push({ name: '囚(主大将同太乙)', text: '在绝阳之地君灾,在四/九/一/七宫辅相灾。', kind: 'qiu', from: '主大将', to: '太乙' }); }
	// 格:主大将与太乙对宫
	if(zhuDj && taiyiNum && zhuDj === OPPO_GONG[taiyiNum]){ out.push({ name: '格(主大将对太乙)', text: '君臣背离。', kind: 'ge', from: '主大将', to: '太乙' }); }
	// 对:太乙与始击隔宫相对
	if(sjIdx >= 0 && taiyiIdx >= 0 && (sjIdx - taiyiIdx + 16) % 16 === 8){ out.push({ name: '对(太乙始击相对)', text: '太乙与始击隔宫相对,彼此牵制。', kind: 'dui', from: '始击', to: '太乙' }); }
	return out;
}
