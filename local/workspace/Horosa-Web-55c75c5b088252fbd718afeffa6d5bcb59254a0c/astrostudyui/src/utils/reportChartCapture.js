// 报告功能 - 命盘图截图基础设施（隐藏挂载点 + html-to-image）
// 用法：
//   const dataURL = await captureChartByType('bazi-fourColumns', caseRecord, { ... });
//
// 内部架构：
//   1. ensureHiddenHost() 在 document.body 末尾创建一个不可见 host 容器（单例）
//   2. 每次截图新建一个 mountPoint（host 的子节点），独立 React root，避免污染外部 state
//   3. 渲染 ChartCaptureMount（取数+渲 PaiBaZi/ZiWeiChart），传 onCaptureReady 回调
//   4. 等 onCaptureReady 触发 + 几帧后用 html-to-image 截目标 DOM
//   5. 截完 unmount + 清理 mountPoint

import React from 'react';
import ReactDOM from 'react-dom';
import ChartCaptureMount from '../components/common/ChartCaptureMount';

// 单例隐藏 host
let hiddenHost = null;

function ensureHiddenHost(){
	if(typeof document === 'undefined') return null;
	if(hiddenHost && document.body.contains(hiddenHost)) return hiddenHost;
	hiddenHost = document.createElement('div');
	hiddenHost.id = '__report_chart_capture_host__';
	// audit 修(用户反馈"没有加入本命盘截图" 根因):
	// 之前用 `visibility:hidden` + `left:-99999px` → d3 内部 `getBBox()` 在 visibility:hidden 父容器
	// 内返 0×0,导致 SVG text/line 元素绘制成 0 尺寸,整张紫微 12 宫盘几乎透明 → html-to-image
	// 截到空白图 → 被 40KB 阈值过滤返回 null → 用户看不到图。
	// 改 `opacity:0` 屏内不可见但 layout+绘制都正常,d3 getBBox/getBoundingClientRect 拿到真实尺寸。
	// 同时位置改 (0,0) 让 d3 计算坐标系不出负值。
	hiddenHost.style.cssText = [
		'position:fixed', 'left:0', 'top:0',
		'width:1400px', 'height:1000px',
		'overflow:hidden', 'pointer-events:none',
		'z-index:-9999', 'opacity:0',
	].join(';');
	document.body.appendChild(hiddenHost);
	return hiddenHost;
}

// 懒加载 html-to-image（避免引入时阻塞）
let htmlToImageLib = null;
async function loadHtmlToImage(){
	if(htmlToImageLib) return htmlToImageLib;
	try{
		htmlToImageLib = await import('html-to-image');
		return htmlToImageLib;
	}catch(e){
		return null;
	}
}

// audit 修:多并发截图共用单例 hiddenHost + 子节点会 ReactDOM unmount race。
// 全局串行化 - 同时只允许 1 个截图任务,后来的排队等待。
// audit 4 修:加 30s timeout backstop 防 ChartCaptureMount 卡死导致 lock 永远 pending,
// 下一个截图任务永远等待。
const CAPTURE_LOCK_TIMEOUT_MS = 30000;
let captureLock = Promise.resolve();
function withCaptureLock(fn){
	// 串行化且 fn 恰好执行一次:timeout 只用于「放行」(防前一个任务卡死把队列永久锁住)。
	// 原实现把 fn 塞进 race 的两臂 + catch 兜底 → 每次截图 30s 后整管线被弃跑第二遍、
	// 失败再跑一遍,与在共享 hiddenHost 上防的并发 unmount 竞态自相矛盾。
	const release = Promise.race([
		captureLock,
		new Promise((resolve)=>setTimeout(resolve, CAPTURE_LOCK_TIMEOUT_MS)),
	]);
	const next = release.then(()=>fn());
	captureLock = next.catch(()=>{}).then(()=>{}); // 防止 lock 链条被 reject 卡死
	return next;
}

// 主入口：chartType 可以是字符串（如 'bazi-fourColumns'）或对象（如 {type:'ziwei-palace-highlight', palace:'fuqi'}）
// caseRecord 来自 listLocalCharts 的 chart record；包含 birth/zone/lon/lat/gender 等
export async function captureChartByType(chartType, caseRecord, options = {}){
	return withCaptureLock(()=>captureChartByTypeInner(chartType, caseRecord, options));
}

// audit 修(用户反馈"没有加入本命盘截图" 系统加固):
// 失败时不再静默 return null,改记录原因到 lastCaptureFailures 让 UI 能告知用户。
const lastCaptureFailures = [];
export function getRecentCaptureFailures(){ return lastCaptureFailures.slice(-20); }
export function clearCaptureFailures(){ lastCaptureFailures.length = 0; }
function recordFailure(chartType, reason, extra){
	const entry = { chartType: typeof chartType === 'string' ? chartType : (chartType && chartType.type), reason, extra: extra || null, at: new Date().toISOString() };
	lastCaptureFailures.push(entry);
	if(lastCaptureFailures.length > 50) lastCaptureFailures.splice(0, lastCaptureFailures.length - 50);
	// v1.17: 用 JSON.stringify 防 console.warn 把 object 序列化成 "[object Object]" 看不到细节
	try { console.warn('[reportChartCapture] failed:', JSON.stringify(entry)); } catch(_){}
}
// v1.17 debug: 暴露给 window 让 preview/devtools 能 inspect + 直接调测试
if(typeof window !== 'undefined'){
	window.__captureChartDebug__ = {
		failures: ()=>lastCaptureFailures.slice(),
		clear: ()=>{ lastCaptureFailures.length = 0; },
		capture: (chartType, caseRecord, options)=>captureChartByType(chartType, caseRecord, options),
	};
}

async function captureChartByTypeInner(chartType, caseRecord, options = {}){
	if(typeof document === 'undefined') return null;
	const norm = (typeof chartType === 'string') ? { type: chartType } : { ...chartType };
	if(!norm.type){
		recordFailure(chartType, 'missing chart type');
		return null;
	}
	const host = ensureHiddenHost();
	if(!host){
		recordFailure(chartType, 'no document/host');
		return null;
	}

	const lib = await loadHtmlToImage();
	if(!lib || !lib.toPng){
		recordFailure(chartType, 'html-to-image lib missing');
		return null;
	}

	if(!caseRecord){
		recordFailure(chartType, 'caseRecord missing — case 未保存或 sources 缺 record');
		return null;
	}

	const mountPoint = document.createElement('div');
	host.appendChild(mountPoint);

	try{
		// 等渲染完成
		// 注：ReactDOM.render 同步阶段抛错(如组件 render 异常)会逃出 Promise 构造器变成未捕获异常,
		// 必须把 render 调用本身放 try/catch 内,任何异常都改走 reject 路径,杜绝 dev overlay 弹窗。
		await new Promise((resolve, reject)=>{
			const timeoutMs = options.timeoutMs || 20000;
			const timer = setTimeout(()=>reject(new Error('capture.render.timeout (20s) — 后端 /bazi/direct 或 /ziwei/birth 没回 / 命盘组件未触发 onCaptureReady')), timeoutMs);
			try {
				ReactDOM.render(
					React.createElement(ChartCaptureMount, {
						chartType: norm,
						caseRecord,
						captureExtra: norm,
						onCaptureReady: ()=>{
							clearTimeout(timer);
							// audit 修:等更久(1500ms)让 PaiBaZi/ZiWeiChart 的 d3/SVG retry 完成绘图。
							// ZiWeiChart 用 requestAnimationFrame 链 + sizeRetryCount<8 兜底,需要 ~8 帧才稳定。
							setTimeout(()=>resolve(), 1500);
						},
						onCaptureError: (e)=>{
							// onCaptureError 不直接 reject,改让 ChartCaptureMount 自己渲染错误占位、然后 onCaptureReady 触发,
							// 这样我们仍能截到一张「截图失败 X」的占位图,而不是抛错让上层拿到 null 又无图。
						},
					}),
					mountPoint
				);
			} catch(renderErr) {
				clearTimeout(timer);
				reject(renderErr);
			}
		});

		// 找到目标截图区域
		// v1.21: 优先只截「盘本身」——八字四柱图(.horosa-bazi-main-chart-slot)/紫微12宫盘(.horosa-ziwei-chart-viewport),
		// 剔除挂载组件里的输入表单 / 命盘·运限·格局 tabs / 文字信息 / 大限格子。找不到再回退整容器。
		let target = mountPoint.querySelector('[data-capture-chart-only]')
		           || mountPoint.querySelector(`[data-capture-target="${norm.type}"]`)
		           || mountPoint.querySelector('[data-capture-target]')
		           || mountPoint.firstElementChild;
		if(!target){
			recordFailure(chartType, 'capture target not found in DOM');
			throw new Error('capture.target.not.found');
		}

		// v1.16-A00 修(再放宽):
		// 用户反馈仍 "text too short (8 chars)" — 8 字基本是只有标题"DHX · 紫微 12 宫盘"。
		// 截图失败不应阻塞流水线,改为:textContent < 12 字 才视为完全空,
		// >=12 字就放过(让 AI 至少看到一个标题占位图,不要弹失败 Modal 打扰用户)。
		// 真实命盘有内容时 textContent 通常 50+ 字, 不会误判。
		const innerText = (target.textContent || '').trim();
		if(innerText.length < 12){
			recordFailure(chartType, `text too short (${innerText.length} chars) — 命盘真未绘制(标题都没了)`, { textPreview: innerText.slice(0, 80) });
			return null;
		}

		// 截图
		const dataURL = await lib.toPng(target, {
			backgroundColor: '#ffffff',
			pixelRatio: 1.5,
			width: Math.min(target.scrollWidth || 1200, 1400),
			height: Math.min(target.scrollHeight || 900, 1200),
			cacheBust: true,
			filter: (node)=>{
				if(!node || !node.classList) return true;
				return !node.classList.contains('no-export') && !node.classList.contains('xq-no-capture');
			},
		});
		// audit 修(放宽):
		// dataURL 阈值 40KB → 12KB。理由:simple 模式四柱图实际 15-30KB,被 40KB 误杀。
		// 完全空白 1200×900 PNG 在 8-10KB 量级,12KB 足以分辨"完全空" vs "有内容但稀疏"。
		if(!dataURL){
			recordFailure(chartType, 'html-to-image returned null/empty');
			return null;
		}
		if(dataURL.length < 12000){
			recordFailure(chartType, `dataURL too small (${dataURL.length} bytes) — 极可能是空白图`, { previewLen: dataURL.length });
			return null;
		}
		return dataURL;
	}catch(e){
		recordFailure(chartType, `exception: ${e.message || String(e)}`);
		return null;
	}finally{
		try{ ReactDOM.unmountComponentAtNode(mountPoint); }catch(_){}
		try{ host.removeChild(mountPoint); }catch(_){}
	}
}

// 给定一段 Markdown 内容 + 嵌图 dataURL，把图插入节首
export function injectChartIntoMarkdown(markdown, chartDataURL, altText){
	if(!chartDataURL) return markdown || '';
	const img = `![${altText || '命盘图'}](${chartDataURL})\n\n`;
	return img + (markdown || '');
}
