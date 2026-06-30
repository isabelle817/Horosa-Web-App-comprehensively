// 风水 SVG 盘面组件 冒烟（确认 import/transpile + 渲染不抛 + 返回 svg，喂真实模块输出）。
import LuoshuGrid from '../charts/LuoshuGrid';
import TwentyFourShanRing from '../charts/TwentyFourShanRing';
import EightPalaceDisk from '../charts/EightPalaceDisk';
import { xuankong } from '../xuankong';
import { zibai } from '../zibai';
import { sanhe } from '../sanhe';
import { jinsuo } from '../jinsuo';
import { qiankun } from '../qiankun';
import { bazhai } from '../bazhai';

describe('风水 SVG 盘面 冒烟', ()=>{
	it('LuoshuGrid 渲染 玄空/紫白/八宅 三态', ()=>{
		expect(typeof LuoshuGrid).toBe('function');
		expect(LuoshuGrid({ palaces: xuankong(9, '午').palaces, mode: 'xuankong', highlightYun: 9 }).type).toBe('svg');
		expect(LuoshuGrid({ palaces: zibai({ year: 2026 }).yearPalaces, mode: 'zibai' }).type).toBe('svg');
		expect(LuoshuGrid({ palaces: bazhai({ zuoGua: '坎' }).palaces, mode: 'bazhai' }).type).toBe('svg');
	});
	it('TwentyFourShanRing 渲染 三合长生环 + 坐向', ()=>{
		const sh = sanhe({ shuiKou: '戌', waterFlow: 'leftToRight' });
		expect(TwentyFourShanRing({ ring: sh.ring, zuoShan: '子', xiangShan: '午' }).type).toBe('svg');
	});
	it('EightPalaceDisk 渲染 金锁 + 乾坤国宝', ()=>{
		const js = jinsuo({ sectors: { 坎: 'sand', 乾: 'water' } });
		const jsP = js.palaces.map((p)=>({ gong: p.gong, gua: p.gua, dir: p.dir, primary: p.actual === 'sand' ? '砂' : (p.actual === 'water' ? '水' : '平'), secondary: p.deWei ? '得位' : '失位', jx: p.deWei ? 'good' : 'bad' }));
		expect(EightPalaceDisk({ palaces: jsP, centerLabel: '金锁' }).type).toBe('svg');
		const qk = qiankun({ zuoGua: '坎' });
		const qkP = qk.positions.map((p)=>({ gong: p.pos, dir: p.posName, primary: p.name.slice(0, 2), jx: p.jx }));
		expect(EightPalaceDisk({ palaces: qkP, centerLabel: '乾坤国宝' }).type).toBe('svg');
	});
});
