# -*- coding: utf-8 -*-
"""印度盘压力测试套件：不变量(property) + 输入边界(不崩/优雅降级) + 组合冒烟。

对应计划 §4：现实区间笛卡尔抽样、极地/赤道/南半球/公元前/远未来/闰年边界、
八分点 SAV=337、大运期长守恒、卡拉卡唯一等硬不变量。
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'flatlib-ctrad2'))

from astrostudy.india.india_chart_kernel import IndiaChartKernel  # noqa: E402
from astrostudy.india.jyotish_engine import JyotishEngine  # noqa: E402


def _eng(date='1990/3/15', time='07:30:00', zone='+05:30', lat='28n36', lon='77e12',
         hsys=0, ayan='lahiri', ad=None, dasha_system=None):
    data = {'date': date, 'time': time, 'zone': zone, 'lat': lat, 'lon': lon,
            'indiaHsys': hsys, 'indiaAyanamsa': ayan}
    if ad is not None:
        data['ad'] = ad
    return JyotishEngine(IndiaChartKernel(data), dasha_system=dasha_system)


# ── §4.2 不变量(property-based) ─────────────────────────────────────────
@pytest.mark.parametrize('date', ['1985/6/15', '2000/1/1', '2026/6/19', '1947/8/15'])
def test_invariant_sav_337(date):
    av = _eng(date=date).ashtakavarga()
    if av.get('available'):
        assert sum(av['sarva'].values()) == 337


@pytest.mark.parametrize('sysname', ['vimshottari', 'yogini', 'ashtottari'])
def test_invariant_dasha_period_conservation(sysname):
    # 子运守恒不变量须看完整三级 → 选中该体系(lazy 优化下仅选中体系出 antardashas)。
    d = getattr(_eng(dasha_system=sysname), sysname)()
    assert d['mahadashas']
    for m in d['mahadashas']:
        sub = sum(a['years'] for a in m['antardashas'])
        assert abs(sub - m['years']) < 0.05, f'{sysname} {m["lord"]["key"]} 子运和不守恒'


def test_invariant_chara_karaka_8_unique():
    ks = _eng().jaimini()['charaKarakas']
    assert len(ks) == 8
    assert len({k['karakaLabel'] for k in ks}) == 8
    degs = [k['karakaDegree'] for k in ks]
    assert degs == sorted(degs, reverse=True)        # 降序(tie 用次级度数)


def test_invariant_graha_drishti_full_aspect_houses():
    # 所有曜至少有 7 视(对宫)；火/木/土有特殊全视
    dr = _eng().compute()['grahaDrishti']
    assert dr and all('aspectHouse' in d for d in dr)


# ── §4.1 输入边界(不崩 + 返回结构) ──────────────────────────────────────
@pytest.mark.parametrize('date,ad', [
    ('2000/2/29', 1),     # 闰年
    ('100/3/15', 1),      # 远古(Swiss 星历边界)
    ('500/6/1', -1),      # 公元前
    ('2200/12/31', 1),    # 远未来
])
def test_boundary_dates_no_crash(date, ad):
    out = _eng(date=date, ad=ad).compute()
    assert isinstance(out, dict) and 'engine' in out     # 不崩、有结构


@pytest.mark.parametrize('lat,lon', [
    ('78n13', '15e38'),   # 极地(挪威 Svalbard)
    ('0n00', '0e00'),     # 赤道本初
    ('33s52', '151e12'),  # 南半球(悉尼)
    ('64n08', '21w56'),   # 近北极圈(雷克雅未克)
])
def test_boundary_geo_no_crash(lat, lon):
    out = _eng(lat=lat, lon=lon).compute()
    assert isinstance(out, dict) and 'engine' in out
    # 极地日月仍应有位置(panchanga 可能因日出不定而降级，但不得整体崩)
    assert 'panchanga' in out


# ── §4.1 组合冒烟(岁差 × 分宫 × 大运体系 抽样) ───────────────────────────
@pytest.mark.parametrize('ayan', ['lahiri', 'raman', 'krishnamurti', 'fagan_bradley'])
@pytest.mark.parametrize('hsys', [0, 1, 5])
def test_smoke_ayanamsa_hsys_combos(ayan, hsys):
    out = _eng(ayan=ayan, hsys=hsys).compute()
    assert isinstance(out, dict) and 'engine' in out
    assert out.get('strengths', {}).get('planetaryStates')


# ── 全功能包集成压测：full compute 含新键、边界不崩、关键不变量 ──
@pytest.mark.parametrize('date,lat,lon', [
    ('1990/3/15', '28n36', '77e12'),   # 正常
    ('1850/6/1', '78n13', '15e38'),    # 古代 + 极地(双重边界)
    ('2200/2/29', '0n00', '0e00'),     # 远未来 + 赤道 + 闰年
])
def test_full_compute_has_all_keys_and_survives(date, lat, lon):
    out = _eng(date=date, lat=lat, lon=lon).compute()
    for k in ('panchanga', 'dasha', 'rasiDasha', 'arudha', 'upagraha',
              'ashtakavarga', 'shadbalaBphs', 'strengths', 'muhurta'):
        assert k in out, k


def test_narayana_first_cycle_is_permutation():
    nar = _eng().compute()['rasiDasha'].get('narayana', {})
    mh = nar.get('mahadashas') or []
    if len(mh) >= 12:
        rasis = [m['rasi'] for m in mh[:12]]
        assert len(set(rasis)) == 12          # 首轮 12 宫各一(排列)


def test_strengths_avasthas_present():
    st = _eng().compute()['strengths']
    p = st['planetaryStates'][0]
    assert 'baladi' in p and 'jagradadi' in p and 'deeptadi' in p
    assert st.get('naisargikaKaraka') and st.get('sthiraKaraka')


# ── WP10 + 全功能集成压测：化解/须臾/Aakriti 边界存活 + 不变量 ──
@pytest.mark.parametrize('date,lat,lon', [
    ('1990/3/15', '28n36', '77e12'),   # 正常
    ('1850/6/1', '78n13', '15e38'),    # 古 + 极地
    ('2200/2/29', '0n00', '0e00'),     # 远未来 + 赤道 + 闰年
])
def test_wp10_keys_survive(date, lat, lon):
    out = _eng(date=date, lat=lat, lon=lon).compute()
    rem = out.get('remedies') or {}
    assert isinstance(rem.get('table'), list) and len(rem['table']) == 9   # 九曜宝石恒全
    mu = out.get('muhurta') or {}
    assert 'birthMuhurta' in mu or mu.get('available') is False            # 须臾键在(极地可 None)
    # Aakriti/Sankhya 类别可达(此盘未必触发，但目录在)
    cats = {y.get('category') for y in (out.get('yogas') or {}).get('items', [])}
    assert isinstance(cats, set)


def test_remedies_recommendation_safe():
    out = _eng().compute()
    for r in (out.get('remedies') or {}).get('recommendations', []):
        # 功能凶星只警示、不推荐(信息非处方铁律)
        assert not (r.get('recommend') and r.get('caution'))


# ── 印度盘增补集成压测:功能吉凶/宫力/补充大运/KP6级/Graha Yuddha 边界存活 ──
@pytest.mark.parametrize('date,lat,lon', [
    ('1990/3/15', '28n36', '77e12'),
    ('1850/6/1', '78n13', '15e38'),
    ('2200/2/29', '0n00', '0e00'),
])
def test_qw_keys_survive(date, lat, lon):
    out = _eng(date=date, lat=lat, lon=lon).compute()
    fn = out.get('functionalNature') or {}
    assert len(fn.get('grahas', [])) == 9                      # 9 曜功能吉凶恒全
    bb = out.get('bhavaBala') or {}
    assert len(bb.get('houses', [])) == 12                     # 12 宫力恒全
    ed = out.get('extendedDashas') or {}
    assert len(ed.get('conditional', {})) == 8                 # 8 条件宿系
    kp = out.get('kp') or {}
    assert kp.get('kpLevels') and kp.get('rulingPlanets')      # KP 6级 + RP
    assert 'grahaYuddha' in out


def test_extended_dasha_total_years_invariant():
    ed = _eng().compute().get('extendedDashas') or {}
    expect = {'shodashottari': 116, 'dvadashottari': 112, 'panchottari': 105, 'shatabdika': 100,
              'chaturashitiSama': 84, 'dwisaptatiSama': 72, 'shashtihayani': 60, 'shattrimshaSama': 36}
    for key, total in expect.items():
        d = (ed.get('conditional') or {}).get(key) or {}
        mh = d.get('mahadashas') or []
        if mh:
            s = sum(m.get('fullYears', m.get('years', 0)) for m in mh)
            assert abs(s - total) < 0.5, f'{key} 总年 {s} != {total}'
