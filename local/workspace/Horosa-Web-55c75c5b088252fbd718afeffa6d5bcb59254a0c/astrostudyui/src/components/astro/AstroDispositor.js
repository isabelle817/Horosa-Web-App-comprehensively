// components/astro/AstroDispositor.js
// 主宰星链（dispositor chains）+ 宫神星（各宫主星及其落点）。纯前端派生，嵌于本命「古典」tab。
import { Component } from 'react';
import { astroSymbol, cardStyle, SmallTable } from './AstroExtraCommon';
import { SIGNS } from '../../divination/data/signs';
import { computeDispositors, signOf, houseNum, chartIdOfKey } from '../../utils/dispositorChain';

const sn = (s) => (SIGNS[s] && SIGNS[s].cn) || s || '-';
const symKey = (k) => astroSymbol(chartIdOfKey(k) || k);
const TRAD = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

class AstroDispositor extends Component {
	render(){
		const chartObj = this.props.value;
		if(!chartObj || !chartObj.chart) return null;
		// 主宰链/终极主宰/互容环 + 落点 pos —— 复用共享 computeDispositors（与格局速览/格局 tab 同源）。
		const { pos, chains, finals, loops: uniqLoops } = computeDispositors(chartObj.chart.objects);
		// 宫神星：各宫头星座的本垣主 + 该主星落宫/落座
		const houseRows = [];
		(chartObj.chart.houses || []).forEach((h) => {
			if(!h) return;
			const hn = houseNum(h.id);
			if(!hn) return;
			const csign = h.sign ? String(h.sign).toLowerCase() : (h.lon != null ? signOf(h.lon) : null);
			const ruler = csign ? (SIGNS[csign] || {}).domicile || null : null;
			const rp = ruler ? pos[ruler] : null;
			houseRows.push({ house: hn, sign: csign, ruler, rulerSign: rp ? rp.sign : null, rulerHouse: rp ? rp.house : null });
		});
		houseRows.sort((a, b) => a.house - b.house);
		return (
			<div style={cardStyle}>
				<div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>主宰星链 与 宫神星</div>
				<div style={{ fontSize: 12, lineHeight: 2 }}>
					{TRAD.filter((k) => chains[k] && chains[k].length).map((k) => (
						<div key={k}>{chains[k].map((x, i) => <span key={i}>{i > 0 ? <span style={{ margin: '0 4px' }}>→</span> : null}{symKey(x)}</span>)}</div>
					))}
				</div>
				<div style={{ fontSize: 12, marginTop: 8 }}>最终主宰：{finals.size ? [...finals].map((k, i) => <span key={i} style={{ marginRight: 6 }}>{symKey(k)}</span>) : '无（全部成环）'}</div>
				{uniqLoops.length ? <div style={{ fontSize: 12, marginTop: 4 }}>互容环：{uniqLoops.map((c, i) => <span key={i} style={{ marginRight: 10 }}>{c.map((x, j) => <span key={j}>{j > 0 ? ' ↔ ' : ''}{symKey(x)}</span>)}</span>)}</div> : null}
				<div style={{ marginTop: 10 }}>
					<SmallTable
						rowKey={(r) => r.house}
						rows={houseRows}
						columns={[
							{ key: 'house', title: '宫', render: (v) => `${v}宫` },
							{ key: 'sign', title: '宫头', render: (v) => sn(v) },
							{ key: 'ruler', title: '宫主星', render: (v) => (v ? symKey(v) : '-') },
							{ key: 'rulerHouse', title: '宫主落宫', render: (v) => (v ? `${v}宫` : '-') },
							{ key: 'rulerSign', title: '宫主落座', render: (_v, r) => (r.rulerSign ? sn(r.rulerSign) : '-') },
						]}
					/>
				</div>
			</div>
		);
	}
}

export default AstroDispositor;
