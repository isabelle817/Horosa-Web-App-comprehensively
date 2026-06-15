import * as d3 from 'd3';
import { Component } from 'react';
import {randomStr} from '../../utils/helper';
import * as AstroConst from '../../constants/AstroConst';
import * as Constants from '../../utils/constants';
import { chartDrawGuardEnabled } from '../../utils/perfFlags';
import AstroChartCircle from './AstroChartCircle';

class AstroChart extends Component{

	constructor(props) {
		super(props);
		let svgid = this.props.id ? 'svg' + this.props.id : 'svg' + randomStr(8);

		this.state = {
			chartid: svgid,
			rStep: 30,
			ox: 0,
			oy: 0,
			radius: 0,
			tooltipId: 'div' + randomStr(8),
			tips: null,
		}

		this.chartCircle = null;
		this.redrawTimer = null;

		this.drawChart = this.drawChart.bind(this);
		this.handleResize = this.handleResize.bind(this);
		this.onTipClick = this.onTipClick.bind(this);
		this.scheduleDrawRetry = this.scheduleDrawRetry.bind(this);
		this.getShowAstroMeaning = this.getShowAstroMeaning.bind(this);
	}

	onTipClick(tipobj){
		this.setState({
			tips: tipobj,
		});
	}

	handleResize(){
		let svgdom = document.getElementById(this.state.chartid);
		if(svgdom === undefined || svgdom === null){
			return;
		}
		let w = svgdom.clientWidth;
		let h = svgdom.clientHeight;
		if(h < 560 || w < 560){
			return;
		}
	
		let orgx = w / 2;
		let orgy = h / 2;
		let delta = 30;
		let chartR = Math.min(w, h) / 2 - delta;
		this.setState({
			ox: orgx,
			oy: orgy,
			radius: chartR,
		});
	}

	// 重绘签名守卫(流畅度):本组件 componentDidUpdate 无条件 drawChart+scheduleDrawRetry,
	// 任何无关 state/props 变化(开关 drawer、tooltip 点击、120ms retry)都触发整树 d3 重建。
	// 签名 = 绘制实际消费的全部输入(数据引用 + 显示设置 + 容器尺寸):全等 → skip。
	// 不用 chartObj.chartId(每次 fetch 都换新值,同数据不同 id),用引用相等(dva state 不变更新引用稳定)。
	buildDrawSignature(chartobj){
		const svgdom = document.getElementById(this.state.chartid);
		return {
			value: chartobj,
			chartDisplay: this.props.chartDisplay,
			planetDisplay: this.props.planetDisplay,
			lotsDisplay: this.props.lotsDisplay,
			keyPlanets: this.props.keyPlanets,
			chartStyle: this.props.chartStyle,
			meaning: this.getShowAstroMeaning(),
			rStep: this.state.rStep,
			w: svgdom ? svgdom.clientWidth : 0,
			h: svgdom ? svgdom.clientHeight : 0,
		};
	}

	sameDrawSignature(a, b){
		if(!a || !b){
			return false;
		}
		return a.value === b.value
			&& a.chartDisplay === b.chartDisplay
			&& a.planetDisplay === b.planetDisplay
			&& a.lotsDisplay === b.lotsDisplay
			&& a.keyPlanets === b.keyPlanets
			&& a.chartStyle === b.chartStyle
			&& a.meaning === b.meaning
			&& a.rStep === b.rStep
			&& a.w === b.w
			&& a.h === b.h;
	}

	drawChart(){
		let chartobj = this.props.value;
		if(chartobj === undefined || chartobj === null ||
			chartobj.chart === undefined || chartobj.chart === null || chartobj.err){
			return;
		}

		const guardOn = chartDrawGuardEnabled();
		const sig = guardOn ? this.buildDrawSignature(chartobj) : null;
		if(guardOn && this.sameDrawSignature(sig, this._lastDrawnSig)){
			return; // 输入未变,跳过全量 d3 重建(零尺寸时签名从不被记录,retry 轮询不受影响)
		}

		let disp = [];
		if(this.props.chartDisplay !== undefined && this.props.chartDisplay !== null){
			disp = this.props.chartDisplay;
		}
		let planetDisp = new Set();
		if(this.props.planetDisplay !== undefined && this.props.planetDisplay !== null){
			for(let i=0; i<this.props.planetDisplay.length; i++){
				let id = this.props.planetDisplay[i];
				planetDisp.add(id);
			}
		}
		if(this.props.lotsDisplay !== undefined && this.props.lotsDisplay !== null){
			for(let i=0; i<this.props.lotsDisplay.length; i++){
				let id = this.props.lotsDisplay[i];
				planetDisp.add(id);
			}
		}

		let keyplanets = null;
		if(this.props.keyPlanets){
			keyplanets = this.props.keyPlanets;
		}

		let drawOk = false;
		if(this.chartCircle){
			this.chartCircle.setShowAstroMeaning(this.getShowAstroMeaning());
			try{
				this.chartCircle.drawChart(this.state.chartid, chartobj, this.state.rStep, disp, planetDisp, keyplanets, this.props.chartStyle);
				drawOk = true;
			}catch(err){
				console.error('AstroChart draw failed', err);
			}
		}

		let svgdom = document.getElementById(this.state.chartid);
		if(svgdom && (svgdom.clientWidth === 0 || svgdom.clientHeight === 0)){
			this.scheduleDrawRetry();
		}else if(sig && drawOk){
			// 仅「非零尺寸成功绘制」后记录签名:隐藏期 retry 轮询、tab 变可见首画、resize 重画
			// 三条现状机制全部保留(零尺寸/绘制失败时签名不记录,下次必重画)。
			this._lastDrawnSig = sig;
		}
	}

	getShowAstroMeaning(){
		if(this.props.showAstroMeaning !== undefined && this.props.showAstroMeaning !== null){
			return this.props.showAstroMeaning === 1 || this.props.showAstroMeaning === true;
		}
		try{
			const json = localStorage.getItem(Constants.GlobalSetupKey);
			if(!json){
				return false;
			}
			const cfg = JSON.parse(json);
			return cfg && (cfg.showAstroMeaning === 1 || cfg.showAstroMeaning === true);
		}catch(e){
			return false;
		}
	}

	scheduleDrawRetry(){
		if(this.redrawTimer){
			clearTimeout(this.redrawTimer);
		}
		this.redrawTimer = setTimeout(()=>{
			this.drawChart();
		}, 120);
	}

	componentDidMount(){
		window.addEventListener('resize', this.handleResize)
		d3.select('body').append('div').attr('id', this.state.tooltipId);

		let option = {
			divTooltip: d3.select('#' + this.state.tooltipId),
			onTipClick: this.onTipClick,
		};
		this.chartCircle = new AstroChartCircle(option);
		this.chartCircle.setShowAstroMeaning(this.getShowAstroMeaning());

		this.drawChart();
		this.scheduleDrawRetry();
	}

	componentDidUpdate(){
		this.drawChart();
		this.scheduleDrawRetry();
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.handleResize)
		if(this.redrawTimer){
			clearTimeout(this.redrawTimer);
			this.redrawTimer = null;
		}
		d3.select('#' + this.state.tooltipId).remove();
	}

	render(){
		let chartstyle = {
			width: this.props.width ? this.props.width : '100%',
			height: this.props.height ? this.props.height : '100%',
			backgroundColor: AstroConst.AstroColor.ChartBackgroud,
		};

		if(this.props.style){
			chartstyle = this.props.style;
		}

		return (
			<svg id={this.state.chartid} style={chartstyle}>
			</svg>
		)
	}
}

export default AstroChart;
