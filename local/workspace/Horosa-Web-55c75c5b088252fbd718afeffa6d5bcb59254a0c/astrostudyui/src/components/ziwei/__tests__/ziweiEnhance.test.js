// ZiWeiHelper 导入了 d3（本测试用不到）→ mock 掉避免 ESM 转译问题。
jest.mock('d3', () => ({}));

import * as ZWConst from '../../../constants/ZWConst';
import * as ZiWeiHelper from '../ZiWeiHelper';
import { opToText } from '../ZWPatternPanel';

describe('P1-A 四化表·多流派', () => {
	afterEach(() => {
		ZWConst.ZWSchool.school = 'beipai';
	});

	it('默认 beipai＝现状：戊化科右弼 / 庚化科太阴 / 壬化科左辅', () => {
		ZWConst.ZWSchool.school = 'beipai';
		const t = ZWConst.getActiveSiHuaGan();
		expect(t['戊'][2]).toBe('右弼');
		expect(t['庚'][2]).toBe('太阴');
		expect(t['壬'][2]).toBe('左辅');
	});

	it('中州派：仅 戊/庚/壬 化科改为 太阳/天府/天府，其余（含化禄权忌）与现状一致', () => {
		ZWConst.ZWSchool.school = 'zhongzhou';
		const t = ZWConst.getActiveSiHuaGan();
		expect(t['戊'][2]).toBe('太阳');
		expect(t['庚'][2]).toBe('天府');
		expect(t['壬'][2]).toBe('天府');
		// 化禄/权/忌 全派一致
		expect(t['戊'][0]).toBe('贪狼');
		expect(t['戊'][1]).toBe('太阴');
		expect(t['戊'][3]).toBe('天机');
		// 非分歧干完全一致
		expect(t['甲']).toEqual(['廉贞', '破军', '武曲', '太阳']);
		expect(t['癸']).toEqual(['破军', '巨门', '太阴', '贪狼']);
	});

	it('未知流派回退 beipai（安全兜底）', () => {
		ZWConst.ZWSchool.school = 'nonsense';
		expect(ZWConst.getActiveSiHuaGan()['戊'][2]).toBe('右弼');
	});

	it('零回归全表：beipai 十干四化与改造前写死表逐字一致', () => {
		ZWConst.ZWSchool.school = 'beipai';
		expect(ZWConst.getActiveSiHuaGan()).toEqual({
			'甲': ['廉贞', '破军', '武曲', '太阳'],
			'乙': ['天机', '天梁', '紫微', '太阴'],
			'丙': ['天同', '天机', '文昌', '廉贞'],
			'丁': ['太阴', '天同', '天机', '巨门'],
			'戊': ['贪狼', '太阴', '右弼', '天机'],
			'己': ['武曲', '贪狼', '天梁', '文曲'],
			'庚': ['太阳', '武曲', '太阴', '天同'],
			'辛': ['巨门', '太阳', '文曲', '文昌'],
			'壬': ['天梁', '紫微', '左辅', '武曲'],
			'癸': ['破军', '巨门', '太阴', '贪狼'],
		});
	});

	it('getSiHua 随流派变（resetHuaMap 后）：戊干化科 beipai=右弼 / zhongzhou=太阳', () => {
		ZWConst.ZWSchool.school = 'beipai';
		ZWConst.refreshActiveSiHua();
		ZiWeiHelper.resetHuaMap();
		expect(ZiWeiHelper.getSiHua('右弼', '戊')).toBe('科');
		expect(ZiWeiHelper.getSiHua('太阳', '戊')).toBe(null);

		ZWConst.ZWSchool.school = 'zhongzhou';
		ZWConst.refreshActiveSiHua();
		ZiWeiHelper.resetHuaMap();
		expect(ZiWeiHelper.getSiHua('太阳', '戊')).toBe('科');
		expect(ZiWeiHelper.getSiHua('右弼', '戊')).toBe(null);

		// 复位
		ZWConst.ZWSchool.school = 'beipai';
		ZWConst.refreshActiveSiHua();
		ZiWeiHelper.resetHuaMap();
	});
});

describe('P1-C 流年将前/岁前十二神 getFlowJiangSui', () => {
	it('子年：流将星在子、流岁建在子、流白虎在申', () => {
		const arr = ZiWeiHelper.getFlowJiangSui('子');
		const map = {};
		arr.forEach((x) => { map[x.name] = x.zhi; });
		expect(map['流将星']).toBe('子');   // 申子辰将星在子
		expect(map['流岁建']).toBe('子');   // 岁建=年支本位
		expect(map['流白虎']).toBe('申');   // 岁前第9位(idx8)：子起顺行→申
		expect(arr.length).toBe(24);        // 将前12 + 岁前12
	});

	it('午年：流将星在午、流岁建在午、流白虎在寅', () => {
		const map = {};
		ZiWeiHelper.getFlowJiangSui('午').forEach((x) => { map[x.name] = x.zhi; });
		expect(map['流将星']).toBe('午');
		expect(map['流岁建']).toBe('午');
		expect(map['流白虎']).toBe('寅');   // (午idx6 + 8)%12 = 寅
	});

	it('空输入返回空数组', () => {
		expect(ZiWeiHelper.getFlowJiangSui('')).toEqual([]);
	});
});

describe('P0-3 格局条件 opToText', () => {
	it('翻译常见 op', () => {
		expect(opToText({ op: 'inMing', star: '紫微' })).toBe('紫微坐命宫');
		expect(opToText({ op: 'same', stars: ['紫微', '天府'] })).toBe('紫微、天府同宫');
		expect(opToText({ op: 'sandwichMing', stars: ['擎羊', '陀罗'] })).toBe('擎羊、陀罗夹命宫');
		expect(opToText({ op: 'huaMing', hua: '忌' })).toBe('生年化忌星坐命宫');
		expect(opToText({ op: 'breakBy', stars: ['火星', '铃星'] })).toBe('命宫或对宫逢 火星、铃星');
		expect(opToText({ op: 'mingZhi', branches: ['寅', '申'] })).toBe('命宫坐 寅、申 宫');
	});

	it('未知 op 返回空串（不抛错）', () => {
		expect(opToText({ op: 'whatever' })).toBe('');
		expect(opToText(null)).toBe('');
	});
});
