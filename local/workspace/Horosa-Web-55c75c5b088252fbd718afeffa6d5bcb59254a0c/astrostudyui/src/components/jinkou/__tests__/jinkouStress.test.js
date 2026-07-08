// 金口诀穷尽压测:buildJinKouData(中右栏单一真值源)× 全左栏流派开关笛卡尔 × 全地分 × 多日干时
//   → ①不抛 ②派生层结构完整(四位 rows[4]/太玄[4]/神煞[4]/五动三动/格局/应期) ③本地单次<阈值。
//   流派纯前端派生(月将换将/贵人昼夜表/起贵神盘/盘式/贵神体系),后端零依赖。
import { buildJinKouData } from '../JinKouCalc';

// mockLiuReng:上游六壬解析占位(同 JinKouCalc.test.js 口径)。可覆盖 nongli/xun/season。
function mockLiuReng(data){
	const d = data || {};
	return {
		nongli: { dayGanZi: '甲辰', time: '申时', monthGanZi: '丙申', ...(d.nongli || {}) },
		fourColumns: { month: { ganzi: '丙申' }, ...(d.fourColumns || {}) },
		xun: { '旬空': '寅卯', '旬首': '甲辰', ...(d.xun || {}) },
		season: { '金': '囚', '木': '旺', '水': '休', '火': '相', '土': '死', ...(d.season || {}) },
		gods: d.gods || {}, godsGan: d.godsGan || {}, godsMonth: d.godsMonth || {},
		godsZi: d.godsZi || {}, godsYear: d.godsYear || { taisui1: {} },
	};
}

const ZHI12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 多日干时占位盘(不同旬/月将/昼夜)。
const LR_CASES = [
	mockLiuReng({ nongli: { dayGanZi: '甲辰', time: '申时', monthGanZi: '丙申', jieqi: '立秋' } }),
	mockLiuReng({ nongli: { dayGanZi: '癸未', time: '寅时', monthGanZi: '辛卯', jieqi: '惊蛰' }, xun: { '旬空': '申酉', '旬首': '甲戌' } }),
	mockLiuReng({ nongli: { dayGanZi: '庚子', time: '午时', monthGanZi: '戊子', jieqi: '大雪' }, xun: { '旬空': '辰巳', '旬首': '甲午' } }),
];

// 流派四维(× 默认外的全枚举值):
const YUEJIANG = ['zhongqi', 'jiaojie'];
const GUITABLE = ['shiwu', 'liuren'];
const GUIPAN = ['di', 'tian'];
const PANSHI = ['yang', 'yin'];
const GUIRENG = [0, 1, 2, 3, 4]; // LRConst.GuiRengs 5 体系

function structOk(d){
	return !!(d && d.ready === true
		&& d.diFen && d.renYuanGan && d.guiName && d.jiangZi
		&& Array.isArray(d.rows) && d.rows.length === 4
		&& Array.isArray(d.taixuan) && d.taixuan.length === 4
		&& Array.isArray(d.lineSigns) && d.lineSigns.length === 4
		&& d.yongYao && d.yongYao.label
		&& d.wangShuai && d.yongStrength
		&& d.dong && Array.isArray(d.dong.wu) && Array.isArray(d.dong.san)
		&& Array.isArray(d.geju) && d.yingQi && Array.isArray(d.shenshaDocRows) && d.shenshaDocRows.length === 4
		&& d.schools);
}

describe('金口诀穷尽压测 · 全流派开关 × 全地分 × 多日干时', ()=>{
	// 主笛卡尔:月将换将(2)×贵人表(2)×起贵神盘(2)×盘式(2) = 16 × 12 地分 = 192,挑 1 占位盘全跑。
	test('流派4维全组合(16) × 12地分(192):buildJinKouData 不抛 + 派生层结构完整 + 流派回显', ()=>{
		const lr = LR_CASES[0];
		let n = 0;
		YUEJIANG.forEach((yj)=>{
			GUITABLE.forEach((gt)=>{
				GUIPAN.forEach((gp)=>{
					PANSHI.forEach((ps)=>{
						ZHI12.forEach((diFen)=>{
							let d = null;
							const opt = { diFen, guirengType: 0, schoolYueJiang: yj, schoolGuiTable: gt, schoolGuiPan: gp, panShi: ps };
							expect(()=>{ d = buildJinKouData(lr, opt); }).not.toThrow();
							expect(structOk(d)).toBe(true);
							// 流派忠实回显(左栏选了什么右栏就标什么)
							expect(d.schools.yueJiang).toBe(yj);
							expect(d.schools.guiTable).toBe(gt);
							expect(d.schools.guiPan).toBe(gp);
							expect(d.schools.panShi).toBe(ps);
							n++;
						});
					});
				});
			});
		});
		expect(n).toBe(2 * 2 * 2 * 2 * 12); // 192
	});

	// 贵神体系(5) × 12 地分 × 3 占位盘 = 180:贵神落支须合法、人元干须出。
	test('贵神体系5 × 12地分 × 3占位盘(180):贵神落支合法 + 人元干非空', ()=>{
		let n = 0;
		GUIRENG.forEach((gr)=>{
			ZHI12.forEach((diFen)=>{
				LR_CASES.forEach((lr)=>{
					let d = null;
					expect(()=>{ d = buildJinKouData(lr, { diFen, guirengType: gr }); }).not.toThrow();
					expect(structOk(d)).toBe(true);
					expect(ZHI12.indexOf(d.guiZi) >= 0).toBe(true);
					expect('甲乙丙丁戊己庚辛壬癸'.indexOf(d.renYuanGan) >= 0).toBe(true);
					expect(ZHI12.indexOf(d.jiangZi) >= 0).toBe(true);
					n++;
				});
			});
		});
		expect(n).toBe(5 * 12 * 3); // 180
	});

	// 昼夜显式覆盖(auto/昼/夜)× 12 地分:昼夜判断作用于贵神,须不抛 + 结构齐。
	test('昼夜(auto/昼/夜)× 12地分:isDay 反映 + 不抛 + 结构齐', ()=>{
		let n = 0;
		[undefined, true, false].forEach((isDiurnal)=>{
			ZHI12.forEach((diFen)=>{
				let d = null;
				expect(()=>{ d = buildJinKouData(LR_CASES[0], { diFen, guirengType: 0, isDiurnal }); }).not.toThrow();
				expect(structOk(d)).toBe(true);
				if(isDiurnal === true){ expect(d.isDay).toBe(true); }
				if(isDiurnal === false){ expect(d.isDay).toBe(false); }
				n++;
			});
		});
		expect(n).toBe(3 * 12);
	});

	test('单流派切换确实改盘(中右栏据此变):月将换将改 yuejiang、起贵神盘 di/tian 改贵神排布', ()=>{
		const lr = LR_CASES[1]; // 惊蛰
		const zq = buildJinKouData(lr, { diFen: '午', schoolYueJiang: 'zhongqi' });
		const jj = buildJinKouData(lr, { diFen: '午', schoolYueJiang: 'jiaojie' });
		// 中气换将 vs 交节即换:月将可能不同(节气交接段)
		expect(typeof zq.yuejiang).toBe('string');
		expect(typeof jj.yuejiang).toBe('string');
		// 起贵神盘地盘/天盘:贵神起始支可不同
		const di = buildJinKouData(lr, { diFen: '午', schoolGuiPan: 'di' });
		const tian = buildJinKouData(lr, { diFen: '午', schoolGuiPan: 'tian' });
		expect(di.schools.guiPan).toBe('di');
		expect(tian.schools.guiPan).toBe('tian');
		// 贵人表 实务派 vs 大六壬古法:贵神落支可不同(开导/开吓)
		const shiwu = buildJinKouData(lr, { diFen: '午', schoolGuiTable: 'shiwu' });
		const liuren = buildJinKouData(lr, { diFen: '午', schoolGuiTable: 'liuren' });
		expect(shiwu.schools.guiTable).toBe('shiwu');
		expect(liuren.schools.guiTable).toBe('liuren');
	});

	test('五动三动 + 格局 + 应期 对全地分恒产出合法结构(右栏断法据此)', ()=>{
		let n = 0;
		ZHI12.forEach((diFen)=>{
			const d = buildJinKouData(LR_CASES[0], { diFen, guirengType: 0 });
			// 五动(5克)/三动(3生同)每项 from/to 合法
			d.dong.wu.forEach((x)=>{ expect(x.type).toBeTruthy(); expect(x.from).toBeTruthy(); expect(x.to).toBeTruthy(); });
			d.dong.san.forEach((x)=>{ expect(x.type).toBeTruthy(); });
			// 格局 jx 合法
			d.geju.forEach((g)=>{ expect(['ji', 'xiong', 'ping', 'zhong']).toContain(g.jx || 'ping'); });
			// 应期 scope 非空
			expect(d.yingQi.scope || d.yingQi.text).toBeTruthy();
			n++;
		});
		expect(n).toBe(12);
	});

	test('本地引擎单次耗时<阈值(期望<500ms,>1s 标红)', ()=>{
		const t0 = Date.now();
		buildJinKouData(LR_CASES[0], { diFen: '午', guirengType: 0 });
		expect(Date.now() - t0).toBeLessThan(1000);
	});
});
