// AI 分析「报告」- 新建报告生成器 Drawer
// 表单：技法 / 案例 / 流派 / 粒度 / 资料范围 / 嵌图开关 / 辅助节开关 / 接口·模型 / API 参数

import React from 'react';
import {
	Drawer, Form, Radio, Select, Switch, Button,
	Alert, Tag, Space, Divider, Tooltip,
} from 'antd';
import { KNOWN_SCHOOLS, getSchoolList } from '../../utils/reportSchools';
import { encodeModelSelection, parseModelSelection, THINKING_LEVELS, getPersistedThinkingLevel, setPersistedThinkingLevel } from '../../utils/aiAnalysisProviders';

const TECH_OPTIONS = [
	{ value: 'bazi', label: '八字' },
	{ value: 'ziwei', label: '紫微斗数' },
];

const GRAN_OPTIONS = [
	{ value: 8,  label: '8 节精炼', desc: '快，省 token' },
	{ value: 12, label: '12 节中粒度', desc: '推荐，平衡详细与成本' },
	{ value: 20, label: '20 节细粒度', desc: '无所不包，token 翻倍' },
];

export default function ReportGenerator(props){
	const {
		open, onCancel, onSubmit, sources = [], materials = [],
		profile, model, modelOptions = [], providerProfiles = [], preset,
	} = props;
	const [form] = Form.useForm();
	const [technique, setTechnique] = React.useState('bazi');
	const [schools, setSchools] = React.useState([]);
	const [materialIds, setMaterialIds] = React.useState([]);

	// 默认选中的「接口/模型」编码值 = 当前全局接口 + 模型。
	const defaultSelection = React.useMemo(()=>(
		(profile && profile.id && model) ? encodeModelSelection(profile.id, model) : ''
	), [profile, model]);

	// 应用预填（preset）
	// eslint-disable-next-line react-hooks/exhaustive-deps
	React.useEffect(()=>{
		if(!open) return;
		const sel = (preset && preset.modelSelection) || defaultSelection || undefined;
		const base = {
			technique: (preset && preset.technique) || 'bazi',
			granularity: (preset && preset.granularity) || 12,
			caseId: (preset && preset.caseId) || undefined,
			schools: (preset && preset.schools) || [],
			embedCharts: preset ? preset.embedCharts !== false : true,
			intro: preset ? preset.intro !== false : true,
			outro: preset ? preset.outro !== false : true,
			modelSelection: sel,
			thinkingLevel: (preset && preset.thinkingLevel) || getPersistedThinkingLevel(),
		};
		if(!preset){ form.resetFields(); }
		form.setFieldsValue(base);
		setTechnique(base.technique);
		setSchools(base.schools);
	}, [open, preset, defaultSelection]);

	// 八字/紫微 case 数据走 listLocalCharts（含 birth），
	// 同一组生辰数据可同时给八字/紫微/占星用，所以默认所有 chart-type source 都允许选。
	const techSources = sources.filter((s)=>{
		if(s.sourceType !== 'chart') return false; // 报告功能首批只支持 chart-based（八字/紫微）
		return true;
	});

	const sourceOptions = techSources.map((s)=>{
		const sm = `${(s.record && (s.record.sourceModule || s.record.chartType)) || ''}`;
		const tag = sm ? `[${sm}]` : '';
		return {
			value: s.id,
			label: `${s.title || s.name || s.label || s.id} ${tag}`.trim(),
		};
	});

	const techSchools = getSchoolList(technique);

	// 资料数量统计（按 schools 过滤后）
	const filteredCount = React.useMemo(()=>{
		if(!schools || schools.length === 0) return materials.length;
		return materials.filter((m)=>{
			const ms = Array.isArray(m.schools) ? m.schools : [];
			if(ms.length === 0) return true;
			return ms.some((s)=>schools.includes(s));
		}).length;
	}, [schools, materials]);

	function handleFinish(values){
		// 把「接口/模型」编码值解析成 providerOverride(接口对象) + modelOverride(模型名),供报告管线选用任意 API key。
		const { profileId, model: selModel } = parseModelSelection(values.modelSelection || '');
		const providerOverride = (providerProfiles || []).find((p)=>p.id === profileId) || undefined;
		setPersistedThinkingLevel(values.thinkingLevel);
		onSubmit && onSubmit({
			thinkingLevel: values.thinkingLevel || 'off',
			technique: values.technique,
			granularity: values.granularity,
			caseId: values.caseId,
			schools: values.schools || [],
			materialIds: values.materialIds || materialIds || [],
			embedCharts: values.embedCharts !== false,
			intro: values.intro !== false,
			outro: values.outro !== false,
			providerOverride,
			modelOverride: selModel || undefined,
		});
	}

	return (
		<Drawer
			title="新建报告"
			open={open}
			onClose={onCancel}
			width={520}
			extra={
				<Space>
					<Button onClick={onCancel}>取消</Button>
					<Button type="primary" onClick={()=>form.submit()}>开始生成</Button>
				</Space>
			}
		>
			<Form
				form={form}
				layout="vertical"
				onFinish={handleFinish}
				initialValues={{
					technique: 'bazi',
					granularity: 12,
					embedCharts: true,
					intro: true,
					outro: true,
				}}
			>
				<Form.Item label="技法" name="technique" rules={[{ required: true }]}>
					<Radio.Group onChange={(e)=>{ setTechnique(e.target.value); form.setFieldValue('schools', []); setSchools([]); form.setFieldValue('caseId', undefined); }}>
						{TECH_OPTIONS.map((t)=>(<Radio key={t.value} value={t.value}>{t.label}</Radio>))}
					</Radio.Group>
				</Form.Item>

				<Form.Item label="案例" name="caseId" rules={[{ required: true, message: '请选择案例' }]}>
					<Select
						showSearch
						placeholder={sourceOptions.length ? '选择已有案例' : '无可用案例，请先在对应技法 tab 创建'}
						options={sourceOptions}
						filterOption={(input, option)=>(option && `${option.label || ''}`.includes(input))}
						notFoundContent={sourceOptions.length === 0 ? `当前技法下没有可用案例` : '无匹配'}
					/>
				</Form.Item>

				<Form.Item
					label={<span>流派 <Tooltip title="选了流派会过滤检索资料 + 在 prompt 中注入流派指引。不选则走通用 RAG。"><Tag color="blue" style={{cursor:'help'}}>?</Tag></Tooltip></span>}
					name="schools"
					extra={<span style={{fontSize:12,color:'var(--horosa-muted, #888)'}}>过滤后资料约 {filteredCount} 篇</span>}
				>
					<Select
						mode="tags"
						placeholder="不选 = 不限流派（推荐资料较多场景）"
						onChange={(v)=>setSchools(v)}
						options={techSchools.map((s)=>({ value: s.name, label: s.name }))}
					/>
				</Form.Item>

				{schools && schools.length > 0 && filteredCount < 3 ? (
					<Alert
						type="warning"
						showIcon
						message={`所选流派 [${schools.join('、')}] 对应资料较少（${filteredCount} 篇），结果可能不够地道。`}
						style={{ marginBottom: 16 }}
					/>
				) : null}

				<Form.Item label="粒度" name="granularity" rules={[{ required: true }]}>
					<Radio.Group>
						{GRAN_OPTIONS.map((g)=>(
							<Radio key={g.value} value={g.value} style={{display:'block',marginBottom:6}}>
								<strong>{g.label}</strong> <span style={{fontSize:12,color:'var(--horosa-muted, #888)',marginLeft:6}}>{g.desc}</span>
							</Radio>
						))}
					</Radio.Group>
				</Form.Item>

				<Form.Item label="资料范围" name="materialIds" extra="不选则用全部资料（按流派过滤后）">
					<Select
						mode="multiple"
						placeholder="留空 = 用全部"
						maxTagCount="responsive"
						options={materials.map((m)=>({ value: m.id, label: m.fileName || '(未命名)' }))}
						filterOption={(input, option)=>`${(option && option.label) || ''}`.toLowerCase().includes(`${input || ''}`.toLowerCase())}
					/>
				</Form.Item>

				<Divider />

				<Form.Item
					label={<span>接口 / 模型 <Tooltip title="可选用任意已配置的 API 接口与模型生成本报告，不再固定为顶栏当前接口。"><Tag color="blue" style={{cursor:'help'}}>?</Tag></Tooltip></span>}
					name="modelSelection"
					rules={[{ required: true, message: '请选择生成报告所用的接口与模型' }]}
					extra={modelOptions.length ? '列出所有已配置接口（API key）下的模型' : '尚无可用接口，请先在「设置」配置 API'}
				>
					<Select
						showSearch
						placeholder="选择接口与模型"
						options={modelOptions}
						filterOption={(input, option)=>`${(option && option.label) || ''}`.toLowerCase().includes(`${input || ''}`.toLowerCase())}
						notFoundContent="无可用接口/模型"
					/>
				</Form.Item>

				<Form.Item
					label={<span>思考档 <Tooltip title="让模型作答前多想（链式推理），档位越高越深、越慢越贵。推理模型（o系/gpt-5+/Claude/Gemini）生效，其它自动降级；报告默认关闭以保稳定，需要更深可在此开启。"><Tag color="blue" style={{cursor:'help'}}>?</Tag></Tooltip></span>}
					name="thinkingLevel"
					extra="仅主章节生成应用；辅助节保持关闭"
				>
					<Select
						style={{ maxWidth: 220 }}
						options={THINKING_LEVELS.map((t)=>({ value: t.value, label: t.label }))}
					/>
				</Form.Item>

				<Divider />

				<Form.Item label="嵌图" name="embedCharts" valuePropName="checked">
					<Switch checkedChildren="开" unCheckedChildren="关" />
				</Form.Item>
				<div style={{marginTop:-12,marginBottom:16,fontSize:12,color:'var(--horosa-muted, #888)'}}>
					每节按模板默认嵌入对应真实命盘截图（四柱图 / 12 宫盘 / 宫高亮），与软件内 八字/紫微 tab 视觉一致。<br />
					每张图 3-5s, 12 节大约 +40s 生成时间。
				</div>

				<Form.Item label="首页一句话结论" name="intro" valuePropName="checked">
					<Switch checkedChildren="开" unCheckedChildren="关" />
				</Form.Item>

				<Form.Item label="末页重点提醒" name="outro" valuePropName="checked">
					<Switch checkedChildren="开" unCheckedChildren="关" />
				</Form.Item>
			</Form>
		</Drawer>
	);
}
