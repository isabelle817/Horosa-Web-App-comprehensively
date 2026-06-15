import { computeFrontendShenSha, SHENSHA_LIST } from './LRShenShaDoc';

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

	it('缺日干支不抛错', ()=>{
		expect(Array.isArray(computeFrontendShenSha('', '', []))).toBe(true);
		expect(computeFrontendShenSha('', '', []).length).toBe(0);
	});
});
