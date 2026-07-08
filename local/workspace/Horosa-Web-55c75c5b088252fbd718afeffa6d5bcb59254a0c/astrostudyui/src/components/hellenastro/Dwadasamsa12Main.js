import { Component } from 'react';
import AstroChart13 from './AstroChart13';

// 十二分盘(Dwadasamsa,D12):与十三分盘同一 UI/设置/缓存逻辑(复用 AstroChart13),
// 仅把请求端点指向 /chart12(newlon = lon × 12 mod 360)。用户指定观感与十三分盘完全一致。
class Dwadasamsa12Main extends Component{
	constructor(props) {
		super(props);
		this.state = {
			currentTab: 'Chart12',
			hook: {
				Chart12: {
					fun: null,
				},
			},
		};

		this.changeTab = this.changeTab.bind(this);
		this.onFieldsChange = this.onFieldsChange.bind(this);

		if(this.props.hook){
			this.props.hook.fun = (fields)=>{
				let hook = this.state.hook;
				if(hook[this.state.currentTab].fun){
					let fld = { ...fields };
					hook[this.state.currentTab].fun(fld);
				}
			};
		}
	}

	changeTab(key){
		let hook = this.state.hook;
		this.setState({ currentTab: key }, ()=>{
			if(this.state.hook[key] && this.state.hook[key].fun){
				this.state.hook[key].fun();
			}
			if(this.props.dispatch){
				this.props.dispatch({ type: 'astro/save', payload: { currentSubTab: key } });
			}
		});
	}

	onFieldsChange(values){
		if(this.props.onChange){
			let flds = this.props.onChange(values);
			let hook = this.state.hook[this.state.currentTab];
			if(hook.fun){
				hook.fun(flds);
			}
		}
	}

	componentDidMount(){
		let hook = this.state.hook;
		if(hook[this.state.currentTab].fun){
			hook[this.state.currentTab].fun();
		}
	}

	render(){
		let fields = this.props.fields;
		let height = this.props.height ? this.props.height : 760;
		return (
			<div className="horosa-aux-module-page xq-chart-renderer xq-chart-renderer-hellen">
				<AstroChart13
					endpoint="chart12"
					onChange={this.onFieldsChange}
					fields={fields}
					height={height}
					chartStyle={this.props.chartStyle}
					dispatch={this.props.dispatch}
					chartDisplay={this.props.chartDisplay}
					planetDisplay={this.props.planetDisplay}
					lotsDisplay={this.props.lotsDisplay}
					showPlanetHouseInfo={this.props.showPlanetHouseInfo}
					showAstroMeaning={this.props.showAstroMeaning}
					hook={this.state.hook.Chart12}
				/>
			</div>
		);
	}
}

export default Dwadasamsa12Main;
