// 大六壬 本轮新增项穷尽压测:A1 月将三派(全黄经×年) + §16 课经(全三传 12³) + §7 旬空落点/遁干/年命(代表性 Cartesian)
// → 全不抛 + 输出合法。新选项均经 castOverride/refCtx 喂中右栏,故覆盖纯函数即覆盖中右栏全可能性。
import { analyzeKongLocations, analyzeDunGan, analyzeNianMing, liuQinOf } from '../LRKongDunNianDoc';
import { detectJianChuan } from '../LRJianChuanDoc';

const Z = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const XUN_JIAZI = { '子': '甲', '丑': '乙', '寅': '丙', '卯': '丁', '辰': '戊', '巳': '己', '午': '庚', '未': '辛', '申': '壬', '酉': '癸', '戌': '', '亥': '' };
const KONG_PAIRS = [['戌', '亥'], ['申', '酉'], ['午', '未'], ['辰', '巳'], ['寅', '卯'], ['子', '丑']];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

describe('A1 月将三派 · 全黄经×年 穷尽不抛', ()=>{
	const { getYueJiangByMethod } = require('../../lrzhan/LiuRengMain');
	test('lon 0..359 × {zhongqi,jieqi,richan} × {1900,2026,2100} → 合法地支/不抛', ()=>{
		let n = 0;
		for(let lon = 0; lon < 360; lon++){
			['zhongqi', 'jieqi', 'richan'].forEach((m)=>{
				[1900, 2026, 2100].forEach((yr)=>{
					const chart = { objects: [{ id: 'Sun', lon, sign: 'Aries' }], nongli: { time: '子' } };
					let r;
					expect(()=>{ r = getYueJiangByMethod(chart, m, yr); }).not.toThrow();
					expect(Z.indexOf(r) >= 0 || r === '').toBe(true);
					n++;
				});
			});
		}
		expect(n).toBe(360 * 3 * 3);
	});
});

describe('§7 旬空落点/遁干/年命 · Cartesian 穷尽不抛', ()=>{
	test('三传 12³(步长2 抽样) × 6 旬空 × 10 日干 → 三函数不抛 + 输出合法', ()=>{
		let n = 0;
		for(let a = 0; a < 12; a += 2){ for(let b = 0; b < 12; b += 2){ for(let c = 0; c < 12; c += 2){
			KONG_PAIRS.forEach((kong)=>{
				GAN.forEach((g)=>{
					const sc = [Z[a], Z[b], Z[c]];
					const ctx = {
						sanChuanBranches: sc, courseBranches: [Z[a], Z[(a + 6) % 12], Z[b], Z[c]],
						xunKongBranches: kong, xunGanMap: XUN_JIAZI, dayGan: g,
						ke1Up: Z[(a + 2) % 12], ke3Up: Z[(c + 4) % 12],
						branchUpMap: Z.reduce((m, z, i)=>{ m[z] = Z[(i + 3) % 12]; return m; }, {}),
						runYearBranch: Z[(a + 1) % 12], benMingBranch: Z[(b + 5) % 12],
					};
					expect(()=>{
						const kl = analyzeKongLocations(ctx);
						const dl = analyzeDunGan(ctx);
						const nm = analyzeNianMing(ctx);
						expect(Array.isArray(kl.hits)).toBe(true);
						expect(Array.isArray(kl.xianKong)).toBe(true);
						dl.forEach((d)=>{ expect(typeof d.note).toBe('string'); });
						nm.forEach((x)=>{ expect(['行年', '本命'].indexOf(x.label) >= 0).toBe(true); });
					}).not.toThrow();
					n++;
				});
			});
		}}}
		expect(n).toBe(6 * 6 * 6 * 6 * 10);
	});
	test('liuQinOf 全五行对 5×5 合法', ()=>{
		['木', '火', '土', '金', '水'].forEach((a)=>['木', '火', '土', '金', '水'].forEach((b)=>{
			const r = liuQinOf(a, b);
			expect(['兄弟', '子孙', '父母', '妻财', '官鬼'].indexOf(r) >= 0).toBe(true);
		}));
	});
});

describe('§4 起课法 computeQiXY · 全 26 法 × 多盘 × 月将 穷尽不抛(中右栏起课位据此)', ()=>{
	const { computeQiXY, QI_METHODS } = require('../../lrzhan/LiuRengMain');
	// 代表盘:不同年/月/日/时干支(time=干支2字,computeQiXY 取 substr(1) 为时支),覆盖阳日/阴日。
	const CHARTS = [
		{ nongli: { yearGanZi: '甲辰', monthGanZi: '丙寅', dayGanZi: '甲子', time: '庚午' } },
		{ nongli: { yearGanZi: '癸卯', monthGanZi: '辛酉', dayGanZi: '乙丑', time: '丁亥' } },
		{ nongli: { yearGanZi: '庚子', monthGanZi: '戊子', dayGanZi: '壬申', time: '壬寅' } },
	];
	test('26 起课法登记齐 + 全法 × 3盘 × 4月将:不抛 + X/Y 合法支或空(端法/演数带数)', ()=>{
		expect(QI_METHODS.length).toBe(26);
		let n = 0;
		QI_METHODS.forEach((m)=>{
			CHARTS.forEach((chart)=>{
				['卯', '酉', '子', '午'].forEach((yueEff)=>{
					let r = null;
					// 选时/演数/报数 + 本命/行年 法须带相应 opts,否则退正时(零回归);此处给齐以走全分支。
					const opts = { xuanShiZhi: '辰', yanShuNum: 7, benmingZhi: '巳', xingnianZhi: '未' };
					expect(()=>{ r = computeQiXY(m.key, chart, yueEff, opts); }).not.toThrow();
					expect(r && typeof r === 'object').toBe(true);
					// X/Y 须为合法地支或空串(缺本命/行年时可空)
					expect(Z.indexOf(r.X) >= 0 || r.X === '').toBe(true);
					expect(Z.indexOf(r.Y) >= 0 || r.Y === '').toBe(true);
					n++;
				});
			});
		});
		expect(n).toBe(26 * 3 * 4);
	});
	test('正时正将(zheng)=月将加正时(默认零回归锚)', ()=>{
		const r = computeQiXY('zheng', CHARTS[0], '卯', {});
		expect(r.X).toBe('卯'); // X=月将
		expect(r.Y).toBe('午'); // Y=正时(time='庚午'→substr(1)=午)
	});
	test('报数/端法(baoshu)÷12 折占时支:N=13→子、N=12→亥、N=1→子', ()=>{
		expect(computeQiXY('baoshu', CHARTS[0], '卯', { yanShuNum: 13 }).Y).toBe('子');
		expect(computeQiXY('baoshu', CHARTS[0], '卯', { yanShuNum: 12 }).Y).toBe('亥');
		expect(computeQiXY('baoshu', CHARTS[0], '卯', { yanShuNum: 1 }).Y).toBe('子');
	});
});

describe('§17 间传 detectJianChuan · 全三传不抛(回归护栏)', ()=>{
	test('12³ 不抛', ()=>{
		let n = 0;
		for(let a = 0; a < 12; a++){ for(let b = 0; b < 12; b++){ for(let c = 0; c < 12; c++){
			expect(()=>detectJianChuan([Z[a], Z[b], Z[c]])).not.toThrow(); n++;
		}}}
		expect(n).toBe(1728);
	});
});
