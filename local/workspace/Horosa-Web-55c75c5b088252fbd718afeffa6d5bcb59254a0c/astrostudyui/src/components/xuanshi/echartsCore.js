// echartsCore.js —— echarts 模块化按需注册(替代整包 `import * as echarts from 'echarts'`)。
// 目的:玄学史(xuanshi)分包瘦身——整包 echarts ~1MB 全进懒加载分包,改为只注册
// 玄学史两张图实际用到的「图 / 组件 / 渲染器」。渲染结果与整包逐字节一致(只是不再打进
// 没用到的 chart/component),所有调用点(echarts.init / registerMap / setOption / resize /
// dispose / on)保持不变。
//
// 穷举核对(漏注册 = 图表失效 = 功能降级,故逐项列明):
//   XuanShiCelestial(十年密度堆叠面积):series type:'line'(stack+areaStyle) / grid+xAxis+yAxis /
//     tooltip trigger:'axis' + axisPointer type:'shadow' / legend type:'scroll'
//   XuanShiMap(中国底图 + 古都钉点):registerMap('china') / geo / series type:'effectScatter'
//     coordinateSystem:'geo' + rippleEffect / tooltip trigger:'item' / init renderer:'canvas' / on('click')
import * as echarts from 'echarts/core';
import { LineChart, EffectScatterChart } from 'echarts/charts';
import {
	GridComponent,
	TooltipComponent,
	AxisPointerComponent,
	LegendComponent,
	LegendScrollComponent,
	GeoComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
	LineChart,
	EffectScatterChart,
	GridComponent,
	TooltipComponent,
	AxisPointerComponent,
	LegendComponent,
	LegendScrollComponent,
	GeoComponent,
	CanvasRenderer,
]);

export default echarts;
