import { computeGeju } from '../core/taiyiGeju';
import { suanFrom, computeShenSuan, computeFenye, computeVictory, computeTaisuiAlias, activeDoorJixiong, computeEhui, shenMeaning, computeSanyuan } from '../core/taiyiDuanfa';

describe('太乙 格局(§14)', () => {
	const base = { taiyiPalace: '艮', taiyiNum: 3, skyeyes: '子', sf: '午', homeGeneral: 5, awayGeneral: 5 };
	test('掩:文昌与太乙同落点', () => {
		const g = computeGeju({ ...base, skyeyes: '艮' });
		expect(g.some((x) => x.kind === 'yan' && x.name.includes('文昌'))).toBe(true);
	});
	test('掩:始击与太乙同落点', () => {
		const g = computeGeju({ ...base, sf: '艮' });
		expect(g.some((x) => x.kind === 'yan' && x.name.includes('始击'))).toBe(true);
	});
	test('囚:主大将宫=太乙宫', () => {
		const g = computeGeju({ ...base, homeGeneral: 3 });
		expect(g.some((x) => x.kind === 'qiu')).toBe(true);
	});
	test('格:主大将宫=太乙对冲宫(3↔6)', () => {
		const g = computeGeju({ ...base, homeGeneral: 6 });
		expect(g.some((x) => x.kind === 'ge')).toBe(true);
	});
	test('对:太乙与始击隔宫相对(艮idx2↔坤idx10)', () => {
		const g = computeGeju({ ...base, sf: '坤' });
		expect(g.some((x) => x.kind === 'dui')).toBe(true);
	});
	test('无格局返回空数组', () => {
		expect(computeGeju({ ...base, skyeyes: '卯', sf: '酉', homeGeneral: 4, awayGeneral: 7 })).toEqual([]);
	});
});

describe('太乙 诸神之算 几何法 suanFrom(§28)', () => {
	test('子→艮 = 8(单跳)', () => { expect(suanFrom('子', '艮')).toBe(8); });
	test('卯→艮 = 37(绕环)', () => { expect(suanFrom('卯', '艮')).toBe(37); });
	test('间神起点(丑)取后一正宫+base1,不抛', () => { expect(typeof suanFrom('丑', '艮')).toBe('number'); });
	test('无效输入返回 null', () => { expect(suanFrom('', '艮')).toBeNull(); expect(suanFrom('子', '')).toBeNull(); });
	test('computeShenSuan 五算齐出带数理', () => {
		const r = computeShenSuan({ taiyiPalace: '艮', taiyiNum: 3, wufuNum: 9, kingbase: '巳', officerbase: '子', pplbase: '巳', sf: '午' });
		expect(r['君基算']).toHaveProperty('value');
		expect(r['君基算']).toHaveProperty('tags');
		expect(r['五福算'].value).toBeGreaterThan(0);
		expect(r['始击算'].value).toBeGreaterThan(0);
	});
});

describe('太乙 分野/胜负/古名', () => {
	test('分野:太乙临3艮→青州·和', () => {
		const f = computeFenye({ taiyiNum: 3, taiyiPalace: '艮', sf: '午' });
		expect(f.taiyi.zhou).toBe('青州');
		expect(f.taiyi.qi).toBe('和');
		expect(f.shiji.zhou).toBe('荆州'); // 午=离2=荆州
	});
	test('胜负:主算>客算→主胜', () => {
		const v = computeVictory({ homeCal: 33, awayCal: 22, taiyiNum: 3 }, []);
		expect(v.side).toBe('主胜');
		expect(v.reasons.length).toBeGreaterThanOrEqual(1);
	});
	test('胜负:客算>主算→客胜', () => {
		expect(computeVictory({ homeCal: 12, awayCal: 26, taiyiNum: 3 }, []).side).toBe('客胜');
	});
	test('胜负:相等→势均', () => {
		expect(computeVictory({ homeCal: 16, awayCal: 16, taiyiNum: 3 }, []).side).toBe('势均');
	});
	test('太岁古名:丙午→柔兆敦牂', () => {
		expect(computeTaisuiAlias({ ganzhi: { year: '丙午' } })).toBe('柔兆敦牂');
	});
	test('太岁古名:甲寅→阏逢摄提格', () => {
		expect(computeTaisuiAlias({ ganzhi: { year: '甲寅' } })).toBe('阏逢摄提格');
	});
});

describe('太乙 八门吉凶 / 厄会', () => {
	test('值使门吉凶:開門→大吉、死門→大凶', () => {
		expect(activeDoorJixiong({ eightDoorDuty: '開門值事' })).toEqual({ door: '开', jixiong: '大吉' });
		expect(activeDoorJixiong({ eightDoorDuty: '死門當值' })).toEqual({ door: '死', jixiong: '大凶' });
		expect(activeDoorJixiong({ eightDoorDuty: '' })).toBeNull();
	});
	test('厄会:主算33重阳厄/客算22重阴厄/定算5无门厄', () => {
		const e = computeEhui({ taiyiPalace: '艮', homeCal: 33, awayCal: 22, setCal: 5 });
		expect(e).toEqual(expect.arrayContaining(['主算重阳厄(33)', '客算重阴厄(22)', '定算无门厄(5)']));
	});
	test('厄会:无厄会→空数组', () => {
		expect(computeEhui({ taiyiPalace: '艮', homeCal: 16, awayCal: 12, setCal: 8 })).toEqual([]);
	});
});

describe('太乙 十六神主事(§8.2)/ 三元(§3.1)', () => {
	test('十六神主事:子=动摇言语、巽=申命号令、坤=刑罚', () => {
		expect(shenMeaning('子')).toBe('动摇·言语');
		expect(shenMeaning('巽')).toBe('申命·号令');
		expect(shenMeaning('坤')).toBe('刑罚');
		expect(shenMeaning('未')).toBe('阴私');
		expect(shenMeaning('')).toBe('');
	});
	test('三元:一/四纪上元、二/五纪中元、三/六纪下元', () => {
		expect(computeSanyuan({ jiyuan: '第一纪甲子元' })).toBe('上元');
		expect(computeSanyuan({ jiyuan: '第一紀甲子元' })).toBe('上元'); // 繁体「紀」(后端真实格式)
		expect(computeSanyuan({ jiyuan: '第二纪某元' })).toBe('中元');
		expect(computeSanyuan({ jiyuan: '第三纪某元' })).toBe('下元');
		expect(computeSanyuan({ jiyuan: '第四纪某元' })).toBe('上元');
		expect(computeSanyuan({ jiyuan: '' })).toBe('');
	});
});
