// 报告功能 - 分节生成流水线（核心）
// 职责：
//   1. 接受 template + caseSnapshot + provider 配置
//   2. 对每节做：拼 prompt → 流式调 AI → 写 IndexedDB（边流边存）→ 空回退重试
//   3. 并发 N（默认 2）；支持 AbortController 取消
//   4. 所有节完成后跑辅助节（首页一句话结论 + 末页重点提醒）

import { requestAIAnalysisChat, requestAIAnalysisChatStream } from '../services/aianalysis';
import { AI_ANALYSIS_STORES, putStoreRecord, listStoreRecords, getStoreRecord } from './aiAnalysisStore';
import { resolveSchoolPrompt } from './reportSchools';
import { renderTemplateVars } from './reportTemplates';
import { ConcurrentQueue } from './reportConcurrentQueue';
import { isReasoningModel, getProviderProtocolFamily, applyThinkingLevel } from './aiAnalysisProviders';
import { buildZiweiSectionData, buildBaziSectionData } from './reportSectionData';

// ============ 空回退检测 ============

const EMPTY_STOP_WORDS = [
	'无法分析', '资料不足', '信息不足', '无法判断', '需结合实际',
	'仅供参考', '需要更多信息', '无法给出', '抱歉',
];

export function isContentEmpty(text){
	const t = `${text || ''}`.trim();
	if(!t) return true;
	if(t.length < 80) return true;
	const lower = t.slice(0, 200);
	for(const w of EMPTY_STOP_WORDS){
		if(lower.includes(w) && t.length < 200) return true;
	}
	return false;
}

// ============ 错误分类 ============

export function classifyError(err){
	const raw = `${err && (err.message || err) || ''}`;
	if(/401|403|invalid.*key|unauthorized/i.test(raw)) return {category:'auth', retriable:false, message:raw};
	if(/429|rate.*limit|quota/i.test(raw))             return {category:'rate', retriable:true,  message:raw};
	if(/5\d\d|server.*error|internal.*error/i.test(raw))return {category:'server', retriable:true, message:raw};
	if(/timeout|timed.*out|abort/i.test(raw))          return {category:'timeout', retriable:true, message:raw};
	if(/network|fetch|disconnect/i.test(raw))          return {category:'network', retriable:true, message:raw};
	return {category:'unknown', retriable:false, message:raw};
}

// ============ snapshot 段抽取 ============

// audit 4 修:snapshot 大小 cap 防超 model context limit(用户挂十几段事件盘 snapshot 数十 KB)
// 12000 字符 ≈ 18000 tokens(中文 1 字 ≈ 1.5 token),给单节 prompt 留充足 + 不撑爆 8k context model
const SNAPSHOT_HARD_CAP = 12000;
function clipSnapshotToCap(text, cap = SNAPSHOT_HARD_CAP){
	const t = `${text || ''}`;
	if(t.length <= cap) return t;
	return t.slice(0, cap) + `\n\n…（snapshot 已截到 ${cap} 字符 以防超出 model context 限制）`;
}

// 八字 / 紫微 snapshot 都是「[段名]\n内容\n\n[段名]\n内容」结构。
// 此函数从全文中按段名抽取需要的段，拼回字符串。
export function extractSnapshotSegments(fullText, segmentNames){
	if(!fullText) return '';
	if(!segmentNames || segmentNames.length === 0) return clipSnapshotToCap(fullText);
	const lines = `${fullText}`.split('\n');
	const collected = [];
	let curName = '';
	let curBuf = [];
	const flush = ()=>{
		if(curName && segmentNames.some((s)=>curName.includes(s))){
			collected.push(`[${curName}]\n${curBuf.join('\n')}`);
		}
	};
	for(const line of lines){
		const m = line.match(/^\[([^\]]+)\]\s*$/);
		if(m){
			flush();
			curName = m[1];
			curBuf = [];
		}else{
			curBuf.push(line);
		}
	}
	flush();
	const out = collected.length ? collected.join('\n\n') : fullText;
	return clipSnapshotToCap(out);
}

// ============ 流式 - 单节 ============

// 截断检测：内容若不以中文/英文句号、感叹号、问号、闭合括号、引号结尾，视为被截断。
// 用户反馈："2017-2026年甲申大运：甲木偏财透出，申金" 这种最后是逗号或没结尾的就是截断。
const PROPER_END_RE = /[。！？.!?）)」』】\}\]'"'""`]$|^$/;
// audit 修复:省略号「...」「。。。」「…」 是 AI 偷懒收尾,语义不完整,视为截断需续写。
// systemPrompt 已禁止 "..." / "等等" 收尾,但 AI 仍可能突破。
const ELLIPSIS_END_RE = /(\.{3,}|。{2,}|…+|等等)\s*$/;
function isContentTruncated(text){
	const t = `${text || ''}`.trim();
	if(!t) return false;
	// 优先识别省略号收尾 → 截断
	if(ELLIPSIS_END_RE.test(t)) return true;
	// 检查最后 12 字符里是否有合法结尾
	const tail = t.slice(-12);
	return !PROPER_END_RE.test(t.slice(-1)) && !/[。！？.!?]/.test(tail);
}

// 把 temperature/topP 按 provider 协议家族写入 opts。
function applySamplingParams(opts, protoFamily, model, temperature, topP){
	if(isReasoningModel(model)) return; // 推理模型不接受 temperature
	if(typeof temperature === 'number' && Number.isFinite(temperature)){
		opts.temperature = temperature;
	}
	if(typeof topP === 'number' && Number.isFinite(topP)){
		if(protoFamily === 'gemini'){ opts.topP = topP; }
		else { opts.top_p = topP; }
	}
}

// 把 maxTokens 按 provider 协议家族写入 opts。
function applyMaxTokens(opts, protoFamily, maxTokens){
	if(!maxTokens) return;
	if(protoFamily === 'anthropic') opts.max_tokens = maxTokens;
	else if(protoFamily === 'gemini')   opts.maxOutputTokens = maxTokens;
	else if(protoFamily === 'ollama')   opts.num_predict = maxTokens;
	else                                opts.max_tokens = maxTokens;
}

// 内部：单次流式请求（不含续写）
async function streamOnce({ profile, model, systemPrompt, userPrompt, maxTokens, temperature, topP, signal, onChunkFull, stallMs, prefixContent, thinkingLevel }){
	const protoFamily = profile.protocolFamily || getProviderProtocolFamily(profile.providerType);
	const opts = applyThinkingLevel({ ...(profile.providerOptions || {}) }, thinkingLevel || 'off', profile.providerType, model, maxTokens);
	applyMaxTokens(opts, protoFamily, maxTokens);
	applySamplingParams(opts, protoFamily, model, temperature, topP);
	let buf = prefixContent || '';
	const baseLen = buf.length;
	let usage = null;
	let errMsg = null;
	const messages = [
		{ role:'system', content: systemPrompt || '' },
		{ role:'user',   content: userPrompt || '' },
	];
	await requestAIAnalysisChatStream({
		providerType: profile.providerType,
		apiKey: profile.apiKey,
		baseUrl: profile.baseUrl,
		model,
		providerOptions: opts,
		messages,
	}, {
		signal,
		stallMs: stallMs || 90000,
		onEvent: (event)=>{
			if(event.type === 'delta'){
				const d = event.json && event.json.delta ? `${event.json.delta}` : '';
				if(d){
					buf += d;
					try{ onChunkFull && onChunkFull(buf); }catch(_){}
				}
			}else if(event.type === 'usage'){
				if(event.json && typeof event.json === 'object') usage = event.json;
			}else if(event.type === 'error'){
				errMsg = (event.json && event.json.message) ? `${event.json.message}` : (event.data || 'upstream.error');
			}
		},
	});
	return { content: buf, addedLen: buf.length - baseLen, usage, errorMessage: errMsg };
}

// 流式生成单节文本（含自动续写防截断）；返回 {content, usage, error}
// onChunk(textSoFar) 在每个 delta 后调（用于流式存到 IndexedDB）
// 修复用户反馈"内容被截断"：
//   一次流完后检测末尾是否完整句号收尾；若被截断（finish_reason=length 或 tail 无终止符）
//   自动追发 continuation prompt 接续,最多 2 次续写,避免最终输出戛然而止。
export async function streamSectionReply({
	profile,
	model,
	systemPrompt,
	userPrompt,
	maxTokens,
	temperature,
	topP,
	signal,
	onChunk,
	stallMs,
	thinkingLevel,
}){
	let total = '';
	let totalUsage = null;
	let lastErr = null;
	// 首轮
	const first = await streamOnce({
		profile, model, systemPrompt, userPrompt, maxTokens, temperature, topP, signal, stallMs, thinkingLevel,
		onChunkFull: (full)=>{ total = full; if(onChunk) onChunk(total); },
	});
	total = first.content;
	if(first.usage) totalUsage = first.usage;
	if(first.errorMessage) lastErr = first.errorMessage;

	// 自动续写最多 2 次，每次检测末尾完整性
	// audit 修复:严格保证不超过 2 次（先 ++ 后判,杜绝边界滞后）
	let continueAttempts = 0;
	const MAX_CONTINUE = 2;
	while(true){
		if(continueAttempts >= MAX_CONTINUE) break;
		if(signal && signal.aborted) break;
		const trimmed = total.trim();
		if(!trimmed) break;
		// AI 自然结束就不续写
		if(!isContentTruncated(trimmed)) break;
		// 内容太短(< 80 字)不属于截断，可能是空回退路径
		if(trimmed.length < 80) break;
		continueAttempts++;
		// 续写：让 AI 从断点继续，不重复
		const tail = trimmed.slice(-60);
		const continuePrompt = [
			'下面是你刚才输出的最后部分（被截断了）：',
			`「…${tail}」`,
			'',
			'请从这里继续写下去，不要重复以上内容，直到完整句号收尾。如果原本要输出的内容已经接近完成，请用一句话总结收尾。',
		].join('\n');
		try {
			const cont = await streamOnce({
				profile, model,
				systemPrompt: `${systemPrompt}\n\n（这是续写请求，必须紧接上文继续，绝不重复已写过的内容）`,
				userPrompt: continuePrompt,
				maxTokens: Math.max(800, Math.floor((maxTokens || 2000) * 0.5)),
				temperature, topP, signal, stallMs, thinkingLevel,
				prefixContent: total, // 累计内容继续流到 UI
				onChunkFull: (full)=>{ total = full; if(onChunk) onChunk(total); },
			});
			total = cont.content;
			if(cont.usage){
				// 合并 usage
				const u = cont.usage;
				totalUsage = totalUsage || {};
				if(typeof u.input_tokens === 'number') totalUsage.input_tokens = (totalUsage.input_tokens || 0) + u.input_tokens;
				if(typeof u.output_tokens === 'number') totalUsage.output_tokens = (totalUsage.output_tokens || 0) + u.output_tokens;
				if(typeof u.total_tokens === 'number') totalUsage.total_tokens = (totalUsage.total_tokens || 0) + u.total_tokens;
			}
		} catch(e){
			lastErr = (e && e.message) || lastErr;
			break;
		}
	}

	return { content: total.trim(), usage: totalUsage, errorMessage: lastErr };
}

// 测试用导出
export const __truncationTesting__ = { isContentTruncated };

// ============ 非流式 - 辅助节 ============

export async function requestNonStreamShort({profile, model, systemPrompt, userPrompt, maxTokens, requestTimeoutMs}){
	const opts = applyThinkingLevel({ ...(profile.providerOptions || {}) }, 'off', profile.providerType, model);
	if(requestTimeoutMs) opts.requestTimeoutMs = requestTimeoutMs;
	if(maxTokens){
		const protoFamily = profile.protocolFamily || getProviderProtocolFamily(profile.providerType);
		if(protoFamily === 'anthropic') opts.max_tokens = maxTokens;
		else if(protoFamily === 'gemini')   opts.maxOutputTokens = maxTokens;
		else if(protoFamily === 'ollama')   opts.num_predict = maxTokens;
		else                                opts.max_tokens = maxTokens;
	}
	const rsp = await requestAIAnalysisChat({
		providerType: profile.providerType,
		apiKey: profile.apiKey,
		baseUrl: profile.baseUrl,
		model,
		providerOptions: opts,
		messages: [
			{ role:'system', content: systemPrompt || '' },
			{ role:'user',   content: userPrompt || '' },
		],
	});
	if(rsp && rsp.Result && typeof rsp.Result === 'object' && rsp.Result.content){
		return `${rsp.Result.content}`;
	}
	if(typeof rsp === 'string') return rsp;
	if(rsp && rsp.content) return `${rsp.content}`;
	return '';
}

// ============ 主流程 ============

// 选项：
//   template / caseSnapshot / caseLabel / caseId / technique / granularity / schools / materialIds
//   profile / model / concurrency / signal / embedCharts
//   onProgress({done, total, sectionKey, status, content}) — 每节状态变更
//   onIntro(text) / onOutro(text)
//   chartCaptureFn(embedChartType) → Promise<dataURL>  （注入避免 import 死循环）
//   retrievalFn(section, materialIds, schools) → Promise<retrievedText>  （注入）
// v1.9 增量:从 caseSnapshot 提取当前大运信息, 让 AI 流年节 prompt 知道命主当前正行哪个大运。
// 八字 snapshot [大运] 段格式: "庚午 11~20岁" 或类似, 一行一步大运。
// 紫微 snapshot [宫位总览] 段每宫含 "大限年龄 X-Y"。
function extractCurrentDayun(snapshotText, currentAge){
	if(!snapshotText || currentAge == null) return '';
	const text = `${snapshotText}`;
	// 1. 八字格式: 行如 "X柱：庚午 大运 11~20岁" 或 "庚午 11~20"
	const rangeRe = /([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\s*[^\d]*?(\d{1,3})\s*[~～\-到至]\s*(\d{1,3})\s*岁?/g;
	let m;
	const matches = [];
	while((m = rangeRe.exec(text)) !== null){
		const gz = m[1], a = parseInt(m[2],10), b = parseInt(m[3],10);
		if(Number.isFinite(a) && Number.isFinite(b)){
			matches.push({ ganZhi: gz, ageStart: a, ageEnd: b });
		}
	}
	// 找包含 currentAge 的那一步
	const cur = matches.find((x)=>currentAge >= x.ageStart && currentAge <= x.ageEnd);
	if(cur){
		return `${cur.ganZhi}大运 (${cur.ageStart}~${cur.ageEnd} 岁, 命主当前 ${currentAge} 岁)`;
	}
	// 2. 紫微格式: 找 "大限 X-Y" / "X-Y岁" 任何含 currentAge 的范围
	const ziRe = /(\d{1,3})\s*[\-~到至]\s*(\d{1,3})\s*岁?\s*[,，]?\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])?/g;
	while((m = ziRe.exec(text)) !== null){
		const a = parseInt(m[1],10), b = parseInt(m[2],10), gz = m[3];
		if(Number.isFinite(a) && Number.isFinite(b) && currentAge >= a && currentAge <= b){
			return `当前正行 ${gz ? gz + ' 大限' : ''}(${a}~${b} 岁, 命主当前 ${currentAge} 岁)`;
		}
	}
	return '';
}

// 计算"时间锚定"变量:用户反馈"流年判断不准"的根因是 AI 不知道今年是哪年。
// 把今年/今天/年龄/未来 N 年的真实数字明确传给 AI,杜绝 AI 拿训练数据某年作"近期"。
function buildTimeAnchorVars(birthDate, snapshotText){
	// birthDate 可能是 'YYYY-MM-DD HH:mm:ss' 或 Date 对象
	const now = new Date();
	const cy = now.getFullYear();
	// 干支表(简化, 真实场景 v2 可换 lunar-javascript 精确计算)
	const tianGan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
	const diZhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
	const ganOf = (y)=>tianGan[((y - 4) % 10 + 10) % 10];
	const zhiOf = (y)=>diZhi[((y - 4) % 12 + 12) % 12];
	const gz = (y)=>`${ganOf(y)}${zhiOf(y)}`;
	let birthYear = null;
	if(birthDate){
		try{
			const m = `${birthDate}`.match(/^(\d{4})/);
			if(m) birthYear = parseInt(m[1], 10);
		}catch(_){}
	}
	const currentAge = birthYear ? (cy - birthYear) : null;
	const pad = (n)=>n < 10 ? `0${n}` : `${n}`;
	const ymd = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
	const vars = {
		currentDate: ymd,
		currentYear: cy,
		currentGanZhi: gz(cy),
		currentYearGanZhi: gz(cy),
		lunarYearText: gz(cy) + '年',
		currentYearMinus1: cy - 1,
		currentYearPlus1: cy + 1,
		currentYearPlus2: cy + 2,
		currentYearPlus3: cy + 3,
		currentYearPlus4: cy + 4,
		currentYearPlus5: cy + 5,
		currentYearPlus6: cy + 6,
		currentYearPlus7: cy + 7,
		currentYearPlus8: cy + 8,
		currentYearPlus9: cy + 9,
		birthDate: birthDate || '(未知)',
		currentAge: currentAge != null ? currentAge : '(出生年缺失)',
		currentAgePlus1: currentAge != null ? currentAge + 1 : '?',
		currentAgePlus2: currentAge != null ? currentAge + 2 : '?',
		currentAgePlus3: currentAge != null ? currentAge + 3 : '?',
		// v1.9: 从 snapshot 推导当前大运,让 AI 流年节准确知道命主当前正行哪个大运
		currentDayun: extractCurrentDayun(snapshotText, currentAge) || '(请从 snapshot 中【大运】/【运限】段读出)',
	};
	return vars;
}

export async function generateReport(opts){
	const {
		template, caseSnapshot, caseId, caseLabel,
		schools, materialIds, embedCharts,
		profile, model, concurrency,
		signal, onProgress, onIntro, onOutro,
		chartCaptureFn, retrievalFn,
		instanceId, // 用于存 IndexedDB
		onInstanceUpdate, // (instancePartial) 回调，给上层 setState
		caseRecord, // audit 修:用于提取 birthDate 算时间锚定
		chartObj,   // v1.14: 紫微 chart 对象(houses[]),用于节级 ground-truth 抽取
		baziObj,    // v1.14: 八字 bazi 对象(fourColumns/luckyDecade),用于节级 ground-truth 抽取
		thinkingLevel, // 思考档：仅主章节生成应用，辅助节保持 off
	} = opts;
	if(!template || !template.sections){
		throw new Error('report.template.invalid');
	}
	const sections = template.sections;
	const total = sections.length + (template.introSection ? 1 : 0) + (template.outroSection ? 1 : 0);
	let done = 0;
	const schoolPrompt = resolveSchoolPrompt(template.technique, schools);
	// 用户反馈"流年判断不准":AI 不知今年是几号、不知命主多大岁数,会用训练数据某年。
	// v1.9: 同时从 snapshot 推导 currentDayun, 让 AI 流年节知道命主当前正行哪个大运。
	const birthDate = (caseRecord && (caseRecord.birth || caseRecord.birthDate)) || '';
	const timeAnchorVars = buildTimeAnchorVars(birthDate, caseSnapshot);
	const sectionsState = {};
	sections.forEach((s)=>{
		sectionsState[s.key] = { key:s.key, title:s.title, order:s.order, status:'pending', content:'', embeddedChartDataURL:null, usage:null, error:null, regenerateCount:0 };
	});

	const persist = async ()=>{
		if(!instanceId) return;
		const existing = (await getStoreRecord(AI_ANALYSIS_STORES.reportInstances, instanceId)) || { id: instanceId };
		// CRITICAL bug 修复：merge 而非全量覆盖。
		// 单节重试时,sectionsState 只含正在重试的 1 节,如果直接 sections:sectionsState 会擦掉其他 11 节。
		// 改为先 spread existing.sections 保留已生成节,再 spread sectionsState 覆盖当前批次节。
		const mergedSections = {
			...(existing.sections && typeof existing.sections === 'object' ? existing.sections : {}),
			...sectionsState,
		};
		const next = {
			...existing,
			sections: mergedSections,
			meta: { ...(existing.meta||{}), updatedAt: new Date().toISOString() },
		};
		await putStoreRecord(AI_ANALYSIS_STORES.reportInstances, next);
		if(onInstanceUpdate) onInstanceUpdate(next);
	};

	const queue = new ConcurrentQueue(concurrency || 2, signal);

	// v1.16-G: abort race 防御 — abort 后跑了一半的 section 调 persist() 写 IndexedDB
	// 可能与"立刻 delete 该 instance"撞车,触发已删 record 又冒回来的 race。
	// 加 abortAcknowledged flag,abort 后只读不写,让上层 delete 安全。
	let abortAcknowledged = false;
	if(signal){
		const markAbort = ()=>{ abortAcknowledged = true; };
		try { signal.addEventListener('abort', markAbort, { once: true }); } catch(_){}
	}
	const safePersist = async ()=>{
		if(abortAcknowledged) return;  // abort 后不再写
		try { await persist(); } catch(_){}
	};

	for(const section of sections){
		queue.add(async ()=>{
			if(signal && signal.aborted){
				sectionsState[section.key].status = 'cancelled';
				await safePersist();
				return;
			}
			sectionsState[section.key].status = 'running';
			if(onProgress) onProgress({done, total, sectionKey:section.key, status:'running'});
			await safePersist();

			// 1. 截图（可选）
			let chartDataURL = null;
			if(embedCharts && section.embedChartType && chartCaptureFn){
				try{
					chartDataURL = await chartCaptureFn(section.embedChartType);
				}catch(_){
					chartDataURL = null; // 截图失败不阻塞 AI
				}
			}

			// 2. snapshot trim
			const trimmedSource = extractSnapshotSegments(caseSnapshot, section.requiredSnapshotSegments);

			// 3. RAG 检索（节级关键词 + schools 过滤）
			let retrievedText = '';
			if(retrievalFn){
				try{
					retrievedText = await retrievalFn(section, materialIds, schools) || '';
				}catch(_){ retrievedText = ''; }
			}

			// 4. v1.14: 节级 ground-truth 抽取(代码算好喂给 AI、AI 不算只读)
			//    用户痛点: AI 凭训练数据编大限/三方四正/流年干支(午宫被说成迁移宫等)
			//    修法: 紫微 chartObj 存在时算本命/运限三方四正; 八字 baziObj 存在时算大运+流年序列
			let sectionDataText = '';
			try {
				if(template.technique === 'ziwei' && chartObj){
					sectionDataText = buildZiweiSectionData(chartObj, section.key, timeAnchorVars.currentAge, timeAnchorVars.currentYear) || '';
				} else if(template.technique === 'bazi' && baziObj){
					sectionDataText = buildBaziSectionData(baziObj, section.key, timeAnchorVars.currentAge, timeAnchorVars.currentYear) || '';
				}
			} catch(e){
				try { console.warn('[reportPipeline] sectionData extract failed:', section.key, e); } catch(_){}
			}
			// v1.15 调试: 用户反馈"AI 还是编宫位/大运",必须确认 sectionData 真注入了 prompt
			// 打印每节首 500 字 sectionData 让用户能在 devtools 看到具体喂了什么
			try {
				if(sectionDataText){
					console.info(`[report·${section.key}] ✓ ground-truth 已注入 (${sectionDataText.length} 字符):\n${sectionDataText.slice(0, 500)}${sectionDataText.length > 500 ? '...[截断]' : ''}`);
				} else {
					console.warn(`[report·${section.key}] ⚠️ sectionData 为空 — chartObj/baziObj 是否成功 fetch? 此节 AI 将完全靠 caseSnapshot,可能瞎写。`);
				}
			} catch(_){}

			// 5. 渲染 prompt - 含时间锚定 vars + sectionData
			const renderVars = {
				...timeAnchorVars,
				source: trimmedSource,
				retrieved: retrievedText,
				sectionData: sectionDataText, // v1.14: ground-truth 注入
				school: schoolPrompt.schoolDisplay,
				schoolGuideline: schoolPrompt.schoolGuideline,
			};
			const sysPrompt = renderTemplateVars(section.systemPrompt, renderVars);
			const usrPrompt = renderTemplateVars(section.userPromptTemplate, renderVars);

			// 5. 流式调用 + 空回退重试
			let lastErr = null;
			let content = '';
			let usage = null;
			let attemptIdx = 0;
			const maxAttempts = 2;
			while(attemptIdx < maxAttempts){
				attemptIdx++;
				try{
					const usrFinal = attemptIdx === 1 ? usrPrompt : `${usrPrompt}\n\n${section.retryFallbackPrompt || '请重新输出本节内容，紧扣主题不要回避。'}`;
					const res = await streamSectionReply({
						profile, model,
						systemPrompt: sysPrompt,
						userPrompt: usrFinal,
						thinkingLevel,
						maxTokens: section.maxTokens,
						temperature: section.temperature,
						topP: section.topP,
						signal,
						onChunk: async (chunk)=>{
							sectionsState[section.key].content = chunk;
							if(onProgress) onProgress({done, total, sectionKey:section.key, status:'running', content:chunk});
						},
					});
					content = res.content || '';
					usage = res.usage;
					// 上游 SSE 中途发 error 事件时 streamSectionReply 不抛、错误带在 errorMessage 里返回；
					// 此前这里没读它 → 半截内容被标成 done、错误被吞。统一抛出走重试/分类
					// （可重试类自动再试；不可重试按错误收尾，已流出的部分内容保留展示）。
					if(res && res.errorMessage){
						throw new Error(res.errorMessage);
					}
					if(section.retryOnEmpty && isContentEmpty(content) && attemptIdx < maxAttempts){
						continue; // 空回退 → 用 retryFallbackPrompt 再试一次
					}
					break;
				}catch(e){
					lastErr = e;
					const cls = classifyError(e);
					if(!cls.retriable || attemptIdx >= maxAttempts){
						break;
					}
					// 限流退避
					if(cls.category === 'rate'){
						await new Promise((r)=>setTimeout(r, 5000));
					}
				}
			}

			if(lastErr && !content){
				sectionsState[section.key].status = 'failed';
				sectionsState[section.key].error = classifyError(lastErr);
			}else if(section.retryOnEmpty && isContentEmpty(content)){
				sectionsState[section.key].status = 'warn';
				sectionsState[section.key].content = content;
				sectionsState[section.key].embeddedChartDataURL = chartDataURL;
				sectionsState[section.key].error = { category:'empty', message:'AI 回复过短，已自动重试 1 次' };
			}else{
				sectionsState[section.key].status = 'done';
				sectionsState[section.key].content = content;
				sectionsState[section.key].embeddedChartDataURL = chartDataURL;
				sectionsState[section.key].usage = usage;
				sectionsState[section.key].error = null;
			}
			done++;
			if(onProgress) onProgress({done, total, sectionKey:section.key, status:sectionsState[section.key].status, content:sectionsState[section.key].content});
			await safePersist();
		});
	}

	await queue.drain();

	// stability 修复：所有节跑完后扫一遍 failed/warn 状态，每个再自动重试 1 次（顺序，不并发）。
	// 用户要求"每次报告都必须完整"——pipeline 自己兜底比让用户手动点重试好。
	// audit 修:末尾重试也要记入 stats(否则 successRate 永远卡首轮值,即使全救回也跳辅助节)
	let endRetrySuccess = 0;
	let endRetryTotal = 0;
	if(!(signal && signal.aborted)){
		const needRetry = sections.filter((s)=>{
			const st = sectionsState[s.key];
			return st && (st.status === 'failed' || st.status === 'warn' || (st.status === 'done' && !`${st.content || ''}`.trim()));
		});
		for(const section of needRetry){
			if(signal && signal.aborted) break;
			endRetryTotal++;
			try {
				sectionsState[section.key].status = 'running';
				sectionsState[section.key].regenerateCount = (sectionsState[section.key].regenerateCount || 0) + 1;
				if(onProgress) onProgress({done, total, sectionKey:section.key, status:'running'});
				await safePersist();
				let chartDataURL = sectionsState[section.key].embeddedChartDataURL || null;
				// audit 修:chartCaptureFn 签名是 (embedChartType, caseId),末尾重试缺 caseId 致 chart 丢失
				if(!chartDataURL && embedCharts && section.embedChartType && chartCaptureFn){
					try { chartDataURL = await chartCaptureFn(section.embedChartType, caseId); } catch(_){}
				}
				const trimmedSource = extractSnapshotSegments(caseSnapshot, section.requiredSnapshotSegments);
				let retrievedText = '';
				if(retrievalFn){
					try { retrievedText = await retrievalFn(section, materialIds, schools) || ''; } catch(_){}
				}
				// v1.14: 末尾重试也注入 sectionData ground-truth
				let sectionDataText2 = '';
				try {
					if(template.technique === 'ziwei' && chartObj){
						sectionDataText2 = buildZiweiSectionData(chartObj, section.key, timeAnchorVars.currentAge, timeAnchorVars.currentYear) || '';
					} else if(template.technique === 'bazi' && baziObj){
						sectionDataText2 = buildBaziSectionData(baziObj, section.key, timeAnchorVars.currentAge, timeAnchorVars.currentYear) || '';
					}
				} catch(_){}
				const renderVars = { ...timeAnchorVars, source: trimmedSource, retrieved: retrievedText, sectionData: sectionDataText2, school: schoolPrompt.schoolDisplay, schoolGuideline: schoolPrompt.schoolGuideline };
				const sysPrompt = renderTemplateVars(section.systemPrompt, renderVars);
				const usrPrompt = renderTemplateVars(section.userPromptTemplate, renderVars)
					+ '\n\n（这是 pipeline 末尾的最后一次自动重试，请务必输出完整内容，以完整句号收尾。）';
				const res = await streamSectionReply({
					profile, model,
					systemPrompt: sysPrompt, userPrompt: usrPrompt,
					maxTokens: section.maxTokens, temperature: section.temperature, topP: section.topP, thinkingLevel,
					signal,
					onChunk: (chunk)=>{
						sectionsState[section.key].content = chunk;
						if(onProgress) onProgress({done, total, sectionKey:section.key, status:'running', content:chunk});
					},
				});
				if(res.content && res.content.trim()){
					sectionsState[section.key] = {
						...sectionsState[section.key],
						content: res.content,
						embeddedChartDataURL: chartDataURL,
						status: 'done',
						error: null,
						usage: res.usage,
					};
					endRetrySuccess++;
				} else {
					// 重试仍空 - 标 warn 让 UI 给用户重试按钮
					sectionsState[section.key].status = 'warn';
					sectionsState[section.key].error = { category:'empty', message:'多轮重试后内容仍为空,请手动点重试或改 prompt' };
				}
				if(onProgress) onProgress({done, total, sectionKey:section.key, status:sectionsState[section.key].status, content:sectionsState[section.key].content});
				await safePersist();
			} catch(e){
				// audit 修:重试失败也要更新 status,防 'running' 状态卡死
				if(signal && signal.aborted){
					sectionsState[section.key].status = 'cancelled';
				} else {
					sectionsState[section.key].status = 'failed';
					sectionsState[section.key].error = classifyError(e);
				}
				if(onProgress) onProgress({done, total, sectionKey:section.key, status:sectionsState[section.key].status});
				await safePersist();
			}
		}
	}

	// audit 修复：drain 后检查 queue 错误统计，多数节失败时跳过辅助节(用空内容跑只浪费 token)。
	// audit 修:把末尾重试的成功也计入,防 successRate 永远卡首轮值
	const queueStats = queue.getStats();
	const stats = {
		added: queueStats.added + endRetryTotal,
		success: queueStats.success + endRetrySuccess,
		failure: queueStats.failure + (endRetryTotal - endRetrySuccess),
	};
	const successRate = stats.added > 0 ? stats.success / stats.added : 0;
	if(stats.added > 0 && successRate < 0.4){
		// 少于 40% 节成功 → 辅助节也跑不出好结果,直接跳过保护用户。
		if(onProgress){
			try { onProgress({done, total, sectionKey:'__skip_aux__', status:'skipped', reason:'too_many_failures'}); } catch(_){}
		}
		return { sectionsState, skippedAux: true, stats };
	}

	// 6. 辅助节：首页一句话结论
	if(template.introSection){
		try{
			const sectionsSummary = sections.map((s)=>{
				const st = sectionsState[s.key];
				const txt = `${st && st.content || ''}`.slice(0, 300);
				return `[${s.title}]\n${txt}`;
			}).join('\n\n');
			const introUsr = renderTemplateVars(template.introSection.userPromptTemplate, { ...timeAnchorVars, sectionsSummary });
			const introText = (await requestNonStreamShort({
				profile, model,
				systemPrompt: template.introSection.systemPrompt,
				userPrompt: introUsr,
				maxTokens: template.introSection.maxTokens || 100,
				requestTimeoutMs: 20000,
			})).trim().replace(/^["'"「『《【\s]+|["'"」』》】\s]+$/g, '').replace(/[\s\n\r]+/g, ' ').slice(0, 60);
			if(onIntro) onIntro(introText);
		}catch(_){ /* 失败静默 */ }
	}

	// 7. 辅助节：末页重点提醒
	if(template.outroSection){
		try{
			const dynamicsKeys = ['liunian', 'dayun', 'daxian', 'liuyue'];
			const dynamicsSummary = sections.filter((s)=>dynamicsKeys.includes(s.key)).map((s)=>{
				const st = sectionsState[s.key];
				return `[${s.title}]\n${st && st.content || ''}`;
			}).join('\n\n') || '（未生成大运/流年节）';
			const outroUsr = renderTemplateVars(template.outroSection.userPromptTemplate, { ...timeAnchorVars, dynamicsSummary });
			const outroText = (await requestNonStreamShort({
				profile, model,
				systemPrompt: template.outroSection.systemPrompt,
				userPrompt: outroUsr,
				maxTokens: template.outroSection.maxTokens || 400,
				requestTimeoutMs: 30000,
			})).trim();
			if(onOutro) onOutro(outroText);
		}catch(_){ /* 失败静默 */ }
	}

	return { sectionsState };
}

// ============ 报告实例的 IndexedDB 操作便捷封装 ============

export async function loadReportInstance(id){
	if(!id) return null;
	return getStoreRecord(AI_ANALYSIS_STORES.reportInstances, id);
}

export async function listReportInstances(){
	const list = await listStoreRecords(AI_ANALYSIS_STORES.reportInstances);
	return list.sort((a, b)=>{
		const ta = new Date(a.createdAt || 0).getTime();
		const tb = new Date(b.createdAt || 0).getTime();
		return tb - ta;
	});
}

export async function saveReportInstance(record){
	return putStoreRecord(AI_ANALYSIS_STORES.reportInstances, record);
}

// 仅供 jest 测试用
export const __testing__ = {
	isContentEmpty,
	classifyError,
	extractSnapshotSegments,
};
