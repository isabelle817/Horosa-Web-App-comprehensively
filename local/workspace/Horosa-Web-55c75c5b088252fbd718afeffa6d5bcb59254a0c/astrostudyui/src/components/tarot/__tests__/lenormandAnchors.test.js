// #54 Bug I 回归:Grand Tableau 指示牌锚按牌组取(Kipper 主牌01/02、Lenormand 男28女29),
// 及 Minchiate/Visconti 大牌(*_trump)可被精华牌/生命牌的 majorByNumber 取到。
import { buildReading } from '../engine/reading.js';
import { grandTableau } from '../engine/lenormandReading.js';
import { getDeckCards } from '../engine/deckRegistry.js';
import { majorByNumber, isTrumpArcana, quintessence } from '../engine/verdict.js';

describe('Grand Tableau 指示牌锚(#54 Bug I)', () => {
	test('Kipper GT:36 张全铺,主牌·男(kipper_01)/女(kipper_02)必在阵中且非空', () => {
		const reading = buildReading('kipper', 'grand_tableau', 12345);
		expect(reading.lenormand).toBeTruthy();
		expect(reading.lenormand.kind).toBe('gt');
		const gt = reading.lenormand.gt;
		// 修复前找 lenormand_28/29 → 恒 undefined;修复后找 kipper_01/02 → 命中
		expect(gt.man).toBeTruthy();
		expect(gt.woman).toBeTruthy();
		expect(gt.man.card.sid).toBe('kipper_01');
		expect(gt.woman.card.sid).toBe('kipper_02');
		expect(gt.manName).toBe('主牌·男');
		expect(gt.womanName).toBe('主牌·女');
		// 贯穿线/跳马随之非空(指示牌已定位)
		expect(gt.manLines).toBeTruthy();
		expect(Array.isArray(gt.manKnight)).toBe(true);
	});

	test('Kipper GT 宫位叠读不套 Lenormand 专有宫名,按位置编号', () => {
		const reading = buildReading('kipper', 'grand_tableau', 999);
		const houses = reading.lenormand.gt.houses;
		expect(houses.length).toBe(36);
		// 不出现 Lenormand 专有宫名(如「狐狸」「棺材」),只出现「位置N」
		expect(houses[0].house).toBe('位置1');
		expect(houses[13].house).toBe('位置14');
		houses.forEach((h) => expect(h.house.startsWith('位置')).toBe(true));
	});

	test('Lenormand GT 零回归:男=lenormand_28 / 女=lenormand_29 仍命中,且仍套 36 宫名', () => {
		const reading = buildReading('lenormand', 'grand_tableau', 777);
		const gt = reading.lenormand.gt;
		expect(gt.man).toBeTruthy();
		expect(gt.woman).toBeTruthy();
		expect(gt.man.card.sid).toBe('lenormand_28');
		expect(gt.woman.card.sid).toBe('lenormand_29');
		expect(gt.manName).toBe('男人');
		expect(gt.womanName).toBe('女人');
		// Lenormand 仍套标准宫名
		expect(gt.houses[0].house).toBe('骑士');
		expect(gt.houses[13].house).toBe('狐狸');
	});

	test('grandTableau 纯函数直调:空/异常 draws 安全回退 lenormand 锚不抛', () => {
		const gt = grandTableau([], 8);
		expect(gt.man).toBeUndefined();
		expect(gt.woman).toBeUndefined();
		expect(gt.manName).toBe('');
	});
});

describe('Minchiate/Visconti 大牌族可取(#54 Bug I 连带)', () => {
	test('isTrumpArcana 识别 major 与 *_trump', () => {
		expect(isTrumpArcana('major')).toBe(true);
		expect(isTrumpArcana('minchiate_trump')).toBe(true);
		expect(isTrumpArcana('visconti_trump')).toBe(true);
		expect(isTrumpArcana('minor')).toBe(false);
		expect(isTrumpArcana(null)).toBe(false);
	});

	test('Minchiate:majorByNumber 取得 trump 大牌(精华/生命牌不再恒 —)', () => {
		const cards = getDeckCards('minchiate');
		const c0 = majorByNumber(cards, 0);
		const c10 = majorByNumber(cards, 10);
		expect(c0).toBeTruthy();
		expect(c0.arcana).toBe('minchiate_trump');
		expect(c0.number).toBe(0);
		expect(c10).toBeTruthy();
		expect(c10.number).toBe(10);
	});

	test('Visconti:majorByNumber 取得 trump 大牌', () => {
		const cards = getDeckCards('visconti');
		const c5 = majorByNumber(cards, 5);
		expect(c5).toBeTruthy();
		expect(c5.arcana).toBe('visconti_trump');
		expect(c5.number).toBe(5);
	});

	test('RWS 零回归:majorByNumber 仍取 major', () => {
		const cards = getDeckCards('rws');
		const c0 = majorByNumber(cards, 0);
		expect(c0).toBeTruthy();
		expect(c0.arcana).toBe('major');
	});

	test('Minchiate 精华牌归约落到一张 trump 大牌(非 null)', () => {
		const reading = buildReading('minchiate', 'three', 42);
		const cards = getDeckCards('minchiate');
		const quint = quintessence(reading.draws, cards);
		expect(quint).toBeTruthy();
		expect(isTrumpArcana(quint.arcana)).toBe(true);
	});
});
