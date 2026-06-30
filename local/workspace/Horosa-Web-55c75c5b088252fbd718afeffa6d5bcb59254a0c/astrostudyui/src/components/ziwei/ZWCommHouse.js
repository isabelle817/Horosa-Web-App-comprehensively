import * as d3 from 'd3';
import * as AstroConst from '../../constants/AstroConst';
import * as ZWCont from '../../constants/ZWConst';
import * as ZiWeiHelper from './ZiWeiHelper';
import * as GraphHelper from '../graph/GraphHelper';
import D3Arrow from '../graph/D3Arrow';
import {randomStr, creatTooltip, genHtml, positionFloatingTooltip} from '../../utils/helper';

export default class ZWCommHouse {
	constructor(option){
		this.owner = option.owner;
		this.x = option.x;
		this.y = option.y;
		this.width = option.width;
		this.height = option.height;
		this.houseObj = option.houseObj;
		this.dirname = option.dirname;
		this.yearText = option.yearText;
		this.chartObj = option.chartObj;
		this.flyGanzi = option.flyGanzi;
		this.zwchart = option.zwchart;
		this.dirIndex = option.dirIndex;
		this.houseIndex = option.houseIndex;
		this.luckMingIndex = option.luckMingIndex;
		// 运限渲染数据（需求3/5）：四化滑窗层(末3层)、自化开关、长生左侧标签层；由 ZWChart 经 opt 注入。
		this.luckSihuaLayers = option.luckSihuaLayers || null;
		this.luckShowZihua = option.luckShowZihua !== false;
		this.luckLabelLayers = option.luckLabelLayers || null;
		if(this.houseObj){
			this.houseObj.houseChart = this;
		}
		this.onTipClick = option.onTipClick;

		this.margin = 3;
		this.svg = null;
		this.id = 'house' + randomStr(8);

		this.stars = new Map();
		this.fontSize = 18;
		this.starFontSize = 23;
		this.kinastroBorrowed = !!option.kinastroBorrowed;
		if(option.kinastroBorrowed){
			this.fontSize = 17;
			this.starFontSize = 25;
		}
		// 盘底随主题(明暗)：原 ChartBackgroud=0x000000 是恒黑、不跟主题(切明暗不变·很丑)，改themed令牌。
		this.houseBG = 'var(--horosa-ziwei-chart-bg, #f6f1e7)';

		this.divTooltip = option.divTooltip;
		this.divTooltipId = option.divTooltipId;

		this.ZWRules = option.rules ? option.rules.ZWRules : null;
		this.ZWRuleSihua = option.rules ? option.rules.ZWRuleSihua : null;
	}

	genTooltip(titleSvg, tipobj, name){
		if(this.divTooltip === undefined || this.divTooltip === null){
			return;
		}

		let lbl = genHtml(tipobj);
		titleSvg.on('mouseover', (evt)=>{
			const pointerY = evt.clientY !== undefined ? evt.clientY : evt.pageY;
			let y = pointerY - 48;
			let ydelta = document.documentElement.clientHeight - y;
			if(tipobj.tips instanceof Array && tipobj.tips.length > 3){
				if(ydelta < 350){
					y = y - 350;
					if(tipobj.tips.length < 8){
						y = y + 250;
					}
				}	
			}

			let str = lbl;
			let tips = localStorage.getItem('ziweiTips');
			let flag = true;
			if(tips !== undefined && tips !== null){
				if(tips+'' === '1'){
					flag = true;
				}else{
					flag = false;
				}
			}
			if(flag){
				this.divTooltip.transition()		
					.duration(200)		
					.style("opacity", .9);
				this.divTooltip.html(str);
				positionFloatingTooltip(this.divTooltip, evt, {
					offsetX: 16,
					offsetY: y - pointerY,
					fallbackOffsetY: 18,
				});
			}else{
				this.divTooltip.transition()		
					.duration(500)		
					.style("opacity", 0);
			}
		}).on('mouseout', (evt)=>{
			this.divTooltip.transition().duration(500).style("opacity", 0);
		}).on('click', (evt)=>{
			if(this.onTipClick){
				this.onTipClick(tipobj);
			}
			return false;
		});

	}

	// ===== 运限四化叠层（需求5 + 二轮按层对齐；三合盘/四化盘共用）=====
	// 关键：每个运限层占**固定槽位** slot=层在窗口中的序号 → 同一层四化跨所有星曜落在同一水平线；
	// 某星缺某层四化则该槽**留空**（不上移），使「大限一行、流年下一行…」对齐(用户二轮要求)。
	// 本命/大限按 hua 本色(periodColor=null)；流年小限/月/日/时按各层期色；仅无运限时(luckShowZihua)在窗口层之后加一槽自化(带箭头)。
	// baseOffset=星名区底(各星统一,跨星对齐起点)；slotH=每层槽高(统一)；maxBottom=上半矩形底线(越界不画)。返回末槽底(供指示线)。
	drawLuckSihuaForStar(star, x, y, w, baseOffset, slotH, mgn, maxBottom){
		if(!star || !star.name || this.kinastroBorrowed){
			return baseOffset;
		}
		const m = mgn || 1;
		const huaw = w - m*2;
		const huah = Math.max(8, Math.min(w, slotH - m));
		const drawBadge = (hua, bg, color, withArrow, slotIdx)=>{
			if(!hua){
				return;
			}
			const huax = x + m;
			const huay = y + baseOffset + slotIdx * slotH;
			if(maxBottom !== undefined && maxBottom !== null && (huay + huah) > maxBottom){
				return; // 越界保护：不画会超出宫格上半矩形的徽标（需求4）
			}
			const fill = color || '#ffffff';
			const huasvg = GraphHelper.drawTextV(this.svg.append('g'), [hua], huax, huay, huaw, huah, m,
				fill, 850, bg);
			huasvg.selectAll('text')
				.attr('fill', fill)
				.attr('stroke', 'none')
				.attr('font-weight', 850);
			if(withArrow){
				const opt = {
					owner: this.svg.append('g'),
					x2: huax + huaw/2, y2: huay + huah,
					x1: huax + huaw/2, y1: huay,
					color: bg,
				};
				new D3Arrow(opt).draw();
			}
			// 四化释义 tooltip（与原本命四化同源）。
			const ruleSihuaArr = this.ZWRules && this.ZWRules.RuleSihua ? this.ZWRules.RuleSihua[hua] : null;
			if(ruleSihuaArr){
				const huatip = ruleSihuaArr.slice(0);
				const huahouse = this.ZWRuleSihua && this.ZWRuleSihua.HuaInHouse ? this.ZWRuleSihua.HuaInHouse[hua] : null;
				const huahousetip = huahouse && huahouse[this.houseObj.name] ? huahouse[this.houseObj.name].slice(0) : [];
				if(!huatip.some((v)=> v === '==')){
					huatip.push('==');
					huatip.push(`${hua}在${this.houseObj.name}`);
					huatip.push(huahousetip);
				}
				this.genTooltip(huasvg, { title: hua, tips: huatip }, hua);
			}
		};
		const layers = this.luckSihuaLayers || [];
		layers.forEach((layer, slotIdx)=>{
			let hua = ZiWeiHelper.getSiHua(star.name, layer.gan);
			if(hua === '祿'){
				hua = '禄';
			}
			if(!hua){
				return; // 该层此星无四化 → 槽位留空（不上移），保证跨星同层对齐
			}
			let bg; let color;
			if(layer.periodColor){
				bg = layer.periodColor;
				color = '#ffffff';
			}else{
				const opt = ZWCont.ZWColor[hua] || ZWCont.ZWColor.StarMainStroke;
				bg = opt.bg || ZWCont.ZWColor.StarMainStroke;
				color = opt.color || '#ffffff';
			}
			drawBadge(hua, bg, color, false, slotIdx);
		});
		// 自化：仅无运限选中时（腾位给运限层），落窗口层之后的下一槽。
		if(this.luckShowZihua){
			const housegan = this.houseObj.ganzi.charAt(0);
			let ganhua = ZiWeiHelper.getSiHua(star.name, housegan);
			if(ganhua === '祿'){
				ganhua = '禄';
			}
			if(ganhua){
				const opt = ZWCont.ZWColor[ganhua] || ZWCont.ZWColor.StarMainStroke;
				drawBadge(ganhua, opt.bg || ZWCont.ZWColor.StarMainStroke, opt.color || '#ffffff', true, layers.length);
			}
		}
		const totalSlots = layers.length + (this.luckShowZihua ? 1 : 0);
		return baseOffset + totalSlots * slotH;
	}

	// ===== 长生左侧运限标签（需求3；三合盘/四化盘共用）=====
	// 在十二长生左侧画 年X/月X/日X/时X：每层横排2字(GraphHelper.drawTextH)、各层期色、多层从下往上堆叠。
	// rightX=标签列右界(长生左侧)、bottomY=最底一行的底线(宫格底之上)。大限「运X」已在宫顶、本命不画。
	drawLuckLabels(rightX, bottomY){
		const labels = this.luckLabelLayers || [];
		if(!labels.length){
			return;
		}
		const fs = Math.max(9, Math.min(11, this.fontSize - 7));
		const labelH = fs + 3;
		const gap = 2;
		const labelW = fs * 2 + 4; // 横排 2 字
		const lx = rightX - labelW;
		let row = 0;
		for(let i=0; i<labels.length; i++){
			const layer = labels[i];
			const role = ZiWeiHelper.luckRoleChar(layer.mingIndex, this.houseIndex);
			if(!role){
				continue;
			}
			const ly = bottomY - (row + 1) * labelH - row * gap;
			if(ly < this.y){
				break; // 越界保护：不画超出宫格上沿的标签
			}
			const g = GraphHelper.drawTextH(this.svg.append('g'), [layer.prefix, role], lx, ly, labelW, labelH, 1,
				layer.color, 700);
			g.selectAll('text').attr('fill', layer.color).attr('stroke', 'none');
			row++;
		}
	}

}
