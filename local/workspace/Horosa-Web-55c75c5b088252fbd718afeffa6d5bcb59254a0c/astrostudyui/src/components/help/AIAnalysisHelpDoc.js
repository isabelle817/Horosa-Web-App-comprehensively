// AI 分析 · 操作手册(帮助页内容组件,AI 分析页右上角「帮助」打开)。
import { Component } from 'react';
import { Tabs } from 'antd';

const { TabPane } = Tabs;
import { MUTED, p, card, ct, body, title } from './helpDocStyle';

const kv = (k, v) => <div style={{ margin: '1px 0', lineHeight: 1.55 }}><span style={{ color: MUTED }}>{k}：</span>{v}</div>;

class AIAnalysisHelpDoc extends Component{
	render(){
		return (
			<div style={{ marginTop: 10, borderTop: '1px solid var(--horosa-border, rgba(120,120,120,0.25))', paddingTop: 8 }}>
				<div style={title}>AI 分析 · 操作手册</div>
				<Tabs defaultActiveKey="overview" size="small">
					<TabPane tab="总览" key="overview">
						<div style={body}>
							<p style={p}><b>AI 分析</b>把你在各技法页挂载的命盘 / 占测快照交给你自己配置的大语言模型做解读。左侧为案例与对话区,右侧页签管理历史、资料、模版与服务设置。</p>
							<div style={card}><div style={ct}>三步上手</div>
								{kv('第一步', '「设置」页签配置模型服务:选择服务商(或自建 / 本地模型)、填入你自己的接口密钥、选择模型;可保存多套配置随时切换')}
								{kv('第二步', '在任一技法页点「AI助手 / 挂载」把当前盘挂载为案例;或在本页「案例」列表选择已挂载的盘')}
								{kv('第三步', '对话框输入问题发送;回答流式生成,可随时停止')}</div>
							<div style={card}><div style={ct}>隐私要点</div>
								{kv('数据去向', '发起分析时,所选案例的快照文本与你的问题会发送给你配置的模型服务;不使用则不发送任何数据')}
								{kv('密钥', '接口密钥仅保存在你本机;选择本地部署模型(如 Ollama)可让数据完全不出本机')}</div>
						</div>
					</TabPane>
					<TabPane tab="功能页签" key="panes">
						<div style={body}>
							<div style={card}><div style={ct}>案例</div>
								{kv('看什么', '各技法页挂载来的命盘 / 事盘快照;点选即成为当前对话的分析对象,可多选合并')}
								{kv('管理', '支持刷新、删除;挂载内容由各技法页的「AI 挂载设置」决定')}</div>
							<div style={card}><div style={ct}>历史</div>
								{kv('看什么', '过往对话记录,可回看、继续或删除;全部存于本机')}</div>
							<div style={card}><div style={ct}>资料</div>
								{kv('看什么', '你的个人笔记与参考资料库,可按标签 / 流派归类;对话时可引用作为上下文')}</div>
							<div style={card}><div style={ct}>模版</div>
								{kv('看什么', '常用提问模版,一键套用;可自建、编辑')}</div>
							<div style={card}><div style={ct}>设置</div>
								{kv('看什么', '模型服务配置(多套档案)、思考档位、连通性体检;密钥只存本机')}</div>
						</div>
					</TabPane>
					<TabPane tab="进阶" key="advanced">
						<div style={body}>
							<div style={card}><div style={ct}>多模态图片</div>
								{kv('用法', '对话栏「添加图片」可附图提问(仅视觉模型有效)')}</div>
							<div style={card}><div style={ct}>AI 导出</div>
								{kv('用法', '顶栏「AI导出」把当前技法页的完整判读文本复制出来,粘到任何外部模型使用;「AI导出设置」控制包含哪些段落')}</div>
							<div style={card}><div style={ct}>思考过程</div>
								{kv('说明', '支持思考档位的模型会展示推理过程(仅展示,不回灌上下文)')}</div>
						</div>
					</TabPane>
				</Tabs>
			</div>
		);
	}
}

export default AIAnalysisHelpDoc;
