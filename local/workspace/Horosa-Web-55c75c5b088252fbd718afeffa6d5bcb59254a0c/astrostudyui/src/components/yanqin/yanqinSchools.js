// 演禽流派体系:9 预设 + 互锁开关并存(照 gua/liuyaoSchools 模式)。
// 文档第七/八部「各流派起盘设置差异总表」:最易冲突开关 = 我/彼归属(各派恰好相反)。
// 默认 = 池本理《禽星易见》江西派宗本(四库著录、证据最高)。改单开关→school 标 custom。
//
// 互锁开关:
// - woBi  我/彼归属:'fan'池本理(翻禽=我/倒将=彼)|'shi'主流凤凰(时禽=我/翻禽=彼)|'daoWo'陈炳聿赖公(到将=我正将/番禽=彼正将/时禽=我副将/活曜=我本身)
// - xunOffset 时禽旬头位移:true(§10.5 判强制)|false(§4.5/§5.5 算例口径) ⚠️文档自冲突
// - yearAnchor 年禽锚点:'formula'(年+15)%28 A系 |'inherit' 1924中元甲子起箕 B系
// - monthVerse 月禽口诀:'A'(角/室/马/牛/参/心/胃)|'B'(室/星/牛/参/心/胃/角,疑别系)
// - huoYaoVariant 活曜传本:'fanqin'番禽系(土→翼)|'fanqin2'翻禽系(土→箕)|'off' 不立活曜(池本理)
// - sansuo 占卜重心:'both'|'suobo' 广东派重三传锁泊 |'fanqin' 江西派重翻禽倒将

export const DEFAULT_YANQIN_SETTINGS = {
	school: 'chibenli',
	woBi: 'fan',
	xunOffset: true,
	monthVerse: 'A',
	huoYaoVariant: 'off',  // 池本理不载活曜
	sansuo: 'both',
};

// 9 预设(只列与 default 不同项;其余继承 default)。note 为左栏悬浮说明。
export const YANQIN_PRESETS = {
	chibenli:   { label: '池本理《禽星易见》', overrides: {}, note: '江西派宗本·四库著录;翻禽=我/倒将=彼,时日禽彼我公用,不载活曜' },
	canchou:    { label: '参筹秘书(汪三益)', overrides: { huoYaoVariant: 'fanqin', sansuo: 'fanqin' }, note: '江西派集大成·七元甲子420日5040时局;重活曜番禽、略三传锁泊' },
	guangdong:  { label: '广东派(邵义德)', overrides: { sansuo: 'suobo', huoYaoVariant: 'off' }, note: '重三传锁泊、略活曜番禽;占卜主流' },
	jiangxi:    { label: '江西派(翻禽倒将)', overrides: { huoYaoVariant: 'fanqin', sansuo: 'fanqin' }, note: '详活曜番禽、略三传锁泊;翻禽倒将判吉凶' },
	fenghuang:  { label: '凤凰演禽(现代占课)', overrides: { woBi: 'shi', huoYaoVariant: 'fanqin', sansuo: 'both' }, note: '时禽=我/翻禽=彼(与池本理相反);完整三传四课+锁泊,不立命宫' },
	chenbingyu: { label: '陈炳聿/赖公禽星术', overrides: { woBi: 'daoWo', huoYaoVariant: 'fanqin' }, note: '池本理一系翻禽倒将;番禽=彼正将、到将=我正将、时禽=我副将、活曜=我本身' },
};

export const YANQIN_SCHOOL_OPTIONS = Object.keys(YANQIN_PRESETS).map((k) => ({ value: k, label: YANQIN_PRESETS[k].label }));

// 套用预设:default 上盖 overrides
export function applyPreset(presetKey) {
	const p = YANQIN_PRESETS[presetKey] || YANQIN_PRESETS.chibenli;
	return { ...DEFAULT_YANQIN_SETTINGS, ...(p.overrides || {}), school: presetKey };
}

function sameAsPreset(settings, presetKey) {
	const target = applyPreset(presetKey);
	return Object.keys(DEFAULT_YANQIN_SETTINGS).every((k) => k === 'school' || settings[k] === target[k]);
}

// 改单开关:覆盖该项;若偏离当前预设 → school 标 custom
export function setOption(settings, key, value) {
	const next = { ...(settings || DEFAULT_YANQIN_SETTINGS), [key]: value };
	const presetKey = next.school === 'custom' ? null : next.school;
	if (presetKey && !sameAsPreset(next, presetKey)) { next.school = 'custom'; }
	return next;
}

// 我/彼角色解析(供占卜/择日断语用):返回 { me, they } ∈ {'shi'时禽,'fan'翻禽,'dao'倒将主将}
export function resolveWoBi(settings) {
	const w = (settings || DEFAULT_YANQIN_SETTINGS).woBi;
	if (w === 'shi') { return { me: 'shi', they: 'fan', note: '时禽=我/翻禽=彼(主流·凤凰)' }; }
	if (w === 'daoWo') { return { me: 'dao', they: 'fan', note: '到将=我正将/番禽=彼正将(陈炳聿赖公)' }; }
	return { me: 'fan', they: 'dao', note: '翻禽=我/倒将=彼(池本理宗本)' };
}

// 开关元数据(供左栏渲染设置控件)
export const YANQIN_OPTION_META = [
	{ key: 'woBi', label: '我/彼归属', options: [
		{ value: 'fan', label: '翻禽=我(池本理)' }, { value: 'shi', label: '时禽=我(凤凰)' }, { value: 'daoWo', label: '到将=我(陈炳聿)' },
	] },
	{ key: 'xunOffset', label: '时禽旬头位移', options: [
		{ value: true, label: '加位移' }, { value: false, label: '不加(算例口径)' },
	] },
	{ key: 'monthVerse', label: '月禽口诀', options: [
		{ value: 'A', label: 'A版(主流)' }, { value: 'B', label: 'B版(别系)' },
	] },
	{ key: 'huoYaoVariant', label: '活曜传本', options: [
		{ value: 'off', label: '不立活曜' }, { value: 'fanqin', label: '番禽系(土→翼)' }, { value: 'fanqin2', label: '翻禽系(土→箕)' },
	] },
	{ key: 'sansuo', label: '占卜重心', options: [
		{ value: 'both', label: '三传+翻禽并用' }, { value: 'suobo', label: '重三传锁泊(粤)' }, { value: 'fanqin', label: '重翻禽倒将(赣)' },
	] },
];
