// 报告功能 - 截断检测单测
// 用户截图反馈：报告内容被截断（最后一句不完整）→ isContentTruncated 判定要稳。

import { __truncationTesting__ } from '../reportPipeline';
const { isContentTruncated } = __truncationTesting__;

describe('isContentTruncated', ()=>{
	test('空字符串不算截断', ()=>{
		expect(isContentTruncated('')).toBe(false);
		expect(isContentTruncated('   ')).toBe(false);
	});

	test('以中文句号结尾 → 完整', ()=>{
		expect(isContentTruncated('财运较佳，宜从政经商。')).toBe(false);
		expect(isContentTruncated('婚姻稳定，夫妻和睦。')).toBe(false);
	});

	test('以感叹号问号结尾 → 完整', ()=>{
		expect(isContentTruncated('真是太精彩了！')).toBe(false);
		expect(isContentTruncated('是何道理？')).toBe(false);
	});

	test('以英文标点结尾 → 完整', ()=>{
		expect(isContentTruncated('Done.')).toBe(false);
		expect(isContentTruncated('OK!')).toBe(false);
	});

	test('以括号引号结尾 → 完整', ()=>{
		expect(isContentTruncated('详见下表）')).toBe(false);
		expect(isContentTruncated('「财星」')).toBe(false);
	});

	test('用户截图实例 → 截断', ()=>{
		// 来自用户截图："但坐支辰土（日柱"
		expect(isContentTruncated('日主为庚金，生于已月（辛已月柱），火旺当令，庚金在已月为绝地，但坐支辰土（日柱')).toBe(true);
		// 来自用户截图："甲木偏财透出，申金"
		expect(isContentTruncated('2017-2026年甲申大运：甲木偏财透出，申金')).toBe(true);
	});

	test('以逗号结尾 → 截断', ()=>{
		expect(isContentTruncated('财运较佳，')).toBe(true);
	});

	test('以中间词结尾 → 截断', ()=>{
		expect(isContentTruncated('日主为庚金，生于巳月')).toBe(true);
	});

	// audit 修:省略号/「等等」收尾视为截断,新增覆盖
	test('英文省略号「...」收尾 → 截断', ()=>{
		expect(isContentTruncated('财运较佳,具体应期可参考...')).toBe(true);
	});

	test('中文省略号「……」收尾 → 截断', ()=>{
		expect(isContentTruncated('婚姻方面...有变数……')).toBe(true);
	});

	test('多个句号「。。。」收尾 → 截断', ()=>{
		expect(isContentTruncated('待进一步分析。。。')).toBe(true);
	});

	test('「等等」收尾 → 截断', ()=>{
		expect(isContentTruncated('适合行业包括医生、教师、律师等等')).toBe(true);
	});
});
