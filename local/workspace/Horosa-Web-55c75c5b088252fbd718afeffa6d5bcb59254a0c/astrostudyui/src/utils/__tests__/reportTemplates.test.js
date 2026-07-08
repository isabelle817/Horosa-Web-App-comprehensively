// 报告功能 - 预置模板结构验证

import { getBuiltinReportTemplates, findReportTemplate, renderTemplateVars } from '../reportTemplates';

describe('reportTemplates', ()=>{
	const all = getBuiltinReportTemplates();

	test('共 6 套（八字 3 + 紫微 3）', ()=>{
		expect(all.length).toBe(6);
		const byTech = {};
		all.forEach((t)=>{ byTech[t.technique] = (byTech[t.technique] || 0) + 1; });
		expect(byTech.bazi).toBe(3);
		expect(byTech.ziwei).toBe(3);
	});

	test('每套模板的粒度组合（8/12/20）正确', ()=>{
		const grans = all.map((t)=>`${t.technique}-${t.granularity}`).sort();
		expect(grans).toEqual(['bazi-12', 'bazi-20', 'bazi-8', 'ziwei-12', 'ziwei-20', 'ziwei-8'].sort());
	});

	test('节数等于 granularity', ()=>{
		all.forEach((t)=>{
			expect(t.sections.length).toBe(t.granularity);
		});
	});

	test('节字段完整 + order 唯一连续', ()=>{
		all.forEach((t)=>{
			const orders = new Set();
			t.sections.forEach((s)=>{
				expect(s.key).toBeTruthy();
				expect(s.title).toBeTruthy();
				expect(typeof s.order).toBe('number');
				expect(s.systemPrompt).toBeTruthy();
				expect(s.userPromptTemplate).toBeTruthy();
				expect(Array.isArray(s.requiredSnapshotSegments)).toBe(true);
				expect(Array.isArray(s.retrievalKeywords)).toBe(true);
				expect(typeof s.maxTokens).toBe('number');
				expect(typeof s.retryOnEmpty).toBe('boolean');
				expect(typeof s.retryFallbackPrompt).toBe('string');
				orders.add(s.order);
			});
			expect(orders.size).toBe(t.sections.length);
		});
	});

	test('每节 systemPrompt 都含 {{school}} 占位符', ()=>{
		all.forEach((t)=>{
			t.sections.forEach((s)=>{
				expect(s.systemPrompt).toContain('{{school}}');
			});
		});
	});

	test('intro/outro 辅助节存在', ()=>{
		all.forEach((t)=>{
			expect(t.introSection).toBeTruthy();
			expect(t.outroSection).toBeTruthy();
			expect(t.introSection.userPromptTemplate).toContain('{{sectionsSummary}}');
			expect(t.outroSection.userPromptTemplate).toContain('{{dynamicsSummary}}');
		});
	});

	test('findReportTemplate 能按 technique+granularity 查回', ()=>{
		expect(findReportTemplate(all, 'bazi', 12).id).toBe('bazi-12-v1');
		expect(findReportTemplate(all, 'ziwei', 8).id).toBe('ziwei-8-v1');
		expect(findReportTemplate(all, 'bazi', 99)).toBeNull();
	});

	test('renderTemplateVars 支持嵌套路径', ()=>{
		const out = renderTemplateVars('Hello {{name}} from {{a.b}}!', { name: 'world', a: { b: 'foo' } });
		expect(out).toBe('Hello world from foo!');
	});

	test('renderTemplateVars 缺变量回退为空字符串', ()=>{
		const out = renderTemplateVars('{{x}} - {{y.z}}', { x: 'hi' });
		expect(out).toBe('hi - ');
	});
});
