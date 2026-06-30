import { detectJianChuan, JIANCHUAN_24 } from './LRJianChuanDoc';

describe('LRJianChuanDoc · 间传24格/三合全局/三会方 detectJianChuan(§17)', ()=>{
	it('间传具名格:登三天/顾祖/出户/励明', ()=>{
		expect(detectJianChuan(['辰', '午', '申'])).toMatchObject({ kind: '间传', name: '登三天', dir: '顺' });
		expect(detectJianChuan(['午', '辰', '寅'])).toMatchObject({ kind: '间传', name: '顾祖', dir: '逆' });
		expect(detectJianChuan(['丑', '卯', '巳'])).toMatchObject({ kind: '间传', name: '出户' });
		expect(detectJianChuan(['酉', '未', '巳'])).toMatchObject({ kind: '间传', name: '励明', dir: '逆' });
	});
	it('三合全局五局:曲直木/润下水/炎上火/从革金/稼穑土', ()=>{
		expect(detectJianChuan(['亥', '卯', '未'])).toMatchObject({ kind: '全局', name: '曲直格', wuxing: '木' });
		expect(detectJianChuan(['申', '子', '辰'])).toMatchObject({ kind: '全局', name: '润下格', wuxing: '水' });
		expect(detectJianChuan(['寅', '午', '戌'])).toMatchObject({ kind: '全局', name: '炎上格', wuxing: '火' });
		expect(detectJianChuan(['巳', '酉', '丑'])).toMatchObject({ kind: '全局', name: '从革格', wuxing: '金' });
		expect(detectJianChuan(['辰', '戌', '丑'])).toMatchObject({ kind: '全局', name: '稼穑格', wuxing: '土' });
	});
	it('三合任意发用顺序均识别(子辰申/辰申子)', ()=>{
		expect(detectJianChuan(['子', '辰', '申']).name).toBe('润下格');
		expect(detectJianChuan(['辰', '申', '子']).name).toBe('润下格');
	});
	it('三会方:寅卯辰木/亥子丑水', ()=>{
		expect(detectJianChuan(['寅', '卯', '辰'])).toMatchObject({ kind: '三会', name: '三会木方' });
		expect(detectJianChuan(['亥', '子', '丑'])).toMatchObject({ kind: '三会', name: '三会水方' });
	});
	it('泛间传(步长2 无具名):顺/逆', ()=>{
		expect(detectJianChuan(['戌', '子', '寅'])).toMatchObject({ kind: '间传', dir: '顺' }); // 戌子寅 顺间(无具名)
	});
	it('连茹(步长1)非间传 → null;非结构 → null', ()=>{
		expect(detectJianChuan(['子', '丑', '寅'])).toBeNull(); // 进连茹,步长1
		expect(detectJianChuan(['子', '午', '寅'])).toBeNull();
		expect(detectJianChuan(['子', '丑'])).toBeNull();
	});
	it('24格表齐全(顺11+逆12=23 具名)', ()=>{
		expect(Object.keys(JIANCHUAN_24).length).toBe(23);
	});
});
