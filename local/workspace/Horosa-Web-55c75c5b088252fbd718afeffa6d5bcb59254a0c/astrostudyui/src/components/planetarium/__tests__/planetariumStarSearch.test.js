import {
	angleBetweenDeg,
	nearestPointToRay,
	buildStarIndex,
	findStarByName,
	suggestStars,
	starProperName,
	starDisplayLabel,
} from '../planetariumStarSearch';

describe('planetariumStarSearch — 专名/中文名显示', () => {
	test('按 HR 编号取专名,组成「中文 英文」显示标签', () => {
		expect(starProperName({ id: 'bsc5-2491' })).toEqual({ zh: '天狼', proper: 'Sirius' });
		expect(starDisplayLabel({ id: 'bsc5-2491' })).toBe('天狼 Sirius');
		expect(starDisplayLabel({ id: 'bsc5-7001' })).toBe('织女一 Vega');
	});
	test('无专名的星返回 null(调用方回退星表名,不降级)', () => {
		expect(starProperName({ id: 'bsc5-99999' })).toBeNull();
		expect(starDisplayLabel({ id: 'bsc5-99999' })).toBeNull();
	});
});

describe('planetariumStarSearch — 夹角', () => {
	test('同向=0, 垂直=90, 反向=180', () => {
		expect(angleBetweenDeg(0, 0, 1, 0, 0, 1)).toBeCloseTo(0, 5);
		expect(angleBetweenDeg(1, 0, 0, 0, 1, 0)).toBeCloseTo(90, 5);
		expect(angleBetweenDeg(0, 0, 1, 0, 0, -1)).toBeCloseTo(180, 5);
	});
});

describe('planetariumStarSearch — 点最近星(pick 射线兜底)', () => {
	const origin = { x: 0, y: 0, z: 0 };
	const dir = { x: 0, y: 0, z: 1 };
	const pts = [
		{ x: 0, y: 0, z: 10, id: 'onaxis' },     // angle 0
		{ x: 1, y: 0, z: 10, id: 'near' },        // ~5.7°
		{ x: 0, y: 0, z: -10, id: 'behind' },     // behind camera
	];
	test('返回夹角最小且在前方的点', () => {
		const hit = nearestPointToRay(origin, dir, pts, 2);
		expect(hit && hit.id).toBe('onaxis');
		expect(hit._angleDeg).toBeCloseTo(0, 3);
	});
	test('阈值外无命中返回 null(点空处不误选)', () => {
		const far = [{ x: 10, y: 0, z: 1, id: 'wide' }]; // ~84°
		expect(nearestPointToRay(origin, dir, far, 2)).toBeNull();
	});
	test('背向相机的点被排除', () => {
		const only = [{ x: 0, y: 0, z: -10, id: 'behind' }];
		expect(nearestPointToRay(origin, dir, only, 30)).toBeNull();
	});
});

describe('planetariumStarSearch — 按名搜索', () => {
	const catalog = [
		{ id: 'bsc5-2491', name: 'α CMa', bayer: 'α CMa', constellation: 'CMa', mag: -1.46 },
		{ id: 'bsc5-7001', name: 'α Lyr', bayer: 'α Lyr', constellation: 'Lyr', mag: 0.03 },
		{ id: 'bsc5-9999', name: 'HR 9999', constellation: 'And', mag: 5.2 },
	];
	const index = buildStarIndex(catalog);

	test('中文专名 / 英文专名 / HR 编号 都能命中', () => {
		expect(findStarByName(index, '天狼').id).toBe('bsc5-2491');   // zh
		expect(findStarByName(index, 'Sirius').id).toBe('bsc5-2491'); // proper
		expect(findStarByName(index, 'sirius').id).toBe('bsc5-2491'); // case-insensitive
		expect(findStarByName(index, '织女一').id).toBe('bsc5-7001');
		expect(findStarByName(index, 'Vega').id).toBe('bsc5-7001');
		expect(findStarByName(index, 'HR 9999').id).toBe('bsc5-9999');
	});
	test('未知名返回 null', () => {
		expect(findStarByName(index, '不存在xyz')).toBeNull();
	});
	test('autocomplete 按亮度优先', () => {
		const s = suggestStars(index, 'a', 5); // matches CMa/Lyr/And haystacks
		expect(s.length).toBeGreaterThan(0);
		// brightest (Sirius mag -1.46) first
		expect(s[0].star.id).toBe('bsc5-2491');
	});
});
