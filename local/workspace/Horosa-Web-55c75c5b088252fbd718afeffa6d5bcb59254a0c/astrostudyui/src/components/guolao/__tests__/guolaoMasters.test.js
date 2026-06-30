// 七政四余 三主/命宫配干(五虎遁)/化曜 前端派生 golden(deriveGuolaoMasters,古法立成)。
import { deriveGuolaoMasters, isCombustObj } from '../GuoLaoMoiraPanel';
import * as AstroConst from '../../../constants/AstroConst';

describe('G8 伏(焦伤)判定 isCombustObj', () => {
	test('七政近日(<8°)或 combust phase → 伏;远离/太阳/四余 → 否', () => {
		expect(isCombustObj({ phase: 'combust' }, 100, 200, AstroConst.MERCURY)).toBe(true);   // phase
		expect(isCombustObj({ phase: 'cazimi' }, 100, 200, AstroConst.VENUS)).toBe(true);       // 核心
		expect(isCombustObj({}, 105, 100, AstroConst.VENUS)).toBe(true);    // 距5°<8
		expect(isCombustObj({}, 120, 100, AstroConst.MARS)).toBe(false);    // 距20°
		expect(isCombustObj({}, 358, 2, AstroConst.MOON)).toBe(true);       // 跨0°环绕 距4°
		expect(isCombustObj({}, 100, 100, AstroConst.SUN)).toBe(false);     // 太阳本身不判
		expect(isCombustObj({}, 100, 100, AstroConst.SOUTH_NODE)).toBe(false);  // 四余(计)不判
		expect(isCombustObj({}, 100, 100, AstroConst.PURPLE_CLOUDS)).toBe(false); // 炁不判
		expect(isCombustObj(null, 100, 100, AstroConst.MARS)).toBe(false);  // 防御
	});
});

describe('deriveGuolaoMasters 古法派生', () => {
	test('命午身酉·命度角宿·甲年:三主/五虎遁/化曜', () => {
		const ms = deriveGuolaoMasters({ zi: '午' }, { zi: '酉' }, '角', '甲');
		expect(ms.lifeMaster).toBe('日');   // 午=狮子宫主日
		expect(ms.bodyMaster).toBe('金');   // 酉=金牛宫主金
		expect(ms.degMaster).toBe('木');    // 角宿度主木
		expect(ms.mingStem).toBe('庚');     // 甲年→寅宫丙;命宫午:丙+4=庚
		expect(ms.mingPalaceZi).toBe('午');
		expect(ms.huayao).toBe('火');       // 甲化火
	});
	test('五虎遁锚点:甲年命寅=丙寅、己年命寅=丙寅、命卯=丁', () => {
		expect(deriveGuolaoMasters({ zi: '寅' }, {}, '', '甲').mingStem).toBe('丙');
		expect(deriveGuolaoMasters({ zi: '寅' }, {}, '', '己').mingStem).toBe('丙');
		expect(deriveGuolaoMasters({ zi: '卯' }, {}, '', '甲').mingStem).toBe('丁');
		expect(deriveGuolaoMasters({ zi: '寅' }, {}, '', '乙').mingStem).toBe('戊');   // 乙庚戊为头
	});
	test('zi 含「宫」后缀也能取地支;缺数据防御不抛', () => {
		const ms = deriveGuolaoMasters({ zi: '子宫' }, { zi: '' }, '', '');
		expect(ms.lifeMaster).toBe('土');   // 子=宝瓶宫主土
		expect(ms.bodyMaster).toBe('');     // 身宫缺→空
		expect(ms.huayao).toBe('');
		expect(()=>deriveGuolaoMasters(null, null, null, null)).not.toThrow();
	});
	test('化曜全 10 干', () => {
		const exp = { 甲: '火', 乙: '月孛', 丙: '木', 丁: '金', 戊: '土', 己: '太阴', 庚: '水', 辛: '紫炁', 壬: '计都', 癸: '罗睺' };
		Object.keys(exp).forEach((g)=>{
			expect(deriveGuolaoMasters({ zi: '子' }, {}, '', g).huayao).toBe(exp[g]);
		});
	});
});
