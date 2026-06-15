# -*- coding: utf-8 -*-
"""WI-27 参照星定位(巴比伦式):每七政最近亮参照星(星等<2.5,近黄道)+黄经距;<1°标合。"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from astrostudy import astroextra


def test_babylonian_reference_stars():
    r = astroextra.analyze_chart({
        'date': '2020/01/13', 'time': '21:18:14', 'zone': '+08:00',
        'lat': '26N04', 'lon': '119E19', 'ad': 1, 'hsys': 'ALCABITUS',
    })
    rows = r['babylonianStars']
    assert rows
    for x in rows:
        assert x['planet'] and x['star'] and 'cn' in x
        assert x['dist'] >= 0.0
        assert x['conj'] == (x['dist'] < 1.0)   # 合判定 = 黄经距<1°
    # 此盘月亮合轩辕十四(Regulus,<1°)。
    moon = [x for x in rows if x['planet'] == 'Moon']
    assert moon and moon[0]['star'] == 'Regulus' and moon[0]['conj'] is True
