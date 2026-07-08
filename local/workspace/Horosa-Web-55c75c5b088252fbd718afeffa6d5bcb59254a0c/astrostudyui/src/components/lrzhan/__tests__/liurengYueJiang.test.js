// A1 §3.2 月将换将三派:中气过宫(③默认·回归 obj.sign)/节气换将(①+15°)/太阳过宫日躔(②−岁差)。
import { getYueJiangByMethod, liurengAyanamsa } from '../LiuRengMain';
import { LIST_SIGNS } from '../../../constants/AstroConst';

const SIGNZI = ['戌', '酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑', '子', '亥'];
// obj.sign 为星座名(getSignZi 用 LIST_SIGNS.indexOf);LIST_SIGNS[0]=白羊→戌。
const chart = (lon, signIdx) => ({ objects: [{ id: 'Sun', lon, sign: LIST_SIGNS[signIdx] }], nongli: { time: '子' } });

describe('A1 §3.2 月将换将三派', ()=>{
	it('liurengAyanamsa 线性(2000≈23.85°,逐年+0.0139644,缺省 2024)', ()=>{
		expect(liurengAyanamsa(2000)).toBeCloseTo(23.853, 3);
		expect(liurengAyanamsa(2026)).toBeCloseTo(23.853 + 0.0139644 * 26, 3);
		expect(liurengAyanamsa(undefined)).toBeCloseTo(liurengAyanamsa(2024), 6);
	});

	it('jieqi(①节换将)=黄经+15°取宫;richan(②日躔)=黄经−岁差取宫', ()=>{
		expect(getYueJiangByMethod(chart(30, 1), 'jieqi', 2026)).toBe(SIGNZI[Math.floor(45 / 30)]); // 酉
		const ayan = liurengAyanamsa(2026);
		expect(getYueJiangByMethod(chart(30, 1), 'richan', 2026)).toBe(SIGNZI[Math.floor((((30 - ayan) % 360 + 360) % 360) / 30)]); // 戌
	});

	it('richan 较中气(回归)晚约岁差度:黄经10°时回归=戌、日躔仍=亥', ()=>{
		expect(getYueJiangByMethod(chart(10, 0), 'zhongqi', 2026)).toBe('戌'); // 回归白羊→戌
		expect(getYueJiangByMethod(chart(10, 0), 'richan', 2026)).toBe('亥'); // 含岁差~24°→尚未过宫
	});

	it('zhongqi/默认 走回归 obj.sign(零回归保障)', ()=>{
		expect(getYueJiangByMethod(chart(10, 0), 'zhongqi', 2026)).toBe('戌');
		expect(getYueJiangByMethod(chart(10, 0), undefined, 2026)).toBe('戌');
	});

	it('无太阳/经度非数 → 回退中气,不抛', ()=>{
		expect(()=>getYueJiangByMethod({ objects: [], nongli: {} }, 'richan', 2026)).not.toThrow();
	});

	it('richan 年份影响过宫(岁差逐年):同黄经早年/晚年可不同宫', ()=>{
		// 黄经 24.0°:2000(岁差23.85)→24−23.85=0.15→戌;2050(岁差~24.55)→24−24.55=−0.55→亥
		expect(getYueJiangByMethod(chart(24.0, 0), 'richan', 2000)).toBe('戌');
		expect(getYueJiangByMethod(chart(24.0, 0), 'richan', 2050)).toBe('亥');
	});
});
