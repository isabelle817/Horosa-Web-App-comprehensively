// 汉堡学派（Uranian）中点盘核心引擎 —— 纯函数、可单测。
// 盘基: 90/45/22.5/11.25 = 谐波 4/8/16/32。投影/中点/同轴读数/中点树。

export const DIAL_BASES = [90, 45, 22.5, 11.25];

const norm360 = (x) => ((x % 360) + 360) % 360;

// 黄经 → 盘面视觉角(0..360)，在一个 base 周期内压缩一圈。
export function projectToDial(lon, base){
	return (norm360(lon) % base) / base * 360;
}

// 近轴中点（与后端 midpoint.py 同口径）。
export function midpoint(a, b){
	let m = norm360((a + b) / 2);
	if (Math.abs(m - norm360(a)) > 90) m = norm360(m + 180);
	return m;
}

// 两点在 base 盘上的最短角距（折算回黄道度）。
export function dialSeparation(lonA, lonB, base){
	const d = Math.abs(norm360(lonA - lonB) % base);
	return Math.min(d, base - d);
}

// 个人点（Basic Six：日月+Asc/MC+南北交+白羊点）——扫描默认只显含个人点的图，减少过载（spec §5.5）。
const isP = (id, personal) => !personal || personal.has(id);

// 指针读数：盘上与 cursor 同轴(orb 内)的 ①星体 ②中点(A/B) —— 即汉堡 planetary picture 读法。
// points: [{ id, lon }]（行星+三王+北交+Asc/MC+8 TNP+白羊点）。opts.personal = Set 时只显含个人点的图。
export function cursorReadout(points, cursorLon, base, orb, opts){
	const personal = opts && opts.onlyPersonal && opts.personal ? opts.personal : null;
	const hits = [];
	for (let i = 0; i < points.length; i++){
		const sep = dialSeparation(points[i].lon, cursorLon, base);
		if (sep <= orb && isP(points[i].id, personal)) hits.push({ kind: 'body', id: points[i].id, sep });
	}
	for (let i = 0; i < points.length; i++){
		for (let j = i + 1; j < points.length; j++){
			const sep = dialSeparation(midpoint(points[i].lon, points[j].lon), cursorLon, base);
			if (sep <= orb && (!personal || personal.has(points[i].id) || personal.has(points[j].id))) hits.push({ kind: 'mid', a: points[i].id, b: points[j].id, sep });
		}
	}
	return hits.sort((x, y) => x.sep - y.sep);
}

// 中点树：给定点 P 列其完成的所有半和 A/B。行星图(A+B=C+D)由多个半和同轴自然涌现。
export function midpointTree(points, base, orb, opts){
	const personal = opts && opts.onlyPersonal && opts.personal ? opts.personal : null;
	const tree = {};
	for (let k = 0; k < points.length; k++){
		const p = points[k];
		if (personal && !personal.has(p.id)) continue; // 只围绕个人点展开
		const rows = [];
		for (let i = 0; i < points.length; i++){
			for (let j = i + 1; j < points.length; j++){
				if (points[i].id === p.id || points[j].id === p.id) continue;
				const sep = dialSeparation(midpoint(points[i].lon, points[j].lon), p.lon, base);
				if (sep <= orb) rows.push({ a: points[i].id, b: points[j].id, sep });
			}
		}
		if (rows.length) tree[p.id] = rows.sort((x, y) => x.sep - y.sep);
	}
	return tree;
}

// 防重叠字形避让(与全站星盘 desposeStars 同思路：挤在一起就把字形沿环顶开 + 连线指回真位)。
// items: [{ displayAngle, ... }]；返回按角排序 + 每项附 glyphAngle(避让后画字形)，displayAngle 仍是真位(画小点)。
export function spreadDialAngles(items, minGap){
	const norm = (x) => ((x % 360) + 360) % 360;
	const sorted = items.map((it) => ({ ...it, displayAngle: norm(it.displayAngle) })).sort((a, b) => a.displayAngle - b.displayAngle);
	let last = -Infinity;
	for (let i = 0; i < sorted.length; i++){
		let g = sorted[i].displayAngle;
		if (g - last < minGap) g = last + minGap;
		sorted[i].glyphAngle = g;
		last = g;
	}
	return sorted;
}

// ── 映点 Spiegelpunkte(汉堡/古典通用)─────────────────────────────
// antiscion(回照)= 跨「日至轴」0°巨蟹/0°摩羯 镜像;contraAntiscion(对映)= 跨「分至轴」0°白羊/0°天秤 镜像。
// 校验:15°白羊(15)→ 回照 165(15°处女)、对映 345(15°双鱼)。公式与 Swiss Ephemeris/古典占星口径一致。
export function antiscion(lon){ return norm360(180 - lon); }
export function contraAntiscion(lon){ return norm360(360 - lon); }

// ── 行星图 Planetenbilder:敏感点和差式 A + B − C = D ───────────────
// 以「锚点」(个人点/TNP)为 A|B,遍历 C、D;D 落在 (A+B−C) 的 orb 内即一张行星图。
// points:[{id,lon}]。opts.personal / opts.uranian = Set(剪枝 + 排序:含个人点 > 含 TNP > 其他)。
// opts.limit 默认 40(防 O(n⁴) 组合过载,只截最相关者)。去重键 sorted(A,B)|C|D(A,B 对称)。
export function planetaryPictures(points, base, orb, opts){
	const personal = (opts && opts.personal) ? opts.personal : null;
	const uranian = (opts && opts.uranian) ? opts.uranian : null;
	const limit = (opts && opts.limit) ? opts.limit : 40;
	const anchorAll = !personal && !uranian;
	const isAnchor = (id) => anchorAll || (personal && personal.has(id)) || (uranian && uranian.has(id));
	const out = []; const seen = new Set(); const n = points.length;
	for (let i = 0; i < n; i++){
		for (let j = 0; j < n; j++){
			if (i === j) continue;
			const A = points[i], B = points[j];
			if (!isAnchor(A.id) && !isAnchor(B.id)) continue; // 至少一锚点
			for (let k = 0; k < n; k++){
				if (k === i || k === j) continue;
				const C = points[k];
				const lon = norm360(A.lon + B.lon - C.lon);
				for (let m = 0; m < n; m++){
					if (m === i || m === j || m === k) continue;
					const D = points[m];
					const sep = dialSeparation(lon, D.lon, base);
					if (sep > orb) continue;
					const key = [A.id, B.id].sort().join('|') + '|' + C.id + '|' + D.id;
					if (seen.has(key)) continue;
					seen.add(key);
					const ids = [A.id, B.id, C.id, D.id];
					const hasPersonal = personal ? ids.some((id) => personal.has(id)) : false;
					const hasTnp = uranian ? ids.some((id) => uranian.has(id)) : false;
					out.push({ a: A.id, b: B.id, c: C.id, d: D.id, lon, sep, hasPersonal, hasTnp });
				}
			}
		}
	}
	const rank = (p) => (p.hasPersonal ? 0 : (p.hasTnp ? 1 : 2));
	return out.sort((x, y) => rank(x) - rank(y) || x.sep - y.sep).slice(0, limit);
}

// ── 中点扁平表:所有无序对的近中点,按 含个人点 > 含 TNP > 其他 再按盘位排序 ──
// 供「中点列表」面板与 AI 导出(树视图之外的可检索清单)。每对只算一个近中点(与 midpoint() 同口径)。
export function midpointList(points, base, opts){
	const personal = (opts && opts.personal) ? opts.personal : null;
	const uranian = (opts && opts.uranian) ? opts.uranian : null;
	const out = [];
	for (let i = 0; i < points.length; i++){
		for (let j = i + 1; j < points.length; j++){
			const A = points[i], B = points[j];
			const lon = midpoint(A.lon, B.lon);
			const hasPersonal = personal ? (personal.has(A.id) || personal.has(B.id)) : false;
			const hasTnp = uranian ? (uranian.has(A.id) || uranian.has(B.id)) : false;
			out.push({ a: A.id, b: B.id, lon, dial: projectToDial(lon, base), hasPersonal, hasTnp });
		}
	}
	const rank = (p) => (p.hasPersonal ? 0 : (p.hasTnp ? 1 : 2));
	return out.sort((x, y) => rank(x) - rank(y) || x.lon - y.lon);
}

// ── 映点接触 Spiegelpunkt:B 落在 A 的回照(180−lonA)折叠盘位 orb 内即一对接触 ──
// 注:90°/45°/22.5° 盘上「回照」与「对映」相差 180°≡0(折叠重合),故盘上为单一「映点」概念,
//   不再区分 anti/contra(那只在 360° 全圈才有别)。供「映点」面板与盘上标记。
export function spiegelContacts(points, base, orb, opts){
	const personal = (opts && opts.personal) ? opts.personal : null;
	const uranian = (opts && opts.uranian) ? opts.uranian : null;
	const out = [];
	for (let i = 0; i < points.length; i++){
		for (let j = i + 1; j < points.length; j++){
			const A = points[i], B = points[j];
			const sep = dialSeparation(antiscion(A.lon), B.lon, base);
			if (sep > orb) continue;
			const hasPersonal = personal ? (personal.has(A.id) || personal.has(B.id)) : false;
			const hasTnp = uranian ? (uranian.has(A.id) || uranian.has(B.id)) : false;
			out.push({ a: A.id, b: B.id, sep, hasPersonal, hasTnp });
		}
	}
	const rank = (p) => (p.hasPersonal ? 0 : (p.hasTnp ? 1 : 2));
	return out.sort((x, y) => rank(x) - rank(y) || x.sep - y.sep);
}
