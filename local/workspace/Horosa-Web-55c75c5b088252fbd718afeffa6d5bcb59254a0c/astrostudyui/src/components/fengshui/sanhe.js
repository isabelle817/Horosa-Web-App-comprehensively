// 三合派 · 双山五行 + 十二长生四大局水法 + 立向收水（基础）。
// 长生四局表移植 golden(out_sanhe);拨砂/黄泉/穿山透地为后续波次。
import { sanheChangshengTable, sanheStageAt } from './liqiCore';
import { SANHE_STAGE_JX, SANHE_SHUANGSHAN } from './fengshuiData';

// 四大局：由水口(去水方/墓库)定局。墓库山组 → 局（地理五诀）。
// 火局墓戌·金局墓丑·水局墓辰·木局墓未；水口落该组任一山即定该局。
const SHUIKOU_JU = {
	火局: ['辛', '戌', '乾'], 金局: ['癸', '丑', '艮'],
	水局: ['乙', '辰', '巽'], 木局: ['丁', '未', '坤'],
};
const JU_LIST = ['火局', '金局', '水局', '木局'];
const JU_WUXING = { 火局: '火', 金局: '金', 水局: '水', 木局: '木' };
// 各局四正向（正生/正旺/正墓/正养）速查：由长生十二阶在双山的落点反推（地理五诀 5.9）。
const ZHI_OF_SHUANGSHAN = (()=>{ const m = {}; Object.keys(SANHE_SHUANGSHAN).forEach((z)=>{ m[SANHE_SHUANGSHAN[z]] = z; }); return m; })();

// 水口 → 局（落墓库组）。
export function juByShuiKou(shuiKou) {
	for (const ju of JU_LIST) { if (SHUIKOU_JU[ju].indexOf(shuiKou) >= 0) { return ju; } }
	return null;
}

// 三合排盘：水口定局 → 24 山长生环 + 立向收水（左右水定生/旺向）。
//   shuiKou 去水方山名;waterFlow 'leftToRight'(左水倒右→旺向)/'rightToLeft'(右水倒左→生向)。
export function sanhe({ shuiKou, waterFlow } = {}) {
	const ju = shuiKou ? juByShuiKou(shuiKou) : null;
	const table = sanheChangshengTable();
	let ring = null;
	if (ju) {
		ring = table.map((r)=>({
			shuangshan: r.shuangshan, zhi: r.zhi,
			stage: r[ju], jx: SANHE_STAGE_JX[r[ju]],
		}));
	}
	// 立向收水（5.10）：左水倒右宜立旺向(生来旺去)、右水倒左宜立生向。
	let xiangFa = null;
	if (ju) {
		const wuxing = JU_WUXING[ju];
		const wang = ring.find((c)=>c.stage === '帝旺');
		const sheng = ring.find((c)=>c.stage === '长生');
		if (waterFlow === 'leftToRight') {
			xiangFa = { type: '正旺向', shuangshan: wang ? wang.shuangshan : null,
				note: `左水倒右、${wuxing}局宜立旺向（${wang ? wang.shuangshan : ''}）：生来旺去、库消水` };
		} else if (waterFlow === 'rightToLeft') {
			xiangFa = { type: '正生向', shuangshan: sheng ? sheng.shuangshan : null,
				note: `右水倒左、${wuxing}局宜立生向（${sheng ? sheng.shuangshan : ''}）：禄存流尽佩金鱼` };
		}
	}
	return {
		available: !!ju, shuiKou, ju, juWuXing: ju ? JU_WUXING[ju] : null,
		ring, xiangFa, table,
		note: ju ? `水口落「${shuiKou}」属${ju}（墓库定局）` : '未定局（请选去水方/水口）',
	};
}

export { sanheStageAt, ZHI_OF_SHUANGSHAN };
