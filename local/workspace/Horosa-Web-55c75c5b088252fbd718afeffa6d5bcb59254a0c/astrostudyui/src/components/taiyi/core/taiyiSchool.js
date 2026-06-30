// 太乙流派覆盖层(§33/§44)。以 kintaiyi 后端 pan 为底,按用户所选流派开关「覆盖」受影响神煞 +
// 几何重算主客算(决策3:前端纯派生,零碰后端立成表 golden)。默认全 = kintaiyi → 覆盖为空操作 → 字节不变。
// 公式移植自文档「古法复原」引擎(jishen_zhi/shiji_index/wenchang_index/junji/chenji/dayou/xiaoyou)。
// 存疑项(C-3)标【古法几何】来源;始击坐标系(九宫/十六神)二式未核实,暂不做开关(待源)。
import { suanFrom } from './taiyiDuanfa';

const DIZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');
const RING16 = '子丑艮寅卯辰巽巳午未坤申酉戌乾亥'.split(''); // 十六神环落点序(=POS2INDEX)
const EPOCH = { 0: 10153917, 1: 1936557, 3: 10153917 }; // tn→积年常数(统宗/金镜/太乙局≈统宗)

// 默认流派选项(全 = kintaiyi 现行,覆盖为空操作)
export const DEFAULT_TAIYI_SCHOOL = { jishen: 'default', wenchang: 'default', keJianChen: 'default', sanji: 'default', youshen: 'default' };

export const TAIYI_SCHOOL_OPTIONS = {
	jishen: [{ value: 'default', label: '默认(从盘)' }, { value: '逆', label: '逆行·古法' }, { value: '顺', label: '顺行·今本' }],
	wenchang: [{ value: 'default', label: '默认(从盘)' }, { value: '重留', label: '乾坤/艮巽重留' }, { value: '无重留', label: '不重留' }],
	keJianChen: [{ value: 'default', label: '默认(从盘)' }, { value: '加一', label: '间辰加一' }, { value: '无加一', label: '间辰不加' }],
	sanji: [{ value: 'default', label: '默认(从盘)' }, { value: '淘金歌', label: '淘金歌(君臣午·民戌)' }, { value: '金镜', label: '金镜(三基皆戌)' }],
	youshen: [{ value: 'default', label: '默认(从盘)' }, { value: '顺', label: '金镜顺行' }, { value: '逆', label: '淘金歌逆行' }],
};

export function normalizeTaiyiSchool(s){
	return { ...DEFAULT_TAIYI_SCHOOL, ...(s || {}) };
}
export function isDefaultSchool(s){
	const n = normalizeTaiyiSchool(s);
	return Object.keys(DEFAULT_TAIYI_SCHOOL).every((k) => n[k] === 'default');
}

// —— 移植 taiyi.py 公式 ——
function jishenZhi(yearZhi, dir){
	const z = DIZHI.indexOf(yearZhi); if(z < 0){ return null; }
	const idx = dir === '顺' ? (z + 2) % 12 : ((2 - z) % 12 + 12) % 12;
	return DIZHI[idx];
}
function shijiIndex(wcIdx, jishenChar){
	const jp = RING16.indexOf(jishenChar), gp = RING16.indexOf('艮');
	if(jp < 0 || gp < 0 || wcIdx < 0){ return null; }
	const shift = ((gp - jp) % 16 + 16) % 16;
	return (wcIdx + shift) % 16;
}
function wenchangIndex(ju, dun, withDouble){
	let r = ju % 18; if(r === 0){ r = 18; }
	let start, dbl;
	if(dun === '阳'){ start = RING16.indexOf('申'); dbl = withDouble ? [RING16.indexOf('乾'), RING16.indexOf('坤')] : []; }
	else { start = RING16.indexOf('寅'); dbl = withDouble ? [RING16.indexOf('艮'), RING16.indexOf('巽')] : []; }
	const seq = []; let i = start;
	while(seq.length < 18){ seq.push(i); if(dbl.indexOf(i) >= 0){ seq.push(i); } i = (i + 1) % 16; }
	return seq[r - 1];
}
function jinianOfPan(pan){
	const tn = pan && pan.tn !== undefined ? Number(pan.tn) : 0;
	const ep = EPOCH[tn] !== undefined ? EPOCH[tn] : EPOCH[0];
	const yr = pan && pan.dateStr ? parseInt(String(pan.dateStr).slice(0, 4), 10) : NaN;
	return isNaN(yr) ? null : ep + yr;
}
// 大游/小游(taiyi.py),dir='顺'用正序、'逆'反向遍历
function youGong(jinian, kind, dir){
	const seq = kind === 'big' ? [7, 8, 9, 1, 2, 3, 4, 6] : [1, 2, 3, 4, 6, 7, 8, 9];
	const period = kind === 'big' ? 288 : 24;
	const per = kind === 'big' ? 36 : 3;
	let k = (((jinian % period) + period) % period) / per | 0;
	if(dir === '逆'){ k = (seq.length - k) % seq.length; }
	return seq[k];
}

// 主体:据 school 覆盖 base pan。返回 { pan, overrides:Set<string>, geoSuan:boolean }。
export function applyTaiyiSchool(basePan, school){
	const s = normalizeTaiyiSchool(school);
	if(!basePan || isDefaultSchool(s)){ return { pan: basePan, overrides: new Set(), geoSuan: false }; }
	const pan = { ...basePan };
	const overrides = new Set();
	const dun = pan.kook && pan.kook.year ? (String(pan.kook.year).indexOf('阴') >= 0 ? '阴' : '阳') : (Number(pan.taiyiNum) ? '阳' : '阳');
	const ju = pan.kook ? Number(pan.kook.num) : 0;
	const yearZhi = pan.ganzhi && pan.ganzhi.year ? String(pan.ganzhi.year).charAt(1) : '';
	const taiyiPos = pan.taiyiPalace;

	// 1) 文昌重留 → 文昌落点
	if(s.wenchang !== 'default' && ju){
		const wcIdx = wenchangIndex(ju, dun, s.wenchang === '重留');
		if(wcIdx >= 0){ pan.skyeyes = RING16[wcIdx]; overrides.add('skyeyes'); }
	}
	// 2) 计神方向 → 计神 + 始击(始击随计神/文昌)
	if(s.jishen !== 'default' && yearZhi){
		const js = jishenZhi(yearZhi, s.jishen);
		if(js){ pan.jigod = js; overrides.add('jigod'); }
		const wcIdx = RING16.indexOf(pan.skyeyes);
		const sjIdx = shijiIndex(wcIdx, js);
		if(sjIdx !== null){ pan.sf = RING16[sjIdx]; overrides.add('sf'); }
	}
	// 3) 主客算几何重算(文昌/计神/客算间辰 任一非默认 → 改用几何 _suan_from,标【古法几何】)
	const geoSuan = (s.wenchang !== 'default' || s.jishen !== 'default' || s.keJianChen !== 'default');
	if(geoSuan && taiyiPos){
		const jc = s.keJianChen === '无加一' ? false : true;
		const home = suanFrom(pan.skyeyes, taiyiPos, true);
		const away = suanFrom(pan.sf, taiyiPos, jc);
		if(home != null){ pan.homeCal = home; overrides.add('homeCal'); }
		if(away != null){ pan.awayCal = away; overrides.add('awayCal'); }
	}
	// 4) 三基起宫(淘金歌午/戌 ↔ 金镜皆戌):君基/臣基 据起宫平移(民基两家一致,不动)
	if(s.sanji !== 'default'){
		const jn = jinianOfPan(pan);
		if(jn != null){
			const startJ = s.sanji === '金镜' ? '戌' : '午';
			const sIdx = DIZHI.indexOf(startJ);
			pan.kingbase = DIZHI[(sIdx + ((jn % 360) / 30 | 0)) % 12]; overrides.add('kingbase');
			pan.officerbase = DIZHI[(sIdx + (((jn % 360) / 3 | 0) % 12)) % 12]; overrides.add('officerbase');
		}
	}
	// 5) 游神方向(金镜顺/淘金歌逆)
	if(s.youshen !== 'default'){
		const jn = jinianOfPan(pan);
		if(jn != null){
			pan.bigyoNum = youGong(jn, 'big', s.youshen); pan.bigyoPalace = gongName(pan.bigyoNum) || pan.bigyoPalace; overrides.add('bigyoNum');
			pan.smyoNum = youGong(jn, 'small', s.youshen); pan.smyoPalace = gongName(pan.smyoNum) || pan.smyoPalace; overrides.add('smyoNum');
		}
	}
	// 附流派注记(供 AI 快照 / 右栏 badge)
	const LB = { jishen: '计神', wenchang: '文昌重留', keJianChen: '客算间辰', sanji: '三基起宫', youshen: '游神' };
	const notes = Object.keys(LB).filter((k) => s[k] !== 'default').map((k) => `${LB[k]}=${s[k]}`);
	if(notes.length){ pan._schoolNote = notes.join('、') + (geoSuan ? '(主客算:古法几何)' : ''); pan._geoSuan = geoSuan; }
	return { pan, overrides, geoSuan };
}

// 太乙宫数→落点名(显示用)。与盘面/TaiYiCore.num2gong 同口径(2/4/6/8=午/卯/酉/子,非纯卦离/震/兑/坎),
// 否则游神方向换流派后「大游/小游」落点名与盘面其余八正宫标注不一致(纯派生覆盖层,零碰后端 golden)。
function gongName(num){
	const M = { 1: '乾', 2: '午', 3: '艮', 4: '卯', 6: '酉', 7: '坤', 8: '子', 9: '巽' };
	return M[num] || '';
}
