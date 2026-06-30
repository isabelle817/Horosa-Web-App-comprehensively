/**
 * 命宫/身宫起法 golden（八字大全 §4.4/§4.6 + bazi.py 对照表 逐字一致）:
 *   「子平数法」(默认): 命宫数=26−(月序+时序)(月序寅=1…丑=12, 时序子=1…亥=12, >12 则−12),
 *      身宫基数=32; 命宫支/身宫支=数→地支, 天干=年干五虎遁推到该支当月取干。
 *   「通行版」: lunar.js getMingGong/getShenGong(时支从寅起), 保留旧显示零回归。
 *
 * 关键交叉验证: 2000-01-01 12:00 → 数法 命癸酉/身丁卯, 与 §4.4 参考底本所附 bazi.py
 *   实例输出「命宫=癸酉 … 身宫=丁卯」完全一致(该日立春前仍属己卯年)。
 * 其余 case 逐一手工对「月支×时支→命宫支」对照表 + 五虎遁核过。
 */
import { buildLocalBaziResult } from '../baziLunarLocal';

function mingShen(dateStr, timeStr, minggongMethod){
	const params = {
		date: dateStr,
		time: timeStr,
		zone: '+08:00',
		lon: 113.0,
		gpsLon: 113.0,
		lat: 23.0,
		gpsLat: 23.0,
		gender: 1,
		timeAlg: 1, // 直接时间, 锁定时分不受经度真太阳时影响
		minggongMethod,
	};
	const cols = buildLocalBaziResult(params).bazi.fourColumns;
	return { ming: cols.ming.ganzi, shen: cols.shen.ganzi };
}

// [date, time, 数法命, 数法身, 通行命, 通行身]
const CASES = [
	['2026-06-22', '18:00:00', '庚子', '甲午', '庚寅', '壬辰'], // 月午时酉
	['2000-01-01', '12:00:00', '癸酉', '丁卯', '乙亥', '辛未'], // 月子时午 · §4.4 参考实例
	['1976-07-06', '21:11:00', '戊戌', '壬辰', '庚子', '甲午'], // 月午时亥
	['1988-02-29', '03:30:00', '癸亥', '丁巳', '乙丑', '丁巳'], // 月寅时寅
];

describe('八字 命宫/身宫 · 子平数法(默认)', () => {
	test.each(CASES)('%s %s → 命%s 身%s', (date, time, ming, shen) => {
		const r = mingShen(date, time, 'shufa');
		expect(r.ming).toBe(ming);
		expect(r.shen).toBe(shen);
	});

	test('不传 minggongMethod 时默认走通行版(lunar, 零回归); 显式 shufa 才走数法', () => {
		const base = { date: '2026-06-22', time: '18:00:00', zone: '+08:00', lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0, gender: 1, timeAlg: 1 };
		const def = buildLocalBaziResult({ ...base }).bazi.fourColumns;
		const tx = buildLocalBaziResult({ ...base, minggongMethod: 'tongxing' }).bazi.fourColumns;
		const sf = buildLocalBaziResult({ ...base, minggongMethod: 'shufa' }).bazi.fourColumns;
		// 默认 === 通行版(原星阙零回归)
		expect(def.ming.ganzi).toBe(tx.ming.ganzi);
		expect(def.shen.ganzi).toBe(tx.shen.ganzi);
		// 数法仍可显式取到(庚子/甲午)，与默认不同
		expect(sf.ming.ganzi).toBe('庚子');
		expect(def.ming.ganzi).not.toBe('庚子');
	});
});

describe('八字 命宫/身宫 · 通行版(lunar.js, 零回归)', () => {
	test.each(CASES)('%s %s → 通行版命身', (date, time, _ms, _ss, ming, shen) => {
		const r = mingShen(date, time, 'tongxing');
		expect(r.ming).toBe(ming);
		expect(r.shen).toBe(shen);
	});
});
