// 完整星官(312)渲染 + 升落/轨迹接线的「纯天文 + 默认零回归」核钉死。
// PlanetariumBabylon.js 顶层有 `new BABYLON.Color3()` 等(取自 window.BABYLON),
// 故导入前先注入最小 BABYLON 桩,让模块可在 node/jsdom 编译加载(导入即整文件编译冒烟)。

class V3 {
	constructor(x, y, z){ this.x = x; this.y = y; this.z = z; }
	length(){ return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
	normalize(){ const l = this.length() || 1; return new V3(this.x / l, this.y / l, this.z / l); }
	clone(){ return new V3(this.x, this.y, this.z); }
	scale(s){ return new V3(this.x * s, this.y * s, this.z * s); }
	add(o){ return new V3(this.x + o.x, this.y + o.y, this.z + o.z); }
	subtract(o){ return new V3(this.x - o.x, this.y - o.y, this.z - o.z); }
}
const BABYLON_STUB = {
	Color3: function(r, g, b){ this.r = r; this.g = g; this.b = b; },
	Color4: function(r, g, b, a){ this.r = r; this.g = g; this.b = b; this.a = a; },
	Vector3: V3,
};
BABYLON_STUB.Color3.White = ()=>new BABYLON_STUB.Color3(1, 1, 1);
BABYLON_STUB.Color3.Black = ()=>new BABYLON_STUB.Color3(0, 0, 0);
BABYLON_STUB.Vector3.Zero = ()=>new V3(0, 0, 0);

global.window = global.window || {};
global.window.BABYLON = BABYLON_STUB;
global.BABYLON = BABYLON_STUB;

// eslint-disable-next-line import/first
const { asterismColor, buildRequestParams } = require('../PlanetariumBabylon');
// eslint-disable-next-line import/first
const ASTERISMS = require('../../../data/chineseAsterisms.json');

describe('星官数据集 — 结构完备(312 星官,真实 J2000 赤道坐标)', ()=>{
	const arr = ASTERISMS.asterisms || [];
	test('恰有 312 条星官', ()=>{
		expect(Array.isArray(arr)).toBe(true);
		expect(arr.length).toBe(312);
	});
	test('每条星官 stars 非空、lines 引用不越界、ra/decl 在合法天球域内', ()=>{
		let badRefs = 0; let badCoords = 0;
		arr.forEach((a)=>{
			const stars = a.stars || [];
			expect(stars.length).toBeGreaterThan(0);
			stars.forEach((s)=>{
				if(!(Number.isFinite(s.ra) && s.ra >= 0 && s.ra < 360)){ badCoords += 1; }
				if(!(Number.isFinite(s.decl) && s.decl >= -90 && s.decl <= 90)){ badCoords += 1; }
			});
			(a.lines || []).forEach((ln)=>{
				if(!Array.isArray(ln) || ln.length !== 2){ badRefs += 1; return; }
				if(!(ln[0] >= 0 && ln[0] < stars.length && ln[1] >= 0 && ln[1] < stars.length)){ badRefs += 1; }
			});
		});
		expect(badRefs).toBe(0);
		expect(badCoords).toBe(0);
	});
});

describe('星官配色 — 四象/三垣全覆盖、近南极一色(纯象征色,与坐标制无关)', ()=>{
	// 三垣三墙按 group 区分(三色互异);四象按 symbol(青/玄/白/朱);近南极一色。
	test('三垣三墙取色互异(紫微/太微/天市)', ()=>{
		const ziwei = asterismColor({ group: '紫微垣', symbol: '三垣' });
		const taiwei = asterismColor({ group: '太微垣', symbol: '三垣' });
		const tianshi = asterismColor({ group: '天市垣', symbol: '三垣' });
		const key = (c)=>`${c.r},${c.g},${c.b}`;
		expect(new Set([key(ziwei), key(taiwei), key(tianshi)]).size).toBe(3);
	});
	test('四象四色互异(青龙/玄武/白虎/朱雀)', ()=>{
		const key = (c)=>`${c.r},${c.g},${c.b}`;
		const cols = ['青龙', '玄武', '白虎', '朱雀'].map((sym)=>key(asterismColor({ symbol: sym })));
		expect(new Set(cols).size).toBe(4);
	});
	test('数据集中出现的每个 group/symbol 都能取到颜色(无 undefined)', ()=>{
		(ASTERISMS.asterisms || []).forEach((a)=>{
			const c = asterismColor(a);
			expect(c).toBeTruthy();
			expect(Number.isFinite(c.r) && Number.isFinite(c.g) && Number.isFinite(c.b)).toBe(true);
		});
	});
});

describe('升落/轨迹接线 — 默认零回归(不传 include* 时请求体字节级一致)', ()=>{
	const FIELDS = {
		lat: { value: '39.9N' }, lon: { value: '116.4E' },
		gpsLat: { value: 39.9 }, gpsLon: { value: 116.4 },
		name: { value: '北京' }, pos: { value: '北京' }, hsys: { value: 1 },
	};
	const TIME = {
		ad: 1, zone: 8,
		format: (f)=>(f === 'YYYY/MM/DD' ? '2026/06/26' : '12:00:00'),
	};
	test('extras 缺省 与 extras={} 产出完全相同(JSON 字节级)', ()=>{
		const a = buildRequestParams(FIELDS, TIME);
		const b = buildRequestParams(FIELDS, TIME, {});
		expect(JSON.stringify(a)).toBe(JSON.stringify(b));
	});
	test('默认请求体不含任何 include* 门控字段', ()=>{
		const p = buildRequestParams(FIELDS, TIME);
		expect('includeTrails' in p).toBe(false);
		expect('includeRiseSet' in p).toBe(false);
	});
	test('开启轨迹/升落仅「追加」门控字段,其余键不变', ()=>{
		const base = buildRequestParams(FIELDS, TIME);
		const withExtras = buildRequestParams(FIELDS, TIME, { includeTrails: 1, includeRiseSet: 1 });
		expect(withExtras.includeTrails).toBe(1);
		expect(withExtras.includeRiseSet).toBe(1);
		// 删掉新增键后应与默认体逐字节一致 → 证明无任何既有字段被改动。
		const stripped = { ...withExtras };
		delete stripped.includeTrails;
		delete stripped.includeRiseSet;
		expect(JSON.stringify(stripped)).toBe(JSON.stringify(base));
	});
});
