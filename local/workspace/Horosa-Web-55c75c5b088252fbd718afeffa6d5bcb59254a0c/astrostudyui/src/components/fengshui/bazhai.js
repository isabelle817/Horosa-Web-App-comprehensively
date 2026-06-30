// 八宅派（东西四宅·大游年）· 命卦相配 + 门主灶。
// 大游年八星用「翻卦掌变爻法」(上中下中上中下中)生成,非硬编码 8×8 表(与手册 3.4 等价,可互验)。
import { mingGua, mingGroup } from './liqiCore';
import { HOUTIAN_POS, POS_NAME, GONG_GUA } from './fengshuiData';

// 八卦二进制 [下,中,上]（阳1阴0）。
const GUA_BIN = {
	乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0],
	巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0],
};
const BIN_GUA = (()=>{ const m = {}; Object.keys(GUA_BIN).forEach((g)=>{ m[GUA_BIN[g].join('')] = g; }); return m; })();
// 后天宫数 → 卦（含中宫除外）。
const GONG_TO_GUA = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 6: '乾', 7: '兑', 8: '艮', 9: '离' };

// 翻卦变爻序：爻index 上=2/中=1/下=0；八步 上中下中上中下中 → 八星。
const FLIP_SEQ = [2, 1, 0, 1, 2, 1, 0, 1];
const STAR_SEQ = [
	{ key: 'shengqi', name: '生气', star: '贪狼', jx: 'good', rank: '吉', desc: '旺丁进财·活力·升迁' },
	{ key: 'wugui', name: '五鬼', star: '廉贞', jx: 'bad', rank: '大凶', desc: '火灾·官非·失盗·争斗' },
	{ key: 'yannian', name: '延年', star: '武曲', jx: 'good', rank: '吉', desc: '寿康·姻缘·人和·财禄' },
	{ key: 'liusha', name: '六煞', star: '文曲', jx: 'bad', rank: '凶', desc: '桃花·口舌·破财·官讼' },
	{ key: 'huohai', name: '祸害', star: '禄存', jx: 'bad', rank: '凶', desc: '是非·疾病·退气' },
	{ key: 'tianyi', name: '天医', star: '巨门', jx: 'good', rank: '吉', desc: '健康·贵人·财稳' },
	{ key: 'jueming', name: '绝命', star: '破军', jx: 'bad', rank: '大凶', desc: '重病·绝嗣·灾厄' },
	{ key: 'fuwei', name: '伏位', star: '辅弼', jx: 'good', rank: '小吉', desc: '安稳·守成·助文昌' },
];

// 大游年八星：坐山卦（伏位）→ {方位宫: 星}。
export function dayouNian(zuoGua) {
	const bin = GUA_BIN[zuoGua];
	if (!bin) { return null; }
	const cur = bin.slice();
	const out = {};   // gong → starObj
	for (let i = 0; i < 8; i++) {
		const yao = FLIP_SEQ[i];
		cur[yao] = cur[yao] ? 0 : 1;           // 翻该爻
		const gua = BIN_GUA[cur.join('')];
		const gong = HOUTIAN_POS[gua];
		out[gong] = { ...STAR_SEQ[i], gua, gong, dir: POS_NAME[gong] };
	}
	return out;
}

// 八宅排盘：坐山(卦或24山)→ 宅卦 + 八方游星 + 命卦相配 + 门主灶。
//   { zuoGua, ming:{year,isMale}, mode:'zhai'|'ming' }
export function bazhai({ zuoGua, ming, mode = 'zhai' } = {}) {
	if (!(zuoGua in GUA_BIN)) { return { available: false }; }
	const zhaiGroup = mingGroup(HOUTIAN_POS[zuoGua] === 1 ? 1 : ['坎', '离', '震', '巽'].indexOf(zuoGua) >= 0 ? 1 : 9);
	// 宅组：坐卦属东四(坎离震巽)/西四(乾坤艮兑)。
	const EAST = ['坎', '离', '震', '巽'];
	const zhaiGroupName = EAST.indexOf(zuoGua) >= 0 ? '东四宅' : '西四宅';
	const stars = dayouNian(zuoGua);                          // 以宅起伏位
	let mingGuaNum = null; let mingGroupName = null; let mingStars = null; let match = null;
	if (ming && ming.year) {
		mingGuaNum = mingGua(ming.year, ming.isMale !== false);
		mingGroupName = mingGroup(mingGuaNum);
		const mGua = GONG_TO_GUA[mingGuaNum] || GONG_GUA[mingGuaNum];
		if (mGua && GUA_BIN[mGua]) { mingStars = dayouNian(mGua); }
		const zhaiEast = zhaiGroupName === '东四宅';
		const mingEast = mingGroupName === '东四命';
		match = { same: zhaiEast === mingEast, text: (zhaiEast === mingEast) ? '宅命同组·相配为吉' : '宅命跨组·不利（宜用游年吉方布局补救）' };
	}
	// 门主灶（3.10）：门/主宜在生气/延年/天医等吉方;灶宜「坐凶向吉」(火口朝吉方)。
	const baseStars = (mode === 'ming' && mingStars) ? mingStars : stars;
	const goodDirs = Object.values(baseStars).filter((s)=>s.jx === 'good').map((s)=>`${s.dir}(${s.name})`);
	const badDirs = Object.values(baseStars).filter((s)=>s.jx === 'bad').map((s)=>`${s.dir}(${s.name})`);
	return {
		available: true, zuoGua, zhaiGroup: zhaiGroupName,
		palaces: Object.keys(baseStars).map((g)=>({ gong: +g, ...baseStars[g] })),
		mingGua: mingGuaNum, mingGroup: mingGroupName, match, mode,
		doorMainStove: {
			door: `宜开${goodDirs[0] || '吉方'}`, main: `主卧宜${goodDirs.slice(0, 2).join('/') || '吉方'}`,
			stove: `灶宜坐凶（${badDirs[0] || '凶方'}）向吉、火口朝${goodDirs[0] || '吉方'}`,
		},
		note: '大游年用翻卦变爻法生成(与手册3.4等价);以宅/以命可切(默认以宅)',
	};
}

export { GUA_BIN };
