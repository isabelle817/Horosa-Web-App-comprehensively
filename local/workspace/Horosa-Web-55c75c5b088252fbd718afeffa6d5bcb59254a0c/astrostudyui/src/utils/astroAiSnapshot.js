import { scheduleStorageWrite } from './deferredStorage';
import { lazySnapshotBuildEnabled } from './perfFlags';
import * as AstroConst from '../constants/AstroConst';
import * as AstroText from '../constants/AstroText';
import { appendPlanetHouseInfoById, } from './planetHouseInfo';
import * as Constants from './constants';
// 寿命格局段:复用本命引擎(纯函数,无 React;已验证不回 import 本文件,无环)。
import buildFacts from '../divination/engine/chartFacts';
import { runLifespan } from '../divination/lifespan/lifespanEngine';
import { bodyPartsOf, degreePosition } from '../divination/data/bodyParts';
import { buildPatternOverview } from './astroPatternOverview';
import { SIGNS } from '../divination/data/signs';

export const ASTRO_AI_SNAPSHOT_KEY = 'horosa.ai.snapshot.astro.v1';
let ASTRO_AI_SNAPSHOT_MEMORY = null;
const ASTRO_AI_SNAPSHOT_GLOBAL_KEY = '__horosa_astro_ai_snapshot';
const DEFAULT_PLANET_INFO_EXPORT = {
	showHouse: 1,
	showRuler: 1,
};
const PLANET_HOUSE_INFO_NOTE = '说明：行星名后括号中的 nR 为宫主宫位标记；逆行会明确写为“逆行”。';

function isEncodedToken(text){
	return /^[A-Za-z0-9${}]$/.test((text || '').trim());
}

function msg(id){
	if(id === undefined || id === null){
		return '';
	}
	if(AstroText.AstroTxtMsg[id]){
		return AstroText.AstroTxtMsg[id];
	}
	if(AstroText.AstroMsg[id]){
		const val = AstroText.AstroMsg[id];
		if(isEncodedToken(val)){
			return `${id}`;
		}
		return `${val}`;
	}
	return `${id}`;
}

function normalizeAiPlanetLabel(text){
	return `${text || ''}`.replace(/(\d+)R\s*\(宫主\)/g, '$1R');
}

function normalizeAiExportText(text){
	return `${text || ''}`.replace(/(\d+)R\s*\(宫主\)/g, '$1R');
}

function saveAstroSnapshotToGlobal(payload){
	try{
		if(typeof window !== 'undefined'){
			window[ASTRO_AI_SNAPSHOT_GLOBAL_KEY] = payload || null;
		}
	}catch(e){
		// ignore
	}
}

function loadAstroSnapshotFromGlobal(){
	try{
		if(typeof window === 'undefined'){
			return null;
		}
		const obj = window[ASTRO_AI_SNAPSHOT_GLOBAL_KEY];
		if(obj && obj.content){
			return {
				...obj,
				content: normalizeAiExportText(obj.content),
			};
		}
		return null;
	}catch(e){
		return null;
	}
}

function msgWithHouse(id, chartObj, enabled = DEFAULT_PLANET_INFO_EXPORT){
	const text = appendPlanetHouseInfoById(msg(id), chartObj, id, enabled);
	return normalizeAiPlanetLabel(text);
}

function round3(val){
	if(val === undefined || val === null || Number.isNaN(Number(val))){
		return '';
	}
	return `${Math.round(Number(val) * 1000) / 1000}`;
}

function splitDegree(degree){
	let deg = Number(degree);
	if(Number.isNaN(deg)){
		return [0, 0];
	}
	const negative = deg < 0;
	deg = Math.abs(deg);
	let d = Math.floor(deg);
	let minute = Math.floor((deg - d) * 60);
	if(minute >= 60){
		d += 1;
		minute = 0;
	}
	if(negative){
		d = -d;
	}
	return [d, minute];
}

function whichTerm(sign, deg){
	const terms = AstroConst.EGYPTIAN_TERMS[sign];
	if(!terms || terms.length === 0){
		return '';
	}
	for(let i=0; i<terms.length; i++){
		const item = terms[i];
		if(item[1] <= deg && item[2] > deg){
			return msg(item[0]);
		}
	}
	return '';
}

function formatSignDegree(sign, signlon){
	if(signlon === undefined || signlon === null || sign === undefined || sign === null){
		return '';
	}
	const sd = splitDegree(signlon);
	const deg = Math.abs(sd[0]);
	const minute = Math.abs(sd[1]);
	const term = whichTerm(sign, deg);
	return `${deg}˚${msg(sign)}${minute}分；位于 ${term} 界`;
}

function formatRetrogradeText(obj){
	if(!obj || obj.lonspeed === undefined || obj.lonspeed === null){
		return '';
	}
	const speed = Number(obj.lonspeed);
	if(Number.isNaN(speed) || speed >= 0){
		return '';
	}
	return '；逆行';
}

function lonToSignDegree(lon){
	if(lon === undefined || lon === null || Number.isNaN(Number(lon))){
		return '';
	}
	let value = Number(lon) % 360;
	if(value < 0){
		value += 360;
	}
	const signIdx = Math.floor(value / 30) % 12;
	const sign = AstroConst.LIST_SIGNS[signIdx];
	const signlon = value - signIdx * 30;
	return formatSignDegree(sign, signlon);
}

function fieldValue(fields, key){
	if(!fields){
		return null;
	}
	const f = fields[key];
	if(f && f.value !== undefined){
		return f.value;
	}
	return f !== undefined ? f : null;
}

function resolveOnlyRulerExaltReception(options = {}){
	if(options.onlyRulerExaltReception !== undefined && options.onlyRulerExaltReception !== null){
		return !!options.onlyRulerExaltReception;
	}
	try{
		if(typeof window === 'undefined' || !window.localStorage){
			return false;
		}
		const raw = window.localStorage.getItem(Constants.GlobalSetupKey);
		if(!raw){
			return false;
		}
		const setup = JSON.parse(raw);
		return !!(setup && (setup.showOnlyRulExaltReception === 1 || setup.showOnlyRulExaltReception === true));
	}catch(e){
		return false;
	}
}

function hasRulerOrExalt(ary){
	if(!ary || !Array.isArray(ary) || ary.length === 0){
		return false;
	}
	for(let i=0; i<ary.length; i++){
		if(ary[i] === 'ruler' || ary[i] === 'exalt'){
			return true;
		}
	}
	return false;
}

function keepReceptionLine(item, abnormal = false, onlyRulerExaltReception = false){
	if(!onlyRulerExaltReception){
		return true;
	}
	if(!item){
		return false;
	}
	const supplierOk = hasRulerOrExalt(item.supplierRulerShip);
	if(!abnormal){
		return supplierOk;
	}
	const beneficiaryOk = hasRulerOrExalt(item.beneficiaryDignity);
	return supplierOk || beneficiaryOk;
}

function keepMutualLine(item, onlyRulerExaltReception = false){
	if(!onlyRulerExaltReception){
		return true;
	}
	if(!item || !item.planetA || !item.planetB){
		return false;
	}
	return hasRulerOrExalt(item.planetA.rulerShip) && hasRulerOrExalt(item.planetB.rulerShip);
}

function asNameList(ids){
	if(!ids || ids.length === 0){
		return '';
	}
	return ids.map((id)=>msg(id)).filter(Boolean).join(' , ');
}

function getObjectsMap(chartObj){
	const map = {};
	const chart = chartObj && chartObj.chart ? chartObj.chart : null;
	if(chart && chart.objects){
		for(let i=0; i<chart.objects.length; i++){
			const obj = chart.objects[i];
			map[obj.id] = obj;
		}
	}
	if(chartObj && chartObj.lots){
		for(let i=0; i<chartObj.lots.length; i++){
			const obj = chartObj.lots[i];
			map[obj.id] = obj;
		}
	}
	return map;
}

function getStarsMap(chartObj){
	const map = {};
	const chart = chartObj && chartObj.chart ? chartObj.chart : null;
	if(!chart || !chart.stars){
		return map;
	}
	for(let i=0; i<chart.stars.length; i++){
		const star = chart.stars[i];
		map[star.id] = star.stars || [];
	}
	return map;
}

function dignityText(ary){
	if(!ary || ary.length === 0){
		return '游走';
	}
	return ary.map((item)=>msg(item)).join('，');
}

function formatSpeed(obj){
	if(!obj){
		return '';
	}
	let speed = `${round3(obj.lonspeed)}度`;
	if(obj.lonspeed < 0){
		speed += '；逆行';
	}
	const deltaSpeed = Math.abs((obj.lonspeed || 0) - (obj.meanSpeed || 0));
	if(deltaSpeed > 1){
		speed += obj.lonspeed > obj.meanSpeed ? '; 快速' : '; 慢速';
	}else if(obj.lonspeed < 0.003 && obj.lonspeed > 0){
		speed += '; 停滞';
	}else{
		speed += '; 平均';
	}
	return speed;
}

function ruleshipText(arr){
	if(!arr || arr.length === 0){
		return '';
	}
	return arr.map((item)=>msg(item)).join('+');
}

function aspectText(asp){
	if(asp === undefined || asp === null){
		return '';
	}
	const n = Number(asp);
	if(Number.isNaN(n)){
		return `${asp}`;
	}
	return `${n}˚`;
}

function formatStarsLines(stars){
	if(!stars || stars.length === 0){
		return [];
	}
	const lines = [];
	for(let i=0; i<stars.length; i++){
		const item = stars[i];
		const sname = item.length > 4 ? item[4] : msg(item[0]);
		const deg = splitDegree(item[2]);
		lines.push(`${sname}：${Math.abs(deg[0])}˚${msg(item[1])}${Math.abs(deg[1])}分`);
	}
	return lines;
}

function buildBaseInfoLines(chartObj, fields){
	const lines = [];
	const chart = chartObj && chartObj.chart ? chartObj.chart : {};
	const params = chartObj && chartObj.params ? chartObj.params : {};
	const lon = fieldValue(fields, 'lon') || params.lon || '';
	const lat = fieldValue(fields, 'lat') || params.lat || '';
	const zone = params.zone !== undefined && params.zone !== null ? params.zone : fieldValue(fields, 'zone');

	if(lon || lat){
		lines.push(`经度：${lon}， 纬度：${lat}`);
	}
	if(params.birth){
		lines.push(params.birth + (chart.dayofweek ? ` ${chart.dayofweek}` : ''));
	}
	if(zone !== undefined && zone !== null){
		lines.push(`时区：${zone} ，${chart.isDiurnal ? '日生盘' : '夜生盘'}`);
	}
	if(chart.nongli && chart.nongli.birth){
		lines.push(`真太阳时：${chart.nongli.birth}`);
	}
	// 用户拍板·v2.2.1: AI 必须明确知道排盘按哪种规则计算,否则可能用错语义解读四柱。
	const after23 = fieldValue(fields, 'after23NewDay');
	const lateZi = fieldValue(fields, 'lateZiHourUseNextDay');
	if(after23 !== undefined || lateZi !== undefined){
		const a23 = after23 === 0 || after23 === '0' || after23 === false ? 0 : 1;
		const lzh = lateZi === 0 || lateZi === '0' || lateZi === false ? 0 : 1;
		const dayLabel = a23 === 1 ? '23点算第二天(日柱进位次日)' : '24点算第二天(日柱守今、24点才换日柱)';
		const hourLabel = lzh === 1 ? '晚子时按次日日柱计算(时干用次日日干起子时)' : '晚子时按当日柱计算(时干用今日日干起子时)';
		lines.push(`排盘规则：日柱开关【${dayLabel}】+ 时柱开关【${hourLabel}】。本盘四柱按此规则计算。`);
	}

	const zodiacal = chart.zodiacal || AstroConst.ZODIACAL[fieldValue(fields, 'zodiacal')];
	const hsys = chart.hsys || AstroConst.HouseSys[fieldValue(fields, 'hsys')];
	if(zodiacal || hsys){
		const ayanKey = fieldValue(fields, 'siderealAyanamsa', '') || (chart && chart.siderealAyanamsa) || '';
		const zodiacalTxt = zodiacal ? AstroConst.zodiacalDisplayText(zodiacal, ayanKey) : msg(zodiacal);
		lines.push(`${zodiacalTxt}，${msg(hsys)}`);
	}
	lines.push(PLANET_HOUSE_INFO_NOTE);

	if(chart.dayerStar){
		lines.push(`日主星：${msg(chart.dayerStar)}`);
	}
	if(chart.timerStar){
		lines.push(`时主星：${msg(chart.timerStar)}`);
	}
	// FIX-16 命主星 1R(派生 ASC→落座→该星主→该星落宫;与 AstroInfo.js:1039 SIGN_RULER 同源)。
	// 排盘信息层显式标识,AI 不必再去主宰星链推导。
	const objectMapForRuler = getObjectsMap(chartObj);
	const asc = objectMapForRuler.Asc;
	if(asc && asc.sign){
		const SIGN_RULER = { Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon', Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars', Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter' };
		const rulerId = SIGN_RULER[asc.sign];
		const rulerObj = rulerId ? objectMapForRuler[rulerId] : null;
		if(rulerObj){
			const housePart = rulerObj.house ? `落${msg(rulerObj.house)}` : '';
			const signPart = rulerObj.sign ? `（${msg(rulerObj.sign)}）` : '';
			lines.push(`命主星：${msg(rulerId)} ${housePart}${signPart}`);
		}
	}
	return lines;
}

export function buildHouseCuspLines(chartObj){
	const lines = [];
	const chart = chartObj && chartObj.chart ? chartObj.chart : {};
	const houses = chart.houses || [];
	for(let i=0; i<houses.length; i++){
		const h = houses[i];
		if(!h || h.lon === undefined || h.lon === null){
			continue;
		}
		lines.push(`${msg(h.id)} 宫头：${lonToSignDegree(h.lon)}`);
	}
	return lines;
}

export function buildStarAndLotPositionLines(chartObj){
	const lines = [];
	const objectMap = getObjectsMap(chartObj);
	const pushOne = (id)=>{
		const obj = objectMap[id];
		if(!obj || obj.sign === undefined || obj.signlon === undefined){
			return;
		}
		lines.push(`${msgWithHouse(id, chartObj)}：${formatSignDegree(obj.sign, obj.signlon)}${formatRetrogradeText(obj)}`);
	};

	AstroConst.LIST_OBJECTS.forEach((id)=>pushOne(id));
	AstroConst.LOTS.forEach((id)=>pushOne(id));

	return lines;
}

export function buildInfoSection(chartObj, fields, options = {}){
	const lines = [];
	const chart = chartObj && chartObj.chart ? chartObj.chart : {};
	const chartData = chartObj || {};
	const planetMap = getObjectsMap(chartObj);
	const onlyRulerExaltReception = resolveOnlyRulerExaltReception(options);

	lines.push(...buildBaseInfoLines(chartObj, fields));

	const anti = chart.antiscias || {};
	const antiLines = [];
	(anti.antiscia || []).forEach((item)=>{
		antiLines.push(`${msg(item[0])} 与 ${msg(item[1])} 成映点 误差${round3(item[2])}`);
	});
	(anti.cantiscia || []).forEach((item)=>{
		antiLines.push(`${msg(item[0])} 与 ${msg(item[1])} 成反映点 误差${round3(item[2])}`);
	});
	if(antiLines.length){
		lines.push('映点/反映点');
		lines.push(...antiLines);
	}

	const receptions = chartData.receptions || {};
	const normalReceptions = (receptions.normal || []).filter((item)=>keepReceptionLine(item, false, onlyRulerExaltReception));
	const abnormalReceptions = (receptions.abnormal || []).filter((item)=>keepReceptionLine(item, true, onlyRulerExaltReception));
	if(normalReceptions.length || abnormalReceptions.length){
		// FIX-15 「拒绝」标识(supplier 在 beneficiary 所在座为 exile/fall = 该 supplier 实际是 beneficiary 的「凶接纳」=拒绝);
		// 与 AstroInfo.genReceptionsDom 一致;abnormal 接纳尤须标识(承接星自身落陷)。
		const isReject = (item)=>{
			const dig = item && item.supplierRulerShip;
			if(!dig) return false;
			const arr = Array.isArray(dig) ? dig : [dig];
			return arr.some((d)=> d === 'exile' || d === 'fall');   // 全栈代码库只产 exile/fall(detriment 不存在,删死分支)
		};
		lines.push('接纳');
		lines.push('正接纳：');
		normalReceptions.forEach((item)=>{
			const rejMark = isReject(item) ? '（拒绝）' : '';
			lines.push(`${msgWithHouse(item.beneficiary, chartObj)} 被 ${msgWithHouse(item.supplier, chartObj)} 接纳 (${ruleshipText(item.supplierRulerShip)})${rejMark}`);
		});
		lines.push('邪接纳：');
		abnormalReceptions.forEach((item)=>{
			const rejMark = isReject(item) ? '（拒绝）' : '';
			lines.push(`${msgWithHouse(item.beneficiary, chartObj)} (${ruleshipText(item.beneficiaryDignity)}) 被 ${msgWithHouse(item.supplier, chartObj)} 接纳 (${ruleshipText(item.supplierRulerShip)})${rejMark}`);
		});
	}

	const mutuals = chartData.mutuals || {};
	const normalMutuals = (mutuals.normal || []).filter((item)=>keepMutualLine(item, onlyRulerExaltReception));
	const abnormalMutuals = (mutuals.abnormal || []).filter((item)=>keepMutualLine(item, onlyRulerExaltReception));
	if(normalMutuals.length || abnormalMutuals.length){
		lines.push('互容');
		lines.push('正互容：');
		normalMutuals.forEach((item)=>{
			lines.push(`${msgWithHouse(item.planetA.id, chartObj)} (${ruleshipText(item.planetA.rulerShip)}) 与 ${msgWithHouse(item.planetB.id, chartObj)} (${ruleshipText(item.planetB.rulerShip)}) 互容`);
		});
		lines.push('邪互容：');
		abnormalMutuals.forEach((item)=>{
			lines.push(`${msgWithHouse(item.planetA.id, chartObj)} (${ruleshipText(item.planetA.rulerShip)}) 与 ${msgWithHouse(item.planetB.id, chartObj)} (${ruleshipText(item.planetB.rulerShip)}) 互容`);
		});
	}

	const surround = chartData.surround || {};
	const attacks = surround.attacks || {};
	const attackLines = [];
	Object.keys(attacks).forEach((key)=>{
		const planet = attacks[key];
		const candidates = [];
		if(planet.MinDelta && planet.MinDelta.length === 2){
			candidates.push(planet.MinDelta);
		}
		if(planet.MarsSaturn && planet.MarsSaturn.length === 2){
			candidates.push(planet.MarsSaturn);
		}
		if(planet.SunMoon && planet.SunMoon.length === 2){
			candidates.push(planet.SunMoon);
		}
		if(planet.VenusJupiter && planet.VenusJupiter.length === 2){
			candidates.push(planet.VenusJupiter);
		}
		candidates.forEach((pair)=>{
			attackLines.push(
				`${msgWithHouse(key, chartObj)} 被 ${msgWithHouse(pair[0].id, chartObj)} (通过${aspectText(pair[0].aspect)}相位) 与 ${msgWithHouse(pair[1].id, chartObj)} (通过${aspectText(pair[1].aspect)}相位) 围攻`
			);
		});
	});
	if(attackLines.length){
		lines.push('光线围攻');
		lines.push(...attackLines);
	}

	const houses = surround.houses || {};
	const houseLines = [];
	Object.keys(houses).forEach((key)=>{
		const pair = houses[key];
		if(pair && pair.length === 2){
			houseLines.push(`${msgWithHouse(pair[0].id, chartObj)} 与 ${msgWithHouse(pair[1].id, chartObj)} 夹 ${msg(key)}`);
		}
	});
	if(houseLines.length){
		lines.push('夹宫');
		lines.push(...houseLines);
	}

	const planets = surround.planets || {};
	const planetLines = [];
	Object.keys(planets).forEach((key)=>{
		const pair = planets[key];
		if(key === 'BySunMoon' && pair && pair.id){
			planetLines.push(`${msgWithHouse(AstroConst.MOON, chartObj)} 与 ${msgWithHouse(AstroConst.SUN, chartObj)} 夹 ${msgWithHouse(pair.id, chartObj)}`);
			return;
		}
		if(pair && pair.SunMoon && pair.SunMoon.length === 2){
			planetLines.push(`${msgWithHouse(pair.SunMoon[0].id, chartObj)} 与 ${msgWithHouse(pair.SunMoon[1].id, chartObj)} 夹 ${msgWithHouse(key, chartObj)}`);
			return;
		}
		if(pair && pair.length === 2){
			planetLines.push(`${msgWithHouse(pair[0].id, chartObj)} 与 ${msgWithHouse(pair[1].id, chartObj)} 夹 ${msgWithHouse(key, chartObj)}`);
		}
	});
	if(planetLines.length){
		lines.push('夹星');
		lines.push(...planetLines);
	}

	const declParallel = chartData.declParallel || {};
	const parallelLines = [];
	(declParallel.parallel || []).forEach((ids, idx)=>{
		parallelLines.push(`平行星体${idx + 1}：${asNameList(ids)}`);
	});
	Object.keys(declParallel.contraParallel || {}).forEach((id)=>{
		const ids = declParallel.contraParallel[id] || [];
		if(ids.length){
			parallelLines.push(`相对 ${msg(id)} 星体：${asNameList(ids)}`);
		}
	});
	if(parallelLines.length){
		lines.push('纬照');
		lines.push(...parallelLines);
	}

	Object.keys(planetMap).forEach((id)=>{
		planetMap[id].__name = msg(id);
	});
	return lines;
}

function buildAspectSection(chartObj){
	const lines = [];
	const aspects = chartObj && chartObj.aspects ? chartObj.aspects : {};
	const normal = aspects.normalAsp || {};
	const immediate = aspects.immediateAsp || {};
	const signAsp = aspects.signAsp || {};

	lines.push('标准相位');
	AstroConst.LIST_POINTS.forEach((id)=>{
		const one = normal[id];
		if(!one){
			return;
		}
		lines.push(msgWithHouse(id, chartObj));
		(one.Applicative || []).forEach((asp)=>{
			lines.push(`${aspectText(asp.asp)} ${msgWithHouse(asp.id, chartObj)} 入相 误差${round3(asp.orb)}`);
		});
		(one.Exact || []).forEach((asp)=>{
			lines.push(`${aspectText(asp.asp)} ${msgWithHouse(asp.id, chartObj)} 离相 误差${round3(asp.orb)}`);
		});
		(one.Separative || []).forEach((asp)=>{
			lines.push(`${aspectText(asp.asp)} ${msgWithHouse(asp.id, chartObj)} 离相 误差${round3(asp.orb)}`);
		});
		(one.None || []).forEach((asp)=>{
			lines.push(`${aspectText(asp.asp)} ${msgWithHouse(asp.id, chartObj)} 误差${round3(asp.orb)}`);
		});
	});

	lines.push('立即相位');
	AstroConst.LIST_OBJECTS.forEach((id)=>{
		const one = immediate[id];
		if(!one || one.length < 2){
			return;
		}
		lines.push(`${msgWithHouse(id, chartObj)} ${aspectText(one[0].asp)} ${msgWithHouse(one[0].id, chartObj)} 离相 误差${round3(one[0].orb)}；${aspectText(one[1].asp)} ${msgWithHouse(one[1].id, chartObj)} 入相 误差${round3(one[1].orb)}`);
	});

	lines.push('星座相位');
	AstroConst.LIST_OBJECTS.forEach((id)=>{
		const one = signAsp[id];
		if(!one || !one.length){
			return;
		}
		lines.push(`主体：${msgWithHouse(id, chartObj)}`);
		one.forEach((asp)=>{
			lines.push(`与 ${msgWithHouse(asp.id, chartObj)} 成 ${aspectText(asp.asp)} 相位`);
		});
	});

	return lines;
}

function buildPlanetSection(chartObj){
	const lines = [];
	const chart = chartObj && chartObj.chart ? chartObj.chart : {};
	const objectMap = getObjectsMap(chartObj);
	const starsMap = getStarsMap(chartObj);
	const orientOccident = chart.orientOccident || {};
	const nakshatras = (chart && chart.nakshatras) || chartObj.nakshatras || {};

	AstroConst.LIST_OBJECTS.forEach((id)=>{
		const obj = objectMap[id];
		if(!obj){
			return;
		}
		lines.push(msgWithHouse(id, chartObj));
		// FIX-12 落座行附加 29°歧度 / 燃烧之路 / 压抑之路 临界标(参 AstroPlanet.js:181,193,196)。
		let signDegLine = `落座：${formatSignDegree(obj.sign, obj.signlon)}`;
		const extras = [];
		if(typeof obj.signlon === 'number' && Math.floor(obj.signlon) === 29){ extras.push('位于歧度'); }
		if(obj.isViaCombust){ extras.push('位于燃烧之路'); }
		if(obj.isViaRepression){ extras.push('位于压抑之路'); }
		if(extras.length){ signDegLine += '；' + extras.join('；'); }
		lines.push(signDegLine);
		if(obj.house){
			lines.push(`落宫：${msg(obj.house)}`);
		}
		// FIX-7 月宿 nakshatra(印度盘场景关键;参 AstroPlanet.js:155,205)。lord 中文化用 AstroConst.NAK_LORD_CN
		// (含 7 行星 + Rahu/Ketu),勿用 AstroMsg(那是星历字体 glyph,会输出 'A/B/C')。
		const nak = nakshatras[id];
		if(nak && nak.index){
			const lordCn = AstroConst.NAK_LORD_CN && AstroConst.NAK_LORD_CN[nak.lord] ? AstroConst.NAK_LORD_CN[nak.lord] : (nak.lord || '');
			lines.push(`月宿：第${nak.index}宿 ${nak.name || ''}${nak.label ? `（${nak.label}）` : ''} 第${nak.pada || '?'}步·宿主${lordCn}`);
		}
		if(obj.antisciaPoint){
			lines.push(`映点：${formatSignDegree(obj.antisciaPoint.sign, obj.antisciaPoint.signlon)}`);
		}
		if(obj.cantisciaPoint){
			lines.push(`反映点：${formatSignDegree(obj.cantisciaPoint.sign, obj.cantisciaPoint.signlon)}`);
		}
		if(obj.meanSpeed !== undefined){
			lines.push(`平均速度：${round3(obj.meanSpeed)}`);
		}
		if(obj.lonspeed !== undefined){
			lines.push(`当前速度：${formatSpeed(obj)}`);
		}
		if(obj.selfDignity){
			let dg = dignityText(obj.selfDignity);
			if(obj.hayyiz && obj.hayyiz !== 'None'){
				dg += `，${msg(obj.hayyiz)}`;
			}
			if(obj.isVOC){
				dg += '，空亡';
			}
			lines.push(`禀赋：${dg}`);
		}
		if(obj.score !== undefined){
			lines.push(`分值：${obj.score}`);
		}
		if(obj.altitudeTrue !== undefined){
			lines.push(`真地平纬度：${round3(obj.altitudeTrue)}˚`);
		}
		if(obj.altitudeAppa !== undefined){
			lines.push(`视地平纬度：${round3(obj.altitudeAppa)}˚`);
		}
		if(obj.azimuth !== undefined){
			lines.push(`地坪经度：${round3(obj.azimuth)}˚`);
		}
		if(obj.lon !== undefined){
			lines.push(`黄经：${round3(obj.lon)}˚`);
		}
		if(obj.lat !== undefined){
			lines.push(`黄纬：${round3(obj.lat)}˚`);
		}
		if(obj.ra !== undefined){
			lines.push(`赤经：${round3(obj.ra)}˚`);
		}
		if(obj.decl !== undefined){
			lines.push(`赤纬：${round3(obj.decl)}˚`);
		}
		if(obj.moonPhase !== undefined){
			lines.push(`月限：${msg(obj.moonPhase)}`);
		}
		if(obj.sunPos !== undefined){
			lines.push(`太阳关系：${msg(obj.sunPos)}`);
		}
		if(obj.ruleHouses && obj.ruleHouses.length){
			lines.push(`入垣宫：${asNameList(obj.ruleHouses)}`);
		}
		if(obj.exaltHouse){
			lines.push(`擢升宫：${msg(obj.exaltHouse)}`);
		}
		if(obj.governSign){
			let govern = msg(obj.governSign);
			if(obj.governPlanets && obj.governPlanets.length){
				govern += ` , ${asNameList(obj.governPlanets)}`;
			}
			lines.push(`宰制星座：${govern}`);
		}

		const occ = orientOccident[id];
		if(occ){
			const oc = (occ.occidental || []).map((x)=>x.id);
			const or = (occ.oriental || []).map((x)=>x.id);
			lines.push(`东出星：${asNameList(or)}`);
			lines.push(`西入星：${asNameList(oc)}`);
		}

		const stars = starsMap[id] || [];
		if(stars.length){
			lines.push('汇合恒星：');
			lines.push(...formatStarsLines(stars));
		}
	});

	return lines;
}

function buildLotsSection(chartObj){
	const lines = [];
	const objectMap = getObjectsMap(chartObj);
	const starsMap = getStarsMap(chartObj);

	AstroConst.LOTS.forEach((id)=>{
		const obj = objectMap[id];
		if(!obj){
			return;
		}
		lines.push(msgWithHouse(id, chartObj));
		lines.push(`落座：${formatSignDegree(obj.sign, obj.signlon)}`);
		if(obj.house){
			lines.push(`落宫：${msg(obj.house)}`);
		}
		const stars = starsMap[id] || [];
		if(stars.length){
			lines.push('汇合恒星：');
			lines.push(...formatStarsLines(stars));
		}
	});

	return lines;
}

// 星座庙主(传统七政),按 0=白羊…11=双鱼 顺序。仅用于 12分度/主宰链段,使用 AstroConst 行星常量,
// 不引 divination/data/signs(避免小写 key 与 chart id 格式失配)。
const TRAD_SIGN_RULERS = [
	AstroConst.MARS, AstroConst.VENUS, AstroConst.MERCURY, AstroConst.MOON,
	AstroConst.SUN, AstroConst.MERCURY, AstroConst.VENUS, AstroConst.MARS,
	AstroConst.JUPITER, AstroConst.SATURN, AstroConst.SATURN, AstroConst.JUPITER,
];

function norm360Lon(x){
	let v = Number(x) % 360;
	if(v < 0){
		v += 360;
	}
	return v;
}

// 取星体绝对黄经:优先 obj.lon,缺则用 sign+signlon 还原(对序列化里没带 lon 的盘兜底)。
function objAbsLon(obj){
	if(obj && obj.lon !== undefined && obj.lon !== null && !Number.isNaN(Number(obj.lon))){
		return Number(obj.lon);
	}
	if(obj && obj.sign !== undefined && obj.signlon !== undefined && obj.signlon !== null){
		const idx = AstroConst.LIST_SIGNS.indexOf(obj.sign);
		if(idx >= 0){
			return idx * 30 + Number(obj.signlon);
		}
	}
	return null;
}

function dodecaLonOf(lon){
	const L = norm360Lon(lon);
	return norm360Lon(Math.floor(L / 30) * 30 + (L % 30) * 12);
}

function rulerIdOfLon(lon){
	return TRAD_SIGN_RULERS[Math.floor(norm360Lon(lon) / 30) % 12];
}

// 12 分度(Dodekatemoria):每星本命黄经 → floor(度/30)*30 + (度%30)*12 落入的分度座。
function buildDodecaSection(chartObj){
	const lines = [];
	const objectMap = getObjectsMap(chartObj);
	AstroConst.LIST_OBJECTS.forEach((id)=>{
		const lon = objAbsLon(objectMap[id]);
		if(lon === null){
			return;
		}
		const natal = lonToSignDegree(lon);
		const dodeca = lonToSignDegree(dodecaLonOf(lon));
		if(!natal || !dodeca){
			return;
		}
		lines.push(`${msg(id)}：本命 ${natal} → 12分度 ${dodeca}`);
	});
	return lines;
}

// 主宰星链(dispositor chains):七政各落星座的庙主,顺链至「落自家星座」的终极主宰(或互容成环)。
function buildDispositorSection(chartObj){
	const lines = [];
	const objectMap = getObjectsMap(chartObj);
	const TRAD = [AstroConst.SUN, AstroConst.MOON, AstroConst.MERCURY, AstroConst.VENUS, AstroConst.MARS, AstroConst.JUPITER, AstroConst.SATURN];
	TRAD.forEach((id)=>{
		if(objAbsLon(objectMap[id]) === null){
			return;
		}
		const chain = [id];
		let cur = id;
		let guard = 0;
		while(guard < 12){
			const lon = objAbsLon(objectMap[cur]);
			if(lon === null){
				break;
			}
			const ruler = rulerIdOfLon(lon);
			if(!ruler || ruler === cur){
				break;
			}
			chain.push(ruler);
			if(chain.indexOf(ruler) !== chain.length - 1){
				break;
			}
			cur = ruler;
			guard += 1;
		}
		lines.push(`${msg(id)}：${chain.map((k)=>msg(k)).join(' → ')}`);
	});
	// FIX-1 宫神星 12 宫表(houseRows):宫号·宫头座·宫主星·宫主落宫·宫主落座(并入主宰星链段,无需 bump 版本)。
	// 与 AstroDispositor.js:15-84 houseRows 派生逻辑同源。
	const chart = chartObj && chartObj.chart ? chartObj.chart : {};
	const houses = chart.houses || [];
	if(houses.length){
		const SIGN_RULER = { Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon', Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars', Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter' };
		// CRASH-1 修:perchart.py 返回的 houses 数组按黄经排序(House8/9/10/11/12/1/2/3/4/5/6/7),
		// 索引 idx 与真宫号不对应。必须从 h.id ("House1".."House12") 提取真号,再按宫号 1..12 升序排。
		// 旧 `idx+1` 会把整张宫神星表错位 → 所有逐宫断语污染。同源 AstroDispositor.js:50 `houseNum(h.id)`。
		const houseLines = [];
		const rows = [];
		houses.forEach((h)=>{
			if(!h || !h.sign || !h.id) return;
			const m = /House\s*(\d+)/.exec(String(h.id));
			if(!m) return;
			const houseNum = parseInt(m[1], 10);
			if(!houseNum || houseNum < 1 || houseNum > 12) return;
			rows.push({ houseNum, sign: h.sign });
		});
		rows.sort((a, b)=> a.houseNum - b.houseNum);
		rows.forEach(({ houseNum, sign })=>{
			const ruler = SIGN_RULER[sign];
			const rulerObj = ruler ? objectMap[ruler] : null;
			if(ruler && rulerObj){
				const rh = rulerObj.house ? msg(rulerObj.house) : '';
				const rs = rulerObj.sign ? msg(rulerObj.sign) : '';
				houseLines.push(`${houseNum}宫(${msg(sign)})：宫主 ${msg(ruler)} 落 ${rh} ${rs}`);
			} else if(ruler){
				houseLines.push(`${houseNum}宫(${msg(sign)})：宫主 ${msg(ruler)}`);
			}
		});
		if(houseLines.length){
			lines.push('宫神星(houseRows)：');
			lines.push(...houseLines);
		}
	}
	return lines;
}

// 非破坏地补出 buildFacts 需要的 objectMap/houseMap(不改原 chartObj)。
function chartObjWithFactsMaps(chartObj){
	if(!chartObj || !chartObj.chart){
		return chartObj;
	}
	let objectMap = chartObj.objectMap;
	if(!objectMap && Array.isArray(chartObj.chart.objects)){
		objectMap = {};
		chartObj.chart.objects.forEach((o)=>{ if(o && o.id){ objectMap[o.id] = o; } });
	}
	let houseMap = chartObj.houseMap;
	if(!houseMap && Array.isArray(chartObj.chart.houses)){
		houseMap = {};
		chartObj.chart.houses.forEach((h)=>{ if(h && h.id){ houseMap[h.id] = h; } });
	}
	return Object.assign({}, chartObj, { objectMap, houseMap });
}

// 寿命引擎产出的 key/sign 是小写(buildFacts 统一 toLowerCase),需映射回 chart id 供 msg 显示中文。
const LIFESPAN_KEY_TO_ID = {
	sun: AstroConst.SUN, moon: AstroConst.MOON, mercury: AstroConst.MERCURY,
	venus: AstroConst.VENUS, mars: AstroConst.MARS, jupiter: AstroConst.JUPITER,
	saturn: AstroConst.SATURN, asc: AstroConst.ASC, mc: AstroConst.MC,
	fortune: AstroConst.PARS_FORTUNA, syzygy: AstroConst.SYZYGY,
	north_node: AstroConst.NORTH_NODE, south_node: AstroConst.SOUTH_NODE,
};

function lifespanName(key){
	if(!key){
		return '-';
	}
	const lk = String(key).toLowerCase();
	if(LIFESPAN_KEY_TO_ID[lk]){
		return msg(LIFESPAN_KEY_TO_ID[lk]);
	}
	const cap = lk.charAt(0).toUpperCase() + lk.slice(1);
	const m = msg(cap);
	return (m && m !== cap) ? m : `${key}`;
}

// 寿命格局(Hyleg/Alcocoden):生命主 + 寿主星 + 预测寿数 + 盘主体系。默认 Ptolemy 取主法(与组件同)。
// 位置统一用 lonToSignDegree(lon)(引擎 sign 是小写、term 取不到;用绝对黄经重算座度+界,得中文)。
function buildLifespanSection(chartObj){
	const lines = [];
	let res = null;
	try {
		const facts = buildFacts(chartObjWithFactsMaps(chartObj));
		res = facts ? runLifespan(facts, { method: 'ptolemy' }) : null;
	} catch(e){
		return lines;
	}
	if(!res){
		return lines;
	}
	lines.push(`区分：${res.isDiurnal ? '昼生盘' : '夜生盘'}`);
	const hy = res.hyleg;
	if(hy){
		const pos = (hy.lon !== undefined && hy.lon !== null) ? lonToSignDegree(hy.lon) : '';
		lines.push(`生命主(Hyleg)：${lifespanName(hy.key)} ${pos}${hy.house ? `（第${hy.house}宫）` : ''}`);
	} else {
		lines.push('生命主(Hyleg)：未定');
	}
	const alc = res.alcocoden;
	if(alc && alc.alcocoden){
		lines.push(`寿主星(Alcocoden)：${lifespanName(alc.alcocoden)}`);
		if(alc.aspectToHyleg){
			lines.push(`与生命主相照：${alc.aspectToHyleg}`);
		}
		if(alc.predictedYears !== undefined && alc.predictedYears !== null){
			lines.push(`预测寿数 ≈ ${alc.predictedYears} 年（基础 ${alc.baseYears} 年）`);
		}
	} else {
		lines.push('寿主星(Alcocoden)：未能确定');
	}
	if(res.rulers){
		const r = res.rulers;
		const parts = [];
		if(r.epikratetor){ parts.push(`占控星 ${lifespanName(r.epikratetor)}`); }
		if(r.oikodespotes){ parts.push(`家主星 ${lifespanName(r.oikodespotes)}`); }
		if(r.kurios){ parts.push(`盘主星 ${lifespanName(r.kurios)}`); }
		if(parts.length){
			lines.push(`盘主体系：${parts.join('；')}${r.concordant ? '（家主=盘主，格局相合）' : ''}`);
		}
	}
	// FIX-8 取主法 + 朔/望月 显式标识。
	if(res.method){ lines.push(`取主法：${res.method}`); }
	if(res.birthType){ lines.push(`朔/望月：${res.birthType === 'conjunctional' ? '朔月(合)' : '望月(冲)'}`); }
	// FIX-8 Hyleg 候选列表(key/house/aphetic/rank/reason)。
	if(Array.isArray(res.candidates) && res.candidates.length){
		lines.push('生命主候选：');
		res.candidates.forEach((c)=>{
			if(!c || !c.key) return;
			const ah = c.aphetic ? '投射' : '非投射';
			const rk = (c.rank !== undefined && c.rank !== null) ? `rank=${c.rank}` : '';
			const rsn = c.reason ? `·${c.reason}` : '';
			const hs = c.house ? `第${c.house}宫` : '';
			lines.push(`${lifespanName(c.key)} ${hs}·${ah}${rk ? '·' + rk : ''}${rsn}`);
		});
	}
	// FIX-8 Alcocoden 全字段(viaDignity/angularity/band/modifiers);英文 token 中文化。
	const VIA_DIG = { ruler: '本垣', exalt: '擢升', triplicity: '三分', term: '界', face: '面 / 十度' };
	const ANGLR = { angular: '角宫', succedent: '续宫', cadent: '果宫' };
	const BAND_CN = { greatest: '大限', mean: '中限', least: '小限', max: '大限', min: '小限' };
	if(res.alcocoden){
		const a = res.alcocoden;
		const detail = [];
		if(a.viaDignity){ detail.push(`经${VIA_DIG[a.viaDignity] || a.viaDignity}`); }
		if(a.angularity){ detail.push(ANGLR[a.angularity] || a.angularity); }
		if(a.band){ detail.push(`限 ${BAND_CN[a.band] || a.band}`); }
		if(a.baseYears !== undefined){ detail.push(`基础${a.baseYears}年`); }
		if(detail.length){ lines.push(`寿主星细节：${detail.join('；')}`); }
		if(Array.isArray(a.modifiers) && a.modifiers.length){
			a.modifiers.forEach((m)=>{
				if(!m) return;
				const p = m.planet ? lifespanName(m.planet) : '';
				const asp = m.aspect ? `·${m.aspect}` : '';
				const dlt = (m.delta !== undefined && m.delta !== null) ? `(Δ${m.delta})` : '';
				const k = m.kind ? `·${m.kind}` : '';
				lines.push(`修正：${p}${asp}${dlt}${k}`);
			});
		}
	}
	// FIX-9 医疗危机 Zoller v1(sixthSign/sixthRuler/hylegAfflictions/bodyHyleg/note)。
	// HIGH-2 修:lifespan 引擎 sixth.sign 来自 facts.houses(全 lowercase 'virgo'/'pisces');msg() 仅识 PascalCase
	// → 直出原英文。先首字大写再 msg(),与逐曜古典段 sign 输出一致。
	const capSign = (s)=> (s && typeof s === 'string') ? s.charAt(0).toUpperCase() + s.slice(1) : s;
	if(res.medical){
		const m = res.medical;
		const mp = [];
		if(m.sixthSign){ mp.push(`六宫${msg(capSign(m.sixthSign))}`); }
		if(m.sixthRuler){ mp.push(`六宫主 ${lifespanName(m.sixthRuler)}`); }
		if(mp.length){ lines.push(`医疗危机：${mp.join('；')}`); }
		if(Array.isArray(m.hylegAfflictions) && m.hylegAfflictions.length){
			const ha = m.hylegAfflictions.map((x)=> `${lifespanName(x.planet || x.id)}${x.aspect ? '·' + x.aspect : ''}`).join('、');
			lines.push(`生命主受克：${ha}`);
		}
		if(Array.isArray(m.bodyHyleg) && m.bodyHyleg.length){
			lines.push(`生命主部位：${m.bodyHyleg.join('、')}`);
		}
		if(m.note){ lines.push(`备注：${m.note}`); }
	}
	// FIX-10 行星状态盘 states.rows;全部英文 raw 字段中文化;inSect 是 boolean(非字串) → 显式判 true/false。
	const STATE_HAYYIZ = { Hayyiz: '得时得地', DemiHayyiz: '半得', InWrongPos: '失位', None: '' };
	const STATE_SUN = { cazimi: '核心', combust: '焦伤', under_beams: '日光束下', underBeams: '日光束下', free: '自由光' };
	const STATE_ORIENT = { oriental: '东出', occidental: '西入' };
	const STATE_MOTION = { retro: '逆行', direct: '顺行', stationary: '停滞' };
	if(res.states && Array.isArray(res.states.rows) && res.states.rows.length){
		lines.push('行星状态盘：');
		res.states.rows.forEach((row)=>{
			if(!row || !row.planet) return;
			const parts = [];
			if(row.hayyiz && row.hayyiz !== 'None'){ const v = STATE_HAYYIZ[row.hayyiz]; if(v) parts.push(v); }
			if(row.sunState && row.sunState !== 'None'){ parts.push(STATE_SUN[row.sunState] || row.sunState); }
			if(row.orient){ parts.push(STATE_ORIENT[row.orient] || row.orient); }
			if(row.motion){ parts.push(STATE_MOTION[row.motion] || row.motion); }
			if(row.inSect === true){ parts.push('同宗派'); } else if(row.inSect === false){ parts.push('异宗派'); }
			if(row.house){ parts.push(`第${row.house}宫`); }
			lines.push(`${lifespanName(row.planet)}：${parts.join('·')}`);
		});
	}
	return lines;
}

function buildPossibilitySection(chartObj){
	const lines = [];
	const predict = chartObj && chartObj.predict ? chartObj.predict : {};
	const planetSign = predict.PlanetSign || {};
	Object.keys(planetSign).forEach((key)=>{
		lines.push(msg(key));
		const items = planetSign[key] || [];
		items.forEach((txt)=>lines.push(`${txt}`));
	});
	return lines;
}

function buildSectionText(title, lines){
	const clean = (lines || []).map((line)=>`${line}`.trim()).filter(Boolean);
	if(clean.length === 0){
		return '';
	}
	return `[${title}]\n${clean.join('\n')}`;
}

export function createAstroSnapshotSignature(chartObj, fields, options = {}){
	const chart = chartObj && chartObj.chart ? chartObj.chart : {};
	const params = chartObj && chartObj.params ? chartObj.params : {};
	const lon = fieldValue(fields, 'lon') || params.lon || '';
	const lat = fieldValue(fields, 'lat') || params.lat || '';
	const zone = params.zone !== undefined && params.zone !== null ? params.zone : fieldValue(fields, 'zone');
	const birth = params.birth || '';
	const zodiacal = chart.zodiacal || AstroConst.ZODIACAL[fieldValue(fields, 'zodiacal')] || '';
	const hsys = chart.hsys || AstroConst.HouseSys[fieldValue(fields, 'hsys')] || '';
	const chartId = chartObj && chartObj.chartId ? chartObj.chartId : '';
	const onlyRulerExaltReception = resolveOnlyRulerExaltReception(options);
	// 恒星黄道 ayanāṃśa（raw key，如 'raman'）：zodiacal 仅区分 回归/恒星，无法分辨 47 个 ayanāṃśa →
	// 必入签名，否则换 ayanāṃśa 后 hasMatchingSavedAstroSnapshot 误判旧快照可复用（Lahiri 快照套到 Raman 盘）。
	// 追加在末位：旧签名无 parts[9] → 解码为 '' → 匹配守卫跳过 → 旧快照行为逐字不变（向后兼容）。
	const siderealAyanamsa = params.siderealAyanamsa || fieldValue(fields, 'siderealAyanamsa') || '';
	return [chartId, birth, zone, lon, lat, zodiacal, hsys, chart.isDiurnal ? '1' : '0', onlyRulerExaltReception ? '1' : '0', siderealAyanamsa].join('|');
}

// === 古典占星(WI-00..28 逐曜状态 + 围攻详断);标签与 AstroInfo.js 古典渲染严格一致(单一语义源)。===
const CLS_STATUS_IDS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
const CLS_PHASE = { cazimi: '核心', combust: '焦伤', underBeams: '日光束下', free: '自由光' };
const CLS_PHASE_EVENT = { morningRising: '晨星初现', eveningSetting: '昏星初没' };
const CLS_QUALITY = { B: '明度', D: '暗度', E: '空度', S: '烟度' };
const CLS_SPECIAL = { pitted: '陷度', azemene: '慢病度', fortune: '增福度' };
const CLS_APOGEE = { rising: '升·趋远地点', falling: '降·趋近地点' };
const CLS_NUM = { increasing: '数增·渐疾', decreasing: '数减·渐迟' };
const CLS_LIGHT = { waxing: '光增·渐盈', waning: '光减·渐亏' };
const CLS_SEASON = { '春': '春·主宰', '夏': '夏·宰执', '秋': '秋·受制', '冬': '冬·被执', '中': '中' };
const CLS_MEAN_ATK = { Sun: '精神阴暗·心灵扭曲', Moon: '凶死夭折·绝症残疾', Mercury: '智力特异·语言障碍', Venus: '欲望混乱·专断残暴', Jupiter: '世俗无成·离经叛道', Mars: '自身受困崩坏', Saturn: '自身受困崩坏' };

function fixedNum(val, digits){
	const n = Number(val);
	return Number.isNaN(n) ? '' : n.toFixed(digits);
}

// 围攻详断(《围攻》十六式):三种围 + 春秋势 + 宰执夏冬 + 协防 + 围魏救赵 + 日木互容制约 + 逆行 + 断语。
function buildBesiegementLines(chartObj){
	const list = (chartObj && chartObj.surround && chartObj.surround.besiegement) || [];
	const lines = [];
	(list || []).forEach((b)=>{
		if(!b || !Array.isArray(b.besiegers)){
			return;
		}
		const besiegers = b.besiegers.map((x)=>{
			let s = `${msg(x.id)}（${CLS_SEASON[x.season] || x.season}`;
			if(x.retro){ s += '·逆行'; }
			if(x.restrained && x.restrained.length){ s += '·日木制约凶减半'; }
			if(x.counterBesieged){ s += '·围魏救赵'; }
			return `${s}）`;
		}).join(' 与 ');
		let head = `${msg(b.target)}${b.targetRetro ? '（逆行）' : ''} 被 ${besiegers} ${b.kind}（${b.nature}）`;
		if(b.severe){ head += '·凶剧见血'; }
		lines.push(head);
		if(b.defense && b.defense.length){
			const d = b.defense.map((y)=> `${msg(y.id)}（${y.byBody ? '以身作盾' : '遥光'}·护${y.against ? msg(y.against) : y.side}侧·${y.strong ? '强' : '弱'}）`).join('，');
			lines.push(`协防：${d}`);
		}
		const mean = b.kind === '围攻' ? (CLS_MEAN_ATK[b.target] || '') : (b.kind === '围荣' ? '致富·舒适自由·财帛丰盈' : '致贵·领袖魅力·载众载民');
		if(mean){ lines.push(`断语：${mean}`); }
	});
	return lines;
}

// 围绕:某星 C 被紧邻两侧七政 A、B 夹持,过 C 黄道弧 < 90°,A-C/B-C 间无他星(取紧邻自然满足)。与 AstroInfo.genSurroundEncircleDom 同算法(七政按黄经排序、环形紧邻、span<90)。快照=全七政几何(无显示过滤)。
function buildEncircleLines(chartObj){
	const objectMap = getObjectsMap(chartObj);
	const bodies = CLS_STATUS_IDS.map((id)=> objectMap[id]).filter((o)=> o && typeof o.lon === 'number');
	if(bodies.length < 3){
		return [];
	}
	const sorted = bodies.slice().sort((a, b)=> a.lon - b.lon);
	const n = sorted.length;
	const norm = (x)=> ((x % 360) + 360) % 360;
	const lines = [];
	for(let i=0; i<n; i++){
		const mid = sorted[i];
		const left = sorted[(i - 1 + n) % n];
		const right = sorted[(i + 1) % n];
		const span = norm(mid.lon - left.lon) + norm(right.lon - mid.lon);
		if(span < 90){
			lines.push(`${msg(left.id)} 与 ${msg(right.id)} 围绕 ${msg(mid.id)}（跨${span.toFixed(1)}°）`);
		}
	}
	return lines;
}

function patSignCn(s){ const k = s ? String(s).toLowerCase() : null; return (SIGNS[k] && SIGNS[k].cn) || s || ''; }
// 古典格局(龙脉/孤月独明/月水心性智识/职业·皇室伴寝/强吉木·照耀/后天凶星) —— 复用 buildPatternOverview 单一真值，
// 经 buildClassicalSection→[古典]段，贯通 AI 导出/挂载/储存。绝不抛(失败回空)。
function buildPatternOverviewLines(chartObj){
	let data;
	// 先验权力等取自互容/接纳联结,须与「仅按本垣擢升计算互容接纳」设置同步(同信息/格局 tab 口径)。
	const onlyRulExalt = resolveOnlyRulerExaltReception();
	try{ data = buildPatternOverview(chartObj.chart, chartObj, { onlyRulExalt }); }catch(_){ return []; }
	if(!data || data.empty){ return []; }
	const lines = [];
	const d = data.dragon;
	if(d && d.has){
		if(d.kind === '龙拥'){ lines.push(`龙脉：龙拥（${d.note || '七星聚一侧'}）`); }
		else if(d.pair){ lines.push(`龙脉：龙截 ${d.pair.map((x)=> msg(x)).join('')}（两星联结）`); }
		else { lines.push(`龙脉：龙截 ${msg(d.lone)}（${patSignCn(d.loneSign)}${d.loneHouse ? `·${d.loneHouse}宫` : ''}${(d.loneRules && d.loneRules.length) ? `·主${d.loneRules.join('/')}宫` : ''}）`); }
	}
	if(data.loneMoon && data.loneMoon.has){ lines.push('孤月独明：是（夜生·唯月在地平上）'); }
	const ap = data.apriori || {};
	if(ap.has){ lines.push(`先验权力：${ap.links.map((lk)=> `${msg(lk.a)}${lk.kind}${msg(lk.b)}(${lk.which})`).join('、')}${ap.eightKill ? '·夜生·八杀朝天大贵' : '·昼生·非八杀朝天'}`); }
	const mm = data.moonMercury || {};
	const oneMM = (o)=> o ? `${patSignCn(o.sign)}${o.modality ? `·${o.modality}` : ''}${o.ruler ? `·主${msg(o.ruler)}${o.rulerDign || ''}` : ''}${o.flags && o.flags.length ? `·${o.flags.join('')}` : ''}` : '';
	if(mm.moon){ lines.push(`心性(月)：${oneMM(mm.moon)}`); }
	if(mm.mercury){ lines.push(`智识(水)：${oneMM(mm.mercury)}`); }
	const v = data.vocation || {};
	if(v.career){ lines.push(`职业(月第一西没)：${msg(v.career.id)} ${patSignCn(v.career.sign)}${v.career.house ? `·${v.career.house}宫` : ''}`); }
	if(v.style){ lines.push(`行事(日第一西没)：${msg(v.style.id)} ${patSignCn(v.style.sign)}${v.style.house ? `·${v.style.house}宫` : ''}`); }
	const j = data.jupiter;
	if(j && j.present){ lines.push(`木星：${j.strong ? '强吉' : '非强吉'}·${patSignCn(j.sign)}${j.dign ? `·${j.dign}` : ''}·照耀${j.litCount}星${j.lit && j.lit.length ? `（${j.lit.map((x)=> msg(x)).join('、')}）` : ''}`); }
	if((data.afflictedRulers || []).length){ lines.push(`后天凶星：${data.afflictedRulers.map((x)=> msg(x)).join('、')}`); }
	return lines;
}

// 逐曜古典状态:出界/偕日相/喜乐/宗派/野逸/度数性质·阳阴/月站/远地点·数·光/单度·九分·Darijan + 围攻详断 + 围绕 + 古典格局。
function buildClassicalSection(chartObj){
	const lines = [];
	const objectMap = getObjectsMap(chartObj);
	const profile = [];
	CLS_STATUS_IDS.forEach((id)=>{
		const o = objectMap[id];
		if(!o){
			return;
		}
		const parts = [];
		if(o.outOfBounds){
			const mode = (id === 'Moon' && o.oobMode) ? (o.oobMode === 'going' ? '远行' : '回归') : '';
			parts.push(`出界+${fixedNum(o.oobDelta, 2)}°${mode ? `（${mode}）` : ''}`);
		}
		if(o.phase){
			let p = CLS_PHASE[o.phase] || o.phase;
			if(o.phasisElong != null){ p += `（距日${fixedNum(o.phasisElong, 1)}°）`; }
			if(o.phasisEvent){ p += `·${CLS_PHASE_EVENT[o.phasisEvent] || o.phasisEvent}`; }
			parts.push(p);
		}
		if(o.joy){ parts.push(`喜乐（${o.joyHouse}宫）`); }
		if(o.ofSect !== undefined && o.ofSect !== null){ parts.push(o.ofSect ? '同宗' : '异宗'); }
		if(o.feral){ parts.push('野逸'); }
		if(o.degreeQuality){ parts.push(CLS_QUALITY[o.degreeQuality] || `${o.degreeQuality}度`); }
		if(o.degreeGender){ parts.push(o.degreeGender === 'masculine' ? '阳性度' : '阴性度'); }
		if(o.specialDegree){
			const tags = Object.keys(o.specialDegree).filter((k)=> o.specialDegree[k]).map((k)=> CLS_SPECIAL[k] || k);
			if(tags.length){ parts.push(tags.join('·')); }
		}
		if(o.mansion && o.mansion.cn){ parts.push(`月站${o.mansion.cn}（${o.mansion.nature}）`); }
		if(o.apogeeDir){
			let a = CLS_APOGEE[o.apogeeDir] || o.apogeeDir;
			if(o.numberTrend){ a += `·${CLS_NUM[o.numberTrend] || ''}`; }
			if(o.lightTrend){ a += `·${CLS_LIGHT[o.lightTrend] || ''}`; }
			parts.push(a);
		}
		const dl = [];
		if(o.monomoiria){ dl.push(`单度主星${msg(o.monomoiria)}`); }
		if(o.ninthPart){ dl.push(`九分${msg(o.ninthPart)}`); }
		// FIX-13 度数主星补 Face(对齐 AstroInfo.genDegreeLordsDom 单度/九分/面/Darijan 四列)。
		if(o.dignities && o.dignities.face){ dl.push(`面主${msg(o.dignities.face)}`); }
		if(o.darijan){ dl.push(`Darijan${msg(o.darijan)}`); }
		if(dl.length){ parts.push(dl.join('·')); }
		if(parts.length){ profile.push(`${msg(id)}：${parts.join('；')}`); }
	});
	if(profile.length){
		lines.push('逐曜古典状态');
		lines.push(...profile);
	}
	const asc = objectMap.Asc;
	if(asc && asc.mansion && asc.mansion.cn){
		lines.push(`上升宿：${asc.mansion.cn}（${asc.mansion.nature} · ${asc.mansion.use}）`);
	}
	const bsg = buildBesiegementLines(chartObj);
	if(bsg.length){
		lines.push('围攻详断');
		lines.push(...bsg);
	}
	const enc = buildEncircleLines(chartObj);
	if(enc.length){
		lines.push('围绕');
		lines.push(...enc);
	}
	const pat = buildPatternOverviewLines(chartObj);
	if(pat.length){
		lines.push('古典格局');
		lines.push(...pat);
	}
	// FIX-11 全身部位 Melothesia(每星所落星座主管部位 + 度数上中下,对齐 AstroInfo.genMelothesiaDom)。
	const melo = [];
	CLS_STATUS_IDS.forEach((id)=>{
		const o = objectMap[id];
		if(!o || !o.sign) return;
		const parts = bodyPartsOf(String(o.sign).toLowerCase());
		if(!parts || !parts.length) return;
		const pos = (o.signlon != null) ? degreePosition(o.signlon) : '';
		melo.push(`${msg(id)}：${pos ? pos + '·' : ''}${parts.join('、')}`);
	});
	if(melo.length){
		lines.push('身体部位(Melothesia)');
		lines.push(...melo);
	}
	return lines;
}

const CLS_OVR_ASP = { sextile: '六分', square: '四分', trine: '三分', conjunction: '合', opposition: '冲' };
// 阿拉伯点中文名(与 AstroAnalysisLab.js:8 LOT_CN 同源,保持单源 — 改名同步两侧)。
const CLS_LOT_CN = {
	'Pars Fortuna': '福点', 'Pars Fortunae': '福点', 'Pars Spirit': '精神点', 'Pars Faith': '信仰点', 'Pars Substance': '资财点',
	'Pars Wedding [Male]': '婚姻点(男)', 'Pars Wedding [Female]': '婚姻点(女)', 'Pars Sons': '子女点',
	'Pars Father': '父亲点', 'Pars Mother': '母亲点', 'Pars Brothers': '兄弟点', 'Pars Diseases': '疾厄点',
	'Pars Death': '死亡点', 'Pars Travel': '旅行点', 'Pars Friends': '朋友点', 'Pars Enemies': '仇敌点',
	'Pars Saturn': '土星点', 'Pars Jupiter': '木星点', 'Pars Mars': '火星点', 'Pars Venus': '金星点',
	'Pars Mercury': '水星点', 'Pars Horsemanship': '骑术点', 'Pars Life': '生命点', 'Pars Radix': '根基点',
	'Pars Eros': '爱欲点', 'Pars Necessity': '必然点', 'Pars Courage': '勇气点', 'Pars Victory': '胜利点',
	'Pars Nemesis': '报应点',
};
const CLS_ELEM = { Fire: '火', Earth: '土', Air: '风', Water: '水' };
const CLS_MODE = { Cardinal: '始', Fixed: '固', Mutable: '变' };
const CLS_HEMI = { east: '东', west: '西', above: '地平上', below: '地平下' };
const CLS_TEMPER = { Choleric: '胆汁(热干)', Melancholic: '忧郁(冷干)', Sanguine: '多血(热湿)', Phlegmatic: '黏液(冷湿)' };
const CLS_QUAL = { Hot: '热', Cold: '冷', Dry: '干', Humid: '湿' };

// 古典格局派生分析(astroextra.analyze_chart):护卫/优势相位/度数围攻 + 传光/聚光/不合意/交点弯曲 +
// 逐题主星 + 偶然尊贵 + 恒星触发 + 行星时值日 + 埃及历 + 巴比伦参照星。与「古典」(逐曜本盘状态)互补,
// 由 AI 挂载/导出按需 fetch /astroextra/analysis 后拼到快照(非每盘预建,避免极区 heliacal 拖慢信息tab)。
export function buildClassicalAnalysisSection(analysis){
	if(!analysis || typeof analysis !== 'object'){
		return '';
	}
	const lines = [];
	const cp = analysis.classicalPatterns || {};
	const dory = (cp.doryphory || []).map((d)=> `${msg(d.planet)} 护卫 ${msg(d.light)}（距${round3(d.elong)}°）`);
	const over = (cp.overcoming || []).map((o)=> `${msg(o.over)}(${msg(o.overSign)}) 凌驾 ${msg(o.under)}(${msg(o.underSign)})·${CLS_OVR_ASP[o.aspect] || o.aspect}`);
	const bsgd = (cp.besieging || []).map((b)=> `${msg(b.planet)} 被 ${msg(b.left)}/${msg(b.right)} 度数围攻`);
	if(dory.length || over.length || bsgd.length){
		lines.push('古典格局');
		if(dory.length){ lines.push(`护卫：${dory.join('；')}`); }
		if(over.length){ lines.push(`优势相位：${over.join('；')}`); }
		if(bsgd.length){ lines.push(`度数围攻：${bsgd.join('；')}`); }
	}
	const ad = analysis.aspectDynamics || {};
	const trans = (ad.translation || []).map((t)=> `${msg(t.mover)} 自 ${msg(t.from)} 传光予 ${msg(t.to)}`);
	const coll = (ad.collection || []).map((c)=> `${msg(c.collector)} 聚 ${msg(c.p1)}、${msg(c.p2)} 之光`);
	const aver = (ad.aversion || []).map((v)=> `${msg(v.a)} 与 ${msg(v.b)} 不合意`);
	const bend = (ad.bending || []).map((b)=> `${msg(b.planet)} 交点弯曲${b.at ? `（${b.at}）` : ''}`);
	// G10 连接学说后四式:空亡/阻止/挫败/收回(后端 aspectDynamics 追加,缺则空)。
	const voidc = (ad.void || []).map((v)=> `${msg(v.planet)} 空亡（${v.mode === 'classical' ? '30°内' : '本座内'}不再成相）`);
	const prohib = (ad.prohibition || []).map((p)=> `${msg(p.blocker)} 阻止 ${msg(p.between)}→${msg(p.to)} 入相`);
	const frust = (ad.frustration || []).map((f)=> `${msg(f.frustrated)} 挫败（${msg(f.via)} 先成相 ${msg(f.to)}）`);
	const refran = (ad.refranation || []).map((r)=> `${msg(r.planet)} 收回（趋留撤离 ${msg(r.to)}）`);
	if(trans.length || coll.length || aver.length || bend.length || voidc.length || prohib.length || frust.length || refran.length){
		lines.push('相位动态');
		if(trans.length){ lines.push(`传光：${trans.join('；')}`); }
		if(coll.length){ lines.push(`聚光：${coll.join('；')}`); }
		if(aver.length){ lines.push(`不合意：${aver.join('；')}`); }
		if(bend.length){ lines.push(`交点弯曲：${bend.join('；')}`); }
		if(voidc.length){ lines.push(`空亡：${voidc.join('；')}`); }
		if(prohib.length){ lines.push(`阻止：${prohib.join('；')}`); }
		if(frust.length){ lines.push(`挫败：${frust.join('；')}`); }
		if(refran.length){ lines.push(`收回：${refran.join('；')}`); }
	}
	// FIX-3 Topical Almuten 补 significator(自然象征,对齐侧栏列)。
	const ta = (analysis.topicAlmuten || []).filter((t)=> t && t.almuten).map((t)=>{
		const sig = t.significator ? `·自然象征${msg(t.significator)}` : '';
		return `${t.topic}（${t.house}宫${sig}）主星${msg(t.almuten)}`;
	});
	if(ta.length){ lines.push('逐题主星'); lines.push(ta.join('；')); }
	const acc = (analysis.accidentalDignity || []).filter((r)=> r && r.planet).map((r)=> `${msg(r.planet)} ${r.score}（${(r.factors || []).join('·')}）`);
	if(acc.length){ lines.push('偶然尊贵'); lines.push(...acc); }
	const fs = (analysis.fixedStarHits || []).map((s)=> `${msg(s.point)} 合 ${s.cn || s.star}${s.behenian ? '·比尼' : ''}${s.royal ? `·王者${s.royal}` : ''}`);
	if(fs.length){ lines.push('恒星触发'); lines.push(fs.join('；')); }
	const ph = analysis.planetaryHours;
	if(ph && ph.dayRuler){
		lines.push(`行星时：值日星 ${msg(ph.dayRuler)}（日出 ${ph.sunrise} / 日落 ${ph.sunset}）`);
		// FIX-4 24 时辰表(昼12+夜12),逐时 index/ruler/diurnal/current 全输出,对齐侧栏 renderPlanetaryHours。
		if(Array.isArray(ph.hours) && ph.hours.length){
			const day = ph.hours.filter((h)=> h && h.diurnal);
			const night = ph.hours.filter((h)=> h && !h.diurnal);
			// 夜时显示 1..12(与 UI AstroAnalysisLab 一致),非原始 13..24 raw index。
			const fmtHour = (h)=> `${h.diurnal ? h.index : (h.index - 12)}.${msg(h.ruler)}${h.current ? '←当前' : ''}`;
			if(day.length){ lines.push(`昼时：${day.map(fmtHour).join(' / ')}`); }
			if(night.length){ lines.push(`夜时：${night.map(fmtHour).join(' / ')}`); }
		}
	}
	const eg = analysis.egyptianCalendar;
	if(eg && (eg.siriusRising || eg.decanIndex)){
		// 极区 siriusRising 可能为 null,但上升十分宫仍有 → 各自独立呈现,勿因天狼缺失整块丢失(对齐 UI renderEgyptian)。
		const parts = [];
		if(eg.siriusRising){ parts.push(`天狼偕日升 ${eg.siriusRising}`); }
		// FIX-5 补 siriusYear(岁年),对齐侧栏 renderEgyptian 完整显示。
		if(eg.siriusYear){ parts.push(`岁年 ${eg.siriusYear}`); }
		if(eg.decanIndex){ parts.push(`上升第${eg.decanIndex}旬（${msg(eg.decanSign)}）面主${msg(eg.decanRuler)}`); }
		if(parts.length){ lines.push(`埃及历：${parts.join('；')}`); }
	}
	const bab = (analysis.babylonianStars || []).filter((b)=> b && b.conj).map((b)=> `${msg(b.planet)} 合参照星 ${b.cn || b.star}`);
	if(bab.length){ lines.push('巴比伦参照星'); lines.push(bab.join('；')); }
	// 相位格局(Grand Trine/T-Square/Yod/Stellium…)、分布权重(元素/模态/半球)、气质(四液)、Almuten 总主 —
	// 格局tab 同源,补入 AI 避免遗漏(与逐曜古典/古典格局互补)。标签对齐 AstroAnalysisLab。
	const pats = (analysis.patterns || []).map((p)=> `${p.label || p.type}（${(p.points || []).map((x)=> msg(x)).join('·')}${p.apex ? `,顶点${msg(p.apex)}` : ''}）`);
	if(pats.length){ lines.push('相位格局'); lines.push(pats.join('；')); }
	const dist = analysis.distribution;
	if(dist && (dist.elements || dist.modes || dist.hemispheres)){
		const kv = (obj, map)=> Object.keys(obj || {}).map((k)=> `${(map && map[k]) || k}${obj[k]}`).join(' ');
		const dl = [];
		if(dist.elements){ dl.push(`元素 ${kv(dist.elements, CLS_ELEM)}`); }
		if(dist.modes){ dl.push(`模态 ${kv(dist.modes, CLS_MODE)}`); }
		if(dist.hemispheres){ dl.push(`半球 ${kv(dist.hemispheres, CLS_HEMI)}`); }
		if(dl.length){ lines.push('分布权重'); lines.push(dl.join('；')); }
	}
	const temp = analysis.temperament;
	if(temp && (temp.temperaments || temp.qualities)){
		const kv = (obj, map)=> Object.keys(obj || {}).map((k)=> `${(map && map[k]) || k}${obj[k]}`).join(' ');
		const tl = [];
		if(temp.temperaments){ tl.push(`气质 ${kv(temp.temperaments, CLS_TEMPER)}`); }
		if(temp.qualities){ tl.push(`性质 ${kv(temp.qualities, CLS_QUAL)}`); }
		if(tl.length){ lines.push('气质评估'); lines.push(tl.join('；')); }
	}
	const am = analysis.almutem;
	if(am && am.winner){
		// 滤掉 0 分行(满屏 0 噪音),按分降序展开。
		const totals = Object.keys(am.totals || {})
			.map((k)=> [k, am.totals[k]])
			.filter((t)=> t[1] > 0)
			.sort((a, b)=> b[1] - a[1]);
		lines.push(`Almuten 总主：${msg(am.winner)}`);
		if(totals.length){
			lines.push('Almuten 逐星得分：');
			lines.push(...totals.map((t)=> `${msg(t[0])} ${t[1]}`));
		}
	}
	// R2 修:bonification(吉化/凶化,每星受惠/受厄关系)engine 已算但 UI 与 snapshot 双双未渲染 → AI 漏。
	// 显式入快照(对齐 analyze_chart 完整 14 键)。
	const bn = (analysis.bonification || []).filter((b)=> b && b.planet && (
		(Array.isArray(b.bonified) && b.bonified.length) ||
		(Array.isArray(b.maltreated) && b.maltreated.length)
	));
	if(bn.length){
		lines.push('吉化/凶化');
		bn.forEach((b)=>{
			const ok = (b.bonified || []).map((x)=> `${msg(x.by)}·${x.rel || '会合'}`).join('、');
			const bad = (b.maltreated || []).map((x)=> `${msg(x.by)}·${x.rel || '会合'}`).join('、');
			const segs = [];
			if(ok) segs.push(`受惠[${ok}]`);
			if(bad) segs.push(`受厄[${bad}]`);
			lines.push(`${msg(b.planet)}：${segs.join('；')}`);
		});
	}
	// FIX-6 阿拉伯点扩展 extraLots(LOT_CN 中文 28 种,带 category 题别;前 60 控总长)。
	// 标签英→中(对齐 UI renderLots);度数缺 sign 时用绝对黄经 fallback,避免尾冒号空值。
	const extra = (analysis.extraLots || []).filter((l)=> l && l.label);
	if(extra.length){
		lines.push('阿拉伯点(扩展)');
		extra.slice(0, 60).forEach((l)=>{
			const cnLabel = CLS_LOT_CN[l.label] || l.label;
			const cat = l.category ? `（${l.category}）` : '';
			let dg = '';
			if(l.sign && l.signlon !== undefined && l.signlon !== null){
				dg = formatSignDegree(l.sign, l.signlon);
			} else if(l.lon !== undefined && l.lon !== null){
				dg = lonToSignDegree(l.lon);
			} else if(l.sign){
				dg = msg(l.sign);
			}
			lines.push(`${cnLabel}${cat}：${dg || '-'}`);
		});
	}
	return buildSectionText('古典格局', lines);
}

export function buildAstroSnapshotContent(chartObj, fields, options = {}){
	if(!chartObj || !chartObj.chart){
		return '';
	}
	const sections = [];
	sections.push(buildSectionText('起盘信息', buildBaseInfoLines(chartObj, fields)));
	sections.push(buildSectionText('宫位宫头', buildHouseCuspLines(chartObj)));
	sections.push(buildSectionText('星与虚点', buildStarAndLotPositionLines(chartObj)));
	sections.push(buildSectionText('信息', buildInfoSection(chartObj, fields, options)));
	sections.push(buildSectionText('相位', buildAspectSection(chartObj)));
	sections.push(buildSectionText('行星', buildPlanetSection(chartObj)));
	sections.push(buildSectionText('希腊点', buildLotsSection(chartObj)));
	sections.push(buildSectionText('12分度', buildDodecaSection(chartObj)));
	sections.push(buildSectionText('主宰星链', buildDispositorSection(chartObj)));
	sections.push(buildSectionText('古典', buildClassicalSection(chartObj)));
	sections.push(buildSectionText('寿命格局', buildLifespanSection(chartObj)));
	sections.push(buildSectionText('可能性', buildPossibilitySection(chartObj)));
	return sections.filter(Boolean).join('\n\n').trim();
}

export function saveAstroAISnapshot(chartObj, fields, options = {}){
	try{
		// 同步 save 即最新真值:丢弃 pending,防旧 factory 物化盖过本次内容。
		ASTRO_PENDING = null;
		const content = buildAstroSnapshotContent(chartObj, fields, options);
		if(!content){
			return null;
		}
		const payload = {
			version: 1,
			createdAt: new Date().toISOString(),
			signature: createAstroSnapshotSignature(chartObj, fields, options),
			chartId: chartObj && chartObj.chartId ? chartObj.chartId : null,
			content: normalizeAiExportText(content),
		};
		ASTRO_AI_SNAPSHOT_MEMORY = payload;
		saveAstroSnapshotToGlobal(payload);
		if(typeof window !== 'undefined' && window.localStorage){
			scheduleStorageWrite(ASTRO_AI_SNAPSHOT_KEY, ()=>JSON.stringify(payload)); // 流畅度:大快照延迟落盘
		}
		return payload;
	}catch(e){
		// localStorage 写入异常时，仍保留内存快照，避免导出链路整体失效。
		try{
			const content = buildAstroSnapshotContent(chartObj, fields, options);
			if(!content){
				return null;
			}
			ASTRO_AI_SNAPSHOT_MEMORY = {
				version: 1,
				createdAt: new Date().toISOString(),
				signature: createAstroSnapshotSignature(chartObj, fields, options),
				chartId: chartObj && chartObj.chartId ? chartObj.chartId : null,
				content: normalizeAiExportText(content),
			};
			saveAstroSnapshotToGlobal(ASTRO_AI_SNAPSHOT_MEMORY);
			return ASTRO_AI_SNAPSHOT_MEMORY;
		}catch(inner){
			// ignore
		}
		return null;
	}
}

// 惰性构建槽(astro 快照是单例,单槽即可)。语义见 saveAstroAISnapshotLazy。
let ASTRO_PENDING = null;

// 惰性版 save:整盘多 section 文本构建(相位/行星/希腊点/12分度/主宰星链/寿命格局/可能性)
// 挪出排盘完成的关键路径,到空闲时段或首次读取时执行;内容与同步版逐字节一致,只是构建变晚。
export function saveAstroAISnapshotLazy(chartObj, fields, options = {}){
	if(!lazySnapshotBuildEnabled()){
		// kill-switch:退化为同步构建,行为==现状。
		return saveAstroAISnapshot(chartObj, fields, options);
	}
	// dev 漂移哨兵:开发态注册时同步预构建一份,物化时比对——捕捉「chartObj 在登记后被
	// 某 hook 面板就地突变」导致的字节漂移(生产态零成本)。
	let devExpected = null;
	try{
		if(typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development'){
			devExpected = buildAstroSnapshotContent(chartObj, fields, options);
		}
	}catch(e){
		devExpected = null;
	}
	const token = {
		// createdAt/signature/chartId 注册时打点(signature 纯字符串拼接,廉价),
		// 元数据语义与同步版「save 时刻」一致。
		createdAt: new Date().toISOString(),
		signature: createAstroSnapshotSignature(chartObj, fields, options),
		chartId: chartObj && chartObj.chartId ? chartObj.chartId : null,
		done: false,
		payload: null,
		materialize(){
			if(token.done){
				return token.payload;
			}
			token.done = true;
			try{
				const content = buildAstroSnapshotContent(chartObj, fields, options);
				if(content){
					if(devExpected !== null && content !== devExpected){
						try{
							console.warn('[horosa.perf] astro 快照惰性构建内容漂移(chartObj 注册后被突变?),请排查 hook 面板对入参的就地写');
						}catch(warnErr){
							// ignore
						}
					}
					token.payload = {
						version: 1,
						createdAt: token.createdAt,
						signature: token.signature,
						chartId: token.chartId,
						content: normalizeAiExportText(content),
					};
					ASTRO_AI_SNAPSHOT_MEMORY = token.payload;
					saveAstroSnapshotToGlobal(token.payload);
				}
				// 空内容与同步版语义一致:不覆盖旧快照、不落盘。
			}catch(e){
				// factory 异常:保留旧快照。
			}
			if(ASTRO_PENDING === token){
				ASTRO_PENDING = null;
			}
			return token.payload;
		},
	};
	ASTRO_PENDING = token; // 后写覆盖(latest-wins):连续重排只构建最后一次
	if(typeof window !== 'undefined' && window.localStorage){
		scheduleStorageWrite(ASTRO_AI_SNAPSHOT_KEY, ()=>{
			const payload = token.materialize();
			return payload ? JSON.stringify(payload) : undefined;
		});
	}
	return token;
}

export function loadAstroAISnapshot(){
	try{
		// read-time 强制物化(铁律):pending 即最新快照,必须先于 localStorage 直返——
		// localStorage 此刻还是上一次的旧值(延迟落盘窗口),走旧分支会读到过期内容。
		if(ASTRO_PENDING){
			const fresh = ASTRO_PENDING.materialize();
			if(fresh){
				return fresh;
			}
			// 物化为空(本次快照为空)→ 按同步版语义回落旧快照。
		}
		if(typeof window !== 'undefined' && window.localStorage){
			const raw = window.localStorage.getItem(ASTRO_AI_SNAPSHOT_KEY);
			if(raw){
				try{
					const obj = JSON.parse(raw);
					if(obj && obj.content){
						obj.content = normalizeAiExportText(obj.content);
						ASTRO_AI_SNAPSHOT_MEMORY = obj;
						saveAstroSnapshotToGlobal(obj);
						return obj;
					}
				}catch(parseErr){
					// 兼容旧版本：astro 快照可能是纯文本直接存储。
					const txt = normalizeAiExportText(`${raw}`.trim());
					if(txt){
						const legacy = {
							version: 1,
							createdAt: '',
							signature: '',
							chartId: null,
							content: txt,
						};
						ASTRO_AI_SNAPSHOT_MEMORY = legacy;
						saveAstroSnapshotToGlobal(legacy);
						return legacy;
					}
				}
			}
		}
		const global = loadAstroSnapshotFromGlobal();
		if(global){
			ASTRO_AI_SNAPSHOT_MEMORY = global;
			return global;
		}
		if(ASTRO_AI_SNAPSHOT_MEMORY && ASTRO_AI_SNAPSHOT_MEMORY.content){
			const mem = {
				...ASTRO_AI_SNAPSHOT_MEMORY,
				content: normalizeAiExportText(ASTRO_AI_SNAPSHOT_MEMORY.content),
			};
			return mem;
		}
		return null;
	}catch(e){
		const global = loadAstroSnapshotFromGlobal();
		if(global){
			ASTRO_AI_SNAPSHOT_MEMORY = global;
			return global;
		}
		if(ASTRO_AI_SNAPSHOT_MEMORY && ASTRO_AI_SNAPSHOT_MEMORY.content){
			return {
				...ASTRO_AI_SNAPSHOT_MEMORY,
				content: normalizeAiExportText(ASTRO_AI_SNAPSHOT_MEMORY.content),
			};
		}
		return null;
	}
}

export function getAstroAISnapshotForCurrent(chartObj, fields, options = {}){
	const snap = loadAstroAISnapshot();
	if(!snap){
		return null;
	}
	if(!chartObj){
		return snap;
	}
	const sig = createAstroSnapshotSignature(chartObj, fields, options);
	if(snap.signature !== sig){
		return null;
	}
	return snap;
}
