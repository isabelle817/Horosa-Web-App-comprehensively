import { matchBiFa, BIFA_LIST, BIFA_MATCHERS } from './LRBiFaDoc';

function ctx(o){
	return Object.assign({
		sanChuanBranches: [], sanChuanGans: [], courseBranches: [],
		xunKongBranches: [], dingHorseBranches: [], yiMaBranches: [], firstBranch: '', lastBranch: '',
		dayGan: '', dayZhi: '', dayGanBranch: '', dayGanWuXing: '', dayZhiWuXing: '',
		ke1Up: '', ke3Up: '', keUpBranches: [], guizi: '', xunHeadBranch: '', xunTailBranch: '', runYearBranch: '', midBranch: '', firstGod: '', midGod: '', lastGod: '',
		dayZhiGan: '', yearBranch: '', courseName: '',
		dayGuiBranch: '', nightGuiBranch: '', dayNight: '', yueGeneralBranch: '',
		branchGodMap: {}, branchUpMap: {}, xunGanMap: {}, upDownMap: {}, keRaw: [], layout: null,
	}, o);
}
function nos(hits){ return hits.map((h)=>h.no); }
// 地盘=子..亥(顺序)，天盘可在某 index 放指定支，便于测 branchOver。
function layoutWith(upPairs){
	const downZi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
	const upZi = downZi.slice();
	Object.keys(upPairs || {}).forEach((bottom)=>{ const i = downZi.indexOf(bottom); if(i >= 0){ upZi[i] = upPairs[bottom]; } });
	return { downZi, upZi };
}

describe('LRBiFaDoc · matchBiFa A 档自动匹配（宁缺勿滥）', ()=>{
	it('BIFA_LIST 收录 100 条毕法，BIFA_MATCHERS 至少 35 个高置信判定', ()=>{
		expect(BIFA_LIST.length).toBe(100);
		expect(Object.keys(BIFA_MATCHERS).length).toBeGreaterThanOrEqual(90);
	});

	it('no.5 六阳 / no.6 六阴：四课三传全阳 / 全阴', ()=>{
		expect(nos(matchBiFa(ctx({ courseBranches: ['子', '寅', '辰', '午', '申', '戌'] })))).toContain(5);
		expect(nos(matchBiFa(ctx({ courseBranches: ['丑', '卯', '巳', '未', '酉', '亥'] })))).toContain(6);
	});

	it('no.7 旺禄临身：日禄临干上不空（甲日禄寅）', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', ke1Up: '寅', xunKongBranches: [] })))).toContain(7);
		expect(nos(matchBiFa(ctx({ dayGan: '甲', ke1Up: '寅', xunKongBranches: ['寅'] })))).not.toContain(7);
	});

	it('no.8 权摄不正：日禄临支上', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', ke3Up: '寅' })))).toContain(8);
	});

	it('no.16 空上乘空 / no.74 空空如也 / no.82 不行传', ()=>{
		expect(nos(matchBiFa(ctx({ firstBranch: '亥', xunKongBranches: ['亥'], firstGod: '天空' })))).toContain(16);
		expect(nos(matchBiFa(ctx({ sanChuanBranches: ['亥', '戌', '酉'], xunKongBranches: ['亥', '戌', '酉'] })))).toContain(74);
		expect(nos(matchBiFa(ctx({ sanChuanBranches: ['寅', '亥', '戌'], xunKongBranches: ['亥', '戌'] })))).toContain(82);
	});

	it('no.23 彼求我 / no.24 我求彼', ()=>{
		expect(nos(matchBiFa(ctx({ firstBranch: '午', lastBranch: '子', ke1Up: '子', ke3Up: '午' })))).toContain(23);
		expect(nos(matchBiFa(ctx({ firstBranch: '子', lastBranch: '午', ke1Up: '子', ke3Up: '午' })))).toContain(24);
	});

	it('no.25/26 金水日逢丁；no.42 三奇', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '庚', dingHorseBranches: ['卯'], courseBranches: ['卯'] })))).toContain(25);
		expect(nos(matchBiFa(ctx({ sanChuanGans: ['甲', '戊', '庚'] })))).toContain(42);
	});

	it('no.31 三传递生 / no.32 三传递克', ()=>{
		expect(nos(matchBiFa(ctx({ sanChuanBranches: ['辰', '申', '子'], dayGan: '甲' })))).toContain(31);
		expect(nos(matchBiFa(ctx({ sanChuanBranches: ['子', '午', '申'], dayGan: '甲' })))).toContain(32);
	});

	it('no.33 有始无终：初传干长生(甲长生亥)、末传干墓(木墓未)', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayGanWuXing: '木', firstBranch: '亥', lastBranch: '未' })))).toContain(33);
	});

	it('no.41 富贵禄马：干上支马(午马申)、支上干禄(甲禄寅)', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayZhi: '午', ke1Up: '申', ke3Up: '寅' })))).toContain(41);
	});

	it('no.47 贵虽在狱 / no.48 鬼乘天乙', ()=>{
		expect(nos(matchBiFa(ctx({ guizi: '辰', dayGan: '乙' })))).toContain(47);
		expect(nos(matchBiFa(ctx({ guizi: '申', dayGan: '甲' })))).toContain(48); // 申金克甲木
	});

	it('no.51 魁度天门：戌加亥发用', ()=>{
		expect(nos(matchBiFa(ctx({ firstBranch: '戌', layout: layoutWith({ '亥': '戌' }) })))).toContain(51);
	});

	it('no.52 罡塞鬼户：辰加寅', ()=>{
		expect(nos(matchBiFa(ctx({ layout: layoutWith({ '寅': '辰' }) })))).toContain(52);
	});

	it('no.63 彼此全伤 / no.64 夫妇芜淫', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayZhi: '寅', ke1Up: '申', ke3Up: '酉' })))).toContain(63);
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayZhi: '寅', ke1Up: '酉', ke3Up: '申' })))).toContain(64);
	});

	it('no.88 墓覆日辰 / no.91 虎临干鬼', ()=>{
		expect(nos(matchBiFa(ctx({ dayGanWuXing: '木', dayZhiWuXing: '火', ke1Up: '未', ke3Up: '戌' })))).toContain(88);
		// 91 虎临干鬼：日干上神(一课天将)＝白虎，且克日干。一课天将取 keRaw[0][0]。
		expect(nos(matchBiFa(ctx({ dayGan: '甲', ke1Up: '申', keRaw: [['白虎', '申', '甲'], [], [], []] })))).toContain(91);
	});

	it('no.69 虎乘遁鬼：白虎所乘天盘神之遁干克日干', ()=>{
		// 白虎在地盘午、所乘天盘神＝申(branchUpMap)，申遁干庚克甲。godRideShen 取天盘神而非地盘格。
		expect(nos(matchBiFa(ctx({ dayGan: '甲', branchGodMap: { '午': '白虎' }, branchUpMap: { '午': '申' }, xunGanMap: { '申': '庚' } })))).toContain(69);
	});

	it('no.67 受虎克神：白虎所乘天盘神受克→对应脏腑', ()=>{
		// 白虎地盘子、所乘天盘神＝申(金)；丙火克申金→主肝经。
		expect(nos(matchBiFa(ctx({ dayGan: '丙', branchGodMap: { '子': '白虎' }, branchUpMap: { '子': '申' }, upDownMap: { '申': '子' } })))).toContain(67);
	});

	it('空 / 缺字段 context 不抛错、不误命中', ()=>{
		expect(matchBiFa(null)).toEqual([]);
		expect(matchBiFa(ctx({}))).toEqual([]);
	});

	it('no.2 首尾相见：干上旬尾、支上旬首', ()=>{
		expect(nos(matchBiFa(ctx({ xunHeadBranch: '寅', xunTailBranch: '亥', ke1Up: '亥', ke3Up: '寅' })))).toContain(2);
	});
	it('no.21 交车相合：干寄宫合支上神、日支合干上神', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayGanBranch: '寅', dayZhi: '午', ke1Up: '未', ke3Up: '亥' })))).toContain(21);
	});
	it('no.22 上下皆合：干支上神六合（子丑）', ()=>{
		expect(nos(matchBiFa(ctx({ ke1Up: '子', ke3Up: '丑' })))).toContain(22);
	});
	it('no.37 末助初：末传生初传（寅木生午火）', ()=>{
		expect(nos(matchBiFa(ctx({ firstBranch: '午', lastBranch: '寅' })))).toContain(37);
	});
	it('no.43 害贵：贵人与发用六害（丑午）', ()=>{
		expect(nos(matchBiFa(ctx({ guizi: '丑', firstBranch: '午' })))).toContain(43);
	});
	it('no.75 宾主不投：干支上神见刑（子卯）', ()=>{
		expect(nos(matchBiFa(ctx({ ke1Up: '子', ke3Up: '卯' })))).toContain(75);
	});
	it('no.83 三六合：三传申子辰三合、中传子合丑', ()=>{
		expect(nos(matchBiFa(ctx({ sanChuanBranches: ['申', '子', '辰'], midBranch: '子', ke1Up: '丑' })))).toContain(83);
	});
	it('no.86 将逢内战：发用申金乘六合木（金克木）', ()=>{
		expect(nos(matchBiFa(ctx({ firstBranch: '申', firstGod: '六合' })))).toContain(86);
	});

	it('no.12 狐假虎威：干上克日、日支制干上', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayZhi: '午', ke1Up: '申' })))).toContain(12);
	});
	it('no.29 眷属丰盈：三传生日干又泄日支', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayZhi: '申', sanChuanBranches: ['子', '亥', '子'] })))).toContain(29);
	});
	it('no.30 屋宅宽广：三传泄日干反生日支', ()=>{
		// 甲生火(三传巳午巳)、火生土(日支辰)
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayZhi: '辰', sanChuanBranches: ['巳', '午', '巳'] })))).toContain(30);
	});
	it('no.72 丧吊全逢：子年丧门寅吊客戌临干支上', ()=>{
		expect(nos(matchBiFa(ctx({ yearBranch: '子', ke1Up: '寅', ke3Up: '戌' })))).toContain(72);
	});
	it('no.78 皆旺：干支上神皆帝旺（甲帝旺卯）', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayZhi: '卯', dayZhiGan: '乙', ke1Up: '卯', ke3Up: '卯' })))).toContain(78);
	});
	it('no.79 干支值绝：干上日干绝、支上日支绝（甲乙绝申）', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', dayZhiGan: '乙', ke1Up: '申', ke3Up: '申' })))).toContain(79);
	});
	it('no.84 合中犯杀：三合申子辰、干支上午冲子', ()=>{
		expect(nos(matchBiFa(ctx({ sanChuanBranches: ['申', '子', '辰'], ke1Up: '午', ke3Up: '子' })))).toContain(84);
	});
	it('no.95 六爻现卦：三传皆官鬼、干支上见兄弟', ()=>{
		expect(nos(matchBiFa(ctx({ dayGan: '甲', sanChuanBranches: ['申', '酉', '申'], ke1Up: '寅' })))).toContain(95);
	});
	it('no.50 二贵皆空：昼夜两贵地盘支皆旬空', ()=>{
		expect(nos(matchBiFa(ctx({ dayGuiBranch: '戌', nightGuiBranch: '亥', xunKongBranches: ['戌', '亥'] })))).toContain(50);
	});
	it('no.46 贵人差迭：昼贵临夜地、夜贵临昼方', ()=>{
		expect(nos(matchBiFa(ctx({ dayGuiBranch: '午', nightGuiBranch: '子' })))).toContain(46); // 午∈夜地, 子∈昼地
	});
});
