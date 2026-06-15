# -*- coding: utf-8 -*-
"""
pd_engine 自检 — 共享球面原语与时间钥匙,锁定主限法引擎正确性。

参照基准:本命盘 1990-01-01 12:00 UT, 51.5°N 0°E(与引擎设计同源的验证盘)。
覆盖:黄道→赤道、AD/半弧、时间钥匙(真太阳弧 弧↔年 互逆)等共享原语。
"""
import math

import pytest
import swisseph

from astrostudy import pd_engine as pe


def _chart():
    jd = swisseph.julday(1990, 1, 1, 12.0)
    eps = float(swisseph.calc_ut(jd, swisseph.ECL_NUT)[0][0])
    phi, geolon = 51.5, 0.0
    armc = float(swisseph.houses_ex(jd, phi, geolon, b'P')[1][2])
    ids = {'Sun': swisseph.SUN, 'Moon': swisseph.MOON, 'Mercury': swisseph.MERCURY,
           'Venus': swisseph.VENUS, 'Mars': swisseph.MARS, 'Jupiter': swisseph.JUPITER,
           'Saturn': swisseph.SATURN}
    bodies = {}
    for name, pid in ids.items():
        xx = swisseph.calc_ut(jd, pid)[0]
        bodies[name] = {'lon': float(xx[0]), 'lat': float(xx[1])}
    cusps, ascmc = swisseph.houses_ex(jd, phi, geolon, b'P')
    angles = {'Asc': float(ascmc[0]), 'MC': float(ascmc[1]),
              'Desc': float((ascmc[0] + 180) % 360), 'IC': float((ascmc[1] + 180) % 360)}
    return bodies, angles, armc, phi, eps, jd


PAIRS = [('Sun', 'Saturn'), ('Venus', 'Moon'), ('Saturn', 'Venus'), ('Mars', 'Jupiter')]


def _same_quadrant(sig, prom, armc, phi, eps):
    ras, decs = pe.ecl_to_eq(sig['lon'], sig['lat'], eps)
    rap, decp = pe.ecl_to_eq(prom['lon'], prom['lat'], eps)
    same_md = (pe.meridian_distance(ras, armc) >= 0) == (pe.meridian_distance(rap, armc) >= 0)
    same_h = (pe.is_above_horizon(ras, decs, armc, phi) ==
              pe.is_above_horizon(rap, decp, armc, phi))
    return same_md and same_h


def test_ecl_to_eq_known():
    eps = 23.4392911
    ra, dec = pe.ecl_to_eq(0, 0, eps)
    assert abs(ra) < 1e-6 and abs(dec) < 1e-6
    ra, dec = pe.ecl_to_eq(90, 0, eps)
    assert abs(ra - 90) < 1e-6 and abs(dec - eps) < 1e-6


def test_ad_semiarc_equator():
    assert abs(pe.ascensional_difference(0, 51.5)) < 1e-9
    assert abs(pe.semiarc(0, 51.5, True) - 90) < 1e-9


def test_time_keys_dynamic_roundtrip():
    # 动态钥匙(真太阳弧)与其逆函数互逆(静态比例换算在 perpredict STATIC 表,各有专测)。
    natal_jd = 2451545.0
    years = pe.key_placidus_true_solar_arc(51.09, natal_jd)
    assert abs(pe.solar_arc_for_years(years, natal_jd) - 51.09) < 1e-6


def test_solar_arc_for_years_inverse():
    """真太阳弧:盘用 solar_arc_for_years(年→弧) 与表格 key_placidus_true_solar_arc(弧→年) 互逆,
    确保主限法盘与表格对 TrueSolarArc 一致(否则盘会把它当 Ptolemy)。"""
    _, _, _, _, _, jd = _chart()
    for arc in (10.0, 30.0, 55.0):
        years = pe.key_placidus_true_solar_arc(arc, jd)
        back = pe.solar_arc_for_years(years, jd)
        assert abs(back - arc) < 1e-3, f'round-trip arc={arc} -> {years}y -> {back}'
    # 真太阳弧与 Ptolemy(1°=1年) 必须不同,否则两个 key 等价(Bug2 的根因之一)。
    assert abs(pe.key_placidus_true_solar_arc(30.0, jd) - 30.0) > 0.1

