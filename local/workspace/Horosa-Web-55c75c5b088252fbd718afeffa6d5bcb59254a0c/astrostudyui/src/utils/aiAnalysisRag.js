import { AI_ANALYSIS_STORES, bulkPutStoreRecords, listStoreRecords } from './aiAnalysisStore';

const DEFAULT_CHUNK_SIZE = 1200;
const DEFAULT_CHUNK_OVERLAP = 180;
const DIRECT_ATTACH_THRESHOLD = 12000;

function normalizeText(text){
	return `${text || ''}`.replace(/\r/g, '').trim();
}

function tokenize(text){
	return normalizeText(text)
		.toLowerCase()
		.split(/[^a-z0-9\u4e00-\u9fa5]+/g)
		.filter(Boolean);
}

export function shouldUseDirectAttach(material){
	return normalizeText(material && material.extractedText).length <= DIRECT_ATTACH_THRESHOLD;
}

export function splitTextIntoChunks(text, options = {}){
	const raw = normalizeText(text);
	if(!raw){
		return [];
	}
	const chunkSize = Math.max(400, options.chunkSize || DEFAULT_CHUNK_SIZE);
	const overlap = Math.max(0, options.overlap || DEFAULT_CHUNK_OVERLAP);
	const chunks = [];
	let start = 0;
	while(start < raw.length){
		const end = Math.min(raw.length, start + chunkSize);
		const content = raw.slice(start, end).trim();
		if(content){
			chunks.push({
				chunkIndex: chunks.length,
				content,
				startOffset: start,
				endOffset: end,
				searchText: content.toLowerCase(),
			});
		}
		if(end >= raw.length){
			break;
		}
		start = Math.max(end - overlap, start + 1);
	}
	return chunks;
}

// v1.16-L: 加全局 lock map 防同一 material 并发 chunking
// 触发场景: 用户快速连点"上传"/"重新计算嵌向量"/同时打开多个 tab → 多次 ensureMaterialChunks
// 风险: 并发 bulkPutStoreRecords → IndexedDB index 混乱 / 重复 chunk
const chunkingLocks = new Map();
export async function ensureMaterialChunks(material, options = {}){
	if(!material || !material.id){
		return [];
	}
	// 已有进行中的 chunking 任务 → 等它完成,不重复跑
	const existingLock = chunkingLocks.get(material.id);
	if(existingLock) return existingLock;

	const promise = (async ()=>{
		const existing = (await listStoreRecords(AI_ANALYSIS_STORES.materialChunks)).filter((item)=>item.materialId === material.id);
		if(existing.length){
			return existing.sort((a, b)=>a.chunkIndex - b.chunkIndex);
		}
		const chunks = splitTextIntoChunks(material.extractedText || '', options).map((item)=>({
			...item,
			materialId: material.id,
		}));
		if(chunks.length === 0){
			return [];
		}
		return bulkPutStoreRecords(AI_ANALYSIS_STORES.materialChunks, chunks, 'chunk');
	})().finally(()=>{
		chunkingLocks.delete(material.id);  // 完成后立即释放 lock
	});

	chunkingLocks.set(material.id, promise);
	return promise;
}

function keywordScore(queryTokens, chunk){
	if(!queryTokens.length){
		return 0;
	}
	const text = `${chunk && chunk.searchText ? chunk.searchText : chunk && chunk.content ? chunk.content : ''}`.toLowerCase();
	let score = 0;
	queryTokens.forEach((token)=>{
		if(text.indexOf(token) >= 0){
			score += 1;
		}
	});
	return score / queryTokens.length;
}

function cosineSimilarity(a, b){
	if(!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0){
		return 0;
	}
	const len = Math.min(a.length, b.length);
	let dot = 0;
	let na = 0;
	let nb = 0;
	for(let i=0; i<len; i++){
		const va = Number(a[i]) || 0;
		const vb = Number(b[i]) || 0;
		dot += va * vb;
		na += va * va;
		nb += vb * vb;
	}
	if(!na || !nb){
		return 0;
	}
	return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function rerankChunksWithVector(queryVector, chunkEntries){
	return (chunkEntries || []).map((item)=>({
		...item,
		vectorScore: cosineSimilarity(queryVector, item.vector || []),
		totalScore: (item.keywordScore || 0) * 0.45 + cosineSimilarity(queryVector, item.vector || []) * 0.55,
	})).sort((a, b)=>b.totalScore - a.totalScore);
}

export function rankChunksByKeyword(query, chunkEntries){
	const queryTokens = tokenize(query);
	return (chunkEntries || []).map((item)=>({
		...item,
		keywordScore: keywordScore(queryTokens, item),
		totalScore: keywordScore(queryTokens, item),
	})).sort((a, b)=>b.totalScore - a.totalScore);
}

export function mergeRetrievedChunks(scoredChunks, maxChars = 5000){
	const picked = [];
	let total = 0;
	for(let i=0; i<(scoredChunks || []).length; i++){
		const item = scoredChunks[i];
		const content = normalizeText(item.content);
		if(!content){
			continue;
		}
		if(total >= maxChars && picked.length > 0){
			break;
		}
		picked.push(item);
		total += content.length;
	}
	return picked;
}

export function buildRetrievedContextText(scoredChunks){
	return (scoredChunks || []).map((item)=>[
		`【资料：${item.materialName || '未命名资料'}】`,
		item.content || '',
	].filter(Boolean).join('\n')).join('\n\n').trim();
}

// 报告功能: 按流派过滤资料（materials 是 store 记录列表 / IDs 列表 不影响，这里按 records 过滤）。
// 规则：selectedSchools 为空 → 全量；否则：material.schools 含至少一个所选 OR material.schools 为空（视为通用）。
// audit 4 修:用户可能选了字面值 '不限流派' / '无' / 'unrestricted' 等,要当成空 schools 处理而非真流派过滤。
const UNRESTRICTED_LITERALS = ['不限流派', '不限', '无', 'unrestricted', 'any', 'all', '通用'];
export function filterMaterialsBySchools(materials, selectedSchools){
	const arr = Array.isArray(materials) ? materials : [];
	const sel = (selectedSchools || [])
		.filter((s)=>`${s || ''}`.trim())
		.filter((s)=>!UNRESTRICTED_LITERALS.includes(`${s}`.trim().toLowerCase()) && !UNRESTRICTED_LITERALS.includes(`${s}`.trim()));
	if(sel.length === 0) return arr;
	return arr.filter((m)=>{
		const ms = Array.isArray(m && m.schools) ? m.schools : [];
		if(ms.length === 0) return true; // 通用资料
		return ms.some((s)=>sel.includes(s));
	});
}

// 报告功能: 节级关键词加权 keyword scoring
// 在标准 query + extraKeywords 上做关键词排序，extra 权重 1.8 倍
export function rankChunksByKeywordWithExtra(query, extraKeywords, chunkEntries){
	const baseTokens = tokenize(query);
	const extraTokens = (extraKeywords || []).flatMap((k)=>tokenize(k));
	return (chunkEntries || []).map((item)=>{
		const base = keywordScore(baseTokens, item);
		const extra = keywordScore(extraTokens, item);
		return {
			...item,
			keywordScore: base + extra * 1.8,
			totalScore: base + extra * 1.8,
		};
	}).sort((a, b)=>b.totalScore - a.totalScore);
}
