// WP-G 格局检测(本地盘)+ WP-D 流派预设 golden。
import { assembleNatalChart } from '../ZiweiCalc';
import { detectPatterns } from '../ziweiPatterns';
import { ZIWEI_SCHOOL_PRESETS, presetMatches, presetOf } from '../ziweiPresets';
import GE_PATTERNS from '../data/tables/ziweige.json';

const PATTERN_NAMES = new Set(Object.keys(GE_PATTERNS));

describe('WP-G 格局检测(ziweiPatterns)', () => {
	test('对合法盘输出与 Java 同形数组(name/category/duanyi/broken)', () => {
		const c = assembleNatalChart({ yearGan: '甲', yearZi: '子', monthInt: 6, leap: false, dayInt: 10, timeZi: '卯', male: true });
		const ps = detectPatterns(c);
		expect(Array.isArray(ps)).toBe(true);
		ps.forEach((p)=>{
			expect(PATTERN_NAMES.has(p.name)).toBe(true);
			expect(typeof p.category).toBe('string');
			expect(typeof p.duanyi).toBe('string');
			expect(typeof p.broken).toBe('boolean');
			expect('conditions' in p).toBe(true);
		});
	});
	test('确定性:同盘两次检测结果一致', () => {
		const mk = ()=>assembleNatalChart({ yearGan: '壬', yearZi: '辰', monthInt: 5, leap: false, dayInt: 20, timeZi: '卯', male: true });
		const a = detectPatterns(mk()).map((p)=>p.name + ':' + p.broken).join('|');
		const b = detectPatterns(mk()).map((p)=>p.name + ':' + p.broken).join('|');
		expect(a).toBe(b);
	});
	test('命无正曜盘 → 命中「命无正曜」类(若 JSON 含该 op 规则)', () => {
		// 扫年/月/时找一个命宫无主星的盘,断言 mingNoMainStar 规则(若存在)被命中。
		let found = false;
		const hasMingNoMain = Object.values(GE_PATTERNS).some((r)=>JSON.stringify(r.conditions || '').indexOf('mingNoMainStar') >= 0);
		if(!hasMingNoMain){ return; }   // JSON 无该规则则跳过
		outer:
		for(let m = 1; m <= 12 && !found; m++){
			for(let t = 0; t < 12; t++){
				const c = assembleNatalChart({ yearGan: '甲', yearZi: '子', monthInt: m, leap: false, dayInt: 10, timeZi: ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][t], male: true });
				if((c.houses[c.lifeHouseIndex].starsMain || []).length === 0){
					const ps = detectPatterns(c).map((p)=>p.name);
					const names = Object.keys(GE_PATTERNS).filter((k)=>JSON.stringify(GE_PATTERNS[k].conditions || '').indexOf('mingNoMainStar') >= 0);
					expect(names.some((nm)=>ps.indexOf(nm) >= 0)).toBe(true);
					found = true; break outer;
				}
			}
		}
	});
	test('压测:全 60 甲子年 × 月1/6/12 × 时子午 不抛 + 输出合法', () => {
		const GAN = '甲乙丙丁戊己庚辛壬癸'.split(''); const ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');
		for(let n = 0; n < 60; n++){
			const c = assembleNatalChart({ yearGan: GAN[n % 10], yearZi: ZHI[n % 12], monthInt: [1, 6, 12][n % 3], leap: false, dayInt: 1 + (n % 28), timeZi: n % 2 ? '午' : '子', male: n % 2 === 0 });
			const ps = detectPatterns(c);
			expect(Array.isArray(ps)).toBe(true);
			ps.forEach((p)=>expect(PATTERN_NAMES.has(p.name)).toBe(true));
		}
	});
});

describe('WP-D 流派预设', () => {
	test('6 预设结构齐(sihua + 10 开关)', () => {
		const keys = ['daxianSpan', 'tianmaBasis', 'starSet', 'sanPan', 'shangShi', 'leapMonth', 'lateZi', 'yearBoundary', 'huoling', 'kongNaming'];
		['sanhe', 'feixing', 'zhongzhou', 'qintian', 'quanshu', 'heluo'].forEach((k)=>{
			const p = ZIWEI_SCHOOL_PRESETS[k];
			expect(p).toBeTruthy();
			expect(typeof p.sihua).toBe('string');
			keys.forEach((kk)=>expect(p[kk] !== undefined).toBe(true));
		});
	});
	test('中州派=zhongzhou四化+阴阳互换;钦天=局数年;全书=quanshu;河洛=north18', () => {
		expect(ZIWEI_SCHOOL_PRESETS.zhongzhou.sihua).toBe('zhongzhou');
		expect(ZIWEI_SCHOOL_PRESETS.zhongzhou.shangShi).toBe('yinyang');
		expect(ZIWEI_SCHOOL_PRESETS.qintian.daxianSpan).toBe('ju');
		expect(ZIWEI_SCHOOL_PRESETS.quanshu.sihua).toBe('quanshu');
		expect(ZIWEI_SCHOOL_PRESETS.heluo.starSet).toBe('north18');
	});
	test('presetMatches/presetOf:默认=三合;改一项→custom', () => {
		const dflt = { daxianSpan: 10, tianmaBasis: 'month', starSet: 'full', sanPan: 'tian', shangShi: 'fixed', leapMonth: 'mid_split', lateZi: 'zi_chu', yearBoundary: 'lichun', huoling: 'sanhe', kongNaming: 'modern' };
		expect(presetMatches('sanhe', 'beipai', dflt)).toBe(true);
		expect(presetOf('beipai', dflt, 'sanhe')).toBe('sanhe');
		expect(presetOf('beipai', dflt, 'feixing')).toBe('feixing');   // 同源消歧:保留用户所选
		const tweaked = { ...dflt, daxianSpan: 'ju' };
		expect(presetOf('beipai', tweaked, 'sanhe')).toBe('qintian');  // 改成局数年→钦天
		const offAll = { ...dflt, starSet: 'north18', huoling: 'nanpai' };
		expect(presetOf('beipai', offAll, 'sanhe')).toBe('custom');    // 无单一 preset 匹配→自定义
	});
});
