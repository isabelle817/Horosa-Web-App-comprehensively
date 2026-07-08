import * as AstroConst from '../constants/AstroConst';

// 图面重绘签名守卫(复用 AstroChart 的成熟方案,见 AstroChart.buildDrawSignature)。
// 背景:GuoLao/SuZhan/GuaZhan 等盘在 componentDidUpdate / render 里无条件重建整棵 d3 树,
// 任何无关 state/props 变化(开关 drawer、tooltip 点击、sibling setState、120ms retry)都触发整树重画 →「越用越卡」。
// 签名 = 绘制实际消费的全部输入(数据/显示设置的引用,dva state 不变则引用稳定)+ 主题指纹 + 容器尺寸。
// 全等 → 跳过整树 d3 重建;任一变化(重排盘换 value、切显示项、切主题、resize)→ 签名变 → 真重画。
// 注意:引用相等是「只多画、绝不少画」的安全侧 —— 内容变而引用不变才会漏画,而这些输入均来自 dva/props 引用稳定。
export function buildChartDrawSig(chartid, inputs){
	const svgdom = (typeof document !== 'undefined' && chartid) ? document.getElementById(chartid) : null;
	return {
		...inputs,
		// 主题(亮↔暗)只改 <html data-horosa-appearance> + 调色板,不一定触发本组件 re-render;
		// 把主题指纹纳入签名 → 主题切换那次重画必不被误判相同而跳过(与 AstroChart 同口径)。
		__appearance: (typeof document !== 'undefined' && document.documentElement) ? document.documentElement.getAttribute('data-horosa-appearance') : '',
		__themeFill: (AstroConst.AstroColor && AstroConst.AstroColor.ChartBackgroud) || '',
		__w: svgdom ? svgdom.clientWidth : 0,
		__h: svgdom ? svgdom.clientHeight : 0,
	};
}

export function sameChartDrawSig(a, b){
	if(!a || !b){
		return false;
	}
	const ka = Object.keys(a);
	const kb = Object.keys(b);
	if(ka.length !== kb.length){
		return false;
	}
	for(let i = 0; i < ka.length; i++){
		const k = ka[i];
		if(a[k] !== b[k]){
			return false;
		}
	}
	return true;
}

// 仅「非零尺寸成功绘制」后才记录签名:隐藏期(0×0)不记 → 变可见时 w/h 变 → 必重画。
export function chartDrawnAtNonZeroSize(chartid){
	const svgdom = (typeof document !== 'undefined' && chartid) ? document.getElementById(chartid) : null;
	return !!(svgdom && svgdom.clientWidth > 0 && svgdom.clientHeight > 0);
}
