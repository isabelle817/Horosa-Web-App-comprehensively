import { Component } from 'react';
import {convertLatToStr, convertLonToStr} from '../astro/AstroHelper';
import { dstAwareZoneAt } from '../../utils/timezone';
import DateTime from '../comp/DateTime';
import SpaceTimePanel from '../comp/SpaceTimePanel';
import * as SZConst from '../suzhan/SZConst';
import * as AstroConst from '../../constants/AstroConst';
import { XQSelect as Select, XQToggle } from '../xq-ui';
import GuoLaoStarSectDoc from './GuoLaoStarSectDoc';
import XQIcon from '../xq-icons';
import { GUOLAO_ALL_ASPECTS, GUOLAO_CHART_STYLE_CLASSIC, GUOLAO_CHART_STYLE_MOIRA, GUOLAO_CHART_STYLE_PICK, GUOLAO_CHART_STYLE_QIZHENG, GUOLAO_LIFE_MODE_ASC, GUOLAO_LIFE_MODE_COTRANS, GUOLAO_LIFE_MODE_YUMAO, GUOLAO_NODE_MODE_NORTH_KETU, GUOLAO_NODE_MODE_NORTH_RAHU, getStoredGuolaoLifeMode, getStoredGuolaoNodeMode, setStoredGuolaoAyanamsa, getStoredGuolaoTrueSolarTime, setStoredGuolaoTrueSolarTime, getStoredGuolaoNodeType, setStoredGuolaoNodeType, getStoredGuolaoLilithType, setStoredGuolaoLilithType, getStoredGuolaoBodyMode, setStoredGuolaoBodyMode, getStoredGuolaoTuibianMethod, setStoredGuolaoTuibianMethod, getStoredGuolaoGufaPrecess, setStoredGuolaoGufaPrecess, getStoredGuolaoEqTropicalAnchor, setStoredGuolaoEqTropicalAnchor, setStoredGuolaoLifeMode, setStoredGuolaoSu28Mode, GUOLAO_SCHOOL_PRESETS, normalizeGuolaoLifeMode, normalizeGuolaoNodeMode, } from './GuoLaoChartStyle';
import { SU28_MODE_GROUPS, TUIBIAN_METHOD_OPTIONS, GUFA_PRECESS_OPTIONS, EQ_TROPICAL_ANCHOR_OPTIONS, TRUE_SOLAR_TIME_OPTIONS, NODE_TYPE_OPTIONS, LILITH_TYPE_OPTIONS, BODY_MODE_OPTIONS, LIFE_MODE_OPTIONS, LIFE_MASTER_MODE_OPTIONS, MINOR_LIMIT_TYPE_OPTIONS, TONGXIAN_BASE_OPTIONS, SCHOOL_PRESET_OPTIONS, LIFE_CUSTOM_ZHI_OPTIONS, BODY_CUSTOM_ZHI_OPTIONS } from './guolaoData';

const {Option, OptGroup} = Select;

class GuoLaoInput extends Component{
	
	constructor(props) {
		super(props);

        this.tmHook = {
            getValue: null,
        }

		this.onTimeChanged = this.onTimeChanged.bind(this);
		this.changeGeo = this.changeGeo.bind(this);
		this.onGenderChange = this.onGenderChange.bind(this);
		this.onDoubingSu28Change = this.onDoubingSu28Change.bind(this);
		this.onChartShapeChange = this.onChartShapeChange.bind(this);
		this.onChartStyleChange = this.onChartStyleChange.bind(this);
		this.onLifeModeChange = this.onLifeModeChange.bind(this);
		this.onNodeModeChange = this.onNodeModeChange.bind(this);
		this.onAyanamsaChange = this.onAyanamsaChange.bind(this);
		this.onTrueSolarTimeChange = this.onTrueSolarTimeChange.bind(this);
		this.onNodeTypeChange = this.onNodeTypeChange.bind(this);
		this.onLilithTypeChange = this.onLilithTypeChange.bind(this);
		this.onBodyModeChange = this.onBodyModeChange.bind(this);
		this.onTuibianMethodChange = this.onTuibianMethodChange.bind(this);
		this.onGufaPrecessChange = this.onGufaPrecessChange.bind(this);
		this.onEqTropicalAnchorChange = this.onEqTropicalAnchorChange.bind(this);
		this.onMoiraTransitTimeChanged = this.onMoiraTransitTimeChanged.bind(this);
		this.onMoiraTransitGodsToggle = this.onMoiraTransitGodsToggle.bind(this);
		this.onEngineModeChange = this.onEngineModeChange.bind(this);
		this.onKinastroOptionChange = this.onKinastroOptionChange.bind(this);
		this.onDisplayToggle = this.onDisplayToggle.bind(this);
		this.toggleAspect = this.toggleAspect.bind(this);
	}

	onGenderChange(val){
		if(this.props.onFieldsChange){
			let dt = this.tmHook.getValue().value;
			this.props.onFieldsChange({
				gender: {
					value: val,
				},
				date: {
					value: dt.clone(),
				},
				time:{
					value: dt.clone(),
				},
				ad:{
					value: dt.ad,
				},
				zone:{
					value: dt.zone,
				},

			});
		}
	}

	onDoubingSu28Change(val){
		if(this.props.onFieldsChange){
			let dt = this.tmHook.getValue().value;
			this.props.onFieldsChange({
				doubingSu28: {
					value: val,
				},
				date: {
					value: dt.clone(),
				},
				time:{
					value: dt.clone(),
				},
				ad:{
					value: dt.ad,
				},
				zone:{
					value: dt.zone,
				},

			});
		}
	}

	onTimeChanged(value){
		if(this.props.onFieldsChange){
			let dt = value.time;

			this.props.onFieldsChange({
				__confirmed: !!value.confirmed,
				date: {
					value: dt.clone(),
				},
				time:{
					value: dt.clone(),
				},
				ad:{
					value: dt.ad,
				},
				zone:{
					value: dt.zone,
				}
			});
		}
	}

	onChartShapeChange(val){
		SZConst.SZChart.shape = val;
		localStorage.setItem('suzhanChartShape', val);
		if(this.props.onFieldsChange){
			let dt = this.tmHook.getValue().value;
			this.props.onFieldsChange({
				szshape: {
					value: val,
				},
				date: {
					value: dt.clone(),
				},
				time:{
					value: dt.clone(),
				},
				ad:{
					value: dt.ad,
				},
				zone:{
					value: dt.zone,
				},

			});
		}
	}

	onChartStyleChange(val){
		if(this.props.onChartStyleChange){
			this.props.onChartStyleChange(val);
		}
	}

	onLifeModeChange(val){
		if(this.props.onFieldsChange){
			let dt = this.tmHook.getValue().value;
			this.props.onFieldsChange({
				guolaoLifeMode: {
					value: normalizeGuolaoLifeMode(val),
				},
				date: {
					value: dt.clone(),
				},
				time:{
					value: dt.clone(),
				},
				ad:{
					value: dt.ad,
				},
				zone:{
					value: dt.zone,
				},

			});
		}
	}

	onNodeModeChange(val){
		if(this.props.onFieldsChange){
			let dt = this.tmHook.getValue().value;
			this.props.onFieldsChange({
				guolaoNodeMode: {
					value: normalizeGuolaoNodeMode(val),
				},
				date: {
					value: dt.clone(),
				},
				time:{
					value: dt.clone(),
				},
				ad:{
					value: dt.ad,
				},
				zone:{
					value: dt.zone,
				},
			});
		}
	}

	onAyanamsaChange(val){
		if(this.props.onFieldsChange){
			let dt = this.tmHook.getValue().value;
			setStoredGuolaoAyanamsa(val);
			this.props.onFieldsChange({
				guolaoAyanamsa: { value: val || '' },
				date: { value: dt.clone() },
				time: { value: dt.clone() },
				ad: { value: dt.ad },
				zone: { value: dt.zone },
			});
		}
	}

	// G6/G10/G11 起盘类参数:变更须重排盘(带 date/time/ad/zone 触发后端重取,同 onAyanamsaChange)。
	onGuolaoParamChange(fieldKey, val, setter){
		if(this.props.onFieldsChange){
			const dt = this.tmHook.getValue().value;
			if(setter){ setter(val); }
			const patch = { date: { value: dt.clone() }, time: { value: dt.clone() }, ad: { value: dt.ad }, zone: { value: dt.zone } };
			patch[fieldKey] = { value: val };
			this.props.onFieldsChange(patch);
		}
	}

	onTrueSolarTimeChange(val){
		this.onGuolaoParamChange('guolaoTrueSolarTime', val, setStoredGuolaoTrueSolarTime);
	}

	onNodeTypeChange(val){
		this.onGuolaoParamChange('guolaoNodeType', val, setStoredGuolaoNodeType);
	}

	onLilithTypeChange(val){
		this.onGuolaoParamChange('guolaoLilithType', val, setStoredGuolaoLilithType);
	}

	onBodyModeChange(val){
		this.onGuolaoParamChange('guolaoBodyMode', val, setStoredGuolaoBodyMode);
	}

	// WP-D 授时历古法(用制 6)子选项:推变法 + 古宿岁差,变更须重排盘(同 onBodyModeChange 起盘类)。
	onTuibianMethodChange(val){
		this.onGuolaoParamChange('guolaoTuibianMethod', val, setStoredGuolaoTuibianMethod);
	}

	onGufaPrecessChange(val){
		this.onGuolaoParamChange('guolaoGufaPrecess', val, setStoredGuolaoGufaPrecess);
	}

	// 额外档 赤道回归制(用制 7)锚点:牛前冬至/春分壁2.3,变更须重排盘。
	onEqTropicalAnchorChange(val){
		this.onGuolaoParamChange('guolaoEqTropicalAnchor', val, setStoredGuolaoEqTropicalAnchor);
	}

	// 类B 显示偏好的下拉(命主取法/行运法):写 guolaoDisplay,纯前端即时联动,不重取后端。
	onGuolaoDisplaySelect(key, val){
		if(this.props.onGuolaoDisplayChange){
			this.props.onGuolaoDisplayChange({[key]: val});
		}
	}

	// G34 流派预设一键:批量套 类A fields(单帧重排)+ 类B display(即时);选后回 custom 可微调。
	onSchoolPresetChange(preset){
		const p = GUOLAO_SCHOOL_PRESETS[preset];
		if(!p || !this.props.onFieldsChange){ return; }
		const f = p.fields || {};
		const setters = {
			guolaoLifeMode: setStoredGuolaoLifeMode, guolaoBodyMode: setStoredGuolaoBodyMode,
			guolaoTrueSolarTime: setStoredGuolaoTrueSolarTime, guolaoNodeType: setStoredGuolaoNodeType,
			doubingSu28: setStoredGuolaoSu28Mode,
		};
		Object.keys(f).forEach((k)=>{ if(setters[k]){ setters[k](f[k]); } });
		const dt = this.tmHook.getValue().value;
		const patch = { date: { value: dt.clone() }, time: { value: dt.clone() }, ad: { value: dt.ad }, zone: { value: dt.zone } };
		Object.keys(f).forEach((k)=>{ patch[k] = { value: f[k] }; });
		this.props.onFieldsChange(patch);
		if(p.display && this.props.onGuolaoDisplayChange){ this.props.onGuolaoDisplayChange(p.display); }
	}

	onMoiraTransitTimeChanged(value){
		if(this.props.onMoiraTransitTimeChange){
			this.props.onMoiraTransitTimeChange(value);
		}
	}

	onMoiraTransitGodsToggle(){
		if(this.props.onMoiraTransitGodsVisibleChange){
			this.props.onMoiraTransitGodsVisibleChange(!this.props.showMoiraTransitGods);
		}
	}

	onEngineModeChange(val){
		if(this.props.onEngineModeChange){
			this.props.onEngineModeChange(val);
		}
	}

	onKinastroOptionChange(key, value){
		if(this.props.onKinastroOptionChange){
			this.props.onKinastroOptionChange(key, value);
		}
	}

	onDisplayToggle(key){
		if(this.props.onGuolaoDisplayChange){
			const cur = this.props.guolaoDisplay || {};
			this.props.onGuolaoDisplayChange({[key]: !cur[key]});
		}
	}

	toggleAspect(asp){
		if(!this.props.onGuolaoDisplayChange){
			return;
		}
		const cur = (this.props.guolaoDisplay && this.props.guolaoDisplay.aspects) || [];
		const next = cur.indexOf(asp) >= 0 ? cur.filter((a)=>a !== asp) : cur.concat([asp]);
		this.props.onGuolaoDisplayChange({aspects: next});
	}

	changeGeo(rec){
		if(this.props.onFieldsChange){
			let dt = this.tmHook.getValue().value;
			// 选新地点时按新坐标自动校正时区(未在 atlas 内手改时区时)。
			// setZone 仅改时区标签、保留出生钟面时刻(见 DateTime.setZone),不移位时间。
			if(dt && dt.setZone){
				try{
					if(rec.zone){
						dt.setZone(rec.zone);
					}else{
						const ds = dt.format ? dt.format('YYYY-MM-DD') : null;
						const z = dstAwareZoneAt(rec.gpsLat, rec.gpsLng, ds);
						if(z && z.offset){ dt.setZone(z.offset); }
					}
				}catch(e){ /* 推断失败保留原时区 */ }
			}
			this.props.onFieldsChange({
				lon: {
					value: convertLonToStr(rec.lng),
				},
				lat: {
					value: convertLatToStr(rec.lat),
				},
				gpsLon: {
					value: rec.gpsLng
				},
				gpsLat: {
					value: rec.gpsLat
				},
				date: {
					value: dt.clone(),
				},
				time:{
					value: dt.clone(),
				},
				ad:{
					value: dt.ad,
				},
				zone:{
					value: dt.zone,
				},

			});
		}
	}

	render(){
		let fields = this.props.fields ? this.props.fields : {};
		let datetm = new DateTime();
		if(fields.date && fields.time){
			let str = fields.date.value.format('YYYY-MM-DD') + ' ' + 
						fields.time.value.format('HH:mm:ss');
			datetm = datetm.parse(str, 'YYYY-MM-DD HH:mm:ss');
			if(fields.zone){
				datetm.setZone(fields.zone.value);
			}
		}

		let szshape = SZConst.SZChart.shape;
		if(fields.szshape !== undefined && fields.szshape !== null &&
			fields.szshape.value !== undefined && fields.szshape.value !== null){
			szshape = fields.szshape.value;
		}
		const engineMode = this.props.engineMode === 'kinastro' ? 'kinastro' : 'horosa';
		const chartStyle = engineMode === 'kinastro'
			? GUOLAO_CHART_STYLE_QIZHENG
			: (this.props.chartStyle === GUOLAO_CHART_STYLE_PICK
				? GUOLAO_CHART_STYLE_PICK
				: (this.props.chartStyle === GUOLAO_CHART_STYLE_MOIRA ? GUOLAO_CHART_STYLE_MOIRA : GUOLAO_CHART_STYLE_CLASSIC));
		const lifeMode = fields.guolaoLifeMode && fields.guolaoLifeMode.value !== undefined && fields.guolaoLifeMode.value !== null
			? normalizeGuolaoLifeMode(fields.guolaoLifeMode.value)
			: getStoredGuolaoLifeMode();
		const nodeMode = fields.guolaoNodeMode && fields.guolaoNodeMode.value !== undefined && fields.guolaoNodeMode.value !== null
			? normalizeGuolaoNodeMode(fields.guolaoNodeMode.value)
			: getStoredGuolaoNodeMode();
		const kinOptions = this.props.kinastroOptions || {};
		const chartDateNative = fields.date && fields.date.value && fields.date.value.format ? fields.date.value.format('YYYY-MM-DD') : '';
		const kinCurrentYear = kinOptions.currentYear || new Date().getFullYear();
		const kinTransitMode = kinOptions.transitMode || 'none';
		const kinTransitDate = kinOptions.transitDate || '';
		const kinTransitTime = kinOptions.transitTime || '';
		const kinElectionalStartDate = kinOptions.electionalStartDate || chartDateNative;
		const kinElectionalCriteria = kinOptions.electionalCriteria || 'general';
		const kinElectionalDays = kinOptions.electionalDays || 30;
		const display = this.props.guolaoDisplay || {};
		const chartStyleField = (
			<label className="horosa-guolao-select-field">
				<span>星盘样式</span>
				<Select value={chartStyle} onChange={this.onChartStyleChange} size='small' dropdownMatchSelectWidth={false}>
					<Option value={GUOLAO_CHART_STYLE_CLASSIC}>Horosa原盘</Option>
					<Option value={GUOLAO_CHART_STYLE_MOIRA}>Moira圆盘</Option>
					<Option value={GUOLAO_CHART_STYLE_PICK}>天星择日</Option>
					<Option value={GUOLAO_CHART_STYLE_QIZHENG}>坚七政</Option>
				</Select>
			</label>
		);

		return (
			<div className="horosa-guolao-input-stack">
				<div className="horosa-side-panel-heading">
					<div>
						<div className="horosa-side-panel-title">七政设置</div>
						<div className="horosa-side-panel-subtitle">时间、地点与排盘选项</div>
					</div>
				</div>

				<SpaceTimePanel
					fields={fields}
					value={datetm}
					onTimeChange={this.onTimeChanged}
					timeHook={this.tmHook}
					onGeoChange={this.changeGeo}
				/>

				<div className="horosa-guolao-input-section">
					<div className="horosa-guolao-field-title">
						<XQIcon name="sliders" />
						<span>选项</span>
					</div>
					{engineMode === 'kinastro' ? (
					<div className="horosa-guolao-select-grid horosa-guolao-kinastro-options">
						<label className="horosa-guolao-select-field">
							<span>性别</span>
							<Select value={fields.gender.value} onChange={this.onGenderChange} size='small' dropdownMatchSelectWidth={false}>
								<Option value={0}>女</Option>
								<Option value={1}>男</Option>
							</Select>
						</label>
						<label className="horosa-guolao-select-field">
							<span>流时</span>
							<Select value={kinTransitMode} onChange={(val)=>this.onKinastroOptionChange('transitMode', val)} size='small' dropdownMatchSelectWidth={false}>
								<Option value="none">关闭</Option>
								<Option value="same">同刻</Option>
								<Option value="now">此刻</Option>
								<Option value="custom">自定</Option>
							</Select>
						</label>
						{kinTransitMode === 'custom' ? (
						<>
							<label className="horosa-guolao-select-field">
								<span>流时日期</span>
								<input
									className="horosa-guolao-mini-input"
									type="date"
									value={kinTransitDate}
									onChange={(event)=>this.onKinastroOptionChange('transitDate', event.currentTarget.value)}
									onInput={(event)=>this.onKinastroOptionChange('transitDate', event.currentTarget.value)}
								/>
							</label>
							<label className="horosa-guolao-select-field">
								<span>流时时间</span>
								<input
									className="horosa-guolao-mini-input"
									type="time"
									value={kinTransitTime}
									onChange={(event)=>this.onKinastroOptionChange('transitTime', event.currentTarget.value)}
									onInput={(event)=>this.onKinastroOptionChange('transitTime', event.currentTarget.value)}
								/>
							</label>
						</>
						) : null}
						<label className="horosa-guolao-select-field">
							<span>推运年份</span>
							<input
								className="horosa-guolao-mini-input"
								type="number"
								min="1"
								max="9999"
								value={kinCurrentYear}
								onChange={(event)=>this.onKinastroOptionChange('currentYear', event.currentTarget.value)}
							/>
						</label>
						<label className="horosa-guolao-select-field">
							<span>择日起日</span>
							<input
								className="horosa-guolao-mini-input"
								type="date"
								value={kinElectionalStartDate}
								onChange={(event)=>this.onKinastroOptionChange('electionalStartDate', event.currentTarget.value)}
								onInput={(event)=>this.onKinastroOptionChange('electionalStartDate', event.currentTarget.value)}
							/>
						</label>
						<label className="horosa-guolao-select-field">
							<span>择日用途</span>
							<Select value={kinElectionalCriteria} onChange={(val)=>this.onKinastroOptionChange('electionalCriteria', val)} size='small' dropdownMatchSelectWidth={false}>
								<Option value="general">通用</Option>
								<Option value="marriage">嫁娶</Option>
								<Option value="travel">出行</Option>
								<Option value="business">开市</Option>
								<Option value="moving">搬迁</Option>
							</Select>
						</label>
						<label className="horosa-guolao-select-field">
							<span>择日天数</span>
							<input
								className="horosa-guolao-mini-input"
								type="number"
								min="1"
								max="60"
								value={kinElectionalDays}
								onChange={(event)=>this.onKinastroOptionChange('electionalDays', event.currentTarget.value)}
							/>
						</label>
						<label className="horosa-guolao-select-field">
							<span>古籍断语</span>
							<Select value={kinOptions.showZhangguo === false ? 'off' : 'on'} onChange={(val)=>this.onKinastroOptionChange('showZhangguo', val === 'on')} size='small' dropdownMatchSelectWidth={false}>
								<Option value="on">显示</Option>
								<Option value="off">隐藏</Option>
							</Select>
						</label>
						<label className="horosa-guolao-select-field">
							<span>神煞</span>
							<Select value={kinOptions.showShensha === false ? 'off' : 'on'} onChange={(val)=>this.onKinastroOptionChange('showShensha', val === 'on')} size='small' dropdownMatchSelectWidth={false}>
								<Option value="on">显示</Option>
								<Option value="off">隐藏</Option>
							</Select>
						</label>
						<label className="horosa-guolao-select-field">
							<span>命宫解读</span>
							<Select value={kinOptions.showMingGong === false ? 'off' : 'on'} onChange={(val)=>this.onKinastroOptionChange('showMingGong', val === 'on')} size='small' dropdownMatchSelectWidth={false}>
								<Option value="on">显示</Option>
								<Option value="off">隐藏</Option>
							</Select>
						</label>
						{chartStyleField}
					</div>
					) : (
					<div className="horosa-guolao-select-grid">
						<label className="horosa-guolao-select-field">
							<span>性别</span>
							<Select value={fields.gender.value} onChange={this.onGenderChange} size='small' dropdownMatchSelectWidth={false}>
								<Option value={-1}>未知</Option>
								<Option value={0}>女</Option>
								<Option value={1}>男</Option>
							</Select>
						</label>
						<label className="horosa-guolao-select-field">
							<span>宿度制</span>
							<Select value={fields.doubingSu28.value} onChange={this.onDoubingSu28Change} size='small' dropdownMatchSelectWidth={false}>
								{SU28_MODE_GROUPS.map((g)=>(
									<OptGroup key={g.header} label={g.header}>
										{g.options.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
									</OptGroup>
								))}
							</Select>
						</label>
						<label className="horosa-guolao-select-field">
							<span>命度</span>
							<Select value={lifeMode} onChange={this.onLifeModeChange} size='small' dropdownMatchSelectWidth={false}>
								{LIFE_MODE_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
								{LIFE_CUSTOM_ZHI_OPTIONS.map((o)=>(<Option key={`lc-${o.value}`} value={o.value}>{o.label}</Option>))}
							</Select>
						</label>
						{chartStyle === GUOLAO_CHART_STYLE_CLASSIC ? (
							<label className="horosa-guolao-select-field">
								<span>盘式</span>
								<Select value={szshape} onChange={this.onChartShapeChange} size='small' dropdownMatchSelectWidth={false}>
									<Option value={SZConst.SZChart_Circle}>圆形盘</Option>
									<Option value={SZConst.SZChart_Square}>方形盘</Option>
								</Select>
							</label>
						) : null}
						<label className="horosa-guolao-select-field">
							<span>罗计</span>
							<Select value={nodeMode} onChange={this.onNodeModeChange} size='small' dropdownMatchSelectWidth={false}>
								<Option value={GUOLAO_NODE_MODE_NORTH_RAHU}>北罗南计</Option>
								<Option value={GUOLAO_NODE_MODE_NORTH_KETU}>北计南罗</Option>
							</Select>
						</label>
						{Number(fields.doubingSu28.value) === 4 ? (
							<label className="horosa-guolao-select-field">
								<span>恒星岁差</span>
								<Select value={(fields.guolaoAyanamsa && fields.guolaoAyanamsa.value) || ''} onChange={this.onAyanamsaChange} size='small' dropdownMatchSelectWidth={false}>
									<Option value="">郑式(默认)</Option>
									{(AstroConst.INDIA_AYANAMSA_OPTIONS || []).map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
								</Select>
							</label>
						) : null}
						{Number(fields.doubingSu28.value) === 6 ? (
							<label className="horosa-guolao-select-field">
								<span>推变法</span>
								<Select value={(fields.guolaoTuibianMethod && fields.guolaoTuibianMethod.value) || getStoredGuolaoTuibianMethod()} onChange={this.onTuibianMethodChange} size='small' dropdownMatchSelectWidth={false}>
									{TUIBIAN_METHOD_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
								</Select>
							</label>
						) : null}
						{Number(fields.doubingSu28.value) === 6 ? (
							<label className="horosa-guolao-select-field">
								<span>古宿岁差</span>
								<Select value={Number((fields.guolaoGufaPrecess && fields.guolaoGufaPrecess.value) || getStoredGuolaoGufaPrecess())} onChange={this.onGufaPrecessChange} size='small' dropdownMatchSelectWidth={false}>
									{GUFA_PRECESS_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
								</Select>
							</label>
						) : null}
						{Number(fields.doubingSu28.value) === 7 ? (
							<label className="horosa-guolao-select-field">
								<span>回归锚点</span>
								<Select value={(fields.guolaoEqTropicalAnchor && fields.guolaoEqTropicalAnchor.value) || getStoredGuolaoEqTropicalAnchor()} onChange={this.onEqTropicalAnchorChange} size='small' dropdownMatchSelectWidth={false}>
									{EQ_TROPICAL_ANCHOR_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
								</Select>
							</label>
						) : null}
						<label className="horosa-guolao-select-field">
							<span>报时星</span>
							<Select value={(fields.guolaoTrueSolarTime && fields.guolaoTrueSolarTime.value) || getStoredGuolaoTrueSolarTime()} onChange={this.onTrueSolarTimeChange} size='small' dropdownMatchSelectWidth={false}>
								{TRUE_SOLAR_TIME_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
							</Select>
						</label>
						<label className="horosa-guolao-select-field">
							<span>罗计取法</span>
							<Select value={(fields.guolaoNodeType && fields.guolaoNodeType.value) || getStoredGuolaoNodeType()} onChange={this.onNodeTypeChange} size='small' dropdownMatchSelectWidth={false}>
								{NODE_TYPE_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
							</Select>
						</label>
						<label className="horosa-guolao-select-field">
							<span>月孛取法</span>
							<Select value={(fields.guolaoLilithType && fields.guolaoLilithType.value) || getStoredGuolaoLilithType()} onChange={this.onLilithTypeChange} size='small' dropdownMatchSelectWidth={false}>
								{LILITH_TYPE_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
							</Select>
						</label>
						<label className="horosa-guolao-select-field">
							<span>身宫法</span>
							<Select value={(fields.guolaoBodyMode && fields.guolaoBodyMode.value) || getStoredGuolaoBodyMode()} onChange={this.onBodyModeChange} size='small' dropdownMatchSelectWidth={false}>
								{BODY_MODE_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
								{BODY_CUSTOM_ZHI_OPTIONS.map((o)=>(<Option key={`bc-${o.value}`} value={o.value}>{o.label}</Option>))}
							</Select>
						</label>
						<label className="horosa-guolao-select-field">
							<span>命主取法</span>
							<Select value={display.lifeMasterMode || 'gong'} onChange={(v)=>this.onGuolaoDisplaySelect('lifeMasterMode', v)} size='small' dropdownMatchSelectWidth={false}>
								{LIFE_MASTER_MODE_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
							</Select>
						</label>
						<label className="horosa-guolao-select-field">
							<span>行运法</span>
							<Select value={display.minorLimitType || ''} onChange={(v)=>this.onGuolaoDisplaySelect('minorLimitType', v)} size='small' dropdownMatchSelectWidth={false}>
								<Option value="">古度限度法(默认)</Option>
								{MINOR_LIMIT_TYPE_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
							</Select>
						</label>
						{display.minorLimitType === 'tong' ? (
							<label className="horosa-guolao-select-field">
								<span>童限基数</span>
								<Select value={display.tongxianBase || 'tong10'} onChange={(v)=>this.onGuolaoDisplaySelect('tongxianBase', v)} size='small' dropdownMatchSelectWidth={false}>
									{TONGXIAN_BASE_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
								</Select>
							</label>
						) : null}
						<label className="horosa-guolao-select-field">
							<span>流派预设</span>
							<Select value="custom" onChange={(v)=>{ if(v !== 'custom'){ this.onSchoolPresetChange(v); } }} size='small' dropdownMatchSelectWidth={false}>
								{SCHOOL_PRESET_OPTIONS.map((o)=>(<Option key={o.value} value={o.value}>{o.label}</Option>))}
							</Select>
						</label>
						{chartStyleField}
					</div>
					)}
				</div>

				{engineMode !== 'kinastro' && (chartStyle === GUOLAO_CHART_STYLE_MOIRA || chartStyle === GUOLAO_CHART_STYLE_PICK) ? (
					<div className="horosa-guolao-input-section horosa-guolao-moira-transit-section">
						<div className="horosa-guolao-field-title">
							<XQIcon name="clock" />
							<span>{chartStyle === GUOLAO_CHART_STYLE_PICK ? '天星择日动盘' : 'Moira流年'}</span>
						</div>
						<SpaceTimePanel
							className="horosa-guolao-moira-transit-time"
							value={this.props.moiraTransitTime}
							timeText={this.props.moiraTransitTime ? this.props.moiraTransitTime.format('YYYY-MM-DD HH:mm:ss') : ''}
							onTimeChange={this.onMoiraTransitTimeChanged}
							showLocation={false}
							needZone={false}
						/>
						{chartStyle === GUOLAO_CHART_STYLE_MOIRA ? <div className="horosa-guolao-toggle-grid">
							<XQToggle
								size="small"
								iconName="sideSwitch"
								active={this.props.showMoiraTransitGods !== false}
								onClick={this.onMoiraTransitGodsToggle}
							>
								流年神煞圈
							</XQToggle>
						</div> : null}
					</div>
				) : null}
				{engineMode !== 'kinastro' && (chartStyle === GUOLAO_CHART_STYLE_MOIRA || chartStyle === GUOLAO_CHART_STYLE_PICK) ? (
					<div className="horosa-guolao-input-section">
						<div className="horosa-guolao-field-title">
							<XQIcon name="sliders" />
							<span>显示</span>
						</div>
						<div style={{display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8}}>
							{GUOLAO_ALL_ASPECTS.map((asp)=>{
								const on = (display.aspects || []).indexOf(asp) >= 0;
								return (
									<button
										type="button"
										key={asp}
										onClick={()=>this.toggleAspect(asp)}
										style={{
											padding: '2px 9px',
											borderRadius: 999,
											cursor: 'pointer',
											fontSize: 12,
											lineHeight: '18px',
											border: on ? '1px solid var(--horosa-astro-gold, #e7bd75)' : '1px solid var(--horosa-border-soft, rgba(231,189,117,0.2))',
											background: on ? 'var(--horosa-astro-gold, #e7bd75)' : 'transparent',
											color: on ? '#1a1712' : 'var(--horosa-text-soft, #c8c0b2)',
										}}
									>{asp}</button>
								);
							})}
						</div>
						<div className="horosa-guolao-toggle-grid">
							<XQToggle size="small" iconName="sideSwitch" active={display.dignity !== false} onClick={()=>this.onDisplayToggle('dignity')}>庙旺标注</XQToggle>
							<XQToggle size="small" iconName="sideSwitch" active={display.birthGods !== false} onClick={()=>this.onDisplayToggle('birthGods')}>本命神煞圈</XQToggle>
							<XQToggle size="small" iconName="sideSwitch" active={display.ageRing !== false} onClick={()=>this.onDisplayToggle('ageRing')}>限度年龄环</XQToggle>
						</div>
						{this.props.onOpenPatternDialog ? (
							<button
								type="button"
								onClick={this.props.onOpenPatternDialog}
								style={{
									marginTop: 8,
									width: '100%',
									padding: '5px 10px',
									borderRadius: 6,
									cursor: 'pointer',
									fontSize: 12,
									border: '1px solid var(--horosa-border-soft, rgba(231,189,117,0.2))',
									background: 'transparent',
									color: 'var(--horosa-text-soft, #c8c0b2)',
								}}
							>政余格局 · 显示档位设置…</button>
						) : null}
						<GuoLaoStarSectDoc />
					</div>
				) : null}
			</div>
		);
	}

}

export default GuoLaoInput;
