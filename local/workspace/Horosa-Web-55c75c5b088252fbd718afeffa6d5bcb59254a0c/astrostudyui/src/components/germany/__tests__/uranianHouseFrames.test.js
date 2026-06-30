import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import UranianFrameWheel from '../UranianFrameWheel';
import UranianHouseFrames, { buildFrameHouseObjects, frameChartObjFromNatal } from '../UranianHouseFrames';
import { equalHouseFramework, planetHouse } from '../../../utils/uranianDial';
import { LIST_HOUSES, ARIES, LIBRA } from '../../../constants/AstroConst';

// 六宫框(定局法 WP-2)渲染冒烟:SSR 静态标记编译 JSX、捕获运行时/导入错误。
// d3 绘制在 componentDidMount(SSR 不触发),故只验 render() 不抛 + 结构入口正确。

describe('六宫框 渲染冒烟(SSR)', () => {
	test('单框轮盘 UranianFrameWheel 渲染不抛、出 svg', () => {
		const cusps = equalHouseFramework(10);
		const points = [
			{ id: 'Sun', lon: 100 }, { id: 'Moon', lon: 220 }, { id: 'Asc', lon: 10 }, { id: 'AriesPoint', lon: 0 },
		];
		let html = '';
		expect(() => { html = renderToStaticMarkup(<UranianFrameWheel cusps={cusps} points={points} size={300} frameKey="ascendant" label="上升局" />); }).not.toThrow();
		expect(html).toContain('<svg');
	});

	test('cusps 非 12 时不抛(空 svg)', () => {
		let html = '';
		expect(() => { html = renderToStaticMarkup(<UranianFrameWheel cusps={[1, 2, 3]} points={[]} size={200} />); }).not.toThrow();
		expect(html).toContain('<svg');
	});

	test('主面板 UranianHouseFrames 无 fields 时渲染不抛(出框下拉选择器/落宫表标题)', () => {
		let html = '';
		expect(() => { html = renderToStaticMarkup(<UranianHouseFrames fields={null} height={600} />); }).not.toThrow();
		// 框选择器改 XQSelect(下拉):SSR 只渲染当前选中项(默认子午局),其余框在弹层不入静态标记。
		expect(html).toContain('子午局');
		expect(html).toContain('xq-select');     // 下拉选择器已挂载
		expect(html).toContain('落宫表');         // 右栏落宫表标题
	});

	test('降级合成逻辑自洽:等宫框落宫 = planetHouse(纯函数对拍)', () => {
		// 太阳局:1 宫头=☉−90 ⇒ ☉ 落 4 宫(等宫纯函数验证,与组件 degradeFrames 同口径)。
		const sun = 100;
		const cusps = equalHouseFramework(sun - 90);
		expect(planetHouse(sun, cusps)).toBe(4);
		// 月亮局:1 宫头=☽+90 ⇒ ☽ 落 10 宫。
		const moon = 220;
		const mc = equalHouseFramework(moon + 90);
		expect(planetHouse(moon, mc)).toBe(10);
	});
});

// 框→标准盘适配(复用 AstroChart):cusps 嫁接到本命盘 houses、objects 全保真。
describe('六宫框 标准盘适配(cusps → 本命盘 houses)', () => {
	test('buildFrameHouseObjects:12 宫头、id/lon/size/sign/signlon 派生正确(等宫)', () => {
		const cusps = equalHouseFramework(10); // 1 宫头 10° → 各宫 30°
		const hs = buildFrameHouseObjects(cusps);
		expect(hs).not.toBeNull();
		expect(hs.length).toBe(12);
		expect(hs.map((h) => h.id)).toEqual(LIST_HOUSES);
		// 1 宫头:lon=10、size=30、sign=白羊(10°<30)、signlon=10。
		expect(hs[0].lon).toBeCloseTo(10, 6);
		expect(hs[0].size).toBeCloseTo(30, 6);
		expect(hs[0].sign).toBe(ARIES);
		expect(hs[0].signlon).toBeCloseTo(10, 6);
		// 每宫 size 均 30(等宫);所有 size>0(防除零)。
		hs.forEach((h) => expect(h.size).toBeGreaterThan(0));
	});

	test('buildFrameHouseObjects:不等距 cusps(子午局形态)按相邻差算 size、跨 0° 归一', () => {
		// 构造一组不等距 cusps(从 350° 起,跨 0°),验 size=相邻差、首宫跨界。
		const cusps = [350, 30, 70, 100, 140, 175, 170 + 0.0001, 200, 250, 280, 320, 340];
		const hs = buildFrameHouseObjects(cusps);
		expect(hs.length).toBe(12);
		// 1 宫头 350° → size = (30 − 350 + 360) = 40;归一到 [0,360)。
		expect(hs[0].lon).toBeCloseTo(350, 6);
		expect(hs[0].size).toBeCloseTo(40, 6);
		// 末宫 340° → 回到首宫 350°,size=10。
		expect(hs[11].size).toBeCloseTo(10, 6);
	});

	test('buildFrameHouseObjects:非 12 长度 → null(降级走小轮)', () => {
		expect(buildFrameHouseObjects([1, 2, 3])).toBeNull();
		expect(buildFrameHouseObjects(null)).toBeNull();
	});

	test('frameChartObjFromNatal:换 houses、保留 objects、清 houseMap(getHouse 重建)', () => {
		const natal = {
			houseMap: { House1: { id: 'House1', lon: 99 } }, // 旧记忆,适配后须清掉
			params: { hsys: 'P' },
			chart: {
				isDiurnal: true,
				houses: [{ id: 'House1', lon: 99 }],
				objects: [{ id: 'Sun', lon: 123.4, sign: 'Leo', signlon: 3.4 }, { id: 'Moon', lon: 200 }],
				angles: [{ id: 'Asc', lon: 99 }],
			},
		};
		const earthCusps = equalHouseFramework(180); // 地球局:1 宫头恒 180°(0°巨蟹/天顶固定)
		const out = frameChartObjFromNatal(natal, earthCusps);
		// houses 已换成 12 宫(地球局首宫 180°)。
		expect(out.chart.houses.length).toBe(12);
		expect(out.chart.houses[0].lon).toBeCloseTo(180, 6);
		expect(out.chart.houses[0].sign).toBe(LIBRA); // 180° = 天秤起点(index 6)
		// objects/angles/params 原样保真(同引用透传)。
		expect(out.chart.objects).toBe(natal.chart.objects);
		expect(out.chart.angles).toBe(natal.chart.angles);
		expect(out.params).toEqual({ hsys: 'P' });
		// houseMap 清掉(undefined),避免命中旧记忆。
		expect(out.houseMap).toBeUndefined();
		// 不污染原 natal(浅克隆):原 houses 不变。
		expect(natal.chart.houses.length).toBe(1);
	});

	test('frameChartObjFromNatal:本命盘缺失/无 chart → null(回退轻量小轮)', () => {
		expect(frameChartObjFromNatal(null, equalHouseFramework(0))).toBeNull();
		expect(frameChartObjFromNatal({}, equalHouseFramework(0))).toBeNull();
		expect(frameChartObjFromNatal({ chart: { houses: [] } }, [1, 2, 3])).toBeNull(); // cusps 非 12
	});
});
