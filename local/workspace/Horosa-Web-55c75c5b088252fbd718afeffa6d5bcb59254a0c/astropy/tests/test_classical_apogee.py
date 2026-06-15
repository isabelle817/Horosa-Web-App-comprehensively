# -*- coding: utf-8 -*-
"""WI-25/25b 远地点 apogee 升降 + 数增数减 + 月相光增减(swisseph 距速 distspeed)。
机理:距地渐增(distspeed>0)=升·趋远地点+数减(渐迟);渐减=降·趋近地点+数增(渐疾)。"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from astrostudy import perchart, astroextra


def _chart():
    pc = perchart.PerChart(astroextra.base_params({
        'date': '2020/01/13', 'time': '21:18:14', 'zone': '+08:00',
        'lat': '26N04', 'lon': '119E19', 'ad': 1, 'hsys': 'ALCABITUS',
    }))
    pc.getChartObj()
    return {o.id: o for o in pc.chart.objects if getattr(o, 'id', None)}


def test_apogee_number_consistency():
    objs = _chart()
    seven = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
    for sid in seven:
        o = objs.get(sid)
        assert o is not None and getattr(o, 'apogeeDir', None) in ('rising', 'falling')
        # 升(趋远地点)⟺数减;降(趋近地点)⟺数增。
        if o.apogeeDir == 'rising':
            assert o.numberTrend == 'decreasing', sid
        else:
            assert o.numberTrend == 'increasing', sid


def test_sun_rising_after_perihelion():
    # 近日点约 1/3-5;1/13 地日距渐增 → 太阳"升·趋远地点"(数减)。
    sun = _chart()['Sun']
    assert sun.apogeeDir == 'rising' and sun.numberTrend == 'decreasing'


def test_light_trend_moon_only():
    objs = _chart()
    assert getattr(objs['Moon'], 'lightTrend', None) in ('waxing', 'waning')
    # 非月体不设光增减。
    for sid in ('Sun', 'Mercury', 'Mars', 'Saturn'):
        assert getattr(objs[sid], 'lightTrend', None) is None
