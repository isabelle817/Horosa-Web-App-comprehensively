import { computeFrontendShenSha, SHENSHA_LIST, computeYearShenSha, computeMonthShenSha } from './LRShenShaDoc';

describe('LRShenShaDoc · computeFrontendShenSha 起例', ()=>{
	it('甲日·子支：驿马寅 / 日禄寅 / 咸池酉 / 华盖辰 / 亡神亥', ()=>{
		const byName = {};
		computeFrontendShenSha('甲', '子', []).forEach((s)=>{ byName[s.name] = s.branch; });
		expect(byName['驿马']).toBe('寅');
		expect(byName['日禄']).toBe('寅');
		expect(byName['咸池']).toBe('酉');
		expect(byName['华盖']).toBe('辰');
		expect(byName['亡神']).toBe('亥');
	});

	it('庚日·午支：驿马申（三合寅午戌→申）/ 日禄申', ()=>{
		const byName = {};
		computeFrontendShenSha('庚', '午', []).forEach((s)=>{ byName[s.name] = s.branch; });
		expect(byName['驿马']).toBe('申');
		expect(byName['日禄']).toBe('申');
	});

	it('inCourse 标记：所临之支在课传则 true', ()=>{
		const list = computeFrontendShenSha('甲', '子', ['寅']);
		expect(list.find((s)=>s.name === '驿马').inCourse).toBe(true);
		expect(list.find((s)=>s.name === '华盖').inCourse).toBe(false);
	});

	it('每条神煞带 luck 与 color', ()=>{
		const list = computeFrontendShenSha('甲', '子', []);
		list.forEach((s)=>{
			expect(['good', 'bad', 'neutral']).toContain(s.luck);
			expect(typeof s.color).toBe('string');
		});
	});

	it('rule 表对 12 地支 / 10 天干全覆盖（无缺漏）', ()=>{
		const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
		const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
		SHENSHA_LIST.forEach((s)=>{
			const keys = s.by === 'dayGan' ? GAN : ZHI;
			keys.forEach((k)=>{ expect(typeof s.rule[k]).toBe('string'); });
		});
	});

	it('WP-C1 三合局10神补全(§19.1):将星=帝旺(纠错≠华盖)/灾煞/岁煞/攀鞍/六厄', ()=>{
		const m = {};
		computeFrontendShenSha('甲', '子', []).forEach((s)=>{ m[s.name] = s.branch; });
		expect(m['将星']).toBe('子');
		expect(m['华盖']).toBe('辰');
		expect(m['灾煞']).toBe('午');
		expect(m['岁煞']).toBe('未');
		expect(m['攀鞍']).toBe('卯');
		expect(m['六厄']).toBe('丑');
	});
	it('WP-C1 将星四局:申子辰→子/寅午戌→午/巳酉丑→酉/亥卯未→卯', ()=>{
		const jx = (zhi)=>computeFrontendShenSha('甲', zhi, []).find((s)=>s.name === '将星').branch;
		expect(jx('子')).toBe('子');
		expect(jx('午')).toBe('午');
		expect(jx('酉')).toBe('酉');
		expect(jx('卯')).toBe('卯');
	});

	it('WP-C2a 日干/旬神补全(§19.4):羊刃/墓神(by日干)+丁神(by旬)', ()=>{
		const m = (g,z)=>{ const o={}; computeFrontendShenSha(g,z,[]).forEach((s)=>{o[s.name]=s.branch;}); return o; };
		const jia = m('甲','子'); // 甲子旬(旬首子)
		expect(jia['羊刃']).toBe('卯');
		expect(jia['墓神']).toBe('未');
		expect(jia['丁神']).toBe('卯'); // 甲子旬→丁卯
		expect(m('甲','戌')['丁神']).toBe('丑'); // 甲戌旬(旬首戌)→丁丑
		expect(m('庚','午')['羊刃']).toBe('酉');
	});

	it('WP-C2b 年神(§19.2 四利三元序):子年 太岁子/岁破午/太阴卯/白虎申;排序开关→太阴戌', ()=>{
		const m = {}; computeYearShenSha('子', 'sanyuan', []).forEach((s)=>{m[s.name]=s.branch;});
		expect(m['太岁']).toBe('子');
		expect(m['岁破']).toBe('午'); // 太岁冲
		expect(m['太阴']).toBe('卯');
		expect(m['白虎']).toBe('申');
		expect(m['吊客']).toBe('戌');
		expect(m['病符']).toBe('亥');
		const b = {}; computeYearShenSha('子', 'suigui', []).forEach((s)=>{b[s.name]=s.branch;});
		expect(b['太阴']).toBe('戌'); // 太岁排轮:太阴=岁后二
		expect(b['岁破']).toBe('午'); // 其余不变
	});
	it('WP-C2b 月神(§19.3):寅月 月建寅/月破申/天德丁/月德丙/天医辰/天马午/月厌戌', ()=>{
		const m = {}; computeMonthShenSha('寅', []).forEach((s)=>{m[s.name]=s.branch;});
		expect(m['月建']).toBe('寅');
		expect(m['月破']).toBe('申');
		expect(m['天德']).toBe('丁');
		expect(m['月德']).toBe('丙');
		expect(m['天医']).toBe('辰');
		expect(m['天马']).toBe('午');
		expect(m['月厌']).toBe('戌');
		// 五月午:天医申(辰顺4)、天马寅、月厌午
		const w = {}; computeMonthShenSha('午', []).forEach((s)=>{w[s.name]=s.branch;});
		expect(w['天医']).toBe('申');
		expect(w['天马']).toBe('寅');
		expect(w['月厌']).toBe('午');
	});

	it('缺日干支不抛错', ()=>{
		expect(Array.isArray(computeFrontendShenSha('', '', []))).toBe(true);
		expect(computeFrontendShenSha('', '', []).length).toBe(0);
	});
});
