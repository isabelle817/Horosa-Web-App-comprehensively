// 七政四余 前端数据镜像 golden:校验与后端 guolao_const.py 一致(距度合360/庙旺7×12/化曜10干/A≠B/四余/洞微)。
import {
	SU28, SU28_DISTANCE, SU28_DEGREE_LORD, PALACE_LORD, DIGNITY_TABLE,
	HUAYAO_A, KUIXING_B, SHIHUA_ORDER, SIYU_DAILY_RATE, SIYU_WUXING,
	DONGWEI_PALACE_YEARS, SU28_MODE_OPTIONS, LIFE_MODE_OPTIONS, SCHOOL_PRESET_OPTIONS,
	EXALT_DEGREE, ZIQI_MODE_OPTIONS,
} from '../guolaoData';
import { GUOLAO_ZIQI_MODE_KEY, getStoredGuolaoZiqiMode, setStoredGuolaoZiqiMode } from '../GuoLaoChartStyle';

describe('七政四余 数据镜像(对后端 guolao_const)', () => {
	test('二十八宿:28 宿、距度合 360、度主木金土日月火水循环', () => {
		expect(SU28.length).toBe(28);
		expect(new Set(SU28).size).toBe(28);
		expect(SU28_DISTANCE.reduce((a, b)=>a + b, 0)).toBe(360);
		expect(SU28_DEGREE_LORD[0]).toBe('木');
		expect(SU28_DEGREE_LORD[6]).toBe('水');
		expect(SU28_DEGREE_LORD[7]).toBe('木');   // 循环
		expect(SU28[0]).toBe('角');
		expect(SU28[27]).toBe('轸');
	});
	test('十二宫宫主+旺度', () => {
		expect(Object.keys(PALACE_LORD).length).toBe(12);
		expect(PALACE_LORD['午'][1]).toBe('日');
		expect(PALACE_LORD['丑'][2]).toBe('火');
		expect(PALACE_LORD['丑'][3]).toBe('28°');
	});
	test('庙旺七政 7×12 + 锚点', () => {
		expect(Object.keys(DIGNITY_TABLE).sort()).toEqual(['土', '日', '木', '月', '水', '火', '金'].sort());
		Object.values(DIGNITY_TABLE).forEach((row)=>{
			expect(row.length).toBe(12);
			row.forEach((v)=>expect(['庙', '旺', '落', '陷', '平', '得地'].indexOf(v) >= 0).toBe(true));
		});
		const at = (star, zhi)=>DIGNITY_TABLE[star]['子丑寅卯辰巳午未申酉戌亥'.indexOf(zhi)];
		expect(at('日', '午')).toBe('庙');
		expect(at('日', '戌')).toBe('旺');
		expect(at('火', '卯')).toBe('庙');
		expect(at('土', '子')).toBe('庙');
	});
	test('十干化曜 A诀 10 干全、A≠B、十化次序 10', () => {
		expect(Object.keys(HUAYAO_A).length).toBe(10);
		expect(HUAYAO_A['甲']).toBe('火');
		expect(HUAYAO_A['癸']).toBe('罗睺');
		expect(HUAYAO_A['辛']).toBe('紫炁');
		expect(JSON.stringify(HUAYAO_A)).not.toBe(JSON.stringify(KUIXING_B));
		expect(SHIHUA_ORDER.length).toBe(10);
		expect(SHIHUA_ORDER[0]).toEqual(['天禄', '官禄', '化禄']);
	});
	test('四余每日行度 + 五行', () => {
		expect(SIYU_DAILY_RATE['罗睺'] < 0).toBe(true);
		expect(SIYU_DAILY_RATE['月孛'] > 0).toBe(true);
		expect(SIYU_DAILY_RATE['计都']).toBe(SIYU_DAILY_RATE['罗睺']);
		expect(SIYU_WUXING).toEqual({ 罗睺: '火', 计都: '土', 月孛: '水', 紫炁: '木' });
	});
	test('洞微大限 12 宫、命宫15、合百六', () => {
		expect(DONGWEI_PALACE_YEARS.length).toBe(12);
		expect(DONGWEI_PALACE_YEARS[0]).toEqual(['命宫', 15]);
		const total = DONGWEI_PALACE_YEARS.reduce((a, x)=>a + x[1], 0);
		expect(total >= 100 && total <= 112).toBe(true);
	});
	test('G25 擢升度数:七政峰值(自 PALACE_LORD 派生,黄道序+度)', () => {
		// 日白羊19/月金牛3/木巨蟹15/水处女15/金双鱼27/火摩羯28/土天秤21
		expect(EXALT_DEGREE['日']).toEqual({ signIndex: 0, deg: 19 });
		expect(EXALT_DEGREE['月']).toEqual({ signIndex: 1, deg: 3 });
		expect(EXALT_DEGREE['木']).toEqual({ signIndex: 3, deg: 15 });
		expect(EXALT_DEGREE['水']).toEqual({ signIndex: 5, deg: 15 });
		expect(EXALT_DEGREE['金']).toEqual({ signIndex: 11, deg: 27 });
		expect(EXALT_DEGREE['火']).toEqual({ signIndex: 9, deg: 28 });
		expect(EXALT_DEGREE['土']).toEqual({ signIndex: 6, deg: 21 });
		// 仅七政有擢升,无虚星
		expect(Object.keys(EXALT_DEGREE).sort()).toEqual(['土', '日', '木', '月', '水', '火', '金'].sort());
	});
	test('选项数组就位(宿度制6档/命度4法/流派预设)', () => {
		expect(SU28_MODE_OPTIONS.length).toBe(6);
		expect(SU28_MODE_OPTIONS[5].value).toBe(5);   // 赤道恒星制
		expect(LIFE_MODE_OPTIONS.map((o)=>o.value)).toEqual(['asc', 'yumao', 'gumao', 'cotrans']);
		expect(SCHOOL_PRESET_OPTIONS[0].value).toBe('custom');
	});
});

describe('紫炁取法假档隐藏 + 旧值归一(#54 Bug F)', () => {
	test('ZIQI_MODE_OPTIONS 只剩「今法真算」一档,无 tablet/28年立成假档', () => {
		expect(ZIQI_MODE_OPTIONS.length).toBe(1);
		expect(ZIQI_MODE_OPTIONS[0].value).toBe('real');
		expect(ZIQI_MODE_OPTIONS.some((o)=>o.value === 'tablet')).toBe(false);
		expect(ZIQI_MODE_OPTIONS.some((o)=>o.label.indexOf('立成') >= 0)).toBe(false);
	});

	test('getStoredGuolaoZiqiMode 永远归一回 real(旧用户残留 tablet 也归一)', () => {
		try{ localStorage.setItem(GUOLAO_ZIQI_MODE_KEY, 'tablet'); }catch(e){ /* jsdom */ }
		expect(getStoredGuolaoZiqiMode()).toBe('real');
	});

	test('setStoredGuolaoZiqiMode 拒绝写入 tablet,落盘恒 real', () => {
		expect(setStoredGuolaoZiqiMode('tablet')).toBe('real');
		expect(getStoredGuolaoZiqiMode()).toBe('real');
		let stored = null;
		try{ stored = localStorage.getItem(GUOLAO_ZIQI_MODE_KEY); }catch(e){ /* jsdom */ }
		if(stored !== null){ expect(stored).toBe('real'); }
	});
});
