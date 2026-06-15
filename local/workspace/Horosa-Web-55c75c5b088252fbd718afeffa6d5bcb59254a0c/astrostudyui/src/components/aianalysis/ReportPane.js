// AI 分析「报告」tab 主组件
// 三态切换：empty / list / detail（含生成中）
// 顶部工具栏：新建报告 / 返回列表 / 导出 ▾ / 删除 / 重命名
// 详情页：左目录 + 右节内容（Markdown）

import React from 'react';
import {
	Button, Empty, Dropdown, Tooltip, message, Modal, Input, Tag, Spin,
	Progress, Table, Space, Drawer, Alert,
} from 'antd';
import XQIcon from '../xq-icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { normalizeMarkdown } from '../../utils/reportMarkdownNormalize';
import { getPersistedThinkingLevel } from '../../utils/aiAnalysisProviders';

import {
	AI_ANALYSIS_STORES,
	listStoreRecords,
	putStoreRecord,
	getStoreRecord,
	deleteStoreRecord,
} from '../../utils/aiAnalysisStore';
import {
	getBuiltinReportTemplates,
	findReportTemplate,
} from '../../utils/reportTemplates';
import {
	resolveSchoolPrompt,
	getSchoolList,
	KNOWN_SCHOOLS,
} from '../../utils/reportSchools';
import {
	generateReport,
	loadReportInstance,
	listReportInstances,
	saveReportInstance,
} from '../../utils/reportPipeline';
// v1.14: 预 fetch chart/bazi 用于 sectionData ground-truth 注入 (ServerRoot/ResultKey 单独 import)
import { ServerRoot, ResultKey } from '../../utils/constants';
// v1.15: 用 request() 而非裸 fetch — 后端要求签名 header,
// 否则 500 "no.register.app.in.sys.forapp" → chartObj 永远 null → sectionData 永远空 → AI 瞎写
import requestSigned from '../../utils/request';
import {
	captureChartByType,
	injectChartIntoMarkdown,
	getRecentCaptureFailures,
	clearCaptureFailures,
} from '../../utils/reportChartCapture';
import {
	exportReportByFormat,
} from '../../utils/reportExport';
import {
	generateReportTitle,
} from '../../utils/reportAutoTitle';
import {
	ensureMaterialChunks,
	mergeRetrievedChunks,
	rankChunksByKeywordWithExtra,
	rerankChunksWithVector,
	buildRetrievedContextText,
	filterMaterialsBySchools,
	shouldUseDirectAttach,
} from '../../utils/aiAnalysisRag';
import {
	buildChartBaziParams,
	buildChartZiweiParams,
} from '../../utils/aiAnalysisContext';
// v1.16-C: 统一 validate helper, 抽出 ground-truth fetch + retry 逻辑
import { validateChartObj } from '../../utils/reportSectionData';
import ReportGenerator from './ReportGenerator';

// ============ ReportLaunchContext - 跨组件触发新报告 ============

export const ReportLaunchContext = React.createContext({
	requestNewReport: ()=>{},
});

// ============ markdown 渲染（复用 AIAnalysisMain 的策略）============

function renderMarkdownToHtml(src){
	if(!src) return '';
	try{
		const html = marked.parse(normalizeMarkdown(src), { gfm: true, breaks: true });
		return DOMPurify.sanitize(html, { ADD_TAGS: ['img'], ADD_ATTR: ['target', 'src', 'alt', 'style', 'class'] });
	}catch(_){ return ''; }
}

// ============ 主组件 ============

export default function ReportPane(props){
	const { sources = [], profile, model, providerName, modelOptions, providerProfiles = [] } = props;
	const [view, setView] = React.useState('list'); // list | detail
	const [instances, setInstances] = React.useState([]);
	const [activeInstance, setActiveInstance] = React.useState(null);
	const [activeTemplate, setActiveTemplate] = React.useState(null);
	const [generatorOpen, setGeneratorOpen] = React.useState(false);
	const [generating, setGenerating] = React.useState(false);
	// audit 修:React batch 下两次 setGenerating(true) 之间的 closure 仍是 false,需要 useRef 同步原子标志。
	const generatingRef = React.useRef(false);
	const generatingInstanceIdRef = React.useRef(null); // 记录哪个 instanceId 在生成,delete 时可对应 abort
	const [generationProgress, setGenerationProgress] = React.useState({ done:0, total:0, sectionKey:null });
	const [materials, setMaterials] = React.useState([]);
	const [templates] = React.useState(()=>getBuiltinReportTemplates());
	const [renameTarget, setRenameTarget] = React.useState(null);
	const [renameValue, setRenameValue] = React.useState('');
	const abortRef = React.useRef(null);
	const isMountedRef = React.useRef(true);
	const [launchPreset, setLaunchPreset] = React.useState(null);
	// v1.21: 报告章节「浏览/编辑」模式。一次只编辑一节(editingSectionKey)，editingDraft 为缓冲(取消不污染原 content)。
	const [editingSectionKey, setEditingSectionKey] = React.useState(null);
	const [editingDraft, setEditingDraft] = React.useState('');

	React.useEffect(()=>{
		isMountedRef.current = true;
		return ()=>{ isMountedRef.current = false; };
	}, []);

	// v1.21: 保存手动编辑的章节内容(复用 saveReportInstance 持久化到 IndexedDB)。
	async function handleSaveSectionEdit(key){
		if(!activeInstance) return;
		const ns = { ...(activeInstance.sections || {}) };
		const cur = ns[key] || {};
		// 手动编辑后视为有效内容:原 failed/cancelled/空状态归为 done,清除错误。
		const nextStatus = (cur.status === 'failed' || cur.status === 'cancelled' || !cur.status) ? 'done' : cur.status;
		ns[key] = { ...cur, content: editingDraft, status: nextStatus, error: null };
		const updated = { ...activeInstance, sections: ns };
		setActiveInstance(updated);
		setEditingSectionKey(null);
		setEditingDraft('');
		try{
			await saveReportInstance(updated);
			message.success('已保存');
		}catch(e){
			message.error('保存失败，请重试');
		}
	}

	// 加载历史报告列表
	const refreshInstances = React.useCallback(async ()=>{
		const list = await listReportInstances();
		if(!isMountedRef.current) return;
		setInstances(list);
	}, []);

	React.useEffect(()=>{ refreshInstances(); }, [refreshInstances]);

	// 加载所有 materials
	React.useEffect(()=>{
		(async ()=>{
			const list = await listStoreRecords(AI_ANALYSIS_STORES.materials);
			if(!isMountedRef.current) return;
			setMaterials(list);
		})();
	}, []);

	// 跨 tab 切走再回时,检测 IndexedDB 中是否有 status='running' 的实例(说明上次生成被中断或还在后台跑)
	// → 给用户一个 Modal 提示「检测到未完成报告 - 继续查看 / 关闭」(用户选 继续查看 → 打开该实例)
	// audit 修:用 functional setState 防 stale closure - 在异步 setActiveInstance 时拿到最新 activeInstance 判断,
	// 避免在 async 期间用户已经打开了另一个 instance 时被自动覆盖。
	React.useEffect(()=>{
		(async ()=>{
			const list = await listReportInstances();
			if(!isMountedRef.current) return;
			const runningOne = (list || []).find((it)=>it.status === 'running');
			if(!runningOne) return;
			const fullRec = await getStoreRecord(AI_ANALYSIS_STORES.reportInstances, runningOne.id);
			if(!isMountedRef.current || !fullRec) return;
			const tpl = findReportTemplate(templates, fullRec.technique, fullRec.granularity);
			// functional setState 拿最新 activeInstance, 防覆盖用户在 await 期间已选中的实例
			// audit 修:不要在 setState 闭包内调 setActiveTemplate/message — 改用 flag 外部处理。
			let shouldAdopt = false;
			setActiveInstance((prev)=>{
				if(prev) return prev; // 用户已有 active,不覆盖
				shouldAdopt = true;
				return fullRec;
			});
			if(shouldAdopt){
				setActiveTemplate(tpl);
				message.info('检测到上次未完成的报告生成,已自动打开', 4);
			}
		})();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [templates]);

	// ============ launch hook：跨组件触发 ============
	const requestNewReport = React.useCallback((preset)=>{
		setLaunchPreset(preset || null);
		setGeneratorOpen(true);
	}, []);

	// 父组件可调 props.onAttachLaunch 注册触发器（用于对话栏旁「生成报告」快捷按钮）
	// audit 修：unmount 时清空 ref,防 setState on unmounted ReportPane 警告。
	React.useEffect(()=>{
		if(typeof props.onAttachLaunch === 'function'){
			props.onAttachLaunch(requestNewReport);
		}
		return ()=>{
			if(typeof props.onAttachLaunch === 'function'){
				try { props.onAttachLaunch(null); } catch(_){}
			}
		};
	}, [requestNewReport, props.onAttachLaunch]);

	// ============ 生成流程 ============

	async function doRetrieval(section, materialIds, schools){
		// 资料过滤 + 关键词检索
		if(!materialIds || materialIds.length === 0) return '';
		const all = materials.filter((m)=>materialIds.includes(m.id));
		const filtered = filterMaterialsBySchools(all, schools);
		if(filtered.length === 0) return '';
		// 全文模式（小资料直接拼）
		const directAttach = filtered.filter(shouldUseDirectAttach);
		const ragMaterials = filtered.filter((m)=>!shouldUseDirectAttach(m));
		const directText = directAttach.map((m)=>`【${m.fileName || ''}】\n${m.extractedText || ''}`).join('\n\n');
		// RAG 模式
		let ragText = '';
		if(ragMaterials.length){
			try{
				const allChunks = [];
				for(const m of ragMaterials){
					const chunks = await ensureMaterialChunks(m);
					(chunks || []).forEach((c)=>{
						allChunks.push({ ...c, materialName: m.fileName || '' });
					});
				}
				const query = section.title || section.key;
				const ranked = rankChunksByKeywordWithExtra(query, section.retrievalKeywords || [], allChunks);
				const merged = mergeRetrievedChunks(ranked.slice(0, 12), 4000);
				ragText = buildRetrievedContextText(merged);
			}catch(_){ ragText = ''; }
		}
		return [directText, ragText].filter(Boolean).join('\n\n').slice(0, 6000);
	}

	async function doChartCapture(embedChartType, caseId){
		if(!embedChartType) return null;
		try{
			const src = sources.find((s)=>s.id === caseId);
			const record = src && src.record;
			if(!record) return null;
			return await captureChartByType(embedChartType, record);
		}catch(_){ return null; }
	}

	// 拉取 case snapshot
	// 修复 Mac issue #12 后续: 必须先从 sources[i].record 取 chart record,
	// 然后用 buildChartBaziParams(record) / buildChartZiweiParams(record) 转出符合后端契约的 params,
	// 再传给 buildBaziSnapshotForParams / buildZiweiSnapshotForParams。
	// 否则后端报「Miss date」→ 所有节都收到空 snapshot → AI 回「没有四柱八字信息」(用户原报)。
	async function loadCaseSnapshot(technique, caseId){
		const src = sources.find((s)=>s.id === caseId);
		const record = src && src.record;
		if(!record){
			// 案例不存在 → 兜底也无能为力
			return '';
		}
		try{
			if(technique === 'bazi'){
				const mod = await import('../cntradition/BaZi');
				if(typeof mod.buildBaziSnapshotForParams === 'function'){
					const params = buildChartBaziParams(record);
					return await mod.buildBaziSnapshotForParams(params);
				}
			}else if(technique === 'ziwei'){
				const mod = await import('../ziwei/ZiWeiMain');
				if(typeof mod.buildZiweiSnapshotForParams === 'function'){
					const params = buildChartZiweiParams(record);
					return await mod.buildZiweiSnapshotForParams(params);
				}
			}
		}catch(e){
			console.error('[报告] loadCaseSnapshot failed:', e);
		}
		// 兜底：直接取 source 上挂的 aiSnapshot 或 snapshot；空字符串会被上层 fail-loud 拦截。
		return (src && (src.aiSnapshot && src.aiSnapshot.content)) || (src && src.snapshot) || '';
	}

	async function handleStartGenerate(form){
		// audit 修:React batch 让 state 双击 race,改用 ref 同步原子防护
		if(generatingRef.current || generating){
			message.warning('已有报告正在生成,请等当前任务完成或点「取消生成」');
			return;
		}
		generatingRef.current = true;
		const { technique, granularity, caseId, schools, materialIds, embedCharts, intro, outro, providerOverride, modelOverride, thinkingLevel } = form;
		const useProfile = providerOverride || profile;
		const useModel = modelOverride || model;
		if(!useProfile || !useModel){
			message.error('请先在「设置」配置 Provider 和模型');
			return;
		}
		const template = findReportTemplate(templates, technique, granularity);
		if(!template){
			message.error('找不到匹配的模板');
			return;
		}
		const src = sources.find((s)=>s.id === caseId);
		if(!src){
			message.error('请选择一个案例');
			return;
		}
		// 修复 Mac issue #12 后续: 必须先验证 snapshot 取数成功才能开始 pipeline,
		// 否则所有节空跑浪费 token + 用户困惑「为什么 AI 说没有四柱八字」。
		// 三道防线: ①loadCaseSnapshot 失败返空 ②空字符串/<20字 视为失败 ③缺关键段([起盘信息]+[四柱与三元] for bazi, [起盘信息]+[宫位总览] for ziwei) 视为失败。
		message.loading({ content: '正在准备案例数据…', key: 'rep_prep', duration: 0 });
		const caseSnapshot = await loadCaseSnapshot(technique, caseId);
		message.destroy('rep_prep');
		const snapText = `${caseSnapshot || ''}`;
		const requiredKeyTags = technique === 'ziwei' ? ['[起盘信息]', '[宫位总览]'] : ['[起盘信息]', '[四柱与三元]'];
		const missingTags = requiredKeyTags.filter((t)=>!snapText.includes(t));
		if(!snapText.trim() || snapText.trim().length < 20 || missingTags.length > 0){
			const reason = !snapText.trim() ? '后端返回空数据' : missingTags.length ? `快照缺关键段: ${missingTags.join('、')}` : '快照内容太短';
			Modal.error({
				title: '案例数据准备失败',
				width: 480,
				content: `无法从案例 "${src.title || caseId}" 取到完整起盘数据。\n\n问题: ${reason}\n\n常见原因：\n• 本地排盘服务未启动 / 暂时不可达（右下角状态灯应为绿色）\n• 案例缺关键字段（日期/时间/坐标/性别）\n\n请先在 ${technique === 'ziwei' ? '紫微' : '八字'} tab 打开「${src.title || ''}」确认能正常排盘后再生成报告。`,
				okText: '我知道了',
			});
			return;
		}
		const schoolPrompt = resolveSchoolPrompt(technique, schools);
		const instanceId = `rpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const techName = technique === 'bazi' ? '八字' : '紫微';
		const initInstance = {
			id: instanceId,
			templateId: template.id,
			templateVersion: template.version,
			caseId,
			caseLabel: src.title || src.name || src.label || '案例',
			caseSnapshot,
			technique,
			granularity,
			schools: schools || [],
			materialIds: materialIds || [],
			sections: {},
			intro: '',
			outro: '',
			embedCharts: !!embedCharts,
			meta: {
				provider: useProfile.providerType,
				providerName: useProfile.name || providerName || '',
				model: useModel,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			title: `${src.title || src.name || '案例'} · ${techName} · ${granularity}节${schoolPrompt.schoolDisplay !== '通用' ? schoolPrompt.schoolDisplay : ''}报告（生成中…）`,
			status: 'running',
		};
		template.sections.forEach((s)=>{
			initInstance.sections[s.key] = { key:s.key, title:s.title, order:s.order, status:'pending', content:'', embeddedChartDataURL:null, usage:null, error:null, regenerateCount:0 };
		});
		await saveReportInstance(initInstance);
		setActiveInstance(initInstance);
		setActiveTemplate(template);
		setView('detail');
		setGenerating(true);
		generatingInstanceIdRef.current = instanceId;
		setGenerationProgress({ done:0, total: template.sections.length, sectionKey:null });
		setGeneratorOpen(false);

		const abortController = new AbortController();
		abortRef.current = abortController;
		// 清掉上次生成的 capture failure 记录,这次完整重新记录
		try { clearCaptureFailures(); } catch(_){}
		// v1.14: 预 fetch chart/bazi 一次,传给 pipeline 让每节算 ground-truth(三方四正/大限/流年)
		// 用户痛点根治:AI 不再凭训练数据编造宫位地支
		// v1.15: 用 requestSigned 自动加签名(后端要 buildSignedFetchOptions)
		// v1.16-C+Q: 抽 validateChartObj + 加 1 次自动重试(500ms 退避)
		let chartObjForPipeline = null;
		let baziObjForPipeline = null;
		let groundTruthError = '';
		if(src && src.record){
			message.loading({ content: '正在预算命盘 ground-truth…', key: 'rep_chart', duration: 0 });
			const fetchOnce = async () => {
				if(technique === 'ziwei'){
					const params = buildChartZiweiParams(src.record);
					const data = await requestSigned(`${ServerRoot}/ziwei/birth`, { body: JSON.stringify(params), silent: true });
					const result = data && data[ResultKey] ? data[ResultKey] : data;
					return { chart: result && result.chart ? result.chart : null, bazi: null };
				}
				const params = buildChartBaziParams(src.record);
				const data = await requestSigned(`${ServerRoot}/bazi/direct`, { body: JSON.stringify(params), silent: true });
				const result = data && data[ResultKey] ? data[ResultKey] : data;
				return { chart: null, bazi: result && result.bazi ? result.bazi : null };
			};
			let lastErr = null;
			for(let attempt = 1; attempt <= 2; attempt++){
				try {
					const { chart, bazi } = await fetchOnce();
					if(technique === 'ziwei'){
						const v = validateChartObj(chart, 'ziwei');
						if(v.ok){
							chartObjForPipeline = chart;
							try { console.info(`[ReportPane] ✓ 紫微 chart 预算成功(第${attempt}次),houses[0]:`, { name:chart.houses[0].name, ganzi:chart.houses[0].ganzi, direction:chart.houses[0].direction, lifeHouseIndex:chart.lifeHouseIndex, bodyMaster:chart.bodyMaster }); } catch(_){}
							break;
						}
						groundTruthError = `紫微命盘 validate 失败: ${v.reason}`;
					} else if(technique === 'bazi'){
						const v = validateChartObj(bazi, 'bazi');
						if(v.ok){
							baziObjForPipeline = bazi;
							try { console.info(`[ReportPane] ✓ 八字 bazi 预算成功(第${attempt}次),字段:`, Object.keys(bazi).join(','), '大运步数:', (bazi.mainDirection||[]).length); } catch(_){}
							break;
						}
						groundTruthError = `八字 validate 失败: ${v.reason}`;
					}
				} catch(e){
					lastErr = e;
					groundTruthError = `预算命盘异常: ${e && e.message || e}`;
					try { console.error(`[ReportPane] preload attempt ${attempt} failed:`, e); } catch(_){}
				}
				if(attempt === 1){
					await new Promise((r)=>setTimeout(r, 500)); // 500ms 退避后重试 1 次
				}
			}
			message.destroy('rep_chart');
		}
		// 失败时弹 Modal 让用户能看到原因 + 询问是否继续(弱化为 prompt-only,AI 可能编造)
		if(groundTruthError){
			const userConfirmed = await new Promise((resolve)=>{
				Modal.confirm({
					title: '⚠️ ground-truth 数据预算失败',
					width: 540,
					content: (
						<div>
							<div style={{ marginBottom: 8, color:'#cf1322' }}>{groundTruthError}</div>
							<div style={{ fontSize:13, color:'var(--horosa-text-soft, #666)' }}>
								如继续，pipeline 将弱化为仅用文本快照,AI 可能编造三方四正/大限/流年(用户反馈的"午宫被说成迁移宫"等事故就是此类)。
								<br /><br />
								推荐：先到 {technique === 'ziwei' ? '紫微' : '八字'} tab 确认能正常排盘 → 再回来生成报告。
							</div>
						</div>
					),
					okText: '仍要生成 (AI 可能瞎写)',
					cancelText: '取消 (推荐)',
					onOk: ()=>resolve(true),
					onCancel: ()=>resolve(false),
				});
			});
			if(!userConfirmed){
				setGenerating(false);
				generatingRef.current = false;
				generatingInstanceIdRef.current = null;
				abortRef.current = null;
				message.info('已取消生成');
				return;
			}
		}
		try{
			await generateReport({
				template,
				thinkingLevel,
				caseSnapshot,
				caseId,
				caseRecord: src && src.record, // 流年准:pipeline 算 birthDate/currentAge/currentYear 时间锚定
				chartObj: chartObjForPipeline, // v1.14
				baziObj: baziObjForPipeline,   // v1.14
				schools,
				materialIds: materialIds || [],
				embedCharts: !!embedCharts,
				profile: useProfile,
				model: useModel,
				// 修复 Mac issue #12 后续：用户反馈节乱序完成（section 3 先于 1/2）→ 改顺序生成。
				// concurrency=1 让节 1→2→3→...→N 按 order 严格顺序流式出现,体验线性可预期。
				// token 总量不变,只是 wall-clock 稍长（实测 12 节 deepseek-v4 约 60-90s）。
				concurrency: 1,
				signal: abortController.signal,
				instanceId,
				onProgress: (p)=>{
					if(!isMountedRef.current) return;
					setGenerationProgress({ done: p.done, total: p.total, sectionKey: p.sectionKey });
					// 渐进更新本节状态
					setActiveInstance((prev)=>{
						if(!prev) return prev;
						const ns = { ...(prev.sections || {}) };
						const cur = ns[p.sectionKey] || {};
						ns[p.sectionKey] = { ...cur, status: p.status, content: p.content !== undefined ? p.content : cur.content };
						return { ...prev, sections: ns };
					});
				},
				onIntro: (text)=>{
					// audit 4 修:不在回调内 await IndexedDB 防与 pipeline persist 形成 read-modify-write race。
					// 只更新 React state,真正持久化在生成完成后 setActiveInstance(updated) 时由 saveReportInstance 一次性写。
					setActiveInstance((prev)=>prev ? { ...prev, intro: text } : prev);
				},
				onOutro: (text)=>{
					setActiveInstance((prev)=>prev ? { ...prev, outro: text } : prev);
				},
				chartCaptureFn: intro || true ? (type)=>doChartCapture(type, caseId) : null,
				retrievalFn: (section, mIds, sch)=>doRetrieval(section, mIds, sch),
			});
			// 完成后写入最终状态 + 自动命名
			if(!isMountedRef.current) return;
			let nextTitle = initInstance.title.replace(/\s*（生成中…）$/, '');
			// 修复 stale activeInstance bug: 必须从 IndexedDB 拉最新实例,本地 activeInstance 闭包可能滞后。
			const freshRec = await getStoreRecord(AI_ANALYSIS_STORES.reportInstances, instanceId);
			try{
				const auto = await generateReportTitle({
					instance: freshRec || initInstance,
					profile: useProfile,
					model: useModel,
					schoolDisplay: schoolPrompt.schoolDisplay,
				});
				if(auto) nextTitle = auto;
			}catch(_){}
			// audit 4 修:onIntro/onOutro 不持久化(改 race-safe),要在 updated 里加上 intro/outro。
			// 优先从内存当前 activeInstance(已被 onIntro/onOutro 更新)取 intro/outro,fallback freshRec。
			const liveIntroOutro = (typeof activeInstance === 'object' && activeInstance && activeInstance.id === instanceId)
				? { intro: activeInstance.intro || '', outro: activeInstance.outro || '' }
				: { intro: (freshRec && freshRec.intro) || '', outro: (freshRec && freshRec.outro) || '' };
			const updated = {
				...(freshRec || initInstance),
				intro: liveIntroOutro.intro || (freshRec && freshRec.intro) || '',
				outro: liveIntroOutro.outro || (freshRec && freshRec.outro) || '',
				title: nextTitle,
				status: 'done',
				meta: { ...(freshRec ? freshRec.meta : initInstance.meta), updatedAt: new Date().toISOString() },
			};
			await saveReportInstance(updated);
			if(isMountedRef.current){
				// audit 4 修:用户可能在生成完成前切到其他实例,不要强制覆盖。functional setState 检查当前 activeInstance.id 是否还是这次生成的 instanceId。
				setActiveInstance((prev)=>{
					if(prev && prev.id && prev.id !== instanceId) return prev; // 用户已切走,不覆盖
					return updated;
				});
				setGenerating(false);
				generatingRef.current = false;
				generatingInstanceIdRef.current = null;
				// v1.16: 截图失败改为短 message.warning 不打扰(老 Modal 太烦),console 仍记完整原因
				const captureFailures = getRecentCaptureFailures();
				if(captureFailures && captureFailures.length > 0){
					try { console.warn(`[ReportPane] ${captureFailures.length} 个命盘图截图失败:`, captureFailures); } catch(_){}
					message.warning(`报告生成完成 (${captureFailures.length} 个嵌图未出,文字内容正常,详见 console)`, 6);
					clearCaptureFailures();
				} else {
					message.success('报告生成完成');
				}
				refreshInstances();
			}
		}catch(e){
			if(!isMountedRef.current) return;
			setGenerating(false);
			generatingRef.current = false;
			generatingInstanceIdRef.current = null;
			if(abortController.signal.aborted){
				message.info('已取消生成');
			}else{
				message.error(`生成失败：${e && e.message || e}`);
			}
			refreshInstances();
		}finally{
			abortRef.current = null;
			generatingRef.current = false;
			generatingInstanceIdRef.current = null;
		}
	}

	function handleCancelGenerate(){
		if(abortRef.current){
			abortRef.current.abort();
		}
	}

	async function handleRegenerateSection(sectionKey){
		if(!activeInstance || !activeTemplate) return;
		// audit 修:防全量生成中又点单节重试致并发写 IndexedDB race
		if(generatingRef.current || generating){
			message.warning('正在生成中,无法单独重试节。请等当前任务完成或先点「取消生成」。');
			return;
		}
		const section = activeTemplate.sections.find((s)=>s.key === sectionKey);
		if(!section) return;
		message.loading({ content: '重试本节…', key:'rep_retry' });
		const useProfile = profile;
		const useModel = model;
		if(!useProfile || !useModel){
			message.error('Provider/模型未配置');
			return;
		}
		try{
			// 直接走 pipeline 单节流程的精简版（不并发，仅本节）
			const schoolPrompt = resolveSchoolPrompt(activeInstance.technique, activeInstance.schools || []);
			const trimmedSource = activeInstance.caseSnapshot;
			const retrievedText = await doRetrieval(section, activeInstance.materialIds || [], activeInstance.schools || []);
			const chartDataURL = activeInstance.embedCharts && section.embedChartType ? await doChartCapture(section.embedChartType, activeInstance.caseId) : null;
			// 单独构造一次性的 pipeline
			const oneShot = {
				...activeTemplate,
				sections: [section],
				introSection: null,
				outroSection: null,
			};
			// 流年准:重试也要 caseRecord 算 birthDate 时间锚定。从 sources 查 record。
			const retrySrc = sources.find((s)=>s.id === activeInstance.caseId);
			// v1.14: 单节重试也要预 fetch chart/bazi 拿 ground-truth(否则重试照样错)
			let retryChartObj = null;
			let retryBaziObj = null;
			if(retrySrc && retrySrc.record){
				// v1.16-C: 单节重试也走 validateChartObj, 防畸形 chart 又编造
				try {
					if(activeInstance.technique === 'ziwei'){
						const params = buildChartZiweiParams(retrySrc.record);
						const data = await requestSigned(`${ServerRoot}/ziwei/birth`, { body: JSON.stringify(params), silent: true });
						const result = data && data[ResultKey] ? data[ResultKey] : data;
						const candidate = result && result.chart ? result.chart : null;
						const v = validateChartObj(candidate, 'ziwei');
						if(v.ok) retryChartObj = candidate;
						else try { console.warn('[ReportPane.regenerate] ziwei chart validate fail:', v.reason); } catch(_){}
					} else if(activeInstance.technique === 'bazi'){
						const params = buildChartBaziParams(retrySrc.record);
						const data = await requestSigned(`${ServerRoot}/bazi/direct`, { body: JSON.stringify(params), silent: true });
						const result = data && data[ResultKey] ? data[ResultKey] : data;
						const candidate = result && result.bazi ? result.bazi : null;
						const v = validateChartObj(candidate, 'bazi');
						if(v.ok) retryBaziObj = candidate;
						else try { console.warn('[ReportPane.regenerate] bazi validate fail:', v.reason); } catch(_){}
					}
				} catch(_){}
			}
			await generateReport({
				template: oneShot,
				thinkingLevel: getPersistedThinkingLevel(),
				caseSnapshot: trimmedSource,
				caseId: activeInstance.caseId,
				caseRecord: retrySrc && retrySrc.record,
				chartObj: retryChartObj, // v1.14
				baziObj: retryBaziObj,   // v1.14
				schools: activeInstance.schools || [],
				materialIds: activeInstance.materialIds || [],
				embedCharts: !!activeInstance.embedCharts,
				profile: useProfile,
				model: useModel,
				concurrency: 1,
				instanceId: activeInstance.id,
				onProgress: (p)=>{
					setActiveInstance((prev)=>{
						if(!prev) return prev;
						const ns = { ...(prev.sections || {}) };
						const cur = ns[p.sectionKey] || {};
						ns[p.sectionKey] = { ...cur, status: p.status, content: p.content !== undefined ? p.content : cur.content };
						return { ...prev, sections: ns };
					});
				},
				retrievalFn: ()=>Promise.resolve(retrievedText),
				chartCaptureFn: ()=>Promise.resolve(chartDataURL),
			});
			// 重新读取
			const updated = await getStoreRecord(AI_ANALYSIS_STORES.reportInstances, activeInstance.id);
			if(updated && isMountedRef.current){
				// audit 4 修:用户重试期间切到其他实例 → 不要强制覆盖
				const targetId = updated.id;
				setActiveInstance((prev)=>{
					if(prev && prev.id && prev.id !== targetId) return prev;
					return updated;
				});
				message.success({ content:'本节已重试', key:'rep_retry' });
			}
		}catch(e){
			message.error({ content:`重试失败：${e && e.message || e}`, key:'rep_retry' });
		}
	}

	async function handleDeleteInstance(id){
		Modal.confirm({
			title: '删除该报告？',
			content: '删除后不可恢复',
			okText: '删除',
			okType: 'danger',
			cancelText: '取消',
			onOk: async ()=>{
				// audit 修:删的实例如果正在生成,先 abort pipeline,否则后续 persist 会让已删的实例又冒出来。
				if(generatingInstanceIdRef.current === id && abortRef.current){
					try { abortRef.current.abort(); } catch(_){}
					// 等一下让 pipeline finally 跑完
					await new Promise((r)=>setTimeout(r, 200));
				}
				await deleteStoreRecord(AI_ANALYSIS_STORES.reportInstances, id);
				if(activeInstance && activeInstance.id === id){
					setActiveInstance(null);
					setView('list');
				}
				await refreshInstances();
				message.success('已删除');
			},
		});
	}

	async function handleRenameSubmit(){
		if(!renameTarget) return;
		const next = `${renameValue || ''}`.trim();
		if(!next){
			message.error('标题不能为空');
			return;
		}
		const rec = await getStoreRecord(AI_ANALYSIS_STORES.reportInstances, renameTarget.id);
		if(!rec) return;
		await saveReportInstance({ ...rec, title: next, titleManuallyEdited: true });
		setRenameTarget(null);
		setRenameValue('');
		await refreshInstances();
		if(activeInstance && activeInstance.id === rec.id){
			setActiveInstance({ ...activeInstance, title: next });
		}
		message.success('已重命名');
	}

	async function handleOpenInstance(rec){
		const full = await getStoreRecord(AI_ANALYSIS_STORES.reportInstances, rec.id);
		// audit 修:full 可能 null(实例已被外部删/IndexedDB 错误) — 不能直接读 .technique 否则 TypeError
		if(!full){
			message.error('该报告记录已不存在或读取失败,请刷新列表');
			refreshInstances();
			return;
		}
		const tpl = findReportTemplate(templates, full.technique, full.granularity);
		setActiveInstance(full);
		setActiveTemplate(tpl);
		setView('detail');
	}

	async function handleExport(format){
		if(!activeInstance || !activeTemplate){
			message.error('请先打开一份报告');
			return;
		}
		// stability 修：生成中不允许直接导出（之前会导出含"（生成中…）"标题的半成品，用户困惑）。
		// audit 修:activeInstance.status 可能 stale (历史列表打开的老实例) — 从 IndexedDB 拉最新真实状态判断。
		let isRunning = generatingRef.current || generating;
		if(!isRunning){
			try {
				const fresh = await getStoreRecord(AI_ANALYSIS_STORES.reportInstances, activeInstance.id);
				if(fresh && fresh.status === 'running') isRunning = true;
			} catch(_){}
		}
		if(isRunning){
			Modal.confirm({
				title: '报告还在生成中',
				width: 460,
				content: '此报告尚未完整生成。继续导出会得到一份「未完成」副本（部分节为空或缺失）。\n\n建议等生成完成后再导出；若必须现在导出，文件名会自动标记 [未完成]。',
				okText: '仍要导出',
				okType: 'danger',
				cancelText: '等生成完成',
				onOk: ()=>doExport(format, true),
			});
			return;
		}
		doExport(format, false);
	}

	function doExport(format, unfinished){
		const sp = resolveSchoolPrompt(activeInstance.technique, activeInstance.schools || []);
		// stability 修：文件名清理 Windows/Mac/Linux 都不允许的字符 / \ : * ? " < > |
		const baseTitle = `${activeInstance.title || 'report'}`.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
		const finalTitle = unfinished ? `${baseTitle} [未完成]` : baseTitle;
		// 临时塞回 instance.title 给 export builder 用,然后还原
		const overrideInstance = { ...activeInstance, title: finalTitle };
		Promise.resolve(exportReportByFormat(overrideInstance, activeTemplate, sp.schoolDisplay, format))
			.then(()=>{
				message.success(`已导出 ${format}`);
			})
			.catch((e)=>{
				message.error(`导出失败：${e && e.message || e}`);
			});
	}

	// ============ 渲染 ============

	function renderToolbar(){
		const isDetail = view === 'detail' && activeInstance;
		return (
			<div style={{padding:'8px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--horosa-border, #eee)',gap:8,flexWrap:'wrap'}}>
				<Space size="small">
					{isDetail ? (
						<Button size="small" icon={<XQIcon name="arrow-left" />} onClick={()=>setView('list')}>返回列表</Button>
					) : null}
					<Button type="primary" size="small" icon={<XQIcon name="plus" />} onClick={()=>{ setLaunchPreset(null); setGeneratorOpen(true); }}>新建报告</Button>
				</Space>
				{isDetail ? (
					<Space size="small">
						<Tooltip title={activeInstance.title}>
							<div style={{fontWeight:600,maxWidth:300,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{activeInstance.title}</div>
						</Tooltip>
						<Dropdown
							menu={{
								items: [
									{ key:'md', label:'Markdown (.md)' },
									{ key:'docx', label:'Word (.docx)' },
									{ key:'pdf', label:'PDF (打印)' },
									{ key:'html', label:'HTML 单文件' },
								],
								onClick: ({key})=>handleExport(key),
							}}
						>
							<Button size="small" icon={<XQIcon name="download" />}>导出</Button>
						</Dropdown>
						<Button size="small" icon={<XQIcon name="edit" />} onClick={()=>{ setRenameTarget(activeInstance); setRenameValue(activeInstance.title || ''); }}>重命名</Button>
						<Button size="small" danger icon={<XQIcon name="delete" />} onClick={()=>handleDeleteInstance(activeInstance.id)}>删除</Button>
						{generating ? <Button size="small" danger icon={<XQIcon name="stop" />} onClick={handleCancelGenerate}>取消生成</Button> : null}
					</Space>
				) : null}
			</div>
		);
	}

	function renderProgress(){
		if(!generating) return null;
		const pct = generationProgress.total ? Math.floor(generationProgress.done * 100 / generationProgress.total) : 0;
		const running = activeTemplate && activeTemplate.sections && activeTemplate.sections.find((s)=>{
			const st = (activeInstance && activeInstance.sections && activeInstance.sections[s.key]) || {};
			return st.status === 'running';
		});
		return (
			<div style={{padding:'8px 12px',background:'var(--horosa-panel-soft, #f6faff)',borderBottom:'1px solid var(--horosa-border, #eee)'}}>
				<div style={{display:'flex',alignItems:'center',gap:8}}>
					<Spin size="small" />
					<div style={{flex:1}}>
						<Progress percent={pct} status="active" size="small" format={()=>`${generationProgress.done}/${generationProgress.total} 节`}/>
					</div>
				</div>
				{running ? (
					<div style={{marginTop:4,fontSize:12,color:'var(--horosa-muted, #888)'}}>当前：{running.title}</div>
				) : null}
			</div>
		);
	}

	function renderEmpty(){
		return (
			<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
				<Empty
					image={Empty.PRESENTED_IMAGE_SIMPLE}
					description={
						<div style={{color:'var(--horosa-muted, #999)'}}>
							<div>还没有报告</div>
							<div style={{fontSize:12,marginTop:4}}>点「新建报告」让 AI 按模板生成一份覆盖每个方面的综合报告</div>
						</div>
					}
				>
					<Button type="primary" icon={<XQIcon name="plus" />} onClick={()=>{ setLaunchPreset(null); setGeneratorOpen(true); }}>新建报告</Button>
				</Empty>
			</div>
		);
	}

	function renderList(){
		if(instances.length === 0) return renderEmpty();
		const columns = [
			{
				title:'标题', dataIndex:'title', key:'title',
				render: (t, r)=>(
					<a onClick={()=>handleOpenInstance(r)} style={{fontWeight:500}}>{t || '(未命名)'}</a>
				),
			},
			{
				title:'技法', dataIndex:'technique', key:'technique', width:80,
				render: (v)=>v === 'bazi' ? '八字' : v === 'ziwei' ? '紫微' : v,
			},
			{
				title:'粒度', dataIndex:'granularity', key:'granularity', width:80,
				render: (v)=>`${v || 12} 节`,
			},
			{
				title:'流派', dataIndex:'schools', key:'schools', width:160,
				render: (v)=>(v && v.length) ? v.map((s, i)=>(<Tag key={i} color="cyan">{s}</Tag>)) : <span style={{color:'var(--horosa-muted, #999)'}}>通用</span>,
			},
			{
				title:'状态', dataIndex:'status', key:'status', width:80,
				render: (v)=>v === 'done' ? <Tag color="green">完成</Tag> : v === 'running' ? <Tag color="processing">生成中</Tag> : v === 'failed' ? <Tag color="red">失败</Tag> : <Tag>{v || 'pending'}</Tag>,
			},
			{
				title:'更新时间', dataIndex:['meta', 'updatedAt'], key:'updatedAt', width:160,
				render: (v)=>v ? new Date(v).toLocaleString() : '',
			},
			{
				title:'操作', key:'ops', width:140,
				render: (_, r)=>(
					<Space size={4}>
						<Button size="small" type="link" onClick={()=>handleOpenInstance(r)}>打开</Button>
						<Button size="small" type="link" onClick={()=>{ setRenameTarget(r); setRenameValue(r.title || ''); }}>重命名</Button>
						<Button size="small" type="link" danger onClick={()=>handleDeleteInstance(r.id)}>删除</Button>
					</Space>
				),
			},
		];
		return (
			<div style={{flex:1,padding:8,overflow:'auto'}}>
				<Table
					rowKey="id"
					size="small"
					dataSource={instances}
					columns={columns}
					pagination={instances.length > 30 ? { pageSize: 20, showSizeChanger: false } : false}
				/>
			</div>
		);
	}

	function renderDetail(){
		if(!activeInstance || !activeTemplate) return renderEmpty();
		const sections = activeTemplate.sections || [];
		return (
			<div style={{flex:1,display:'flex',overflow:'hidden'}}>
				{/* 左侧目录 */}
				<div style={{width:200,borderRight:'1px solid var(--horosa-border, #eee)',overflow:'auto',background:'var(--horosa-panel-soft, #fafafa)'}}>
					<div style={{padding:'8px 12px',fontSize:12,color:'var(--horosa-muted, #888)',borderBottom:'1px solid var(--horosa-border, #eee)'}}>目录</div>
					<div style={{padding:8}}>
						{sections.map((s, idx)=>{
							const st = (activeInstance.sections || {})[s.key] || {};
							const statusIcon = st.status === 'done' ? '✓'
								: st.status === 'running' ? '⏳'
								: st.status === 'failed' ? '❌'
								: st.status === 'warn' ? '⚠️'
								: st.status === 'cancelled' ? '⊘'
								: '⏸';
							return (
								<a key={s.key} href={`#sec-${s.key}`} style={{
									display:'block',padding:'4px 8px',color:'var(--horosa-text-soft, #333)',fontSize:13,
									borderRadius:4,marginBottom:2,
								}}>
									<span style={{display:'inline-block',width:16,color:'var(--horosa-muted, #888)'}}>{statusIcon}</span>
									{idx + 1}. {s.title}
								</a>
							);
						})}
					</div>
				</div>
				{/* 右侧内容 */}
				<div style={{flex:1,overflow:'auto',padding:'16px 24px'}}>
					{activeInstance.intro ? (
						<Alert
							type="info"
							message={<div><strong>一句话结论：</strong>{activeInstance.intro}</div>}
							style={{marginBottom:16}}
							showIcon
						/>
					) : null}
					{sections.map((s)=>{
						const st = (activeInstance.sections || {})[s.key] || {};
						// 用户反馈节 7 大块空白根因之一: content 是只有 whitespace。trim 判定空内容。
						const contentTrim = `${st.content || ''}`.trim();
						const rendered = contentTrim ? renderMarkdownToHtml(contentTrim) : '';
						return (
							<div key={s.key} id={`sec-${s.key}`} style={{marginBottom:32,paddingBottom:16,borderBottom:'1px dashed var(--horosa-border, #eee)'}}>
								<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
									<h2 style={{margin:0,color:'var(--horosa-text, #162033)'}}>{s.order + 1}. {s.title}</h2>
									<Space size={4}>
										<Tooltip title="重试本节">
											<Button size="small" icon={<XQIcon name="sync" />} onClick={()=>handleRegenerateSection(s.key)} disabled={generating} />
										</Tooltip>
										<Tooltip title="复制本节">
											<Button size="small" icon={<XQIcon name="copy" />} onClick={()=>{
												if(navigator.clipboard){
													navigator.clipboard.writeText(contentTrim);
													message.success('已复制');
												}
											}} />
										</Tooltip>
										<Tooltip title="编辑本节">
											<Button size="small" icon={<XQIcon name="edit" />} disabled={generating || editingSectionKey === s.key} onClick={()=>{ setEditingSectionKey(s.key); setEditingDraft(`${st.content || ''}`); }} />
										</Tooltip>
									</Space>
								</div>
								{/* v1.18: 仅当 instance 显式开启 embedCharts 时才渲染嵌图(默认关) */}
								{activeInstance.embedCharts && st.embeddedChartDataURL ? (
									<div style={{marginBottom:16,marginTop:4,textAlign:'center'}}>
										<img src={st.embeddedChartDataURL} alt={s.title} style={{maxWidth:'100%',border:'1px solid var(--horosa-border, #ddd)',borderRadius:4}} />
									</div>
								) : null}
								{editingSectionKey === s.key ? (
									<div>
										<Input.TextArea
											value={editingDraft}
											onChange={(e)=>setEditingDraft(e.target.value)}
											autoSize={{ minRows: 8, maxRows: 40 }}
											style={{ fontSize: 14, lineHeight: 1.7 }}
										/>
										<div style={{ marginTop: 8, textAlign: 'right' }}>
											<Space>
												<Button size="small" onClick={()=>{ setEditingSectionKey(null); setEditingDraft(''); }}>取消</Button>
												<Button size="small" type="primary" onClick={()=>handleSaveSectionEdit(s.key)}>保存</Button>
											</Space>
										</div>
									</div>
								) : st.status === 'failed' ? (
									<Alert
										type="error"
										message={`本节生成失败：${(st.error && st.error.message) || '未知错误'}`}
										action={<Button size="small" onClick={()=>handleRegenerateSection(s.key)}>重试</Button>}
									/>
								) : st.status === 'cancelled' ? (
									<div style={{color:'var(--horosa-muted, #999)'}}>⊘ 本节已取消</div>
								) : st.status === 'warn' ? (
									<>
										<Alert type="warning" message={(st.error && st.error.message) || '本节内容较短'} style={{marginBottom:8}} />
										{contentTrim ? <div className="xq-markdown" dangerouslySetInnerHTML={{__html: rendered}} /> : null}
									</>
								) : st.status === 'running' && !contentTrim ? (
									<div style={{padding:'20px 0',textAlign:'center'}}><Spin tip="生成中..." /></div>
								) : st.status === 'done' && !contentTrim ? (
									// 已"完成"但内容空白 → 明确提示并提供重试
									<Alert type="warning" message="本节内容为空（AI 没有返回有效文字）" action={<Button size="small" onClick={()=>handleRegenerateSection(s.key)}>重试</Button>} />
								) : !contentTrim ? (
									<div style={{color:'var(--horosa-muted, #999)'}}>（尚未生成）</div>
								) : (
									<div className="xq-markdown" dangerouslySetInnerHTML={{__html: rendered}} />
								)}
							</div>
						);
					})}
					{activeInstance.outro ? (
						<div style={{marginTop:24,padding:16,background:'var(--horosa-gold-soft, #fffbf0)',border:'1px solid var(--horosa-border-strong, #f0e0a0)',borderRadius:8}}>
							<h2 style={{marginTop:0,color:'var(--horosa-text, #162033)'}}>重点提醒</h2>
							<div className="xq-markdown" dangerouslySetInnerHTML={{__html: renderMarkdownToHtml(activeInstance.outro)}} />
						</div>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<ReportLaunchContext.Provider value={{ requestNewReport }}>
			<div style={{display:'flex',flexDirection:'column',height:'100%'}}>
				{renderToolbar()}
				{renderProgress()}
				{view === 'detail' ? renderDetail() : renderList()}
				<ReportGenerator
					open={generatorOpen}
					onCancel={()=>setGeneratorOpen(false)}
					onSubmit={handleStartGenerate}
					sources={sources}
					materials={materials}
					profile={profile}
					model={model}
					modelOptions={modelOptions}
					providerProfiles={providerProfiles}
					preset={launchPreset}
				/>
				<Modal
					title="重命名报告"
					open={!!renameTarget}
					onCancel={()=>{ setRenameTarget(null); setRenameValue(''); }}
					onOk={handleRenameSubmit}
					okText="保存"
					cancelText="取消"
				>
					<Input value={renameValue} onChange={(e)=>setRenameValue(e.target.value)} maxLength={60} placeholder="输入新标题" />
				</Modal>
			</div>
		</ReportLaunchContext.Provider>
	);
}
