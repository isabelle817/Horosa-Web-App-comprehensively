// G7 七气候带 Klimata + 斜升时间表(希腊化古典占星):折叠展示卡,嵌本命「古典」tab。
// 纯前端派生,零后端,零回归:只读现成 chartObj 出生纬度(params.lat / fields.lat 的 "NNnMM" 串)。
// ① 7 气候带固定常量(带/城/纬度/最长昼),高亮当前纬度所在带;② 当前纬度 12 座斜升时度(闭式,座和=360);
// ③ Valens 上升时度半圆累计级数标当前带。气候带为地理/术语固定值;中性表述。
import { Component } from 'react';
import { SmallTable } from './AstroExtraCommon';
import { KLIMATA, SIGN_CN } from '../../divination/data/hellenisticData';

const MUTED = 'var(--horosa-muted, #999)';
const BORDER = 'var(--horosa-border, rgba(120,120,120,0.28))';
const GOLD = 'var(--horosa-gold, #b8860b)';
const HILITE = 'rgba(184,134,11,.12)';

const OBLIQUITY = 23.44; // 当世黄赤交角约值(度)。
const DEG = Math.PI / 180;

// 7 气候带固定表:带号 / 城(英·中)/ 纬度(度分串·十进制)/ 最长昼(小时)/ Valens 半圆累计级数。
// 十进制纬度优先取数据底座 KLIMATA[i].lat(若缺则用此处常量);度分串/中文城名/Valens 级数底座未含,此处补全。
const VALENS_SERIES = [210, 214, 218, 222, 226, 230, 234]; // 每带 +4,半圆(180°方向)上升时度累计级数。
const BANDS_BASE = [
	{ n: 1, cityEn: 'Meroe', cityCn: '麦罗埃', latStr: '16°27′', lat: 16.45, longestDay: 13 },
	{ n: 2, cityEn: 'Syene', cityCn: '塞伊尼(阿斯旺)', latStr: '23°51′', lat: 23.85, longestDay: 13.5 },
	{ n: 3, cityEn: 'Alexandria', cityCn: '亚历山大(下埃及)', latStr: '30°22′', lat: 30.37, longestDay: 14 },
	{ n: 4, cityEn: 'Rhodes', cityCn: '罗德岛', latStr: '36°00′', lat: 36, longestDay: 14.5 },
	{ n: 5, cityEn: 'Hellespont', cityCn: '赫勒斯滂', latStr: '40°56′', lat: 40.93, longestDay: 15 },
	{ n: 6, cityEn: 'Borysthenes', cityCn: '博里斯提尼斯(中本都)', latStr: '45°01′', lat: 45.02, longestDay: 15.5 },
	{ n: 7, cityEn: 'Mouth of Borysthenes', cityCn: '博里斯提尼斯河口', latStr: '48°32′', lat: 48.53, longestDay: 16 },
];

// 数据底座 KLIMATA 与常量按带号对齐:十进制纬度/最长昼以底座为准(若结构齐全),其余字段用本表补。
function buildBands(){
	const data = Array.isArray(KLIMATA) ? KLIMATA : [];
	return BANDS_BASE.map((b, i)=>{
		const d = data[i] || {};
		return {
			...b,
			lat: (typeof d.lat === 'number') ? d.lat : b.lat,
			longestDay: (typeof d.longest_day_h === 'number') ? d.longest_day_h : b.longestDay,
			valens: VALENS_SERIES[i],
		};
	});
}

// "26n04" / "26s04" / "31.5" → 十进制纬度(北正南负);无法解析返回 null。
function parseLat(raw){
	if(raw === undefined || raw === null){ return null; }
	const s = String(raw).trim();
	if(!s){ return null; }
	const m = s.toLowerCase().match(/^(\d+(?:\.\d+)?)([ns])(\d+(?:\.\d+)?)?$/);
	if(m){
		const deg = parseFloat(m[1]);
		const min = m[3] ? parseFloat(m[3]) : 0;
		const v = deg + min / 60;
		return m[2] === 's' ? -v : v;
	}
	const num = parseFloat(s);
	return Number.isFinite(num) ? num : null;
}

// 从 chartObj 取出生纬度十进制。优先 params.lat,退而 fields.lat.value。
function readLatDeg(chartObj, fields){
	const params = (chartObj && chartObj.params) || {};
	let v = parseLat(params.lat);
	if(v === null && fields && fields.lat){
		v = parseLat(fields.lat.value !== undefined ? fields.lat.value : fields.lat);
	}
	return v;
}

// 当前纬度落在哪个气候带:取纬度绝对值最接近的带(超界则贴最近端带)。
function currentBandIndex(bands, latDeg){
	if(latDeg === null || !bands.length){ return -1; }
	const abs = Math.abs(latDeg);
	let best = 0;
	let bestDiff = Infinity;
	bands.forEach((b, i)=>{
		const diff = Math.abs(abs - b.lat);
		if(diff < bestDiff){ bestDiff = diff; best = i; }
	});
	return best;
}

// 斜升时度闭式:δ=asin(sinε·sinλ)/α=atan2(cosε·sinλ,cosλ)/AD=asin(tanδ·tanφ)/OA=α−AD。
// 单座上升时度 = OA(座末)−OA(座首);12 座和=360。返回各座度数数组(长度 12)。
function obliqueAscensions(latDeg){
	const phi = latDeg * DEG;
	const eps = OBLIQUITY * DEG;
	const tanPhi = Math.tan(phi);
	// 黄经 λ → OA(0..360 连续展开)。
	const oa = (lamDeg)=>{
		const lam = lamDeg * DEG;
		const sinDelta = Math.sin(eps) * Math.sin(lam);
		const delta = Math.asin(Math.max(-1, Math.min(1, sinDelta)));
		const alpha = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)); // -π..π
		let ad = Math.asin(Math.max(-1, Math.min(1, Math.tan(delta) * tanPhi)));
		if(!Number.isFinite(ad)){ ad = 0; } // 极区超界保护(asin 域外)。
		let oaDeg = (alpha - ad) / DEG;
		return oaDeg;
	};
	// 以 RA 为骨:取每座首末 OA,差值规整到 (0,360)→各座度数,再缩放到精确 360 总和(消浮点漂移)。
	const raw = [];
	for(let i = 0; i < 12; i++){
		let span = oa((i + 1) * 30) - oa(i * 30);
		span = ((span % 360) + 360) % 360;
		raw.push(span);
	}
	const sum = raw.reduce((a, b)=>a + b, 0) || 360;
	return raw.map((v)=>v * 360 / sum);
}

// 时度 → 恒星小时(15 时度 = 1 小时)。
function toSiderealHour(asc){ return asc / 15; }

class AstroKlimata extends Component{
	constructor(props){
		super(props);
		this.state = { open: false };
	}
	render(){
		const chartObj = this.props.value;
		const fields = this.props.fields;
		const { open } = this.state;
		const bands = buildBands();
		const latDeg = readLatDeg(chartObj, fields);
		const curIdx = currentBandIndex(bands, latDeg);
		const hasLat = latDeg !== null;
		const ascs = hasLat ? obliqueAscensions(latDeg) : [];

		const bandRows = bands.map((b, i)=>({ ...b, _cur: i === curIdx }));
		const signRows = ascs.map((asc, i)=>({
			idx: i,
			sign: SIGN_CN[i],
			asc,
			hour: toSiderealHour(asc),
		}));

		return (
			<div className="horosa-info-card horosa-classical-card">
				<div className="horosa-classical-card-title" style={{ cursor: 'pointer', justifyContent: 'space-between' }}
					onClick={()=>this.setState({ open: !open })}>
					<span style={{ display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0 }}>
						<span className="horosa-classical-zh">七气候带</span>
						<span className="horosa-classical-en">Klimata · 斜升时间</span>
					</span>
					<span style={{ color: MUTED, fontSize: 12, flex: '0 0 auto' }}>{open ? '收起 ▲' : '展开 ▼'}</span>
				</div>
				{open ? (
					<div style={{ marginTop: 8 }}>
						<div style={{ color: MUTED, fontSize: 12, marginBottom: 6 }}>
							古典占星以七条标志性纬线(气候带)划分可居地带,每带最长昼递增半小时。下表标志带为地理固定值;
							{hasLat
								? <span>　当前出生纬度 <b style={{ color: GOLD }}>{Math.abs(latDeg).toFixed(2)}°{latDeg < 0 ? 'S' : 'N'}</b>,归入第 <b style={{ color: GOLD }}>{bands[curIdx] ? bands[curIdx].n : '-'}</b> 带({bands[curIdx] ? bands[curIdx].cityCn : '-'})。</span>
								: <span style={{ color: GOLD }}>　需出生纬度方可定带与斜升时度。</span>}
						</div>

						<div style={{ fontSize: 12, fontWeight: 600, margin: '8px 0 2px' }}>七气候带表</div>
						<SmallTable
							rowKey={(r)=>r.n}
							rows={bandRows}
							rowStyle={(r)=>(r._cur ? { background: HILITE } : undefined)}
							columns={[
								{ key: 'n', title: '带', render: (v, r)=>(<span style={{ color: r._cur ? GOLD : 'inherit', fontWeight: r._cur ? 700 : 400 }}>{v}</span>) },
								{ key: 'cityCn', title: '标志地', render: (v, r)=>(<span>{v}<span style={{ color: MUTED }}> · {r.cityEn}</span></span>) },
								{ key: 'latStr', title: '纬度', render: (v)=>v },
								{ key: 'longestDay', title: '最长昼', render: (v)=>`${v}h` },
								{ key: 'valens', title: '半圆级数', render: (v, r)=>(<span style={{ color: r._cur ? GOLD : 'inherit' }}>{v}</span>) },
							]}
						/>
						<div style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>
							半圆级数:自上升起半周(180°方向)上升时度的累计基准值,每带递增 4(210 → 234)。
						</div>

						<div style={{ fontSize: 12, fontWeight: 600, margin: '12px 0 2px' }}>当前纬度 · 十二座斜升时度</div>
						{hasLat ? (
							<div>
								<SmallTable
									rowKey={(r)=>r.idx}
									rows={signRows}
									columns={[
										{ key: 'sign', title: '星座', render: (v)=>v },
										{ key: 'asc', title: '上升时度', render: (v)=>`${v.toFixed(2)}°` },
										{ key: 'hour', title: '折恒星时', render: (v)=>`${v.toFixed(2)}h` },
									]}
								/>
								<div style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>
									斜升时度按 δ=asin(sinε·sinλ)、α=atan2(cosε·sinλ,cosλ)、AD=asin(tanδ·tanφ)、OA=α−AD 闭式,
									ε≈{OBLIQUITY}°;各座之和恒为 360 时度(全黄道升起一周),15 时度折 1 恒星小时。
								</div>
							</div>
						) : (
							<div style={{ color: GOLD, fontSize: 12 }}>需出生纬度。</div>
						)}
					</div>
				) : null}
			</div>
		);
	}
}

export default AstroKlimata;
