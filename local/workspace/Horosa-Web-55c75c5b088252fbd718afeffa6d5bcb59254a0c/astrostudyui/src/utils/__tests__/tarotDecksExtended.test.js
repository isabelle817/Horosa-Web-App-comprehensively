// 塔罗扩展流派(P2-P6)护栏:各牌组张数/读法/确定性;Lenormand Grand Tableau 宫位+指示牌定位;
// Continental 变体C 字母;King 色阶;扑克 52;Minchiate 97。
import { getDeck, getDeckCards, listDeckGroups } from '../../components/tarot/engine/deckRegistry';
import { buildReading } from '../../components/tarot/engine/reading';
import { astroLine } from '../../components/tarot/engine/cardSchema';
import { kingScaleColor } from '../../components/tarot/engine/colorScales';

describe('塔罗扩展流派 · 牌组结构', () => {
	test('各牌组张数正确', () => {
		const sizes = { wirth: 22, bota: 78, egyptian: 22, etteilla: 78, lenormand: 36, kipper: 36, sibilla: 52, cartomancy: 52, minchiate: 97, visconti: 78 };
		Object.keys(sizes).forEach((id) => {
			const d = getDeck(id);
			expect(d).toBeTruthy();
			expect(getDeckCards(id).length).toBe(sizes[id]);
			expect(d.size).toBe(sizes[id]);
		});
	});
	test('读法分派 caps.readingMethod', () => {
		expect(getDeck('lenormand').caps.readingMethod).toBe('lenormand');
		expect(getDeck('kipper').caps.readingMethod).toBe('lenormand');
		expect(getDeck('cartomancy').caps.readingMethod).toBe('cartomancy');
		expect(getDeck('wirth').caps.readingMethod).toBe('tarot');
	});
	test('分组列表含全部新牌组', () => {
		const all = listDeckGroups().flatMap((g) => g.items.map((i) => i.value));
		['wirth', 'bota', 'egyptian', 'etteilla', 'lenormand', 'kipper', 'sibilla', 'cartomancy', 'minchiate', 'visconti'].forEach((id) => expect(all).toContain(id));
	});
});

describe('塔罗扩展流派 · 抽牌与确定性', () => {
	test('各牌组 buildReading 不抛、抽牌数对、可复现', () => {
		const cases = [['wirth', 'three'], ['bota', 'celtic'], ['egyptian', 'three'], ['etteilla', 'celtic'], ['lenormand', 'lenormand_3'], ['kipper', 'lenormand_box9'], ['cartomancy', 'three'], ['minchiate', 'celtic'], ['visconti', 'three']];
		cases.forEach(([deckId, spread]) => {
			const r1 = buildReading(deckId, spread, 'ext-seed');
			const r2 = buildReading(deckId, spread, 'ext-seed');
			expect(r1.draws.length).toBeGreaterThan(0);
			expect(r1.draws.every((d) => d.card)).toBe(true);
			expect(r1.draws.map((d) => d.cardId)).toEqual(r2.draws.map((d) => d.cardId));
		});
	});
	test('Wirth 仅大牌(抽出的都是 major)', () => {
		const r = buildReading('wirth', 'three', 'w-seed');
		expect(r.draws.every((d) => d.card.arcana === 'major')).toBe(true);
	});
});

describe('塔罗扩展流派 · Lenormand Grand Tableau', () => {
	test('GT 36 张 + 宫位 36 + 男女定位 + 四角', () => {
		const r = buildReading('lenormand', 'grand_tableau', 'gt-seed');
		expect(r.draws.length).toBe(36);
		expect(r.lenormand).toBeTruthy();
		expect(r.lenormand.kind).toBe('gt');
		const gt = r.lenormand.gt;
		expect(gt.houses.length).toBe(36);
		// 男(28)/女(29)必在 36 张全摊牌阵中被定位到
		expect(gt.man).toBeTruthy();
		expect(gt.woman).toBeTruthy();
		expect(typeof gt.man.row).toBe('number');
		expect(gt.corners.length).toBe(4);
	});
	test('Lenormand 无逆位(全正)', () => {
		const r = buildReading('lenormand', 'lenormand_3', 'l3-seed');
		expect(r.draws.every((d) => d.isReversed === false)).toBe(true);
	});
});

describe('塔罗扩展流派 · 对应/色阶', () => {
	test('Continental 变体C:Fool=Shin、Magician=Aleph(大陆派)', () => {
		const fool = getDeckCards('wirth').find((c) => c.sid === 'the_fool');
		const magician = getDeckCards('wirth').find((c) => c.sid === 'the_magician');
		expect(astroLine(fool, getDeck('wirth'), 'C')).toContain('Shin');
		expect(astroLine(magician, getDeck('wirth'), 'C')).toContain('Aleph');
	});
	test('King 色阶:大牌有色、小牌无', () => {
		const major = getDeckCards('bota').find((c) => c.arcana === 'major');
		const minor = getDeckCards('bota').find((c) => c.arcana === 'minor');
		expect(kingScaleColor(major)).toBeTruthy();
		expect(kingScaleColor(major).hex).toMatch(/^#/);
		expect(kingScaleColor(minor)).toBeNull();
	});
});
