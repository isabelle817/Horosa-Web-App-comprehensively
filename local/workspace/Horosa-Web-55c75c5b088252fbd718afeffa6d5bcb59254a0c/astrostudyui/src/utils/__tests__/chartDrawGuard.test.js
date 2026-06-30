import GuoLaoChart from '../../components/guolao/GuoLaoChart';
import SuZhanChart from '../../components/suzhan/SuZhanChart';
import GuaZhanChart from '../../components/guazhan/GuaZhanChart';

// 重绘签名守卫自检(GuoLao/SuZhan/GuaZhan):这三盘原先在 componentDidUpdate / render 里无条件重建整棵 d3 树,
// 任何无关 re-render 都触发整树重画 →「越用越卡」。守卫:输入(数据/显示项/fields 引用 + 主题 + 尺寸)全等则跳过。
// 沿用仓内类实例测法(无 RTL/enzyme):实例化组件类 + stub 绘制引擎,断言 draw 调用次数。
describe('图面重绘签名守卫(GuoLao / SuZhan / GuaZhan)', ()=>{
	let getElementByIdSpy;
	let fakeDom;

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

	// 各盘:engine 字段名 / value 形状(七政·宿盘需 fixedStarSu28)/ 一个「相关 prop 变必重画」的字段。
	const CASES = [
		{
			name: 'GuoLaoChart', Klass: GuoLaoChart, engineKey: 'glchart',
			mkValue: ()=>({ fixedStarSu28: [], chart: {} }),
			changedProp: { chartDisplay: [2] },
		},
		{
			name: 'SuZhanChart', Klass: SuZhanChart, engineKey: 'szchart',
			mkValue: ()=>({ fixedStarSu28: [], chart: {} }),
			changedProp: { chartDisplay: [4] },
		},
		{
			name: 'GuaZhanChart', Klass: GuaZhanChart, engineKey: 'gzchart',
			mkValue: ()=>({ chart: {} }),
			changedProp: { yao: { v: 1 } },
		},
	];

	const mk = (cse, props)=>{
		const c = new cse.Klass({ fields: {}, ...props });
		c[cse.engineKey] = { draw: jest.fn() };
		return c;
	};
	const drawCount = (c, cse)=> c[cse.engineKey].draw.mock.calls.length;

	CASES.forEach((cse)=>{
		describe(cse.name, ()=>{
			it('同输入连画两次 → 底层引擎只 draw 一次', ()=>{
				const c = mk(cse, { value: cse.mkValue() });
				c.drawChart();
				c.drawChart();
				expect(drawCount(c, cse)).toBe(1);
			});

			it('数据引用变 → 必重画', ()=>{
				const c = mk(cse, { value: cse.mkValue() });
				c.drawChart();
				c.props = { ...c.props, value: cse.mkValue() };
				c.drawChart();
				expect(drawCount(c, cse)).toBe(2);
			});

			it('相关显示/输入 prop 变 → 必重画', ()=>{
				const c = mk(cse, { value: cse.mkValue() });
				c.drawChart();
				c.props = { ...c.props, ...cse.changedProp };
				c.drawChart();
				expect(drawCount(c, cse)).toBe(2);
			});

			it('容器尺寸变(resize) → 必重画', ()=>{
				const c = mk(cse, { value: cse.mkValue() });
				c.drawChart();
				fakeDom.clientWidth = 1200;
				c.drawChart();
				expect(drawCount(c, cse)).toBe(2);
			});

			it('零尺寸不记签名:变可见后必画,且此后才 skip', ()=>{
				const c = mk(cse, { value: cse.mkValue() });
				fakeDom.clientWidth = 0;
				fakeDom.clientHeight = 0;
				c.drawChart();
				c.drawChart();
				expect(drawCount(c, cse)).toBe(2); // 零尺寸期间不被 skip
				fakeDom.clientWidth = 800;
				fakeDom.clientHeight = 600;
				c.drawChart();
				expect(drawCount(c, cse)).toBe(3); // 变可见必画
				c.drawChart();
				expect(drawCount(c, cse)).toBe(3); // 此后同输入才 skip
			});

			it('kill-switch(horosa.perf.chartDrawGuard=0) → 恒不 skip', ()=>{
				window.localStorage.setItem('horosa.perf.chartDrawGuard', '0');
				const c = mk(cse, { value: cse.mkValue() });
				c.drawChart();
				c.drawChart();
				expect(drawCount(c, cse)).toBe(2);
			});
		});
	});
});
