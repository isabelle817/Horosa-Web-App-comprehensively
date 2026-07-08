// divination/mundane/momentPipeline.js
// 世俗「精确时刻 → 排盘」复用基座。一处实现，两处用：
//   (1) 世俗盘：新月/满月/日食/月食事件扫描 + 选中后按精确时刻起盘（走 DivinationChartShell 的 setTime）。
//   (2) 择日盘「时势合参」：前一次新/满月、前一次日/月食、当年入宫盘 等单独排盘（chartAtMoment 不动主盘）。
// 后端复用既有 /astroextra/ephemeris（已返回 lunarPhases / eclipses / ingresses / stations，无需新端点）。
import request from '../../utils/request';
import * as Constants from '../../utils/constants';
import { fetchChart } from '../../services/astro';
import DateTime from '../../components/comp/DateTime';
import { SIGNS } from '../data/signs';

const SIGN_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

// 由黄经直接定座（最稳，避免依赖后端 sign 字段大小写/语言）。
export function signKeyFromLon(lon){
	const n = Number(lon);
	if(!Number.isFinite(n)){ return null; }
	const norm = ((n % 360) + 360) % 360;
	return SIGN_KEYS[Math.floor(norm / 30)] || null;
}

// 事件本地时刻：后端 date_time_from_jd 给 datetime（'YYYY-MM-DD HH:mm:ss'，已按 zone 折算）。
function localTimeOf(ev){
	if(!ev){ return ''; }
	if(ev.datetime){ return ev.datetime; }
	if(ev.date && ev.time){ return `${ev.date} ${ev.time}`; }
	return ev.date || '';
}

// 离最近交点（升/降）的角距，用于食强度（~18° 内方成食）。
export function nodeDistance(lon, nodeLon){
	const a = Number(lon); const b = Number(nodeLon);
	if(!Number.isFinite(a) || !Number.isFinite(b)){ return null; }
	const norm = (x) => ((x % 360) + 360) % 360;
	const sep = (x, y) => { const d = Math.abs(norm(x - y)); return Math.min(d, 360 - d); };
	return Math.min(sep(a, b), sep(a, b + 180));
}

// 入宫盘掌管时长（经典定则）：上升基本座→3 月、变动座→6 月、固定座→12 月。
export function ingressDurationMonths(ascSignKey){
	const sign = ascSignKey ? SIGNS[ascSignKey] : null;
	const mod = sign && sign.modality;
	if(mod === 'fixed'){ return 12; }
	if(mod === 'mutable'){ return 6; }
	return 3; // cardinal 或缺省
}

// 扫描一段时间内的世俗事件。opts: {startDate:'YYYY-MM-DD', endDate, zone, lat, lon, gpsLat, gpsLon, kinds?:[...]}。
// kinds 省略 = 全要。返回归一化的 {lunations, eclipses, ingresses, stations, err}。
export async function fetchMundaneEvents(opts){
	const o = opts || {};
	const zone = o.zone || '+08:00';
	const body = {
		date: o.startDate,
		time: '00:00:00',
		startDate: o.startDate,
		endDate: o.endDate || o.startDate,
		startTime: '00:00:00',
		endTime: '23:59:59',
		zone,
		lat: o.lat || '0n00',
		lon: o.lon || '0e00',
		gpsLat: o.gpsLat != null ? o.gpsLat : 0,
		gpsLon: o.gpsLon != null ? o.gpsLon : 0,
		includeTransits: false,
	};
	let data;
	try{
		data = await request(`${Constants.ServerRoot}/astroextra/ephemeris`, {
			body: JSON.stringify(body),
			timeoutMs: 90000,
		});
	}catch(e){
		return { lunations: [], eclipses: [], ingresses: [], stations: [], err: 'ephemeris-failed' };
	}
	const r = (data && data.Result) ? data.Result : data;
	const want = (k) => !o.kinds || o.kinds.indexOf(k) >= 0;
	const lp = (r && r.lunarPhases) || [];
	const ec = (r && r.eclipses) || [];
	const ing = (r && r.ingresses) || [];
	const st = (r && r.stations) || [];
	const lunations = want('lunations') ? lp.map((e) => ({
		phase: e.phase,
		localTime: localTimeOf(e),
		moonLon: e.moonLon,
		sunLon: e.sunLon,
		sign: signKeyFromLon(e.moonLon),
		signlon: e.signlon,
		raw: e,
	})) : [];
	const eclipses = want('eclipses') ? ec.map((e) => ({
		kind: e.type === 'lunar_eclipse' ? 'lunar' : 'solar',
		eclipseType: e.eclipseType,
		localTime: localTimeOf(e),
		lon: e.lon,
		sign: signKeyFromLon(e.lon),
		signlon: e.signlon,
		raw: e,
	})) : [];
	return {
		lunations,
		eclipses,
		ingresses: want('ingresses') ? ing : [],
		stations: want('stations') ? st : [],
		err: null,
	};
}

// 仅取 newmoon / fullmoon 的便捷封装。
export async function fetchLunations(opts){
	const res = await fetchMundaneEvents({ ...(opts || {}), kinds: ['lunations'] });
	return res;
}

// 把一个精确本地时刻字符串解析为 DateTime（供组件 setTime）。zone 必传以正确定时区。
export function momentToDateTime(momentStr, zone){
	if(!momentStr){ return null; }
	const dt = new DateTime();
	if(zone && dt.setZone){ dt.setZone(zone); }
	const parsed = dt.parse ? dt.parse(momentStr, 'YYYY-MM-DD HH:mm:ss') : null;
	const use = parsed || dt;
	if(use.calcJdn){ use.calcJdn(); }
	return use;
}

// 在任意时刻 + 给定地点独立排一张盘（不影响主盘）。fieldsLike: {zone,lat,lon,gpsLat,gpsLon,hsys,zodiacal,tradition}。
// 用于择日「时势合参」拉前一次新/满月、日/月食、入宫盘等。返回 /chart 的 Result，失败返回 null。
export async function chartAtMoment(momentStr, fieldsLike){
	const dt = momentToDateTime(momentStr, (fieldsLike && fieldsLike.zone) || '+08:00');
	if(!dt){ return null; }
	const f = fieldsLike || {};
	const params = {
		ad: dt.ad,
		date: dt.format ? dt.format('YYYY/MM/DD') : null,
		time: dt.format ? dt.format('HH:mm:ss') : null,
		zone: dt.zone || f.zone || '+08:00',
		lat: f.lat || '0n00',
		lon: f.lon || '0e00',
		gpsLat: f.gpsLat != null ? f.gpsLat : 0,
		gpsLon: f.gpsLon != null ? f.gpsLon : 0,
		hsys: f.hsys != null ? f.hsys : 0,
		zodiacal: f.zodiacal != null ? f.zodiacal : 0,
		// 恒星黄道 ayanāṃśa：择日「时势合参」子盘(Election chartAtMoment)须随主盘 ayanāṃśa；缺省 '' = 后端默认(回归/Lahiri)。
		siderealAyanamsa: f.siderealAyanamsa != null ? f.siderealAyanamsa : '',
		tradition: f.tradition != null ? f.tradition : 1,
		predictive: 0,
		pdaspects: [0, 60, 90, 120, 180],
	};
	try{
		const rsp = await fetchChart(params, { cache: true });
		return (rsp && rsp.Result) ? rsp.Result : null;
	}catch(e){
		return null;
	}
}

export default { fetchMundaneEvents, fetchLunations, chartAtMoment, momentToDateTime, ingressDurationMonths, nodeDistance, signKeyFromLon };
