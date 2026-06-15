import { signKeyFromLon, nodeDistance, ingressDurationMonths } from '../momentPipeline';

describe('momentPipeline 纯函数', ()=>{
	it('signKeyFromLon 按黄经定座', ()=>{
		expect(signKeyFromLon(5)).toBe('aries');
		expect(signKeyFromLon(125)).toBe('leo');
		expect(signKeyFromLon(359)).toBe('pisces');
		expect(signKeyFromLon(-1)).toBe('pisces'); // 环绕
		expect(signKeyFromLon('x')).toBe(null);
	});

	it('nodeDistance 取最近交点(升/降)角距', ()=>{
		expect(nodeDistance(100, 100)).toBeCloseTo(0, 6);
		expect(nodeDistance(280, 100)).toBeCloseTo(0, 6); // 对交点
		expect(nodeDistance(110, 100)).toBeCloseTo(10, 6);
	});

	it('入宫时长定则:基本3 / 变动6 / 固定12', ()=>{
		expect(ingressDurationMonths('aries')).toBe(3); // cardinal
		expect(ingressDurationMonths('gemini')).toBe(6); // mutable
		expect(ingressDurationMonths('taurus')).toBe(12); // fixed
		expect(ingressDurationMonths('unknown')).toBe(3);
	});
});
