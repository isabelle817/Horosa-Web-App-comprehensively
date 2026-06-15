// 纳气盘法增强规则单测：破局危害映射 / 龙虎法灶台四象限 / 吉凶评分锚点 / 评级。
import { scoreNaqi, gradeOf, evalDragonTiger, harmForMarker, DT, HARM_MAP, PALACE_FAMILY } from '../naqiRules';

describe('scoreNaqi — 吉凶评分 0-100', () => {
	test('零破局 = 100', () => {
		expect(scoreNaqi({ windOk: 0, waterOk: 0, harms: [], dragonTiger: null })).toBe(100);
	});
	test('锚点：一处破水(-15) + 充足在位物(+10 封顶) = 95', () => {
		const harms = [HARM_MAP['break-water']];
		expect(scoreNaqi({ windOk: 6, waterOk: 4, harms, dragonTiger: null })).toBe(95);
	});
	test('在位物加成封顶 10', () => {
		expect(scoreNaqi({ windOk: 50, waterOk: 50, harms: [] })).toBe(100);
	});
	test('钳制下界 0', () => {
		const many = Array.from({ length: 20 }, () => HARM_MAP['break-water']);
		expect(scoreNaqi({ harms: many })).toBe(0);
	});
	test('龙虎 level 影响 ±(level-3)*2', () => {
		expect(scoreNaqi({ harms: [], dragonTiger: DT.RIGHT_PARALLEL })).toBe(100); // level5 → +4 封顶
		expect(scoreNaqi({ harms: [], windOk: 0, dragonTiger: DT.LEFT_VERTICAL })).toBe(96); // level1 → −4
	});
});

describe('gradeOf — 评级阈值', () => {
	test('≥85 吉 / ≥60 平 / <60 慎', () => {
		expect(gradeOf(100)).toBe('吉');
		expect(gradeOf(85)).toBe('吉');
		expect(gradeOf(84)).toBe('平');
		expect(gradeOf(60)).toBe('平');
		expect(gradeOf(59)).toBe('慎');
		expect(gradeOf(0)).toBe('慎');
	});
});

describe('evalDragonTiger — 龙虎法四象限（以灶口朝向为基准，非门向）', () => {
	const stove = { x: 0, y: 0 };
	// 灶口朝向正北 facingAngle=0：facingVec=(0,-1) 向上=前；rightVec=(1,0) 向右=白虎侧。
	test('右平行（水槽在右·横向占优）= 最佳·大利偏财', () => {
		expect(evalDragonTiger(stove, { x: 100, y: 0 }, 0)).toBe(DT.RIGHT_PARALLEL);
	});
	test('左平行（水槽在左·横向占优）= 格局不稳', () => {
		expect(evalDragonTiger(stove, { x: -100, y: 0 }, 0)).toBe(DT.LEFT_PARALLEL);
	});
	test('右垂直（水槽在前·略偏右）= 白虎低头', () => {
		expect(evalDragonTiger(stove, { x: 20, y: -100 }, 0)).toBe(DT.RIGHT_VERTICAL);
	});
	test('左垂直（水槽在前·略偏左）= 最差·水火相刑', () => {
		expect(evalDragonTiger(stove, { x: -20, y: -100 }, 0)).toBe(DT.LEFT_VERTICAL);
	});
	test('朝向旋转 90°（朝东）随之旋转判定', () => {
		// facingAngle=90：facingVec=(1,0) 向右=前；rightVec=(0,1) 向下=白虎侧。水槽在下=右·横向 → 右平行
		expect(evalDragonTiger(stove, { x: 0, y: 100 }, 90)).toBe(DT.RIGHT_PARALLEL);
	});
	test('缺水槽或缺朝向 → null', () => {
		expect(evalDragonTiger(stove, null, 0)).toBeNull();
		expect(evalDragonTiger(stove, { x: 1, y: 1 }, null)).toBeNull();
		expect(evalDragonTiger(stove, { x: 1, y: 1 }, NaN)).toBeNull();
	});
});

describe('harmForMarker — 破局→危害（通用层 + 卦位家人层）', () => {
	test('气物落水位 = 破气，卦位家人随扇区', () => {
		const h = harmForMarker('wind', 'water', 6); // 6=西北乾=父辈/男主人
		expect(h.key).toBe('break-wind');
		expect(h.label).toBe('破气');
		expect(h.affect).toContain('父辈');
		expect(h.score).toBeLessThan(0);
	});
	test('水物落气位 = 破水', () => {
		const h = harmForMarker('water', 'wind', 9); // 9=南离=次女
		expect(h.key).toBe('break-water');
		expect(h.label).toBe('破水');
		expect(h.affect).toContain('次女');
	});
	test('同类（气物在气位）/ 中立 → 无破局', () => {
		expect(harmForMarker('wind', 'wind', 6)).toBeNull();
		expect(harmForMarker('water', 'water', 2)).toBeNull();
		expect(harmForMarker('neutral', 'water', 6)).toBeNull();
	});
});

describe('PALACE_FAMILY — 后天八卦家人映射齐全', () => {
	test('8 卦位各有家人', () => {
		[6, 1, 8, 3, 4, 9, 2, 7].forEach((num) => expect(PALACE_FAMILY[num]).toBeTruthy());
	});
});
