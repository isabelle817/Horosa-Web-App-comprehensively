import { Component } from 'react';
import { Checkbox, Collapse } from 'antd';
import {convertLatToStr, convertLonToStr} from '../astro/AstroHelper';
import { dstAwareZoneAt } from '../../utils/timezone';
import * as ZWCont from '../../constants/ZWConst';
import * as ZiWeiHelper from './ZiWeiHelper';
import ZWSihuaCustomModal from './ZWSihuaCustomModal';
import DateTime from '../comp/DateTime';
import SpaceTimePanel from '../comp/SpaceTimePanel';
import { XQSelect as Select } from '../xq-ui';
import XQIcon from '../xq-icons';

const {Option} = Select;

class ZiWeiInput extends Component{
	
	constructor(props) {
		super(props);

		let showTips = true;
		let tips = localStorage.getItem('ziweiTips');
		if(tips !== undefined && tips !== null){
			if(tips+'' === '1'){
				showTips = true;
			}else{
				showTips = false;
			}
		}

		let showOthers = true;
		let so = localStorage.getItem('ziweiShowOthers');
		if(so !== null){ showOthers = (so + '' === '1'); }
		let showSmall = false;
		let ss = localStorage.getItem('ziweiShowSmall');
		if(ss !== null){ showSmall = (ss + '' === '1'); }

		// P1-A 四化流派：默认 beipai（=现状）；立即同步全局单例 + 兼容垫片 + 失效四化缓存。
		let sihuaSchool = localStorage.getItem('ziweiSihuaSchool') || 'beipai';
		ZWCont.ZWSchool.school = sihuaSchool;
		ZWCont.refreshActiveSiHua();
		ZiWeiHelper.resetHuaMap();
		// P1-B 小限顺逆：'0'=男顺女逆(现状) / '1'=阳男阴女顺(中州)
		let xiaoxianMode = localStorage.getItem('ziweiXiaoxianYinyang') || '0';

		this.state = {
			showTips: showTips,
			showOthers: showOthers,
			showSmall: showSmall,
			sihuaSchool: sihuaSchool,
			xiaoxianMode: xiaoxianMode,
			sihuaCustomOpen: false,
		}

        this.tmHook = {
            getValue: null,
        }

		this.onTimeChanged = this.onTimeChanged.bind(this);
		this.changeGeo = this.changeGeo.bind(this);

		this.onGenderChange = this.onGenderChange.bind(this);
		this.onTimeAlgChange = this.onTimeAlgChange.bind(this);
		this.onChartTypeChange = this.onChartTypeChange.bind(this);
		this.onTipsChange = this.onTipsChange.bind(this);
		this.onShowOthersChange = this.onShowOthersChange.bind(this);
		this.onShowSmallChange = this.onShowSmallChange.bind(this);
		this.redrawChart = this.redrawChart.bind(this);
		this.onSihuaSchoolChange = this.onSihuaSchoolChange.bind(this);
		this.onXiaoxianModeChange = this.onXiaoxianModeChange.bind(this);
		this.onSihuaCustomOk = this.onSihuaCustomOk.bind(this);
		this.onSihuaCustomCancel = this.onSihuaCustomCancel.bind(this);

		let type = localStorage.getItem('ziweiChartType');
		if(type !== undefined && type !== null){
			ZWCont.ZWChart.chart = parseInt(type+'');
		}

	}

	onChartTypeChange(val){
		ZWCont.ZWChart.chart = val;
		localStorage.setItem('ziweiChartType', val);
		if(this.props.onFieldsChange){
			let dt = this.tmHook.getValue().value;
			this.props.onFieldsChange({
				zwchart: {
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
	
	onTimeAlgChange(val){
		if(this.props.onFieldsChange){
			let dt = this.tmHook.getValue().value;
			this.props.onFieldsChange({
				timeAlg: {
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



	onTipsChange(e){
		let val = e.target.checked;
		localStorage.setItem('ziweiTips', val ? 1 : 0);
		this.setState({
			showTips: val,
		});
	}

	// P0-4：杂曜/十二神显示开关 — 写 localStorage 后触发盘面重绘（后端缓存命中，仅刷新渲染）。
	redrawChart(){
		if(this.props.onFieldsChange && this.tmHook && this.tmHook.getValue){
			let dt = this.tmHook.getValue().value;
			this.props.onFieldsChange({
				date: { value: dt.clone() },
				time: { value: dt.clone() },
				ad: { value: dt.ad },
				zone: { value: dt.zone },
			});
		}
	}

	onShowOthersChange(e){
		let val = e.target.checked;
		localStorage.setItem('ziweiShowOthers', val ? 1 : 0);
		this.setState({ showOthers: val });
		this.redrawChart();
	}

	onShowSmallChange(e){
		let val = e.target.checked;
		localStorage.setItem('ziweiShowSmall', val ? 1 : 0);
		this.setState({ showSmall: val });
		this.redrawChart();
	}

	// P1-A 四化流派切换：写全局单例 + localStorage + 刷新兼容垫片 + 失效四化缓存 + 重绘。
	applySihuaSchool(val){
		ZWCont.ZWSchool.school = val;
		localStorage.setItem('ziweiSihuaSchool', val);
		ZWCont.refreshActiveSiHua();
		ZiWeiHelper.resetHuaMap();
	}

	onSihuaSchoolChange(val){
		if(val === 'custom'){
			// 切到自定义：先标记 + 打开编辑器（保存后才真正生效；未存过则编辑器以当前表预填）。
			this.applySihuaSchool('custom');
			this.setState({ sihuaSchool: 'custom', sihuaCustomOpen: true });
			this.redrawChart();
			return;
		}
		this.applySihuaSchool(val);
		this.setState({ sihuaSchool: val });
		this.redrawChart();
	}

	onSihuaCustomOk(table){
		localStorage.setItem('ziweiSihuaCustom', JSON.stringify(table));
		this.applySihuaSchool('custom');
		this.setState({ sihuaSchool: 'custom', sihuaCustomOpen: false });
		this.redrawChart();
	}

	onSihuaCustomCancel(){
		// 取消时若无有效自定义表，回退到 beipai（避免停在空自定义态）。
		const has = !!localStorage.getItem('ziweiSihuaCustom');
		if(!has){
			this.applySihuaSchool('beipai');
			this.setState({ sihuaSchool: 'beipai', sihuaCustomOpen: false });
			this.redrawChart();
			return;
		}
		this.setState({ sihuaCustomOpen: false });
	}

	onXiaoxianModeChange(val){
		localStorage.setItem('ziweiXiaoxianYinyang', val);
		this.setState({ xiaoxianMode: val });
		this.redrawChart();
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
						fields.time.value.format('HH:mm');
			datetm = datetm.parse(str, 'YYYY-MM-DD HH:mm');
			if(fields.zone){
				datetm.setZone(fields.zone.value);
			}
		}

		let zwchart = ZWCont.ZWChart.chart;
		if(fields.zwchart !== undefined && fields.zwchart !== null &&
			fields.zwchart.value !== undefined && fields.zwchart.value !== null){
			zwchart = fields.zwchart.value;
		}
		let timeAlg = fields.timeAlg && fields.timeAlg.value !== undefined && fields.timeAlg.value !== null
			? fields.timeAlg.value
			: 0;

		return (
			<div className="horosa-ziwei-input-stack">
				<div className="horosa-side-panel-heading">
					<div>
						<div className="horosa-side-panel-title">紫微设置</div>
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

				<div className="horosa-ziwei-input-section">
					<div className="horosa-ziwei-field-title">
						<XQIcon name="sliders" />
						<span>选项</span>
					</div>
					<div className="horosa-ziwei-select-grid">
						<label className="horosa-ziwei-select-field">
							<span>性别</span>
							<Select value={fields.gender.value} onChange={this.onGenderChange} size='small'>
								<Option value={-1}>未知</Option>
								<Option value={0}>女</Option>
								<Option value={1}>男</Option>
							</Select>
						</label>
						<label className="horosa-ziwei-select-field">
							<span>时间算法</span>
							<Select value={timeAlg} onChange={this.onTimeAlgChange} size='small'>
								<Option value={0}>真太阳时</Option>
								<Option value={1}>直接时间</Option>
							</Select>
						</label>
						<label className="horosa-ziwei-select-field horosa-ziwei-select-field-wide">
							<span>盘式</span>
							<Select value={zwchart} onChange={this.onChartTypeChange} size='small'>
								<Option value={ZWCont.ZWChart_SiHua}>四化盘</Option>
								<Option value={ZWCont.ZWChart_SangHe}>三合盘</Option>
							</Select>
						</label>
						<label className="horosa-ziwei-select-field horosa-ziwei-select-field-wide">
							<span>四化流派</span>
							<Select value={this.state.sihuaSchool} onChange={this.onSihuaSchoolChange} size='small'>
								<Option value="beipai">北派·飞星(现状)</Option>
								<Option value="zhongzhou">中州派</Option>
								<Option value="custom">自定义…</Option>
							</Select>
						</label>
					</div>
					<div className="horosa-ziwei-option-card">
						<Checkbox checked={this.state.showTips} onChange={this.onTipsChange}>允许提示</Checkbox>
						<Checkbox checked={this.state.showOthers} onChange={this.onShowOthersChange}>显示杂曜</Checkbox>
						<Checkbox checked={this.state.showSmall} onChange={this.onShowSmallChange}>显示十二神</Checkbox>
					</div>
					<Collapse ghost size="small" className="horosa-ziwei-school-collapse">
						<Collapse.Panel header="流派设置" key="school">
							<label className="horosa-ziwei-select-field">
								<span>小限顺逆</span>
								<Select value={this.state.xiaoxianMode} onChange={this.onXiaoxianModeChange} size='small'>
									<Option value="0">男顺女逆（现状）</Option>
									<Option value="1">阳男阴女顺（中州）</Option>
								</Select>
							</label>
							{this.state.sihuaSchool === 'custom' && (
								<button type="button" className="horosa-ziwei-school-edit-btn" onClick={()=>this.setState({ sihuaCustomOpen: true })}>编辑自定义四化表…</button>
							)}
						</Collapse.Panel>
					</Collapse>
					<ZWSihuaCustomModal
						open={this.state.sihuaCustomOpen}
						table={ZWCont.getActiveSiHuaGan()}
						onOk={this.onSihuaCustomOk}
						onCancel={this.onSihuaCustomCancel}
					/>
				</div>
			</div>
		);
	}

}

export default ZiWeiInput;
