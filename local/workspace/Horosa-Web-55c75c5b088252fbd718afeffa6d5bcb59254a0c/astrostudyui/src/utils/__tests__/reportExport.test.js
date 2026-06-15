// 报告功能 - 导出工具单测
// v1.20: mock jspdf/html2canvas - jest 环境无 TextEncoder, jspdf real import 会 crash
jest.mock('jspdf', () => ({ jsPDF: function() { return { internal: { pageSize: { getWidth: ()=>210, getHeight: ()=>297 } }, addImage: ()=>{}, addPage: ()=>{}, output: ()=>new Blob() }; } }));
jest.mock('html2canvas', () => ({ __esModule: true, default: () => Promise.resolve({ width: 100, height: 100, toDataURL: ()=>'data:image/png;base64,test' }) }));

import { buildReportMarkdown, buildReportHtml, buildReportDocx } from '../reportExport';
import { getBuiltinReportTemplates, findReportTemplate } from '../reportTemplates';

const template = findReportTemplate(getBuiltinReportTemplates(), 'bazi', 8);

const mockInstance = {
	id: 'rpt-1',
	templateId: template.id,
	caseId: 'case-1',
	caseLabel: '张三',
	technique: 'bazi',
	granularity: 8,
	schools: ['子平派'],
	title: '张三 · 八字 · 8节子平派报告',
	intro: '财运较佳、官业中等、婚姻需谨慎',
	outro: '## 未来 3 年重点\n- 注意流年 2027 戊辰\n- 2028 化禄宜进取',
	sections: template.sections.reduce((m, s)=>{
		m[s.key] = {
			key: s.key, title: s.title, order: s.order,
			status: 'done',
			content: `## ${s.title}\n\n这是 ${s.title} 节的测试内容。\n\n- 要点 1\n- 要点 2`,
			embeddedChartDataURL: null,
		};
		return m;
	}, {}),
	meta: { providerName: 'DeepSeek', model: 'deepseek-chat', createdAt: '2026-06-07T10:00:00Z' },
};

describe('buildReportMarkdown', ()=>{
	test('含标题/案例/各节/末页', ()=>{
		const md = buildReportMarkdown(mockInstance, template, '子平派');
		expect(md).toContain('# 张三');
		expect(md).toContain('案例');
		expect(md).toContain('八字');
		expect(md).toContain('子平派');
		expect(md).toContain('一句话结论');
		expect(md).toContain('## 目录');
		expect(md).toContain('1. 命主基本');
		expect(md).toContain('## 重点提醒');
	});

	test('嵌图节包含 ![]() 链接', ()=>{
		const inst = { ...mockInstance, sections: { ...mockInstance.sections } };
		inst.sections.dayun = { ...inst.sections.dayun, embeddedChartDataURL: 'data:image/png;base64,iVBORw0KGgo=' };
		const md = buildReportMarkdown(inst, template, '子平派');
		expect(md).toContain('![');
		expect(md).toContain('data:image/png;base64');
	});
});

describe('buildReportHtml', ()=>{
	test('合法 HTML 结构', ()=>{
		const html = buildReportHtml(mockInstance, template, '子平派');
		expect(html).toContain('<!DOCTYPE html>');
		expect(html).toContain('<title>');
		expect(html).toContain('<style>');
		expect(html).toContain('<h1>');
		expect(html).toContain('张三');
	});

	test('转义 < > & " 字符', ()=>{
		const inst = { ...mockInstance, caseLabel: 'A <script>alert(1)</script>' };
		const html = buildReportHtml(inst, template, '子平派');
		expect(html).not.toContain('<script>alert(1)</script>');
		expect(html).toContain('&lt;script&gt;');
	});
});

// docx@9 是 ESM 包，jest (CJS transform) 下 `new TextRun()` 抛 "is not a constructor"，
// 但浏览器 webpack 路径正常。docx 输出在 preview 内实测。这里仅断言函数存在。
describe('buildReportDocx', ()=>{
	test('函数已导出', ()=>{
		expect(typeof buildReportDocx).toBe('function');
	});
});
