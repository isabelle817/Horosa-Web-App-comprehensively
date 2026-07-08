import { XQTabs as Tabs } from '../xq-ui';
import * as AstroConst from '../../constants/AstroConst';
import * as AstroText from '../../constants/AstroText';
import { moiraMergeStellarRelationRows as mergeStellarRelationRows, moiraBuildLimitTable as buildLimitTable, moiraCurrentLimitIndex as currentLimitIndex, } from './GuoLaoMoiraWheel';
import { PALACE_LORD as GL_PALACE_LORD, SU28 as GL_SU28, SU28_DEGREE_LORD as GL_SU28_LORD, HUAYAO_A as GL_HUAYAO_A, EXALT_DEGREE as GL_EXALT, DIGNITY_TABLE as GL_DIGNITY } from './guolaoData';
import { computeDongwei as glDongwei, computeXiaoxian as glXiaoxian, computeTongxian as glTongxian, computeYuexian as glYuexian } from './guolaoTransit';
import './GuoLaoMoiraPanel.less';

// 三主(命主/身主/度主)+ 命宫配干(五虎遁)+ 生年化曜:纯前端从命/身宫地支 + 命度宿 + 年干派生(古法立成)。
const GL_GAN = '甲乙丙丁戊己庚辛壬癸';
const GL_ZHI = '子丑寅卯辰巳午未申酉戌亥';
function glZiChar(zi){ const s = String(zi || ''); for(let i = 0; i < s.length; i++){ if(GL_ZHI.indexOf(s[i]) >= 0){ return s[i]; } } return ''; }
export function deriveGuolaoMasters(life, self, lifeSuName, yearStem, lifeMasterMode){
	const lz = glZiChar(life && life.zi);
	const sz = glZiChar(self && self.zi);
	const lmMode = (lifeMasterMode === 'du' || lifeMasterMode === 'dudegrade') ? lifeMasterMode : 'gong';
	const out = { mingPalaceZi: lz, bodyPalaceZi: sz, lifeMaster: '', bodyMaster: '', degMaster: '', mingStem: '', huayao: '', lifeMasterMode: lmMode, lifeMasterStar: '' };
	if(lz && GL_PALACE_LORD[lz]){ out.lifeMaster = GL_PALACE_LORD[lz][1]; }
	if(sz && GL_PALACE_LORD[sz]){ out.bodyMaster = GL_PALACE_LORD[sz][1]; }
	if(lifeSuName){ const i = GL_SU28.indexOf(glSuChar(lifeSuName)); if(i >= 0){ out.degMaster = GL_SU28_LORD[i]; } }
	const gi = GL_GAN.indexOf(yearStem || '');
	if(gi >= 0 && lz){ const yin = (gi * 2 + 2) % 10; const bi = GL_ZHI.indexOf(lz); out.mingStem = GL_GAN[(yin + (bi - 2 + 12) % 12) % 10]; }
	out.huayao = GL_HUAYAO_A[yearStem || ''] || '';
	// G22/G23 命主取法:gong=命宫宫主(默认)/du=命度度主/dudegrade=贬宫主专度主(果老)。两主始终都显于三主表。
	out.lifeMasterStar = ((out.lifeMasterMode === 'du' || out.lifeMasterMode === 'dudegrade') && out.degMaster) ? out.degMaster : out.lifeMaster;
	return out;
}
function glSuChar(name){ const s = String(name || ''); for(let i = 0; i < s.length; i++){ if(GL_SU28.indexOf(s[i]) >= 0){ return s[i]; } } return ''; }

const PLANET_ORDER = [
	{ id: AstroConst.SUN, name: '日' },
	{ id: AstroConst.MOON, name: '月' },
	{ id: AstroConst.VENUS, name: '金' },
	{ id: AstroConst.JUPITER, name: '木' },
	{ id: AstroConst.MERCURY, name: '水' },
	{ id: AstroConst.MARS, name: '火' },
	{ id: AstroConst.SATURN, name: '土' },
	{ id: AstroConst.SOUTH_NODE, name: '计' },
	{ id: AstroConst.NORTH_NODE, name: '罗' },
	{ id: AstroConst.PURPLE_CLOUDS, name: '炁' },
	{ id: AstroConst.DARKMOON, name: '孛' },
];

const STEM_BRANCHES = ['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉', '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未', '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳', '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯', '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑', '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥'];

// G6 报时星(时星):chart.timerStar 给七政英文 id(随报时星太阳时档变);映射中文显示。
const PLANET_CN_BY_ID = (function(){ const m = {}; PLANET_ORDER.forEach((d)=>{ m[d.id] = d.name; }); return m; })();
function timerStarName(id){
	const s = id ? (PLANET_CN_BY_ID[id] || msg(id) || `${id}`) : '';
	const full = { 日: '太阳', 月: '太阴', 金: '金星', 木: '木星', 水: '水星', 火: '火星', 土: '土星' }[s] || s;
	return full;
}
const YEAR_STAR_BY_STEM = {
	甲: '火',
	乙: '孛',
	丙: '木',
	丁: '金',
	戊: '土',
	己: '月',
	庚: '水',
	辛: '炁',
	壬: '计',
	癸: '罗',
};
const YEAR_INFO_GROUPS = [
	['天禄', '科名', '天马', '生官'],
	['天暗', '科甲', '地驿'],
	['天福', '文星', '禄元'],
	['天耗', '魁星', '马元', '值难'],
	['天荫', '官星', '天元', '职元'],
	['天贵', '印星', '地元', '局主'],
	['天嗣', '寿元', '人元', '天经'],
	['天刑', '催官', '仁元', '地纬'],
	['天印', '禄神', '血支'],
	['天囚', '喜神', '血忌'],
	['天权', '爵星', '产星', '伤官'],
];
const TEN_GOD_ORG = ['天禄', '天暗', '天福', '天耗', '天荫', '天贵', '天嗣', '天刑', '天印', '天囚', '天权'];
const TEN_GOD_ALT = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'];
const SPEED_LIMITS = {
	Venus: { slow: 0.71, fast: 1.245 },
	Jupiter: { slow: 0.05, fast: 0.23 },
	Mercury: { slow: 0.88, fast: 1.50 },
	Mars: { slow: 0.4, fast: 0.70 },
	Saturn: { slow: 0.02, fast: 0.13 },
};

function safeList(val){
	return val && val.length ? val : [];
}

function safeMap(val){
	return val && typeof val === 'object' ? val : {};
}

function joinYearItems(items){
	return safeList(items).map((item)=>{
		if(item && typeof item === 'object'){
			return [item.name, item.star ? `化${item.star}` : ''].filter(Boolean).join(' ');
		}
		return `${item || ''}`;
	}).filter(Boolean).join('、');
}

function hasUnverifiedMoiraPatternSource(value){
	return value && (
		value.styleSource === 'moira-dsl-not-evaluated'
		|| value.engine === 'moira-rules-on-horosa-ephemeris'
		|| value.version === 'qizheng-moira-rules-v1'
	);
}

function mergeDefined(){
	const res = {};
	for(let i=0; i<arguments.length; i++){
		const obj = safeMap(arguments[i]);
		Object.keys(obj).forEach((key)=>{
			if(obj[key] !== undefined && obj[key] !== null && obj[key] !== ''){
				res[key] = obj[key];
			}
		});
	}
	return res;
}

function levelText(level){
	if(level === 'good'){
		return '吉';
	}
	if(level === 'bad'){
		return '忌';
	}
	if(level === 'notice'){
		return '察';
	}
	return '平';
}

function joinNames(list){
	const arr = safeList(list).map(formatGodName).filter(Boolean);
	return arr.length ? arr.join('、') : '无';
}

function formatGodName(name){
	let val = `${name || ''}`.replace(/\s+/g, '');
	if(!val){
		return '';
	}
	val = val.split(/[\/／]/)[0];
	const aliases = {
		天乙贵人: '天贵',
		玉堂贵人: '玉贵',
	};
	return aliases[val] || val;
}

function msg(id){
	if(id === undefined || id === null){
		return '';
	}
	return AstroText.AstroMsgCN[id] || AstroText.AstroTxtMsg[id] || AstroText.AstroMsg[id] || `${id}`;
}

function norm(deg){
	let val = Number(deg);
	if(!Number.isFinite(val)){
		return 0;
	}
	val %= 360;
	if(val < 0){
		val += 360;
	}
	return val;
}

function objectLon(obj){
	const num = Number(obj && (obj.ra !== undefined ? obj.ra : obj.lon));
	if(Number.isFinite(num)){
		return norm(num);
	}
	const sign = obj && obj.sign ? AstroConst.LIST_SIGNS.indexOf(obj.sign) : -1;
	const signlon = Number(obj && obj.signlon);
	if(sign >= 0 && Number.isFinite(signlon)){
		return norm(sign * 30 + signlon);
	}
	return null;
}

function degreeText(lon){
	const val = norm(lon);
	const deg = Math.floor(val % 30);
	const min = Math.floor(((val % 30) - deg) * 60);
	return `${deg}度${min}分`;
}

function suDegreeText(lon){
	const val = norm(lon);
	const deg = Math.floor(val);
	const min = Math.floor((val - deg) * 60);
	return `${deg}度${min}分`;
}

function signNameFromLon(lon){
	const idx = Math.floor(norm(lon) / 30) % 12;
	return msg(AstroConst.LIST_SIGNS[idx]);
}

function ziFromLon(lon){
	const list = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
	return list[Math.floor(norm(lon) / 30) % 12] || '';
}

function anchorFromObject(chart, id, fallbackId, label){
	const obj = findObject(chart, id) || findObject(chart, fallbackId);
	const lon = objectLon(obj);
	if(!obj || lon === null){
		return {};
	}
	return {
		longitude: lon,
		signName: signNameFromLon(lon),
		degreeText: degreeText(lon),
		zi: ziFromLon(lon),
		area: msg(obj.id) || label,
		moiraHouse: msg(obj.house) || '',
	};
}

function suHostForLon(chart, lon){
	const val = Number(lon);
	const stars = safeList(chart && chart.fixedStarSu28).map((item)=>({
		name: item.name || item.label || '',
		ra: Number(item.ra),
	})).filter((item)=>item.name && Number.isFinite(item.ra)).sort((a, b)=>a.ra - b.ra);
	if(!stars.length || !Number.isFinite(val)){
		return null;
	}
	const degree = norm(val);
	let star = stars[stars.length - 1];
	for(let i = 0; i < stars.length; i++){
		if(stars[i].ra <= degree){
			star = stars[i];
		}else {
			break;
		}
	}
	const offset = norm(degree - star.ra);
	return {
		name: star.name,
		degreeText: suDegreeText(offset),
		value: `${star.name} ${suDegreeText(offset)}`,
	};
}

function compactDegreeText(lon){
	const val = norm(lon);
	const deg = `${Math.floor(val % 30)}`.padStart(2, '0');
	const min = `${Math.floor(((val % 30) - Math.floor(val % 30)) * 60)}`.padStart(2, '0');
	return `${deg}.${min}`;
}

function stemBranchForYear(year){
	const idx = ((Number(year) - 1984) % 60 + 60) % 60;
	return STEM_BRANCHES[idx] || '';
}

function yearFromParams(params){
	const raw = params && params.date ? `${params.date}` : '';
	const match = raw.match(/-?\d{3,4}/);
	return match ? Number(match[0]) : new Date().getFullYear();
}

function dateTextFromParams(params){
	return `${params.date || ''} ${params.time || ''}`.trim();
}

function pickDeep(root, keys){
	const stack = [root];
	const visited = new Set();
	while(stack.length){
		const cur = stack.shift();
		if(!cur || typeof cur !== 'object' || visited.has(cur)){
			continue;
		}
		visited.add(cur);
		for(const key of Object.keys(cur)){
			if(keys.includes(key) && cur[key] !== undefined && cur[key] !== null && cur[key] !== ''){
				return cur[key];
			}
			if(cur[key] && typeof cur[key] === 'object'){
				stack.push(cur[key]);
			}
		}
	}
	return '';
}

function getBazi(root){
	const chart = root && root.chart ? root.chart : {};
	return (chart.nongli && chart.nongli.bazi) || (root && root.nongli && root.nongli.bazi) || {};
}

function textFromBaziPole(value){
	if(value === undefined || value === null || value === ''){
		return '';
	}
	if(typeof value === 'string' || typeof value === 'number'){
		return `${value}`;
	}
	if(typeof value !== 'object'){
		return '';
	}
	const direct = value.text || value.name || value.value || value.ganzi || value.ganZi || value.pillar || value.column;
	if(direct){
		return `${direct}`;
	}
	const stem = safeMap(value.stem);
	const branch = safeMap(value.branch);
	const stemText = stem.cell || stem.text || stem.name || stem.value || value.gan || value.stemText || value.tianGan || '';
	const branchText = branch.cell || branch.text || branch.name || branch.value || value.zhi || value.branchText || value.diZhi || '';
	return `${stemText || ''}${branchText || ''}`;
}

function readBaziPole(bazi, key){
	const data = safeMap(bazi);
	const fourColumns = safeMap(data.fourColumns || data.fourcolumns || data.fourPillars || data.pillars);
	const fourZhuMap = safeMap(fourColumns.fourZhuMap || data.fourZhuMap);
	const zhKeys = {
		year: '年',
		month: '月',
		day: '日',
		time: '时',
	};
	const candidates = [
		data[key],
		fourColumns[key],
		data[`${key}Pole`],
		fourColumns[`${key}Pole`],
		data[`${key}Pillar`],
		fourColumns[`${key}Pillar`],
		data[`${key}Column`],
		fourColumns[`${key}Column`],
		data[`${key}Ganzi`],
		fourColumns[`${key}Ganzi`],
		zhKeys[key] ? fourZhuMap[zhKeys[key]] : '',
	];
	for(const item of candidates){
		const text = textFromBaziPole(item).trim();
		if(text){
			return text;
		}
	}
	return '';
}

function lunarText(root){
	const chart = root && root.chart ? root.chart : {};
	const nongli = chart.nongli || root.nongli || {};
	return nongli.text || nongli.nongli || nongli.lunar || nongli.lunarText || '';
}

function baziStemBranch(root, key, fallbackYear){
	const bazi = getBazi(root);
	const pole = readBaziPole(bazi, key);
	if(pole){
		return pole;
	}
	if(key === 'year'){
		return stemBranchForYear(fallbackYear);
	}
	return '';
}

function baziText(root){
	const bazi = getBazi(root);
	const direct = bazi.text || bazi.name || bazi.fourColumnsText || bazi.fourPillarsText;
	if(direct){
		return direct;
	}
	return ['year', 'month', 'day', 'time'].map((key)=>readBaziPole(bazi, key)).filter(Boolean).join(' ');
}

function findObject(chart, id){
	const objects = chart && chart.objects ? chart.objects : [];
	return objects.find((obj)=>obj.id === id);
}

function planetStatus(obj){
	const speed = Number(obj && obj.lonspeed);
	if(!Number.isFinite(speed)){
		return '顺';
	}
	if(speed < -0.000001){
		return '逆';
	}
	if(Math.abs(speed) < 0.002){
		return '留';
	}
	const limit = SPEED_LIMITS[obj.id];
	if(limit){
		const abs = Math.abs(speed);
		if(abs < limit.slow){
			return '迟';
		}
		if(abs > limit.fast){
			return '速';
		}
	}
	return '顺';
}

// 伏(焦伤):偕日相 combust/cazimi 或与太阳黄经差 <8°(§4.5)。仅日月五星之 月五星判;太阳本身与四余(罗计孛炁=虚星)不判。
const COMBUST_ELIGIBLE = new Set([AstroConst.MOON, AstroConst.MERCURY, AstroConst.VENUS, AstroConst.MARS, AstroConst.JUPITER, AstroConst.SATURN]);
export function isCombustObj(obj, lon, sunLon, id){
	if(!obj || !COMBUST_ELIGIBLE.has(id)){ return false; }
	if(obj.phase === 'combust' || obj.phase === 'cazimi'){ return true; }
	const l = Number(lon), s = Number(sunLon);
	if(!Number.isFinite(l) || !Number.isFinite(s)){ return false; }
	let d = Math.abs(l - s) % 360;
	if(d > 180){ d = 360 - d; }
	return d < 8;
}

function speedText(speed){
	if(!Number.isFinite(speed)){
		return '';
	}
	const sign = speed > 0 ? '+' : '';
	return `${sign}${speed.toFixed(4)}`;
}

// G25 擢升度数:七政在擢升本座时标峰值度,距峰≤1°标「精擢」(EXALT_DEGREE 派生自 PALACE_LORD)。
function exaltText(name, lon){
	const e = GL_EXALT[name];
	if(!e || !Number.isFinite(lon)){ return ''; }
	const v = norm(lon);
	if(Math.floor(v / 30) % 12 !== e.signIndex){ return ''; }
	const dist = Math.abs((v % 30) - e.deg);
	return dist <= 1 ? `精擢${e.deg}°` : `擢${e.deg}°`;
}

// G8 留/迟/疾(伏由 isCombustObj 另判,逆由 planetStatus):|速|<留阈=留;<均速=迟;>均速=疾。仅七政(交点/四余不判)。§13 均行度。
const GL_MOTION_SPEC = {
	[AstroConst.SUN]: { mean: 0.9856, stat: 0 },
	[AstroConst.MOON]: { mean: 13.176, stat: 0 },
	[AstroConst.MERCURY]: { mean: 1.383, stat: 0.20 },
	[AstroConst.VENUS]: { mean: 1.602, stat: 0.20 },
	[AstroConst.MARS]: { mean: 0.524, stat: 0.10 },
	[AstroConst.JUPITER]: { mean: 0.083, stat: 0.05 },
	[AstroConst.SATURN]: { mean: 0.0335, stat: 0.035 },
};
function motionText(id, speed){
	const spec = GL_MOTION_SPEC[id];
	if(!spec || !Number.isFinite(speed)){ return ''; }
	const a = Math.abs(speed);
	if(spec.stat > 0 && a < spec.stat){ return '留'; }
	return a < spec.mean ? '迟' : '疾';
}

// 庙旺(从 DIGNITY_TABLE 派生,单一真值源):七政按地支宫取庙/旺/落/陷/平。本命+流年一致(不依赖后端 rule.dignity)。
// DIGNITY_TABLE 行=日月水金火木土,列=子..亥;地支(子base)=(10-黄道宫序+12)%12(戌=白羊)。
function dignityFromTable(name, lon){
	const row = GL_DIGNITY[name];
	if(!row || !Number.isFinite(lon)){ return ''; }
	const signIdx = Math.floor(norm(lon) / 30) % 12;
	const ziCol = ((10 - signIdx) % 12 + 12) % 12;
	return row[ziCol] || '';
}

// G8 七政动态 留逆伏迟疾(§4.5):逆(速<0)+伏(combust)+留/迟/疾(motion)。仅七政(交点/四余=虚星不判)。
function qizhengStateText(item){
	if(!item || GL_MOTION_SPEC[item.id] === undefined){ return ''; }
	const sp = Number(item.speed);
	const parts = [];
	if(Number.isFinite(sp) && sp < -0.000001){ parts.push('逆'); }
	if(item.combust){ parts.push('伏'); }
	if(item.motion){ parts.push(item.motion); }
	return parts.length ? parts.join('·') : '顺';
}

function buildPlanetRows(chart, rulePlanets){
	const byRule = new Map(safeList(rulePlanets).map((item)=>[item.id, item]));
	const sunLon = objectLon(findObject(chart, AstroConst.SUN));
	return PLANET_ORDER.map((def)=>{
		const obj = findObject(chart, def.id);
		const lon = objectLon(obj);
		if(!obj || lon === null){
			return null;
		}
		const rule = byRule.get(def.id) || {};
		return {
			id: def.id,
			name: def.name,
			signName: rule.signName || msg(obj.sign),
			degreeText: rule.degreeText || degreeText(lon),
			compactDegree: compactDegreeText(lon),
			su28: obj.su28 || rule.su28 || '',
			house: rule.moiraHouse || msg(obj.house) || '',
			dignity: rule.dignity || '',
			dignityTable: dignityFromTable(def.name, lon),     // 庙旺(单一真值源 DIGNITY_TABLE,本命+流年一致)
			exalt: exaltText(def.name, lon),                   // G25 擢升度数(旺度峰值)
			status: planetStatus(obj),
			combust: isCombustObj(obj, lon, sunLon, def.id),   // G8 伏(焦伤)
			motion: motionText(def.id, Number(obj.lonspeed)),  // G8 留/迟/疾
			speed: Number(obj.lonspeed),
		};
	}).filter(Boolean);
}

function yearInfoRows(title, stemBranch){
	const stem = stemBranch ? stemBranch.slice(0, 1) : '';
	return YEAR_INFO_GROUPS.map((items, idx)=>({
		title: idx === 0 ? title : '',
		main: items[0],
		items,
		yearStar: idx === 0 ? (YEAR_STAR_BY_STEM[stem] || '') : '',
	}));
}

function Section({title, children}){
	return (
		<div className="horosa-guolao-moira-section">
			<div className="horosa-guolao-moira-section-title">{title}</div>
			{children}
		</div>
	);
}

function KeyValueGrid({items}){
	return (
		<div className="horosa-guolao-moira-kv-grid">
			{items.filter((item)=>item && item.value !== undefined && item.value !== '').map((item)=>(
				<div className="horosa-guolao-moira-kv" key={item.label}>
					<span>{item.label}</span>
					<strong>{item.value}</strong>
				</div>
			))}
		</div>
	);
}

function PlanetTable({rows, showMotion}){
	return (
		<div className="horosa-guolao-moira-table">
			<div className="horosa-guolao-moira-table-row horosa-guolao-moira-table-head">
				<span>星</span><span>宫/座</span><span>宿度</span><span>势/速</span>
			</div>
			{rows.map((item)=>(
				<div className="horosa-guolao-moira-table-row" key={item.id}>
					<strong>{item.name}</strong>
					<span>{item.house || item.signName} · {item.signName}</span>
					<span>{item.su28 || '-'} {item.compactDegree}</span>
					<span>{[item.dignity, item.exalt, item.status, item.combust ? '伏' : '', showMotion ? item.motion : '', speedText(item.speed)].filter(Boolean).join(' · ')}</span>
				</div>
			))}
		</div>
	);
}

// G8 七政动态表(本命/流年各一份):七政 顺逆留伏迟疾 + 宫/宿度 + 庙旺。
function QizhengStateTable({rows}){
	const list = safeList(rows).filter((r)=>GL_MOTION_SPEC[r.id] !== undefined);
	if(!list.length){
		return <div className="horosa-guolao-moira-empty">当前响应无可判七政动态的星曜数据。</div>;
	}
	return (
		<div className="horosa-guolao-moira-table">
			<div className="horosa-guolao-moira-table-row horosa-guolao-moira-table-head">
				<span>星</span><span>宫/宿度</span><span>庙旺</span><span>留逆伏迟疾</span>
			</div>
			{list.map((item)=>{
				// 去前导宫号(本命) + 取别名前段(流年房号翻译含「子女宫 / 男女宫」双名,只留首名)。
				const houseName = String(item.house || item.signName || '')
					.replace(/^\s*\d+\s*宫\s*[-·、]?\s*/, '')
					.split(/\s*\/\s*/)[0].trim();
				return (
				<div className="horosa-guolao-moira-table-row" key={`qz-state-${item.id}`}>
					<strong>{item.name}</strong>
					<span>{[houseName, item.su28 ? `${item.su28}${item.compactDegree}` : item.compactDegree].filter(Boolean).join(' ')}</span>
					<span>{[item.dignityTable || item.dignity, item.exalt].filter(Boolean).join('·') || '-'}</span>
					<span>{qizhengStateText(item)}</span>
				</div>
				);
			})}
		</div>
	);
}

function YearSignTable({rows}){
	return (
		<div className="horosa-guolao-moira-table">
			<div className="horosa-guolao-moira-table-row horosa-guolao-moira-table-head">
				<span>宫</span><span>化曜</span><span>曜名</span><span>宫性</span>
			</div>
			{safeList(rows).map((item)=>(
				<div className="horosa-guolao-moira-table-row" key={`${item.mode || 'year'}-${item.name}`}>
					<strong>{item.name}</strong>
					<span>{item.star || '-'}</span>
					<span>{item.shortName || '-'}</span>
					<span>{[item.quality, item.zi, item.signName].filter(Boolean).join(' · ')}</span>
				</div>
			))}
		</div>
	);
}

function StellarRelationTable({rows}){
	const list = safeList(rows).filter((item)=>safeList(item.main).length || safeList(item.same).length || safeList(item.transitMain).length || safeList(item.transitSame).length);
	if(!list.length){
		return <div className="horosa-guolao-moira-empty">当前星宿未形成可摘录的落宿/同经信息。</div>;
	}
	return (
		<div className="horosa-guolao-moira-table horosa-guolao-moira-stellar-table">
			<div className="horosa-guolao-moira-table-row horosa-guolao-moira-table-head">
				<span>宿</span><span>本命落入</span><span>本命同经</span><span>流年落入</span>
			</div>
			{list.map((item)=>(
				<div className="horosa-guolao-moira-table-row" key={`stellar-${item.index}-${item.name}`}>
					<strong>{item.label || item.name}</strong>
					<span>{joinNames(item.main)}</span>
					<span>{joinNames(item.same)}</span>
					<span>{[joinNames(item.transitMain), safeList(item.transitSame).length ? `同经：${joinNames(item.transitSame)}` : ''].filter((val)=>val && val !== '无').join('；') || '无'}</span>
				</div>
			))}
		</div>
	);
}

function hasRenderableChart(rootValue){
	return safeList(rootValue && rootValue.chart && rootValue.chart.objects).length > 0;
}

function buildPanelFallbackValue(rootValue){
	return {
		engine: 'horosa-local-moira-panel-fallback',
		engineLabel: 'Moira政余格局',
		summary: '',
		styleWarning: '',
		params: mergeDefined(rootValue && rootValue.params),
		anchors: {},
		houses: [],
		planets: [],
		patterns: [],
		godHits: [],
	};
}

export default function GuoLaoMoiraPanel(props){
	const rootValue = props.rootValue || {};
	const value = props.value || ((!props.loading && hasRenderableChart(rootValue)) ? buildPanelFallbackValue(rootValue) : null);
	const birthChart = rootValue.chart || {};
	const transitRoot = props.transitValue || {};
	const transitChart = transitRoot.chart || {};
	const params = mergeDefined(value && value.params, rootValue.params);
	const transitParams = safeMap(props.transitParams);
	const display = props.display || {};   // 类B 显示偏好:命主取法/留伏迟疾/五虎遁/行运法等

	if(props.loading && !value){
		return (
			<div className="horosa-guolao-moira">
				{[0, 1, 2, 3, 4, 5].map((i)=>(<div className="horosa-guolao-moira-skeleton-row" key={i} />))}
			</div>
		);
	}
	if(!value){
		return (
			<div className="horosa-guolao-moira">
				<div className="horosa-guolao-moira-empty">Moira 规则层等待当前七政盘完成后载入。</div>
			</div>
		);
	}

	const anchors = value.anchors || {};
	const life = anchors.life && Object.keys(anchors.life).length
		? anchors.life
		: anchorFromObject(birthChart, AstroConst.LIFEMASTERDEG74, AstroConst.ASC, '命度点');
	const self = anchors.self && Object.keys(anchors.self).length
		? anchors.self
		: anchorFromObject(birthChart, AstroConst.MOON, AstroConst.ASC, '身度参考');
	const lifeSuHost = suHostForLon(birthChart, life.longitude);
	const selfSuHost = suHostForLon(birthChart, self.longitude);
	const unverifiedPatternSource = hasUnverifiedMoiraPatternSource(value);
	const styleWarning = value.styleWarning || (unverifiedPatternSource ? '当前接口返回的是旧版 Horosa 近似格局，不是 Moira 本体的政余喜格/忌格；已屏蔽为正式格局输出。' : '');
	const patterns = unverifiedPatternSource ? [] : safeList(value.patterns);
	const planets = safeList(value.planets);
		const natalPlanetRows = buildPlanetRows(birthChart, planets);
		const transitPlanetRows = buildPlanetRows(transitChart, []);
		const godHits = safeList(value.godHits);
		const yearStars = safeMap(value.yearStars);
		const birthYearStars = safeMap(yearStars.birth);
		const currentYearStars = safeMap(yearStars.transit);
		const natalYearStars = safeList(value.natalYearStars);
		const transitYearStars = safeList(value.transitYearStars);
		const transitGodHits = safeList(value.transitGodHits);
		const houses = safeList(value.houses);
	const stellarRelationRows = mergeStellarRelationRows(birthChart, transitChart);
	const birthYear = yearFromParams(params);
	const transitYear = yearFromParams(transitParams);
	const birthYearText = baziStemBranch(rootValue, 'year', birthYear);
	const transitYearText = stemBranchForYear(transitYear);
	const age = transitYear - birthYear + 1;
	const apparentSolar = pickDeep(rootValue, ['apparentSolar', 'apparent_solar', 'apparentSolarTime', 'solarTime', 'trueSolarTime']) || (birthChart.nongli && birthChart.nongli.birth);
	const sunrise = pickDeep(rootValue, ['sunrise', 'sunRise', 'sunriseTime', 'sunRiseTime', 'sun_rise', 'guolaoSunRiseTime']);
	const sunset = pickDeep(rootValue, ['sunset', 'sunSet', 'sunsetTime', 'sunSetTime', 'sun_set']);
	const moonrise = pickDeep(rootValue, ['moonrise', 'moonRise', 'moonriseTime', 'moonRiseTime', 'moon_rise']);
	const moonset = pickDeep(rootValue, ['moonset', 'moonSet', 'moonsetTime', 'moonSetTime', 'moon_set']);
	const hasRiseSet = sunrise || sunset || moonrise || moonset;

	return (
		<div className="horosa-guolao-moira">
			<Tabs className="horosa-content-tabs horosa-guolao-tabs horosa-guolao-moira-tabs" tabPosition="top" defaultActiveKey="overview" items={[
				{ key: 'overview', label: '概览', children: (<>
				<Section title="起盘与流年">
				<KeyValueGrid items={[
					{label: '计算法', value: '地心计算法'},
					{label: '本命时间', value: dateTextFromParams(params)},
					{label: '流年时间', value: dateTextFromParams(transitParams)},
					{label: '本命四柱', value: baziText(rootValue) || birthYearText},
					{label: '本命农历', value: lunarText(rootValue)},
					{label: '流年', value: `${transitYearText} ${transitYear}，${Number.isFinite(age) ? `${age}岁` : ''}`},
					{label: '地点', value: [params.lon, params.lat].filter(Boolean).join(' ')},
				]} />
			</Section>

			<Section title="真太阳与出没">
				<KeyValueGrid items={[
					{label: '真太阳时间', value: apparentSolar || dateTextFromParams(params)},
					{label: '日出', value: sunrise},
					{label: '日落', value: sunset},
					{label: '月出', value: moonrise},
					{label: '月落', value: moonset},
					{label: '报时星(时星)', value: timerStarName(birthChart && birthChart.timerStar)},
				]} />
				{hasRiseSet ? null : <div className="horosa-guolao-moira-note">日月出没接口未给出独立字段，当前先以起盘时间和盘面星曜为准。</div>}
			</Section>

			<Section title="命身与限度">
				<div className="horosa-guolao-moira-anchor-grid">
					<div className="horosa-guolao-moira-anchor">
						<span>命主/命度</span>
						<strong>{life.signName || '随盘面'} {life.degreeText || ''}</strong>
						<em>{[life.zi, life.area, life.moiraHouse, anchors.lifeModeName || value.lifeModeName].filter(Boolean).join(' · ')}</em>
					</div>
					<div className="horosa-guolao-moira-anchor">
						<span>身主/身度</span>
						<strong>{self.signName || '随盘面'} {self.degreeText || ''}</strong>
						<em>{[self.zi, self.area, self.moiraHouse].filter(Boolean).join(' · ')}</em>
					</div>
				</div>
				<div className="horosa-guolao-moira-anchor-grid horosa-guolao-moira-su-anchor-grid">
					<div className="horosa-guolao-moira-anchor">
						<span>命度宿主</span>
						<strong>{lifeSuHost ? lifeSuHost.value : '随盘面'}</strong>
					</div>
					<div className="horosa-guolao-moira-anchor">
						<span>身度宿主</span>
						<strong>{selfSuHost ? selfSuHost.value : '随盘面'}</strong>
					</div>
				</div>
				{(()=>{
					// 三主(命主/身主/度主)+ 命宫配干(五虎遁)+ 生年化曜:纯前端派生(古法立成),additive 零回归。
					const ms = deriveGuolaoMasters(life, self, lifeSuHost && lifeSuHost.name, (birthYearText || '').slice(0, 1), display.lifeMasterMode);
					const items = [];
					const useDu = ms.lifeMasterMode === 'du' || ms.lifeMasterMode === 'dudegrade';
					if(ms.lifeMasterStar){ items.push({ label: useDu ? '命主(度主)' : '命主(宫主)', value: ms.lifeMasterStar }); }
					if(ms.lifeMaster){ items.push({ label: '命宫宫主', value: ms.lifeMaster }); }
					if(ms.degMaster){ items.push({ label: '命度度主(宿主曜)', value: ms.degMaster }); }
					if(ms.bodyMaster){ items.push({ label: '身主(身宫宫主)', value: ms.bodyMaster }); }
					if(ms.mingStem && ms.mingPalaceZi){ items.push({ label: '命宫配干(五虎遁)', value: `${ms.mingStem}${ms.mingPalaceZi}` }); }
					if(ms.huayao){ items.push({ label: '生年化曜(A诀)', value: ms.huayao }); }
					return items.length ? (<><div className="horosa-guolao-moira-subtitle">三主 · 命宫配干 · 化曜（{useDu ? '专度主' : '主宫主'}）</div><KeyValueGrid items={items} /></>) : null;
				})()}
				{(()=>{
					// G31/G32 行运法(类B 选择):''古度限度法(默认)/dongwei洞微大限/minor小限/month月限/tong童限。各派算法 §10。
					const limitType = display.minorLimitType || '';
					const sunLon = objectLon(findObject(birthChart, AstroConst.SUN));
					const mz = life && life.zi;
					if(limitType === '' && Number.isFinite(Number(life.longitude)) && Number.isFinite(birthYear)){
						const limitRows = buildLimitTable(Number(life.longitude), birthYear);
						const curIdx = Number.isFinite(age) ? currentLimitIndex(limitRows, age) : -1;
						return (
							<>
								<div className="horosa-guolao-moira-subtitle">大限（古度限度法，自命度起）</div>
								<div className="horosa-guolao-moira-house-list horosa-guolao-moira-limit-list">
									{limitRows.map((row, idx)=>(
										<div key={row.index} className={idx === curIdx ? 'horosa-guolao-moira-limit-current' : undefined}>
											<strong>{row.index}. {row.palace}</strong>
											<span>{row.fromAge}–{row.toAge} 岁</span>
											<em>{row.fromYear}–{row.toYear}{idx === curIdx ? ' · 当前大限' : ''}</em>
										</div>
									))}
								</div>
							</>
						);
					}
					if(!Number.isFinite(Number(sunLon)) || !mz){ return null; }
					if(limitType === 'dongwei'){
						const dw = glDongwei(Number(sunLon) % 30);
						// WP-E 飞星吊度:当前洞微限内、按岁取本年吊度(逐宫每年 30/宫年数,入度链式)。
						let curDiaodu = null;
						if(Number.isFinite(age)){
							const curRow = dw.rows.find((rr)=> age >= rr.fromAge && age < rr.toAge);
							if(curRow && curRow.diaodu && curRow.diaodu.length){
								curDiaodu = curRow.diaodu.reduce((best, d)=> (d.age <= age + 1e-6 && (!best || d.age > best.age)) ? d : best, null) || curRow.diaodu[0];
							}
						}
						return (
							<>
								<div className="horosa-guolao-moira-subtitle">洞微大限（命宫顺行 · 各宫年数 · 飞星吊度 · 起限 {dw.startAge} 岁）</div>
								{curDiaodu ? (
									<div className="horosa-guolao-moira-meta-note">本年飞星吊度 ≈ {curDiaodu.deg}°（{age} 岁）</div>
								) : null}
								<div className="horosa-guolao-moira-house-list horosa-guolao-moira-limit-list">
									{dw.rows.map((row)=>{
										const cur = Number.isFinite(age) && age >= row.fromAge && age < row.toAge;
										return (
											<div key={row.index} className={cur ? 'horosa-guolao-moira-limit-current' : undefined}>
												<strong>{row.index}. {row.palace}</strong>
												<span>{row.fromAge}–{row.toAge} 岁</span>
												<em>{row.years} 年 · 入{row.entryDeg}°·每年{row.perYearDeg}°{cur ? ' · 当前洞微限' : ''}</em>
											</div>
										);
									})}
								</div>
							</>
						);
					}
					if(limitType === 'tong'){
						const tx = glTongxian(Number(sunLon), display.tongxianBase || 'tong10');
						const _baseName = { tong10: '通行十年', gu9: '古九岁', xu11: '虚十一(早不过11)' }[tx.baseVariant] || '通行十年';
						return (<><div className="horosa-guolao-moira-subtitle">童限（命财疾妻福顺排 · 基数{_baseName}）</div><KeyValueGrid items={[
							{ label: '童限顺排', value: tx.palaces.join('→') },
							{ label: '出童限(约)', value: `${tx.exitAge} 岁` },
						]} /></>);
					}
					if(limitType === 'month'){
						// 生月按月柱地支(节气月,寅=正月);月柱缺则回退阳历月。七政四余月限用节气月口径。
						const monthZhi = glZiChar((baziStemBranch(rootValue, 'month') || '').slice(-1));
						let bMonth = 1;
						const mzi = GL_ZHI.indexOf(monthZhi);
						if(mzi >= 0){ bMonth = ((mzi - 2) % 12 + 12) % 12 + 1; }
						else { const bp = String((params && (params.birth || params.date)) || '').replace(/[/T-]/g, ' ').trim().split(/\s+/); bMonth = bp.length >= 2 ? (parseInt(bp[1], 10) || 1) : 1; }
						const yx = Number.isFinite(age) ? glYuexian(mz, age, bMonth) : null;
						return (<><div className="horosa-guolao-moira-subtitle">月限（小限宫起生月逆寻 · 生月{bMonth}）</div><KeyValueGrid items={[
							...(yx ? [{ label: `月限(${age}岁)`, value: `${yx.palaceName}（${yx.palaceZi}）` }] : [{ label: '月限', value: '需年龄/生月' }]),
						]} /></>);
					}
					// minor 小限(默认非空时)
					const xx = Number.isFinite(age) ? glXiaoxian(mz, age) : null;
					return (<><div className="horosa-guolao-moira-subtitle">小限（生年支加命宫逆数）</div><KeyValueGrid items={[
						...(xx ? [{ label: `小限(${age}岁)`, value: `${xx.palaceName}（${xx.palaceZi}）` }] : [{ label: '小限', value: '需年龄' }]),
					]} /></>);
				})()}
			</Section>

				</>) },
				{ key: 'stars', label: '星曜', children: (<>
				<Section title="本命星曜">
					{natalYearStars.length ? <YearSignTable rows={natalYearStars} /> : <PlanetTable rows={natalPlanetRows} showMotion={display.motionState === true} />}
				</Section>

				<Section title="本命七政动态（顺逆 · 留伏迟疾）">
					<QizhengStateTable rows={natalPlanetRows} />
				</Section>

				<Section title="流年星曜">
					{transitYearStars.length ? <YearSignTable rows={transitYearStars} /> : <PlanetTable rows={transitPlanetRows} showMotion={display.motionState === true} />}
				</Section>

				<Section title="流年七政动态（顺逆 · 留伏迟疾）">
					<QizhengStateTable rows={transitPlanetRows} />
				</Section>

				<Section title="星宿落入与同经">
					<StellarRelationTable rows={stellarRelationRows} />
				</Section>

			</>) },
				{ key: 'palace', label: '宫限', children: (<>
				<Section title="十二宫位">
				<div className="horosa-guolao-moira-house-list">
					{houses.map((item)=>(
						<div key={`${item.index}-${item.name}`}>
							<strong>{item.name}</strong>
							<span>{item.zi} · {item.area} · {item.signName}</span>
							<em>{item.moiraStarHouse}</em>
						</div>
					))}
				</div>
			</Section>

				<Section title="年曜与十神">
					<KeyValueGrid items={[
						{label: '本命年柱', value: birthYearStars.yearPole || birthYearText},
						{label: '流年年柱', value: currentYearStars.yearPole || transitYearText},
						{label: '本命首曜', value: birthYearStars.yearStar},
						{label: '流年首曜', value: currentYearStars.yearStar || `${transitYearText.slice(0, 1)} → ${YEAR_STAR_BY_STEM[transitYearText.slice(0, 1)] || '-'}`},
						{label: '原十神序', value: safeList(yearStars.tenGodListOrg).length ? yearStars.tenGodListOrg.join('、') : TEN_GOD_ORG.join('、')},
						{label: '替代十神序', value: safeList(yearStars.tenGodListAlt).length ? yearStars.tenGodListAlt.join('、') : TEN_GOD_ALT.join('、')},
					]} />
					<div className="horosa-guolao-moira-year-groups">
						{safeList(currentYearStars.groups).length ? currentYearStars.groups.map((row, idx)=>(
							<div key={`${row.main}-${idx}`}>
								<strong>{row.main}</strong>
								<span>{joinYearItems(row.items)}</span>
								{row.mainStar ? <em>化曜：{row.mainStar}</em> : null}
							</div>
						)) : yearInfoRows('年曜', transitYearText).map((row, idx)=>(
							<div key={`${row.main}-${idx}`}>
								<strong>{row.main}</strong>
								<span>{row.items.slice(1).join('、') || '主项'}</span>
								{row.yearStar ? <em>化禄：{row.yearStar}</em> : null}
							</div>
					))}
				</div>
			</Section>

			</>) },
				{ key: 'gods', label: '神煞', children: (<>
				<Section title="神煞全表">
				<div className="horosa-guolao-moira-gods">
					{godHits.map((item)=>(
							<div className="horosa-guolao-moira-god" key={`${item.house}-${item.zi}`}>
								<strong>{item.house}</strong>
								<span>{item.zi} · {item.signName}</span>
								{safeList(item.gods).length ? <div>曜：{joinNames(item.gods)}</div> : (
									<>
										<div>吉：{joinNames(item.goodGods)}</div>
										<div>平：{joinNames(item.neutralGods)}</div>
										<div>忌：{joinNames(item.badGods)}</div>
										<div>太岁：{joinNames(item.taisuiGods)}</div>
									</>
								)}
							</div>
						))}
					{godHits.length === 0 ? <div className="horosa-guolao-moira-empty">当前盘未返回可摘录的七政神煞。</div> : null}
					</div>
				</Section>

				{transitGodHits.length ? (
					<Section title="流年神煞">
						<div className="horosa-guolao-moira-gods">
							{transitGodHits.map((item)=>(
								<div className="horosa-guolao-moira-god" key={`now-${item.house}-${item.zi}`}>
									<strong>{item.house}</strong>
									<span>{item.zi} · {item.signName}</span>
									<div>曜：{joinNames(item.gods || item.taisuiGods)}</div>
								</div>
							))}
						</div>
					</Section>
				) : null}

				</>) },
				{ key: 'pattern', label: '格局', children: (
				<Section title="政余格局">
				{styleWarning ? <div className="horosa-guolao-moira-warning">{styleWarning}</div> : null}
				{patterns.length ? (
					<div className="horosa-guolao-moira-patterns">
						{patterns.map((item, idx)=>(
							<div className={`horosa-guolao-moira-pattern horosa-guolao-moira-pattern-${item.level || 'neutral'}`} key={`${item.name || 'pattern'}-${idx}`}>
								<div className="horosa-guolao-moira-pattern-head">
									<span>{levelText(item.level)}</span>
									<strong>{item.name}</strong>
								</div>
								<div className="horosa-guolao-moira-pattern-detail">{item.detail}</div>
							</div>
						))}
					</div>
				) : <div className="horosa-guolao-moira-empty">当前盘未命中已接入的 Moira 政余喜格/忌格。</div>}
			</Section>
				) },
			]} />
		</div>
	);
}
