import {
	getProviderDefaultChatModels,
	getProviderDefaultEmbeddingModels,
	getProviderDisplayName,
	getProviderPreset,
	getProviderProtocolFamily,
	isOpenAiFamily,
	isReasoningModel,
	splitProviderModels,
	applyThinkingLevel,
	THINKING_LEVELS,
} from '../aiAnalysisProviders';

describe('aiAnalysisProviders', ()=>{
	test('deepseek preset exposes expected defaults', ()=>{
		const preset = getProviderPreset('deepseek');
		expect(preset.baseUrl).toBe('https://api.deepseek.com');
		expect(getProviderDisplayName('deepseek')).toBe('DeepSeek');
		expect(getProviderProtocolFamily('deepseek')).toBe('openai-compatible');
		expect(getProviderDefaultChatModels('deepseek')).toEqual(['deepseek-chat', 'deepseek-reasoner']);
		expect(getProviderDefaultEmbeddingModels('deepseek')).toEqual([]);
	});

	test('moonshot preset exposes expected defaults', ()=>{
		const preset = getProviderPreset('moonshot');
		expect(preset.baseUrl).toBe('https://api.moonshot.cn/v1');
		// 2026-06 官方现行模型(kimi-k2-* preview 系列 2026-05-25 停服,旧默认即「测试连接」400 来源)。
		expect(getProviderDefaultChatModels('moonshot')).toEqual(['kimi-k2.6', 'kimi-k2.5']);
	});

	test('gemini preset exposes chat models distinct from embedding models', ()=>{
		const preset = getProviderPreset('gemini');
		expect(preset.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta');
		expect(getProviderProtocolFamily('gemini')).toBe('gemini');
		expect(getProviderDefaultChatModels('gemini')).toEqual(['gemini-2.5-flash', 'gemini-2.5-pro']);
		// text-embedding-004 已于 2026-01-14 关停,官方迁移目标 gemini-embedding-001。
		expect(getProviderDefaultEmbeddingModels('gemini')).toEqual(['gemini-embedding-001']);
	});

	test('splitProviderModels separates embedding-like ids', ()=>{
		expect(splitProviderModels(['deepseek-chat', 'text-embedding-3-small', 'bge-large-zh'], 'deepseek')).toEqual({
			models: ['deepseek-chat', 'text-embedding-3-small', 'bge-large-zh'],
			chatModels: ['deepseek-chat'],
			embeddingModels: ['text-embedding-3-small', 'bge-large-zh'],
		});
	});

	test('isReasoningModel detects deepseek-reasoner / r1 / openai reasoning series', ()=>{
		// #16:reasoner 必须被识别为推理模型 → 前端不发 temperature、后端不带采样参数。
		expect(isReasoningModel('deepseek-reasoner')).toBe(true);
		expect(isReasoningModel('openrouter/deepseek/deepseek-r1')).toBe(true);
		expect(isReasoningModel('o1-mini')).toBe(true);
		expect(isReasoningModel('gpt-5')).toBe(true);
		expect(isReasoningModel('deepseek-chat')).toBe(false);
		expect(isReasoningModel('gpt-4o')).toBe(false);
	});

	test('THINKING_LEVELS 含新增高档 xhigh/max', ()=>{
		expect(THINKING_LEVELS.map((t)=>t.value)).toEqual(['off', 'low', 'medium', 'high', 'xhigh', 'max']);
	});

	test('applyThinkingLevel: off 原样返回', ()=>{
		expect(applyThinkingLevel({ a: 1 }, 'off', 'anthropic', 'claude-3-opus')).toEqual({ a: 1 });
	});

	test('applyThinkingLevel: OpenAI reasoning_effort 把 xhigh/max 封顶为 high', ()=>{
		expect(applyThinkingLevel({}, 'xhigh', 'openai', 'gpt-5').reasoning_effort).toBe('high');
		expect(applyThinkingLevel({}, 'max', 'openai', 'gpt-5').reasoning_effort).toBe('high');
		expect(applyThinkingLevel({}, 'medium', 'openai', 'gpt-5').reasoning_effort).toBe('medium');
	});

	test('applyThinkingLevel: Anthropic budget_tokens 受 max_tokens 约束（防 400）', ()=>{
		expect(applyThinkingLevel({}, 'high', 'anthropic', 'claude-3-opus').thinking.budget_tokens).toBe(16000);
		expect(applyThinkingLevel({}, 'max', 'anthropic', 'claude-3-opus', 8000).thinking.budget_tokens).toBe(7488);
		expect(applyThinkingLevel({}, 'high', 'anthropic', 'claude-3-opus', 1000).thinking).toBeUndefined();
	});

	test('applyThinkingLevel: Gemini 写入 generationConfig.thinkingConfig.thinkingBudget + includeThoughts', ()=>{
		const cfg = applyThinkingLevel({}, 'max', 'gemini', 'gemini-2.5-pro').generationConfig.thinkingConfig;
		expect(cfg.thinkingBudget).toBe(32768);
		// #54-G：includeThoughts=true 才让 Gemini 回流思维链(thought part);缺它则预算照烧但 UI 无思考过程。
		expect(cfg.includeThoughts).toBe(true);
	});

	test('isOpenAiFamily: openai-compatible 也算 OpenAI 家族（预设实际取值就是它；曾因 === "openai" 永假致 stop/惩罚/JSON 模式静默失效）', ()=>{
		expect(isOpenAiFamily('openai')).toBe(true);
		expect(isOpenAiFamily('openai-compatible')).toBe(true);
		expect(isOpenAiFamily(getProviderProtocolFamily('openai'))).toBe(true);
		expect(isOpenAiFamily(getProviderProtocolFamily('deepseek'))).toBe(true);
		expect(isOpenAiFamily('anthropic')).toBe(false);
		expect(isOpenAiFamily('gemini')).toBe(false);
		expect(isOpenAiFamily('ollama')).toBe(false);
		expect(isOpenAiFamily('')).toBe(false);
		expect(isOpenAiFamily(null)).toBe(false);
	});

	test('applyThinkingLevel: reasoning_effort 覆盖与 isReasoningModel 同口径（曾漏 gpt-5.5/gpt-6/7、o6/7 致思考档静默失效）', ()=>{
		for(const m of ['gpt-5.5', 'gpt-6', 'gpt-7', 'o6', 'o7-mini', 'openrouter/openai/gpt-6']){
			expect(applyThinkingLevel({}, 'high', 'openai', m).reasoning_effort).toBe('high');
		}
		// 非 OpenAI 推理系不带 reasoning_effort（gpt-4o 非推理；deepseek-reasoner 无该参数,友好降级）
		expect(applyThinkingLevel({}, 'high', 'openai', 'gpt-4o').reasoning_effort).toBeUndefined();
		expect(applyThinkingLevel({}, 'high', 'deepseek', 'deepseek-reasoner').reasoning_effort).toBeUndefined();
	});
});
