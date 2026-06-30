// 乾坤国宝（龙门八大局）· 先后天位 + 来去水断（基础）。
// 先后天位移植 golden(out_qkgb)字节级确定;天劫/地刑/宾/客/辅/正窍按主流，注「需按龙门八局图校」。
import { qkgbPositions } from './liqiCore';
import { HOUTIAN_POS, POS_NAME, OPP_GONG } from './fengshuiData';

const GUA_BY_HT = (()=>{ const m = {}; Object.keys(HOUTIAN_POS).forEach((g)=>{ m[HOUTIAN_POS[g]] = g; }); return m; })();

// 坐山卦 → 龙门八局九水位 + 来去水断。
//   waters: {posKey: 'come'|'go'|''}（先天/后天/案劫…来去水登记）。
export function qiankun({ zuoGua, waters = {} } = {}) {
	const base = qkgbPositions(zuoGua);
	if (!base) { return { available: false }; }
	// 案劫=向首（坐卦后天方位之对宫）。
	const zw = base.houtianFangPos;
	const xiangPos = OPP_GONG[zw] || zw;
	const positions = [
		{ key: 'xianTian', name: '先天位（主丁）', pos: base.xianTianWeiPos, posName: base.xianTianWei, wantCome: true, jx: 'good' },
		{ key: 'houTian', name: '后天位（主财）', pos: base.houTianWeiPos, posName: base.houTianWei, wantCome: true, jx: 'good' },
		{ key: 'anJie', name: '案劫位（向首·去水关锁）', pos: xiangPos, posName: POS_NAME[xiangPos] || '—', wantCome: false, jx: 'neutral' },
	];
	// 来去水断（7.B.9）：先后天位喜来水(旺丁旺财)、案劫喜去水关锁。
	const verdicts = positions.map((p)=>{
		const w = waters[p.key] || '';
		let result = '未登记'; let vjx = 'neutral';
		if (p.wantCome) {
			if (w === 'come') { result = '得水·旺（先后天得来水主丁财）'; vjx = 'good'; }
			else if (w === 'go') { result = '失·去水退（先后天忌去水）'; vjx = 'bad'; }
			else { result = '宜见来水'; }
		} else {
			if (w === 'go') { result = '合·去水关锁有情'; vjx = 'good'; }
			else if (w === 'come') { result = '忌·来水冲（案劫忌来水直冲）'; vjx = 'bad'; }
			else { result = '宜去水关锁'; }
		}
		return { ...p, water: w, result, jx: vjx };
	});
	const heJu = verdicts.filter((v)=>v.wantCome).every((v)=>v.water === 'come');
	return {
		available: true, zuoGua,
		houtianFang: base.houtianFang,
		xianTian: base.xianTianWei, houTian: base.houTianWei, anJie: POS_NAME[xiangPos],
		positions: verdicts, heJu,
		note: '先后天位字节级确定;宾/客/天劫/地刑/辅卦/正窍 需按龙门八局图校（门派开关 M5）',
	};
}

export { GUA_BY_HT };
