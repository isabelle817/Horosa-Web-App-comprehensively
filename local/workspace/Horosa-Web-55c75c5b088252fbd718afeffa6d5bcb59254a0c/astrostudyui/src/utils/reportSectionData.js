// 报告功能 - section-scoped 数据抽取 (v1.16 全面重写)
// 用户痛点(v1.0-v1.15 反复反馈):AI 编大限/三方四正/宫位/流年干支/身宫。
//
// v1.16 根治方案:**所有节都注入完整 ground-truth**,不止单宫节
//   1. 紫微: 任何节都注入【全 12 宫 overview + 命/身宫块 + 生年四化全表】基础三件套
//   2. palace/daxian/liunian/sihua/gegu 节额外叠加专属块
//   3. 八字: 用真实后端字段 bazi.direction[](FateDirect: mainDirect.ganzi=大运干支 + subDirect[]=流年)(不再用错误的 bazi.mainDirection/luckyDecade)

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// ============ 紫微基础工具 ============

// 紫微 palace key → 中文宫名(片段)
const ZW_PALACE_KEY_TO_CN = {
	ming:'命', xiongdi:'兄弟', fuqi:'夫妻', zinv:'子女', caibo:'财帛',
	jie:'疾厄', qianyi:'迁移', jiaoyou:'交友', guanlu:'官禄',
	tianzhai:'田宅', fude:'福德', fumu:'父母',
};

// section key → 关注的本命宫位 key (用于"单宫节"识别)
const ZW_SECTION_TO_PALACE = {
	career_wealth: 'guanlu',
	marriage:      'fuqi',
	health:        'jie',
	parent:        'fumu',
	xiongdi:'xiongdi', fuqi:'fuqi', zinv:'zinv', caibo:'caibo',
	jie:'jie', qianyi:'qianyi', jiaoyou:'jiaoyou', guanlu:'guanlu',
	tianzhai:'tianzhai', fude:'fude', fumu:'fumu',
	minggong: 'ming', mingshen: 'ming',
};

// 在 chart.houses[] 中按宫名片段找索引(完整匹配优先,fallback 包含匹配)
function findZwPalaceIndex(chart, palaceCn){
	if(!chart || !chart.houses || !palaceCn) return -1;
	for(let i=0; i<chart.houses.length; i++){
		const h = chart.houses[i];
		if(!h) continue;
		const name = h.name || h.houseName || '';
		if(name === palaceCn || name === palaceCn+'宫') return i;
	}
	for(let i=0; i<chart.houses.length; i++){
		const h = chart.houses[i];
		if(!h) continue;
		const name = h.name || h.houseName || '';
		if(name.indexOf(palaceCn) >= 0) return i;
	}
	return -1;
}

// 🔴 紫微 houses[] 不按固定地支排序（houses[0] 地支随盘而变）。「地支 → houses 下标」必须搜 ganzi.charAt(1)，
//    绝不能用地支序号(0=子…)当下标，否则流年命宫/流迁移/财帛/官禄全部错位。与主盘 ZWLuckPanel.houseIdxByBranch 同口径。
function zwHouseIdxByBranch(chart, zhi){
	if(!chart || !chart.houses || !zhi) return -1;
	return chart.houses.findIndex((h)=> h && h.ganzi && h.ganzi.charAt(1) === zhi);
}

// 收集某宫位所有星曜(主/辅/煞/桃花/杂)+亮度+四化标注
// v1.16 加固: 多字段名兼容(name/cn_name/chinese_name/starName/star_name)
function collectAllStarsZw(house){
	if(!house) return [];
	const groups = ['starsMain','starsAssist','starsEvil','starsOthersGood','starsOthersBad','starsSmall','stars'];
	const collected = [];
	groups.forEach((key)=>{
		const arr = house[key] || [];
		arr.forEach((s)=>{
			let name = '';
			if(typeof s === 'string') name = s;
			else if(s && typeof s === 'object'){
				name = s.name || s.cn_name || s.chinese_name || s.starName || s.star_name || '';
			}
			if(!name) return;
			let meta = '';
			if(typeof s === 'object' && s){
				const bright = s.brightness || s.miaowang || s.bright || s.miao || '';
				const hua = s.hua || s.sihua || '';
				const flags = [];
				if(bright) flags.push(bright);
				if(hua) flags.push(`化${hua}`);
				if(flags.length) meta = `(${flags.join('·')})`;
			}
			const display = `${name}${meta}`;
			if(!collected.includes(display)) collected.push(display);
		});
	});
	return collected;
}

// 取某宫位干支(多字段名兼容)
function getHouseGanZhi(h){
	if(!h) return '';
	return h.ganzi || h.ganZhi || h.gan_zhi || ((h.gan && h.zhi) ? `${h.gan}${h.zhi}` : '');
}

// 取某宫位名(多字段名兼容)
function getHouseName(h){
	if(!h) return '';
	return h.name || h.houseName || h.palaceName || '';
}

// 一宫的完整结构化数据
function buildPalaceObj(chart, idx, label){
	if(!chart || !chart.houses) return null;
	const h = chart.houses[idx] || {};
	return {
		label,
		houseIndex: idx,
		palaceName: getHouseName(h),
		ganZhi: getHouseGanZhi(h),
		zhi: h.zhi || (typeof h.ganzi === 'string' ? h.ganzi.slice(-1) : '') || ZHI[idx] || '',
		stars: collectAllStarsZw(h),
	};
}

// ============ 紫微·身宫位置提取(v1.16 新增) ============

// 身宫位置: chart.bodyMaster 是身主星名,通过反查它落在哪个 house 来定位
// fallback: chart.bodyHouseIndex / chart.shenIndex 直接字段(若后端有)
export function extractZwBodyPalace(chart){
	if(!chart || !chart.houses) return null;
	// 直接字段优先
	if(chart.bodyHouseIndex != null) return buildPalaceObj(chart, chart.bodyHouseIndex, '身宫');
	if(chart.shenIndex != null) return buildPalaceObj(chart, chart.shenIndex, '身宫');
	// 反查 bodyMaster 星名
	const bodyStar = chart.bodyMaster;
	if(!bodyStar) return null;
	for(let i=0; i<chart.houses.length; i++){
		const stars = collectAllStarsZw(chart.houses[i]);
		// 星名可能含 (庙)(化禄) 后缀,做 startsWith 匹配
		if(stars.some((s)=>s === bodyStar || s.startsWith(bodyStar))) {
			return buildPalaceObj(chart, i, '身宫');
		}
	}
	return null;
}

export function extractZwLifePalace(chart){
	if(!chart || !chart.houses) return null;
	if(chart.lifeHouseIndex != null) return buildPalaceObj(chart, chart.lifeHouseIndex, '命宫');
	// fallback 按宫名找
	const i = findZwPalaceIndex(chart, '命');
	return i >= 0 ? buildPalaceObj(chart, i, '命宫') : null;
}

// ============ 紫微·三方四正/大限/流年 ============

export function extractZwNatalSanhe(chart, palaceKey){
	if(!chart || !chart.houses) return null;
	const palaceCn = ZW_PALACE_KEY_TO_CN[palaceKey] || palaceKey;
	const baseIdx = findZwPalaceIndex(chart, palaceCn);
	if(baseIdx < 0) return null;
	return {
		baseIdx,
		palaces: [
			buildPalaceObj(chart, baseIdx, '本宫'),
			buildPalaceObj(chart, (baseIdx+6) % 12, '对宫'),
			buildPalaceObj(chart, (baseIdx+4) % 12, '三合宫A'),
			buildPalaceObj(chart, (baseIdx+8) % 12, '三合宫B'),
		],
	};
}

export function extractZwCurrentDaxian(chart, currentAge){
	if(!chart || !chart.houses) return null;
	if(currentAge == null) return null;
	let mingIdx = -1;
	for(let i=0; i<chart.houses.length; i++){
		const h = chart.houses[i];
		if(!h || !h.direction || h.direction.length < 2) continue;
		if(h.direction[0] <= currentAge && currentAge <= h.direction[1]){
			mingIdx = i;
			break;
		}
	}
	if(mingIdx < 0) return null;
	const range = chart.houses[mingIdx].direction;
	return {
		mingIdx,
		ageRange: range,
		ageRangeText: `${range[0]}-${range[1]}岁`,
		palaces: [
			buildPalaceObj(chart, mingIdx, '运命宫'),
			buildPalaceObj(chart, (mingIdx+6) % 12, '运迁移宫'),
			buildPalaceObj(chart, (mingIdx+4) % 12, '运财帛宫'),
			buildPalaceObj(chart, (mingIdx+8) % 12, '运官禄宫'),
		],
	};
}

export function extractZwAllDaxian(chart){
	if(!chart || !chart.houses) return [];
	const out = [];
	for(let i=0; i<chart.houses.length; i++){
		const h = chart.houses[i];
		if(!h || !h.direction || h.direction.length < 2) continue;
		out.push({
			houseIndex: i,
			palaceName: getHouseName(h),
			ganZhi: getHouseGanZhi(h),
			ageRangeText: `${h.direction[0]}-${h.direction[1]}岁`,
			stars: collectAllStarsZw(h),
		});
	}
	out.sort((a, b)=>{
		const sa = parseInt(a.ageRangeText.split('-')[0], 10);
		const sb = parseInt(b.ageRangeText.split('-')[0], 10);
		return sa - sb;
	});
	return out;
}

function yearToGanZhi(year){
	// 公元 4 年 = 甲子年
	const idx = ((year - 4) % 60 + 60) % 60;
	const ganIdx = idx % 10;
	const zhiIdx = idx % 12;
	return { gan: GAN[ganIdx], zhi: ZHI[zhiIdx], ganZhi: GAN[ganIdx]+ZHI[zhiIdx], zhiIdx };
}

export function extractZwLiunianSeries(chart, currentYear, currentAge, count){
	if(!chart || !chart.houses || currentYear == null) return [];
	const N = count || 10;
	const out = [];
	for(let i=0; i<N; i++){
		const year = currentYear + i;
		const { gan, zhi, ganZhi } = yearToGanZhi(year);
		// 🔴 流年命宫 = 地支==流年地支 的宫位（按 ganzi 搜，不能用地支序号当下标）。
		const liuMingIdx = zwHouseIdxByBranch(chart, zhi);
		if(liuMingIdx < 0) continue; // 找不到对应地支宫位 → 跳过该年，不臆造错位数据
		out.push({
			year,
			age: currentAge != null ? currentAge + i : null,
			ganZhi, gan, zhi,
			palaces: [
				buildPalaceObj(chart, liuMingIdx, '流命宫'),
				buildPalaceObj(chart, (liuMingIdx+6) % 12, '流迁移宫'),
				buildPalaceObj(chart, (liuMingIdx+4) % 12, '流财帛宫'),
				buildPalaceObj(chart, (liuMingIdx+8) % 12, '流官禄宫'),
			],
		});
	}
	return out;
}

// ============ 紫微·v1.16 新增格式化函数 ============

// 全 12 宫 overview(任何节都注入,让 AI 看到完整宫位↔地支↔星曜映射)
export function formatZw12PalacesOverview(chart){
	if(!chart || !chart.houses) return '';
	const lines = [`【全 12 宫 ground-truth · 代码计算 · 必须严格使用 · 禁止编造任何宫位/干支/星曜】`];
	for(let i=0; i<chart.houses.length; i++){
		const h = chart.houses[i] || {};
		const name = getHouseName(h);
		const gz = getHouseGanZhi(h);
		const stars = collectAllStarsZw(h);
		const starsText = stars.length ? stars.join('、') : '(无主辅星)';
		const dir = h.direction && h.direction.length === 2 ? `[大限${h.direction[0]}-${h.direction[1]}岁]` : '';
		lines.push(`  ${name}【${gz}】${dir}：${starsText}`);
	}
	return lines.join('\n');
}

// 命/身宫专属块(v1.16 新增,防 AI 把身宫位置写错)
export function formatZwMingShenPalace(chart){
	if(!chart || !chart.houses) return '';
	const ming = extractZwLifePalace(chart);
	const shen = extractZwBodyPalace(chart);
	const lines = [`【命宫 + 身宫 ground-truth · 代码定位 · 禁止编造身宫位置】`];
	if(ming){
		lines.push(`  命宫【${ming.palaceName}·${ming.ganZhi}】：${ming.stars.join('、') || '(无主辅星)'}`);
	} else {
		lines.push(`  命宫: (chart.lifeHouseIndex 缺失)`);
	}
	if(shen){
		const overlap = ming && shen.houseIndex === ming.houseIndex ? '（与命宫同宫）' : `（落在原盘${shen.palaceName}位置）`;
		lines.push(`  身宫【${shen.palaceName}·${shen.ganZhi}】${overlap}：${shen.stars.join('、') || '(无主辅星)'}`);
	} else {
		lines.push(`  身宫: (chart.bodyMaster 或字段缺失,无法定位 — 此节涉及身宫时必须明说"无法判断")`);
	}
	if(chart.lifeMaster) lines.push(`  命主星: ${chart.lifeMaster}`);
	if(chart.bodyMaster) lines.push(`  身主星: ${chart.bodyMaster}`);
	if(chart.wuxingJuText) lines.push(`  五行局: ${chart.wuxingJuText}`);
	return lines.join('\n');
}

// 生年四化全表(v1.16 新增,防 AI 编四化落宫)
export function formatZwShengNianSihua(chart){
	if(!chart || !chart.houses) return '';
	const yearGan = chart.yearGan || (chart.bazi && chart.bazi.year && chart.bazi.year.charAt && chart.bazi.year.charAt(0)) || '';
	if(!yearGan) return '';
	// 用代码计算: 遍历 12 宫,每宫的星曜如带"生年禄/权/科/忌"或类似标记,列出来
	const huaTypes = ['禄','权','科','忌'];
	const lines = [`【生年四化 ground-truth · 生年天干 ${yearGan} · 代码定位 · 禁止编造】`];
	let hasAny = false;
	for(let i=0; i<chart.houses.length; i++){
		const h = chart.houses[i] || {};
		const name = getHouseName(h);
		const gz = getHouseGanZhi(h);
		const groups = ['starsMain','starsAssist','starsEvil','starsOthersGood','starsOthersBad','starsSmall','stars'];
		groups.forEach((key)=>{
			const arr = h[key] || [];
			arr.forEach((s)=>{
				if(typeof s !== 'object' || !s) return;
				const sname = s.name || s.cn_name || '';
				// 检查 sihua/hua 字段或 brightness 字段含"生年X"
				const hua = s.hua || s.sihua || '';
				const bright = s.brightness || s.miaowang || s.bright || '';
				if(hua && huaTypes.indexOf(hua) >= 0){
					lines.push(`  ${sname}化${hua}（落 ${name}【${gz}】）`);
					hasAny = true;
				}
				// 兼容: brightness 字段含"生年禄/权/科/忌"
				if(/生年[禄权科忌]|^[禄权科忌]$/.test(bright)){
					const m = bright.match(/[禄权科忌]/);
					if(m){
						lines.push(`  ${sname}${bright}（落 ${name}【${gz}】）`);
						hasAny = true;
					}
				}
			});
		});
	}
	if(!hasAny){
		lines.push(`  (chart 中未找到生年四化标注,跳过)`);
	}
	return lines.join('\n');
}

// 来因宫(v1.16 新增)
export function formatZwLaiyin(chart){
	if(!chart || !chart.houses) return '';
	const yearGan = chart.yearGan;
	if(!yearGan) return '';
	const laiyin = [];
	for(let i=0; i<chart.houses.length; i++){
		const h = chart.houses[i] || {};
		const gz = getHouseGanZhi(h);
		if(gz && gz.charAt(0) === yearGan){
			laiyin.push(`${getHouseName(h)}【${gz}】`);
		}
	}
	if(!laiyin.length) return '';
	return `【来因宫 ground-truth · 生年天干 ${yearGan} 落宫】\n  ${laiyin.join('、')}`;
}

// ============ 紫微·格式化输出 ============

function formatSanheBlock(arr, title){
	if(!arr || !arr.palaces) return '';
	const lines = [`【${title} · 代码计算·必须严格使用本块·禁止凭训练数据补充任何星曜或宫位】`];
	arr.palaces.forEach((p)=>{
		if(!p) return;
		const stars = p.stars && p.stars.length ? p.stars.join('、') : '(本宫无主辅星 — 须借对宫主星论)';
		const gz = p.ganZhi ? `·${p.ganZhi}` : '';
		lines.push(`  ${p.label}【${p.palaceName}${gz}】：${stars}`);
	});
	return lines.join('\n');
}

function formatDaxianBlock(daxian){
	if(!daxian) return '';
	return formatSanheBlock(
		{ palaces: daxian.palaces },
		`当前大限·${daxian.ageRangeText}·运限三方四正`
	);
}

function formatAllDaxianBlock(list){
	if(!list || !list.length) return '';
	const lines = [`【全部 10 步大限·代码计算·必须严格使用本块·禁止凭训练数据编造】`];
	list.forEach((d, i)=>{
		const stars = d.stars && d.stars.length ? d.stars.join('、') : '(无主辅星)';
		lines.push(`  第${i+1}步 ${d.ageRangeText} 运命宫【${d.palaceName}·${d.ganZhi}】：${stars}`);
	});
	return lines.join('\n');
}

function formatLiunianBlock(series){
	if(!series || !series.length) return '';
	const lines = [`【未来 ${series.length} 年流年逐年三方四正·代码计算·必须严格使用本块·禁止凭训练数据编造干支或宫位】`];
	series.forEach((y)=>{
		lines.push(`\n[${y.year} 年·${y.ganZhi}·${y.age != null ? y.age + '岁' : ''}]`);
		y.palaces.forEach((p)=>{
			if(!p) return;
			const stars = p.stars && p.stars.length ? p.stars.join('、') : '(无主辅星)';
			const gz = p.ganZhi ? `·${p.ganZhi}` : '';
			lines.push(`  ${p.label}【${p.palaceName}${gz}】：${stars}`);
		});
	});
	return lines.join('\n');
}

// ============ 紫微主入口(v1.16 全节注入基础块) ============

export function buildZiweiSectionData(chart, sectionKey, currentAge, currentYear){
	if(!chart || !chart.houses) return '';
	const key = `${sectionKey}`;
	const parts = [];

	// ① 基础三件套(所有节都注入): 12 宫 overview + 命/身宫 + 生年四化 + 来因宫
	const overview = formatZw12PalacesOverview(chart);
	const mingshen = formatZwMingShenPalace(chart);
	const sihua = formatZwShengNianSihua(chart);
	const laiyin = formatZwLaiyin(chart);
	if(overview) parts.push(overview);
	if(mingshen) parts.push(mingshen);
	if(sihua) parts.push(sihua);
	if(laiyin) parts.push(laiyin);

	// ② 节专属块
	// 单宫节: 该宫三方四正
	if(ZW_SECTION_TO_PALACE[key]){
		const sanhe = extractZwNatalSanhe(chart, ZW_SECTION_TO_PALACE[key]);
		if(sanhe){
			const palaceCn = ZW_PALACE_KEY_TO_CN[ZW_SECTION_TO_PALACE[key]] || '';
			parts.push(formatSanheBlock(sanhe, `本节专属·本命${palaceCn}宫三方四正`));
		}
	}
	// 大限节
	if(/^(daxian|dayun)$/i.test(key)){
		const cur = extractZwCurrentDaxian(chart, currentAge);
		const all = extractZwAllDaxian(chart);
		if(cur) parts.push(formatDaxianBlock(cur));
		else if(currentAge != null) parts.push(`【当前大限 fallback】无法精确定位当前 ${currentAge} 岁所在大限(可能 chart.houses 缺 direction 字段), 以下为全部大限供参考:`);
		parts.push(formatAllDaxianBlock(all));
	}
	// 流年节
	if(/^(liunian|liuyue|liunian_liuyue)$/i.test(key)){
		const series = extractZwLiunianSeries(chart, currentYear, currentAge, 10);
		const cur = extractZwCurrentDaxian(chart, currentAge);
		if(cur) parts.push(formatDaxianBlock(cur));
		if(series.length) parts.push(formatLiunianBlock(series));
	}

	return parts.filter(Boolean).join('\n\n');
}

// ============ 八字 (v1.16 字段名根治) ============

// 🔴 后端 /bazi/direct 的真实大运字段是 bazi.direction[]（FateDirect：{startYear, age=起运岁,
//    mainDirect:{ganzi=大运干支}, subDirect[]=该运 10 个流年}），**没有** bazi.mainDirection 字段。
//    历史 bug：大运 extractor 误读不存在的 bazi.mainDirection → 永远空 → 报告里「当前大运无法定位/命盘未含 mainDirection」。
//    统一规范器：优先 bazi.direction[]，回退旧别名(mainDirection/luckyDecade/dayun/lucky)，产出 {ganzi, year, age} 列表。
//    （流年 extractor extractBaziLiunianFromBackend 早已读对 bazi.direction[].subDirect，本修复让大运与之同源。）
export function resolveBaziDayunList(bazi){
	if(!bazi) return [];
	if(Array.isArray(bazi.direction) && bazi.direction.length){
		return bazi.direction.map((d)=>({
			ganzi: (d && d.mainDirect && (d.mainDirect.ganzi || d.mainDirect.ganZhi)) || (d && (d.ganzi || d.ganZhi)) || '',
			year: (d && d.startYear != null) ? Number(d.startYear) : ((d && d.year != null) ? Number(d.year) : null),
			age: (d && d.age != null) ? Number(d.age) : null,
			raw: d,
		})).filter((x)=>x.ganzi || x.year != null);
	}
	const legacy = bazi.mainDirection || bazi.luckyDecade || bazi.dayun || bazi.lucky;
	return Array.isArray(legacy) ? legacy : [];
}

// item.year(起年) + item.ganzi(或 item.ganZhi) + 可推 endYear=nextItem.year-1
export function extractBaziCurrentDayun(bazi, currentAge, currentYear){
	if(!bazi) return null;
	const list = resolveBaziDayunList(bazi);
	if(!Array.isArray(list) || !list.length) return null;
	// 优先用 year (公历年) 匹配, fallback 用 startAge/endAge
	if(currentYear != null){
		for(let i=0; i<list.length; i++){
			const cur = list[i];
			const next = list[i+1];
			if(!cur) continue;
			const curYear = Number(cur.year != null ? cur.year : cur.startYear);
			const nextYear = next ? Number(next.year != null ? next.year : next.startYear) : (curYear + 10);
			if(Number.isFinite(curYear) && curYear <= currentYear && currentYear < nextYear){
				return {
					ganZhi: cur.ganzi || cur.ganZhi || cur.gz || cur.name || '',
					startYear: curYear,
					endYear: nextYear - 1,
					startAge: cur.age != null ? Number(cur.age) : (currentAge != null ? currentAge - (currentYear - curYear) : null),
					endAge: cur.age != null ? Number(cur.age) + (nextYear - curYear - 1) : null,
					index: i,
					raw: cur,
				};
			}
		}
	}
	// fallback: 用 startAge/endAge
	if(currentAge != null){
		for(let i=0; i<list.length; i++){
			const d = list[i];
			if(!d) continue;
			const startAge = d.age != null ? Number(d.age) : (d.startAge != null ? Number(d.startAge) : (d.start != null ? Number(d.start) : null));
			const endAge = d.endAge != null ? Number(d.endAge) : (startAge != null ? startAge + 9 : null);
			if(startAge != null && endAge != null && startAge <= currentAge && currentAge <= endAge){
				return {
					ganZhi: d.ganzi || d.ganZhi || d.gz || d.name || '',
					startAge, endAge,
					startYear: d.year != null ? Number(d.year) : null,
					endYear: d.year != null ? Number(d.year) + 9 : null,
					index: i,
					raw: d,
				};
			}
		}
	}
	return null;
}

// 全 10 步大运
export function extractBaziAllDayun(bazi){
	if(!bazi) return [];
	const list = resolveBaziDayunList(bazi);
	if(!Array.isArray(list)) return [];
	return list.map((d, i)=>({
		index: i,
		ganZhi: d.ganzi || d.ganZhi || d.gz || d.name || '',
		startYear: d.year != null ? Number(d.year) : (d.startYear != null ? Number(d.startYear) : null),
		startAge: d.age != null ? Number(d.age) : (d.startAge != null ? Number(d.startAge) : null),
		raw: d,
	}));
}

// 八字流年 — 优先从后端 bazi.direction[].subDirect[] 拿真实干支(最准)
export function extractBaziLiunianFromBackend(bazi, currentYear, currentAge, count){
	if(!bazi || !Array.isArray(bazi.direction)) return [];
	const N = count || 10;
	const out = [];
	for(let bi=0; bi<bazi.direction.length; bi++){
		const block = bazi.direction[bi];
		if(!block) continue;
		const startYearNum = block.startYear != null ? Number(block.startYear) : null;
		const startAgeNum = block.age != null ? Number(block.age) : null;
		const dayunGz = (block.mainDirect && (block.mainDirect.ganzi || block.mainDirect.ganZhi)) || '';
		const subs = Array.isArray(block.subDirect) ? block.subDirect : [];
		subs.forEach((sub, subIdx)=>{
			if(!sub) return;
			const year = sub.year != null ? Number(sub.year) : (Number.isFinite(startYearNum) ? startYearNum + subIdx : null);
			const age = Number.isFinite(startAgeNum) ? startAgeNum + subIdx : null;
			const gz = sub.ganzi || sub.ganZhi || sub.gz || '';
			if(year != null && gz){
				out.push({ year, age, ganZhi: gz, dayunGz, blockIdx: bi });
			}
		});
	}
	// 过滤: 只保留 currentYear 起的未来 N 年
	if(currentYear != null){
		const filtered = out.filter((y)=>y.year >= currentYear).slice(0, N);
		if(filtered.length) return filtered;
	}
	return out.slice(0, N);
}

// 公历换算流年(fallback 用,当后端没 direction 时)
export function extractBaziLiunianSeries(currentYear, currentAge, count){
	if(currentYear == null) return [];
	const N = count || 10;
	const out = [];
	for(let i=0; i<N; i++){
		const year = currentYear + i;
		const { ganZhi, gan, zhi } = yearToGanZhi(year);
		out.push({
			year,
			age: currentAge != null ? currentAge + i : null,
			ganZhi, gan, zhi,
		});
	}
	return out;
}

// 四柱完整快照
function formatBaziFourColumns(bazi){
	if(!bazi) return '';
	const four = bazi.fourColumns || {};
	const cols = ['year','month','day','time'];
	const colNames = { year:'年柱', month:'月柱', day:'日柱', time:'时柱' };
	const lines = ['【四柱完整数据·后端字段·必须严格使用】'];
	cols.forEach((k)=>{
		const c = four[k];
		if(!c) return;
		const gz = c.ganzi || c.ganZhi || `${c.gan || c.tg || ''}${c.zhi || c.dz || ''}`;
		const ganShen = c.ganShen || c.tgShen || '';
		const zhiCang = c.zhiCang || c.dzCang || c.canggan || '';
		const naYin = c.naYin || c.nayin || '';
		const xunKong = c.xunKong || c.kongwang || '';
		const parts = [gz];
		if(ganShen) parts.push(`天干十神:${ganShen}`);
		if(zhiCang) parts.push(`地支藏干:${zhiCang}`);
		if(naYin) parts.push(`纳音:${naYin}`);
		if(xunKong) parts.push(`旬空:${xunKong}`);
		lines.push(`  ${colNames[k]}: ${parts.join(' | ')}`);
	});
	// 加胎元/命宫/身宫
	['tai','ming','shen'].forEach((k)=>{
		const c = four[k];
		if(!c) return;
		const gz = c.ganzi || c.ganZhi || `${c.gan || c.tg || ''}${c.zhi || c.dz || ''}`;
		const cnName = { tai:'胎元', ming:'命宫', shen:'身宫' }[k];
		if(gz) lines.push(`  ${cnName}: ${gz}`);
	});
	return lines.join('\n');
}

// 大运全表 + 当前
function formatBaziDayunBlock(bazi, currentAge, currentYear){
	const all = extractBaziAllDayun(bazi);
	const cur = extractBaziCurrentDayun(bazi, currentAge, currentYear);
	const lines = ['【大运 ground-truth · 后端字段 bazi.direction[].mainDirect · 必须严格使用】'];
	if(cur){
		const ageRange = cur.startAge != null && cur.endAge != null ? ` (${cur.startAge}-${cur.endAge}岁)` : '';
		const yearRange = cur.startYear != null && cur.endYear != null ? ` [${cur.startYear}-${cur.endYear}]` : '';
		lines.push(`  ★ 当前大运: ${cur.ganZhi}${ageRange}${yearRange} (第${cur.index+1}步)`);
	} else if(currentAge != null) {
		lines.push(`  ★ 当前大运: 无法定位 (currentAge=${currentAge}, 命盘可能未含 mainDirection 字段) — 此节涉及大运时必须明说"无法判断"`);
	}
	if(all.length){
		lines.push(`  全 ${all.length} 步大运:`);
		all.forEach((d)=>{
			const ageStr = d.startAge != null ? `${d.startAge}岁起` : '';
			const yrStr = d.startYear != null ? `${d.startYear}起` : '';
			lines.push(`    第${d.index+1}步: ${d.ganZhi} ${ageStr} ${yrStr}`.trim());
		});
	}
	return lines.join('\n');
}

// 流年块
function formatBaziLiunianBlock(bazi, currentYear, currentAge){
	const fromBackend = extractBaziLiunianFromBackend(bazi, currentYear, currentAge, 10);
	const lines = ['【未来流年 ground-truth · 后端字段 bazi.direction[].subDirect · 必须严格使用 · 禁止编造】'];
	if(fromBackend.length){
		fromBackend.forEach((y)=>{
			const ageStr = y.age != null ? ` (${y.age}岁)` : '';
			const dayunStr = y.dayunGz ? ` [大运:${y.dayunGz}]` : '';
			lines.push(`  ${y.year}年: ${y.ganZhi}${ageStr}${dayunStr}`);
		});
	} else {
		// fallback 公历换算
		const series = extractBaziLiunianSeries(currentYear, currentAge, 10);
		lines.push(`  (后端未提供 direction.subDirect, 改用公历换算)`);
		series.forEach((y)=>{
			lines.push(`  ${y.year}年: ${y.ganZhi}${y.age != null ? ` (${y.age}岁)` : ''}`);
		});
	}
	return lines.join('\n');
}

// 神煞快照 (从 bazi.shensha 或 fourColumns 各柱的 shensha 提取)
function formatBaziShensha(bazi){
	if(!bazi) return '';
	const four = bazi.fourColumns || {};
	const lines = ['【神煞 ground-truth · 后端 fourColumns 各柱 shensha】'];
	let hasAny = false;
	['year','month','day','time'].forEach((k)=>{
		const c = four[k];
		if(!c) return;
		const ss = c.shensha || c.shenSha || c.ss || '';
		const cnName = { year:'年柱', month:'月柱', day:'日柱', time:'时柱' }[k];
		if(ss){
			lines.push(`  ${cnName}: ${typeof ss === 'string' ? ss : (Array.isArray(ss) ? ss.join('、') : JSON.stringify(ss))}`);
			hasAny = true;
		}
	});
	return hasAny ? lines.join('\n') : '';
}

// ============ 八字主入口(v1.16) ============

export function buildBaziSectionData(bazi, sectionKey, currentAge, currentYear){
	if(!bazi) return '';
	const parts = [];

	// ① 基础三件套(所有节都注入)
	const fc = formatBaziFourColumns(bazi);
	if(fc) parts.push(fc);
	const dayunBlock = formatBaziDayunBlock(bazi, currentAge, currentYear);
	if(dayunBlock) parts.push(dayunBlock);
	const liunianBlock = formatBaziLiunianBlock(bazi, currentYear, currentAge);
	if(liunianBlock) parts.push(liunianBlock);
	const ssBlock = formatBaziShensha(bazi);
	if(ssBlock) parts.push(ssBlock);

	// ② 节关键字段提示
	const BAZI_PALACE_HINT = {
		career_wealth: ['财星位置','官星位置','日主旺衰','食伤'],
		marriage:      ['日支(配偶宫)','配偶星(男看财、女看官)','桃花','合冲'],
		health:        ['日主五行','弱衰旺','五行配脏'],
		yongshen:      ['调候用神','扶抑用神','病药用神','格局喜忌'],
		liuqin:        ['年柱(父母)','月柱(兄弟)','日支(配偶)','时柱(子女)'],
		xueye:         ['印星','文昌','华盖'],
		xingge:        ['日主性情','十神组合'],
	};
	const hint = BAZI_PALACE_HINT[sectionKey];
	if(hint && hint.length){
		parts.push(`【本节须重点检视的字段】\n  ${hint.map((h)=>`- ${h}`).join('\n  ')}`);
	}

	return parts.filter(Boolean).join('\n\n');
}

// ============ 通用 validate 工具 (v1.16-C) ============

// 验证 chartObj/baziObj 是否完整可用,返回 { ok: bool, reason: string }
export function validateChartObj(chart, technique){
	if(technique === 'ziwei'){
		if(!chart) return { ok: false, reason: '紫微 chart 对象为 null' };
		if(!chart.houses || !Array.isArray(chart.houses)) return { ok: false, reason: 'chart.houses 不是数组' };
		if(chart.houses.length !== 12) return { ok: false, reason: `chart.houses.length=${chart.houses.length} (应为12)` };
		const sample = chart.houses[0];
		if(!sample) return { ok: false, reason: 'chart.houses[0] 为空' };
		const name = getHouseName(sample);
		const gz = getHouseGanZhi(sample);
		if(!name) return { ok: false, reason: 'chart.houses[0] 缺 name/houseName 字段' };
		if(!gz) return { ok: false, reason: 'chart.houses[0] 缺 ganzi/ganZhi 字段' };
		return { ok: true, reason: 'OK' };
	}
	if(technique === 'bazi'){
		if(!chart) return { ok: false, reason: '八字 bazi 对象为 null' };
		const hasMainDir = chart.mainDirection && chart.mainDirection.length > 0;
		const hasDirection = chart.direction && chart.direction.length > 0;
		const hasFour = chart.fourColumns && Object.keys(chart.fourColumns).length > 0;
		if(!hasFour) return { ok: false, reason: 'bazi.fourColumns 缺失' };
		if(!hasMainDir && !hasDirection) return { ok: false, reason: 'bazi.mainDirection 和 bazi.direction 都缺,无法提取大运/流年' };
		return { ok: true, reason: 'OK' };
	}
	return { ok: false, reason: `未知 technique: ${technique}` };
}
