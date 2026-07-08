// 结构性哨兵(institutionalize):每个有 snapshot builder 的技法,实跑/源扫其产出段头,
// 断言 ⊆ AI_EXPORT_PRESET_SECTIONS[key]。堵住「builder 产段头未登记 preset → 自定义过导出段的
// 用户被 filterContentByWantedSections 静默删、且导出设置勾不到」这类回归(本批 八字4段/世俗4段/
// 金口诀4段/奇门段名错位/六爻断卦结构 皆此坑)。动态/长注释段头必须先静态化(段头固定、注释移正文行),
// 否则在此红。条件段(按数据/流派才出)由 ⊆ 语义天然豁免(未产出即不检);整篇制(塔罗等无段头)不在此列。
import fs from 'fs';
import path from 'path';
import { getAIExportEffectiveSectionsForTechnique, AI_EXPORT_SETTINGS_VERSION } from '../aiExport';
import { buildBaziSnapshotForParams } from '../../components/cntradition/BaZi';
import { buildGuaSnapshotText } from '../../components/guazhan/GuaZhanMain';
import { Gua64, getGua64 } from '../../components/gua/GuaConst';
import { calcDunJia, buildDunJiaSnapshotText } from '../../components/dunjia/DunJiaCalc';
import { buildLocalBaziResult } from '../baziLunarLocal';

// ---- 与 aiExport 同口径的段头归一/抽取(单一真值源:preset 由 getAIExportEffectiveSectionsForTechnique 给) ----
function normTitle(t){
	const s = `${t || ''}`.trim();
	if(!s){ return ''; }
	if(/^基于.+推运$/.test(s)){ return '基于X点推运'; }
	if(/^基于.+起运$/.test(s)){ return '基于X起运'; }
	return s;
}
function presetSet(key){
	const arr = getAIExportEffectiveSectionsForTechnique(key, { version: AI_EXPORT_SETTINGS_VERSION, sections: {} }) || [];
	return new Set(arr.map(normTitle).filter(Boolean));
}
// 与 parseSectionTitleLine 同:整行 [X] / 【X】 才算段头(行内带其它文字 → 非段头,这正是要靠「段头卫生」堵的反面)
function extractHeaders(text){
	const out = [];
	`${text || ''}`.split('\n').forEach((line)=>{
		const t = `${line || ''}`.trim();
		const m = t.match(/^\[(.+)\]$/) || t.match(/^【(.+)】$/);
		if(m && m[1]){ out.push(normTitle(m[1])); }
	});
	return Array.from(new Set(out));
}

// ---- 本地八字/奇门夹具(复用本地引擎,无需后端;与各技法既有 *.test 同构) ----
function makeFields(dateStr, timeStr){
	return {
		date: { value: { format: ()=>dateStr } },
		time: { value: { format: ()=>timeStr } },
		zone: { value: '+08:00' },
	};
}
function gz(pillar){ return (pillar && (pillar.ganzhi || pillar.ganZhi)) || ''; }
function buildLocalNongli(date, time){
	const local = buildLocalBaziResult({ date, time, zone: '+08:00', lon: '120e00', lat: '0n00', gpsLon: 120, gpsLat: 0, ad: 1, gender: 1, timeAlg: 1, after23NewDay: 0 });
	const four = local.bazi.fourColumns;
	return {
		...local.bazi.nongli,
		bazi: local.bazi,
		yearGanZi: gz(four.year), yearJieqi: gz(four.year),
		monthGanZi: gz(four.month), dayGanZi: gz(four.day),
		time: gz(four.time), timeGanZi: gz(four.time),
	};
}

describe('AI 导出 roundtrip 哨兵:builder 实跑段头 ⊆ AI_EXPORT_PRESET_SECTIONS', ()=>{
	test('八字(本地引擎):快照段头全部登记进 bazi preset(含静态化后的 五行力量/格局·用神/盲派结构/月令司令（分野）)', async ()=>{
		const BASE = { date: '1990-05-18', time: '10:00:00', zone: '+08:00', lon: 118.45, gpsLon: 118.45, lat: 31.63, gpsLat: 31.63, gender: 1, timeAlg: 1, after23NewDay: 1 };
		const text = await buildBaziSnapshotForParams({ ...BASE, school: 'mangpai', period: { liunian: [2020], liuyue: [], liuri: [], liushi: [] } });
		const headers = extractHeaders(text);
		const preset = presetSet('bazi');
		const orphan = headers.filter((h)=>!preset.has(h));
		expect(orphan).toEqual([]);
		// 静态化锚:不得回潮成动态段头(否则自定义用户被静默删)
		expect(headers).toEqual(expect.arrayContaining(['五行力量', '格局·用神', '盲派结构', '月令司令（分野）']));
	});

	test('六爻断卦:快照段头全部登记进 sixyao preset(含静态化后的 断卦结构)', ()=>{
		getGua64(0);
		const g = Gua64.find((x)=>x.name === '火水未济');
		const yao = g.value.map((v, i)=>({ value: v, change: i === 2, god: null, name: g.yaoname[i] }));
		const st = { currentGua: Gua64.indexOf(g), yao, nongli: { dayGanZi: '甲子', monthGanZi: '丙午', yearGanZi: '丙午', time: '子' }, guaDesc: {}, liuyaoSettings: null };
		const text = buildGuaSnapshotText({}, st);
		const headers = extractHeaders(text);
		const preset = presetSet('sixyao');
		expect(headers.filter((h)=>!preset.has(h))).toEqual([]);
		expect(headers).toContain('断卦结构');
	});

	test('奇门(本地日家盘):快照段头全部登记进 qimen preset(含真实段 旺相休囚死·月令能量,非旧幽灵)', ()=>{
		const fields = makeFields('2026-05-15', '00:12:00');
		const nongli = buildLocalNongli('2026-05-15', '00:12:00');
		const pan = calcDunJia(fields, nongli, { paiPanType: 2, qijuMethod: 'chaibu', zhiShiType: 0, yueJiaQiJuType: 1, kongMode: 'day', yimaMode: 'day', shiftPalace: 0, fengJu: false, timeAlg: 1 }, {});
		const text = buildDunJiaSnapshotText(pan);
		const headers = extractHeaders(text);
		const preset = presetSet('qimen');
		expect(headers.filter((h)=>!preset.has(h))).toEqual([]);
		expect(headers).toContain('旺相休囚死·月令能量');
	});
});

// ---- 源扫:夹具偏重的 builder(世俗盘为实例方法 / 金口诀依赖后端四位数据),静态段头字面量 ⊆ preset ----
function readSrc(rel){ return fs.readFileSync(path.resolve(__dirname, rel), 'utf8'); }
function sliceFrom(src, marker, span){
	const i = src.indexOf(marker);
	return i < 0 ? src : src.slice(i, i + (span || 14000));
}
// 抽 '[X]' / `[X]` / "[X]" 字面量段头(动态 ${...} 前缀截断后为空则跳过)
function sourceBracketHeaders(region){
	const names = new Set();
	const re = /(['"`])\[([^\]\n'"`]+?)\]/g;
	let m;
	while((m = re.exec(region))){
		let n = m[2];
		const d = n.indexOf('${');
		if(d >= 0){ n = n.slice(0, d); }
		n = normTitle(n);
		if(n){ names.add(n); }
	}
	return names;
}

describe('AI 导出 roundtrip 哨兵:源扫静态段头 ⊆ AI_EXPORT_PRESET_SECTIONS', ()=>{
	test('金口诀 buildJinKouSnapshotText:源内字面量段头全部登记进 jinkou preset(含 发用·五动三动/格局/太岁月建/贵神月将象意/分类用神)', ()=>{
		const src = readSrc('../../components/jinkou/JinKouMain.js');
		const region = sliceFrom(src, 'export function buildJinKouSnapshotText', 16000);
		const headers = Array.from(sourceBracketHeaders(region));
		const preset = presetSet('jinkou');
		expect(headers.length).toBeGreaterThan(8);
		expect(headers.filter((h)=>!preset.has(h))).toEqual([]);
		expect(headers).toEqual(expect.arrayContaining(['发用·五动三动', '格局', '太岁月建', '贵神月将象意', '分类用神']));
	});

	test('世俗盘 buildAiSnapshot:派生分析段头(定局/入境骨架/地理分野/地区盘推运/世俗宫义)全部登记进 mundane preset', ()=>{
		const src = readSrc('../../components/mundane/MundaneMain.js');
		const region = sliceFrom(src, 'const extraSecs = [];', 4000);
		const headers = Array.from(sourceBracketHeaders(region));
		const preset = presetSet('mundane');
		expect(headers.filter((h)=>!preset.has(h))).toEqual([]);
		expect(headers).toEqual(expect.arrayContaining(['世俗宫义', '定局·年主/盘主', '入境骨架', '地理分野', '地区盘推运']));
	});

	// 大六壬全流派补齐:buildLiuRengSnapshotText 的断卦层段头(年月神煞/课体结构/三传旺衰/空亡真假/旬空落点/陷空/遁干特殊/
	// 年命上神/占断向导)条件产出(每盘几乎必出)。源扫(builder 依赖后端 gods+chartObj,夹具偏重)→ 字面量段头 ⊆ liureng preset。
	// 此 builder 段头全为字面量(无 ${} 动态段头),源扫无假失败之虞;v29 已把这 9 段补进 preset。
	test('大六壬 buildLiuRengSnapshotText:源内字面量段头全部登记进 liureng preset(含 年月神煞/课体结构/三传旺衰/空亡真假/旬空落点/陷空/遁干特殊/年命上神/占断向导)', ()=>{
		const src = readSrc('../../components/lrzhan/LiuRengMain.js');
		const region = sliceFrom(src, 'export function buildLiuRengSnapshotText', 12000);
		const headers = Array.from(sourceBracketHeaders(region));
		const preset = presetSet('liureng');
		expect(headers.length).toBeGreaterThan(10);
		expect(headers.filter((h)=>!preset.has(h))).toEqual([]);
		expect(headers).toEqual(expect.arrayContaining(['年月神煞', '课体结构', '三传旺衰', '空亡真假', '旬空落点', '陷空', '遁干特殊', '年命上神', '占断向导']));
	});
});

// ---- AI 挂载 round-trip 哨兵:大六壬多流派入参(涉害取舍/年神/旺衰系)从 schema → payload → regenerate 全程透传 ----
// 坑:LIURENG_FIELDS(techniqueMountSettings)已暴露 seHaiMethod/seHaiBoundary/shiRuKe/yearShenShaSort/yinyangSystem/
// tuWangShuai 这 6 项、LiuRengMain.clickSaveCase 也存进 payload 顶层、buildLiuRengSnapshotText 据 _castOpts 据此切「涉害取舍/
// 年神/三传旺衰/旬空旺衰」正文行——但 aiAnalysisContext 的两处 castOpts/liurengOpts 重提取曾漏枚举 → 齿轮调或存档选的设置在
// 挂载快照里被静默丢、回退默认(与独立页不符)。源扫这两处 forwarding 区域,断言 6 键全在(防再次漏接)。
describe('AI 挂载 round-trip 哨兵:大六壬多流派入参透传(涉害/年神/旺衰)', ()=>{
	// 这 6 键全在 LIURENG_FIELDS(techniqueMountSettings)schema + LiuRengMain.clickSaveCase payload;buildLiuRengSnapshotText
	// 据 _castOpts 据此(seHai*/shiRuKe/yearShenShaSort/tuWangShuai 直读;yinyangSystem 经 buildLiuRengCastOverride(chartObj,_castOpts))
	// 切「涉害取舍/年神/三传旺衰/旬空旺衰/昼夜归属」正文。aiAnalysisContext 两处重提取须全转发,否则齿轮/存档选的设置在挂载里被静默丢。
	const LIURENG_CAST_SCHOOL_KEYS = ['seHaiMethod', 'seHaiBoundary', 'shiRuKe', 'yearShenShaSort', 'yinyangSystem', 'tuWangShuai'];
	test('regenerateLiurengSnapshot 的 castOpts 转发全部 6 键(o.<key>)', ()=>{
		const src = readSrc('../aiAnalysisContext.js');
		const region = sliceFrom(src, 'async function regenerateLiurengSnapshot', 1400);
		LIURENG_CAST_SCHOOL_KEYS.forEach((k)=>{
			expect(region.indexOf(`${k}: o.${k}`)).toBeGreaterThanOrEqual(0);
		});
	});
	test('regenerateCaseTechniqueSnapshot 的 liurengOpts 转发全部 6 键(p.<key>)', ()=>{
		const src = readSrc('../aiAnalysisContext.js');
		const region = sliceFrom(src, 'const liurengOpts = {', 900);
		LIURENG_CAST_SCHOOL_KEYS.forEach((k)=>{
			expect(region.indexOf(`${k}: p.${k}`)).toBeGreaterThanOrEqual(0);
		});
	});
});

// ---- 命盘储存 round-trip 哨兵:buildLocalChartRecord 枚举各技法可调项设置(present 才落、缺省 undefined) ----
// 坑:多个 buildChart* 据 record.<key> 重算供快照,且 techniqueMountSettings 暴露为
// 「每技法设置」可调项,但 buildLocalChartRecord 曾漏枚举 → 存盘即丢、重开/挂载回退默认(同印占 4 键/termsVariant 旧坑)。
describe('命盘储存 round-trip 哨兵:技法设置落库(缺省 undefined=零回归)', ()=>{
	// 延迟 require,避免与上方 import 顺序耦合(localcharts 纯 util,无副作用)。
	const { buildLocalChartRecord } = require('../localcharts');
	const ZIWEI_TRADITION_KEYS = ['sihuaSchool', 'daxianSpan', 'tianmaBasis', 'starSet', 'sanPan', 'shangShi', 'leapMonth', 'lateZi', 'yearBoundary', 'huoling', 'kongNaming'];
	const EXTRA_RECORD_KEYS = ['coordSystem', 'windowMonths', 'marketPreset'];
	test('提供值即落库(紫微 11 传本键 + 八字 school + 附加 3 键)', ()=>{
		const rec = buildLocalChartRecord({
			sihuaSchool: 'zhongzhou', daxianSpan: 5, tianmaBasis: 'year', starSet: 'full', sanPan: 'tian',
			shangShi: 'book', leapMonth: 'split', lateZi: 'next', yearBoundary: 'lichun', huoling: 'nanpai', kongNaming: 'book',
			school: 'mangpai',
			coordSystem: 'helio', windowMonths: 9, marketPreset: 'sh000001',
		});
		ZIWEI_TRADITION_KEYS.forEach((k)=>{ expect(rec[k]).not.toBeUndefined(); });
		expect(rec.school).toBe('mangpai');
		expect(rec.coordSystem).toBe('helio');
		expect(rec.windowMonths).toBe(9);
		expect(rec.marketPreset).toBe('sh000001');
	});
	test('缺省 → 全部 undefined(不破坏既有命盘、缺键后端/builder 回退默认=零回归)', ()=>{
		const rec = buildLocalChartRecord({});
		[...ZIWEI_TRADITION_KEYS, 'school', ...EXTRA_RECORD_KEYS].forEach((k)=>{
			expect(rec[k]).toBeUndefined();
		});
	});
});

// ---- 段头卫生:段头字面量必须独占一行(行内不得带正文),否则 parseSectionTitleLine 认不出 → 整段挂到上一段 ----
describe('AI 导出 roundtrip 哨兵:段头卫生(段头字面量独占一行)', ()=>{
	const FILES = [
		'../../components/cntradition/BaZi.js',
		'../../components/guazhan/GuaZhanMain.js',
		'../../components/mundane/MundaneMain.js',
		'../../components/jinkou/JinKouMain.js',
		'../../components/dunjia/DunJiaCalc.js',
		'../../components/sanshi/SanShiUnitedMain.js',
	];
	test('各 builder 文件无「[段头] + 同行正文」反模式(如 [地区盘推运] 盘龄…)', ()=>{
		const offenders = [];
		// 中文段头字面量后紧跟(空格/制表/全角空格)+ 正文 → 段头行内带文字 → 反模式。
		// 仅认真正段头:内容含中文、不含 ${...}(动态拼接段头非反模式)、非英文日志前缀(如 [SanShiUnited])。
		const re = /(['"`])\[([^\]\n'"`]+)\]([ \t　]+\S[^\n'"`]*)/g;
		FILES.forEach((rel)=>{
			const src = readSrc(rel);
			let m;
			while((m = re.exec(src))){
				const content = m[2];
				if(content.indexOf('${') >= 0){ continue; }
				if(!/[一-鿿]/.test(content)){ continue; }
				offenders.push(`${rel}: …${src.slice(Math.max(0, m.index), m.index + 30).replace(/\n/g, ' ')}…`);
			}
		});
		expect(offenders).toEqual([]);
	});
});
