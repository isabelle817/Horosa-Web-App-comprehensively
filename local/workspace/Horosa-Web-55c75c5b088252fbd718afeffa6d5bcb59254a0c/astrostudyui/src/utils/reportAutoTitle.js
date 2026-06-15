// 报告自动命名 - 复用 chat generateAndApplyAutoTitle 模式
// 在报告生成完成后调一次微调用让 AI 给出短标题。失败回退到「{案例}-{技法}-{粒度}-{流派}-{date}」

import { requestNonStreamShort } from './reportPipeline';

function fallbackTitle({caseLabel, technique, granularity, schoolDisplay}){
	const techName = technique === 'bazi' ? '八字' : technique === 'ziwei' ? '紫微' : technique;
	const sch = schoolDisplay && schoolDisplay !== '通用' ? schoolDisplay : '';
	const date = new Date().toISOString().slice(0, 10);
	return `${caseLabel || '案例'} · ${techName} · ${granularity}节${sch}报告 (${date})`;
}

export async function generateReportTitle({instance, profile, model, schoolDisplay}){
	if(!instance) return '';
	const technique = instance.technique || 'bazi';
	const granularity = instance.granularity || 12;
	const caseLabel = instance.caseLabel || '案例';
	const fallback = fallbackTitle({caseLabel, technique, granularity, schoolDisplay});
	if(!profile || !model){
		return fallback;
	}
	try{
		const techName = technique === 'bazi' ? '八字' : technique === 'ziwei' ? '紫微' : technique;
		const sys = '你是命理报告标题生成器。请按照「{案例} · {技法} · 报告摘要」格式给出一个 12-20 字的简短中文标题。只返回标题文本，不要引号/标点结尾/前缀。';
		const usrSummary = Object.values(instance.sections || {}).slice(0, 6).map((s)=>{
			return `[${s.title || s.key}]\n${`${s.content || ''}`.slice(0, 80)}`;
		}).join('\n');
		const usr = `案例：${caseLabel}\n技法：${techName}\n粒度：${granularity} 节\n流派：${schoolDisplay || '通用'}\n\n报告主要内容摘要：\n${usrSummary}\n\n请给出 12-20 字的简短中文标题：`;
		const raw = await requestNonStreamShort({
			profile, model,
			systemPrompt: sys,
			userPrompt: usr,
			maxTokens: 60,
			requestTimeoutMs: 15000,
		});
		const cleaned = `${raw || ''}`.trim()
			.replace(/^["'"「『《【\s]+|["'"」』》】\s]+$/g, '')
			.replace(/^标题[:：\s]*/, '')
			.replace(/^[#>*\-\d\.\s]+/, '')
			.replace(/[\s\n\r]+/g, ' ')
			.replace(/[。.!！?？,，;；:：]+$/, '')
			.trim();
		if(cleaned.length >= 6 && cleaned.length <= 40){
			return cleaned;
		}
	}catch(_){}
	return fallback;
}
