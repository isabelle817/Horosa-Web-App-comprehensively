import { Component } from 'react';
import { Empty, Spin } from 'antd';
import { XQSelect as Select } from '../xq-ui';
import * as Constants from '../../utils/constants';
import request from '../../utils/request';
import { defaultAfter23NewDay, defaultLateZiHourUseNextDay } from '../../utils/dayBoundary';
import { getLayerSihua } from '../ziwei/ZiWeiHelper';
import { buildDaxianItems, buildLiunianItems, houseName } from '../ziwei/ZWLuckPanel';
import * as ZWConst from '../../constants/ZWConst';

const { Option } = Select;

// 紫微四化做进「三式合一」右栏:为三式起课时间取一张紫微盘,展示 生年 + 大运/流年 四化×落宫。
// 纯展示——复用紫微既有算法(getLayerSihua / ZWLuckPanel builders / ZWColor),不改紫微页、不触 AI 注册表。

function fv(fields, key, fb){
	return (fields && fields[key] && fields[key].value !== undefined && fields[key].value !== null) ? fields[key].value : fb;
}

function buildZiweiParams(fields){
	if(!fields || !fields.date || !fields.date.value || !fields.time || !fields.time.value){
		return null;
	}
	const timeAlg = fv(fields, 'timeAlg', 0);
	return {
		date: fields.date.value.format('YYYY-MM-DD'),
		time: fields.time.value.format('HH:mm:ss'),
		zone: fv(fields, 'zone', ''),
		lon: fv(fields, 'lon', ''),
		lat: fv(fields, 'lat', ''),
		gpsLat: fv(fields, 'gpsLat', ''),
		gpsLon: fv(fields, 'gpsLon', ''),
		gender: fv(fields, 'gender', 1),
		timeAlg: timeAlg === 1 ? 1 : 0,
		after23NewDay: defaultAfter23NewDay(),
		lateZiHourUseNextDay: defaultLateZiHourUseNextDay(),
	};
}

// 生年天干:盘 yearGan 优先,否则取年柱干支首字(天干无繁简问题)。
function pickYearGan(chart){
	if(!chart){ return ''; }
	if(chart.yearGan){ return `${chart.yearGan}`.charAt(0); }
	if(chart.nongli && chart.nongli.yearGanZi){ return `${chart.nongli.yearGanZi}`.charAt(0); }
	return '';
}

export default class SanShiZiWeiSihua extends Component {
	constructor(props){
		super(props);
		this.state = { chart: null, loading: false, err: '', daxianIdx: 0, liunianIdx: 0 };
		this._reqKey = '';
		this._seq = 0;
	}

	componentDidMount(){ this.maybeFetch(); }
	componentDidUpdate(){ this.maybeFetch(); }
	componentWillUnmount(){ this._seq++; }

	maybeFetch(){
		const params = buildZiweiParams(this.props.fields);
		if(!params){ return; }
		const key = JSON.stringify(params);
		if(key === this._reqKey){ return; } // 同时刻只拉一次(签名缓存)
		this._reqKey = key;
		const seq = ++this._seq;
		this.setState({ loading: true, err: '' });
		request(`${Constants.ServerRoot}/ziwei/birth`, { body: JSON.stringify(params), silent: true })
			.then((data)=>{
				if(seq !== this._seq){ return; }
				const result = data && data[Constants.ResultKey];
				const chart = result && result.chart ? result.chart : null;
				this.setState({ chart, loading: false, err: chart ? '' : '紫微盘获取失败', daxianIdx: 0, liunianIdx: 0 });
			})
			.catch(()=>{ if(seq === this._seq){ this.setState({ loading: false, err: '紫微盘获取失败' }); } });
	}

	renderHuaChips(gan){
		const chart = this.state.chart;
		const rows = gan ? (getLayerSihua(chart, gan) || []) : [];
		if(!rows.length){
			return <span style={{ color: 'var(--horosa-text-soft, #8a8f99)', fontSize: 12 }}>—</span>;
		}
		return (
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
				{rows.map((r)=>{
					const col = ZWConst.ZWColor[r.hua] || { bg: '#888', color: '#fff' };
					const palace = r.houseIndex >= 0 ? houseName(chart, r.houseIndex, true) : '—';
					return (
						<span
							key={r.hua}
							style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 4, background: col.bg, color: col.color, fontSize: 12, lineHeight: '18px' }}
						>
							<b>{r.hua}</b>{r.star}<i style={{ opacity: 0.85, fontStyle: 'normal' }}>·{palace}</i>
						</span>
					);
				})}
			</div>
		);
	}

	renderSection(title, body){
		return (
			<div style={{ marginBottom: 14 }}>
				<div style={{ fontSize: 13, fontWeight: 600, color: 'var(--horosa-text, #d0d3da)', marginBottom: 6 }}>{title}</div>
				{body}
			</div>
		);
	}

	render(){
		const { chart, loading, err } = this.state;
		if(loading){
			return <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>;
		}
		if(!chart){
			return <div style={{ padding: 24 }}><Empty description={err || '请先在左侧起盘'} /></div>;
		}
		const yearGan = pickYearGan(chart);
		const daxianItems = buildDaxianItems(chart) || [];
		const dxIdx = Math.min(this.state.daxianIdx, Math.max(0, daxianItems.length - 1));
		const dx = daxianItems[dxIdx] || null;
		const liunianItems = dx ? (buildLiunianItems(chart, dx) || []) : [];
		const lnIdx = Math.min(this.state.liunianIdx, Math.max(0, liunianItems.length - 1));
		const ln = liunianItems[lnIdx] || null;
		return (
			<div className="horosa-sanshi-ziwei-sihua" style={{ padding: '8px 10px', overflowY: 'auto', height: '100%' }}>
				{this.renderSection(`生年四化（${yearGan || '—'}）`, this.renderHuaChips(yearGan))}
				{this.renderSection('大运四化', (
					<div>
						<Select size="small" value={dxIdx} onChange={(v)=>this.setState({ daxianIdx: v, liunianIdx: 0 })} style={{ width: '100%', marginBottom: 6 }}>
							{daxianItems.map((d, i)=>(<Option key={d.id || i} value={i}>{`${d.top}　${d.ganzi}限`}</Option>))}
						</Select>
						{dx ? this.renderHuaChips(dx.gan) : <span style={{ color: 'var(--horosa-text-soft, #8a8f99)', fontSize: 12 }}>—</span>}
					</div>
				))}
				{this.renderSection('流年四化', (
					<div>
						<Select size="small" value={lnIdx} onChange={(v)=>this.setState({ liunianIdx: v })} style={{ width: '100%', marginBottom: 6 }} disabled={!liunianItems.length}>
							{liunianItems.map((y, i)=>(<Option key={y.id || i} value={i}>{`${y.top}　${y.ganzi}`}</Option>))}
						</Select>
						{ln ? this.renderHuaChips(ln.gan) : <span style={{ color: 'var(--horosa-text-soft, #8a8f99)', fontSize: 12 }}>—</span>}
					</div>
				))}
				<div style={{ fontSize: 11, color: 'var(--horosa-text-soft, #8a8f99)', marginTop: 4, lineHeight: 1.6 }}>
					四化随当前紫微流派（{ZWConst.ZWSchool ? ZWConst.ZWSchool.school : 'beipai'}）取表；按起课时间排盘。
				</div>
			</div>
		);
	}
}
