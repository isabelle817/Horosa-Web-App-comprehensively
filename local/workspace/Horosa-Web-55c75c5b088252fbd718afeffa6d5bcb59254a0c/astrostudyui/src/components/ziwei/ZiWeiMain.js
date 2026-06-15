import { Component } from 'react';
import { Row, Col } from 'antd';
import { XQButton as Button, XQModal as Modal, XQTabs as Tabs } from '../xq-ui';
import XQIcon from '../xq-icons';
import * as Constants from '../../utils/constants';
import request from '../../utils/request';
import {randomStr,} from '../../utils/helper';
import ZiWeiInput from './ZiWeiInput';
import ZiWeiChart from './ZiWeiChart';
import ZWRuleMain from '../ruleziwei/ZWRuleMain';
import ZWLuckPanel, {
	buildDaxianItems,
	buildLiunianItems,
	buildLiuyueItems,
	buildLiuriItems,
	buildLiushiItems,
	houseName as luckHouseName,
	houseIdxByBranch as luckHouseIdxByBranch,
} from './ZWLuckPanel';
import ZWPatternPanel from './ZWPatternPanel';
import TipsBoard from '../comp/TipsBoard';
import * as ZiWeiHelper from './ZiWeiHelper';
import * as ZWText from '../../constants/ZWText';
import * as ZWConst from '../../constants/ZWConst';
import DateTime from '../comp/DateTime';
import { saveModuleAISnapshotLazy, } from '../../utils/moduleAiSnapshot';
import { ziweirulesCached } from '../../services/rules';
import { defaultAfter23NewDay, defaultLateZiHourUseNextDay } from '../../utils/dayBoundary';

const TabPane = Tabs.TabPane;

function normalizeGan(value){
	if(!value){
		return '';
	}
	return `${value}`.trim().charAt(0);
}

function pickYearGan(chart){
	if(!chart){
		return '';
	}
	if(chart.yearGan){
		return normalizeGan(chart.yearGan);
	}
	if(chart.nongli && chart.nongli.yearGanZi){
		return normalizeGan(chart.nongli.yearGanZi);
	}
	if(chart.nongli && chart.nongli.year){
		return normalizeGan(chart.nongli.year);
	}
	return '';
}

function collectHouseStars(house){
	const groups = [
		'starsMain',
		'starsAssist',
		'starsEvil',
		'starsOthersGood',
		'starsOthersBad',
		'starsSmall',
		'stars',
	];
	const out = [];
	const seen = new Set();
	groups.forEach((key)=>{
		const arr = house && house[key] ? house[key] : [];
		arr.forEach((item)=>{
			let name = '';
			if(typeof item === 'string'){
				name = item;
			}else{
				name = item && (item.name || item.id) ? (item.name || item.id) : '';
			}
			name = `${name || ''}`.trim();
			if(!name || seen.has(name)){
				return;
			}
			seen.add(name);
			out.push(name);
		});
	});
	return out;
}

function formatStarSiHua(starName, yearGan, lifeGan, palaceGan){
	const tags = [];
	if(yearGan){
		const yearHua = ZiWeiHelper.getSiHua(starName, yearGan);
		if(yearHua){
			tags.push(`生年${yearHua}`);
		}
	}
	if(lifeGan){
		const lifeHua = ZiWeiHelper.getSiHua(starName, lifeGan);
		if(lifeHua){
			tags.push(`命宫${lifeHua}`);
		}
	}
	// 宫干自化（飞星紫微核心，Mac issue #11：用户反馈挂载缺自化信息）：星曜被「所落宫位本身天干」
	// 引动的四化。用所落宫干复算，getSiHua 自动按当前流派四化表取值（与生年/命宫四化同口径）。
	if(palaceGan){
		const selfHua = ZiWeiHelper.getSiHua(starName, palaceGan);
		if(selfHua){
			tags.push(`自化${selfHua}`);
		}
	}
	if(tags.length === 0){
		return starName;
	}
	return `${starName}（${tags.join('，')}）`;
}

function getLifeHouse(chart, houses){
	if(!chart || !houses || houses.length === 0){
		return null;
	}
	if(chart.lifeHouseIndex !== undefined && chart.lifeHouseIndex !== null){
		const idx = Number(chart.lifeHouseIndex);
		if(!Number.isNaN(idx) && houses[idx]){
			return houses[idx];
		}
	}
	return houses.find((house)=>`${house.name || ''}`.includes('命')) || null;
}

const ZW_PERIOD_LEVEL_LABEL = { daxian: '大限', liunian: '流年', liuyue: '流月', liuri: '流日', liushi: '流时' };

// 单层运限 → 文本块（四化落宫 + 流曜 + 三方四正星情, 复用 ZiWeiHelper.getLayerSihua/getFlowStars/collectFourPalaceStars,
// 与盘面交互卡同口径）。
// 用户增量(v1.9): 末尾追加"三方四正"四宫星曜列表,让 AI 看到该时段真实的三合宫位星情,提高流年判断准度。
function formatLuckLayerLines(chart, layer, levelLabel, subText){
	const lines = [];
	const mingIdx = layer.mingIndex;
	const oppIdx = ((mingIdx % 12) + 6) % 12;
	const head = `${levelLabel}：${layer.ganzi || ''}${subText ? `（${subText}）` : ''}`
		+ `，命宫【${luckHouseName(chart, mingIdx, true)}】·对宫【${luckHouseName(chart, oppIdx, true)}】`;
	lines.push(head);
	const sihua = ZiWeiHelper.getLayerSihua(chart, layer.gan) || [];
	if(sihua.length > 0){
		const parts = sihua.map((h)=>`${h.star}化${h.hua}（${luckHouseName(chart, h.houseIndex, true)}）`);
		lines.push(`四化：${parts.join('、')}`);
	}
	const flowStars = ZiWeiHelper.getFlowStars(layer.gan, layer.zhi) || [];
	if(flowStars.length > 0){
		const parts = flowStars.map((s)=>`${s.name}（${luckHouseName(chart, luckHouseIdxByBranch(chart, s.zhi), true)}）`);
		lines.push(`流曜：${parts.join('、')}`);
	}
	// 运限三合(用户修正): 仅追加运财帛宫 + 运官禄宫(本宫和对宫已在 head 行).
	// label 用"运财帛宫【原命盘宫名·干支】" 让 AI 明确"这是该段时间的财帛宫,落在原命盘 X 宫位置"
	try {
		const sanhe = ZiWeiHelper.collectSanhePalaces(chart, mingIdx);
		if(sanhe && sanhe.length === 2){
			lines.push('运限三合：');
			sanhe.forEach((p)=>{
				const starsText = (p.stars && p.stars.length) ? p.stars.join('、') : '(无主辅星)';
				const gz = p.ganZhi ? `·${p.ganZhi}` : '';
				lines.push(`  ${p.runName}【${p.palaceName}${gz}】：${starsText}`);
			});
		}
	} catch(_) { /* defensive: 缺数据时不阻塞快照 */ }
	return lines;
}

// 多选运限上限：所有层级合计段数封顶，防快照爆（超限截断 + 追加提示行）。
const ZW_PERIOD_MAX_SEGMENTS = 50;

// 找某公历年所属的大限：逐大限构造 10 流年，命中该年即返回（复用 buildLiunianItems，零新算法）。
function findDaxianForYear(chart, daxianItems, year){
	for(let i = 0; i < daxianItems.length; i++){
		const items = buildLiunianItems(chart, daxianItems[i]);
		if(items.some((x)=>x.year === year)){
			return { daxian: daxianItems[i], liunianItems: items, liunian: items.find((x)=>x.year === year) || null };
		}
	}
	return null;
}

// 按挂载所选运限层（多选）产出 [运限] 段。
// period={daxian:[mingIndex...], liunian:[year...], liuyue:[month...], liuri:[day...], liushi:[hourIdx...]}。
// 语义（用户拍板）：大限/流年/流月对所选每项各产一段（流年×流月笛卡尔）；流日/流时锚定到所选的第一个上层。
// 总段数封顶 ZW_PERIOD_MAX_SEGMENTS，超限截断并追加提示行。全空 → 不产段（上游已用 null 守现状）。
function buildZiweiPeriodLines(chart, period){
	if(!chart || !chart.houses || !period){
		return [];
	}
	const daxianItems = buildDaxianItems(chart);
	if(daxianItems.length === 0){
		return [];
	}
	const arr = (v)=>(Array.isArray(v) ? v : []);
	const daxianSel = arr(period.daxian);
	const liunianSel = arr(period.liunian);
	const liuyueSel = arr(period.liuyue);
	const liuriSel = arr(period.liuri);
	const liushiSel = arr(period.liushi);

	const body = [];
	let truncated = false;
	// 推入一段（已含层文本）；到达上限即停止后续推入并标记截断。
	const pushSeg = (segLines)=>{
		if(truncated){ return; }
		if(body.length >= ZW_PERIOD_MAX_SEGMENTS){
			truncated = true;
			return;
		}
		body.push(segLines);
	};

	// 1) 大限：每个所选宫位序各一段。
	daxianSel.forEach((mingIndex)=>{
		const dx = daxianItems.find((d)=>d.mingIndex === mingIndex);
		if(dx){
			pushSeg(formatLuckLayerLines(chart, dx, ZW_PERIOD_LEVEL_LABEL.daxian, `${dx.start}~${dx.end}岁`));
		}
	});

	// 2) 流年：每个所选公历年各一段（解析其所属大限）。
	// 坑修：所选流年超出全部大限范围 → 补提示行而非静默跳过（与八字「超出大运范围」口径对齐）。
	const inRangeYears = [];
	liunianSel.forEach((year)=>{
		const ctx = findDaxianForYear(chart, daxianItems, year);
		if(ctx && ctx.liunian){
			inRangeYears.push(year);
			pushSeg(formatLuckLayerLines(chart, ctx.liunian, ZW_PERIOD_LEVEL_LABEL.liunian, `${ctx.liunian.year}年`));
		}else{
			pushSeg([`流年：${year}年（超出大限范围，未列流年）`]);
		}
	});

	// 流月/流日/流时所需的基准年集合：所选流年中「在大限范围内」的年（避免流年不列、流月却列的语义错位）；
	// 若未选流年，则用首个大限的首年兜底（绝不抛）。
	const baseYears = liunianSel.length
		? inRangeYears
		: [(buildLiunianItems(chart, daxianItems[0])[0] || {}).year].filter((y)=>Number.isFinite(y));

	// 3) 流月：流年 × 流月 笛卡尔——每个 (year, month) 各一段。
	if(liuyueSel.length){
		baseYears.forEach((year)=>{
			const liuyueItems = buildLiuyueItems(chart, year);
			liuyueSel.forEach((month)=>{
				const ly = liuyueItems.find((x)=>x.month === month);
				if(ly){
					pushSeg(formatLuckLayerLines(chart, ly, ZW_PERIOD_LEVEL_LABEL.liuyue, `${year}年${ly.month}月`));
				}
			});
		});
	}

	// 锚定上层：流日 → 第一个 (year, month)；流时 → 第一个 (year, month, day)。
	const anchorYear = Number.isFinite(baseYears[0]) ? baseYears[0] : null;
	const anchorMonth = liuyueSel.length ? liuyueSel[0] : null;

	// 4) 流日：锚定 (anchorYear, anchorMonth)；anchorMonth 缺省取该年首月（正月）。
	if(liuriSel.length && anchorYear !== null){
		const liuyueItems = buildLiuyueItems(chart, anchorYear);
		const anchorLiuyue = anchorMonth !== null
			? (liuyueItems.find((x)=>x.month === anchorMonth) || liuyueItems[0])
			: liuyueItems[0];
		if(anchorLiuyue){
			const liuriItems = buildLiuriItems(chart, anchorYear, anchorLiuyue);
			liuriSel.forEach((day)=>{
				const lr = liuriItems.find((x)=>x.day === day);
				if(lr){
					pushSeg(formatLuckLayerLines(chart, lr, ZW_PERIOD_LEVEL_LABEL.liuri, `${anchorYear}年${anchorLiuyue.month}月${lr.day}日`));
				}
			});
		}
	}

	// 5) 流时：锚定 (anchorYear, anchorMonth, 首个所选流日/否则初一)。
	if(liushiSel.length && anchorYear !== null){
		const liuyueItems = buildLiuyueItems(chart, anchorYear);
		const anchorLiuyue = anchorMonth !== null
			? (liuyueItems.find((x)=>x.month === anchorMonth) || liuyueItems[0])
			: liuyueItems[0];
		if(anchorLiuyue){
			const liuriItems = buildLiuriItems(chart, anchorYear, anchorLiuyue);
			const anchorDay = liuriSel.length ? liuriSel[0] : null;
			const anchorLiuri = anchorDay !== null
				? (liuriItems.find((x)=>x.day === anchorDay) || liuriItems[0])
				: liuriItems[0];
			if(anchorLiuri){
				const liushiItems = buildLiushiItems(chart, anchorLiuri);
				liushiSel.forEach((hourIdx)=>{
					const ls = liushiItems[hourIdx];
					if(ls){
						pushSeg(formatLuckLayerLines(chart, ls, ZW_PERIOD_LEVEL_LABEL.liushi,
							`${anchorYear}年${anchorLiuyue.month}月${anchorLiuri.day}日`));
					}
				});
			}
		}
	}

	if(body.length === 0){
		return [];
	}
	const lines = ['[运限]'];
	body.forEach((segLines)=>{ lines.push(...segLines); });
	if(truncated){
		lines.push(`（运限段已达上限 ${ZW_PERIOD_MAX_SEGMENTS} 段，余下所选组合已省略）`);
	}
	lines.push('');
	return lines;
}

function buildZiWeiSnapshotText(params, result){
	const chart = result && result.chart ? result.chart : {};
	const houses = chart.houses || [];
	const yearGan = pickYearGan(chart);
	const lifeHouse = getLifeHouse(chart, houses);
	const lifeGan = lifeHouse && lifeHouse.ganzi ? normalizeGan(lifeHouse.ganzi) : '';
	const lines = [];

	lines.push('[起盘信息]');
	lines.push(`日期：${params.date} ${params.time}`);
	lines.push(`时区：${params.zone}`);
	lines.push(`经纬度：${params.lon} ${params.lat}`);
	lines.push(`性别：${params.gender}`);
	lines.push(`时间算法：${params.timeAlg === 1 ? '直接时间' : '真太阳时'}`);
	const schoolLabel = { beipai: '北派·飞星', zhongzhou: '中州派', custom: '自定义' }[ZWConst.ZWSchool.school] || '北派·飞星';
	lines.push(`四化流派：${schoolLabel}`);
	if(yearGan){
		lines.push(`生年天干：${yearGan}`);
	}
	if(lifeHouse && lifeHouse.name){
		lines.push(`命宫：${lifeHouse.name}${lifeHouse.ganzi ? `（${lifeHouse.ganzi}）` : ''}`);
	}
	if(lifeGan){
		lines.push(`命宫天干：${lifeGan}`);
	}

	lines.push('');
	lines.push('[宫位总览]');
	houses.forEach((house, idx)=>{
		const name = house.name || house.id || `宫位${idx + 1}`;
		const ganzi = house.ganzi || '';
		const palaceGan = ganzi ? normalizeGan(ganzi) : '';
		const direction = house.direction && house.direction.length === 2 ? `${house.direction[0]}~${house.direction[1]}` : '';
		const stars = collectHouseStars(house);
		lines.push(`${name}：大限=${direction || '无'}，干支=${ganzi || '无'}`);
		if(stars.length > 0){
			lines.push(`星曜：${stars.map((starName)=>formatStarSiHua(starName, yearGan, lifeGan, palaceGan)).join('、')}`);
		}else{
			lines.push('星曜：无');
		}
		lines.push('');
	});

	if(yearGan){
		const laiyin = houses.filter((house)=> house.ganzi && house.ganzi.charAt(0) === yearGan)
			.map((house)=> `${house.name || ''}（${house.ganzi}）`);
		if(laiyin.length > 0){
			lines.push('[来因宫]');
			lines.push(laiyin.join('、'));
			lines.push('');
		}
	}

	const patterns = result && result.patterns ? result.patterns : [];
	if(patterns.length > 0){
		lines.push('[命中格局]');
		patterns.forEach((p)=>{
			lines.push(`${p.name}（${p.category || ''}${p.broken ? '·破' : ''}）：${p.duanyi || ''}`);
		});
		lines.push('');
	}

	// 运限层（仅挂载「每技法设置」显式选了运限时追加；缺省不追加 → 快照与现状逐字一致）。
	if(params && params.period){
		const periodLines = buildZiweiPeriodLines(chart, params.period);
		if(periodLines.length > 0){
			lines.push(...periodLines);
		}
	}

	return lines.join('\n');
}

// 供 AI 分析无头复算：按出生参数取盘并生成紫微快照文本（不依赖组件挂载）。
export async function buildZiweiSnapshotForParams(params){
	if(!params){
		return '';
	}
	// 挂载「每技法设置」可指定四化流派(params.sihuaSchool)。流派由可变单例 ZWSchool.school + getActiveSiHuaGan
	// 驱动(snapshot/格局判定都读它),故须临时切换 + 用毕还原,避免污染全局现状(与 ZiWeiInput 切流派同口径)。
	const overrideSchool = params.sihuaSchool && `${params.sihuaSchool}` !== '' ? `${params.sihuaSchool}` : null;
	const prevSchool = ZWConst.ZWSchool.school;
	if(overrideSchool && overrideSchool !== prevSchool){
		ZWConst.ZWSchool.school = overrideSchool;
		ZWConst.refreshActiveSiHua();
		// P1-A 不变量:切流派必须同时失效四化缓存(getSiHua 懒初始化,不清不会按新表重建),
		// 否则快照里星曜级四化仍是旧流派、与 p.sihua 自相矛盾(ZiWeiInput.applySihuaSchool 同口径)。
		ZiWeiHelper.resetHuaMap();
	}
	try{
		const p = { ...params };
		// 这两键只供前端本地消费,不发后端(后端按白名单忽略,但避免无谓体积/缓存键扰动一并删掉)。
		delete p.sihuaSchool;
		delete p.period;
		const school = ZWConst.ZWSchool.school;
		if(school && school !== 'beipai'){
			p.sihua = ZWConst.getActiveSiHuaGan();
		}
		const data = await request(`${Constants.ServerRoot}/ziwei/birth`, {
			body: JSON.stringify(p),
			silent: true,
		});
		const result = data && data[Constants.ResultKey] ? data[Constants.ResultKey] : null;
		if(!result || !result.chart){
			return '';
		}
		return buildZiWeiSnapshotText(params, result);
	}finally{
		if(overrideSchool && overrideSchool !== prevSchool){
			ZWConst.ZWSchool.school = prevSchool;
			ZWConst.refreshActiveSiHua();
			ZiWeiHelper.resetHuaMap();
		}
	}
}

function getFieldValue(fields, key, fallback = ''){
	const field = fields && fields[key] ? fields[key] : null;
	if(!field || field.value === undefined || field.value === null || field.value === ''){
		return fallback;
	}
	return field.value;
}

function buildZiWeiInfoData(chart, fields){
	if(!chart || !chart.nongli){
		return { rows: [], bazi: [], directions: [] };
	}
	const nongli = chart.nongli || {};
	const timeAlg = chart.timeAlg !== undefined && chart.timeAlg !== null ? chart.timeAlg : getFieldValue(fields, 'timeAlg', 0);
	const birthPrefix = timeAlg === 1 ? '直接时间' : '真太阳时';
	const leap = nongli.leap ? '闰' : '';
	const ju = `${ZWText.ZWMsg[chart.yearPolar] || ''}${ZWText.ZWMsg[chart.gender] || ''} ${chart.wuxingJuText || ''}`.trim();
	const rows = [
		['姓名', getFieldValue(fields, 'name', '匿名')],
		['命主', chart.lifeMaster || '—'],
		['身主', chart.bodyMaster || '—'],
		['子斗', chart.zidou || '—'],
		['斗君', chart.doujun || '—'],
		['命局', ju || '—'],
		[birthPrefix, nongli.birth || '—'],
		['农历', `${nongli.year || ''}年 ${leap}${nongli.month || ''}${nongli.day || ''} ${nongli.time ? nongli.time.charAt(1) : ''}时`.trim()],
		['时区', chart.zone || getFieldValue(fields, 'zone', '—')],
		['经纬度', `${chart.lon || getFieldValue(fields, 'lon', '—')}，${chart.lat || getFieldValue(fields, 'lat', '—')}`],
	];
	const bz = chart.bazi && chart.bazi.bazi ? chart.bazi.bazi : {};
	const bazi = [
		{ label: '年', value: bz.year && bz.year.ganzi ? bz.year.ganzi : '—' },
		{ label: '月', value: bz.month && bz.month.ganzi ? bz.month.ganzi : '—' },
		{ label: '日', value: bz.day && bz.day.ganzi ? bz.day.ganzi : '—' },
		{ label: '时', value: bz.time && bz.time.ganzi ? bz.time.ganzi : '—' },
	];
	const directions = chart.bazi && chart.bazi.direct && chart.bazi.direct.direction
		? chart.bazi.direct.direction.map((item, idx)=>{
			const age = item.age + 1;
			return {
				age: age < 10 ? `0${age}` : `${age}`,
				gz: item.mainDirect && item.mainDirect.ganzi ? item.mainDirect.ganzi : '—',
				startYear: item.startYear,
				key: `${idx}-${item.startYear || ''}`,
			};
		})
		: [];
	return { rows, bazi, directions };
}

class ZiWeiMain extends Component{
	constructor(props) {
		super(props);
		this.state = {
			result: null,
			rules: null,
			currentDirectionIndex: null,
			indicator: null,
			cnt: 0,
			tips: null,
			centerInfoVisible: false,
			luckMingIndex: null,
		};

		this.unmounted = false;

		this.requestZiWei = this.requestZiWei.bind(this);
		this.genParams = this.genParams.bind(this);
		this.onFieldsChange = this.onFieldsChange.bind(this);
		this.onChangeDirection = this.onChangeDirection.bind(this);
		this.getNowDirectionIdx = this.getNowDirectionIdx.bind(this);
		this.genDirectionDom = this.genDirectionDom.bind(this);
		this.indicate = this.indicate.bind(this);
		this.onTipClick = this.onTipClick.bind(this);
		this.openCenterInfo = this.openCenterInfo.bind(this);
		this.closeCenterInfo = this.closeCenterInfo.bind(this);
		this.openDrawer = this.openDrawer.bind(this);
		this.navigateFeature = this.navigateFeature.bind(this);
		this.navigateDirectionTool = this.navigateDirectionTool.bind(this);
		this.renderBottomQuickDock = this.renderBottomQuickDock.bind(this);
		this.onLuckChange = this.onLuckChange.bind(this);

		if(this.props.hook){
			this.props.hook.fun = (fields)=>{
				if(this.unmounted){
					return;
				}
				this.requestZiWei(fields);
			};
		}
	}

	onFieldsChange(field){
		if(this.props.dispatch && this.props.fields){
			const patch = {
				...field,
			};
			const confirmed = !!patch.__confirmed;
			if(Object.prototype.hasOwnProperty.call(patch, '__confirmed')){
				delete patch.__confirmed;
			}
			// 用户拍板: 左栏改过 after23NewDay 后,全局事件不再覆盖。
			if(field && Object.prototype.hasOwnProperty.call(field, 'after23NewDay')){
				this._after23BoundaryUserOverrode = true;
				this.props.dispatch({ type: 'astro/setAfter23BoundaryUserOverrode', payload: { value: true } });
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
			if(confirmed || !Object.prototype.hasOwnProperty.call(field || {}, '__confirmed')){
				this.requestZiWei(flds.fields);
			}
		}
	}

	onChangeDirection(value){
		let ind = this.state.indicator;
		let cnt = this.state.cnt;
		this.setState({
			currentDirectionIndex: value,
			indicator: ind,
			cnt: cnt+1,
		});
	}

	genParams(fields){
		let flds = fields ? fields : this.props.fields;
		const timeAlg = (flds.timeAlg && flds.timeAlg.value !== undefined && flds.timeAlg.value !== null)
			? flds.timeAlg.value
			: 0;
		const params = {
			date: flds.date.value.format('YYYY-MM-DD'),
			time: flds.time.value.format('HH:mm:ss'),
			zone: flds.zone.value,
			lon: flds.lon.value,
			lat: flds.lat.value,
			gpsLat: flds.gpsLat.value,
			gpsLon: flds.gpsLon.value,
			gender: flds.gender.value,
			timeAlg: timeAlg === 1 ? 1 : 0,
			after23NewDay: defaultAfter23NewDay(),
			lateZiHourUseNextDay: defaultLateZiHourUseNextDay(),
		}
		// P2-1：非默认流派时附四化表，使后端格局判定随流派；beipai(现状)不附＝缓存键不变＝零回归。
		const school = ZWConst.ZWSchool.school;
		if(school && school !== 'beipai'){
			params.sihua = ZWConst.getActiveSiHuaGan();
		}
		return params;
	}

	async requestZiWei(fields){
		if(fields === undefined || fields === null){
			return;
		}
		const params = this.genParams(fields);

		// 并行 + rules 会话缓存:rules 与本盘无关(body 恒 {}),原串行瀑布白付一次 RTT;
		// 启动已 prime 缓存(models/app.js dispatch rules/ziwei),此处通常零成本命中。
		// 任一失败整体 throw、不 setState,与原「串行中途失败不 setState」口径一致。
		const [data, rules] = await Promise.all([
			request(`${Constants.ServerRoot}/ziwei/birth`, {
				body: JSON.stringify(params),
			}),
			ziweirulesCached({}),
		]);
		const result = data[Constants.ResultKey]

		let currentIdx = this.getNowDirectionIdx(result.chart);

		const st = {
			result: result,
			rules: rules[Constants.ResultKey],
			currentDirectionIndex: currentIdx,
			luckMingIndex: null,
		};


		this.setState(st);
		// 惰性构建:12 宫×星曜×四化遍历挪出排盘关键路径(params/result 为本函数局部量,闭包安全;
		// builder 读的全局流派 ZWConst.ZWSchool 若在 idle 前被切换,切换路径必经 requestZiWei
		// 重排 → 新 save 覆盖本 pending,latest-wins 兜底)。
		saveModuleAISnapshotLazy('ziwei', ()=>buildZiWeiSnapshotText(params, result), {
			date: params.date,
			time: params.time,
			zone: params.zone,
			lon: params.lon,
			lat: params.lat,
		});
	}

	getNowDirectionIdx(chartobj){
		if(chartobj.birth === undefined || chartobj.birth === null){
			return null;
		}
		let now = new DateTime();
		let y = now.format('YYYY');
		let year = parseInt(y);
		let birth = parseInt(chartobj.birth.substr(0,4));
		let age = year - birth + 1;
		for(let i = 0; i<12; i++){
			let house = chartobj.houses[i];
			if(house.direction[0]<= age && age<=house.direction[1]){
				return i;
			}
		}
		return null;
	}

	genDirectionDom(chart){
		if(chart.houses === undefined || chart.houses === null){
			return null;
		}
		let startidx = chart.lifeHouseIndex;

		let dom = [];
		for(let i=0; i<12; i++){
			let idx = 0;
			if(ZiWeiHelper.isDirCloseWise(chart)){
				idx = (startidx + i) % 12;
			}else{
				idx = (startidx - i + 12) % 12;
			}
			let house = chart.houses[idx];
			let txt1 = house.direction[0] + '~' + house.direction[1];
			let txt2 = house.ganzi + '限';
			let lbl = (
				<Row>
					<Col span={24} style={{textAlign: 'center'}}>{txt1}</Col>
					<Col span={24} style={{textAlign: 'center'}}>{txt2}</Col>
				</Row>
			);
			let btntype = null;
			if(this.state.currentDirectionIndex !== null && this.state.currentDirectionIndex === idx){
				btntype = 'primary';
			}
			let rad = (
				<Col span={8} key={idx}>
					<Button 
						className="horosa-ziwei-direction-button"
						type={btntype}
						onClick={()=>{this.onChangeDirection(idx);}} 
						style={{width: '100%', height: 50}}
					>
						{lbl}
					</Button>
				</Col>
			);
			dom.push(rad);
		}
		return dom;
	}

	indicate(zwIndicator){
		this.setState({
			indicator: zwIndicator,
		});
	}

	onTipClick(tipobj){
		this.setState({
			tips: tipobj,
		});
	}

	openCenterInfo(){
		this.setState({
			centerInfoVisible: true,
		});
	}

	closeCenterInfo(){
		this.setState({
			centerInfoVisible: false,
		});
	}

	onLuckChange(idx){
		this.setState({
			luckMingIndex: (idx === undefined || idx === null) ? null : idx,
		});
	}

	openDrawer(key){
		if(this.props.dispatch){
			this.props.dispatch({
				type: 'astro/openDrawer',
				payload: {
					key,
				},
			});
		}
	}

	navigateFeature(key){
		if(this.props.onNavigate){
			this.props.onNavigate(key);
			return;
		}
		if(this.props.dispatch){
			this.props.dispatch({
				type: 'astro/save',
				payload: {
					currentTab: key,
				},
			});
		}
	}

	navigateDirectionTool(subTab){
		if(this.props.dispatch){
			this.props.dispatch({
				type: 'astro/save',
				payload: {
					currentTab: 'direction',
					currentSubTab: subTab,
				},
			});
			return;
		}
		this.navigateFeature('direction');
	}

	renderBottomQuickDock(){
		const actions = [
			{ label: '主限', icon: 'quickPrimary', onClick: ()=>this.navigateDirectionTool('primarydirect') },
			{ label: '法达', icon: 'quickFirdaria', onClick: ()=>this.navigateDirectionTool('firdaria') },
			{ label: '小限', icon: 'quickProfection', onClick: ()=>this.navigateDirectionTool('profection') },
			{ label: '返照', icon: 'quickReturn', onClick: ()=>this.navigateDirectionTool('solarreturn') },
			{ label: '合盘', icon: 'quickComposite', onClick: ()=>this.navigateFeature('relativechart') },
			{ label: '星运', icon: 'quickTransit', onClick: ()=>this.navigateFeature('direction') },
			{ label: '笔记', icon: 'quickNote', onClick: ()=>this.openDrawer('memo') },
			{ label: 'AI助手', icon: 'quickAi', onClick: ()=>this.navigateFeature('aianalysis') },
		];
		return (
			<div className="horosa-bottom-quick-dock horosa-ziwei-quick-dock">
				<div className="horosa-bottom-quick-title">快捷功能 <XQIcon name="ai" /></div>
				<div className="horosa-bottom-quick-actions horosa-ziwei-quick-actions">
					{actions.map((item)=>(
						<button type="button" key={item.label} className="horosa-bottom-quick-button" onClick={item.onClick}>
							<span className="horosa-bottom-quick-icon"><XQIcon name={item.icon} /></span>
							<span>{item.label}</span>
						</button>
					))}
				</div>
			</div>
		);
	}

	renderZiWeiInfoPanel(infoData, directionDoms, tipheight){
		if(!infoData || infoData.rows.length === 0){
			return <div className="horosa-empty-hint">起盘后显示命盘信息</div>;
		}
		return (
			<div className="horosa-ziwei-meta-scroll horosa-astro-content-scroll">
				<div className="horosa-info-card">
					<div className="horosa-info-card-title">基本信息</div>
					{infoData.rows.map((row)=>(
						<div className="horosa-info-row" key={row[0]}>
							<span>{row[0]}</span>
							<strong>{row[1]}</strong>
						</div>
					))}
				</div>
				<div className="horosa-info-card horosa-ziwei-bazi-card">
					<div className="horosa-info-card-title">四柱</div>
					<div className="horosa-ziwei-bazi-grid">
						{infoData.bazi.map((item)=>(
							<div className="horosa-ziwei-bazi-cell" key={item.label}>
								<span>{item.label}</span>
								<strong>{item.value}</strong>
							</div>
						))}
					</div>
				</div>
				<div className="horosa-info-card horosa-ziwei-direction-card">
					<div className="horosa-info-card-title">行运大限</div>
					<div className="horosa-ziwei-direction-list">
						<Row>
							{directionDoms}
						</Row>
					</div>
				</div>
				<TipsBoard
					height={tipheight}
					value={this.state.tips}
					/>
			</div>
		);
	}

	componentDidMount(){
		this.unmounted = false;
		this._after23BoundaryUserOverrode = false; // 用户拍板:左栏改过 after23NewDay 后,全局事件不再触发重新起盘
		this._lateZiHourUserOverrode = false; // v2.2.1: 同上 — 左栏改过 lateZiHourUseNextDay 后,全局事件不再触发重新起盘
		if(typeof window !== 'undefined'){
			this._dayBoundaryListener = (ev) => {
				if(this._after23BoundaryUserOverrode) return;
				const v = ev && ev.detail ? ev.detail.after23NewDay : null;
				if((v === 0 || v === 1) && this.props.fields){
					this.requestZiWei(this.props.fields);
				}
			};
			window.addEventListener('horosa:day-boundary-changed', this._dayBoundaryListener);
			this._lateZiHourListener = (ev) => {
				if(this._lateZiHourUserOverrode) return;
				const v = ev && ev.detail ? ev.detail.lateZiHourUseNextDay : null;
				if((v === 0 || v === 1) && this.props.fields){
					this.requestZiWei(this.props.fields);
				}
			};
			window.addEventListener('horosa:late-zi-hour-mode-changed', this._lateZiHourListener);
		}
		if(this.props.fields){
			this.requestZiWei(this.props.fields);
		}
	}

	componentWillUnmount(){
		this.unmounted = true;
		if(typeof window !== 'undefined' && this._dayBoundaryListener){
			window.removeEventListener('horosa:day-boundary-changed', this._dayBoundaryListener);
		}
		if(typeof window !== 'undefined' && this._lateZiHourListener){
			window.removeEventListener('horosa:late-zi-hour-mode-changed', this._lateZiHourListener);
		}
	}

	render(){
		let height = this.props.height ? this.props.height : 760;
		if(height === '100%'){
			height = 'calc(100% - 70px)'
		}else{
			height = height - 40
		}

		let chart = this.state.result ? this.state.result.chart : {};
		let dirIndex = this.state.currentDirectionIndex;
		let doms = this.genDirectionDom(chart);
		let infoData = buildZiWeiInfoData(chart, this.props.fields);

		let luckParams = {};
		try {
			luckParams = this.genParams(this.props.fields);
		} catch (e) {
			luckParams = {};
		}

		let tipheight = 270;
		let docwid = document.documentElement.clientWidth;
		if(docwid <= 1440){
			tipheight = 120;
		}

		return (
			<div className="horosa-ziwei-page horosa-astro-redesign horosa-ziwei-redesign">
				<div className="horosa-astro-layout horosa-astro-redesign-layout horosa-ziwei-redesign-layout">
					<div className="horosa-astro-redesign-grid horosa-ziwei-redesign-grid">
						<div className="horosa-astro-context-panel horosa-astro-input-panel horosa-ziwei-input-panel">
							<ZiWeiInput
								fields={this.props.fields}
								onFieldsChange={this.onFieldsChange}
							/>
						</div>
						<div className="horosa-chart-stage horosa-chart-stage-redesign horosa-ziwei-chart-panel xq-chart-renderer xq-chart-renderer-ziwei">
							<div className="horosa-ziwei-chart-viewport" data-capture-chart-only>
								<ZiWeiChart
									value={chart}
									height="100%"
									fields={this.props.fields}
									dirIndex={dirIndex}
									luckMingIndex={this.state.luckMingIndex}
									indicate={this.indicate}
									rules={this.state.rules}
									onTipClick={this.onTipClick}
									onCenterInfoClick={this.openCenterInfo}
								/>
							</div>
						</div>
						<div className="horosa-inspector-panel horosa-astro-content-panel horosa-ziwei-info-panel">
							<Tabs defaultActiveKey="info" tabPosition='top' className="horosa-content-tabs horosa-ziwei-tabs">
								<TabPane tab="命盘" key="info">
									{this.renderZiWeiInfoPanel(infoData, doms, tipheight)}
								</TabPane>
								<TabPane tab="运限" key="luck">
									<ZWLuckPanel
										chart={chart}
										params={luckParams}
										onLuckChange={this.onLuckChange}
										onAi={()=>this.navigateFeature('aianalysis')}
									/>
								</TabPane>
								<TabPane tab="格局" key="patterns">
									<ZWPatternPanel patterns={this.state.result ? this.state.result.patterns : []} />
								</TabPane>
								<TabPane tab="资料参考" key="2">
									<ZWRuleMain height={height} rules={this.state.rules} />
								</TabPane>
							</Tabs>
						</div>
						</div>
						{this.renderBottomQuickDock()}
						<Modal
							open={this.state.centerInfoVisible}
							title="命盘信息"
							footer={null}
							onCancel={this.closeCenterInfo}
							width={640}
							className="horosa-ziwei-center-info-modal"
						>
							{this.renderZiWeiInfoPanel(infoData, doms, tipheight)}
						</Modal>
					</div>
				</div>
		);
	}
}

export default ZiWeiMain;
