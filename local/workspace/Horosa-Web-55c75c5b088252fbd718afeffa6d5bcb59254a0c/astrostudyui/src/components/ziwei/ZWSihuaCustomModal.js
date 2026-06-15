import { Component } from 'react';
import { message } from 'antd';
import { XQModal as Modal, XQSelect as Select } from '../xq-ui';

const { Option } = Select;

const GANS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const HUA = ['禄', '权', '科', '忌'];
// 可作四化的星：14 正曜 + 左辅右弼文昌文曲（涵盖各派四化表值域）。
const STAR_OPTIONS = [
	'紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门',
	'天相', '天梁', '七杀', '破军', '左辅', '右弼', '文昌', '文曲',
];

function cloneTable(src) {
	const t = {};
	GANS.forEach((g) => {
		const row = src && src[g] ? src[g] : [];
		t[g] = [row[0] || '', row[1] || '', row[2] || '', row[3] || ''];
	});
	return t;
}

// P1-A 自定义四化表编辑器：10 干 × 4 化（禄权科忌）下拉网格。默认以当前流派表预填。
class ZWSihuaCustomModal extends Component {
	constructor(props) {
		super(props);
		this.state = { table: cloneTable(props.table) };
		this.ok = this.ok.bind(this);
	}

	componentDidUpdate(prev) {
		if (!prev.open && this.props.open) {
			this.setState({ table: cloneTable(this.props.table) });
		}
	}

	change(gan, idx, val) {
		this.setState((s) => {
			const t = cloneTable(s.table);
			t[gan][idx] = val;
			return { table: t };
		});
	}

	ok() {
		const t = this.state.table;
		for (const g of GANS) {
			const row = t[g] || [];
			if (row.some((x) => !x)) {
				message.warning(`${g}干四化未填全`);
				return;
			}
			if (new Set(row).size !== 4) {
				message.warning(`${g}干四化有重复星`);
				return;
			}
		}
		if (this.props.onOk) {
			this.props.onOk(cloneTable(t));
		}
	}

	render() {
		const t = this.state.table;
		return (
			<Modal
				open={this.props.open}
				title="自定义四化表"
				onCancel={this.props.onCancel}
				onOk={this.ok}
				width={560}
				okText="保存"
				cancelText="取消"
				className="horosa-ziwei-sihua-modal"
			>
				<div className="horosa-ziwei-sihua-editor">
					<div className="horosa-ziwei-sihua-editor-row horosa-ziwei-sihua-editor-head">
						<span>干</span>
						{HUA.map((h) => (
							<span key={h}>化{h}</span>
						))}
					</div>
					{GANS.map((g) => (
						<div className="horosa-ziwei-sihua-editor-row" key={g}>
							<span className="gan">{g}</span>
							{HUA.map((h, i) => (
								<Select
									key={h}
									size="small"
									value={t[g][i] || undefined}
									onChange={(v) => this.change(g, i, v)}
									placeholder="—"
								>
									{STAR_OPTIONS.map((s) => (
										<Option key={s} value={s}>{s}</Option>
									))}
								</Select>
							))}
						</div>
					))}
				</div>
				<div className="horosa-ziwei-sihua-editor-tip">提示：默认以当前流派表预填，通常只需改 戊/庚/壬 的化科。每干四化不可重复。</div>
			</Modal>
		);
	}
}

export default ZWSihuaCustomModal;
