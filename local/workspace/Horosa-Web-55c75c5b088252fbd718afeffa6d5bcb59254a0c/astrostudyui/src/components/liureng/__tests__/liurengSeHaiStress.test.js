// 大六壬 WP-A4 穷尽压测:涉害取舍×起讫×始入(=18 组合)× 贵人 5 体系 × 代表盘 → getSangCuang 不抛 + 三传合法;
// 默认组合(app/app/false) 逐盘 byte-identical(零回归);选项确实改变中右栏(发用/课名)。
// 中栏(RengChart)与右栏(buildSanChuanData)同走 castOverride.seHaiOpts → 同一 getSangCuang,故覆盖此即覆盖中右栏全可能性。
jest.mock('../../../utils/helper', () => ({ randomStr: () => 'mocked', creatTooltip: () => {} }));
import ChuangChart from '../ChuangChart';
import * as LRConst from '../LRConst';

const ZiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const JIGONG = { 甲: '寅', 乙: '辰', 丙: '巳', 丁: '未', 戊: '巳', 己: '未', 庚: '申', 辛: '戌', 壬: '亥', 癸: '丑' };
function makeLayout(yue, timezi){
	const downZi = ZiList.slice(0);
	const delta = ZiList.indexOf(yue) - ZiList.indexOf(timezi);
	const upZi = ZiList.map((_, i) => ZiList[((i + delta) % 12 + 12) % 12]);
	return { downZi, upZi, houseTianJiang: LRConst.TianJiang.slice(0) };
}
function shang(lay, z){ return lay.upZi[lay.downZi.indexOf(z)]; }
function makeKe(lay, gan, zhi){
	const c1 = shang(lay, JIGONG[gan]); const c2 = shang(lay, c1);
	const c3 = shang(lay, zhi); const c4 = shang(lay, c3);
	return [['', c1, gan], ['', c2, c1], ['', c3, zhi], ['', c4, c3]];
}
function makeChart(yue, timezi, gan, zhi, seHaiOpts){
	const lay = makeLayout(yue, timezi);
	return new ChuangChart({ owner: null, chartObj: { nongli: { dayGanZi: gan + zhi } }, nongli: { dayGanZi: gan + zhi }, ke: makeKe(lay, gan, zhi), seHaiOpts: seHaiOpts || null, liuRengChart: lay, x: 0, y: 0, width: 0, height: 0 });
}

// 代表盘:覆盖九法各类(重审/涉害见机/昴星虎视掩目/别责刚柔/伏吟/八专)
const CASES = [
	['午', '卯', '甲', '辰'], // 重审(单一下贼上)
	['辰', '子', '癸', '未'], // 涉害·见机(多贼俱比)
	['辰', '子', '戊', '寅'], // 昴星虎视
	['巳', '寅', '丁', '亥'], // 昴星冬蛇
	['午', '巳', '丙', '辰'], // 别责刚
	['戌', '亥', '辛', '酉'], // 别责柔
	['子', '子', '甲', '子'], // 伏吟自任
	['酉', '子', '甲', '寅'], // 八专结构(遥克优先)
];
const METHODS = ['app', 'standard', 'mengzhongji'];
const BOUNDS = ['app', 'both', 'neither'];
const SHI = [false, true];

describe('大六壬 WP-A4 穷尽压测 · 涉害全组合 × 代表盘 → 中右栏一致', () => {
	test('18 组合 × 8 盘:getSangCuang 不抛 + 三传3合法支 + 课名非空', () => {
		let n = 0;
		CASES.forEach(([y, t, g, z]) => {
			METHODS.forEach((method) => BOUNDS.forEach((boundary) => SHI.forEach((shiRuKe) => {
				let r = null;
				expect(() => { r = makeChart(y, t, g, z, { method, boundary, shiRuKe }).getSangCuang(); }).not.toThrow();
				expect(r).toBeTruthy();
				expect(r.cuang).toHaveLength(3);
				r.cuang.forEach((b) => expect(ZiList.indexOf(b) >= 0).toBe(true));
				expect(typeof r.name).toBe('string');
				expect(r.name.length).toBeGreaterThan(0);
				n++;
			})));
		});
		expect(n).toBe(8 * 18);
	});

	test('🔴 默认(无seHaiOpts) === app/app/false 组合 逐盘 byte-identical(零回归铁律)', () => {
		CASES.forEach(([y, t, g, z]) => {
			const def = makeChart(y, t, g, z).getSangCuang();
			const appc = makeChart(y, t, g, z, { method: 'app', boundary: 'app', shiRuKe: false }).getSangCuang();
			expect(appc.cuang).toEqual(def.cuang);
			expect(appc.name).toBe(def.name);
		});
	});

	test('选项确实改变中右栏:始入课/标准两向各自生效', () => {
		// shiRuKe 改单一下贼上课名(重审→始入),发用不变
		const def = makeChart('午', '卯', '甲', '辰').getSangCuang();
		const shi = makeChart('午', '卯', '甲', '辰', { shiRuKe: true }).getSangCuang();
		expect(def.name).toBe('重审课');
		expect(shi.name).toBe('始入课');
		expect(shi.cuang).toEqual(def.cuang);
		// 标准深浅两向(两端皆计)见机仍发用酉、涉害课(对参考脚本)
		const std = makeChart('辰', '子', '癸', '未', { method: 'standard', boundary: 'both' }).getSangCuang();
		expect(std.cuang).toEqual(['酉', '丑', '巳']);
	});

	test('贵人 5 体系 getGuiZi 落点(庚日:正法/遁甲/星占=丑·B派=午·C=丑)', () => {
		const cz = (g) => ({ nongli: { dayGanZi: `${g}子` } });
		expect(LRConst.getGuiZi(cz('庚'), 0, true)).toBe('丑'); // 六壬法A
		expect(LRConst.getGuiZi(cz('庚'), 3, true)).toBe('午'); // B派(甲戊兼牛羊)
		expect(LRConst.getGuiZi(cz('庚'), 4, true)).toBe('丑'); // C 干合阳阴贵
		// 5 体系昼/夜 全干不抛、皆合法支
		[0, 1, 2, 3, 4].forEach((sys) => {
			'甲乙丙丁戊己庚辛壬癸'.split('').forEach((g) => {
				[true, false].forEach((d) => {
					const z = LRConst.getGuiZi(cz(g), sys, d);
					expect(ZiList.indexOf(z) >= 0).toBe(true);
				});
			});
		});
	});
});
