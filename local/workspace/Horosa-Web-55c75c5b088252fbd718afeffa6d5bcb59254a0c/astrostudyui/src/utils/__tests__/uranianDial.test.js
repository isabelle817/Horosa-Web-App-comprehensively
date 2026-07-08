import { projectToDial, midpoint, dialSeparation, cursorReadout, midpointTree, spreadDialAngles, antiscion, contraAntiscion, planetaryPictures, midpointList, spiegelContacts } from '../uranianDial';

test('90°盘投影 = lon mod 90 映 0..360', () => {
	expect(projectToDial(207.958, 90)).toBeCloseTo(27.958 / 90 * 360, 2); // Cupido fixture ≈111.832
	expect(projectToDial(100, 90)).toBeCloseTo(40, 6);
});

test('近轴中点对称', () => {
	expect(midpoint(10, 50)).toBeCloseTo(30, 6);
	expect(midpoint(350, 10)).toBeCloseTo(0, 6);
});

test('90°盘同轴 readout', () => {
	expect(dialSeparation(73.4221, 13.0843, 90)).toBeCloseTo(29.662, 2); // 日月 90°盘最短角距
	const hits = cursorReadout([{ id: 'Sun', lon: 73.4221 }, { id: 'Moon', lon: 13.0843 }], 73.4221, 90, 1);
	expect(hits.some((h) => h.kind === 'body' && h.id === 'Sun')).toBe(true); // 指针=Sun 命中 Sun
	expect(hits.some((h) => h.id === 'Moon')).toBe(false); // orb1 内不命中 Moon
});

test('行星图 A+B=C+D 由同轴自然涌现', () => {
	// mid(0,80)=40, mid(30,50)=40 → 指针落 40° 同时命中两半和 = 一张 planetary picture
	const P = [{ id: 'a', lon: 0 }, { id: 'b', lon: 80 }, { id: 'c', lon: 30 }, { id: 'd', lon: 50 }];
	expect(cursorReadout(P, 40, 90, 1).filter((x) => x.kind === 'mid').length).toBeGreaterThanOrEqual(2);
});

test('中点树给出 P 完成的半和', () => {
	const P = [{ id: 'a', lon: 0 }, { id: 'b', lon: 80 }, { id: 'p', lon: 40 }];
	const tree = midpointTree(P, 90, 1);
	expect(tree.p && tree.p.length).toBeGreaterThanOrEqual(1); // p=40 命中 a/b 中点
});

test('spreadDialAngles 不重叠时保留真位、重叠时按 minGap 推进', () => {
	// 三星挤在 30° 附近,minGap=5 → 应被推开 0/5/10。
	const out = spreadDialAngles([
		{ p: { id: 'A' }, displayAngle: 30 },
		{ p: { id: 'B' }, displayAngle: 31 },
		{ p: { id: 'C' }, displayAngle: 33 },
	], 5);
	expect(out.length).toBe(3);
	expect(out[0].displayAngle).toBe(30);        // 真位不变
	expect(out[0].glyphAngle).toBeCloseTo(30, 6);
	expect(out[1].glyphAngle).toBeCloseTo(35, 6); // 被顶到 30+5
	expect(out[2].glyphAngle).toBeCloseTo(40, 6); // 再 +5
});

test('spreadDialAngles 不挤时 glyph=display(零位移)', () => {
	const out = spreadDialAngles([
		{ p: { id: 'A' }, displayAngle: 10 },
		{ p: { id: 'B' }, displayAngle: 50 },
		{ p: { id: 'C' }, displayAngle: 200 },
	], 5);
	out.forEach((o) => { expect(o.glyphAngle).toBeCloseTo(o.displayAngle, 6); });
});

test('谐波盘(非 90°)折叠 + readout 自洽', () => {
	// H8(45°盘): lon=0 与 lon=45 同轴,lon=22.5 与 lon=67.5 同轴
	expect(dialSeparation(0, 45, 45)).toBeCloseTo(0, 6);
	expect(dialSeparation(22.5, 67.5, 45)).toBeCloseTo(0, 6);
	// 指针在 22.5°,lon=67.5 必命中(22.5°盘上 67.5 折叠到 22.5)。
	const hits = cursorReadout([{ id: 'X', lon: 67.5 }], 22.5, 45, 0.5);
	expect(hits.some((h) => h.kind === 'body' && h.id === 'X')).toBe(true);
});

test('模数盘 360°基:cursorLon 取真实位、与折叠盘等价', () => {
	// 模数盘传 cursorLon=真实角(0..360),折叠盘传 cursorLon=折叠位 — dialSeparation 内部都按 mod base 处理,
	// 故 base=360 时两口径等价。
	expect(dialSeparation(120, 120, 360)).toBeCloseTo(0, 6);
	expect(dialSeparation(0, 180, 360)).toBeCloseTo(180, 6);
	expect(dialSeparation(0, 359, 360)).toBeCloseTo(1, 6); // 邻 360-1=1
});

test('cursorReadout: onlyPersonal 仅返回含个人点的图', () => {
	const personal = new Set(['Sun']);
	const P = [{ id: 'Sun', lon: 73.42 }, { id: 'X', lon: 73.42 }, { id: 'Y', lon: 13 }];
	const hits = cursorReadout(P, 73.42, 90, 1, { personal, onlyPersonal: true });
	// body 命中:仅 Sun(personal),X 被过滤。
	expect(hits.some((h) => h.kind === 'body' && h.id === 'Sun')).toBe(true);
	expect(hits.some((h) => h.kind === 'body' && h.id === 'X')).toBe(false);
});

test('规格 §11.2 1975盘 90°折叠位 金标对拍 + 硬相位聚类自检', () => {
	// 黄经(由星座+度算)与规格书的「90°折叠位」对拍——验证折叠层(lon mod 90)正确。
	const cases = [
		{ id: 'Sun', lon: 73.4167, fold: 73.42 },     // 13°♊25'
		{ id: 'Moon', lon: 13.0833, fold: 13.08 },    // 13°♈05'
		{ id: 'Jupiter', lon: 17.4167, fold: 17.42 }, // 17°♈25'
		{ id: 'Saturn', lon: 107.3833, fold: 17.39 }, // 17°♋23'(90+17.38)
		{ id: 'Venus', lon: 118.15, fold: 28.16 },    // 28°♋09'
		{ id: 'Uranus', lon: 208.80, fold: 28.80 },   // 28°♎48'
	];
	cases.forEach((c) => { expect(((c.lon % 90) + 90) % 90).toBeCloseTo(c.fold, 1); });
	// 规格自检点①：木 17.42 ≈ 土 17.39 → 90°盘上几乎重合（木土硬相位）。
	expect(dialSeparation(17.4167, 107.3833, 90)).toBeLessThan(0.1);
	// 规格自检点②：金 28.16 ≈ 天 28.80 → 金天硬相位（规格图左下 ♀⛢ 相邻）。
	expect(dialSeparation(118.15, 208.80, 90)).toBeLessThan(0.7);
});

test('映点 Spiegelpunkte 公式(日至轴/分至轴镜像)', () => {
	expect(antiscion(15)).toBeCloseTo(165, 6);        // 15°♈ → 回照 15°♍
	expect(contraAntiscion(15)).toBeCloseTo(345, 6);  // 15°♈ → 对映 15°♓
	expect(antiscion(90)).toBeCloseTo(90, 6);         // 0°♋ 在日至轴上 = 自身
	expect(contraAntiscion(0)).toBeCloseTo(0, 6);     // 0°♈ 在分至轴上 = 自身
	expect(antiscion(0)).toBeCloseTo(180, 6);         // 0°♈ → 0°♎(=30°♍ 边界)
});

test('近中点取短弧(两点相隔 > 90°)', () => {
	// A=350,B=130:平均 240,|240−350|=110>90 → +180 → 60(近 350 的短弧中点)。
	expect(midpoint(350, 130)).toBeCloseTo(60, 6);
});

test('行星图 A+B−C=D 解算(锚点剪枝 + 命中)', () => {
	const personal = new Set(['a']);
	const P = [{ id: 'a', lon: 0 }, { id: 'b', lon: 80 }, { id: 'c', lon: 30 }, { id: 'd', lon: 50 }];
	const pics = planetaryPictures(P, 90, 1, { personal });
	expect(pics.length).toBeGreaterThanOrEqual(1);
	// 0+80−30=50 命中 d
	expect(pics.some((p) => p.d === 'd' && Math.round(p.lon) === 50 && p.sep < 1)).toBe(true);
	// 锚点剪枝:每张图必含锚点 a(a 永远是 A 或 B)
	expect(pics.every((p) => [p.a, p.b, p.c, p.d].includes('a'))).toBe(true);
});

test('中点列表:含个人点排前 + 近中点正确', () => {
	const personal = new Set(['Sun']);
	const P = [{ id: 'Sun', lon: 10 }, { id: 'Moon', lon: 50 }, { id: 'X', lon: 100 }, { id: 'Y', lon: 200 }];
	const list = midpointList(P, 90, { personal });
	expect(list.length).toBe(6); // C(4,2)=6 对
	expect(list[0].a === 'Sun' || list[0].b === 'Sun').toBe(true); // 含个人点的对在最前
	const sm = list.find((m) => (m.a === 'Sun' && m.b === 'Moon') || (m.a === 'Moon' && m.b === 'Sun'));
	expect(sm.lon).toBeCloseTo(30, 6); // Sun/Moon 近中点 = 30
});

test('映点接触 Spiegelpunkt(回照折叠)', () => {
	// A=30,antiscion(30)=150 → B=150 与 A 互成回照接触(30+150=180)。
	expect(spiegelContacts([{ id: 'A', lon: 30 }, { id: 'B', lon: 150 }], 90, 1, {}).length).toBe(1);
	// 90°盘上回照与对映折叠重合:B=330(=对映 360−30) 也判接触(330 与 150 在 90°盘同折叠位 60)。
	expect(spiegelContacts([{ id: 'A', lon: 30 }, { id: 'B', lon: 330 }], 90, 1, {}).length).toBe(1);
	// 无接触:A=30、B=200(折叠位 20,远离 60)→ 空。
	expect(spiegelContacts([{ id: 'A', lon: 30 }, { id: 'B', lon: 200 }], 90, 1, {}).length).toBe(0);
});
