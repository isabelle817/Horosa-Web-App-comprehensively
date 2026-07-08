// divination/data/regionCharts.js
// 「地区盘」预置数据 + 用户自定义存取。只放中性历史建置时刻作示例；以用户自定义为主。
// 不预置任何政治敏感现代实体；坐标用 App 既有「度分」串式（如 '0w07' / '51n30'）+ 数值 gps。

export const REGION_CHARTS = {
	london_1066: {
		cn: '伦敦 · 加冕建置（历史示例）',
		date: '1066-12-25', time: '12:00:00', zone: '+00:00',
		lon: '0w07', lat: '51n30', gpsLon: -0.12, gpsLat: 51.50,
		note: '西敏寺加冕，世俗占星经典历史盘例。',
	},
	philadelphia_1776: {
		cn: '费城 · 建置（历史示例）',
		date: '1776-07-04', time: '17:10:00', zone: '-05:00',
		lon: '75w09', lat: '39n57', gpsLon: -75.15, gpsLat: 39.95,
		note: '世俗占星常用历史盘例之一。',
	},
	paris_1792: {
		cn: '巴黎 · 共和建置（历史示例）',
		date: '1792-09-22', time: '12:00:00', zone: '+00:09',
		lon: '2e21', lat: '48n51', gpsLon: 2.35, gpsLat: 48.85,
		note: '历史建置时刻示例。',
	},
};

const USER_KEY = 'horosa.mundane.region.user.v1';

// 读用户自定义地区盘（对象 map，键为用户输入或自动键）。失败返回 {}。
export function loadUserRegions(){
	try{
		if(typeof localStorage === 'undefined'){ return {}; }
		const raw = localStorage.getItem(USER_KEY);
		if(!raw){ return {}; }
		const obj = JSON.parse(raw);
		return (obj && typeof obj === 'object') ? obj : {};
	}catch(e){ return {}; }
}

// 写入一条用户自定义地区盘。返回新的用户 map。
export function saveUserRegion(key, rec){
	try{
		if(typeof localStorage === 'undefined' || !key || !rec){ return loadUserRegions(); }
		const cur = loadUserRegions();
		cur[key] = rec;
		localStorage.setItem(USER_KEY, JSON.stringify(cur));
		return cur;
	}catch(e){ return loadUserRegions(); }
}

export function removeUserRegion(key){
	try{
		if(typeof localStorage === 'undefined' || !key){ return loadUserRegions(); }
		const cur = loadUserRegions();
		delete cur[key];
		localStorage.setItem(USER_KEY, JSON.stringify(cur));
		return cur;
	}catch(e){ return loadUserRegions(); }
}

// 合并预置 + 用户。用户同键覆盖预置。
export function allRegions(){
	return { ...REGION_CHARTS, ...loadUserRegions() };
}

export default { REGION_CHARTS, loadUserRegions, saveUserRegion, removeUserRegion, allRegions };
