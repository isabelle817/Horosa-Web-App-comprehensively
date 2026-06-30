// 塔罗引擎(P1)护栏:4 核心各派显示名/8-11 换号/变体 B Emperor-Star 互换/各派宫廷命名;
// 元素尊位 friend/enemy;定局法 yesNo/quintessence/birthCards/yearCard;buildReading 全组合确定性。
import { getDeck, getDeckCards, listDeckGroups } from '../../components/tarot/engine/deckRegistry';
import { displayName, astroLine, cardNumber, cardElement } from '../../components/tarot/engine/cardSchema';
import { dignify, dignify3 } from '../../components/tarot/engine/dignities';
import { yesNo, quintessence, birthCards, yearCard, reduceTo, synthesize, cardNumericValue, pairings, timing, clarifier } from '../../components/tarot/engine/verdict';
import { significatorId } from '../../components/tarot/engine/significator';
import { buildReading } from '../../components/tarot/engine/reading';

const cardBySid = (sid) => getDeckCards('rws').find((c) => c.sid === sid);

describe('塔罗引擎 · 各派显示名与对应', () => {
	test('8/11 换号:力量在 rws/gd=8、tdm/thoth=11;正义反之', () => {
		const strength = cardBySid('strength');
		const justice = cardBySid('justice');
		expect(cardNumber(strength, getDeck('rws'))).toBe(8);
		expect(cardNumber(strength, getDeck('golden_dawn'))).toBe(8);
		expect(cardNumber(strength, getDeck('tdm'))).toBe(11);
		expect(cardNumber(strength, getDeck('thoth'))).toBe(11);
		expect(cardNumber(justice, getDeck('rws'))).toBe(11);
		expect(cardNumber(justice, getDeck('thoth'))).toBe(8);
	});

	test('各派牌名:托特 Magus/Lust、马赛 Le Mat、花色与宫廷命名', () => {
		expect(displayName(cardBySid('the_magician'), getDeck('thoth'))).toContain('Magus');
		expect(displayName(cardBySid('strength'), getDeck('thoth'))).toContain('Lust');
		expect(displayName(cardBySid('the_fool'), getDeck('tdm'))).toContain('Le Mat');
		// 钱币:rws=Pentacles,gd/thoth=Disks,tdm=Deniers
		const penKing = cardBySid('pentacles_king');
		expect(displayName(penKing, getDeck('rws'))).toContain('Pentacles');
		expect(displayName(penKing, getDeck('thoth'))).toContain('Disks');
		expect(displayName(penKing, getDeck('tdm'))).toContain('Deniers');
		// 宫廷命名:rws King,gd/thoth Knight(最高位),tdm Roi
		expect(displayName(penKing, getDeck('golden_dawn'))).toContain('Knight');
		expect(displayName(penKing, getDeck('tdm'))).toContain('Roi');
	});

	test('变体 B(托特):Emperor↔Star 的字母+路径整对互换,星座不变', () => {
		const emperor = cardBySid('the_emperor');
		const star = cardBySid('the_star');
		const ea = astroLine(emperor, getDeck('thoth'));
		const sa = astroLine(star, getDeck('thoth'));
		expect(ea).toContain('Tzaddi'); expect(ea).toContain('路径 28'); expect(ea).toContain('Aries'); // 星座不变
		expect(sa).toContain('Heh'); expect(sa).toContain('路径 15'); expect(sa).toContain('Aquarius');
		// 变体 A(rws):不互换
		const eaA = astroLine(emperor, getDeck('rws'));
		expect(eaA).toContain('Heh'); expect(eaA).toContain('路径 15');
	});

	test('小牌对应行:Ace=元素之根;数字牌=Lord+行星 in 星座;宫廷=元素中元素', () => {
		expect(astroLine(cardBySid('wands_01'), getDeck('rws'))).toContain('元素之根');
		const w2 = astroLine(cardBySid('wands_02'), getDeck('rws'));
		expect(w2).toContain('Dominion'); expect(w2).toContain('Aries');
		expect(astroLine(cardBySid('wands_king'), getDeck('rws'))).toContain('火中火');
	});
});

describe('塔罗引擎 · 元素尊位', () => {
	test('同元素强化、友邻强化、敌邻削弱', () => {
		expect(dignify('fire', 'fire', 'fire').strength).toBe('强');
		expect(dignify('fire', 'air', null).score).toBeGreaterThan(0); // 火风友
		expect(dignify('fire', 'water', 'water').strength).toBe('弱'); // 火水敌
	});
	test('三张式:主导元素', () => {
		const r = dignify3('fire', 'fire', 'water');
		expect(r.dominant).toBe('fire');
	});
});

describe('塔罗引擎 · 定局法', () => {
	test('生命牌 birthCards(1962,7,23)→人格21/灵魂3;流年 yearCard(7,23,2026)→13', () => {
		expect(birthCards(1962, 7, 23)).toEqual({ personality: 21, soul: 3 });
		expect(yearCard(7, 23, 2026)).toBe(13);
		expect(reduceTo(1992, 22)).toBe(21);
	});
	test('Yes/No 三模式不抛且方向合理', () => {
		const r = buildReading('rws', 'three', 'verdict-seed', { reversals: false });
		['majority', 'orientation', 'single', 'numeric', 'polarity'].forEach((m) => {
			const v = yesNo(r.draws, m);
			expect(['YES 是', 'NO 否', 'MAYBE 未定']).toContain(v.verdict);
		});
	});
	test('精华牌归约到一张大牌(0..21)', () => {
		const r = buildReading('rws', 'celtic', 'quint-seed', {});
		const q = quintessence(r.draws, getDeckCards('rws'));
		expect(q).toBeTruthy();
		expect(q.arcana).toBe('major');
		expect(q.number).toBeGreaterThanOrEqual(0);
		expect(q.number).toBeLessThanOrEqual(21);
	});
	test('综合统计:总数/花色/大牌数自洽', () => {
		const r = buildReading('rws', 'celtic', 'syn-seed', {});
		const s = synthesize(r.draws);
		expect(s.total).toBe(10);
		const minorTotal = s.suitCount.wands + s.suitCount.cups + s.suitCount.swords + s.suitCount.pentacles;
		expect(minorTotal + s.majors).toBe(10);
	});
});

describe('塔罗引擎 · 指示牌与确定性', () => {
	test('自动指示牌:火象+女→权杖王后', () => {
		expect(significatorId('female', 30, 'Aries')).toBe('wands_queen');
		expect(significatorId('male', 40, 'Capricorn')).toBe('pentacles_king');
		expect(significatorId('male', 12, 'Gemini')).toBe('swords_page');
	});
	test('逆位关:同 order、朝向全正(只改朝向不改抽到的牌)', () => {
		const on = buildReading('rws', 'celtic', 'rev-seed', { reversals: true });
		const off = buildReading('rws', 'celtic', 'rev-seed', { reversals: false });
		expect(on.draws.map((d) => d.cardId)).toEqual(off.draws.map((d) => d.cardId)); // 同 order
		expect(off.draws.every((d) => d.isReversed === false)).toBe(true); // 全正
	});
	test('指示牌剔除:该牌不出现在抽出的牌中', () => {
		const r = buildReading('rws', 'celtic', 'sig-seed', { sig: { mode: 'auto', gender: 'female', age: 30, sign: 'Aries' } });
		expect(r.significator).toBeTruthy();
		expect(r.significator.sid).toBe('wands_queen');
		expect(r.draws.some((d) => d.card.sid === 'wands_queen')).toBe(false);
	});
	test('同 (deck,spread,seed,settings) 完全复现', () => {
		const a = buildReading('thoth', 'celtic', 'rep', { dignities: true });
		const b = buildReading('thoth', 'celtic', 'rep', { dignities: true });
		expect(a.draws.map((d) => d.cardId)).toEqual(b.draws.map((d) => d.cardId));
		expect(a.draws.map((d) => d.isReversed)).toEqual(b.draws.map((d) => d.isReversed));
	});
	test('牌组分组列表含 4 核心', () => {
		const groups = listDeckGroups();
		const all = groups.flatMap((g) => g.items.map((i) => i.value));
		['rws', 'tdm', 'thoth', 'golden_dawn'].forEach((id) => expect(all).toContain(id));
	});
});

describe('塔罗引擎 · P7 配对/计时/澄清牌', () => {
	test('配对:相邻/镜像/桥接', () => {
		const r = buildReading('rws', 'celtic', 'pair-seed', {});
		const p = pairings(r.draws);
		expect(p.adjacent.length).toBe(9); // 10 张相邻对 9
		expect(p.mirror.length).toBe(5);
		expect(p.bridge).toBeTruthy();
		expect(p.bridge.a).toBeTruthy(); expect(p.bridge.b).toBeTruthy();
	});
	test('计时:花色定单位(权杖日/圣杯周/宝剑时辰/钱币月)', () => {
		const cards = getDeckCards('rws');
		expect(timing(cards.find((c) => c.sid === 'wands_05'))).toContain('日');
		expect(timing(cards.find((c) => c.sid === 'cups_05'))).toContain('周');
		expect(timing(cards.find((c) => c.sid === 'pentacles_05'))).toContain('月');
	});
	test('澄清牌:从余牌确定性取一张(不在已抽中)', () => {
		const r = buildReading('rws', 'three', 'clar-seed', {});
		const cards = getDeckCards('rws');
		const cl = clarifier(r.draws, cards);
		expect(cl).toBeTruthy();
		expect(r.draws.some((d) => d.card.id === cl.id)).toBe(false);
	});
});
