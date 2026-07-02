// 演法 AI 快照:含起禽四禽/择日/占卜/投胎 + 流派;随 store 流派变化(供 AI 挂载/导出)。
import { buildYanqinYanfaSnapshot } from '../yanqinSnapshot';
import { setYanqinSchool } from '../yanqinStore';

describe('演法 AI 快照', () => {
	test('含 流派/起禽/择日/占卜/投胎 五段 + 具体禽名', () => {
		setYanqinSchool('chibenli');
		const snap = buildYanqinYanfaSnapshot({ year: 2008, month: 1, day: 1, hour: 12 });
		['[演法·流派]', '[演法·起禽]', '[演法·择日]', '[演法·占卜]', '[演法·投胎]'].forEach((h) => expect(snap).toContain(h));
		expect(snap).toContain('日禽');
		expect(snap).toContain('翻禽');
	});
	test('随流派变化:池本理(翻禽=我) vs 凤凰(时禽=我) → 占卜段我彼不同', () => {
		setYanqinSchool('chibenli');
		const a = buildYanqinYanfaSnapshot({ year: 2008, month: 1, day: 1, hour: 12 });
		setYanqinSchool('fenghuang');
		const b = buildYanqinYanfaSnapshot({ year: 2008, month: 1, day: 1, hour: 12 });
		setYanqinSchool('chibenli'); // 复位
		const lineA = a.split('\n').find((l) => l.indexOf('[演法·占卜]') === 0);
		const lineB = b.split('\n').find((l) => l.indexOf('[演法·占卜]') === 0);
		expect(lineA).not.toBe(lineB); // 我彼反转 → 占卜段不同
	});
	test('边界:空/非法 payload 不抛、返空串', () => {
		expect(buildYanqinYanfaSnapshot(null)).toBe('');
		expect(buildYanqinYanfaSnapshot({})).toBe('');
		expect(() => buildYanqinYanfaSnapshot({ year: 2008, month: 1, day: 1, hour: 25 })).not.toThrow();
	});
});
