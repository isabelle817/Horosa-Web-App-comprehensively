// 3D 星盘 · 操作手册(帮助页内容组件,3D星盘页右上角「帮助」打开)。
import { Component } from 'react';
import { Tabs } from 'antd';

const { TabPane } = Tabs;
import { MUTED, p, card, ct, body, title } from './helpDocStyle';

const kv = (k, v) => <div style={{ margin: '1px 0', lineHeight: 1.55 }}><span style={{ color: MUTED }}>{k}：</span>{v}</div>;

class Astro3DHelpDoc extends Component{
	render(){
		return (
			<div style={{ marginTop: 10, borderTop: '1px solid var(--horosa-border, rgba(120,120,120,0.25))', paddingTop: 8 }}>
				<div style={title}>3D 星盘 · 操作手册</div>
				<Tabs defaultActiveKey="overview" size="small">
					<TabPane tab="总览" key="overview">
						<div style={body}>
							<p style={p}><b>3D 星盘</b>把星盘还原成三维天球:黄道、天赤道、地平圈与宫位界线以真实球面几何呈现,行星按黄经黄纬落位,相位以弦线连接。用它可以直观看出「盘面上相邻的两星在天球上其实相距多远」、纬度(黄纬)如何影响相位的真实紧密度等平面盘看不出的信息。</p>
							<div style={card}><div style={ct}>视角操作</div>
								{kv('旋转', '按住鼠标左键拖动')}
								{kv('缩放', '滚轮')}
								{kv('全屏', '双击画布进入或退出全屏')}</div>
							<div style={card}><div style={ct}>简化模式</div>
								{kv('说明', '3D 行星模型资源缺失时自动进入简化模式:行星以符号标记呈现,轨道 / 圈层 / 相位弦等几何全部保留,判读不受影响')}</div>
						</div>
					</TabPane>
					<TabPane tab="时间与参数" key="input">
						<div style={body}>
							<div style={card}><div style={ct}>时间</div>
								{kv('编辑', '右栏顶部逐段选择纪元 / 年月日 / 时区 / 时分秒;「此刻」跳当前时间;「确定」应用')}
								{kv('步进', '「−」「+」按所选步长(分钟 / 小时 / 天…)前后推动时间,盘面即时重算')}</div>
							<div style={card}><div style={ct}>盘面参数</div>
								{kv('黄道', '回归黄道 / 恒星黄道(含多种岁差)切换')}
								{kv('宫位制', 'Alcabitius / Placidus / 整宫等常用分宫制')}
								{kv('星座口径', '天文星座 / 涵义星座 两种画法')}
								{kv('地点', '「经纬度选择」打开地点弹窗:城市快搜(本地数据)/ 在线地图(首次使用需你同意加载)/ 手输经纬度')}</div>
						</div>
					</TabPane>
					<TabPane tab="右栏四页" key="rightpanel">
						<div style={body}>
							<div style={card}><div style={ct}>信息</div>
								{kv('看什么', '昼夜盘、日主星 / 时主星、映点 / 反映点、接纳(正 / 邪·有情无情)、互容、光线围攻、夹星 / 夹宫、纬照(平行 / 相对星体)等古典结构判读')}</div>
							<div style={card}><div style={ct}>相位</div>
								{kv('看什么', '两两相位与容许度列表,与 3D 球面上的弦线一一对应')}</div>
							<div style={card}><div style={ct}>行星</div>
								{kv('看什么', '逐颗行星的落座落宫与度数详情')}</div>
							<div style={card}><div style={ct}>希腊点</div>
								{kv('看什么', '已启用的希腊点 / 阿拉伯点位置(受占星页的希腊点开关控制)')}</div>
						</div>
					</TabPane>
				</Tabs>
			</div>
		);
	}
}

export default Astro3DHelpDoc;
