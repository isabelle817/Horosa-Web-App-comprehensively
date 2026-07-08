// 太乙穷尽压测:全流派开关笛卡尔(3^5=243)× 多基盘 → applyTaiyiSchool 不抛 + 默认空操作(字节不变) + 覆盖追踪正确;
// 且每个覆盖盘跑全部 P0/P1 断法(数理/格局/胜负/分野/诸神之算/古名/厄会/三元)不抛 —— 中右栏据此渲染,故覆盖每组合=中右栏全可能性。
import { applyTaiyiSchool, isDefaultSchool, TAIYI_SCHOOL_OPTIONS, DEFAULT_TAIYI_SCHOOL } from '../core/taiyiSchool';
import { computeTaiyiShuli } from '../core/taiyiShuli';
import { computeGeju } from '../core/taiyiGeju';
import { computeSanyuan, computeTaisuiAlias, computeShenSuan, computeFenye, computeEhui, computeVictory, activeDoorJixiong, computeLimitYun } from '../core/taiyiDuanfa';

function mkPan(over){
	return {
		taiyiPalace: '艮', taiyiNum: 3, skyeyes: '申', sf: '艮', jigod: '寅',
		homeCal: 16, awayCal: 3, setCal: 22, homeGeneral: 6, awayGeneral: 3,
		kingbase: '子', officerbase: '亥', pplbase: '寅', wufuNum: 1, bigyoNum: 9, smyoNum: 9,
		kook: { num: 55, year: '阳33局' }, ganzhi: { year: '丙午' }, dateStr: '2026-06-22', tn: 0,
		jiyuan: '第二纪上元', mendoor: '开', skyeyes_summary: '', ...(over || {}),
	};
}
// 太乙 pan 字段均为「落点字符」(子丑艮寅卯辰巽巳午未坤申酉戌乾亥;离宫=午 非「离」),非宫名,真盘同。
const BASE_PANS = [
	mkPan({}),
	mkPan({ taiyiPalace: '午', taiyiNum: 9, skyeyes: '子', sf: '坤', jigod: '申', ganzhi: { year: '甲申' }, kook: { num: 33, year: '阳33局' } }),
	mkPan({ taiyiPalace: '子', taiyiNum: 1, skyeyes: '午', sf: '乾', jigod: '辰', ganzhi: { year: '庚子' }, kook: { num: 1, year: '阴1局' } }),
];

const DIMS = ['jishen', 'wenchang', 'keJianChen', 'sanji', 'youshen'];
function allSchoolCombos(){
	let combos = [{}];
	DIMS.forEach((dim) => {
		const vals = TAIYI_SCHOOL_OPTIONS[dim].map((o) => o.value); // 含 default
		const next = [];
		combos.forEach((c) => vals.forEach((v) => next.push({ ...c, [dim]: v })));
		combos = next;
	});
	return combos; // 3^5 = 243
}

function runAllDuanfa(pan){
	// 中右栏所有派生:不抛即过
	const shuli = computeTaiyiShuli(pan);
	const geju = computeGeju(pan);
	const victory = computeVictory(pan, geju);
	const fenye = computeFenye(pan);
	const shenSuan = computeShenSuan(pan);
	const alias = computeTaisuiAlias(pan);
	const ehui = computeEhui(pan);
	const sanyuan = computeSanyuan(pan);
	const door = activeDoorJixiong(pan);
	const limitYun = computeLimitYun(pan);
	return { shuli, geju, victory, fenye, shenSuan, alias, ehui, sanyuan, door, limitYun };
}

describe('太乙穷尽压测 · 全流派开关 × 基盘', () => {
	test('243 流派组合齐全', () => {
		expect(allSchoolCombos().length).toBe(243);
	});

	test('243组合 × 3基盘:applyTaiyiSchool 不抛 + 9宫字段齐 + 默认=空操作', () => {
		const combos = allSchoolCombos();
		let n = 0, defaultSeen = 0;
		BASE_PANS.forEach((bp) => {
			combos.forEach((school) => {
				let r = null;
				expect(() => { r = applyTaiyiSchool(bp, school); }).not.toThrow();
				expect(r.pan).toBeTruthy();
				expect(r.overrides).toBeTruthy();
				if(isDefaultSchool(school)){
					defaultSeen++;
					// 默认:零覆盖 + 关键字段字节不变(零回归铁律)
					expect(r.overrides.size).toBe(0);
					expect(r.pan.homeCal).toBe(bp.homeCal);
					expect(r.pan.awayCal).toBe(bp.awayCal);
					expect(r.pan.skyeyes).toBe(bp.skyeyes);
					expect(r.pan.kingbase).toBe(bp.kingbase);
					expect(r.pan.bigyoNum).toBe(bp.bigyoNum);
				}else{
					// 非默认:至少一个覆盖
					expect(r.overrides.size).toBeGreaterThan(0);
				}
				n++;
			});
		});
		expect(n).toBe(243 * 3);
		expect(defaultSeen).toBe(3); // 每基盘一个全 default 组合
	});

	test('243组合 × 3基盘:每个覆盖盘跑全部断法(数理/格局/胜负/分野/诸神之算/古名/厄会/三元)不抛(中右栏全可能性)', () => {
		const combos = allSchoolCombos();
		let n = 0;
		BASE_PANS.forEach((bp) => {
			combos.forEach((school) => {
				const r = applyTaiyiSchool(bp, school);
				let out = null;
				expect(() => { out = runAllDuanfa(r.pan); }).not.toThrow();
				expect(out.shuli).toBeTruthy();
				expect(Array.isArray(out.geju)).toBe(true);
				expect(out.victory).toBeTruthy();
				n++;
			});
		});
		expect(n).toBe(243 * 3);
	});

	test('单维覆盖确实改盘(中右栏随该开关变):计神逆/三基金镜/游神顺/文昌无重留/客算无加一', () => {
		const bp = mkPan({});
		expect(applyTaiyiSchool(bp, { jishen: '逆' }).overrides.has('jigod')).toBe(true);
		expect(applyTaiyiSchool(bp, { sanji: '金镜' }).pan.kingbase).not.toBe('子');
		expect(applyTaiyiSchool(bp, { youshen: '顺' }).overrides.has('bigyoNum')).toBe(true);
		expect(applyTaiyiSchool(bp, { wenchang: '无重留' }).overrides.has('skyeyes')).toBe(true);
		expect(applyTaiyiSchool(bp, { keJianChen: '无加一' }).overrides.has('awayCal')).toBe(true);
	});

	test('覆盖盘的数理/胜负随主客算变(计神逆 → 客算重算 → 可能改胜负)', () => {
		const bp = mkPan({});
		const def = applyTaiyiSchool(bp, DEFAULT_TAIYI_SCHOOL);
		const jin = applyTaiyiSchool(bp, { jishen: '逆' });
		// 客算几何重算后为数值
		expect(typeof jin.pan.awayCal).toBe('number');
		// 两盘胜负各自可计算、不抛
		expect(() => computeVictory(def.pan, computeGeju(def.pan))).not.toThrow();
		expect(() => computeVictory(jin.pan, computeGeju(jin.pan))).not.toThrow();
	});
});
