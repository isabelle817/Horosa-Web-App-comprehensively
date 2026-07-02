// 演禽右栏「演法」面板 SSR 冒烟:4 子页签各渲染不抛(捕获 JSX/import/引擎运行时错误)。
// 时间复用左栏 → 传 mock fields(moment)。
import React from 'react';
import moment from 'moment';
import { renderToStaticMarkup } from 'react-dom/server';
import YanQinBranchPanel from '../YanQinBranchPanel';

const fields = {
	date: { value: moment('2008-01-01') },
	time: { value: moment('2008-01-01 12:30:00') },
	gender: { value: 1 },
};

describe('演禽 演法面板 SSR 冒烟', () => {
	[
		{ sub: 'qiqin', expect: '起禽推导' },
		{ sub: 'zeri', expect: '值日吉凶歌' },
		{ sub: 'zhanbu', expect: '三传四课' },
		{ sub: 'toutai', expect: '投胎度数' },
	].forEach(({ sub, expect: needle }) => {
		test(`子页签 ${sub} 渲染不抛且含「${needle}」`, () => {
			let html = '';
			expect(() => { html = renderToStaticMarkup(<YanQinBranchPanel initialSub={sub} fields={fields} />); }).not.toThrow();
			expect(html).toContain(needle);
		});
	});
	test('无 fields 时不抛、提示取左栏时间', () => {
		let html = '';
		expect(() => { html = renderToStaticMarkup(<YanQinBranchPanel initialSub="zeri" />); }).not.toThrow();
		expect(html).toContain('左栏');
	});
});
