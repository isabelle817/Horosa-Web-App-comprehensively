// 玄学史 · 操作手册(帮助页内容组件,玄学史页右上角「帮助」打开)。
// 数据面向公有古籍/二十四史文献编纂;纯本地检索浏览,零联网。
import { Component } from 'react';
import { Tabs } from 'antd';

const { TabPane } = Tabs;
import { MUTED, p, card, ct, body, title } from './helpDocStyle';

const kv = (k, v) => <div style={{ margin: '1px 0', lineHeight: 1.55 }}><span style={{ color: MUTED }}>{k}：</span>{v}</div>;

class XuanshiHelpDoc extends Component{
	render(){
		return (
			<div style={{ marginTop: 10, borderTop: '1px solid var(--horosa-border, rgba(120,120,120,0.25))', paddingTop: 8 }}>
				<div style={title}>玄学史 · 操作手册</div>
				<Tabs defaultActiveKey="overview" size="small">
					<TabPane tab="总览" key="overview">
						<div style={body}>
							<p style={p}><b>玄学史</b>是一座可检索的中国玄学史料库:正史与野载中的玄学事件、历代天象记录、名家列传与古籍条目,全部本地化收录、离线可用。首页为总览(数据规模、玄典甄选、名家速览),由此进入各子馆。</p>
							<div style={card}><div style={ct}>子馆导航</div>
								{kv('玄学万象', '玄学事件总库:占验、术数、异闻等,按朝代 / 类目 / 出处筛选,点击看原文与出处')}
								{kv('星象大典', '数万条历代天象记录(日食 / 彗星 / 客星 / 五星连珠…),统计图表可视化,可下钻单条记录')}
								{kv('天象微年表', '逐年逐旬的观象时间轴,顺着年份翻阅当时的天象与记事')}
								{kv('名家列传', '历代玄学名家的生平、师承与著述')}
								{kv('玄学地图', '事件与人物的地理分布(交互地图,朝代分色)')}
								{kv('古籍条目', '术数典籍的条目式百科')}
								{kv('案头', '你的收藏与检索历史,本机保存')}</div>
							<div style={card}><div style={ct}>检索</div>
								{kv('统一检索', '首页检索框或「检索」面板:按关键词 + 朝代 / 类目 / 出处多面筛选,结果点击直达详情')}
								{kv('原文反查', '事件详情附原文出处;暂未收录全文的条目会灰显提示')}</div>
							<div style={card}><div style={ct}>联动排盘</div>
								{kv('用法', '天象 / 事件详情里的日期可一键带入排盘(按该历史时刻起盘),用于对照研究')}
								{kv('口径', '历史日期经历法换算(儒略 / 格里高利与农历对照);久远年代的换算精度受史料记载粒度限制')}</div>
							<div style={card}><div style={ct}>数据与离线</div>
								{kv('来源', '公有领域古籍与正史文献的编纂整理,出处随条目标注')}
								{kv('离线', '全部数据随软件本地内置,浏览与检索不联网')}</div>
						</div>
					</TabPane>
				</Tabs>
			</div>
		);
	}
}

export default XuanshiHelpDoc;
