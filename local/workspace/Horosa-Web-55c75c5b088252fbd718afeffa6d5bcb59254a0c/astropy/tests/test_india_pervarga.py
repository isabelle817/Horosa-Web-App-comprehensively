# -*- coding: utf-8 -*-
"""§1.1 per-varga 重构 golden：jyotish 须算在「实际所绘分盘」上，而非恒 D1。

核心不变量(回归测试覆盖)：
  1) jyotish 随分盘：D9 行星位置/宿 与 D1 不同(分盘重定位生效)；engine.chartnum 写真分盘号。
  2) always-D1 子项跨分盘恒定：大运(月宿起点)/Panchanga(真日月 tithi)/Gochara(本命月)不随分盘变。
  3) 无 in-place 泄漏：用独立 D1 副本算分盘 jyotish 后，该 D1 副本的盘对象仍在 D1 位置。
  4) chartnum==1 退化：与重构前行为一致(d1≡self)。
  5) vargaSet → jyotishByVarga：opt-in 多分盘、去重、上限 16；每分盘 engine.chartnum 正确。
"""
import os
import sys

_ASTRO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ASTRO not in sys.path:
    sys.path.insert(0, _ASTRO)
_FLATLIB = os.path.abspath(os.path.join(_ASTRO, '..', 'flatlib-ctrad2'))
if _FLATLIB not in sys.path:
    sys.path.insert(0, _FLATLIB)

from flatlib import const  # noqa: E402

from astrostudy.india.india_chart_kernel import IndiaChartKernel  # noqa: E402
from astrostudy.india.jyotish_engine import build_jyotish, safe_get  # noqa: E402
from astrostudy.india.varga import apply_varga_chart  # noqa: E402


def _data():
    return {
        'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
        'lat': '28n36', 'lon': '77e12',
        'indiaHsys': 0, 'indiaAyanamsa': 'lahiri',
    }


def _jyotish_for(chartnum):
    """复刻 webindiasrv 的 §1.1 流程：分盘时另建 D1 副本作 always-D1 源。"""
    data = _data()
    perchart = IndiaChartKernel(data)
    d1_perchart = None
    if chartnum != 1:
        d1_perchart = IndiaChartKernel(data)
        apply_varga_chart(perchart, chartnum)
    return build_jyotish(perchart, chartnum=chartnum, d1_perchart=d1_perchart)


def _planet_signs(jyotish):
    return {p['id']: p['sign'] for p in jyotish['strengths']['planetaryStates']}


# ── 1) jyotish 随分盘 ──
def test_chartnum_written_through():
    assert _jyotish_for(1)['engine']['chartnum'] == 1
    assert _jyotish_for(9)['engine']['chartnum'] == 9
    assert _jyotish_for(10)['engine']['chartnum'] == 10


def test_jyotish_follows_varga_positions():
    d1 = _jyotish_for(1)
    d9 = _jyotish_for(9)
    # D9 重定位后，至少一颗星的星座与 D1 不同(几乎不可能全 vargottama)。
    assert _planet_signs(d1) != _planet_signs(d9)
    # ASC 宿亦随分盘改变(显示盘口径)。
    assert d1['nakshatras'].get(const.ASC) != d9['nakshatras'].get(const.ASC) \
        or _planet_signs(d1) != _planet_signs(d9)


# ── 2) always-D1 子项跨分盘恒定 ──
def test_always_d1_invariants_across_varga():
    d1 = _jyotish_for(1)
    d9 = _jyotish_for(9)
    d10 = _jyotish_for(10)
    # 大运:Vimshottari 序列(月宿起点)恒 D1 → 三盘完全一致。
    assert d1['dasha']['vimshottari'] == d9['dasha']['vimshottari']
    assert d1['dasha']['vimshottari'] == d10['dasha']['vimshottari']
    # Panchanga 真日月(tithi/yoga/karana)恒 D1。
    assert d1['panchanga'] == d9['panchanga'] == d10['panchanga']
    # Gochara 本命月(Sade Sati 基准)恒 D1。
    assert d1['transit'] == d9['transit'] == d10['transit']
    # Ashtottari / Yogini 同理。
    assert d1['dasha']['ashtottari'] == d9['dasha']['ashtottari']
    assert d1['dasha']['yogini'] == d9['dasha']['yogini']


# ── 3) 无 in-place 泄漏 ──
def test_no_inplace_pollution_of_d1_copy():
    data = _data()
    shared_d1 = IndiaChartKernel(data)
    moon_before = safe_get(shared_d1.chart, const.MOON).lon
    asc_before = safe_get(shared_d1.chart, const.ASC).lon
    perchart9 = IndiaChartKernel(data)
    apply_varga_chart(perchart9, 9)
    # 用 shared_d1 作 always-D1 源算 D9 jyotish——不得污染 shared_d1。
    build_jyotish(perchart9, chartnum=9, d1_perchart=shared_d1)
    assert safe_get(shared_d1.chart, const.MOON).lon == moon_before
    assert safe_get(shared_d1.chart, const.ASC).lon == asc_before
    # 而 perchart9 确已重定位(分盘 ASC ≠ D1 ASC，除非恰好整除)。
    assert safe_get(perchart9.chart, const.MOON).lon != moon_before \
        or safe_get(perchart9.chart, const.ASC).lon != asc_before


# ── 4) chartnum==1 退化(d1≡self) ──
def test_chartnum1_degenerates_to_legacy():
    # 不传 d1_perchart 与传 self 行为一致；且与「先算后 reinit」语义等价。
    data = _data()
    p = IndiaChartKernel(data)
    a = build_jyotish(p)                       # 旧签名(默认 chartnum=1)
    p2 = IndiaChartKernel(data)
    b = build_jyotish(p2, chartnum=1, d1_perchart=None)
    assert a['strengths'] == b['strengths']
    assert a['dasha'] == b['dasha']
    assert a['panchanga'] == b['panchanga']


# ── 5) vargaSet 解析 + jyotishByVarga ──
def test_parse_varga_set():
    from websrv.webindiasrv import IndiaAstroSrv
    pv = IndiaAstroSrv._parse_varga_set
    assert pv('1,9,10') == [1, 9, 10]
    assert pv('9，10，9') == [9, 10]            # 全角逗号 + 去重
    assert pv([1, 9, 9, 10]) == [1, 9, 10]
    assert pv('') == [] and pv(None) == []
    assert pv('1,abc,9') == [1, 9]             # 非法跳过
    assert pv('99,7') == [1, 7]                # 99 归一化为 1(非法分盘号)→去重后 [1,7]
    # 上限 16
    big = ','.join(str(x) for x in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24, 27, 30])
    assert len(pv(big)) == 16


# ── WP8 Amsa-bala 接线(P-e → strengths.vargaDignity) ──
def test_amsa_bala_in_varga_dignity():
    out = _jyotish_for(1)
    vd = out['strengths']['vargaDignity']
    assert vd
    amsa_rows = [r for r in vd if 'amsa' in r]
    assert amsa_rows
    a = amsa_rows[0]['amsa']
    assert set(a.keys()) == {'shadvarga', 'saptavarga', 'dasavarga', 'shodasavarga'}
    assert all(isinstance(a[g]['count'], int) for g in a)
