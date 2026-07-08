import { shengKe, changshengStage, wuxingOf, LIUCHONG, PALACE_TYPES, ZHI_WUXING, yarrowYaoFromRoll } from '../../gua/LiuYaoConst';

describe('六爻常量底座(LiuYaoConst)', () => {
	test('地支五行', () => {
		expect(wuxingOf('子')).toBe('水');
		expect(wuxingOf('午')).toBe('火');
		expect(ZHI_WUXING['申']).toBe('金');
	});
	test('生克关系:木生火、木克土、金克木、比和', () => {
		expect(shengKe('木', '火')).toBe('生');
		expect(shengKe('火', '木')).toBe('泄');
		expect(shengKe('木', '土')).toBe('克');
		expect(shengKe('土', '木')).toBe('耗');
		expect(shengKe('木', '木')).toBe('同');
	});
	test('六冲:子午、卯酉、寅申', () => {
		expect(LIUCHONG['子']).toBe('午');
		expect(LIUCHONG['卯']).toBe('酉');
		expect(LIUCHONG['寅']).toBe('申');
	});
	test('十二长生(土两说):金长生在巳;火长生在寅;土水土同宫=申、火土同宫=寅', () => {
		expect(changshengStage('金', '巳', 'water')).toBe('长生');
		expect(changshengStage('火', '寅', 'water')).toBe('长生');
		expect(changshengStage('土', '申', 'water')).toBe('长生'); // 水土同宫
		expect(changshengStage('土', '寅', 'fire')).toBe('长生');  // 火土同宫
		expect(changshengStage('金', '巳', 'off')).toBe('');       // 关
	});
	test('卦序类型表:8 类 + 世应位', () => {
		expect(PALACE_TYPES.length).toBe(8);
		const ben = PALACE_TYPES.find((p) => p.type === '本宫');
		expect(ben.shi).toBe(6); expect(ben.ying).toBe(3);
		const youhun = PALACE_TYPES.find((p) => p.type === '游魂');
		expect(youhun.shi).toBe(4); expect(youhun.ying).toBe(1);
	});

	test('大衍蓍草起卦(WP-I):老阳3/少阳5/少阴7/老阴1=16;老阳老阴为动爻', () => {
		expect(yarrowYaoFromRoll(0)).toEqual({ value: 1, change: true });   // 老阳9
		expect(yarrowYaoFromRoll(3)).toEqual({ value: 1, change: false });  // 少阳7
		expect(yarrowYaoFromRoll(8)).toEqual({ value: 0, change: false });  // 少阴8
		expect(yarrowYaoFromRoll(15)).toEqual({ value: 0, change: true });  // 老阴6
		// 全 16 roll 的分布
		const counts = { laoyang: 0, shaoyang: 0, shaoyin: 0, laoyin: 0 };
		for(let r = 0; r < 16; r++){
			const y = yarrowYaoFromRoll(r);
			if(y.value === 1 && y.change){ counts.laoyang++; }
			else if(y.value === 1 && !y.change){ counts.shaoyang++; }
			else if(y.value === 0 && !y.change){ counts.shaoyin++; }
			else { counts.laoyin++; }
		}
		expect(counts).toEqual({ laoyang: 3, shaoyang: 5, shaoyin: 7, laoyin: 1 });
	});
});
