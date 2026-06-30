// 风水 · 理气起盘派 工作区（六派统一 左参数 / 中SVG盘 / 右断事）。自含 state + useMemo 实时重算。
// 与现有户型图两法(canvas)互斥;选理气派时由 FengShuiMain 渲染本组件。
import React, { useEffect, useMemo, useState } from 'react';
import { XQSelect, XQSegmented } from '../xq-ui';
import LuoshuGrid from './charts/LuoshuGrid';
import TwentyFourShanRing from './charts/TwentyFourShanRing';
import EightPalaceDisk from './charts/EightPalaceDisk';
import { xuankong } from './xuankong';
import { sanhe } from './sanhe';
import { zibai } from './zibai';
import { qiankun } from './qiankun';
import { bazhai } from './bazhai';
import { jinsuo } from './jinsuo';
import { SHAN_ORDER, YUN_YEARS, TIXING_VARIANTS } from './fengshuiData';
import { saveModuleAISnapshot } from '../../utils/moduleAiSnapshot';

const SHAN_OPTS = SHAN_ORDER.map((s)=>({ value: s, label: s }));
const GUA8_OPTS = ['坎', '坤', '震', '巽', '乾', '兑', '艮', '离'].map((g)=>({ value: g, label: g }));
const YUN_OPTS = Object.keys(YUN_YEARS).map((y)=>({ value: +y, label: `${y}运 ${YUN_YEARS[y][0]}–${YUN_YEARS[y][1]}` }));
const TIVAR_OPTS = TIXING_VARIANTS.map((v)=>({ value: v.value, label: v.label }));
// 三合水口只取 12 墓库山(四局各3:火辛戌乾·金癸丑艮·水乙辰巽·木丁未坤),每个都能定局,免「未定局」死角。
const SK_OPTS = [
	{ value: '辛', label: '辛 · 火局' }, { value: '戌', label: '戌 · 火局(墓库)' }, { value: '乾', label: '乾 · 火局' },
	{ value: '癸', label: '癸 · 金局' }, { value: '丑', label: '丑 · 金局(墓库)' }, { value: '艮', label: '艮 · 金局' },
	{ value: '乙', label: '乙 · 水局' }, { value: '辰', label: '辰 · 水局(墓库)' }, { value: '巽', label: '巽 · 水局' },
	{ value: '丁', label: '丁 · 木局' }, { value: '未', label: '未 · 木局(墓库)' }, { value: '坤', label: '坤 · 木局' },
];
const SAND_WATER = [{ value: 'sand', label: '砂' }, { value: 'water', label: '水' }, { value: 'flat', label: '平' }];
const COME_GO = [{ value: 'come', label: '来水' }, { value: 'go', label: '去水' }, { value: '', label: '无' }];
const QK_POS = [{ key: 'xianTian', label: '先天位(丁)' }, { key: 'houTian', label: '后天位(财)' }, { key: 'anJie', label: '案劫(向首)' }];
const JX_CLASS = (jx)=>(jx === 'good' ? 'is-good' : (jx === 'bad' ? 'is-warn' : ''));
const NUM_GUA = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 6: '乾', 7: '兑', 8: '艮', 9: '离' };

export default function LiqiWorkspace({ school }) {
	const [xiangShan, setXiangShan] = useState('午');
	const [yun, setYun] = useState(9);
	const [year, setYear] = useState(new Date().getFullYear());
	const [zuoGua, setZuoGua] = useState('坎');
	const [ming, setMing] = useState({ year: 1990, isMale: true });
	const [shuiKou, setShuiKou] = useState('戌');
	const [waterFlow, setWaterFlow] = useState('leftToRight');
	const [sectors, setSectors] = useState({});
	const [waters, setWaters] = useState({});
	const [jian, setJian] = useState(false);
	const [tiVariant, setTiVariant] = useState('shen');
	const [month, setMonth] = useState(0);
	const [zhaiMode, setZhaiMode] = useState('zhai');

	// 实时重算（输入纯函数）。
	const result = useMemo(()=>{
		switch (school) {
			case 'xuankong': return xuankong(yun, xiangShan, { year, month: month || undefined, jian, tiVariant });
			case 'sanhe': return sanhe({ shuiKou, waterFlow });
			case 'zibai': return zibai({ year, month: month || undefined });
			case 'qiankun': return qiankun({ zuoGua, waters });
			case 'bazhai': return bazhai({ zuoGua, ming, mode: zhaiMode });
			case 'jinsuo': return jinsuo({ sectors });
			default: return null;
		}
	}, [school, xiangShan, yun, year, month, jian, tiVariant, zuoGua, ming, shuiKou, waterFlow, sectors, waters, zhaiMode]);

	// AI 快照同步（理气派激活期间以本派盘为 fengshui 模块真值）。
	useEffect(()=>{
		if (!result || !result.available) { return; }
		const text = buildSnapshot(school, result);
		if (text) { saveModuleAISnapshot('fengshui', text, { source: 'liqi', school }); }
	}, [result, school]);

	if (!result) { return null; }

	return (
		<div className="horosa-fengshui-liqi">
			<div className="horosa-fengshui-liqi-params">{renderParams()}</div>
			<div className="horosa-fengshui-liqi-chart">{renderChart()}</div>
			<div className="horosa-fengshui-liqi-panel">{renderPanel()}</div>
		</div>
	);

	function renderParams() {
		const sel = (label, value, opts, onCh)=>(
			<label className="horosa-fengshui-liqi-field"><span>{label}</span>
				<XQSelect value={value} options={opts} onChange={(ev)=>onCh(ev && ev.target ? ev.target.value : ev)} dropdownMatchSelectWidth={false} /></label>
		);
		if (school === 'xuankong') {
			return (<>
				{sel('元运', yun, YUN_OPTS, setYun)}
				{sel('向首', xiangShan, SHAN_OPTS, (v)=>{ setXiangShan(v); })}
				<label className="horosa-fengshui-liqi-field"><span>起卦法</span>
					<XQSegmented value={jian ? 'y' : 'n'} options={[{ value: 'n', label: '下卦(正向)' }, { value: 'y', label: '替卦(兼向)' }]} onChange={(ev)=>setJian((ev.target ? ev.target.value : ev) === 'y')} /></label>
				{jian ? sel('替星方案', tiVariant, TIVAR_OPTS, setTiVariant) : null}
				<label className="horosa-fengshui-liqi-field"><span>流年</span>
					<input type="number" value={year} min={1864} max={2043} onChange={(e)=>setYear(+e.target.value || year)} /></label>
				<label className="horosa-fengshui-liqi-field"><span>流月(0=不显)</span>
					<input type="number" value={month} min={0} max={12} onChange={(e)=>setMonth(Math.max(0, Math.min(12, +e.target.value || 0)))} /></label>
			</>);
		}
		if (school === 'sanhe') {
			return (<>
				{sel('水口(去水)', shuiKou, SK_OPTS, setShuiKou)}
				<label className="horosa-fengshui-liqi-field"><span>水势</span>
					<XQSegmented value={waterFlow} options={[{ value: 'leftToRight', label: '左水倒右' }, { value: 'rightToLeft', label: '右水倒左' }]} onChange={(ev)=>setWaterFlow(ev.target ? ev.target.value : ev)} /></label>
			</>);
		}
		if (school === 'zibai') {
			return (<>
				<label className="horosa-fengshui-liqi-field"><span>年份</span>
					<input type="number" value={year} onChange={(e)=>setYear(+e.target.value || year)} /></label>
				<label className="horosa-fengshui-liqi-field"><span>流月(0=不显)</span>
					<input type="number" value={month} min={0} max={12} onChange={(e)=>setMonth(Math.max(0, Math.min(12, +e.target.value || 0)))} /></label>
			</>);
		}
		if (school === 'bazhai') {
			return (<>
				{sel('坐山', zuoGua, GUA8_OPTS, setZuoGua)}
				<label className="horosa-fengshui-liqi-field"><span>命主年</span>
					<input type="number" value={ming.year} onChange={(e)=>setMing({ ...ming, year: +e.target.value || ming.year })} /></label>
				<label className="horosa-fengshui-liqi-field"><span>性别</span>
					<XQSegmented value={ming.isMale ? 'm' : 'f'} options={[{ value: 'm', label: '男' }, { value: 'f', label: '女' }]} onChange={(ev)=>setMing({ ...ming, isMale: (ev.target ? ev.target.value : ev) === 'm' })} /></label>
				<label className="horosa-fengshui-liqi-field"><span>门主灶基准</span>
					<XQSegmented value={zhaiMode} options={[{ value: 'zhai', label: '以宅' }, { value: 'ming', label: '以命' }]} onChange={(ev)=>setZhaiMode(ev.target ? ev.target.value : ev)} /></label>
			</>);
		}
		if (school === 'qiankun') {
			return (<>
				{sel('坐山', zuoGua, GUA8_OPTS, setZuoGua)}
				{QK_POS.map((p)=>(
					<label className="horosa-fengshui-liqi-field" key={p.key}><span>{p.label}水</span>
						<XQSegmented value={waters[p.key] || ''} options={COME_GO} onChange={(ev)=>setWaters({ ...waters, [p.key]: (ev.target ? ev.target.value : ev) })} /></label>
				))}
			</>);
		}
		if (school === 'jinsuo') {
			return GUA8_OPTS.map((o)=>(
				<label className="horosa-fengshui-liqi-field" key={o.value}><span>{o.label}方</span>
					<XQSegmented value={sectors[o.value] || 'flat'} options={SAND_WATER} onChange={(ev)=>setSectors({ ...sectors, [o.value]: (ev.target ? ev.target.value : ev) })} /></label>
			));
		}
		return null;
	}

	function renderChart() {
		if (school === 'xuankong') { return <LuoshuGrid palaces={result.palaces} mode="xuankong" highlightYun={result.yun} size={620} />; }
		if (school === 'zibai') { return <LuoshuGrid palaces={result.yearPalaces} mode="zibai" size={620} />; }
		if (school === 'bazhai') { return <LuoshuGrid palaces={result.palaces} mode="bazhai" size={620} />; }
		if (school === 'sanhe') { return <TwentyFourShanRing ring={result.ring} zuoShan={null} xiangShan={null} size={620} />; }
		if (school === 'jinsuo') {
			const p = result.palaces.map((x)=>({ gong: x.gong, gua: x.gua, dir: x.dir, primary: x.actual === 'sand' ? '砂' : (x.actual === 'water' ? '水' : '平'), secondary: x.deWei ? '得位' : '失位', jx: x.deWei ? 'good' : 'bad' }));
			return <EightPalaceDisk palaces={p} centerLabel={`金锁 ${result.score}分`} size={620} />;
		}
		if (school === 'qiankun') {
			const p = result.positions.map((x)=>({ gong: x.pos, dir: x.posName, primary: x.name.slice(0, 2), secondary: x.water === 'come' ? '来' : (x.water === 'go' ? '去' : ''), jx: x.jx }));
			return <EightPalaceDisk palaces={p} centerLabel={`坐${result.zuoGua}`} size={620} />;
		}
		return null;
	}

	function renderPanel() {
		const card = (title, children)=>(<div className="horosa-fengshui-liqi-card"><div className="horosa-fengshui-liqi-card-title">{title}</div>{children}</div>);
		const row = (k, v, jx)=>(<div className="horosa-fengshui-liqi-row" key={k}><span>{k}</span><strong className={JX_CLASS(jx)}>{v}</strong></div>);
		if (school === 'xuankong') {
			const wuG = result.monthPan ? [1, 2, 3, 4, 5, 6, 7, 8, 9].find((g)=>result.monthPan[g] === 5) : null;
			const wuName = wuG ? (result.palaces.find((p)=>p.gong === wuG) || {}).name : null;
			return (<>
				{card('格局', <>{row('坐向', `坐${result.zuoShan} 向${result.xiangShan}`)}{row('起卦', result.method + (result.jian && result.sameAsXiaGua ? '（替=下卦·同卦）' : ''), result.jian ? 'good' : '')}{row('格局', result.ge, result.ge.indexOf('旺山旺向') >= 0 ? 'good' : (result.ge.indexOf('上山下水') >= 0 ? 'bad' : ''))}{row('零正', `正神 ${result.zhengShen.name} / 零神 ${result.lingShen.name}`)}</>)}
				{result.flags.length ? card('结构', result.flags.map((f)=>row(f.label, f.nature === 'good' ? '吉' : '凶', f.nature))) : null}
				{result.gate && result.gate.available ? card('城门诀', <>{result.gate.zheng ? row('正城门', `${result.gate.zheng.name}（向星${result.gate.zheng.xiangStar}·${result.gate.zheng.heShi ? '合十' : '旺'}）`, 'good') : null}{result.gate.fu ? row('副城门', `${result.gate.fu.name}（向星${result.gate.fu.xiangStar}）`, 'good') : null}</>) : null}
				{card('双星断（逐宫）', result.palaces.map((p)=>row(`${p.name} ${p.shan}·${p.xiang}`, p.combo.note, p.combo.badge)))}
				{result.monthPan ? card('流月飞星', <>{row('月入中', `${result.monthPan[5]}`)}{row('向首流月星', `${result.monthPan[result.gXiang]}`)}{wuName ? row('五黄到（忌动）', wuName, 'bad') : null}</>) : null}
			</>);
		}
		if (school === 'sanhe') {
			return (<>{card('定局', <>{row('水口', `${result.shuiKou} → ${result.ju || '未定'}`)}{result.xiangFa ? row('立向', `${result.xiangFa.type}（${result.xiangFa.shuangshan || ''}）`, 'good') : null}</>)}
				{result.xiangFa ? card('收水', <div className="horosa-fengshui-liqi-note">{result.xiangFa.note}</div>) : null}</>);
		}
		if (school === 'zibai') {
			return (<>
				{card(`${result.year}年 紫白（入中 ${result.yearCenterStar}）`, result.yearPalaces.map((p)=>row(`${p.name} ${p.gua}`, `${p.starName} ${p.jx === 'good' ? '吉' : '凶'}`, p.jx)))}
				{result.monthPalaces ? card(`${result.month}月 流月紫白（入中 ${result.monthCenterStar}）`, result.monthPalaces.map((p)=>row(`${p.name} ${p.gua}`, `${p.starName} ${p.jx === 'good' ? '吉' : '凶'}`, p.jx))) : null}
			</>);
		}
		if (school === 'bazhai') {
			return (<>{card('宅命', <>{row('宅卦', `坐${result.zuoGua} · ${result.zhaiGroup}`)}{result.mingGua ? row('命卦', `${NUM_GUA[result.mingGua] || result.mingGua} · ${result.mingGroup}`) : null}{result.match ? row('相配', result.match.text, result.match.same ? 'good' : 'bad') : null}</>)}
				{card(`门主灶（${result.mode === 'ming' ? '以命卦' : '以宅卦'}）`, <>{row('门', result.doorMainStove.door)}{row('主', result.doorMainStove.main)}{row('灶', result.doorMainStove.stove)}</>)}
				{card('八方游星', result.palaces.map((p)=>row(p.dir, `${p.name}(${p.rank})`, p.jx)))}</>);
		}
		if (school === 'qiankun') {
			return (<>{card('先后天位', <>{row('先天位(主丁)', result.xianTian, 'good')}{row('后天位(主财)', result.houTian, 'good')}{row('案劫(向首)', result.anJie)}</>)}
				{card('来去水断', result.positions.map((p)=>row(p.name, p.result, p.jx)))}
				<div className="horosa-fengshui-liqi-note">{result.note}</div></>);
		}
		if (school === 'jinsuo') {
			return (<>{card(`得位 ${result.deCount}/8 · ${result.score} 分`, result.palaces.map((p)=>row(`${p.gua} ${p.needLabel}`, p.desc, p.deWei ? 'good' : (p.actual === 'flat' ? '' : 'bad'))))}
				{result.remedies.length ? card('化解', result.remedies.map((r, i)=>row(`化解${i + 1}`, r))) : null}</>);
		}
		return null;
	}
}

// AI 快照文本（各派）。
function buildSnapshot(school, r) {
	const L = [`【风水·${SCHOOL_CN[school] || school}】`];
	if (school === 'xuankong') {
		L.push(`坐${r.zuoShan}向${r.xiangShan} ${r.yun}运 · ${r.method}${r.jian ? `(${r.tiVariant})` : ''} · 格局：${r.ge}`);
		L.push(`零正：正神${r.zhengShen.name}/零神${r.lingShen.name}`);
		if (r.gate && r.gate.available && r.gate.zheng) { L.push(`城门：正城门${r.gate.zheng.name}${r.gate.fu ? `、副${r.gate.fu.name}` : ''}`); }
		if (r.flags.length) { L.push(`结构：${r.flags.map((f)=>f.label).join('、')}`); }
		L.push('双星：' + r.palaces.map((p)=>`${p.name}${p.shan}·${p.xiang}(${p.combo.note})`).join('；'));
	} else if (school === 'sanhe') {
		L.push(`水口${r.shuiKou}→${r.ju}` + (r.xiangFa ? ` · 立${r.xiangFa.type}` : ''));
	} else if (school === 'zibai') {
		L.push(`${r.year}年入中${r.yearCenterStar}`);
		L.push(r.yearPalaces.map((p)=>`${p.name}${p.starName}${p.jx === 'good' ? '吉' : '凶'}`).join(' '));
		if (r.monthPalaces) { L.push(`${r.month}月入中${r.monthCenterStar}`); }
	} else if (school === 'bazhai') {
		L.push(`坐${r.zuoGua}${r.zhaiGroup}` + (r.mingGua ? ` · 命卦${NUM_GUA[r.mingGua] || r.mingGua}${r.mingGroup}${r.match ? '·' + r.match.text : ''}` : ''));
		L.push(`门主灶(${r.mode === 'ming' ? '以命' : '以宅'})：${r.doorMainStove.door}`);
		L.push('游星：' + r.palaces.map((p)=>`${p.dir}${p.name}`).join(' '));
	} else if (school === 'qiankun') {
		L.push(`坐${r.zuoGua} · 先天位${r.xianTian}(主丁)/后天位${r.houTian}(主财)/案劫${r.anJie}`);
		L.push('来去水：' + r.positions.map((p)=>`${p.name}${p.result}`).join('；'));
	} else if (school === 'jinsuo') {
		L.push(`得位${r.deCount}/8 ${r.score}分`);
		L.push(r.palaces.map((p)=>`${p.gua}${p.deWei ? '得位' : (p.actual === 'flat' ? '平' : '失位')}`).join(' '));
	}
	return L.join('\n');
}

export const SCHOOL_CN = { naqi: '纳气盘', bagua: '八卦阳宅', bazhai: '八宅大游年', xuankong: '玄空飞星', sanhe: '三合水法', jinsuo: '金锁玉关', qiankun: '乾坤国宝', zibai: '紫白飞星' };
