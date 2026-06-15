# -*- coding: utf-8 -*-
"""WI-01 出界 Out-of-Bounds 测试(古典参数补全)。
中性口径:|赤纬| > 真黄赤交角即出界;赤纬与黄道制无关。"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from astrostudy import perchart


class _FakePlanet(object):
    pass


def _chart():
    return perchart.PerChart({
        'date': '2025/03/01', 'time': '12:00:00', 'zone': '+00:00',
        'lat': '00N00', 'lon': '000E00', 'ad': 1, 'hsys': 'PLACIDUS',
    })


def test_obliquity_in_range():
    pc = _chart()
    pc.getChartObj()
    assert 23.40 <= pc.eclObliquity <= 23.50, '真黄赤交角应 ≈23.44° 量级'


def test_setup_oob_boolean_boundary():
    """plan 验收:decl 略大/略小于 ε 各一例,断言布尔与 delta。"""
    pc = _chart()
    pc.getChartObj()
    eps = pc.eclObliquity
    over = _FakePlanet(); over.decl = eps + 0.5
    pc.setupOutOfBounds(over, 'Sun')
    assert over.outOfBounds is True
    assert abs(over.oobDelta - 0.5) < 1e-6
    under = _FakePlanet(); under.decl = eps - 0.5
    pc.setupOutOfBounds(under, 'Sun')
    assert under.outOfBounds is False
    assert under.oobDelta < 0


def test_real_chart_oob_consistency():
    """整盘自洽:每行星 outOfBounds == (|decl| > ε);且 2025-03-01 火星确出界。"""
    pc = _chart()
    pc.getChartObj()
    eps = pc.eclObliquity
    mars = pc.chart.get('Mars')
    assert mars.outOfBounds is True, 'Mars 2025-03-01 decl≈25.8° 应出界'
    assert mars.oobDelta > 0
    for oid in ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']:
        p = pc.chart.get(oid)
        assert p.outOfBounds == (abs(p.decl) > eps)
        assert abs(p.oobDelta - round(abs(p.decl) - eps, 3)) < 1e-6


def test_moon_oob_mode_present():
    pc = _chart()
    pc.getChartObj()
    moon = pc.chart.get('Moon')
    assert getattr(moon, 'oobMode', None) in ('going', 'returning')
