import { pageMatchesQuery, matchedKeyword } from '../HomePageSetup';

// 模块卡片样例（keywords = 模块内术法串，见 pages/index.js navigationPages）。
const auxchart = { label: '辅盘', key: 'auxchart', group: '命', keywords: '卜卦盘 择日盘 世俗盘 调波盘 龙盘' };
const direction = { label: '星运', key: 'direction', group: '命', keywords: '主限法 太阳弧 波斯向运 法达星限' };
const cnyibu = { label: '其他', key: 'cnyibu', group: '卜', keywords: '金口诀 五兆 太玄 荆诀 皇极经世' };
const ziwei = { label: '紫微', key: 'ziwei', group: '命', keywords: '紫微斗数 四化' };

describe('导航搜索 pageMatchesQuery（可搜「模块内术法」）', ()=>{
	test('搜术法名命中所在模块（用户诉求：卜卦盘→辅盘）', ()=>{
		expect(pageMatchesQuery(auxchart, '卜卦盘')).toBe(true);
		expect(pageMatchesQuery(direction, '主限法')).toBe(true);
		expect(pageMatchesQuery(cnyibu, '金口诀')).toBe(true);
		expect(pageMatchesQuery(cnyibu, '皇极经世')).toBe(true);
	});
	test('部分/英文/大小写匹配', ()=>{
		expect(pageMatchesQuery(direction, '波斯')).toBe(true);
		expect(pageMatchesQuery(direction, 'balbillus')).toBe(false); // 该样例 keywords 未含
	});
	test('搜标题/分组仍命中（向后兼容原行为）', ()=>{
		expect(pageMatchesQuery(auxchart, '辅盘')).toBe(true);
	});
	test('无关 query 不命中（不串模块）', ()=>{
		expect(pageMatchesQuery(auxchart, '紫微')).toBe(false);
		expect(pageMatchesQuery(ziwei, '卜卦盘')).toBe(false);
	});
	test('空 query → 全部命中（默认无搜索行为不变）', ()=>{
		expect(pageMatchesQuery(auxchart, '')).toBe(true);
		expect(pageMatchesQuery(auxchart, '   ')).toBe(true);
	});
});

describe('matchedKeyword（命中提示「含 X」）', ()=>{
	test('靠 keyword 命中 → 返回该术法词', ()=>{
		expect(matchedKeyword(auxchart, '卜卦盘')).toBe('卜卦盘');
		expect(matchedKeyword(direction, '波斯')).toBe('波斯向运');
	});
	test('标题直接命中 → 不标注（返回空，避免「含 辅盘」冗余）', ()=>{
		expect(matchedKeyword(auxchart, '辅盘')).toBe('');
	});
	test('空 query / 无匹配 → 空', ()=>{
		expect(matchedKeyword(auxchart, '')).toBe('');
		expect(matchedKeyword(auxchart, '紫微')).toBe('');
	});
});
