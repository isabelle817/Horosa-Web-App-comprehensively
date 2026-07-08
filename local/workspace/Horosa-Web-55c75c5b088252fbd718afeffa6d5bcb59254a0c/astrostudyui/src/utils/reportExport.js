// 报告导出 - markdown / docx / pdf(print) / html 四种形态
// 复用 aiAnalysisExport.js 的 downloadBlob / downloadTextFile / Document/Packer

import { downloadBlob, downloadTextFile } from './aiAnalysisExport';
import { normalizeMarkdown } from './reportMarkdownNormalize';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from 'docx';
// v1.20: 弃用 html2pdf wrapper(其内部 html2canvas 截多屏长内容到空白), 直接用 jspdf + html2canvas 独立组合
// 这样能 100% 控制 canvas 尺寸 + 分页逻辑.
// v1.20 修 Babel ESM interop 问题: import * 兜底所有 default/named export
import * as _jspdfMod from 'jspdf';
import * as _html2canvasMod from 'html2canvas';
const jsPDF = _jspdfMod.jsPDF || _jspdfMod.default || _jspdfMod;
const html2canvas = (typeof _html2canvasMod === 'function') ? _html2canvasMod
	: (_html2canvasMod && typeof _html2canvasMod.default === 'function') ? _html2canvasMod.default
	: _html2canvasMod;
// docx 的 AlignmentType / HeadingLevel 在 jest 环境下偶尔解构为 undefined,改用字符串字面值最稳。
const ALIGN_CENTER = 'center';
const HEADING_MAP = { 1: 'Heading1', 2: 'Heading2', 3: 'Heading3', 4: 'Heading4' };

// ============ Markdown 导出 ============

export function buildReportMarkdown(instance, template, schoolDisplay){
	if(!instance || !template) return '';
	const lines = [];
	const techName = instance.technique === 'bazi' ? '八字' : instance.technique === 'ziwei' ? '紫微' : instance.technique;
	const title = instance.title || `${instance.caseLabel || '案例'} · ${techName} · ${instance.granularity}节${schoolDisplay && schoolDisplay !== '通用' ? schoolDisplay : ''}报告`;
	lines.push(`# ${title}\n`);
	lines.push('---\n');
	lines.push(`**案例**：${instance.caseLabel || '(未命名)'}　**技法**：${techName}　**粒度**：${instance.granularity} 节　**流派**：${schoolDisplay || '通用'}\n`);
	lines.push(`**模型**：${(instance.meta && instance.meta.providerName) || ''} · ${(instance.meta && instance.meta.model) || ''}　**生成时间**：${instance.meta && instance.meta.createdAt || ''}\n`);
	lines.push('\n---\n');
	if(instance.intro){
		lines.push(`> **一句话结论**：${instance.intro}\n`);
		lines.push('\n');
	}
	lines.push('## 目录\n');
	(template.sections || []).forEach((s)=>{
		lines.push(`- ${s.order + 1}. ${s.title}`);
	});
	lines.push('\n---\n');
	(template.sections || []).forEach((s)=>{
		const state = (instance.sections || {})[s.key] || {};
		lines.push(`\n## ${s.order + 1}. ${s.title}\n`);
		if(state.embeddedChartDataURL){
			lines.push(`![${s.title}](${state.embeddedChartDataURL})\n\n`);
		}
		if(state.status === 'failed'){
			// audit 修:转义 markdown 特殊字符防 error.message 含 *_[ 等破坏渲染
			const errMsg = `${(state.error && state.error.message) || '未知错误'}`.replace(/([*_`\[\]])/g, '\\$1');
			lines.push(`> ⚠️ 本节生成失败：${errMsg}\n`);
		}else if(state.status === 'cancelled'){
			lines.push(`> ⊘ 本节被用户取消\n`);
		}else if(!`${state.content || ''}`.trim()){
			lines.push(`> （尚未生成 / 本节内容为空）\n`);
		}else{
			lines.push(`${normalizeMarkdown(state.content)}\n`);
		}
	});
	if(instance.outro){
		lines.push('\n---\n');
		lines.push('## 重点提醒\n');
		lines.push(`${normalizeMarkdown(instance.outro)}\n`);
	}
	return lines.join('\n');
}

export function exportReportMarkdown(instance, template, schoolDisplay){
	const md = buildReportMarkdown(instance, template, schoolDisplay);
	const fileName = `${instance.title || 'report'}.md`;
	downloadTextFile(fileName, md, 'text/markdown;charset=utf-8');
}

// ============ HTML 单文件导出 ============

function escapeHtml(s){
	return `${s || ''}`
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// 极简 markdown → HTML（仅支持基本标题/列表/图/段落/粗体/斜体/引用），
// 报告导出场景里不需要全功能 markdown 渲染器，避免引入大体积依赖。
function tinyMarkdownToHtml(md){
	if(!md) return '';
	const lines = md.split('\n');
	const out = [];
	let inList = false;
	let inPara = false;
	const closeList = ()=>{ if(inList){ out.push('</ul>'); inList = false; } };
	const closePara = ()=>{ if(inPara){ out.push('</p>'); inPara = false; } };
	for(const raw of lines){
		const line = raw.replace(/\r$/, '');
		const isHeading = /^#{1,6}\s+/.test(line);
		const isListItem = /^- /.test(line);
		const isImage = /^!\[[^\]]*\]\([^)]+\)/.test(line);
		const isHr = /^---+\s*$/.test(line);
		const isBlockquote = /^>\s+/.test(line);
		const isEmpty = !line.trim();
		if(isHr){ closeList(); closePara(); out.push('<hr/>'); continue; }
		if(isHeading){
			closeList(); closePara();
			const level = line.match(/^(#+)/)[1].length;
			const text = line.replace(/^#+\s+/, '');
			out.push(`<h${level}>${inlineMd(text)}</h${level}>`);
			continue;
		}
		if(isImage){
			closeList(); closePara();
			const m = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
			out.push(`<p><img alt="${escapeHtml(m[1])}" src="${m[2]}" style="max-width:100%;border:1px solid #ddd;border-radius:4px;"/></p>`);
			continue;
		}
		if(isListItem){
			closePara();
			if(!inList){ out.push('<ul>'); inList = true; }
			out.push(`<li>${inlineMd(line.replace(/^- /, ''))}</li>`);
			continue;
		}
		if(isBlockquote){
			closeList(); closePara();
			out.push(`<blockquote style="border-left:3px solid #bbb;padding-left:12px;color:#666;">${inlineMd(line.replace(/^>\s+/, ''))}</blockquote>`);
			continue;
		}
		if(isEmpty){ closeList(); closePara(); continue; }
		if(!inPara){ out.push('<p>'); inPara = true; } else { out.push('<br/>'); }
		out.push(inlineMd(line));
	}
	closeList(); closePara();
	return out.join('\n');
}
function inlineMd(t){
	return escapeHtml(t)
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.+?)\*/g, '<em>$1</em>')
		.replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function buildReportHtml(instance, template, schoolDisplay){
	const md = buildReportMarkdown(instance, template, schoolDisplay);
	const body = tinyMarkdownToHtml(md);
	const title = instance.title || `报告`;
	return [
		'<!DOCTYPE html>',
		`<html lang="zh-CN">`,
		'<head>',
		`<meta charset="UTF-8"/>`,
		`<meta name="viewport" content="width=device-width,initial-scale=1"/>`,
		`<title>${escapeHtml(title)}</title>`,
		'<style>',
		'  body { font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 880px; margin: 32px auto; padding: 0 16px; color: #222; line-height: 1.7; }',
		'  h1 { font-size: 28px; border-bottom: 2px solid #333; padding-bottom: 8px; }',
		'  h2 { font-size: 22px; margin-top: 32px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }',
		'  h3 { font-size: 18px; color: #555; }',
		'  p { margin: 12px 0; }',
		'  ul { padding-left: 24px; }',
		'  img { max-width: 100%; }',
		'  hr { border: none; border-top: 1px dashed #ccc; margin: 24px 0; }',
		'  code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 0.9em; }',
		'  blockquote { background: #fafafa; }',
		'  @media print { body { max-width: none; } }',
		'</style>',
		'</head>',
		'<body>',
		body,
		'</body>',
		'</html>',
	].join('\n');
}

export function exportReportHtml(instance, template, schoolDisplay){
	const html = buildReportHtml(instance, template, schoolDisplay);
	const fileName = `${instance.title || 'report'}.html`;
	downloadTextFile(fileName, html, 'text/html;charset=utf-8');
}

// ============ PDF 导出 ============
// audit 修(用户反馈"PDF 是空白 1 页, 3KB"):
// 根因 = `left:-99999px` 离屏定位让 html2canvas getBoundingClientRect 拿到负坐标,
// 截图 viewport 完全在 canvas 外 → 1 页空白 PDF。
// 综合修法 5 点:
// ①去离屏定位, 改 absolute(0,0) + opacity:0 + zIndex:-9999 + pointerEvents:none(屏内但视觉不可见)
// ②把 buildReportHtml 内联 <style> 也注入容器(否则 body 排版样式继承不到, 几乎空白)
// ③等所有 <img>(嵌图 dataURL PNG/JPEG) 解码完毕再截图, 否则截到未解码的空白
// ④两帧 rAF 等 layout commit
// ⑤html2canvas onclone hook 在 clone 出来的 DOM 上把 opacity/position 复位,
//   原 container 仍隐藏避免闪烁, clone 里则可见可截
export async function exportReportPdf(instance, template, schoolDisplay){
	const html = buildReportHtml(instance, template, schoolDisplay);
	const fileName = `${instance.title || 'report'}.pdf`;
	if(typeof window === 'undefined') return;
	let container = null;
	let pdfError = null;
	try {
		// v1.20 重写: 弃用 html2pdf wrapper(内部 html2canvas 截多屏长报告失败),
		// 改用 html2canvas + jsPDF 独立组合,精细控制 + 手动分页
		const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
		const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
		const styleCss = styleMatch ? styleMatch[1] : '';
		const bodyHtml = bodyMatch ? bodyMatch[1] : html;

		container = document.createElement('div');
		container.id = '__horosa_report_pdf_export__';
		container.innerHTML = `<style>${styleCss}</style><div class="__pdf_root__" style="max-width:none;margin:0;padding:24px;background:#ffffff;color:#222;line-height:1.7;font-family:-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">${bodyHtml}</div>`;
		// 屏下定位: html2canvas 能截但用户看不到. 不能用 opacity:0 / display:none / visibility:hidden(都会被 html2canvas 跳过)
		container.style.cssText = 'position:absolute;left:0;top:9999px;width:794px;background:#ffffff;pointer-events:none;';
		document.body.appendChild(container);

		// 等所有 <img>(嵌图 dataURL/真实命盘截图) 解码完毕
		const imgs = Array.from(container.querySelectorAll('img'));
		await Promise.all(imgs.map((img)=>{
			if(img.complete && img.naturalWidth > 0) return Promise.resolve();
			return new Promise((resolve)=>{
				const done = ()=>{ img.onload = null; img.onerror = null; resolve(); };
				img.onload = done;
				img.onerror = done;
				setTimeout(done, 5000);
			});
		}));
		await new Promise((r)=>requestAnimationFrame(()=>requestAnimationFrame(r)));

		const fullHeight = container.offsetHeight;
		const fullWidth = container.offsetWidth || 794;
		console.info(`[exportReportPdf step1] container ${fullWidth}x${fullHeight}px, imgs:${imgs.length}, jsPDF=${typeof jsPDF}, html2canvas=${typeof html2canvas}`);

		// v1.20: 直接 html2canvas 截全长 canvas, 然后手动按 A4 高度切片塞 jsPDF
		console.info('[exportReportPdf step2] before html2canvas');
		const canvas = await html2canvas(container, {
			scale: 2,
			useCORS: true,
			allowTaint: true,
			backgroundColor: '#ffffff',
			logging: false,
			width: fullWidth,
			height: fullHeight,
			windowWidth: fullWidth,
			windowHeight: fullHeight,
			onclone: (clonedDoc) => {
				const cloned = clonedDoc.getElementById('__horosa_report_pdf_export__');
				if(cloned){
					cloned.style.position = 'static';
					cloned.style.left = '0';
					cloned.style.top = '0';
				}
			},
		});
		const canvasW = canvas.width;
		const canvasH = canvas.height;
		console.info(`[exportReportPdf step3] canvas ${canvasW}x${canvasH}`);
		if(!canvasW || !canvasH){
			throw new Error('html2canvas 返回空 canvas (0x0)');
		}

		// jsPDF A4: 210mm x 297mm. 把 canvas 按比例缩到 A4 宽 - 2*margin(12mm), 然后按页高切片。
		console.info('[exportReportPdf step4] before new jsPDF');
		const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
		console.info('[exportReportPdf step5] pdf created');
		const pageWidthMm = pdf.internal.pageSize.getWidth();   // 210
		const pageHeightMm = pdf.internal.pageSize.getHeight(); // 297
		const marginMm = 10;
		const contentWidthMm = pageWidthMm - marginMm * 2;       // 190
		const contentHeightMm = pageHeightMm - marginMm * 2;     // 277
		// canvas → mm: contentWidthMm 占满 canvasW
		const mmPerPx = contentWidthMm / canvasW;
		const fullCanvasHeightMm = canvasH * mmPerPx;
		// 一页能装多少 px 高度
		const pxPerPage = Math.floor(contentHeightMm / mmPerPx);
		// v1.22 智能分页:优先在「块元素边界」断页(绝不裁断段落/标题/图片、标题不留孤行),
		// 单块超过一页时退回「扫描空白行」断(只切在文字行间空白处,杜绝从字中间裁断)。
		const ctx2 = canvas.getContext('2d');
		const containerTop = container.getBoundingClientRect().top;
		const rootEl = container.querySelector('.__pdf_root__') || container;
		let breakpoints = [];
		try {
			const blocks = rootEl.querySelectorAll('h1,h2,h3,h4,h5,h6,p,ul,ol,pre,blockquote,hr,img,table,figure,div');
			blocks.forEach((el)=>{
				const r = el.getBoundingClientRect();
				if(!r.height) return;
				const isHeading = /^H[1-6]$/.test(el.tagName);
				// 只把「非标题块的底边」作为可断点 → 断页只发生在某段落/列表/图完整结束之后:
				// ① 永不从块中间裁断文字/图片; ② 标题底边不可断,故标题永远跟它后面的正文一起进下一页,杜绝孤行标题。
				if(!isHeading){
					breakpoints.push((r.bottom - containerTop) * 2);  // ×scale(html2canvas scale:2) → canvas px
				}
			});
			breakpoints = Array.from(new Set(breakpoints.filter((y)=>y > 0 && y < canvasH))).sort((a,b)=>a - b);
		} catch(_){ breakpoints = []; }

		// 在 [minSearch, idealEnd] 内自下而上找一条「全白行」(行间空白),返回其 Y;找不到返回 -1。
		const findBlankRowUp = (idealEnd, minSearch)=>{
			const top = Math.max(0, Math.floor(minSearch));
			const h = Math.floor(idealEnd) - top;
			if(h <= 1) return -1;
			let data;
			try { data = ctx2.getImageData(0, top, canvasW, h).data; } catch(e){ return -1; }
			for(let row = h - 1; row >= 0; row--){
				let blank = true; const base = row * canvasW * 4;
				for(let x = 0; x < canvasW; x += 4){
					const i = base + x * 4;
					if(data[i + 3] > 8 && (data[i] < 244 || data[i + 1] < 244 || data[i + 2] < 244)){ blank = false; break; }
				}
				if(blank) return top + row;
			}
			return -1;
		};

		// 逐页计算 [起, 止] 切片
		const slices = [];
		let cursor = 0; let guard = 0;
		while(cursor < canvasH - 1 && guard++ < 1000){
			const idealEnd = Math.min(cursor + pxPerPage, canvasH);
			let end = idealEnd;
			if(idealEnd < canvasH){
				let best = -1;
				for(let k = 0; k < breakpoints.length; k++){
					const bp = breakpoints[k];
					if(bp > cursor + 8 && bp <= idealEnd && bp > best) best = bp;
				}
				const minFill = cursor + Math.floor(pxPerPage * 0.30); // 页面至少 30% 满,避免块边界把页切太短
				if(best > minFill){
					end = best;
				} else {
					const ws = findBlankRowUp(idealEnd, idealEnd - Math.floor(pxPerPage * 0.14));
					end = (ws > cursor + 8) ? ws : idealEnd;
				}
			}
			if(end <= cursor) end = idealEnd;
			slices.push([cursor, Math.min(end, canvasH)]);
			cursor = end;
		}
		const totalPages = slices.length;

		// 切片渲染(每页高度按实际切片,页尾不裁字)
		const sliceCanvas = document.createElement('canvas');
		sliceCanvas.width = canvasW;
		const sliceCtx = sliceCanvas.getContext('2d');
		const pageImages = [];
		for(let i = 0; i < slices.length; i++){
			const sY = slices[i][0];
			const sliceH = Math.max(1, slices[i][1] - sY);
			sliceCanvas.height = sliceH;
			sliceCtx.fillStyle = '#ffffff';
			sliceCtx.fillRect(0, 0, canvasW, sliceH);
			sliceCtx.drawImage(canvas, 0, sY, canvasW, sliceH, 0, 0, canvasW, sliceH);
			const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
			pageImages.push(imgData);
			if(i > 0) pdf.addPage();
			pdf.addImage(imgData, 'JPEG', marginMm, marginMm, contentWidthMm, sliceH * mmPerPx);
		}
		try { window.__lastPdfPageImages__ = pageImages; } catch(_){}

		const pdfBlob = pdf.output('blob');
		if(pdfBlob && pdfBlob.size > 5000){
			downloadBlob(fileName, pdfBlob);
			try { console.info(`[exportReportPdf] ✓ PDF 生成成功 (${Math.round(pdfBlob.size/1024)}KB, ${totalPages} 页)`); } catch(_){}
			return;
		}
		pdfError = `PDF blob 太小(${pdfBlob ? pdfBlob.size : 'null'} 字节)`;
	} catch(e) {
		pdfError = `PDF 导出异常: ${e && e.message || e}`;
		try { console.error('[exportReportPdf] failed:', e); } catch(_){}
	} finally {
		if(container){
			try { document.body.removeChild(container); } catch(_){}
		}
	}
	// v1.20: 不再走 fallback iframe print (会静默生成空白 PDF), 直接 throw 让上层弹错
	const errorMsg = pdfError || 'PDF 导出未知失败';
	try { console.error('[exportReportPdf] FAILED, 不再 fallback iframe:', errorMsg); } catch(_){}
	throw new Error(errorMsg);
}

// ============ DOCX 导出 ============

// 把 dataURL 转成 Uint8Array（docx ImageRun 接受 Uint8Array）
function dataUrlToUint8Array(dataUrl){
	if(!dataUrl || typeof dataUrl !== 'string') return null;
	const idx = dataUrl.indexOf(',');
	if(idx < 0) return null;
	const b64 = dataUrl.slice(idx + 1);
	try{
		const bin = atob(b64);
		const arr = new Uint8Array(bin.length);
		for(let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
		return arr;
	}catch(_){ return null; }
}

function makeDocxParagraphsFromMarkdown(md){
	const out = [];
	if(!md) return out;
	md = normalizeMarkdown(md);
	const lines = md.split('\n');
	for(const raw of lines){
		const line = raw.replace(/\r$/, '');
		if(/^---+\s*$/.test(line)) continue;
		if(/^#{1,6}\s+/.test(line)){
			const lvl = line.match(/^(#+)/)[1].length;
			const text = line.replace(/^#+\s+/, '');
			out.push(new Paragraph({ heading: HEADING_MAP[lvl] || HEADING_MAP[3], children: [new TextRun({ text })] }));
			continue;
		}
		if(/^- /.test(line)){
			out.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: line.replace(/^- /, '') })] }));
			continue;
		}
		if(/^>\s+/.test(line)){
			out.push(new Paragraph({ children: [new TextRun({ text: line.replace(/^>\s+/, ''), italics: true, color: '666666' })] }));
			continue;
		}
		// 图片：跳过（嵌图通过 ImageRun 单独处理 in caller）
		if(/^!\[/.test(line)) continue;
		if(!line.trim()){ out.push(new Paragraph({ children: [new TextRun('')] })); continue; }
		out.push(new Paragraph({ children: [new TextRun({ text: line })] }));
	}
	return out;
}

export async function buildReportDocx(instance, template, schoolDisplay){
	const techName = instance.technique === 'bazi' ? '八字' : instance.technique === 'ziwei' ? '紫微' : instance.technique;
	const title = instance.title || `${instance.caseLabel || '案例'} · ${techName} · ${instance.granularity}节${schoolDisplay && schoolDisplay !== '通用' ? schoolDisplay : ''}报告`;

	const children = [];

	// 封面页
	children.push(new Paragraph({ alignment: ALIGN_CENTER, children: [new TextRun({ text: title, bold: true, size: 36 })] }));
	children.push(new Paragraph({ alignment: ALIGN_CENTER, children: [new TextRun({ text: '' })] }));
	children.push(new Paragraph({ alignment: ALIGN_CENTER, children: [new TextRun({ text: `案例：${instance.caseLabel || '(未命名)'}`, size: 22 })] }));
	children.push(new Paragraph({ alignment: ALIGN_CENTER, children: [new TextRun({ text: `技法：${techName}　粒度：${instance.granularity} 节`, size: 22 })] }));
	children.push(new Paragraph({ alignment: ALIGN_CENTER, children: [new TextRun({ text: `流派：${schoolDisplay || '通用'}`, size: 22 })] }));
	children.push(new Paragraph({ alignment: ALIGN_CENTER, children: [new TextRun({ text: `模型：${(instance.meta && instance.meta.providerName) || ''} · ${(instance.meta && instance.meta.model) || ''}`, size: 22 })] }));
	children.push(new Paragraph({ alignment: ALIGN_CENTER, children: [new TextRun({ text: `生成时间：${(instance.meta && instance.meta.createdAt) || ''}`, size: 22 })] }));
	children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

	if(instance.intro){
		children.push(new Paragraph({ alignment: ALIGN_CENTER, children: [new TextRun({ text: `一句话结论：${instance.intro}`, italics: true, size: 24 })] }));
	}

	// 目录
	children.push(new Paragraph({ heading: HEADING_MAP[1], children: [new TextRun({ text: '目录' })] }));
	(template.sections || []).forEach((s)=>{
		children.push(new Paragraph({ children: [new TextRun({ text: `${s.order + 1}. ${s.title}` })] }));
	});

	// 各节
	(template.sections || []).forEach((s)=>{
		const state = (instance.sections || {})[s.key] || {};
		children.push(new Paragraph({ heading: HEADING_MAP[1], children: [new TextRun({ text: `${s.order + 1}. ${s.title}` })] }));
		// 嵌图
		if(state.embeddedChartDataURL){
			const u8 = dataUrlToUint8Array(state.embeddedChartDataURL);
			if(u8){
				try{
					children.push(new Paragraph({ children: [new ImageRun({ data: u8, transformation: { width: 480, height: 480 } })] }));
				}catch(_){ /* 图损坏忽略 */ }
			}
		}
		if(state.status === 'failed'){
			children.push(new Paragraph({ children: [new TextRun({ text: `⚠️ 本节生成失败：${(state.error && state.error.message) || '未知错误'}`, color: 'aa0000' })] }));
		}else if(!state.content){
			children.push(new Paragraph({ children: [new TextRun({ text: '（尚未生成）', color: '888888', italics: true })] }));
		}else{
			makeDocxParagraphsFromMarkdown(state.content).forEach((p)=>children.push(p));
		}
	});

	// 末页
	if(instance.outro){
		children.push(new Paragraph({ heading: HEADING_MAP[1], children: [new TextRun({ text: '重点提醒' })] }));
		makeDocxParagraphsFromMarkdown(instance.outro).forEach((p)=>children.push(p));
	}

	const doc = new Document({ sections: [{ children }] });
	return Packer.toBlob(doc);
}

export async function exportReportDocx(instance, template, schoolDisplay){
	const blob = await buildReportDocx(instance, template, schoolDisplay);
	const fileName = `${instance.title || 'report'}.docx`;
	downloadBlob(fileName, blob);
}

// ============ debug hook (v1.20) - 让 preview MCP 能调测 ============
if(typeof window !== 'undefined'){
	window.__debugExport__ = {
		pdf: exportReportPdf,
		docx: exportReportDocx,
		md: exportReportMarkdown,
		html: exportReportHtml,
		buildHtml: buildReportHtml,
		buildMarkdown: buildReportMarkdown,
		jsPDF: jsPDF,
		html2canvas: html2canvas,
	};
}

// ============ 统一入口 ============

// audit 修:async 函数,所有分支显式 await/return Promise,让上层 .then() 一致触发(之前 md/html 同步返 undefined 让 message.success 不显)
export async function exportReportByFormat(instance, template, schoolDisplay, format){
	switch(format){
	case 'md':   return Promise.resolve(exportReportMarkdown(instance, template, schoolDisplay));
	case 'html': return Promise.resolve(exportReportHtml(instance, template, schoolDisplay));
	case 'pdf':  return Promise.resolve(exportReportPdf(instance, template, schoolDisplay));
	case 'docx': return exportReportDocx(instance, template, schoolDisplay);
	default:     return Promise.resolve(exportReportMarkdown(instance, template, schoolDisplay));
	}
}
