import request from '../utils/request';
import { ServerRoot, ResultKey } from '../utils/constants';
import { buildKentangEndpoint } from '../integrations/kentang/serviceRoot';
import { fetchChartWithRetry } from '../utils/chartFetch';
import { cachedPost } from './_requestCache';

// 七政四余是确定性纯计算(同 params 必产同结果);对其加「同参复用 + 在途合并」让重开/来回切瞬时,
// 命中返回的是同一结果的深拷贝(与直连逐值等价、只更快)。不同 params → 不同 key → 重新请求。

export function fetchMoiraQizhengRules(values, requestOptions){
	return cachedPost(`${ServerRoot}/qizheng/moira`, values || {}, requestOptions, { ns: 'qizheng/moira' });
}

// ken 后端 /qizhengkin/pan 不走 AstroHelper 缓存层 → 这里在前端做同参去重 + LRU(48 条)。
const KIN_CACHE_MAX = 48;
const kinMem = new Map();
const kinInflight = new Map();

function kinKey(values){
	try{
		return JSON.stringify(values || {});
	}catch(e){
		return '';
	}
}

function kinClone(obj){
	if(obj === undefined || obj === null){
		return obj;
	}
	try{
		return JSON.parse(JSON.stringify(obj));
	}catch(e){
		return obj;
	}
}

async function fetchKinastroQizhengRaw(values){
	let rsp = null;
	try{
		const response = await fetchChartWithRetry(buildKentangEndpoint('qizhengkin', 'pan'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json; charset=UTF-8' },
			body: JSON.stringify(values || {}),
		});
		const text = await response.text();
		rsp = text ? JSON.parse(text) : null;
		if(!rsp || (rsp.ResultCode !== undefined && rsp.ResultCode !== 0)){
			throw new Error(rsp && rsp[ResultKey] ? `${rsp[ResultKey]}` : 'qizhengkin.local.fetch.failed');
		}
	}catch(e){
		const response = await fetchChartWithRetry(`${ServerRoot}/qizhengkin/pan`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json; charset=UTF-8' },
			body: JSON.stringify(values || {}),
		});
		const text = await response.text();
		rsp = text ? JSON.parse(text) : null;
	}
	if(!rsp || (rsp.ResultCode !== undefined && rsp.ResultCode !== 0)){
		throw new Error(rsp && rsp[ResultKey] ? `${rsp[ResultKey]}` : 'qizhengkin.fetch.failed');
	}
	return rsp && rsp[ResultKey] ? rsp[ResultKey] : rsp;
}

export async function fetchKinastroQizheng(values){
	const key = kinKey(values);
	if(key && kinMem.has(key)){
		return kinClone(kinMem.get(key));
	}
	if(key && kinInflight.has(key)){
		return kinClone(await kinInflight.get(key));
	}
	const p = fetchKinastroQizhengRaw(values);
	if(key){
		kinInflight.set(key, p);
	}
	try{
		const res = await p;
		if(key && res){
			if(kinMem.has(key)){
				kinMem.delete(key);
			}
			kinMem.set(key, kinClone(res));
			if(kinMem.size > KIN_CACHE_MAX){
				const first = kinMem.keys().next().value;
				if(first !== undefined){
					kinMem.delete(first);
				}
			}
		}
		return kinClone(res);
	}finally{
		if(key){
			kinInflight.delete(key);
		}
	}
}
