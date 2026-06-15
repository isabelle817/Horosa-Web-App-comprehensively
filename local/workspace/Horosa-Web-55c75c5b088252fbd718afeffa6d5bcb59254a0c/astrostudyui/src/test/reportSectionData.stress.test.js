// 压力测试 — 用真实命盘数据验证 ground-truth 输出
// 用户明确要求"反复比较直到完全稳定为止"
// fixtures: 用真实 DHX(2006-10-04 巳时 男) 紫微 12 宫数据 + 八字四柱 + 大运 + 流年
//
// 验证目标:
// 1. 命主 20 岁 → 当前大限定位准确(父母宫癸巳 12-21)
// 2. 三方四正 4 宫干支/宫名全对(运命=父母癸巳/运迁移=疾厄己亥/运财帛=交友丁酉/运官禄=子女辛丑)
// 3. 流年干支按公历准确(2026=丙午/2027=丁未/2028=戊申)
// 4. 身宫位置正确(用户身宫在夫妻)
// 5. 八字大运/流年从 mainDirection/direction.subDirect 正确读出

import {
	buildZiweiSectionData,
	buildBaziSectionData,
	extractZwNatalSanhe,
	extractZwCurrentDaxian,
	extractZwAllDaxian,
	extractZwLiunianSeries,
	extractZwBodyPalace,
	extractZwLifePalace,
	formatZw12PalacesOverview,
	formatZwMingShenPalace,
	extractBaziCurrentDayun,
	extractBaziAllDayun,
	extractBaziLiunianFromBackend,
	validateChartObj,
} from '../utils/reportSectionData';

// ============ DHX 真实命盘 fixture (从 IndexedDB 提取的实际数据) ============
// 来源: 真实生成的紫微 12 节中州派报告, snapshot:
//   命宫(壬辰)大限 2-11, 父母宫(癸巳)大限 12-21, 福德宫(甲午)大限 22-31, ...
function makeDHXZiweiChart(){
	// houses 按地支固定顺序 (子=0..亥=11)
	const houses = [
		// idx 0 = 子位 = 财帛宫
		{ name:'财帛宫', ganzi:'庚子', direction:[82,91], starsMain:[{name:'巨门'}], starsAssist:[{name:'天厨'},{name:'天福'},{name:'凤阁'},{name:'天寿'},{name:'年解'}], starsEvil:[], starsOthersBad:[{name:'蜚廉'},{name:'阴煞'},{name:'灾煞'},{name:'丧门'}], starsOthersGood:[{name:'喜神'}], starsSmall:[] },
		// idx 1 = 丑位 = 子女宫
		{ name:'子女宫', ganzi:'辛丑', direction:[92,101], starsMain:[{name:'天相'}], starsAssist:[], starsEvil:[], starsOthersBad:[{name:'破碎'},{name:'病符'},{name:'天煞'},{name:'贯索'}], starsOthersGood:[], starsSmall:[] },
		// idx 2 = 寅位 = 夫妻宫 (用户身宫所在!)
		{ name:'夫妻宫', ganzi:'庚寅', direction:[102,111], starsMain:[{name:'天同', hua:'禄'},{name:'天梁', hua:'禄'}], starsAssist:[{name:'龙池'},{name:'解神'}], starsOthersBad:[{name:'大耗'},{name:'指背'},{name:'官符'}], starsSmall:[] },
		// idx 3 = 卯位 = 兄弟宫
		{ name:'兄弟宫', ganzi:'辛卯', direction:[112,121], starsMain:[{name:'武曲', hua:'忌'},{name:'七杀'}], starsAssist:[{name:'右弼'}], starsOthersGood:[{name:'咸池'},{name:'月德'},{name:'天才'},{name:'八座'}], starsSmall:[{name:'伏兵'},{name:'小耗'}] },
		// idx 4 = 辰位 = 命宫
		{ name:'命宫', ganzi:'壬辰', direction:[2,11], starsMain:[{name:'太阳'}], starsAssist:[], starsEvil:[{name:'陀罗'},{name:'天刑'},{name:'地劫'}], starsOthersBad:[{name:'恩光'},{name:'截空'},{name:'天虚'},{name:'官符'},{name:'月煞'},{name:'岁破'}], starsSmall:[] },
		// idx 5 = 巳位 = 父母宫 (20岁运命宫)
		{ name:'父母宫', ganzi:'癸巳', direction:[12,21], starsMain:[], starsAssist:[{name:'禄存'},{name:'文昌', hua:'科'},{name:'天官'}], starsOthersGood:[{name:'红鸾'},{name:'龙德'}], starsOthersBad:[{name:'截空'},{name:'大耗'},{name:'亡神'}], starsSmall:[{name:'博士'}] },
		// idx 6 = 午位 = 福德宫
		{ name:'福德宫', ganzi:'甲午', direction:[22,31], starsMain:[{name:'天机', hua:'权'}], starsAssist:[], starsEvil:[{name:'擎羊'},{name:'地空'},{name:'火星'}], starsOthersBad:[{name:'旬空'},{name:'白虎'}], starsSmall:[{name:'力士'},{name:'将星'}] },
		// idx 7 = 未位 = 田宅宫
		{ name:'田宅宫', ganzi:'乙未', direction:[32,41], starsMain:[{name:'紫微', hua:'权'},{name:'破军'}], starsAssist:[], starsOthersGood:[{name:'天德'},{name:'天月'}], starsOthersBad:[{name:'封诰'},{name:'寡宿'},{name:'副旬空'}], starsSmall:[{name:'青龙'},{name:'攀鞍'}] },
		// idx 8 = 申位 = 官禄宫
		{ name:'官禄宫', ganzi:'丙申', direction:[42,51], starsMain:[], starsAssist:[{name:'年马'},{name:'天姚'},{name:'铃星'},{name:'天贵'}], starsOthersBad:[{name:'天哭'},{name:'吊客'}], starsSmall:[{name:'小耗'},{name:'岁驿'}] },
		// idx 9 = 酉位 = 交友宫
		{ name:'交友宫', ganzi:'丁酉', direction:[52,61], starsMain:[{name:'天府'}], starsAssist:[{name:'天钺'},{name:'文曲'}], starsOthersBad:[{name:'天伤'},{name:'病符'}], starsSmall:[{name:'将军'},{name:'息神'}] },
		// idx 10 = 戌位 = 迁移宫
		{ name:'迁移宫', ganzi:'戊戌', direction:[62,71], starsMain:[{name:'太阴', hua:'权'}], starsAssist:[], starsOthersGood:[{name:'华盖'}], starsOthersBad:[{name:'岁建'}], starsSmall:[{name:'奏书'}] },
		// idx 11 = 亥位 = 疾厄宫
		{ name:'疾厄宫', ganzi:'己亥', direction:[72,81], starsMain:[{name:'廉贞', hua:'忌'},{name:'贪狼', hua:'权'}], starsAssist:[{name:'天魁'},{name:'左辅', hua:'科'},{name:'天马'}], starsOthersGood:[{name:'天喜'},{name:'天巫'},{name:'台辅'},{name:'三台'}], starsOthersBad:[{name:'孤辰'},{name:'劫煞'},{name:'天空'},{name:'天使'},{name:'晦气'}], starsSmall:[{name:'飞廉'}] },
	];
	return {
		houses,
		lifeHouseIndex: 4,  // 命宫在辰(壬辰)
		bodyMaster: '天同', // 用户身宫在夫妻宫(寅), 主星天同
		lifeMaster: '武曲',
		yearGan: '丙',
		yearZi: '戌',
		gender: 'Male',
		yearPolar: 'Positive',
		wuxingJuText: '木三局',
	};
}

// 八字 DHX fixture: 真实后端返回结构
function makeDHXBazi(){
	return {
		fourColumns: {
			year:  { ganzi:'丙戌', gan:'丙', zhi:'戌', ganShen:'比肩', dzCang:'戊辛丁' },
			month: { ganzi:'丁酉', gan:'丁', zhi:'酉', ganShen:'劫财', dzCang:'辛' },
			day:   { ganzi:'丙寅', gan:'丙', zhi:'寅', ganShen:'日元', dzCang:'甲丙戊' },
			time:  { ganzi:'癸巳', gan:'癸', zhi:'巳', ganShen:'正官', dzCang:'丙戊庚' },
			tai:   { ganzi:'戊子' },
			ming:  { ganzi:'辛卯' },
			shen:  { ganzi:'辛卯' },
		},
		mainDirection: [
			{ year: 2009, ganzi:'丙申', age: 3 },
			{ year: 2019, ganzi:'乙未', age: 13 },
			{ year: 2029, ganzi:'甲午', age: 23 },
			{ year: 2039, ganzi:'癸巳', age: 33 },
			{ year: 2049, ganzi:'壬辰', age: 43 },
			{ year: 2059, ganzi:'辛卯', age: 53 },
			{ year: 2069, ganzi:'庚寅', age: 63 },
			{ year: 2079, ganzi:'己丑', age: 73 },
		],
		// 🔴 真实后端 /bazi/direct 的大运在 bazi.direction[]（FateDirect：startYear/age=起运岁/mainDirect.ganzi/subDirect[]），
		//    且是「完整 8/9 步」的权威源。后端**没有** bazi.mainDirection 字段（上面那段是已废弃旧别名 mock，仅留作 fallback 回归）。
		//    历史 bug：ground-truth 误读 mainDirection → 真实盘永远「当前大运无法定位」。本测试 direction 补全为权威 8 步。
		direction: [
			{ startYear: 2009, age: 3,  mainDirect: { ganzi:'丙申' }, subDirect: [] },
			{ startYear: 2019, age: 13, mainDirect: { ganzi:'乙未' }, subDirect: [
				{ year: 2019, ganzi:'己亥' }, { year: 2020, ganzi:'庚子' },
				{ year: 2021, ganzi:'辛丑' }, { year: 2022, ganzi:'壬寅' },
				{ year: 2023, ganzi:'癸卯' }, { year: 2024, ganzi:'甲辰' },
				{ year: 2025, ganzi:'乙巳' }, { year: 2026, ganzi:'丙午' },
				{ year: 2027, ganzi:'丁未' }, { year: 2028, ganzi:'戊申' },
			]},
			{ startYear: 2029, age: 23, mainDirect: { ganzi:'甲午' }, subDirect: [
				{ year: 2029, ganzi:'己酉' }, { year: 2030, ganzi:'庚戌' },
				{ year: 2031, ganzi:'辛亥' }, { year: 2032, ganzi:'壬子' },
				{ year: 2033, ganzi:'癸丑' }, { year: 2034, ganzi:'甲寅' },
				{ year: 2035, ganzi:'乙卯' }, { year: 2036, ganzi:'丙辰' },
				{ year: 2037, ganzi:'丁巳' }, { year: 2038, ganzi:'戊午' },
			]},
			{ startYear: 2039, age: 33, mainDirect: { ganzi:'癸巳' }, subDirect: [] },
			{ startYear: 2049, age: 43, mainDirect: { ganzi:'壬辰' }, subDirect: [] },
			{ startYear: 2059, age: 53, mainDirect: { ganzi:'辛卯' }, subDirect: [] },
			{ startYear: 2069, age: 63, mainDirect: { ganzi:'庚寅' }, subDirect: [] },
			{ startYear: 2079, age: 73, mainDirect: { ganzi:'己丑' }, subDirect: [] },
		],
	};
}

// ============ 压力测试: 紫微 ============

describe('压力测试·紫微 DHX 真实命盘 ground-truth (用户痛点根治)', ()=>{
	const chart = makeDHXZiweiChart();
	const currentAge = 20;
	const currentYear = 2026;

	test('R1·命宫定位: lifeHouseIndex=4 → 辰位壬辰', ()=>{
		const ming = extractZwLifePalace(chart);
		expect(ming.palaceName).toBe('命宫');
		expect(ming.ganZhi).toBe('壬辰');
		expect(ming.houseIndex).toBe(4);
	});

	test('R2·身宫定位: bodyMaster=天同 → 夫妻宫庚寅(用户痛点)', ()=>{
		const shen = extractZwBodyPalace(chart);
		expect(shen).not.toBeNull();
		expect(shen.palaceName).toBe('夫妻宫');
		expect(shen.ganZhi).toBe('庚寅');
		expect(shen.houseIndex).toBe(2);
	});

	test('R3·当前大限 (20岁) → 父母宫癸巳 12-21', ()=>{
		const cur = extractZwCurrentDaxian(chart, currentAge);
		expect(cur).not.toBeNull();
		expect(cur.mingIdx).toBe(5);
		expect(cur.ageRangeText).toBe('12-21岁');
		expect(cur.palaces[0].palaceName).toBe('父母宫');
		expect(cur.palaces[0].ganZhi).toBe('癸巳');
	});

	test('R4·运三方四正 (mingIdx=5)', ()=>{
		const cur = extractZwCurrentDaxian(chart, currentAge);
		// 运命宫=父母宫癸巳
		expect(cur.palaces[0].palaceName).toBe('父母宫');
		// 运迁移宫=疾厄宫己亥 (+6)
		expect(cur.palaces[1].palaceName).toBe('疾厄宫');
		expect(cur.palaces[1].ganZhi).toBe('己亥');
		// 运财帛宫=交友宫丁酉 (+4)
		expect(cur.palaces[2].palaceName).toBe('交友宫');
		expect(cur.palaces[2].ganZhi).toBe('丁酉');
		// 运官禄宫=子女宫辛丑 (+8)
		expect(cur.palaces[3].palaceName).toBe('子女宫');
		expect(cur.palaces[3].ganZhi).toBe('辛丑');
	});

	test('R5·官禄宫(申=8) 对宫 = 夫妻宫(寅=2)·庚寅·天同天梁 (用户截图 AI 写"借对宫天机"错误的反例)', ()=>{
		const sanhe = extractZwNatalSanhe(chart, 'guanlu');
		expect(sanhe.palaces[0].palaceName).toBe('官禄宫');
		expect(sanhe.palaces[1].palaceName).toBe('夫妻宫'); // 对宫
		expect(sanhe.palaces[1].ganZhi).toBe('庚寅');
		// 对宫星曜应含 "天同" "天梁", 不是"天机"!
		const oppositeStars = sanhe.palaces[1].stars.join('|');
		expect(oppositeStars).toContain('天同');
		expect(oppositeStars).toContain('天梁');
		expect(oppositeStars).not.toContain('天机');  // 天机在福德宫(午=6), 不是对宫!
	});

	test('R6·流年 2026=丙午/2027=丁未/2028=戊申 (公历换算)', ()=>{
		const series = extractZwLiunianSeries(chart, 2026, 20, 3);
		expect(series[0].ganZhi).toBe('丙午');
		expect(series[1].ganZhi).toBe('丁未');
		expect(series[2].ganZhi).toBe('戊申');
		// 2026 流命宫 = 午位 = 福德宫
		expect(series[0].palaces[0].palaceName).toBe('福德宫');
	});

	test('R7·全 12 宫 overview 含所有宫位+干支+大限范围', ()=>{
		const text = formatZw12PalacesOverview(chart);
		expect(text).toContain('命宫【壬辰】[大限2-11岁]');
		expect(text).toContain('父母宫【癸巳】[大限12-21岁]');
		expect(text).toContain('福德宫【甲午】[大限22-31岁]');
		expect(text).toContain('迁移宫【戊戌】[大限62-71岁]');
	});

	test('R8·formatZwMingShenPalace 含命/身宫真实位置', ()=>{
		const text = formatZwMingShenPalace(chart);
		expect(text).toContain('命宫【命宫·壬辰】');
		expect(text).toContain('身宫【夫妻宫·庚寅】');
		expect(text).toContain('落在原盘夫妻宫位置');
	});

	test('R9·buildZiweiSectionData(basic) 含基础三件套', ()=>{
		const text = buildZiweiSectionData(chart, 'basic', 20, 2026);
		expect(text).toContain('全 12 宫 ground-truth');
		expect(text).toContain('命宫【命宫·壬辰】');
		expect(text).toContain('身宫【夫妻宫·庚寅】');
	});

	test('R10·buildZiweiSectionData(daxian) 含当前大限 + 全 12 步', ()=>{
		const text = buildZiweiSectionData(chart, 'daxian', 20, 2026);
		expect(text).toContain('当前大限·12-21岁');
		expect(text).toContain('运命宫【父母宫·癸巳】');
		expect(text).toContain('全部 10 步大限');
	});

	test('R11·buildZiweiSectionData(liunian) 含流年序列', ()=>{
		const text = buildZiweiSectionData(chart, 'liunian', 20, 2026);
		expect(text).toContain('2026');
		expect(text).toContain('丙午');
	});

	test('R12·稳定性: 反复跑 5 次返回完全一致', ()=>{
		const results = [];
		for(let i=0; i<5; i++){
			results.push(buildZiweiSectionData(chart, 'basic', 20, 2026));
		}
		expect(results.every(r => r === results[0])).toBe(true);
	});

	test('R13·validateChartObj 通过', ()=>{
		const v = validateChartObj(chart, 'ziwei');
		expect(v.ok).toBe(true);
	});
});

// ============ 压力测试: 八字 ============

describe('压力测试·八字 DHX 真实命盘 ground-truth', ()=>{
	const bazi = makeDHXBazi();
	const currentAge = 20;
	const currentYear = 2026;

	test('B1·当前大运 (2026=20岁) 在 mainDirection[1]=乙未 13-22 岁', ()=>{
		const cur = extractBaziCurrentDayun(bazi, currentAge, currentYear);
		expect(cur).not.toBeNull();
		expect(cur.ganZhi).toBe('乙未');
		expect(cur.index).toBe(1);
		expect(cur.startYear).toBe(2019);
		expect(cur.endYear).toBe(2028);
	});

	test('B2·extractBaziAllDayun 返 8 步全部', ()=>{
		const all = extractBaziAllDayun(bazi);
		expect(all).toHaveLength(8);
		expect(all[0].ganZhi).toBe('丙申');
		expect(all[2].ganZhi).toBe('甲午');
		expect(all[2].startYear).toBe(2029);
		expect(all[2].startAge).toBe(23);
	});

	test('B3·extractBaziLiunianFromBackend 从 direction.subDirect 取真实未来流年', ()=>{
		const series = extractBaziLiunianFromBackend(bazi, 2026, 20, 5);
		expect(series.length).toBeGreaterThanOrEqual(3);
		// 2026 = 丙午
		const y2026 = series.find(y=>y.year === 2026);
		expect(y2026).toBeDefined();
		expect(y2026.ganZhi).toBe('丙午');
		// 2027 = 丁未
		const y2027 = series.find(y=>y.year === 2027);
		expect(y2027.ganZhi).toBe('丁未');
		// 2028 = 戊申
		const y2028 = series.find(y=>y.year === 2028);
		expect(y2028.ganZhi).toBe('戊申');
	});

	test('B4·buildBaziSectionData(dayun) 含当前大运 + 全大运 + 流年', ()=>{
		const text = buildBaziSectionData(bazi, 'dayun', 20, 2026);
		expect(text).toContain('★ 当前大运: 乙未');
		expect(text).toContain('全 8 步大运');
		expect(text).toContain('2026年: 丙午');
	});

	test('B5·buildBaziSectionData(liunian) 含未来流年逐年', ()=>{
		const text = buildBaziSectionData(bazi, 'liunian', 20, 2026);
		expect(text).toContain('2026年: 丙午');
		expect(text).toContain('2027年: 丁未');
		expect(text).toContain('2028年: 戊申');
	});

	test('B6·buildBaziSectionData(career_wealth) 含基础块 + 节关键字段提示', ()=>{
		const text = buildBaziSectionData(bazi, 'career_wealth', 20, 2026);
		expect(text).toContain('四柱完整数据');
		expect(text).toContain('丙寅'); // 日柱
		expect(text).toContain('财星位置');
	});

	test('B7·稳定性: 反复跑 5 次返回完全一致', ()=>{
		const results = [];
		for(let i=0; i<5; i++){
			results.push(buildBaziSectionData(bazi, 'dayun', 20, 2026));
		}
		expect(results.every(r => r === results[0])).toBe(true);
	});

	test('B8·validateChartObj 通过', ()=>{
		const v = validateChartObj(bazi, 'bazi');
		expect(v.ok).toBe(true);
	});
});

// ============ 反例·验证防御边界 ============

describe('压力测试·防御边界', ()=>{
	test('紫微 chart 缺 houses → validate fail', ()=>{
		const v = validateChartObj({}, 'ziwei');
		expect(v.ok).toBe(false);
	});

	test('紫微 chart.houses 不是 12 宫 → validate fail', ()=>{
		const v = validateChartObj({ houses: [{ name:'命', ganzi:'甲子' }] }, 'ziwei');
		expect(v.ok).toBe(false);
		expect(v.reason).toContain('应为12');
	});

	test('八字缺 mainDirection 和 direction → validate fail', ()=>{
		const v = validateChartObj({ fourColumns: { year: { ganzi:'甲子' } } }, 'bazi');
		expect(v.ok).toBe(false);
		expect(v.reason).toContain('mainDirection');
	});

	test('八字缺 fourColumns → validate fail', ()=>{
		const v = validateChartObj({ mainDirection: [{ year:2020, ganzi:'甲子' }] }, 'bazi');
		expect(v.ok).toBe(false);
	});

	test('extractZwCurrentDaxian 缺 direction 字段 → 返 null (调用方应有 fallback)', ()=>{
		const chart = { houses: Array.from({length:12}, (_, i)=>({ name:`X${i}`, ganzi:'甲子' })) };
		const cur = extractZwCurrentDaxian(chart, 20);
		expect(cur).toBeNull();
	});

	test('extractBaziCurrentDayun bazi 为 null → 返 null', ()=>{
		expect(extractBaziCurrentDayun(null, 20, 2026)).toBeNull();
	});
});
