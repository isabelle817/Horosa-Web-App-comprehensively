// 应期参考（最保守，解读层）：只给「可能应期方向」，绝不下「必应于 X」死结论。纯函数，只读 context。

export function computeYingQi(ctx){
	if(!ctx){ return []; }
	const uniq = (a)=>Array.from(new Set((a || []).map((x)=>`${x || ''}`.substring(0, 1)).filter(Boolean)));
	const out = [];
	const kong = uniq(ctx.xunKongBranches);
	if(kong.length){
		out.push({ method: '旬空填实', dirs: kong, note: '空亡之神待「填实」（值其年 / 月 / 日支之期）多应。' });
	}
	const ma = uniq(ctx.horseBranches && ctx.horseBranches.length ? ctx.horseBranches : ctx.yiMaBranches);
	if(ma.length){
		out.push({ method: '驿马动', dirs: ma, note: '驿马所临之支值期，事多应动、有信。' });
	}
	const ding = uniq(ctx.dingHorseBranches);
	if(ding.length){
		out.push({ method: '丁神动', dirs: ding, note: '丁神所临之支值期，主动、主变。' });
	}
	return out;
}
