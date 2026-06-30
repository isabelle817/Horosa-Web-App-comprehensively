/**
 * 格局(§9.2.1 月令定格) + 扶抑派用神(§9.5) golden。
 * 格局优先级：月令本气比劫→建禄/阳刃（先决）；否则本气透→本气、中余气透→透出者、皆不透→本气暗藏。
 * 用神：身强喜食伤·财·官杀、忌印·比劫；身弱反之（相对日主五行生克派生）。
 */
import { computeGejuYongShen } from '../baziGejuYongShen';
import { buildLocalBaziResult } from '../baziLunarLocal';

function baziAt(date, time){
	return buildLocalBaziResult({
		date, time, zone: '+08:00', lon: 113.0, gpsLon: 113.0, lat: 23.0, gpsLat: 23.0,
		gender: 1, timeAlg: 1,
	}).bazi;
}

// 构造单元用 four：pillar = {stem:{cell,element,relative}, stemInBranch:[{cell,relative}...]}
function stem(cell, element, relative){ return { cell, element, relative }; }

describe('格局 · 集成', () => {
	test('2026-06-22 18:00（丁日午月，本气丁=比）→ 建禄格（先决，不取中气食神）', () => {
		const gy = baziAt('2026-06-22', '18:00:00').gejuYongShen;
		expect(gy.geju.name).toBe('建禄格');
		expect(gy.geju.tenGod).toBe('比');
	});
	test('2000-01-01 12:00（戊日子月，本气癸=财，单藏不透）→ 正财格（本气暗藏）', () => {
		const gy = baziAt('2000-01-01', '12:00:00').gejuYongShen;
		expect(gy.geju.name).toBe('正财格');
		expect(gy.geju.via).toBe('本气暗藏');
	});
});

describe('扶抑派用神 · 集成', () => {
	test('2026-06-22（丁火身强）→ 喜用 土金水、忌 木火', () => {
		const gy = baziAt('2026-06-22', '18:00:00').gejuYongShen;
		expect(gy.yongshen.school).toBe('扶抑派');
		expect(gy.yongshen.verdict).toBe('身强');
		expect(gy.yongshen.xi).toEqual(['土', '金', '水']);
		expect(gy.yongshen.ji).toEqual(['木', '火']);
	});
});

describe('格局/用神 · 单元', () => {
	test('月令本气劫 → 阳刃格（先决于中气透干）', () => {
		const four = {
			day: { stem: stem('甲', 'Wood', '日元') },
			year: { stem: stem('丙', 'Fire', '食') },
			month: { stem: stem('丁', 'Fire', '伤'), stemInBranch: [stem('乙', 'Wood', '劫'), stem('癸', 'Water', '印')] },
			time: { stem: stem('癸', 'Water', '印') },
		};
		const r = computeGejuYongShen(four, { dayMaster: { verdict: '身弱' } });
		expect(r.geju.name).toBe('阳刃格'); // 本气乙=劫，先决
	});

	test('身弱 → 喜用 印比（甲木：水木）、忌 食伤财官（火土金）', () => {
		const four = {
			day: { stem: stem('甲', 'Wood', '日元') },
			month: { stem: stem('庚', 'Metal', '杀'), stemInBranch: [stem('辛', 'Metal', '官')] },
		};
		const r = computeGejuYongShen(four, { dayMaster: { verdict: '身弱' } });
		expect(r.yongshen.xi).toEqual(['水', '木']);
		expect(r.yongshen.ji).toEqual(['火', '土', '金']);
		expect(r.geju.name).toBe('正官格'); // 月令本气辛=官（酉单藏）
	});

	test('中和 → 喜流通，无忌神硬判', () => {
		const four = { day: { stem: stem('甲', 'Wood', '日元') }, month: { stemInBranch: [stem('丙', 'Fire', '食')] } };
		const r = computeGejuYongShen(four, { dayMaster: { verdict: '中和' } });
		expect(r.yongshen.verdict).toBe('中和');
		expect(r.yongshen.ji).toEqual([]);
	});
});

describe('变格检测（§9.3，候选提示）', () => {
	function S(label, key, percent){ return { label, key, percent }; }
	function ws(verdict, samePercent, scores){ return { dayMaster: { verdict, samePercent }, scores }; }

	test('专旺/从强：甲木同党90%+寅本气根 → 曲直格', () => {
		const four = {
			day: { stem: stem('甲', 'Wood', '日元') },
			month: { stem: stem('甲', 'Wood', '比'), stemInBranch: [stem('甲', 'Wood', '比')] },
			year: { stem: stem('癸', 'Water', '印'), stemInBranch: [stem('癸', 'Water', '印')] },
			time: { stem: stem('乙', 'Wood', '劫'), stemInBranch: [stem('乙', 'Wood', '劫')] },
		};
		const r = computeGejuYongShen(four, ws('身强', 90, [S('木', 'Wood', 60), S('水', 'Water', 30), S('火', 'Fire', 5), S('土', 'Earth', 3), S('金', 'Metal', 2)]));
		const b = r.bianGe.find((x) => x.type === '专旺/从强');
		expect(b).toBeTruthy();
		expect(b.name).toBe('曲直格');
	});

	test('从弱：甲木同党8%+无木根+土(财)最旺 → 从财格', () => {
		const four = {
			day: { stem: stem('甲', 'Wood', '日元') },
			month: { stem: stem('戊', 'Earth', '财'), stemInBranch: [stem('戊', 'Earth', '财')] },
			year: { stem: stem('己', 'Earth', '才'), stemInBranch: [stem('己', 'Earth', '才')] },
			time: { stem: stem('庚', 'Metal', '杀'), stemInBranch: [stem('庚', 'Metal', '杀')] },
		};
		const r = computeGejuYongShen(four, ws('身弱', 8, [S('土', 'Earth', 55), S('金', 'Metal', 30), S('火', 'Fire', 10), S('木', 'Wood', 3), S('水', 'Water', 2)]));
		const b = r.bianGe.find((x) => x.type === '从弱');
		expect(b).toBeTruthy();
		expect(b.name).toBe('从财格');
	});

	test('化气：甲日合己月化土+月令辰本气土 → 化神当令', () => {
		const four = {
			day: { stem: stem('甲', 'Wood', '日元') },
			month: { stem: stem('己', 'Earth', '财'), stemInBranch: [stem('戊', 'Earth', '财')] },
			year: { stem: stem('丙', 'Fire', '食') },
			time: { stem: stem('丁', 'Fire', '伤') },
		};
		const r = computeGejuYongShen(four, ws('中和', 45, [S('土', 'Earth', 40), S('木', 'Wood', 25), S('火', 'Fire', 20), S('水', 'Water', 10), S('金', 'Metal', 5)]));
		const b = r.bianGe.find((x) => x.type === '化气');
		expect(b).toBeTruthy();
		expect(b.name).toBe('甲己合化土');
		expect(b.cond).toContain('化神当令');
	});

	test('正常盘（2026丁火身强65%有根）不误报变格', () => {
		const gy = baziAt('2026-06-22', '18:00:00').gejuYongShen;
		expect(gy.bianGe).toBeNull();
	});
});

describe('多派对照 · 病药/通关/格局相神（WP-1B 补全）', () => {
	test('schools 首项扶抑派 + 含格局派/调候派（同盘多派对照）', () => {
		const gy = baziAt('2026-06-22', '18:00:00').gejuYongShen;
		expect(Array.isArray(gy.schools)).toBe(true);
		expect(gy.schools.length).toBeGreaterThanOrEqual(2);
		expect(gy.schools[0].school).toBe('扶抑派');
		expect(gy.schools.some((s) => s.school === '格局派')).toBe(true);
		expect(gy.schools.some((s) => s.school === '调候派')).toBe(true);
		expect(gy).toHaveProperty('bingyao');
		expect(gy).toHaveProperty('tongguan');
	});
	test('病药结构：若命中则喜=药、忌=病、药克病、喜≠忌', () => {
		const gy = baziAt('2026-06-22', '18:00:00').gejuYongShen;
		if(gy.bingyao){
			expect(gy.bingyao.xi.length).toBe(1);
			expect(gy.bingyao.ji.length).toBe(1);
			expect(gy.bingyao.xi[0]).not.toBe(gy.bingyao.ji[0]);
			expect(gy.schools.some((s) => s.school === '病药派')).toBe(true);
		}
	});
});
