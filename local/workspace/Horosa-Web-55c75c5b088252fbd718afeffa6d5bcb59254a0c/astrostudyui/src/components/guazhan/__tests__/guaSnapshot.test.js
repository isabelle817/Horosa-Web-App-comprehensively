import { buildGuaSnapshotText } from '../GuaZhanMain';
import { getGua64, Gua64 } from '../../gua/GuaConst';
import { littleEndian } from '../../../utils/helper';

function mkYao(values, movingIdx){
	return values.map((v, i) => ({ value: v, change: i === movingIdx, god: null, name: null }));
}
function guaIdx(values){
	const g = getGua64(littleEndian(values));
	return g ? g.index : null;
}

describe('六爻 buildGuaSnapshotText 全卦输出(回归哨兵:AI分析挂载经 buildTimeGua 时 gua 无 guaDesc → 旧版只剩本卦)', () => {
	// 挂载路径(regenerateSixyaoSnapshot→buildTimeGua)给的 gua 只有 yao/currentGua,没有 guaDesc。
	// 之/互/错/综卦必须能从 yao 六爻线值直接算出。
	it('仅有 yao(无 guaDesc)时仍输出 本卦/互卦/之卦/错卦/综卦', () => {
		const vals = [1, 1, 1, 1, 1, 1]; // 乾(全阳),初爻动
		const cur = guaIdx(vals);
		expect(cur).not.toBeNull();
		const st = { currentGua: cur, yao: mkYao(vals, 0), nongli: {}, guaDesc: {} };
		const txt = buildGuaSnapshotText({}, st);
		expect(txt).toMatch(/本卦：/);
		expect(txt).toMatch(/互卦：/);
		expect(txt).toMatch(/之卦/);
		expect(txt).toMatch(/错卦\(阴阳全变\)：/);
		expect(txt).toMatch(/综卦\(上下颠倒\)：/);
	});

	it('错卦 = 阴阳全变:乾(全阳)的错卦应为坤(全阴)', () => {
		const qian = [1, 1, 1, 1, 1, 1];
		const cuoVals = qian.map((v) => (v === 1 ? 0 : 1)); // 坤
		const kunIdx = guaIdx(qian.map((v) => (v === 1 ? 0 : 1)));
		const st = { currentGua: guaIdx(qian), yao: mkYao(qian, 0), nongli: {}, guaDesc: {} };
		const txt = buildGuaSnapshotText({}, st);
		const kunName = (Gua64[kunIdx] && Gua64[kunIdx].name) || '坤';
		// 错卦行应包含坤卦名
		const cuoLine = txt.split('\n').find((l) => l.indexOf('错卦') >= 0);
		expect(cuoLine).toBeTruthy();
		expect(cuoLine).toContain(kunName);
		// 自洽:坤 = 乾的阴阳全变
		expect(guaIdx(cuoVals)).toBe(kunIdx);
	});

	it('无动爻时之卦标注「无动爻,卦不变」', () => {
		const vals = [1, 0, 1, 0, 1, 0];
		const st = { currentGua: guaIdx(vals), yao: mkYao(vals, -1), nongli: {}, guaDesc: {} };
		const txt = buildGuaSnapshotText({}, st);
		expect(txt).toMatch(/之卦\(变卦\)：无动爻/);
	});

	it('之卦(变卦)/互卦 输出每根爻的装卦(地支/五行/六亲/世应,取自 yaoname)', () => {
		const vals = [1, 1, 1, 1, 1, 1]; // 乾,初爻动 → 之卦=天风姤(初爻「丑土父母世」),互卦=乾
		const st = { currentGua: guaIdx(vals), yao: mkYao(vals, 0), nongli: {}, guaDesc: {} };
		const txt = buildGuaSnapshotText({}, st);
		expect(txt).toMatch(/之卦\(变卦\)逐爻/);
		expect(txt).toMatch(/互卦逐爻/);
		// 之卦逐爻应含纳甲(地支+五行+六亲[+世应]),如 天风姤 初爻「丑土父母世」。
		const zhiSection = txt.split('之卦(变卦)逐爻')[1] || '';
		expect(zhiSection).toMatch(/[子丑寅卯辰巳午未申酉戌亥][金木水火土](父母|官鬼|妻财|妻才|子孙|兄弟)/);
		// 之卦/互卦逐爻也要有阴阳爻（天风姤=[0,1,1,1,1,1]：初爻阴、余阳）。
		const zhiLine1 = zhiSection.split('\n').find((l)=>l.indexOf('第1爻') >= 0) || '';
		expect(zhiLine1).toContain('阴爻');
		expect(zhiSection).toMatch(/阳爻/);
	});
});
