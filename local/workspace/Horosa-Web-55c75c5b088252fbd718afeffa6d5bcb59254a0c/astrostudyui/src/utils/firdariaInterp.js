import * as AstroConst from '../constants/AstroConst';
import * as AstroText from '../constants/AstroText';

// 法达星限（Firdaria）解读层：纯数据。为每个主/子限时主提供时段象征，原位增强法达表。
// 时主吉凶须再结合该星在本命与流年的状态综合论断（此处只给「时段主题」之象）。

export const FIRDARIA_MAIN_SIGS = {
	[AstroConst.SUN]: { short: '日', theme: '名誉/权威/事业显达/与父亲及男性长辈/健康活力；主见与公众形象之期。' },
	[AstroConst.MOON]: { short: '月', theme: '情感/家庭/迁徙变动/大众事务/与母亲及女性/身心起伏；情绪与日常生活之期。' },
	[AstroConst.MERCURY]: { short: '水', theme: '学业/文书/商贸/契约/沟通辩思/交通；心智与往来之期。' },
	[AstroConst.VENUS]: { short: '金', theme: '情感婚恋/艺术审美/享乐社交/财帛人际；和合与愉悦之期。' },
	[AstroConst.MARS]: { short: '火', theme: '行动/竞争/冲突争端/伤病手术/开创勇毅；进取与摩擦之期。' },
	[AstroConst.JUPITER]: { short: '木', theme: '扩展/贵人提携/信仰法律/财富机遇/远行高教；增益与拓展之期。' },
	[AstroConst.SATURN]: { short: '土', theme: '责任/限制磨练/迟滞沉淀/根基产业/老成持重；考验与立基之期。' },
	[AstroConst.NORTH_NODE]: { short: '龙首', theme: '聚合增益/趋向发展/外缘汇入；增长之期。' },
	[AstroConst.SOUTH_NODE]: { short: '龙尾', theme: '消减离散/释放旧业/内省回收；削减之期。' },
};

function planetTxt(id){ return AstroText.AstroTxtMsg[id] || `${id}`; }

// 取主/子限时主的组合解读。main 必填，sub 可空。
export function getFirdariaInterp(main, sub){
	const m = FIRDARIA_MAIN_SIGS[main];
	if(!m){ return null; }
	const out = { mainShort: m.short, mainTheme: m.theme, subShort: '', subTheme: '', combined: '' };
	const s = sub ? FIRDARIA_MAIN_SIGS[sub] : null;
	if(s){
		out.subShort = s.short;
		out.subTheme = s.theme;
		out.combined = `${planetTxt(main)}主限 × ${planetTxt(sub)}子限：以「${m.short}」之事为主题，染「${s.short}」之色彩——${m.theme.split('；')[0]}，兼${s.theme.split('；')[0]}。`;
	}else{
		out.combined = `${planetTxt(main)}主限：${m.theme}`;
	}
	return out;
}

export default { FIRDARIA_MAIN_SIGS, getFirdariaInterp };
