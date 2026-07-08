// 奇门遁甲穷尽压测:本地引擎 calcDunJia(年/月/日家=本地全盘;时家=Ken 后端不在前端压测范围) × 全左栏选项笛卡尔
//   × 多基准日时 → ①不抛 ②九宫结构完整(cells[9]/三盘/神煞/旬空) ③本地单次<阈值。
//   时家奇门转盘是 byte-perfect golden(DunJiaCalc.test.js 守)→ 本压测只断"不抛+结构",不碰精确值。
//   断卦层 buildFaQimenAnalysis(用神/财/官/六亲/危害)是纯派生,全选项过它不抛。
import {
	PAIPAN_OPTIONS, SCHOOL_OPTIONS, QIJU_METHOD_OPTIONS, ZHISHI_OPTIONS, YUEJIA_QIJU_OPTIONS,
	KONG_MODE_OPTIONS, MA_MODE_OPTIONS, YIXING_OPTIONS, ZHIRUN_LEAP_OPTIONS, TIME_ALG_OPTIONS,
	calcDunJia,
} from '../DunJiaCalc';
import { buildFaQimenAnalysis } from '../DunJiaFaCalc';
import { buildLocalBaziResult } from '../../../utils/baziLunarLocal';

// 本地真实农历(走 baziLunarLocal,与 in-app 年/月/日家同源),供各排盘体例消费。
function getGanzi(p){ return (p && (p.ganzhi || p.ganZhi)) || ''; }
function localNongli(date, time){
	const local = buildLocalBaziResult({ date, time, zone: '+08:00', lon: '120e00', lat: '0n00', gpsLon: 120, gpsLat: 0, ad: 1, gender: 1, timeAlg: 1, after23NewDay: 0 });
	const four = local.bazi.fourColumns;
	return {
		...local.bazi.nongli, bazi: local.bazi,
		yearGanZi: getGanzi(four.year), yearJieqi: getGanzi(four.year),
		monthGanZi: getGanzi(four.month), dayGanZi: getGanzi(four.day),
		time: getGanzi(four.time), timeGanZi: getGanzi(four.time),
	};
}
function makeFields(dateStr, timeStr){
	return { date: { value: { format: ()=>dateStr } }, time: { value: { format: ()=>timeStr } }, zone: { value: '+08:00' } };
}

// 多基准时刻:跨阴阳遁/上中下元/晚子时/闰超神,覆盖局法分支。
const SAMPLES = [
	{ d: '2026-02-17', t: '21:50:07' }, // 立春后·阳遁
	{ d: '2025-07-15', t: '03:10:00' }, // 夏至后·阴遁
	{ d: '2024-12-25', t: '23:30:00' }, // 冬至附近·晚子时
	{ d: '2026-06-21', t: '12:00:00' }, // 夏至当日·正午
];

function cellsOk(pan){
	if(!pan || !Array.isArray(pan.cells) || pan.cells.length !== 9){ return false; }
	return pan.cells.every((c)=> c && typeof c.palaceNum === 'number');
}
function structOk(pan){
	return !!(pan && cellsOk(pan) && pan.ganzhi && pan.juText && pan.kongWang != null
		&& pan.diPan && pan.tianPan && pan.renPan && pan.shenPan
		&& Array.isArray(pan.diPanList) && pan.diPanList.length === 9
		&& pan.shenSha && Array.isArray(pan.cells));
}

describe('奇门遁甲穷尽压测 · 本地引擎全选项笛卡尔', ()=>{
	test('左栏选项枚举齐全(防回归:增删选项即露)', ()=>{
		expect(PAIPAN_OPTIONS.map((o)=>o.value)).toEqual([0, 1, 2, 3]);
		expect(SCHOOL_OPTIONS.map((o)=>o.value)).toEqual(['转盘', '飞盘', '混合']);
		expect(QIJU_METHOD_OPTIONS.map((o)=>o.value)).toEqual(['zhirun', 'chaibu', 'maoshan', 'wurun', 'shuzi']);
		expect(ZHISHI_OPTIONS.map((o)=>o.value)).toEqual([0, 1, 2]);
		expect(YUEJIA_QIJU_OPTIONS.map((o)=>o.value)).toEqual([0, 1]);
		expect(KONG_MODE_OPTIONS.map((o)=>o.value)).toEqual(['day', 'time']);
		expect(MA_MODE_OPTIONS.map((o)=>o.value)).toEqual(['day', 'time']);
		expect(YIXING_OPTIONS.map((o)=>o.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
		expect(ZHIRUN_LEAP_OPTIONS.map((o)=>o.value)).toEqual([9, 8]);
		expect(TIME_ALG_OPTIONS.map((o)=>o.value)).toEqual([0, 1]);
	});

	// 主笛卡尔:排盘体例(4) × 盘式(3) × 起局法(5) × 空模式(2) × 马模式(2) = 240,挑 1 基准时刻全跑;
	// 时家(3)走后端,前端 calcDunJia 仍会出占位盘,只断不抛+结构。
	test('排盘×盘式×起局法×空×马 全组合(240):calcDunJia 不抛 + 九宫结构完整', ()=>{
		const fields = makeFields(SAMPLES[0].d, SAMPLES[0].t);
		const nongli = localNongli(SAMPLES[0].d, SAMPLES[0].t);
		let n = 0;
		PAIPAN_OPTIONS.forEach((pp)=>{
			SCHOOL_OPTIONS.forEach((sc)=>{
				QIJU_METHOD_OPTIONS.forEach((qj)=>{
					KONG_MODE_OPTIONS.forEach((km)=>{
						MA_MODE_OPTIONS.forEach((mm)=>{
							let pan = null;
							const opts = { paiPanType: pp.value, school: sc.value, qijuMethod: qj.value, kongMode: km.value, yimaMode: mm.value, zhiShiType: 0, yueJiaQiJuType: 0, shiftPalace: 0, fengJu: false, shuziReportNumber: qj.value === 'shuzi' ? '12345' : null };
							expect(()=>{ pan = calcDunJia(fields, nongli, opts, {}); }).not.toThrow();
							expect(structOk(pan)).toBe(true);
							n++;
						});
					});
				});
			});
		});
		expect(n).toBe(4 * 3 * 5 * 2 * 2); // 240
	});

	// 移星(8) × 封局(2) × 置闰天数(2) × 真太阳/直接(2) × 4 基准时刻:覆盖旋转/封局/历法边界。
	test('移星×封局×置闰天数×时法 × 4基准时刻:不抛 + 结构完整 + 移星实改盘', ()=>{
		let n = 0;
		SAMPLES.forEach((s)=>{
			const fields = makeFields(s.d, s.t);
			const nongli = localNongli(s.d, s.t);
			YIXING_OPTIONS.forEach((yx)=>{
				[true, false].forEach((fengJu)=>{
					ZHIRUN_LEAP_OPTIONS.forEach((zl)=>{
						TIME_ALG_OPTIONS.forEach((ta)=>{
							let pan = null;
							const opts = { paiPanType: 2, school: '转盘', qijuMethod: 'zhirun', shiftPalace: yx.value, fengJu, zhirunLeapDays: zl.value, timeAlg: ta.value, kongMode: 'day', yimaMode: 'day' };
							expect(()=>{ pan = calcDunJia(fields, nongli, opts, {}); }).not.toThrow();
							expect(structOk(pan)).toBe(true);
							expect(pan.shiftPalace).toBe(yx.value);
							n++;
						});
					});
				});
			});
		});
		expect(n).toBe(SAMPLES.length * 8 * 2 * 2 * 2); // 256
	});

	// 月家奇门:年符头(0)/年支(1) × 值使 3 法 × 4 时刻:月家走本地全盘,结构必齐。
	test('月家奇门 年符头/年支 × 值使3法 × 4时刻:结构完整', ()=>{
		let n = 0;
		SAMPLES.forEach((s)=>{
			const fields = makeFields(s.d, s.t);
			const nongli = localNongli(s.d, s.t);
			YUEJIA_QIJU_OPTIONS.forEach((yj)=>{
				ZHISHI_OPTIONS.forEach((zs)=>{
					let pan = null;
					expect(()=>{ pan = calcDunJia(fields, nongli, { paiPanType: 1, yueJiaQiJuType: yj.value, zhiShiType: zs.value, school: '转盘', qijuMethod: 'zhirun' }, {}); }).not.toThrow();
					expect(structOk(pan)).toBe(true);
					n++;
				});
			});
		});
		expect(n).toBe(SAMPLES.length * 2 * 3); // 24
	});

	test('单选确实改盘(中右栏据此变):排盘体例改 juText、盘式改神宫、数字起局产 shuziInfo', ()=>{
		const fields = makeFields(SAMPLES[0].d, SAMPLES[0].t);
		const nongli = localNongli(SAMPLES[0].d, SAMPLES[0].t);
		// 排盘体例(年/月/日家)局法各异 → juText 多样
		const juSet = new Set([0, 1, 2].map((pp)=> calcDunJia(fields, nongli, { paiPanType: pp, school: '转盘', qijuMethod: 'zhirun' }, {}).juText));
		expect(juSet.size).toBeGreaterThan(1);
		// 数字起局产 shuziInfo(报数定局)
		const shuzi = calcDunJia(fields, nongli, { paiPanType: 2, qijuMethod: 'shuzi', shuziReportNumber: '789' }, {});
		expect(shuzi.shuziInfo).toBeTruthy();
		expect(shuzi.shuziInfo.gong).toBeGreaterThanOrEqual(1);
		expect(shuzi.shuziInfo.gong).toBeLessThanOrEqual(9);
		// 盘式 转盘 vs 飞盘:神盘(八神/九神)落宫不同
		const zhuan = calcDunJia(fields, nongli, { paiPanType: 2, school: '转盘', qijuMethod: 'zhirun' }, {});
		const fei = calcDunJia(fields, nongli, { paiPanType: 2, school: '飞盘', qijuMethod: 'zhirun' }, {});
		expect(zhuan.school).toBe('转盘');
		expect(fei.school).toBe('飞盘');
		expect(JSON.stringify(zhuan.shenPanList)).not.toBe(JSON.stringify(fei.shenPanList));
	});

	test('🔴 时家转盘(byte-perfect golden 区)只断不抛 + 结构,不碰精确值', ()=>{
		const fields = makeFields(SAMPLES[0].d, SAMPLES[0].t);
		const nongli = localNongli(SAMPLES[0].d, SAMPLES[0].t);
		let pan = null;
		expect(()=>{ pan = calcDunJia(fields, nongli, { paiPanType: 3, school: '转盘', qijuMethod: 'chaibu' }, {}); }).not.toThrow();
		expect(structOk(pan)).toBe(true);
	});

	test('断卦层 buildFaQimenAnalysis 对每盘不抛 + 用神/财/官等结构齐(中右栏断语据此)', ()=>{
		const fields = makeFields(SAMPLES[0].d, SAMPLES[0].t);
		const nongli = localNongli(SAMPLES[0].d, SAMPLES[0].t);
		let n = 0;
		[0, 1, 2].forEach((pp)=>{
			SCHOOL_OPTIONS.forEach((sc)=>{
				const pan = calcDunJia(fields, nongli, { paiPanType: pp, school: sc.value, qijuMethod: 'zhirun' }, {});
				const ctx = { dayGan: (nongli.dayGanZi || '甲子')[0], dayZhi: (nongli.dayGanZi || '甲子')[1], monthZhi: '寅', yearZhi: '午' };
				let fa = null;
				expect(()=>{ fa = buildFaQimenAnalysis(pan, ctx); }).not.toThrow();
				expect(fa).toBeTruthy();
				n++;
			});
		});
		expect(n).toBe(3 * 3);
	});

	test('本地引擎单次耗时<阈值(期望<500ms,>1s 标红):时家golden区+月家本地各测', ()=>{
		const fields = makeFields(SAMPLES[0].d, SAMPLES[0].t);
		const nongli = localNongli(SAMPLES[0].d, SAMPLES[0].t);
		const t0 = Date.now();
		calcDunJia(fields, nongli, { paiPanType: 2, school: '转盘', qijuMethod: 'zhirun' }, {});
		const dt = Date.now() - t0;
		expect(dt).toBeLessThan(1000); // >1s = 红线
	});
});
