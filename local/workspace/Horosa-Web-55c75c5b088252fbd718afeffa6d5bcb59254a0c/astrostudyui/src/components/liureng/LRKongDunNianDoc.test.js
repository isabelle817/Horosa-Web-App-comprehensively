import { analyzeKongLocations, analyzeDunGan, analyzeNianMing, liuQinOf } from './LRKongDunNianDoc';

// 甲子旬:旬空=戌亥;遁干 子甲丑乙寅丙卯丁辰戊巳己午庚未辛申壬酉癸戌—亥—
const XUN_JIAZI = { '子': '甲', '丑': '乙', '寅': '丙', '卯': '丁', '辰': '戊', '巳': '己', '午': '庚', '未': '辛', '申': '壬', '酉': '癸', '戌': '', '亥': '' };

describe('LRKongDunNianDoc · §7 收尾断法', ()=>{
	it('liuQinOf 五行→六亲(以日干木为我)', ()=>{
		expect(liuQinOf('木', '木')).toBe('兄弟');
		expect(liuQinOf('木', '火')).toBe('子孙');
		expect(liuQinOf('木', '水')).toBe('父母');
		expect(liuQinOf('木', '土')).toBe('妻财');
		expect(liuQinOf('木', '金')).toBe('官鬼');
	});

	it('E2 旬空落点:初传戌空=斩首 + 陷空(戌亥上神午未落空)', ()=>{
		const ctx = {
			xunKongBranches: ['戌', '亥'],
			ke1Up: '子', ke3Up: '丑',
			sanChuanBranches: ['戌', '寅', '午'],
			branchUpMap: { '戌': '午', '亥': '未' },
		};
		const r = analyzeKongLocations(ctx);
		const init = r.hits.find((h)=>h.pos === '初传');
		expect(init && init.branch).toBe('戌');
		expect(init.note).toContain('斩首');
		expect(r.xianKong).toEqual(expect.arrayContaining([{ seat: '戌', god: '午' }, { seat: '亥', god: '未' }]));
		expect(r.allSanChuanKong).toBe(false);
	});

	it('E2 三传全空 → allSanChuanKong', ()=>{
		const r = analyzeKongLocations({ xunKongBranches: ['戌', '亥'], sanChuanBranches: ['戌', '亥', '戌'], branchUpMap: {} });
		expect(r.allSanChuanKong).toBe(true);
	});

	it('E3 遁干特殊:午→庚遁鬼 / 卯→丁遁丁 / 子→甲遁甲(日干甲)', ()=>{
		const r = analyzeDunGan({ sanChuanBranches: ['午', '卯', '子'], xunGanMap: XUN_JIAZI, dayGan: '甲', xunKongBranches: ['戌', '亥'] });
		const wu = r.find((x)=>x.branch === '午');
		expect(wu.flags).toContain('遁鬼');
		expect(wu.liuqin).toBe('官鬼');
		expect(r.find((x)=>x.branch === '卯').flags).toContain('遁丁');
		expect(r.find((x)=>x.branch === '子').flags).toContain('遁甲');
	});

	it('E3 旬空之支无遁干', ()=>{
		const r = analyzeDunGan({ sanChuanBranches: ['戌', '午', '寅'], xunGanMap: XUN_JIAZI, dayGan: '甲', xunKongBranches: ['戌', '亥'] });
		const xu = r.find((x)=>x.branch === '戌');
		expect(xu.gan).toBe('');
		expect(xu.note).toContain('空不遁');
	});

	it('E4 年命:行年上神空=一年无成;入传则重参', ()=>{
		const r = analyzeNianMing({ runYearBranch: '未', branchUpMap: { '未': '戌' }, xunKongBranches: ['戌', '亥'], sanChuanBranches: ['午', '卯', '子'], courseBranches: [] });
		const xy = r.find((x)=>x.label === '行年');
		expect(xy.isKong).toBe(true);
		expect(xy.note).toContain('一年无成');
		// 入传例
		const r2 = analyzeNianMing({ runYearBranch: '午', branchUpMap: { '午': '寅' }, xunKongBranches: ['戌', '亥'], sanChuanBranches: ['午', '卯', '子'], courseBranches: [] });
		expect(r2.find((x)=>x.label === '行年').entered).toBe(true);
	});
});
