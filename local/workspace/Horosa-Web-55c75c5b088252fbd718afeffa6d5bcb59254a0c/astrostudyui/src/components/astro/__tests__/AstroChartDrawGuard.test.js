import AstroChart from '../AstroChart';

// 重绘签名守卫自检:同输入跳过全量 d3 重建、输入变必重画、零尺寸不记签名(retry 机制不被吞)、
// kill-switch 恒不 skip。直接实例化组件类 + stub 绘制引擎(仓内无 RTL/enzyme,沿用类实例测法)。
describe('AstroChart 重绘签名守卫', ()=>{
	let getElementByIdSpy;
	let fakeDom;

	const mkChartObj = ()=>({ chart: { planets: [] } });

	const mkComponent = (props)=>{
		const c = new AstroChart({ showAstroMeaning: 1, ...props });
		c.chartCircle = { setShowAstroMeaning: jest.fn(), drawChart: jest.fn() };
		return c;
	};

	beforeEach(()=>{
		window.localStorage.clear();
		fakeDom = { clientWidth: 800, clientHeight: 600 };
		getElementByIdSpy = jest.spyOn(document, 'getElementById').mockImplementation(()=>fakeDom);
		jest.useFakeTimers();
	});

	afterEach(()=>{
		getElementByIdSpy.mockRestore();
		jest.clearAllTimers();
		jest.useRealTimers();
	});

	it('同输入连画两次 → 底层 d3 只重建一次(120ms retry 被守卫吸收)', ()=>{
		const c = mkComponent({ value: mkChartObj() });
		c.drawChart();
		c.drawChart();
		expect(c.chartCircle.drawChart).toHaveBeenCalledTimes(1);
	});

	it('数据引用变 → 必重画', ()=>{
		const c = mkComponent({ value: mkChartObj() });
		c.drawChart();
		c.props = { ...c.props, value: mkChartObj() };
		c.drawChart();
		expect(c.chartCircle.drawChart).toHaveBeenCalledTimes(2);
	});

	it('显示设置(chartStyle)变 → 必重画', ()=>{
		const c = mkComponent({ value: mkChartObj(), chartStyle: 'classic' });
		c.drawChart();
		c.props = { ...c.props, chartStyle: 'modern' };
		c.drawChart();
		expect(c.chartCircle.drawChart).toHaveBeenCalledTimes(2);
	});

	it('容器尺寸变(resize) → 必重画', ()=>{
		const c = mkComponent({ value: mkChartObj() });
		c.drawChart();
		fakeDom.clientWidth = 1200;
		c.drawChart();
		expect(c.chartCircle.drawChart).toHaveBeenCalledTimes(2);
	});

	it('零尺寸时绘制不记签名:retry 轮询不被守卫吞掉,变可见后必画', ()=>{
		const c = mkComponent({ value: mkChartObj() });
		fakeDom.clientWidth = 0;
		fakeDom.clientHeight = 0;
		c.drawChart();
		expect(c.redrawTimer).not.toBeNull(); // retry 已排队
		// 同输入再画(模拟 retry):零尺寸期间不被 skip
		c.drawChart();
		expect(c.chartCircle.drawChart).toHaveBeenCalledTimes(2);
		// 变可见(非零尺寸)后:必画且此后才开始 skip
		fakeDom.clientWidth = 800;
		fakeDom.clientHeight = 600;
		c.drawChart();
		expect(c.chartCircle.drawChart).toHaveBeenCalledTimes(3);
		c.drawChart();
		expect(c.chartCircle.drawChart).toHaveBeenCalledTimes(3);
	});

	it('绘制抛错不记签名:下次同输入仍重画', ()=>{
		const c = mkComponent({ value: mkChartObj() });
		c.chartCircle.drawChart.mockImplementationOnce(()=>{ throw new Error('draw boom'); });
		const errSpy = jest.spyOn(console, 'error').mockImplementation(()=>{});
		try{
			c.drawChart();
			c.drawChart();
			expect(c.chartCircle.drawChart).toHaveBeenCalledTimes(2);
		}finally{
			errSpy.mockRestore();
		}
	});

	it('kill-switch(horosa.perf.chartDrawGuard=0) → 恒不 skip', ()=>{
		window.localStorage.setItem('horosa.perf.chartDrawGuard', '0');
		try{
			const c = mkComponent({ value: mkChartObj() });
			c.drawChart();
			c.drawChart();
			expect(c.chartCircle.drawChart).toHaveBeenCalledTimes(2);
		}finally{
			window.localStorage.removeItem('horosa.perf.chartDrawGuard');
		}
	});
});
