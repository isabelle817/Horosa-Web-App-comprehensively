import { Component } from 'react';
import * as AstroConst from '../../constants/AstroConst';
import * as AstroText from '../../constants/AstroText';
import { XQCheckItem, XQCheckList, XQSectionTitle, XQSegmented } from '../xq-ui';

// 界系（bounds/terms）：0 埃及（默认）/1 托勒密 Tetrabiblos/2 莉莉。全局——影响界主、尊贵评分、互容接纳、围攻日木互容。
const TERMS_OPTIONS = [
	{ value: 0, label: '埃及界' },
	{ value: 1, label: '托勒密界' },
	{ value: 2, label: '莉莉界' },
	{ value: 3, label: '迦勒底界' },
];

// G12 月交点真 / 平：平交点(mean，默认，月平根数)/ 真交点(true，含摄动)。改变 → /chart 重算(交点黄经变，全盘宫位/相位随动)。默认 mean 零回归。
const WEST_NODE_OPTIONS = [
	{ value: 'mean', label: '平交点' },
	{ value: 'true', label: '真交点' },
];

// G13 区分判定:几何地平(geo，默认)/ Ptolemy 5°缓冲(ptolemy5，太阳在上升下 5°内拂晓仍判昼)。改变 → sect 翻转连锁重算全盘。默认 geo 零回归。
const SECT_BUFFER_OPTIONS = [
	{ value: 'geo', label: '几何地平' },
	{ value: 'ptolemy5', label: 'Ptolemy 5°' },
];

// 星盘组件分区（成熟分组，取代原单列长表）：每区一个标题 + 勾选列表；短标签两列、长标签单列。
// 3D 盘（已淘汰，改天文馆）与 CHART_INFOINCIRCLE 不列。
function buildSections(C){
	const raw = [
		{ title: '星体与宿', cols: 2, opts: [C.CHART_PLANETS, C.CHART_SU27, C.CHART_SU28_TEXT] },
		{ title: '相位', cols: 2, opts: [C.CHART_ASP_LINES, C.CHART_THREEPLANETASP] },
		{ title: '度数与刻度', cols: 2, opts: [C.CHART_HOUSEDEGREE, C.CHART_TXTPLANET, C.CHART_OUTERDEG, C.CHART_INNERDEG, C.CHART_ANGLELINE] },
		{ title: '显示样式', cols: 2, opts: [C.CHART_PLANETCOLORWITHSIGN, C.CHART_TXTPLANETFORWARD] },
		{ title: '经典尊贵', cols: 2, opts: [C.CHART_TRIP, C.CHART_SIGNRULER, C.CHART_TERM] },
	];
	return raw.map((s)=>({ ...s, opts: s.opts.filter((o)=>o !== undefined && o !== null) }));
}

class ChartDisplaySelector extends Component{

	constructor(props) {
		super(props);
		this.changeChartOption = this.changeChartOption.bind(this);
		this.changeTermsVariant = this.changeTermsVariant.bind(this);
		this.changeWestNodeType = this.changeWestNodeType.bind(this);
		this.changeSectBuffer = this.changeSectBuffer.bind(this);
		this.changeLeoBoundFirst = this.changeLeoBoundFirst.bind(this);
		this.changeLotReversal = this.changeLotReversal.bind(this);
		this.changeVoidClassical = this.changeVoidClassical.bind(this);
		this.changeShowPlanetHouseInfo = this.changeShowPlanetHouseInfo.bind(this);
		this.changeShowAstroMeaning = this.changeShowAstroMeaning.bind(this);
		this.changeOnlyRulerExaltReception = this.changeOnlyRulerExaltReception.bind(this);
	}

	changeChartOption(opt, checked){
		if(!this.props.dispatch){ return; }
		const current = Array.isArray(this.props.value) ? [...this.props.value] : [];
		const idx = current.indexOf(opt);
		if(checked && idx < 0){ current.push(opt); }
		if(!checked && idx >= 0){ current.splice(idx, 1); }
		this.props.dispatch({ type: 'app/save', payload: { chartDisplay: current } });
	}

	// 界系：全局生效——既写 app 状态（UI 记忆），又写 fields.termsVariant 并触发整盘重算
	// （后端 /chart 请求级换 essential.TERMS → 界主/尊贵/互容接纳/围攻日木互容 全按所选界）。默认 0=埃及 零回归。
	changeTermsVariant(e){
		if(!this.props.dispatch){ return; }
		const val = e && e.target ? e.target.value : e;
		this.props.dispatch({ type: 'app/save', payload: { termsVariant: val } });
		const flds = { ...(this.props.fields || {}) };
		flds.termsVariant = { value: val, name: ['termsVariant'] };
		this.props.dispatch({ type: 'astro/save', payload: { fields: flds } });
		// 触发重算（fieldsToParams 透传 termsVariant→/chart）；缺核心字段（未起盘）时 fetchByFields 自身有护栏。
		if(flds.date && flds.time && flds.lat && flds.lon){
			this.props.dispatch({ type: 'astro/fetchByFields', payload: flds });
		}
	}

	// G12 西占月交点真 / 平：写 app（UI 记忆）+ fields.westNodeType 并触发整盘重算
	// （真交点 → /chart 用真交点黄经置换南北交，全盘宫位 / 相位随动）。默认 mean 零回归。
	changeWestNodeType(e){
		if(!this.props.dispatch){ return; }
		const val = e && e.target ? e.target.value : e;
		this.props.dispatch({ type: 'app/save', payload: { westNodeType: val } });
		const flds = { ...(this.props.fields || {}) };
		flds.westNodeType = { value: val, name: ['westNodeType'] };
		this.props.dispatch({ type: 'astro/save', payload: { fields: flds } });
		if(flds.date && flds.time && flds.lat && flds.lon){
			this.props.dispatch({ type: 'astro/fetchByFields', payload: flds });
		}
	}

	// G13 区分判定 5°缓冲:写 app + fields.sectBuffer 并触发整盘重算
	// （sect 翻转 → 得失区分凶星 / 三分昼夜序 / 福点反转 / 寿命法 hyleg 优先 随动）。默认 geo 零回归。
	changeSectBuffer(e){
		if(!this.props.dispatch){ return; }
		const val = e && e.target ? e.target.value : e;
		this.props.dispatch({ type: 'app/save', payload: { sectBuffer: val } });
		const flds = { ...(this.props.fields || {}) };
		flds.sectBuffer = { value: val, name: ['sectBuffer'] };
		this.props.dispatch({ type: 'astro/save', payload: { fields: flds } });
		if(flds.date && flds.time && flds.lat && flds.lon){
			this.props.dispatch({ type: 'astro/fetchByFields', payload: flds });
		}
	}

	// G15 托勒密界·狮子土星优先:写 app + fields.leoBoundFirst 并触发整盘重算(仅托勒密界 termsVariant==1 有效;狮子首界主木→土)。默认 OFF 零回归。
	changeLeoBoundFirst(on){
		if(!this.props.dispatch){ return; }
		const val = on ? 1 : 0;
		this.props.dispatch({ type: 'app/save', payload: { leoBoundFirst: val } });
		const flds = { ...(this.props.fields || {}) };
		flds.leoBoundFirst = { value: val, name: ['leoBoundFirst'] };
		this.props.dispatch({ type: 'astro/save', payload: { fields: flds } });
		if(flds.date && flds.time && flds.lat && flds.lon){
			this.props.dispatch({ type: 'astro/fetchByFields', payload: flds });
		}
	}

	// G20-P2 福点昼夜反转:默认 ON（夜盘福点反转 asc+日-月，标准）;关闭 → 福点恒用昼式 asc+月-日。写 fields.lotReversal + 整盘重算。
	changeLotReversal(on){
		if(!this.props.dispatch){ return; }
		const val = on ? 1 : 0;   // on=反转 ON（默认）/ off=不反转
		this.props.dispatch({ type: 'app/save', payload: { lotReversal: val } });
		const flds = { ...(this.props.fields || {}) };
		flds.lotReversal = { value: val, name: ['lotReversal'] };
		this.props.dispatch({ type: 'astro/save', payload: { fields: flds } });
		if(flds.date && flds.time && flds.lat && flds.lon){
			this.props.dispatch({ type: 'astro/fetchByFields', payload: flds });
		}
	}

	// G10 空亡古典义(30°内):默认 OFF=按本座义;开=固定 30°窗口。只写 app(格局页相位动态读 props.voidClassical 自动重算),
	// 走 /astroextra/analysis 非 /chart,故不动 fields/不重起盘。
	changeVoidClassical(on){
		if(!this.props.dispatch){ return; }
		this.props.dispatch({ type: 'app/save', payload: { voidClassical: on ? 1 : 0 } });
	}

	changeShowPlanetHouseInfo(checked){
		if(!this.props.dispatch){ return; }
		this.props.dispatch({ type: 'app/save', payload: { showPlanetHouseInfo: checked ? 1 : 0 } });
	}

	changeShowAstroMeaning(checked){
		if(!this.props.dispatch){ return; }
		this.props.dispatch({ type: 'app/save', payload: { showAstroMeaning: checked ? 1 : 0 } });
	}

	changeOnlyRulerExaltReception(checked){
		if(!this.props.dispatch){ return; }
		this.props.dispatch({ type: 'app/save', payload: { showOnlyRulExaltReception: checked ? 1 : 0 } });
	}

	render(){
		// 标签一律走正常字体（继承抽屉字族）：这些选项标签全是中文 + 偶含数字/度数（如「30°内」），
		// 绝不能套 ywastro 占星符号字体——否则拉丁数字/度数被映射成 glyph 乱码（曾渲染成 `Ibclxc°`）。
		// 本抽屉无任何需要行星 / 星座符号的纯 glyph 标签，故全部用正常文本。
		const currentDisplay = Array.isArray(this.props.value) ? this.props.value : [];
		const termsVariant = ([1, 2, 3].indexOf(this.props.termsVariant) >= 0) ? this.props.termsVariant : 0;
		const westNodeType = (this.props.fields && this.props.fields.westNodeType && this.props.fields.westNodeType.value === 'true') ? 'true' : 'mean';
		const sectBuffer = (this.props.fields && this.props.fields.sectBuffer && this.props.fields.sectBuffer.value === 'ptolemy5') ? 'ptolemy5' : 'geo';
		const leoBoundFirst = !!(this.props.fields && this.props.fields.leoBoundFirst && (this.props.fields.leoBoundFirst.value === 1 || this.props.fields.leoBoundFirst.value === '1'));
		const lotReversalOn = !(this.props.fields && this.props.fields.lotReversal && (this.props.fields.lotReversal.value === 0 || this.props.fields.lotReversal.value === '0'));
		const voidClassicalOn = (this.props.voidClassical === 1 || this.props.voidClassical === '1' || this.props.voidClassical === true);
		const sections = buildSections(AstroConst);

		const renderOpt = (opt)=>{
			const checked = currentDisplay.includes(opt);
			return (
				<XQCheckItem key={opt} checked={checked} onClick={()=>this.changeChartOption(opt, !checked)}>
					<span className="horosa-selector-label">{AstroText.ChartOptionText[opt + '']}</span>
				</XQCheckItem>
			);
		};
		// boolItem 支持 disabled（置灰 + 拦截点击）与 hint（次级提示，如「仅托勒密界生效」）。
		const boolItem = (key, label, on, handler, opts)=>{
			const { disabled = false, hint = null } = opts || {};
			return (
				<XQCheckItem
					key={key}
					checked={on}
					disabled={disabled}
					onClick={disabled ? undefined : (()=>handler(!on))}
				>
					<span className="horosa-selector-label">
						{label}
						{hint ? <span className="horosa-selector-label-hint">{hint}</span> : null}
					</span>
				</XQCheckItem>
			);
		};

		return (
			<div className="horosa-selector-drawer">
				{sections.map((s)=>(
					<div className="horosa-selector-section" key={s.title}>
						<XQSectionTitle>{s.title}</XQSectionTitle>
						<XQCheckList columns={s.cols}>
							{s.opts.map(renderOpt)}
						</XQCheckList>
						{s.title === '经典尊贵' ? (
							<div className="horosa-terms-row">
								<span className="horosa-terms-label">界系（界主 · 尊贵 · 互容接纳）</span>
								<XQSegmented value={termsVariant} options={TERMS_OPTIONS} onChange={this.changeTermsVariant} />
							</div>
						) : null}
						{s.title === '经典尊贵' && termsVariant === 3 ? (
							<div style={{ fontSize: 11, color: 'var(--horosa-muted, #999)', margin: '2px 0 6px', lineHeight: 1.5 }}>
								迦勒底界系规则推演重建：仅白羊有据，余座按宽度 [8,7,6,5,4] + 元素昼序推得、夜盘土水互换，仅供参研，请审慎采用。
							</div>
						) : null}
						{s.title === '经典尊贵' ? (
							<div className="horosa-terms-row">
								<span className="horosa-terms-label">月交点（真 / 平 · 全盘随动）</span>
								<XQSegmented value={westNodeType} options={WEST_NODE_OPTIONS} onChange={this.changeWestNodeType} />
							</div>
						) : null}
						{s.title === '经典尊贵' ? (
							<div className="horosa-terms-row">
								<span className="horosa-terms-label">区分判定（昼 / 夜 · sect）</span>
								<XQSegmented value={sectBuffer} options={SECT_BUFFER_OPTIONS} onChange={this.changeSectBuffer} />
							</div>
						) : null}
						{s.title === '经典尊贵' ? (
							<XQCheckList columns={1}>
								{boolItem(
									'leobf',
									'托勒密界 · 狮子土星优先',
									leoBoundFirst,
									this.changeLeoBoundFirst,
									termsVariant === 1 ? null : { disabled: true, hint: '仅托勒密界生效' }
								)}
							</XQCheckList>
						) : null}
						{s.title === '经典尊贵' ? (
							<XQCheckList columns={2}>
								{boolItem('lotrev', '福点按昼夜反转（关则恒昼式）', lotReversalOn, this.changeLotReversal)}
								{boolItem('voidcl', '空亡古典义（30°内，关则按本座义）', voidClassicalOn, this.changeVoidClassical)}
							</XQCheckList>
						) : null}
					</div>
				))}
				<div className="horosa-selector-section">
					<XQSectionTitle>解释与计算</XQSectionTitle>
					<XQCheckList columns={1}>
						{boolItem('phi', '星曜附带后天宫信息', this.props.showPlanetHouseInfo === 1 || this.props.showPlanetHouseInfo === true, this.changeShowPlanetHouseInfo)}
						{boolItem('mean', '是否显示星 / 宫 / 座 / 相释义', this.props.showAstroMeaning === 1 || this.props.showAstroMeaning === true, this.changeShowAstroMeaning)}
						{boolItem('rec', '仅按本垣擢升计算互容接纳', this.props.showOnlyRulExaltReception === 1 || this.props.showOnlyRulExaltReception === true, this.changeOnlyRulerExaltReception)}
					</XQCheckList>
				</div>
			</div>
		);
	}
}

export default ChartDisplaySelector;
