// reportSectionData ground-truth 抽取测试
// 用户反馈: AI 把午宫说成迁移宫(实际是福德宫)、大限段编错、流年干支错。
// 这层测试确保代码端的 ground-truth 抽取 100% 正确,不给 AI 留瞎猜空间。

import {
	extractZwNatalSanhe,
	extractZwCurrentDaxian,
	extractZwAllDaxian,
	extractZwLiunianSeries,
	extractBaziCurrentDayun,
	extractBaziLiunianSeries,
	buildZiweiSectionData,
	buildBaziSectionData,
} from '../utils/reportSectionData';

// 构造测试用 chart (12 宫按地支固定顺序 子=0..亥=11; name 模拟假设命宫落于子位)
// 假设命宫=子(0), 则:
//   命=子(0), 兄弟=亥(11), 夫妻=戌(10), 子女=酉(9), 财帛=申(8), 疾厄=未(7)
//   迁移=午(6), 交友=巳(5), 官禄=辰(4), 田宅=卯(3), 福德=寅(2), 父母=丑(1)
// (紫微 12 宫从命起逆时针)
function makeMockChart(){
	const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
	const palaceNames = ['命宫','父母宫','福德宫','田宅宫','官禄宫','交友宫','迁移宫','疾厄宫','财帛宫','子女宫','夫妻宫','兄弟宫'];
	const houses = ZHI.map((zhi, i)=>({
		name: palaceNames[i],
		ganzi: `甲${zhi}`,    // 示意
		zhi,
		direction: [i*10 + 6, i*10 + 15],  // [6,15],[16,25],[26,35]... 示意
		starsMain: [`星${i}A`, `星${i}B`],
		starsAssist: [],
		starsEvil: [],
	}));
	return { houses };
}

describe('reportSectionData·紫微三方四正(用户痛点根治)', ()=>{
	const chart = makeMockChart();

	test('extractZwNatalSanhe 命宫 → 命/迁移/财帛/官禄', ()=>{
		const r = extractZwNatalSanhe(chart, 'ming');
		expect(r).toBeTruthy();
		expect(r.palaces).toHaveLength(4);
		expect(r.palaces[0].label).toBe('本宫');
		expect(r.palaces[0].palaceName).toBe('命宫');
		expect(r.palaces[1].label).toBe('对宫');
		expect(r.palaces[1].palaceName).toBe('迁移宫'); // 命+6 = 迁移
		expect(r.palaces[2].palaceName).toBe('官禄宫'); // 命+4 = 官禄
		expect(r.palaces[3].palaceName).toBe('财帛宫'); // 命+8 = 财帛
	});

	test('extractZwNatalSanhe 夫妻宫 → 夫妻/官禄/福德/迁移', ()=>{
		const r = extractZwNatalSanhe(chart, 'fuqi');
		expect(r).toBeTruthy();
		const names = r.palaces.map(p=>p.palaceName);
		expect(names[0]).toBe('夫妻宫');
		expect(names[1]).toBe('官禄宫');   // 夫妻+6
		// +4 +8 应该是福德/迁移 或 迁移/福德(看是哪个+4 哪个+8)
		expect(names).toContain('福德宫');
		expect(names).toContain('迁移宫');
	});

	test('extractZwNatalSanhe 福德宫 ≠ 迁移宫(用户痛点:午宫被误认为迁移宫但实际是福德宫)', ()=>{
		// 用户的盘里午宫实际是"福德宫"
		// 验证 fude key → 找到的就是福德宫,不会拿到迁移宫
		const r = extractZwNatalSanhe(chart, 'fude');
		expect(r).toBeTruthy();
		expect(r.palaces[0].palaceName).toBe('福德宫');
		expect(r.palaces[0].palaceName).not.toBe('迁移宫');
	});

	test('extractZwCurrentDaxian 按年龄正确定位运命宫', ()=>{
		const r = extractZwCurrentDaxian(chart, 18);   // 18 岁应落入 [16,25]
		expect(r).toBeTruthy();
		expect(r.ageRange[0]).toBeLessThanOrEqual(18);
		expect(r.ageRange[1]).toBeGreaterThanOrEqual(18);
		expect(r.palaces).toHaveLength(4);
		expect(r.palaces[0].label).toBe('运命宫');
		expect(r.palaces[1].label).toBe('运迁移宫');
		expect(r.palaces[2].label).toBe('运财帛宫');
		expect(r.palaces[3].label).toBe('运官禄宫');
	});

	test('extractZwAllDaxian 返回 12 步大限按年龄排序', ()=>{
		const all = extractZwAllDaxian(chart);
		expect(all).toHaveLength(12);
		for(let i=1; i<all.length; i++){
			const prev = parseInt(all[i-1].ageRangeText.split('~')[0], 10);
			const cur = parseInt(all[i].ageRangeText.split('~')[0], 10);
			expect(cur).toBeGreaterThanOrEqual(prev);
		}
	});

	test('extractZwLiunianSeries 干支按真实公历→甲子准确生成', ()=>{
		// 2026 年 = 丙午; 2027 年 = 丁未; 2028 年 = 戊申
		const series = extractZwLiunianSeries(chart, 2026, 20, 3);
		expect(series).toHaveLength(3);
		expect(series[0].year).toBe(2026);
		expect(series[0].ganZhi).toBe('丙午');
		expect(series[1].ganZhi).toBe('丁未');
		expect(series[2].ganZhi).toBe('戊申');
		// 流命宫位置 = 流年支 idx (午=6, 未=7, 申=8)
		expect(series[0].palaces[0].label).toBe('流命宫');
	});

	test('buildZiweiSectionData fuqi 节产出含三方四正块', ()=>{
		const text = buildZiweiSectionData(chart, 'fuqi', 18, 2026);
		expect(text).toContain('夫妻宫');
		expect(text).toContain('本宫');
		expect(text).toContain('对宫');
		expect(text).toContain('代码计算·必须严格使用');
	});

	test('buildZiweiSectionData liunian 节产出含未来 10 年干支', ()=>{
		const text = buildZiweiSectionData(chart, 'liunian', 18, 2026);
		expect(text).toContain('2026');
		expect(text).toContain('丙午'); // 2026 干支
		expect(text).toContain('丁未'); // 2027 干支
		expect(text).toContain('流命宫');
		expect(text).toContain('代码计算');
	});

	test('buildZiweiSectionData daxian 节产出含当前大限 + 全 12 步', ()=>{
		const text = buildZiweiSectionData(chart, 'daxian', 18, 2026);
		expect(text).toContain('当前大限');
		expect(text).toContain('运命宫');
		expect(text).toContain('全部 10 步大限');
	});
});

describe('reportSectionData·八字', ()=>{
	test('extractBaziLiunianSeries 干支正确', ()=>{
		// 2026=丙午 / 2027=丁未 / 2028=戊申
		const s = extractBaziLiunianSeries(2026, 30, 3);
		expect(s).toHaveLength(3);
		expect(s[0].ganZhi).toBe('丙午');
		expect(s[1].ganZhi).toBe('丁未');
		expect(s[2].ganZhi).toBe('戊申');
	});

	test('extractBaziCurrentDayun 按 luckyDecade 字段提取当前大运', ()=>{
		const bazi = {
			luckyDecade: [
				{ ganZhi: '乙巳', startAge: 5, endAge: 14 },
				{ ganZhi: '丙午', startAge: 15, endAge: 24 },
				{ ganZhi: '丁未', startAge: 25, endAge: 34 },
			],
		};
		const r = extractBaziCurrentDayun(bazi, 20);
		expect(r).toBeTruthy();
		expect(r.ganZhi).toBe('丙午');
		expect(r.index).toBe(1);
	});

	test('buildBaziSectionData liunian 节产出含未来流年 + 当前大运', ()=>{
		const bazi = {
			luckyDecade: [
				{ ganZhi: '丙午', startAge: 25, endAge: 34 },
			],
			fourColumns: {
				year: { gan: '甲', zhi: '子', ganShen: '比肩' },
			},
		};
		const text = buildBaziSectionData(bazi, 'liunian', 30, 2026);
		expect(text).toContain('当前大运');
		expect(text).toContain('丙午');
		expect(text).toContain('2026年: 丙午');
		expect(text).toContain('必须严格使用');
	});
});

describe('reportSectionData·防御边界', ()=>{
	test('null chart 返回空字符串', ()=>{
		expect(buildZiweiSectionData(null, 'fuqi', 30, 2026)).toBe('');
	});
	test('未知 sectionKey 仍返基础三件套(v1.16 新行为:防 AI 在任何节都瞎写)', ()=>{
		const chart = makeMockChart();
		const text = buildZiweiSectionData(chart, 'unknown_key', 30, 2026);
		// v1.16 改: 所有节都注入 12 宫 overview + 命/身宫 + 生年四化 基础块
		expect(text).toContain('全 12 宫 ground-truth');
		expect(text).toContain('命宫');
		expect(text).toContain('身宫');
	});
	test('extractZwNatalSanhe 未知 palaceKey 返回 null', ()=>{
		const chart = makeMockChart();
		expect(extractZwNatalSanhe(chart, 'unknown')).toBeNull();
	});
});
