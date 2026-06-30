// 河洛理数(数算)穷尽压测:heluoLocal 全链(起命 calculate → 大限 daYun → 流年/月/日 → 命运篇 judge → 补充 chartExtras → 快照)
//   纯前端确定性引擎(零后端)。穷举:四柱样本 × 性别(男/女)× 12 月支(阴阳令)× 12 时支 → ①不抛 ②卦/元堂/大限结构完整 ③单次<阈值。
//   无 byte-perfect golden;确定性=同输入同输出(本测含复现断言)。
import {
	calculate, daYun, liuNian, liuYue, liuRi, judge, chartExtras, buildSnapshotText,
	guaRelations, periodLiShu, classifyErShu, duiGua, yaoText, NAME_TO_TRI,
} from '../../../utils/heluoLocal';

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 四柱样本:跨不同天/地数(覆盖 8 卦 + 五入中宫)与纳甲。手工构造合法干支柱。
const FP_CASES = [
	{ fourPillars: { year: '甲子', month: '丙寅', day: '庚申', hour: '庚辰' }, birthYear: 1984 },
	{ fourPillars: { year: '乙丑', month: '戊寅', day: '辛酉', hour: '己亥' }, birthYear: 1985 },
	{ fourPillars: { year: '壬午', month: '丙午', day: '戊子', hour: '壬子' }, birthYear: 2002 },
	{ fourPillars: { year: '丁卯', month: '癸卯', day: '丙寅', hour: '甲午' }, birthYear: 1987 },
	{ fourPillars: { year: '己巳', month: '庚午', day: '癸亥', hour: '辛酉' }, birthYear: 1989 },
	{ fourPillars: { year: '癸酉', month: '辛酉', day: '乙卯', hour: '丁丑' }, birthYear: 1993 },
];

const TRIGRAMS = ['乾', '坤', '震', '巽', '坎', '離', '艮', '兌'];
function chartOk(chart){
	return !!(chart && chart.xian && chart.hou
		&& typeof chart.tianNum === 'number' && typeof chart.diNum === 'number'
		&& TRIGRAMS.includes(chart.tianGua) && TRIGRAMS.includes(chart.diGua)
		&& chart.xian.name && Array.isArray(chart.xian.lines) && chart.xian.lines.length === 6
		&& chart.xian.yuan >= 1 && chart.xian.yuan <= 6
		&& chart.hou.name && Array.isArray(chart.hou.lines) && chart.hou.lines.length === 6);
}

describe('河洛理数穷尽压测 · 全链纯前端引擎', ()=>{
	// 起命:四柱样本(6) × 性别(2) × 12 月支 × 12 时支 = 1728 → calculate 不抛 + 卦象/元堂结构完整。
	test('起命 calculate 四柱×性别×12月支×12时支(1728):不抛 + 先后天卦/元堂/天地数结构完整', ()=>{
		let n = 0;
		FP_CASES.forEach((fc)=>{
			['男', '女'].forEach((gender)=>{
				ZHI.forEach((monthZhi)=>{
					ZHI.forEach((hourZhi)=>{
						let chart = null;
						expect(()=>{ chart = calculate({ fourPillars: fc.fourPillars, gender, hourZhi, birthYear: fc.birthYear, monthZhi }); }).not.toThrow();
						expect(chartOk(chart)).toBe(true);
						n++;
					});
				});
			});
		});
		expect(n).toBe(6 * 2 * 12 * 12); // 1728
	});

	// 全链:四柱样本 × 性别 × 12 月支(挑 1 时支)→ daYun/judge/chartExtras/快照 全不抛 + 大限 12 段。
	test('全链 daYun/judge/chartExtras/快照 四柱×性别×12月支(144):不抛 + 大限12段 + 命运篇结构', ()=>{
		let n = 0;
		FP_CASES.forEach((fc)=>{
			['男', '女'].forEach((gender)=>{
				ZHI.forEach((monthZhi)=>{
					const chart = calculate({ fourPillars: fc.fourPillars, gender, hourZhi: '辰', birthYear: fc.birthYear, monthZhi });
					let dy = null, jg = null, ex = null, snap = null;
					expect(()=>{ dy = daYun(chart.xian, chart.hou, fc.birthYear); }).not.toThrow();
					expect(dy.all.length).toBe(12); // 先后天各 6 段
					dy.all.forEach((seg)=>{ expect(seg.years === 6 || seg.years === 9).toBe(true); expect(seg.ageStart).toBeGreaterThan(0); });
					expect(()=>{ jg = judge(chart, fc.fourPillars, monthZhi); }).not.toThrow();
					expect(jg.yuan && jg.huagong && jg.erShu && jg.yuanTang).toBeTruthy();
					expect(()=>{ ex = chartExtras(chart, fc.fourPillars, monthZhi, jg, { nayin: '金' }); }).not.toThrow();
					expect(ex.shuLi && ex.xiaoxi).toBeTruthy();
					expect(()=>{ snap = buildSnapshotText(chart, jg, dy); }).not.toThrow();
					expect(typeof snap).toBe('string');
					expect(snap.length).toBeGreaterThan(20);
					n++;
				});
			});
		});
		expect(n).toBe(6 * 2 * 12); // 144
	});

	// 流年/流月/流日:取首样本各大限段逐年/月/日推进,不抛 + 结构合法。
	test('流年/流月/流日推进对全大限段不抛 + 动爻位合法', ()=>{
		const fc = FP_CASES[0];
		const chart = calculate({ fourPillars: fc.fourPillars, gender: '男', hourZhi: '辰', birthYear: fc.birthYear, monthZhi: '寅' });
		const dy = daYun(chart.xian, chart.hou, fc.birthYear);
		let n = 0;
		dy.all.forEach((seg)=>{
			let ln = null;
			expect(()=>{ ln = liuNian(seg, fc.birthYear); }).not.toThrow();
			expect(Array.isArray(ln)).toBe(true);
			if(ln.length){
				ln.forEach((y)=>{ expect(y.pos >= 1 && y.pos <= 6).toBe(true); });
				// 流月/流日:取首年卦推 12 月 / 月卦推日
				const g = NAME_TO_TRI[ln[0].gua];
				if(g){
					expect(()=> liuYue(chart.xian.lines, chart.xian.yuan)).not.toThrow();
					expect(()=> liuRi(chart.hou.lines, chart.hou.yuan)).not.toThrow();
				}
			}
			n++;
		});
		expect(n).toBe(12);
	});

	test('确定性:同输入两次起命 + 大限 + 快照 完全一致(无随机)', ()=>{
		const fc = FP_CASES[2];
		const args = { fourPillars: fc.fourPillars, gender: '女', hourZhi: '子', birthYear: fc.birthYear, monthZhi: '午' };
		const c1 = calculate(args); const c2 = calculate(args);
		expect(c1.xian.name).toBe(c2.xian.name);
		expect(c1.hou.name).toBe(c2.hou.name);
		expect(c1.xian.lines).toEqual(c2.xian.lines);
		const s1 = buildSnapshotText(c1, judge(c1, fc.fourPillars, '午'), daYun(c1.xian, c1.hou, fc.birthYear));
		const s2 = buildSnapshotText(c2, judge(c2, fc.fourPillars, '午'), daYun(c2.xian, c2.hou, fc.birthYear));
		expect(s1).toBe(s2);
	});

	test('性别相盪:阳命同四柱 男女 先天卦上下互换(天地数在上规则)', ()=>{
		// 甲子年=阳命(子年);阳男天上、阴女天上 → 阳男 vs 阳女 tianTop 相反
		const male = calculate({ fourPillars: { year: '甲子', month: '丙寅', day: '庚申', hour: '庚辰' }, gender: '男', hourZhi: '辰', birthYear: 1984, monthZhi: '寅' });
		const female = calculate({ fourPillars: { year: '甲子', month: '丙寅', day: '庚申', hour: '庚辰' }, gender: '女', hourZhi: '辰', birthYear: 1984, monthZhi: '寅' });
		expect(male.tianTop).not.toBe(female.tianTop);
	});

	test('辅助纯函数 classifyErShu/duiGua/guaRelations/periodLiShu 对样本不抛 + 合法', ()=>{
		const fc = FP_CASES[3];
		const chart = calculate({ fourPillars: fc.fourPillars, gender: '男', hourZhi: '午', birthYear: fc.birthYear, monthZhi: '卯' });
		const jg = judge(chart, fc.fourPillars, '卯');
		expect(()=> classifyErShu(chart.tian, chart.di)).not.toThrow();
		const dg = duiGua(chart.xian.name); // 返回 {fu,hu,cuo} 覆/互/错卦名
		expect(dg && typeof dg === 'object' && 'fu' in dg && 'hu' in dg && 'cuo' in dg).toBe(true);
		expect(()=> guaRelations(chart.xian.lines, chart)).not.toThrow();
		expect(()=> periodLiShu(chart.xian.lines, jg)).not.toThrow();
		expect(()=> yaoText(chart.xian.name, chart.xian.yuan)).not.toThrow();
	});

	test('本地引擎单次全链耗时<阈值(期望<500ms,>1s 标红)', ()=>{
		const fc = FP_CASES[0];
		const t0 = Date.now();
		const chart = calculate({ fourPillars: fc.fourPillars, gender: '男', hourZhi: '辰', birthYear: fc.birthYear, monthZhi: '寅' });
		const jg = judge(chart, fc.fourPillars, '寅');
		const dy = daYun(chart.xian, chart.hou, fc.birthYear);
		buildSnapshotText(chart, jg, dy);
		expect(Date.now() - t0).toBeLessThan(1000);
	});
});
