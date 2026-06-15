import React from 'react';
import { connect  } from 'dva';
import { Spin, } from 'antd';
import DateTime from '../components/comp/DateTime';
import LoginForm from '../components/user/LoginForm';
import RegisterForm from '../components/user/RegisterForm';
import ResetPwdForm from '../components/user/ResetPwdForm';
import ChangePwdForm from '../components/user/ChangePwdForm';
import ChangeParamsFormComp from '../components/user/ChangeParamsFormComp';
import ChartAddFormComp from '../components/user/ChartAddFormComp';
import ChartEditFormComp from '../components/user/ChartEditFormComp';
import ChartList from '../components/user/ChartList';
import CaseAddFormComp from '../components/user/CaseAddFormComp';
import CaseEditFormComp from '../components/user/CaseEditFormComp';
import CaseList from '../components/user/CaseList';
import AstroFormComp from '../components/astro/AstroFormComp';
import AstroChartMain from '../components/astro/AstroChartMain';

// 流畅度:可预取的 lazy —— 启动仍只载首包(快),首屏就绪后空闲时段后台预载全部技法 chunk,
// 用户切任何技法时模块早已就绪(零等待)。preload 引用同一 factory,React.lazy 缓存同一 promise。
const LAZY_PRELOAD_QUEUE = [];
function lazyPreloadable(factory){
	const C = React.lazy(factory);
	LAZY_PRELOAD_QUEUE.push(factory);
	return C;
}
// 首屏可交互后逐个空闲预载(每次 1 个,绝不与用户操作抢主线程;requestIdleCallback 降级 setTimeout)。
let lazyPreloadStarted = false;
function startIdlePreload(){
	if(lazyPreloadStarted) return;
	lazyPreloadStarted = true;
	const queue = LAZY_PRELOAD_QUEUE.slice();
	const next = ()=>{
		const f = queue.shift();
		if(!f) return;
		Promise.resolve().then(f).catch(()=>{}).finally(()=>{
			if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
				window.requestIdleCallback(next, { timeout: 3000 });
			}else{
				setTimeout(next, 300);
			}
		});
	};
	// 首帧后 2s 再开始,确保不影响启动与首屏交互。
	setTimeout(()=>{
		if(typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'){
			window.requestIdleCallback(next, { timeout: 3000 });
		}else{
			setTimeout(next, 300);
		}
	}, 2000);
}

import AstroChartMain3D from '../components/astro3d/AstroChartMain3D';
const PlanetariumMain = lazyPreloadable(() => import('../components/planetarium/PlanetariumMain'));
const AuxChartMain = lazyPreloadable(() => import('../components/auxchart/AuxChartMain'));
const IndiaChartMain = lazyPreloadable(() => import('../components/astro/IndiaChartMain'));
import AstroRelative from '../components/astro/AstroRelative';
const AstroDirectMain = lazyPreloadable(() => import('../components/direction/AstroDirectMain'));
import AspSelector from '../components/astro/AspSelector';
import AstroOrbSetting from '../components/astro/AstroOrbSetting';
import PlanetSelector from '../components/astro/PlanetSelector';
import ChartDisplaySelector from '../components/astro/ChartDisplaySelector';
import ChartsGps from '../components/user/ChartsGps';
import ChartMemo from '../components/comp/ChartMemo';
const JieQiChartsMain = lazyPreloadable(() => import('../components/jieqi/JieQiChartsMain'));
const CnTraditionMain = lazyPreloadable(() => import('../components/cntradition/CnTraditionMain'));
const CnYiBuMain = lazyPreloadable(() => import('../components/cnyibu/CnYiBuMain'));
const CalendarMain = lazyPreloadable(() => import('../components/calendar/CalendarMain'));
const FengShuiMain = lazyPreloadable(() => import('../components/fengshui/FengShuiMain'));
const SanShiUnitedMain = lazyPreloadable(() => import('../components/sanshi/SanShiUnitedMain'));
const AIAnalysisMain = lazyPreloadable(() => import('../components/aianalysis/AIAnalysisMain'));
const BookMain = lazyPreloadable(() => import('../components/reader/BookMain'));
const MediaMain = lazyPreloadable(() => import('../components/multimedia/MediaMain'));
const AdminToolsMain = lazyPreloadable(() => import('../components/admintools/AdminToolsMain'));
const GuoLaoChartMain = lazyPreloadable(() => import('../components/guolao/GuoLaoChartMain'));
const CommToolsMain = lazyPreloadable(() => import('../components/commtools/CommToolsMain'));
import DLFeature from '../components/deeplearn/DLFeature';
import HomePageSetup from '../components/HomePageSetup';
import BaZi from '../components/cntradition/BaZi';
const ZiWeiMain = lazyPreloadable(() => import('../components/ziwei/ZiWeiMain'));
const GuaZhanMain = lazyPreloadable(() => import('../components/guazhan/GuaZhanMain'));
const LiuRengMain = lazyPreloadable(() => import('../components/lrzhan/LiuRengMain'));
const DunJiaMain = lazyPreloadable(() => import('../components/dunjia/DunJiaMain'));
const TaiYiMain = lazyPreloadable(() => import('../components/taiyi/TaiYiMain'));
const ShuSuanMain = lazyPreloadable(() => import('../components/shusuan/ShuSuanMain'));
const MingOtherMain = lazyPreloadable(() => import('../components/mingother/MingOtherMain'));
import * as AstroConst from '../constants/AstroConst';
import {convertToArray} from '../utils/helper';
import { APPEARANCE_DARK } from '../utils/appearance';
import XQIcon from '../components/xq-icons';
import { XQDrawer as Drawer, XQModal, XQTabs } from '../components/xq-ui';

const TabPane = XQTabs.TabPane;
let fetchByFieldsTimer = null;

const mainTabIcons = {
    占星: <XQIcon name="astro" />,
    星盘: <XQIcon name="astro" />,
    星运: <XQIcon name="direction" />,
    八字: <XQIcon name="bazi" />,
    紫微: <XQIcon name="ziwei" />,
    '3D': <XQIcon name="threeD" />,
    三维盘: <XQIcon name="threeD" />,
    天文馆: <XQIcon name="globe" />,
    七政: <XQIcon name="qizheng" />,
    印占: <XQIcon name="vedic" />,
    辅盘: <XQIcon name="aux" />,
    合盘: <XQIcon name="composite" />,
    数算: <XQIcon name="quickPrimary" />,
    七政四余: <XQIcon name="qizheng" />,
    印度占星: <XQIcon name="vedic" />,
    三式: <XQIcon name="sanshi" />,
    三式合一: <XQIcon name="sanshi" />,
    六壬: <XQIcon name="liureng" />,
    遁甲: <XQIcon name="qimen" />,
    六爻: <XQIcon name="liuyao" />,
    太乙: <XQIcon name="taiyi" />,
    分至: <XQIcon name="solstice" />,
    节气盘: <XQIcon name="solstice" />,
    风水: <XQIcon name="fengshui" />,
    其他: <XQIcon name="other" />,
    其他术数: <XQIcon name="other" />,
    AI分析: <XQIcon name="ai" />,
    黄历: <XQIcon name="calendar" />,
    辅助: <XQIcon name="support" />,
    书籍阅读: <XQIcon name="book" />,
    星阙直播: <XQIcon name="live" />,
    管理工具: <XQIcon name="admin" />,
};

// keywords：该模块内部的术法/别名串（简体 + 常见叫法），供导航搜索匹配「模块内术法」。
// 例：搜「卜卦盘」命中「辅盘」、搜「金口诀」命中「其他(卜)」。新增模块/术法须同步补此处（见 AGENTS.md）。
const navigationPages = [
    { label: '占星', key: 'astrochart', icon: 'astro', group: '命', keywords: '西洋占星 本命盘 占星地图 ACG 星体地图 希腊星术 古典占星 寿命 界推运 12分度 主宰链 阿拉伯点 容许度' },
    { label: '星运', key: 'direction', icon: 'direction', group: '命', keywords: '推运 主限法 太阳弧 波斯向运 法达星限 十年大运 黄道星释 行星弧 小限法 流年法 太阳返照 月亮返照 三分主星 Balbillus 赤纬推运 恒星推运 二次推运 行星年龄 129年系统 数字相位 月相推运 多重回归 关键点 回归轴 年龄推进点 星历' },
    { label: '八字', key: 'bazi', icon: 'bazi', group: '命', keywords: '八字 四柱 子平 盲派 滴天髓 大运 流年' },
    { label: '紫微', key: 'ziwei', icon: 'ziwei', group: '命', keywords: '紫微斗数 飞星 大限 小限 流年 四化 命宫' },
    { label: '七政', key: 'guolao', icon: 'qizheng', group: '命', keywords: '七政四余 政余 五星 果老星宗 二十八宿 宿度' },
    { label: '印占', key: 'indiachart', icon: 'vedic', group: '命', keywords: '印度占星 吠陀 Vedic 分宫制 岁差 ayanamsa 月宿 nakshatra' },
    { label: '辅盘', key: 'auxchart', icon: 'aux', group: '命', keywords: '卜卦盘 择日盘 世俗盘 十三分盘 调波盘 谐波盘 龙盘 中点盘 量化盘 汉堡盘 卜卦 择日' },
    { label: '合盘', key: 'relativechart', icon: 'composite', group: '命', keywords: '合盘 关系盘 比较盘 synastry' },
    { label: '数算', key: 'shusuan', icon: 'quickPrimary', group: '命', keywords: '邵子神数 铁板神数 河洛理数 参评数 北极神数 南极神数 蠢子数' },
    { label: '其他', key: 'mingother', icon: 'other', group: '命', keywords: '演禽 仙禽 策天 策天飞星' },
    { label: '三式', key: 'sanshiunited', icon: 'sanshi', group: '卜', keywords: '三式合一 六壬 奇门 太乙' },
    { label: '六壬', key: 'liureng', icon: 'liureng', group: '卜', keywords: '大六壬 六壬 三传 四课 神煞 七政' },
    { label: '遁甲', key: 'dunjia', icon: 'qimen', group: '卜', keywords: '奇门遁甲 奇门 法奇门' },
    { label: '六爻', key: 'guazhan', icon: 'liuyao', group: '卜', keywords: '六爻 纳甲 卜卦 摇卦 装卦' },
    { label: '太乙', key: 'taiyi', icon: 'taiyi', group: '卜', keywords: '太乙神数 太乙' },
    { label: '分至', key: 'jieqichart', icon: 'solstice', group: '卜', keywords: '节气盘 分至 二分二至' },
    { label: '风水', key: 'fengshui', icon: 'fengshui', group: '卜', keywords: '风水 纳气盘 八卦阳宅 玄空 阳宅' },
    { label: '其他', key: 'cnyibu', icon: 'other', group: '卜', keywords: '金口诀 五兆 太玄 荆诀 神易数 皇极经世 宿占 统摄法' },
    { label: 'AI分析', key: 'aianalysis', icon: 'ai', group: '工具', keywords: 'AI 分析 挂载 报告 大模型' },
    { label: '天文馆', key: 'planetarium', icon: 'globe', group: '工具', keywords: '天文馆 星空 观星 星图 babylon' },
    { label: '黄历', key: 'calendar', icon: 'calendar', group: '工具', keywords: '黄历 农历 老黄历 择日 宜忌 节气' },
    { label: '辅助', key: 'cntradition', icon: 'support', group: '工具', keywords: '辅助 工具 真太阳时' },
];

const fullHeightWorkspaceTabs = new Set([
    'astrochart',
    'direction',
    'bazi',
    'ziwei',
    'guolao',
    'indiachart',
    'auxchart',
    'relativechart',
    'shusuan',
    'mingother',
    'sanshiunited',
    'liureng',
    'dunjia',
    'guazhan',
    'taiyi',
    'jieqichart',
    'fengshui',
    'cnyibu',
    'aianalysis',
    'astrochart3D',
    'planetarium',
    'calendar',
    'cntradition',
]);

function mainTab(label, group, options = {}){
    const icon = mainTabIcons[label] || <XQIcon name="astro" />;
    return (
        <span
            className={`horosa-main-tab-label${options.hidden ? ' horosa-main-tab-hidden' : ''}`}
            title={label}
            aria-label={label}
        >
            <span className="horosa-main-tab-icon">{icon}</span>
            <span className="horosa-main-tab-copy">
                {group ? <span className="horosa-main-tab-group">{group}</span> : null}
                <span className="horosa-main-tab-text">{label}</span>
            </span>
        </span>
    );
}

function AstroIndex({dispatch, astro, app, user, rules, }){
    // 首屏就绪后空闲预载全部技法 chunk(不影响启动;切技法零等待)。
    React.useEffect(()=>{ startIdlePreload(); }, []);
    const { tokenImg, registerFields, loginFields, loading, loadingText, refresh, chartDisplay, chartStyle, indiaChartStyle, aspects, planetDisplay, lotsDisplay, resolvedAppearance, showPdBounds, showPlanetHouseInfo, showAstroMeaning, showOnlyRulExaltReception} = app;
    const {
        pwdFields,
        userInfo,
        charts,
        currentChart,
        admin,
        pageSize,
        pageIndex,
        total,
        cases,
        currentCase,
        casePageSize,
        casePageIndex,
        caseTotal,
    } = user;
 	const { height, fields, chartObj, drawerVisible, predictHook, memo, memoType, currentTab, currentSubTab, deeplearn} = astro;
    const { ziwei, } = rules; 

    
    function closeDrawer(){
        dispatch({
            type: 'astro/closeDrawer',
            payload:{},
        });
    }

    function openDrawer(key){
        dispatch({
            type: 'astro/openDrawer',
            payload:{
                key: key,
            },
        });
    }

    function changeTab(key){
        if(predictHook[key] && predictHook[key].fun){
            if(key === 'indiachart' || key === 'cntradition' || key === 'jieqichart'
                || key === 'otherbu' || key === 'cnyibu' || key === 'germanytech'
                || key === 'guolao' || key === 'hellenastro'  || key === 'astrochart'
                || key === 'locastro' || key === 'admintools' || key === 'astrochart3D'
                || key === 'planetarium'
                || key === 'fengshui' || key === 'sanshiunited' || key === 'aianalysis'
                || key === 'bazi' || key === 'ziwei' || key === 'guazhan'
                || key === 'liureng' || key === 'dunjia' || key === 'taiyi'
                || key === 'shusuan' || key === 'mingother'
                || key === 'auxchart'){
                predictHook[key].fun(fields);
            }else if(key === 'astroreader'){
                predictHook[key].fun();
            }else{
                predictHook[key].fun(chartObj);
            }
        }

        const cnTraditionTabs = ['guasym', 'cuangong12', 'pithy'];
        const cnYiBuTabs = ['suzhan', 'jinkou', 'tongshefa', 'huangji', 'wuzhao', 'taixuan', 'jingjue', 'shenyishu'];
        const auxChartTabs = ['germanytech', 'hellenastro', 'locastro', 'harmonic', 'otherbu', 'horary', 'election'];
        let nextSubTab = null;
        if(key === 'cntradition'){
            nextSubTab = cnTraditionTabs.indexOf(currentSubTab) >= 0 ? currentSubTab : 'guasym';
        }else if(key === 'cnyibu'){
            nextSubTab = cnYiBuTabs.indexOf(currentSubTab) >= 0 ? currentSubTab : 'suzhan';
        }else if(key === 'auxchart'){
            nextSubTab = auxChartTabs.indexOf(currentSubTab) >= 0 ? currentSubTab : 'germanytech';
        }else if(key === 'direction' || key === 'relativechart'){
            nextSubTab = currentSubTab;
        }
        
        dispatch({
            type: 'astro/save',
            payload:{ 
                chartObj: chartObj,
                currentTab: key,
                currentSubTab: nextSubTab,
            },
        });    

    }

    function changeCond(values){
        // Windows-ahead defensive guard: a restored/imported chart payload may omit a
        // form field or carry a numeric `lat`; ensureField guarantees the field object
        // exists, and `lat` is String()-coerced before .toLowerCase() below (a numeric
        // lat would otherwise throw). Guarded by release_selfcheck.py.
        const ensureField = (obj, name) => {
            if(obj && !obj[name]){ obj[name] = { value: undefined }; }
            return obj ? obj[name] : { value: undefined };
        };
        let flds = {
            ...fields,
        };  
        if(values.nohook){
            flds.nohook = true;
        }  

        if(values.tm !== undefined && values.tm != null){
            let birth = values.tm;
            flds.date.value = birth.clone();
            flds.time.value = birth.clone();
            flds.ad.value = birth.ad;
            flds.zone.value = birth.zone
        }

        if(values.hsys !== undefined && values.hsys !== null){
            flds.hsys.value = values.hsys;
        }
        if(values.zodiacal !== undefined && values.zodiacal !== null){
            flds.zodiacal.value = values.zodiacal;
        }
        if(values.siderealAyanamsa !== undefined && values.siderealAyanamsa !== null){
            if(!flds.siderealAyanamsa){ flds.siderealAyanamsa = { value: '', name: ['siderealAyanamsa'] }; }
            flds.siderealAyanamsa.value = values.siderealAyanamsa;
        }
        if(values.lon !== undefined && values.lon !== null){
            flds.lon.value = values.lon;
            flds.lat.value = values.lat;
            flds.gpsLon.value = values.gpsLon;
            flds.gpsLat.value = values.gpsLat;
        }
        if(values.southchart !== undefined && values.southchart !== null){
            flds.southchart.value = values.southchart;
        }
        if(ensureField(flds, 'lat').value >= 0){
            let lat = String(flds.lat.value);
            if(lat.toLowerCase().indexOf('n') >= 0){
                ensureField(flds, 'southchart').value = 0;
            }
        }

        const isUnconfirmedTime = values && values.tm !== undefined && values.tm !== null && values.confirmed === false;
        if(isUnconfirmedTime){
            if(fetchByFieldsTimer){
                clearTimeout(fetchByFieldsTimer);
            }
            const queuedPayload = {
                ...flds,
                __requestOptions: {
                    silent: true,
                },
            };
            fetchByFieldsTimer = setTimeout(()=>{
                dispatch({
                    type: 'astro/fetchByFields',
                    payload: queuedPayload,
                });
                fetchByFieldsTimer = null;
            }, 180);
            return flds;
        }

        if(fetchByFieldsTimer){
            clearTimeout(fetchByFieldsTimer);
            fetchByFieldsTimer = null;
        }

        dispatch({
            type: 'astro/fetchByFields',
            payload: flds,
        });

        return flds;
    }

    function endRefresh(){
        setTimeout(()=>{
            dispatch({
                type: 'app/endRefresh',
                payload: {},
            });               
        }, 1000);
    }
    
    AstroConst.setColorTheme(resolvedAppearance === APPEARANCE_DARK ? 8 : AstroConst.DefaultColorTheme);
    
    let idxstyle = {
        backgroundColor: 'var(--horosa-bg)',
        height: height,
    };

    if(refresh){
        endRefresh();
    }

    let tip = '载入中...';
    if(loadingText){
        tip = loadingText;
    }

    let aryfields = convertToArray(fields);
    let arychartflds = convertToArray(currentChart);
    let arycaseflds = convertToArray(currentCase);
    let aryregflds = convertToArray(registerFields);
    let aryloginflds = convertToArray(loginFields);
    const drawerNavigationPages = navigationPages.concat(
        userInfo ? [
            { label: '书籍阅读', key: 'astroreader', icon: 'book', group: '内容' },
            { label: '星阙直播', key: 'liveplayer', icon: 'live', group: '内容' },
        ] : [],
        admin ? [{ label: '管理工具', key: 'admintools', icon: 'admin', group: '管理' }] : []
    );

    const activeMainTab = currentTab === 'yanqin' ? 'mingother' : currentTab;
    const isFullHeightWorkspaceTab = fullHeightWorkspaceTabs.has(activeMainTab);
    const rootTabsHeight = isFullHeightWorkspaceTab ? 'calc(100vh - 72px)' : height;

	return (
		<div style={idxstyle}>
        <Spin spinning={loading} size="large" tip={tip}>
            <React.Suspense fallback={<div style={{padding:40,textAlign:'center'}}><Spin size="large" tip="加载中…" /></div>}>
            <XQTabs
                defaultActiveKey="astrochart" tabPosition='left' onChange={changeTab}
                activeKey={activeMainTab}
                className={`mainRootTabs horosa-nav-in-drawer horosa-unified-shell-active${isFullHeightWorkspaceTab ? ' horosa-astro-shell-active' : ''}${activeMainTab === 'bazi' ? ' horosa-bazi-shell-active' : ''}${activeMainTab === 'dunjia' ? ' horosa-dunjia-shell-active' : ''}${activeMainTab === 'sanshiunited' ? ' horosa-sanshi-shell-active' : ''}`}
                style={{ height: rootTabsHeight }}
            >
                <TabPane tab={mainTab('占星', '命')} key="astrochart">
	                    <AstroChartMain 
	                        value={chartObj} 
                        onChange={changeCond}
                        fields={fields} 
                        fieldsAry={aryfields}
                        height={height} 
                        chartDisplay={chartDisplay}
                        chartStyle={chartStyle}
                        aspects={aspects}
                        planetDisplay={planetDisplay}
	                        lotsDisplay={lotsDisplay}
	                        showPdBounds={showPdBounds}
	                        showPlanetHouseInfo={showPlanetHouseInfo}
	                        showAstroMeaning={showAstroMeaning}
	                        showOnlyRulExaltReception={showOnlyRulExaltReception}
	                        memo={memo}
	                        dispatch={dispatch}
	                        hook={predictHook.astrochart}
                            onNavigate={changeTab}
                            showQuickActions={true}
                            featureLinks={[
                                { label: '星运', key: 'direction', desc: '推运、返照与时序' },
                                { label: '辅盘', key: 'auxchart', desc: '量化、十三分与地图' },
                                { label: '合盘', key: 'relativechart', desc: '关系与组合分析' },
                                { label: '分至', key: 'jieqichart', desc: '节气与太阳时点' },
                            ]}
	                    />
                </TabPane>

                <TabPane tab={mainTab('星运', null, { hidden: true })} key="direction">
	                    <AstroDirectMain
                        height={height} 
                        fields={fields}
                        fieldsAry={aryfields}
                        chartObj={chartObj}
                        chartDisplay={chartDisplay}
                        planetDisplay={planetDisplay}
	                        lotsDisplay={lotsDisplay}
	                        showPlanetHouseInfo={showPlanetHouseInfo}
	                        showAstroMeaning={showAstroMeaning}
	                        hook={predictHook.direction}
	                        dispatch={dispatch}
	                        currentSubTab={currentSubTab}
                    />
                </TabPane>

                <TabPane tab={mainTab('八字')} key="bazi">
                    <BaZi
                        height={height}
                        fields={fields}
                        hook={predictHook.bazi}
                        dispatch={dispatch}
                    />
                </TabPane>

                <TabPane tab={mainTab('紫微')} key="ziwei">
                    <ZiWeiMain
                        height={height}
                        fields={fields}
                        hook={predictHook.ziwei}
                        dispatch={dispatch}
                    />
                </TabPane>

                <TabPane tab={mainTab('七政')} key="guolao">
                    <GuoLaoChartMain 
                        value={chartObj} 
                        onChange={changeCond}
                        fields={fields} 
                        fieldsAry={aryfields}
                        height={height} 
                        chartDisplay={chartDisplay}
                        indiaChartStyle={indiaChartStyle}
                        planetDisplay={planetDisplay}
                        lotsDisplay={lotsDisplay}
                        hook={predictHook.guolao}
                        dispatch={dispatch}
                    />
                </TabPane>

                <TabPane tab={mainTab('印占')} key="indiachart">
	                    <IndiaChartMain
                        onChange={changeCond}
                        fields={fields} 
                        fieldsAry={aryfields}
                        height={height} 
                        chartDisplay={chartDisplay}
                        indiaChartStyle={indiaChartStyle}
                        planetDisplay={planetDisplay}
	                        lotsDisplay={lotsDisplay}
	                        showPlanetHouseInfo={showPlanetHouseInfo}
	                        showAstroMeaning={showAstroMeaning}
	                        hook={predictHook.indiachart}
	                        dispatch={dispatch}
	                    />
                </TabPane>

                <TabPane tab={mainTab('辅盘', null, { hidden: true })} key="auxchart">
                    <AuxChartMain
                        chart={chartObj}
                        onChange={changeCond}
                        height={height}
                        fields={fields}
                        fieldsAry={aryfields}
                        chartDisplay={chartDisplay}
                        planetDisplay={planetDisplay}
                        lotsDisplay={lotsDisplay}
                        showPlanetHouseInfo={showPlanetHouseInfo}
                        showAstroMeaning={showAstroMeaning}
                        hook={predictHook.auxchart}
                        chartStyle={chartStyle}
                        dispatch={dispatch}
                        currentSubTab={currentSubTab}
                    />
                </TabPane>

                <TabPane tab={mainTab('合盘', null, { hidden: true })} key="relativechart">
	                    <AstroRelative
                        fields={fields}
                        fieldsAry={aryfields}
                        height={height}
                        chartDisplay={chartDisplay}
                        planetDisplay={planetDisplay}
	                        lotsDisplay={lotsDisplay}
	                        chartStyle={chartStyle}
	                        showPlanetHouseInfo={showPlanetHouseInfo}
	                        showAstroMeaning={showAstroMeaning}
	                        hook={predictHook.relativechart}
	                        dispatch={dispatch}
	                        onChange={changeCond}
	                        currentSubTab={currentSubTab}
                    />
                </TabPane>

                <TabPane tab={mainTab('数算', null, { hidden: true })} key="shusuan">
                    <ShuSuanMain
                        value={chartObj}
                        height={height}
                        fields={fields}
                        hook={predictHook.shusuan}
                        dispatch={dispatch}
                    />
                </TabPane>

                <TabPane tab={mainTab('其他', null, { hidden: true })} key="mingother">
                    <MingOtherMain
                        value={chartObj}
                        height={height}
                        fields={fields}
                        hook={predictHook.mingother}
                        dispatch={dispatch}
                    />
                </TabPane>

                <TabPane tab={mainTab('三式', '卜')} key="sanshiunited">
	                    <SanShiUnitedMain
	                        height={height}
                        fields={fields}
                        fieldsAry={aryfields}
	                        chartObj={chartObj}
	                        showPlanetHouseInfo={showPlanetHouseInfo}
	                        showAstroMeaning={showAstroMeaning}
	                        dispatch={dispatch}
	                        hook={predictHook.sanshiunited}
	                    />
                </TabPane>

                <TabPane tab={mainTab('六壬')} key="liureng">
                    <LiuRengMain
                        value={chartObj}
                        height={height}
                        fields={fields}
                        hook={predictHook.liureng}
                        dispatch={dispatch}
                    />
                </TabPane>

                <TabPane tab={mainTab('遁甲')} key="dunjia">
                    <DunJiaMain
                        value={chartObj}
                        height={height}
                        fields={fields}
                        hook={predictHook.dunjia}
                        dispatch={dispatch}
                    />
                </TabPane>

                <TabPane tab={mainTab('六爻')} key="guazhan">
                    <GuaZhanMain
                        value={chartObj}
                        height={height}
                        fields={fields}
                        hook={predictHook.guazhan}
                        dispatch={dispatch}
                    />
                </TabPane>

                <TabPane tab={mainTab('太乙')} key="taiyi">
                    <TaiYiMain
                        value={chartObj}
                        height={height}
                        fields={fields}
                        hook={predictHook.taiyi}
                        dispatch={dispatch}
                    />
                </TabPane>

                <TabPane tab={mainTab('分至', null, { hidden: true })} key="jieqichart">
	                    <JieQiChartsMain
                        height={height} 
                        fields={fields}
                        fieldsAry={aryfields}
                        chartDisplay={chartDisplay}
                        planetDisplay={planetDisplay}
	                        lotsDisplay={lotsDisplay}
	                        showPlanetHouseInfo={showPlanetHouseInfo}
	                        showAstroMeaning={showAstroMeaning}
	                        chartStyle={chartStyle}
	                        hook={predictHook.jieqichart}
	                        dispatch={dispatch}
	                    />
                </TabPane>

                <TabPane tab={mainTab('风水')} key="fengshui">
                    <FengShuiMain
                        height={height}
                        fields={fields}
                        fieldsAry={aryfields}
                        dispatch={dispatch}
                    />
                </TabPane>

                <TabPane tab={mainTab('其他')} key="cnyibu">
                    <CnYiBuMain
                        chart={chartObj}
                        height={height}
                        fields={fields}
                        fieldsAry={aryfields}
                        chartDisplay={chartDisplay}
                        planetDisplay={planetDisplay}
                        hook={predictHook.cnyibu}
                        dispatch={dispatch}
                        currentSubTab={currentSubTab}
                    />
                </TabPane>

                <TabPane tab={mainTab('AI分析', '工具')} key="aianalysis">
                    <AIAnalysisMain
                        height={height}
                        fields={fields}
                        fieldsAry={aryfields}
                        chartObj={chartObj}
                        dispatch={dispatch}
                        hook={predictHook.aianalysis}
                    />
                </TabPane>

                <TabPane tab={mainTab('3D')} key="astrochart3D">
                    <AstroChartMain3D
                        value={chartObj}
                        onChange={changeCond}
                        fields={fields}
                        fieldsAry={aryfields}
                        height={height}
                        currentTab={activeMainTab}
                        chartDisplay={chartDisplay}
                        planetDisplay={planetDisplay}
                        lotsDisplay={lotsDisplay}
                        showPlanetHouseInfo={showPlanetHouseInfo}
                        showAstroMeaning={showAstroMeaning}
                        dispatch={dispatch}
                        hook={predictHook.astrochart3D}
                    />
                </TabPane>

                <TabPane tab={mainTab('天文馆', '工具')} key="planetarium">
                    <PlanetariumMain
                        height={height}
                        fields={fields}
                        fieldsAry={aryfields}
                        dispatch={dispatch}
                        hook={predictHook.planetarium}
                        active={activeMainTab === 'planetarium'}
                    />
                </TabPane>

                <TabPane tab={mainTab('黄历')} key="calendar">
                    <CalendarMain
                        height={height} 
                        fields={fields}
                        fieldsAry={aryfields}
                        hook={predictHook.calendar}
                        dispatch={dispatch}
                    />
                </TabPane>

                <TabPane tab={mainTab('辅助')} key="cntradition">
                    <CnTraditionMain
                        chart={chartObj}
                        height={height}
                        fields={fields}
                        fieldsAry={aryfields}
                        chartDisplay={chartDisplay}
                        planetDisplay={planetDisplay}
                        hook={predictHook.cntradition}
                        dispatch={dispatch}
                        currentSubTab={currentSubTab}
                    />
                </TabPane>

                {
                    userInfo && (
                        <TabPane tab={mainTab('书籍阅读', '内容与管理')} key="astroreader">
                            <BookMain 
                                height={height}
                                userInfo={userInfo}
                                dispatch={dispatch}
                                hook={predictHook.astroreader}
                            />
                        </TabPane>
                    )
                }

                {
                    userInfo && (
                        <TabPane tab={mainTab('星阙直播')} key="liveplayer">
                            <MediaMain 
                                height={height}
                                dispatch={dispatch}
                                userInfo={userInfo}
                                currentSubTab={currentSubTab}
                                admin={admin}
                            />
                        </TabPane>
                    )
                }

                {
                    admin && (
                        <TabPane tab={mainTab('管理工具')} key="admintools">
                            <AdminToolsMain />
                        </TabPane>
                    )
                }

            </XQTabs>
            </React.Suspense>

            <Drawer
                title='星盘配置'
                width={720}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.query}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <AstroFormComp 
                    { ...fields }
                    fields={fields}
                    fieldsAry={aryfields}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='注册'
                width={300}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.register}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <RegisterForm 
                    {...registerFields}
                    tokenImg={tokenImg}
                    fields={registerFields}
                    fieldsAry={aryregflds}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='登录'
                width={300}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.login}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <LoginForm 
                    {...loginFields}
                    fields={loginFields}
                    fieldsAry={aryloginflds}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='忘记密码'
                width={300}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.resetpwd}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <ResetPwdForm 
                    {...registerFields}
                    tokenImg={tokenImg}
                    fields={registerFields}
                    fieldsAry={aryregflds}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='修改密码'
                width={300}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.changepwd}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <ChangePwdForm 
                    {...pwdFields}
                    fields={pwdFields}
                    fieldsAry={convertToArray(pwdFields)}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='修改参数'
                width={700}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.changeparams}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <ChangeParamsFormComp 
                    {...fields}
                    fields={fields}
                    fieldsAry={aryfields}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='添加星盘'
                width={700}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.chartadd}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <ChartAddFormComp 
                    {...currentChart}
                    fields={currentChart}
                    fieldsAry={arychartflds}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='编辑星盘'
                width={700}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.chartedit}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <ChartEditFormComp 
                    {...currentChart}
                    fields={currentChart}
                    fieldsAry={arychartflds}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='星盘列表'
                width={950}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={false}
                open={drawerVisible.chartlist}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <ChartList
                    height={height} 
                    userInfo={userInfo}
                    charts={charts}
                    pageSize={pageSize}
                    pageIndex={pageIndex}
                    total={total}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='添加起课'
                width={700}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.caseadd}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}
            >
                <CaseAddFormComp
                    {...currentCase}
                    fields={currentCase}
                    fieldsAry={arycaseflds}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='编辑起课'
                width={700}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.caseedit}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}
            >
                <CaseEditFormComp
                    {...currentCase}
                    fields={currentCase}
                    fieldsAry={arycaseflds}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='起课列表'
                width={950}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={false}
                open={drawerVisible.caselist}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}
            >
                <CaseList
                    height={height}
                    userInfo={userInfo}
                    cases={cases}
                    casePageSize={casePageSize}
                    casePageIndex={casePageIndex}
                    caseTotal={caseTotal}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='相位选择'
                width={250}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.selectasp}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <AspSelector
                    value={aspects}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='容许度设置'
                width={280}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.selectorb}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}
            >
                <AstroOrbSetting
                    fields={fields}
                    chartObj={chartObj}
                    dispatch={dispatch}
                    onClose={closeDrawer}
                />
            </Drawer>

            <Drawer
                title='显示星体'
                width={250}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.selectplanet}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <PlanetSelector
                    value={planetDisplay}
                    lots={lotsDisplay}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='星盘组件'
                width={300}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.selectchartdisplay}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <ChartDisplaySelector
                    value={chartDisplay}
                    showPdBounds={fields && fields.showPdBounds ? fields.showPdBounds.value : showPdBounds}
                    showPlanetHouseInfo={showPlanetHouseInfo}
                    showAstroMeaning={showAstroMeaning}
                    showOnlyRulExaltReception={showOnlyRulExaltReception}
                    fields={fields}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='我的星盘分布'
                width={900}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={true}
                open={drawerVisible.chartsgps}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <ChartsGps
                    height={height} 
                    charts={charts}
                    userInfo={userInfo}
                    dispatch={dispatch}
                />
            </Drawer>

            <Drawer
                title='命盘批注'
                width={500}
                placement="right"
                destroyOnClose={true}
                onClose={closeDrawer}
                maskClosable={true}
                open={drawerVisible.memo}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <ChartMemo
                    memoType={memoType}
                    memo={memo}
                    currentSubTab={currentSubTab}
                    currentTab={activeMainTab}
                    userInfo={userInfo}
                    currentChart={currentChart}
                    dispatch={dispatch}
                    loading={loading}
                />
            </Drawer>

            <Drawer
                title='小工具'
                width={960}
                placement="left"
                className="horosa-commtools-drawer"
                destroyOnClose={true}
                onClose={closeDrawer}
                maskClosable={true}
                open={drawerVisible.commtools}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <CommToolsMain
                    fields={fields}
                    dispatch={dispatch}
                    loading={loading}
                />
            </Drawer>

            <Drawer
                title='人生事件设置'
                width={1000}
                placement="left"
                onClose={closeDrawer}
                maskClosable={true}
                destroyOnClose={false}
                open={drawerVisible.chartdeeplearn}
                style={{
                    height: 'calc(100% - 0px)',
                    overflow: 'auto',
                    paddingBottom: 53,
                    backgroundColor: 'transparent',
                }}        
            >
                <DLFeature
                    {...currentChart}
                    fields={currentChart}
                    fieldsAry={arychartflds}
                    deeplearn={deeplearn}
                    height={height} 
                    dispatch={dispatch}
                    loading={loading}
                />
            </Drawer>

            <XQModal
                title={null}
                footer={null}
                centered
                closable={false}
                width={1228}
                destroyOnClose={true}
                maskClosable={true}
                open={drawerVisible.homepage}
                onCancel={closeDrawer}
                className="xq-nav-popup"
                transitionName="xq-nav-popup-motion"
                maskTransitionName="xq-nav-popup-mask-motion"
            >
                <div className="xq-nav-popup-shell">
                    <HomePageSetup
                        dispatch={dispatch}
                        loading={loading}
                        pages={drawerNavigationPages}
                        currentKey={activeMainTab}
                        onNavigate={changeTab}
                        onOpenTools={()=>openDrawer('commtools')}
                        onClose={closeDrawer}
                    />
                </div>
            </XQModal>

        </Spin>
		</div>
	);
}

function mapStateToProps(state){
    const { astro, app, user, rules, } = state;

    return {
		astro: astro,
        app: app,
        user: user,
        rules: rules,
    };
}

export default connect(mapStateToProps)(AstroIndex);
