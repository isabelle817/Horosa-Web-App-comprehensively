import { Component } from 'react';
import { XQTabs as Tabs } from '../xq-ui';
import CnTraditionInput from './CnTraditionInput';
import * as Constants from '../../utils/constants';
import request from '../../utils/request';
import PaiBaZi, { BAZI_CHART_STYLE_KEY } from './PaiBaZi';
import Gods from './Gods';
import GanHeCong from './GanHeCong';
import ZiHeCong from './ZiHeCong';
import BaZiZhangSheng from './BaZiZhangSheng';
import FourZhuGuaDesc from './FourZhuGuaDesc';
import BaZiLuckFlowPanel from './BaZiLuckFlowPanel';
import BaZiAppInfoPanel from './BaZiAppInfoPanel';
import { BaZiLegacyMain, BaZiLegacyInfoPanel } from './BaZiLegacyView';
import { saveModuleAISnapshotLazy, } from '../../utils/moduleAiSnapshot';
import { buildLocalBaziResult, buildFlowDays, buildFlowHours } from '../../utils/baziLunarLocal';

const TabPane = Tabs.TabPane;

const BaZiOptKey = 'baziopt';
const BAZI_CORE_ENDPOINT = '/bazi/birth';
const BAZI_DIRECT_ENDPOINT = '/bazi/direct';

function gzText(zhu){
	if(!zhu){
		return '';
	}
	const gan = zhu.stem && zhu.stem.cell ? zhu.stem.cell : '';
	const zhi = zhu.branch && zhu.branch.cell ? zhu.branch.cell : '';
	const relGan = zhu.stem && zhu.stem.relative ? `，干十神:${zhu.stem.relative}` : '';
	const relZhi = zhu.branch && zhu.branch.relative ? `，支十神:${zhu.branch.relative}` : '';
	return `${gan}${zhi}${relGan}${relZhi}`;
}

// 多运限段数封顶（批A）：流年/流月/流日/流时合计封顶，防快照爆；超限截断 + 提示行。
const BAZI_PERIOD_MAX_SEGMENTS = 50;
const SHICHEN_LABEL = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 节气月号 1–12 → 该月起始「节」名（立春=1…小寒=12；万年不变常量，镜像 BaZiLuckFlowPanel.FLOW_JIEQI_TERMS）。
// 用于按节气月号匹配 flowMonths（生年的 flowMonths 会过滤掉出生前的早月、数组<12 项，不能用数组下标 ord-1 索引）。
const FLOW_MONTH_TERMS = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
// 按节气月号 ord(1–12) 在某流年的 flowMonths 中找对应项（按 term 匹配，非数组下标）。找不到 → null（生年早月被过滤）。
function findFlowMonthByOrd(months, ord){
	const term = FLOW_MONTH_TERMS[ord - 1];
	if(!term || !Array.isArray(months)){
		return null;
	}
	return months.find((m)=>m && m.term === term) || null;
}

// 在全部 direction 板块的 subDirect 中找某公历年的流年项（含其 ganzi/flowMonths）。
function findBaziLiunian(bazi, year){
	const blocks = (bazi && Array.isArray(bazi.direction)) ? bazi.direction : [];
	for(let i = 0; i < blocks.length; i++){
		const subs = (blocks[i] && Array.isArray(blocks[i].subDirect)) ? blocks[i].subDirect : [];
		const hit = subs.find((s)=>Number(s.year) === year);
		if(hit){
			return hit;
		}
	}
	return null;
}

// 多运限段（批A）：流年/流月读现成 subDirect[].flowMonths；流日/流时调 buildFlowDays/Hours（与四柱同口径）。
// period={liunian:[year...], liuyue:[月序1–12...], liuri:[公历日...], liushi:[时辰序0–11...]}。
// 语义：流年/流月对所选每项各一段（流年×流月笛卡尔）；流日/流时锚定到所选的第一个上层。总段数封顶。
function buildBaziPeriodLines(bazi, period){
	if(!bazi || !period){
		return [];
	}
	const arr = (v)=>(Array.isArray(v) ? v : []);
	const liunianSel = arr(period.liunian);
	const liuyueSel = arr(period.liuyue);
	const liuriSel = arr(period.liuri);
	const liushiSel = arr(period.liushi);

	const four = bazi.fourColumns || {};
	const dayGz = gzText(four.day);
	const dayGan = (four.day && (four.day.ganzi || four.day.ganZhi) ? `${four.day.ganzi || four.day.ganZhi}` : `${dayGz}`).charAt(0);

	const body = [];
	let truncated = false;
	const pushLine = (line)=>{
		if(truncated){ return; }
		if(body.length >= BAZI_PERIOD_MAX_SEGMENTS){ truncated = true; return; }
		body.push(line);
	};
	const flowText = (item)=>gzText(item) || `${(item && (item.ganzi || item.ganZhi)) || ''}`;

	// 1) 流年：每个所选公历年各一段。
	liunianSel.forEach((year)=>{
		const ln = findBaziLiunian(bazi, year);
		if(ln){
			pushLine(`流年：${year}年 ${flowText(ln)}`);
		}else{
			pushLine(`流年：${year}年（超出大运范围，未列流年）`);
		}
	});

	// 流月/流日/流时所需的基准年集合：所选流年；若未选流年，则用大运数据里最早的流年兜底（绝不抛）。
	const firstAvailYear = (()=>{
		const blocks = Array.isArray(bazi.direction) ? bazi.direction : [];
		for(let i = 0; i < blocks.length; i++){
			const subs = (blocks[i] && Array.isArray(blocks[i].subDirect)) ? blocks[i].subDirect : [];
			if(subs.length && Number.isFinite(Number(subs[0].year))){
				return Number(subs[0].year);
			}
		}
		return null;
	})();
	const baseYears = liunianSel.length ? liunianSel : (firstAvailYear !== null ? [firstAvailYear] : []);

	// 2) 流月：流年 × 流月（节气月序1–12）笛卡尔。
	// 坑修：按节气月号(term)匹配 flowMonths，而非数组下标 ord-1。生年的 flowMonths 从「出生月之节气」起过滤
	// （数组<12 项），用 months[ord-1] 会整体错位、且选「第1月」可能取到非立春月或落空被静默丢。改 term 匹配后
	// 非生年逐字不变（全 12 项时 term 顺序 === ord 顺序），生年缺的早月 → 打印提示行而非静默丢。
	if(liuyueSel.length){
		baseYears.forEach((year)=>{
			const ln = findBaziLiunian(bazi, year);
			const months = (ln && Array.isArray(ln.flowMonths)) ? ln.flowMonths : [];
			liuyueSel.forEach((ord)=>{
				const fm = findFlowMonthByOrd(months, ord);
				if(fm){
					// 第12月(小寒)是命理年最后一个节气月,其公历日期落在「次年」年初(spillover,见 baziLunarLocal buildFlowMonths
					// year+1 分支)。故 date 显次年-01-… 属正常,加「(跨次年初)」注明,免与行首 ${year}年 看似错位。
					const crossYearNote = ord === 12 ? '（跨次年初）' : '';
					pushLine(`流月：${year}年 第${ord}月（${fm.term || ''}，${fm.date || ''}${crossYearNote}）${flowText(fm)}`);
				}else{
					pushLine(`流月：${year}年 第${ord}月（${FLOW_MONTH_TERMS[ord - 1] || ''}）（生年此月在出生前/无）`);
				}
			});
		});
	}

	// 锚定上层：流日 → 第一个 (流年, 流月)；流时 → 第一个 (流年, 流月, 流日)。
	const anchorYear = baseYears.length ? baseYears[0] : null;
	const anchorLn = anchorYear !== null ? findBaziLiunian(bazi, anchorYear) : null;
	const anchorMonths = (anchorLn && Array.isArray(anchorLn.flowMonths)) ? anchorLn.flowMonths : [];
	// 锚定流月对象（取所选首月序，否则首个 flowMonth）→ 其公历 (year, month) 供枚举流日。
	// 按节气月号匹配（与流月段同口径）；生年所选首月若被过滤则回退首个可用 flowMonth，避免流日/流时锚定落空。
	const anchorFm = liuyueSel.length
		? (findFlowMonthByOrd(anchorMonths, liuyueSel[0]) || anchorMonths[0])
		: anchorMonths[0];

	// 3) 流日：buildFlowDays(锚定流月的公历 year, month)；对每个所选日各一段。
	if(liuriSel.length && anchorFm && Number.isFinite(anchorFm.year) && Number.isFinite(anchorFm.month)){
		const days = buildFlowDays(anchorFm.year, anchorFm.month, dayGan);
		liuriSel.forEach((d)=>{
			const fd = days.find((x)=>x.day === d);
			if(fd){
				pushLine(`流日：${fd.date || `${anchorFm.year}-${anchorFm.month}-${d}`} ${flowText(fd)}`);
			}
		});
	}

	// 4) 流时：buildFlowHours(锚定流月公历 year, month, 首个所选流日)；对每个所选时辰各一段。
	if(liushiSel.length && anchorFm && Number.isFinite(anchorFm.year) && Number.isFinite(anchorFm.month)){
		const anchorDay = liuriSel.length ? liuriSel[0] : 1;
		const hours = buildFlowHours(anchorFm.year, anchorFm.month, anchorDay, dayGan);
		liushiSel.forEach((h)=>{
			const fh = hours.find((x)=>x.hourIdx === h);
			if(fh){
				pushLine(`流时：${anchorFm.year}-${anchorFm.month}-${anchorDay} ${SHICHEN_LABEL[h] || h}时 ${flowText(fh)}`);
			}
		});
	}

	if(body.length === 0){
		return [];
	}
	const lines = ['', '[多运限·指定时段]'];
	body.forEach((l)=>lines.push(l));
	if(truncated){
		lines.push(`（多运限段已达上限 ${BAZI_PERIOD_MAX_SEGMENTS} 段，余下所选组合已省略）`);
	}
	return lines;
}

function buildBaziSnapshotText(params, result){
	const bazi = result && result.bazi ? result.bazi : {};
	const four = bazi.fourColumns || {};
	const lines = [];
	const labelMap = {
		gender: {
			'-1': '未知',
			'0': '女',
			'1': '男',
		},
		timeAlg: {
			'0': '真太阳时',
			'1': '直接时间',
			'2': '春分定卯时',
		},
		adjustJieqi: {
			'0': '不调整节气',
			'1': '节气按纬度调整',
		},
	};
	const getGz = (item)=>{
		if(!item){
			return '';
		}
		return item.ganzhi || item.ganzi || item.ganZhi || '';
	};
	const formatLabel = (dictName, value)=>{
		const dict = labelMap[dictName] || {};
		const key = `${value}`;
		if(dict[key] !== undefined){
			return dict[key];
		}
		return value;
	};
	const getNongliLine = (nongli)=>{
		if(!nongli){
			return '';
		}
		const leap = nongli.leap ? '闰' : '';
		return `${nongli.year || ''}年${leap}${nongli.month || ''}${nongli.day || ''}`;
	};
	const appendIf = (label, value)=>{
		if(value === undefined || value === null || value === ''){
			return;
		}
		lines.push(`${label}：${value}`);
	};
	const collectGodNames = (node)=>{
		if(!node){
			return [];
		}
		const all = [];
		if(Array.isArray(node.goodGods)){
			all.push(...node.goodGods);
		}
		if(Array.isArray(node.neutralGods)){
			all.push(...node.neutralGods);
		}
		if(Array.isArray(node.badGods)){
			all.push(...node.badGods);
		}
		return all.filter(Boolean);
	};
	const gzGodText = (zhu)=>{
		if(!zhu){
			return '无';
		}
		const whole = collectGodNames(zhu);
		const stem = collectGodNames(zhu.stem);
		const branch = collectGodNames(zhu.branch);
		const taiSui = zhu.branch && Array.isArray(zhu.branch.taisuiGods) ? zhu.branch.taisuiGods.filter(Boolean) : [];
		const wholeTxt = whole.length ? whole.join('、') : '无';
		const stemTxt = stem.length ? stem.join('、') : '无';
		const branchTxt = branch.length ? branch.join('、') : '无';
		const taiSuiTxt = taiSui.length ? taiSui.join('、') : '无';
		return `整柱=${wholeTxt}；天干=${stemTxt}；地支=${branchTxt}；太岁=${taiSuiTxt}`;
	};
	let baziGender = bazi && bazi.gender === 'Female' ? '坤造' : (bazi && bazi.gender === 'Male' ? '乾造' : '');
	if(!baziGender){
		if(Number(params.gender) === 0){
			baziGender = '坤造';
		}else if(Number(params.gender) === 1){
			baziGender = '乾造';
		}
	}

	lines.push('[起盘信息]');
	appendIf('日期', `${params.date} ${params.time}`);
	appendIf('时区', params.zone);
	appendIf('经纬度', `${params.lon} ${params.lat}`);
	appendIf('性别', formatLabel('gender', params.gender));
	appendIf('时间算法', formatLabel('timeAlg', params.timeAlg));
	appendIf('节气修正', formatLabel('adjustJieqi', params.adjustJieqi));
	appendIf('命造', baziGender);
	const nongli = bazi && bazi.nongli ? bazi.nongli : {};
	const nltxt = getNongliLine(nongli);
	const clockTm = nongli.clockTime || `${params.date} ${params.time}`;
	const solarTm = nongli.solarTime || nongli.birth || `${params.date} ${params.time}`;
	lines.push(`农历：${nltxt || '未知'}`);
	lines.push(`直接时间：${clockTm || '未知'}　真太阳时：${solarTm || '未知'}`);
	const jiedelta = nongli.jiedelta || '';
	const chef = nongli.chef || '';
	const tiaohou = Array.isArray(bazi.tiaohou) ? bazi.tiaohou.join('，') : '';
	const fixedLine = [jiedelta, chef].filter(Boolean).join('，');
	const fixedBase = (fixedLine || '立春后信息：无').replace(/[；，\s]+$/g, '');
	lines.push(`${fixedBase}； 调候：${tiaohou || '无'}`);

	lines.push('');
	lines.push('[四柱与三元]');
	lines.push(`年柱：${gzText(four.year)}`);
	lines.push(`月柱：${gzText(four.month)}`);
	lines.push(`日柱：${gzText(four.day)}`);
	lines.push(`时柱：${gzText(four.time)}`);
	lines.push(`胎元：${gzText(four.tai)}`);
	lines.push(`命宫：${gzText(four.ming)}`);
	lines.push(`身宫：${gzText(four.shen)}`);

	lines.push('');
	lines.push('[神煞（四柱与三元）]');
	lines.push(`年柱：${gzGodText(four.year)}`);
	lines.push(`月柱：${gzGodText(four.month)}`);
	lines.push(`日柱：${gzGodText(four.day)}`);
	lines.push(`时柱：${gzGodText(four.time)}`);
	lines.push(`胎元：${gzGodText(four.tai)}`);
	lines.push(`命宫：${gzGodText(four.ming)}`);
	lines.push(`身宫：${gzGodText(four.shen)}`);

	if(bazi.mainDirection && bazi.mainDirection.length){
		lines.push('');
		lines.push('[大运]');
		bazi.mainDirection.forEach((item, idx)=>{
			const y = item.year !== undefined ? `${item.year}` : '';
			const gz = getGz(item);
			lines.push(`第${idx + 1}步：${y} ${gz}`);
		});
	}

	if(bazi.direction && bazi.direction.length){
		lines.push('');
		lines.push('[流年行运概略]');
		bazi.direction.forEach((block, idx)=>{
			const startYear = block && block.startYear !== undefined ? `${block.startYear}` : '';
			const startAge = block && block.age !== undefined ? `${block.age}` : '';
			const dayunGz = getGz(block ? block.mainDirect : null);
			const startYearNum = block && block.startYear !== undefined ? Number(block.startYear) : null;
			const yearGzs = (block && block.subDirect && block.subDirect.length ? block.subDirect : [])
				.map((sub, subIdx)=>{
					const gz = getGz(sub);
					if(!gz){
						return '';
					}
					const yearNum = Number.isFinite(startYearNum) ? startYearNum + subIdx : null;
					if(Number.isFinite(yearNum)){
						return `${yearNum}-${gz}`;
					}
					return gz;
				})
				.filter(Boolean);
			lines.push(`板块${idx + 1}：起始年${startYear}，起始年龄${startAge}岁，大运${dayunGz}`);
			if(yearGzs.length){
				lines.push(`流年：${yearGzs.join(' ')}`);
			}
		});
	}

	// 多运限（批A）：仅挂载「每技法设置」显式选了流年/流月/流日/流时时追加；缺省不追加 → 快照与现状逐字一致。
	if(params && params.period){
		const periodLines = buildBaziPeriodLines(bazi, params.period);
		if(periodLines.length > 0){
			lines.push(...periodLines);
		}
	}
	return lines.join('\n');
}

// 供 AI 分析无头复算：按出生参数取数并生成八字快照文本（不依赖组件挂载）。
export async function buildBaziSnapshotForParams(params){
	if(!params){
		return '';
	}
	const rawResult = await fetchBaziDirectCached(params, { silent: true });
	const result = normalizeBaziResult(rawResult, params);
	if(!result){
		return '';
	}
	return buildBaziSnapshotText(params, result);
}

const BAZI_CACHE_MAX = 96;
const baziMem = new Map();
const baziInflight = new Map();
const baziDirectMem = new Map();
const baziDirectInflight = new Map();

function clonePlain(obj){
	if(obj === undefined || obj === null){
		return obj;
	}
	try{
		return JSON.parse(JSON.stringify(obj));
	}catch(e){
		return obj;
	}
}

function pushCache(map, key, val, max = BAZI_CACHE_MAX){
	if(!map || !key || val === undefined || val === null){
		return;
	}
	if(map.has(key)){
		map.delete(key);
	}
	map.set(key, val);
	if(map.size > max){
		const first = map.keys().next().value;
		if(first){
			map.delete(first);
		}
	}
}

function normalizeBaziGender(gender){
	if(gender === 'Male' || gender === 'Female'){
		return gender;
	}
	if(gender === false || `${gender}` === '0'){
		return 'Female';
	}
	if(gender === true || `${gender}` === '1'){
		return 'Male';
	}
	return '';
}

function normalizeBaziResult(result, params){
	if(!result){
		return result;
	}
	const next = {
		...result,
	};
	const bazi = {
		...(next.bazi || {}),
	};
	if(!bazi.gender){
		bazi.gender = next.gender || normalizeBaziGender(params ? params.gender : null);
	}
	next.bazi = bazi;
	next.coreOnly = !Array.isArray(bazi.direction) || bazi.direction.length === 0;
	return next;
}

function buildBaziKey(params){
	try{
		return JSON.stringify(params || {});
	}catch(e){
		return '';
	}
}

async function fetchBaziCached(params, options){
	const opt = options || {};
	const disableCache = opt.cache === false;
	const key = disableCache ? '' : buildBaziKey(params);
	if(key && baziMem.has(key)){
		return clonePlain(baziMem.get(key));
	}
	if(key && baziInflight.has(key)){
		const inflight = await baziInflight.get(key);
		return clonePlain(inflight);
	}
	try{
		const localResult = buildLocalBaziResult(params);
		if(key && localResult){
			pushCache(baziMem, key, clonePlain(localResult));
		}
		return clonePlain(localResult);
	}catch(e){
		// Fall through to the legacy service when the local Lunar calculator cannot parse old edge cases.
	}
	const req = request(`${Constants.ServerRoot}${BAZI_CORE_ENDPOINT}`, {
		body: JSON.stringify(params),
		silent: opt.silent !== false,
	}).then((data)=>{
		const result = data && data[Constants.ResultKey] ? data[Constants.ResultKey] : null;
		if(key && result){
			pushCache(baziMem, key, clonePlain(result));
		}
		return result;
	}).finally(()=>{
		if(key){
			baziInflight.delete(key);
		}
	});
	if(key){
		baziInflight.set(key, req);
	}
	const result = await req;
	return clonePlain(result);
}

async function fetchBaziDirectCached(params, options){
	const opt = options || {};
	const disableCache = opt.cache === false;
	const key = disableCache ? '' : buildBaziKey(params);
	if(key && baziDirectMem.has(key)){
		return clonePlain(baziDirectMem.get(key));
	}
	if(key && baziDirectInflight.has(key)){
		const inflight = await baziDirectInflight.get(key);
		return clonePlain(inflight);
	}
	try{
		const localResult = buildLocalBaziResult(params);
		if(key && localResult){
			pushCache(baziDirectMem, key, clonePlain(localResult));
		}
		return clonePlain(localResult);
	}catch(e){
		// Fall through to the legacy service when the local Lunar calculator cannot parse old edge cases.
	}
	const req = request(`${Constants.ServerRoot}${BAZI_DIRECT_ENDPOINT}`, {
		body: JSON.stringify(params),
		silent: opt.silent !== false,
	}).then((data)=>{
		const result = data && data[Constants.ResultKey] ? data[Constants.ResultKey] : null;
		if(key && result){
			pushCache(baziDirectMem, key, clonePlain(result));
		}
		return result;
	}).finally(()=>{
		if(key){
			baziDirectInflight.delete(key);
		}
	});
	if(key){
		baziDirectInflight.set(key, req);
	}
	const result = await req;
	return clonePlain(result);
}

class BaZi extends Component{
	constructor(props) {
		super(props);

		let bzopt = localStorage.getItem(BaZiOptKey);
		if(bzopt){
			// 本地值损坏不能让构造函数抛错白屏 → 回默认选项
			try{ bzopt = JSON.parse(bzopt); }catch(e){ bzopt = null; }
		}
		if(!bzopt){
			bzopt = {
				onlyZiGanShen: true,
			};
		}

		this.state = {
			result: null,
			baziOpt: bzopt,
			chartStyle: localStorage.getItem(BAZI_CHART_STYLE_KEY) === 'fine' ? 'fine' : 'simple',
			currentBaziKey: '',
			directResult: null,
			directKey: '',
			directLoading: false,
			directError: null,
			flowSelection: null,
		};

		this.unmounted = false;
		this.baziReqSeq = 0;
		this.prefetchTimer = null;

		this.requestBazi = this.requestBazi.bind(this);
		this.requestBaziDirect = this.requestBaziDirect.bind(this);
		this.prefetchBazi = this.prefetchBazi.bind(this);
		this.genParams = this.genParams.bind(this);
		this.onFieldsChange = this.onFieldsChange.bind(this);
		this.onBaziOptChange = this.onBaziOptChange.bind(this);
		this.onInfoTabChange = this.onInfoTabChange.bind(this);
		this.changeBaziChartStyle = this.changeBaziChartStyle.bind(this);
		this.onFlowSelectionChange = this.onFlowSelectionChange.bind(this);

		if(this.props.hook){
			this.props.hook.fun = (fields)=>{
				if(this.unmounted){
					return;
				}
				this.requestBazi(fields);
			};
		}

	}

	onFieldsChange(field){
		if(this.props.dispatch && this.props.fields){
			const patch = {
				...field,
			};
			const hasConfirmedFlag = Object.prototype.hasOwnProperty.call(patch, '__confirmed');
			const confirmed = hasConfirmedFlag ? !!patch.__confirmed : true;
			if(hasConfirmedFlag){
				delete patch.__confirmed;
			}
			// v2.2.1: 左栏改过 after23NewDay / lateZiHourUseNextDay 后,全局事件不再覆盖(共享 dva fields 路径)。
			if(field && Object.prototype.hasOwnProperty.call(field, 'after23NewDay')){
				this.props.dispatch({ type: 'astro/setAfter23BoundaryUserOverrode', payload: { value: true } });
			}
			if(field && Object.prototype.hasOwnProperty.call(field, 'lateZiHourUseNextDay')){
				this.props.dispatch({ type: 'astro/setLateZiHourUserOverrode', payload: { value: true } });
			}
			let flds = {
				fields: {
					...this.props.fields,
					...patch,
				}
			};
			this.props.dispatch({
				type: 'astro/save',
				payload: flds
			});
			if(!confirmed){
				if(this.prefetchTimer){
					clearTimeout(this.prefetchTimer);
				}
				this.prefetchTimer = setTimeout(()=>{
					this.prefetchTimer = null;
					if(this.unmounted){
						return;
					}
					this.prefetchBazi(flds.fields).catch(()=>{
						return null;
					});
				}, 240);
				return;
			}
			if(this.prefetchTimer){
				clearTimeout(this.prefetchTimer);
				this.prefetchTimer = null;
			}
			this.requestBazi(flds.fields, {
				silent: true,
			});
		}
	}
	
	onBaziOptChange(opt){
		this.setState({
			baziOpt: opt,
		}, ()=>{
			localStorage.setItem(BaZiOptKey, JSON.stringify(opt));
		});
	}

	changeBaziChartStyle(chartStyle){
		this.setState({
			chartStyle,
		}, ()=>{
			localStorage.setItem(BAZI_CHART_STYLE_KEY, chartStyle);
		});
	}

	onFlowSelectionChange(flowSelection){
		this.setState({
			flowSelection,
		});
	}

	genParams(fields){
		let flds = fields ? fields : this.props.fields;
		const params = {
			date: flds.date.value.format('YYYY-MM-DD'),
			time: flds.time.value.format('HH:mm:ss'),
			zone: flds.zone.value,
			lon: flds.lon.value,
			lat: flds.lat.value,
			gpsLat: flds.gpsLat.value,
			gpsLon: flds.gpsLon.value,
			gender: flds.gender.value,
			timeAlg: flds.timeAlg.value,
			phaseType: flds.phaseType.value,
			godKeyPos: flds.godKeyPos.value,
			after23NewDay: flds.after23NewDay.value,
			lateZiHourUseNextDay: flds.lateZiHourUseNextDay && flds.lateZiHourUseNextDay.value !== undefined ? flds.lateZiHourUseNextDay.value : 1,
			adjustJieqi: flds.adjustJieqi.value,
		}
		return params;
	}

	async prefetchBazi(fields){
		if(fields === undefined || fields === null){
			return;
		}
		const params = this.genParams(fields);
		await fetchBaziCached(params, {
			silent: true,
		});
	}

	async requestBazi(fields, options){
		if(fields === undefined || fields === null){
			return;
		}
		const params = this.genParams(fields);
		const currentBaziKey = buildBaziKey(params);
		const opt = options || {};
		const seq = ++this.baziReqSeq;
		const rawResult = await fetchBaziCached(params, {
			silent: opt.silent !== false,
		});
		const result = normalizeBaziResult(rawResult, params);
		if(!result || this.unmounted || seq !== this.baziReqSeq){
			return;
		}

		const st = {
			result: result,
			currentBaziKey,
			directResult: result && result.local ? result : (this.state.currentBaziKey === currentBaziKey ? this.state.directResult : null),
			directKey: result && result.local ? currentBaziKey : (this.state.currentBaziKey === currentBaziKey ? this.state.directKey : ''),
			directLoading: this.state.currentBaziKey === currentBaziKey ? this.state.directLoading : false,
			directError: this.state.currentBaziKey === currentBaziKey ? this.state.directError : null,
			flowSelection: this.state.currentBaziKey === currentBaziKey ? this.state.flowSelection : null,
		};

		this.setState(st);
		// 惰性构建:快照文本拼装挪出排盘关键路径(params/result 为局部量,闭包安全)。
		saveModuleAISnapshotLazy('bazi', ()=>buildBaziSnapshotText(params, result), {
			date: params.date,
			time: params.time,
			zone: params.zone,
			lon: params.lon,
			lat: params.lat,
		});
	}

	async requestBaziDirect(){
		if(!this.props.fields){
			return;
		}
		const params = this.genParams(this.props.fields);
		const key = buildBaziKey(params);
		if(this.state.directResult && this.state.directKey === key){
			return;
		}
		if(this.state.directLoading && this.state.directKey === key){
			return;
		}
		this.setState({
			directLoading: true,
			directError: null,
			directKey: key,
		});
		try{
			const rawResult = await fetchBaziDirectCached(params, {
				silent: true,
			});
			const result = normalizeBaziResult(rawResult, params);
			if(this.unmounted || buildBaziKey(this.genParams(this.props.fields)) !== key){
				return;
			}
			this.setState({
				directResult: result,
				directKey: key,
				directLoading: false,
				directError: null,
			});
		}catch(e){
			if(this.unmounted){
				return;
			}
			this.setState({
				directLoading: false,
				directError: '行运数据加载失败',
			});
		}
	}

	onInfoTabChange(key){
		if(`${key}` === '0'){
			this.requestBaziDirect();
		}
	}


	componentDidMount(){
		this.unmounted = false;
		if(this.props.fields){
			this.requestBazi(this.props.fields, {
				silent: true,
			});
		}
	}

	componentWillUnmount(){
		this.unmounted = true;
		if(this.prefetchTimer){
			clearTimeout(this.prefetchTimer);
			this.prefetchTimer = null;
		}
	}

	render(){
		let height = this.props.height ? this.props.height : 760;
		if(height === '100%'){
			height = '100%'
		}else{
			height = Math.max(320, height - 8);
		}
		let tabHeight = height - 20;

		let bazi = this.state.result ? this.state.result.bazi : {};
		const directBazi = this.state.directResult && this.state.directResult.bazi ? this.state.directResult.bazi : null;
		const baziParams = this.props.fields ? this.genParams(this.props.fields) : {};
		const isFineChart = this.state.chartStyle === 'fine';
		const isLegacyUi = this.state.baziOpt && this.state.baziOpt.uiMode === 'legacy';
		const chartHeight = typeof height === 'number' ? Math.max(360, Math.round(height * 0.62)) : height;
		const flowHeight = typeof height === 'number' ? Math.max(220, height - chartHeight - 18) : 240;

		return (
			<div className={`horosa-bazi-page horosa-astro-redesign horosa-bazi-redesign ${isLegacyUi ? 'horosa-bazi-legacy-ui' : ''}`}>
				<div className="horosa-astro-layout horosa-astro-redesign-layout horosa-bazi-redesign-layout">
					<div className="horosa-astro-redesign-grid horosa-bazi-redesign-grid">
						<div className="horosa-astro-context-panel horosa-astro-input-panel horosa-bazi-input-panel">
							<CnTraditionInput
								fields={this.props.fields}
								baziOpt={this.state.baziOpt}
								onFieldsChange={this.onFieldsChange}
								onBaziOptChange={this.onBaziOptChange}
							/>
						</div>
						<div className="horosa-chart-stage horosa-chart-stage-redesign horosa-bazi-chart-panel xq-chart-renderer xq-chart-renderer-bazi">
							{isLegacyUi ? (
								<BaZiLegacyMain value={bazi} fields={this.props.fields} baziOpt={this.state.baziOpt} />
							) : (
								<div className={`horosa-bazi-main-stack ${isFineChart ? 'horosa-bazi-main-stack-fine' : ''}`}>
									<div className="horosa-bazi-main-chart-slot" data-capture-chart-only>
										<PaiBaZi
											value={bazi}
											height={isFineChart ? 'auto' : chartHeight}
											fields={this.props.fields}
											baziOpt={this.state.baziOpt}
											chartStyle={this.state.chartStyle}
											onChartStyleChange={this.changeBaziChartStyle}
											showStyleSwitch={false}
											flowSelection={this.state.flowSelection}
										/>
									</div>
									<div className="horosa-bazi-main-flow-slot">
										<BaZiLuckFlowPanel
											coreValue={bazi}
											fullValue={directBazi}
											height={flowHeight}
											loading={this.state.directLoading}
											error={this.state.directError}
											jieqiParams={baziParams}
											onLoad={this.requestBaziDirect}
											onSelectionChange={this.onFlowSelectionChange}
											compact
										/>
									</div>
								</div>
							)}
						</div>
						<div className="horosa-inspector-panel horosa-astro-content-panel horosa-bazi-info-panel">
							{isLegacyUi ? (
								<BaZiLegacyInfoPanel value={bazi} fields={this.props.fields} height={tabHeight} />
							) : (
								<BaZiAppInfoPanel value={bazi} fields={this.props.fields} height={tabHeight} />
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}

}

export default BaZi;
