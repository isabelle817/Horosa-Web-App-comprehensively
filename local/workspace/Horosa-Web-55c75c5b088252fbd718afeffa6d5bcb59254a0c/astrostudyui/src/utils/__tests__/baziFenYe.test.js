/**
 * 月律分野（人元司令）golden（§月律分野，通行版/法诀版两套）。
 * 段界 = 节后累计日 [start,end)，末段承接至下一节；逐例对原书日数表。
 */
import { computeFenYe } from '../baziFenYe';
import { buildLocalBaziResult } from '../baziLunarLocal';

describe('月律分野 · 通行版', () => {
	test('午月 节后16.76日 → 己中气（丙10/己9/丁11）', () => {
		const r = computeFenYe('午', 16.76, 'common');
		expect(r.ruler.gan).toBe('己');
		expect(r.ruler.pos).toBe('中气');
		expect(r.versionLabel).toBe('通行版');
	});
	test('子月 节后24.59日 → 癸本气（壬10/癸20）', () => {
		const r = computeFenYe('子', 24.59, 'common');
		expect(r.ruler.gan).toBe('癸');
		expect(r.ruler.pos).toBe('本气');
	});
	test('寅月 节后6.17日 → 戊余气（戊7/丙7/甲16）', () => {
		const r = computeFenYe('寅', 6.17, 'common');
		expect(r.ruler.gan).toBe('戊');
		expect(r.ruler.pos).toBe('余气');
	});
	test('边界：午月恰第10日 → 己（中气起点含左端）', () => {
		expect(computeFenYe('午', 10, 'common').ruler.gan).toBe('己');
		expect(computeFenYe('午', 9.99, 'common').ruler.gan).toBe('丙');
	});
});

describe('月律分野 · 法诀版', () => {
	test('午月 节后16.76日 → 丁本气（丙9/己3/丁18）', () => {
		const r = computeFenYe('午', 16.76, 'fajue');
		expect(r.ruler.gan).toBe('丁');
		expect(r.ruler.pos).toBe('本气');
		expect(r.versionLabel).toBe('法诀版');
	});
	test('申月四段：节后8日 → 戊中气（己7/戊3/壬3/庚17）', () => {
		const r = computeFenYe('申', 8, 'fajue');
		expect(r.ruler.gan).toBe('戊');
		expect(r.segments).toHaveLength(4);
	});
	test('寅月 节后6日 → 己余气（法诀寅余气作己，区别通行戊）', () => {
		expect(computeFenYe('寅', 6, 'fajue').ruler.gan).toBe('己');
		expect(computeFenYe('寅', 6, 'common').ruler.gan).toBe('戊');
	});
});

describe('月律分野 · 集成（buildLocalBaziResult）', () => {
	test('2026-06-22 18:00（午月·芒种后约16.8日）默认通行版 → 司令己', () => {
		const bazi = buildLocalBaziResult({
			date: '2026-06-22', time: '18:00:00', zone: '+08:00',
			lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0, gender: 1, timeAlg: 1,
		}).bazi;
		expect(bazi.fenYe).toBeTruthy();
		expect(bazi.fenYe.monthZhi).toBe('午');
		expect(bazi.fenYe.ruler.gan).toBe('己');
	});
	test('切法诀版（fenyeVersion=fajue）同盘 → 司令丁本气', () => {
		const bazi = buildLocalBaziResult({
			date: '2026-06-22', time: '18:00:00', zone: '+08:00',
			lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0, gender: 1, timeAlg: 1,
			fenyeVersion: 'fajue',
		}).bazi;
		expect(bazi.fenYe.ruler.gan).toBe('丁');
		expect(bazi.fenYe.versionLabel).toBe('法诀版');
	});
});
