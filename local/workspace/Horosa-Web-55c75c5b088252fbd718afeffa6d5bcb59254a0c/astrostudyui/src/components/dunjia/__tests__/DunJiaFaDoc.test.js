import { SHENSHA_DOC, JI_XING_JIE, MEN_PO_JIE, MU_KU, ganXiangText } from '../DunJiaFaDoc';
import { buildQimenXiangTipObj } from '../QimenXiangDoc';

describe('DunJiaFaDoc · 神煞判语全覆盖（自检）', ()=>{
	// 镜像 DunJiaCalc 的 QIMEN_SHENSHA_* 全部名目；任一会显示的神煞都必须有判语，否则此处红。
	const EXPECTED = ['日禄', '日德', '文昌', '游都', '贵人', '驿马', '日马', '桃花', '破碎', '天马', '医星', '生气', '死气', '血支', '成神', '会神', '解神', '天目', '月厌', '月破', '贼神', '丧车', '年马', '病符', '孤辰', '寡宿', '丧门', '吊客'];
	it('SHENSHA_DOC 覆盖全部神煞名目且字段完整', ()=>{
		EXPECTED.forEach((name)=>{
			expect(SHENSHA_DOC[name]).toBeDefined();
			expect(['吉', '凶', '中']).toContain(SHENSHA_DOC[name].luck);
			expect(typeof SHENSHA_DOC[name].brief).toBe('string');
		});
	});
});

describe('DunJiaFaDoc · 解神/形象表（docx 校准后）', ()=>{
	it('击刑用合＝五合干+六合支（无三合）', ()=>{
		expect(JI_XING_JIE['戊']).toEqual({ liuHe: '丑', wuHe: '癸' });
		expect(JI_XING_JIE['戊'].sanHe).toBeUndefined();
	});
	it('门迫用合八门齐全', ()=>{
		['休', '生', '伤', '杜', '景', '死', '惊', '开'].forEach((d)=>expect(MEN_PO_JIE[d]).toBeTruthy());
	});
	it('入墓墓库十干齐全', ()=>{
		'甲乙丙丁戊己庚辛壬癸'.split('').forEach((g)=>expect(MU_KU[g]).toBeTruthy());
	});
	it('干支形象短串', ()=>{
		expect(ganXiangText('戊')).toContain('棕色');
	});
});

describe('QimenXiangDoc · 地支/八卦宫 hover（P4）', ()=>{
	it('地支取象可解析', ()=>{
		const t = buildQimenXiangTipObj('branch', '子');
		expect(t).toBeTruthy();
		expect(t.key).toBe('子');
	});
	it('八卦宫取象可解析（含干→乾归一）', ()=>{
		expect(buildQimenXiangTipObj('palace', '坎')).toBeTruthy();
		const qian = buildQimenXiangTipObj('palace', '干');
		expect(qian).toBeTruthy();
		expect(qian.key).toBe('乾');
	});
	it('既有 stem/star hover 不回归', ()=>{
		expect(buildQimenXiangTipObj('stem', '甲')).toBeTruthy();
		expect(buildQimenXiangTipObj('star', '蓬')).toBeTruthy();
	});
});
