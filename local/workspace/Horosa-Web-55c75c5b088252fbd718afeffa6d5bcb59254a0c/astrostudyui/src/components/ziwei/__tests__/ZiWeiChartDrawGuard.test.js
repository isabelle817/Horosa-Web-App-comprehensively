jest.mock('../ZWChart', ()=>jest.fn().mockImplementation(()=>({
	draw: jest.fn(),
	zwindicator: {},
})));

import ZiWeiChart from '../ZiWeiChart';

// 紫微图重绘签名守卫自检:同输入跳过整树重建(ZWChart.draw 内 svg.html('') 全清空),
// 数据/运限/rules/尺寸变必重画,kill-switch 恒不 skip。
describe('ZiWeiChart 重绘签名守卫', ()=>{
	let getElementByIdSpy;
	let fakeDom;

	const mkChartObj = ()=>({ houses: [], birth: '1991-03-12 10:30:00' });

	const mkComponent = (props)=>{
		const c = new ZiWeiChart({ dirIndex: 2, luckMingIndex: null, fields: {}, rules: { a: 1 }, ...props });
		c.ensureChartSurfaceSize = ()=>true; // 尺寸保障逻辑另有 retry 机制,这里直通
		return c;
	};

	beforeEach(()=>{
		window.localStorage.clear();
		fakeDom = { clientWidth: 600, clientHeight: 600 };
		getElementByIdSpy = jest.spyOn(document, 'getElementById').mockImplementation(()=>fakeDom);
	});

	afterEach(()=>{
		getElementByIdSpy.mockRestore();
	});

	it('同输入连画两次 → 整树只重建一次', ()=>{
		const c = mkComponent({ value: mkChartObj() });
		c.drawChart();
		c.drawChart();
		expect(c.zwchart.draw).toHaveBeenCalledTimes(1);
	});

	it('盘面数据引用变 → 必重画', ()=>{
		const c = mkComponent({ value: mkChartObj() });
		c.drawChart();
		c.props = { ...c.props, value: mkChartObj() };
		c.drawChart();
		expect(c.zwchart.draw).toHaveBeenCalledTimes(2);
	});

	it('运限索引(dirIndex)变 → 必重画', ()=>{
		const c = mkComponent({ value: mkChartObj() });
		c.drawChart();
		c.props = { ...c.props, dirIndex: 5 };
		c.drawChart();
		expect(c.zwchart.draw).toHaveBeenCalledTimes(2);
	});

	it('rules 变 → 必重画(render 期写入 zwchart.rules,必须入签名)', ()=>{
		const c = mkComponent({ value: mkChartObj() });
		c.drawChart();
		c.props = { ...c.props, rules: { a: 2 } };
		c.drawChart();
		expect(c.zwchart.draw).toHaveBeenCalledTimes(2);
	});

	it('容器尺寸变 → 必重画', ()=>{
		const c = mkComponent({ value: mkChartObj() });
		c.drawChart();
		fakeDom.clientWidth = 900;
		c.drawChart();
		expect(c.zwchart.draw).toHaveBeenCalledTimes(2);
	});

	it('kill-switch(horosa.perf.chartDrawGuard=0) → 恒不 skip', ()=>{
		window.localStorage.setItem('horosa.perf.chartDrawGuard', '0');
		try{
			const c = mkComponent({ value: mkChartObj() });
			c.drawChart();
			c.drawChart();
			expect(c.zwchart.draw).toHaveBeenCalledTimes(2);
		}finally{
			window.localStorage.removeItem('horosa.perf.chartDrawGuard');
		}
	});
});
