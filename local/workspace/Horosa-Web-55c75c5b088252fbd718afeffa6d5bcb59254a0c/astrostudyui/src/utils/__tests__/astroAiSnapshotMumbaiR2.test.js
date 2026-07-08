import { buildAstroSnapshotContent, buildClassicalAnalysisSection } from '../astroAiSnapshot';
import fs from 'fs';

// R2 端到端：用 Python 引擎产出的真盘(Mumbai 2026/03/20 06:00 +05:30)喂 buildAstroSnapshotContent。
// 任何抛错/空输出都失败。
// 真盘夹具由 in-app 抓取落 /tmp(非入库)。缺失时这两条 e2e 优雅跳过(it.skip)而非飘红:
// 既保留「夹具在场即跑全回归」的守卫价值,又让 CI/纯净环境下全量 jest 真绿(覆盖不减)。
const CHART_FIXTURE = '/tmp/horosa_chart_mumbai.json';
const ANALYSIS_FIXTURE = '/tmp/horosa_analysis_mumbai.json';
const hasChartFixture = fs.existsSync(CHART_FIXTURE);
const hasAnalysisFixture = fs.existsSync(ANALYSIS_FIXTURE);

describe('R2 Mumbai 2026 真盘 AI 快照构建', ()=>{
  (hasChartFixture ? it : it.skip)('不抛、内容非空、必含关键段', ()=>{
    const raw = fs.readFileSync(CHART_FIXTURE, 'utf-8');
    const co = JSON.parse(raw);
    const fields = { lon: { value:'72E52' }, lat: { value:'19N04' }, zone:'+05:30', zodiacal:'回归黄道', hsys:'Alcabitius' };
    let txt = '';
    expect(()=>{ txt = buildAstroSnapshotContent(co, fields); }).not.toThrow();
    expect(typeof txt).toBe('string');
    expect(txt.length).toBeGreaterThan(200);
    expect(txt).toContain('[起盘信息]');
    expect(txt).toContain('[行星]');
    expect(txt).toContain('[古典]');
    expect(txt).toContain('[寿命格局]');
    // 围攻详断与围绕都应来自真盘 surround 数据
    expect(txt).toContain('围攻详断');
    expect(txt).toContain('围绕');
    // 太阳位于双鱼 29° → 歧度旗
    expect(txt).toContain('位于歧度');
    // 不应出现裸 null/undefined/NaN 文本
    expect(txt).not.toMatch(/(undefined|NaN)/);
    expect(txt).not.toMatch(/：\s*null/);
  });
  it('classicalAnalysisSection 处理空 analysis 不抛', ()=>{
    expect(buildClassicalAnalysisSection(null)).toBe('');
    expect(buildClassicalAnalysisSection(undefined)).toBe('');
    expect(buildClassicalAnalysisSection({})).toBe('');
  });
  it('classicalAnalysisSection 处理 zero-totals almuten 不抛', ()=>{
    const sec = buildClassicalAnalysisSection({ almutem: { winner: null, totals: {} } });
    expect(typeof sec).toBe('string');
  });
  it('classicalAnalysisSection 处理 egyptian siriusRising=null', ()=>{
    const sec = buildClassicalAnalysisSection({ egyptianCalendar: { siriusRising: null, decanIndex: 12, decanSign: 'Leo', decanRuler: 'Sun' } });
    expect(sec).toContain('埃及历');
    expect(sec).toContain('上升第12旬');
    expect(sec).not.toContain('天狼偕日升');
  });
  (hasAnalysisFixture ? it : it.skip)('真 analysis(Mumbai)→ classicalAnalysisSection 不抛、含全段', ()=>{
    const a = JSON.parse(fs.readFileSync(ANALYSIS_FIXTURE,'utf-8'));
    let sec = '';
    expect(()=>{ sec = buildClassicalAnalysisSection(a); }).not.toThrow();
    expect(sec.length).toBeGreaterThan(200);
    expect(sec).toContain('Almuten 总主');
    expect(sec).toContain('Almuten 逐星得分');
    expect(sec).toContain('行星时');
    expect(sec).toContain('昼时');
    expect(sec).toContain('夜时');
    expect(sec).toContain('埃及历');
    expect(sec).toContain('天狼偕日升 2026-07-27');
    expect(sec).toContain('岁年 2026');
    expect(sec).toContain('阿拉伯点');
    expect(sec).toContain('分布权重');
    expect(sec).toContain('气质评估');
    expect(sec).toContain('相位格局');
    expect(sec).toContain('逐题主星');
    expect(sec).toContain('偶然尊贵');
  });
});
