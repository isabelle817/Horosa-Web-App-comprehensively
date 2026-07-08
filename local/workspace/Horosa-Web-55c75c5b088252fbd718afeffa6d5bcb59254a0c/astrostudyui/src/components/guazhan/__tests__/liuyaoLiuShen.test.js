import {
	LIUSHEN_XIANG, liuShenByDay, annotateLiuShen, cuoGuaOf, zongGuaOf, huGuaOf,
} from '../../gua/liuyaoLiuShen';
import { Gua64, SixGods, GanList } from '../../gua/GuaConst';

function byName(n){ return Gua64.find((g) => g.name === n); }

describe('六爻六神取象·WP-H', () => {
	test('按日干起六神', () => {
		expect(liuShenByDay('甲')).toEqual(['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']);
		expect(liuShenByDay('丙')).toEqual(['朱雀', '勾陈', '螣蛇', '白虎', '玄武', '青龙']);
		expect(liuShenByDay('戊')).toEqual(['勾陈', '螣蛇', '白虎', '玄武', '青龙', '朱雀']);
	});

	test('与既有 SixGods 表 10 干全一致(零回归交叉验)', () => {
		GanList.forEach((g) => {
			expect(liuShenByDay(g)).toEqual(SixGods[g]);
		});
	});

	test('六神取象表 6 神齐、含五行/静象/发动象', () => {
		['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'].forEach((n) => {
			expect(LIUSHEN_XIANG[n]).toBeTruthy();
			expect(LIUSHEN_XIANG[n].xiang.length).toBeGreaterThan(2);
			expect(LIUSHEN_XIANG[n].fadong.length).toBeGreaterThan(2);
		});
		expect(LIUSHEN_XIANG['青龙'].wuxing).toBe('木');
		expect(LIUSHEN_XIANG['白虎'].wuxing).toBe('金');
	});

	test('逐爻标注六神(甲日:初青龙→上玄武)', () => {
		const yaos = [1, 2, 3, 4, 5, 6].map((p) => ({ pos: p, zhi: '子' }));
		const ann = annotateLiuShen(yaos, '甲');
		expect(ann[0]).toMatchObject({ pos: 1, liushen: '青龙' });
		expect(ann[5]).toMatchObject({ pos: 6, liushen: '玄武' });
		expect(ann[0].xiang).toContain('吉庆');
	});

	test('错卦(阴阳全变):乾→坤;天风姤→地雷复', () => {
		expect(cuoGuaOf(byName('乾为天')).name).toBe('坤为地');
		expect(cuoGuaOf(byName('天风姤')).name).toBe('地雷复');
	});

	test('综卦(上下颠倒):乾→乾(自反);天风姤→泽天夬', () => {
		expect(zongGuaOf(byName('乾为天')).name).toBe('乾为天');
		expect(zongGuaOf(byName('天风姤')).name).toBe('泽天夬');
	});

	test('互卦:乾→乾;天风姤→乾', () => {
		expect(huGuaOf(byName('乾为天')).name).toBe('乾为天');
		expect(huGuaOf(byName('天风姤')).name).toBe('乾为天');
	});
});
