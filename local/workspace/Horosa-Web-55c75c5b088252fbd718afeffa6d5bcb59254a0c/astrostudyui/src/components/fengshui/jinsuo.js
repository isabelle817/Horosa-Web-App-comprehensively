// 金锁玉关（过路阴阳）· 八方砂水 + 得位/失位 + 断语。
// 核心原则:后天 1234(坎坤震巽)要砂主丁、6789(乾兑艮离)要水主财(7.A.1);48 细断逐卦含义(7.A.5)。
// 注:与现有「纳气盘 6789=气位」是不同体系,不可混用。
import { HOUTIAN_POS, POS_NAME } from './fengshuiData';

// 后天宫数 → 卦。
const GONG_GUA8 = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
const SAND_GONG = new Set([1, 2, 3, 4]);    // 要砂(主丁)
const WATER_GONG = new Set([6, 7, 8, 9]);   // 要水(主财)
// 八卦得位/失位简断（人物·应事;金锁玉关二十四山砂水诀，公有）。
const JINSUO_DESC = {
	坎: { de: '中男聪秀·肾耳健·进田', shi: '中男损·肾耳血疾·漂荡' },
	坤: { de: '老母旺·田产丰·人丁众', shi: '老母病·腹疾·寡居' },
	震: { de: '长男发·权威·足健', shi: '长男损·肝足·官非' },
	巽: { de: '长女贵·文昌·风发', shi: '长女病·风疾·自缢' },
	乾: { de: '老父贵·官禄·财丰', shi: '老父损·头疾·破财' },
	兑: { de: '少女悦·口才·偏财', shi: '少女损·口喉·盗劫' },
	艮: { de: '少男旺·田宅·孝义', shi: '少男损·脾鼻·小口' },
	离: { de: '中女丽·文明·进财', shi: '中女病·目疾·心火·官讼' },
};

// 金锁玉关排盘：八方各「砂/水/平」→ 逐方得位失位 + 断 + 化解。
//   sectors: {坎:'sand'|'water'|'flat', …}
export function jinsuo({ sectors = {} } = {}) {
	const palaces = [];
	for (let g = 1; g <= 9; g++) {
		if (g === 5) { continue; }
		const gua = GONG_GUA8[g];
		const actual = sectors[gua] || 'flat';
		const need = SAND_GONG.has(g) ? 'sand' : 'water';
		const deWei = actual === need;
		const wantsSand = need === 'sand';
		const d = JINSUO_DESC[gua];
		let desc; let remedy = null;
		if (actual === 'flat') { desc = `平洋未现，${wantsSand ? '宜实起砂' : '宜低见水'}`; }
		else if (deWei) { desc = `得位·${d.de}`; }
		else {
			desc = `失位·${d.shi}`;
			remedy = wantsSand ? '宜填实堆高（砂宫见水→填实化解）' : '宜疏低引水（水宫见砂→疏导化解）';
		}
		palaces.push({
			gong: g, gua, dir: POS_NAME[g], need, needLabel: wantsSand ? '要砂(主丁)' : '要水(主财)',
			actual, deWei, desc, remedy,
		});
	}
	const deCount = palaces.filter((p)=>p.deWei).length;
	return {
		available: true, palaces,
		deCount, score: Math.round(deCount / 8 * 100),
		remedies: palaces.filter((p)=>p.remedy).map((p)=>`${p.dir}：${p.remedy}`),
		note: '1234坎坤震巽要砂主丁、6789乾兑艮离要水主财;得位吉失位凶(应期配元运/流年 M4)',
	};
}
