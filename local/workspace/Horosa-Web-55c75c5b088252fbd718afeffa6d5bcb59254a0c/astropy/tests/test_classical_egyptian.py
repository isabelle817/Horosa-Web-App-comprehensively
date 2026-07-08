# -*- coding: utf-8 -*-
"""WI-28 埃及历法:天狼偕日升(Sothic 岁首) + 上升十分宫(36 旬·迦勒底面主)。"""
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from astrostudy import astroextra


def test_egyptian_calendar():
    r = astroextra.analyze_chart({
        'date': '2020/01/13', 'time': '21:18:14', 'zone': '+08:00',
        'lat': '26N04', 'lon': '119E19', 'ad': 1, 'hsys': 'ALCABITUS',
    })
    eg = r['egyptianCalendar']
    # 天狼偕日升:YYYY-MM-DD,北半球中纬约盛夏(7-9月)。
    assert eg['siriusRising'] and re.match(r'^\d{4}-\d{2}-\d{2}$', eg['siriusRising'])
    mon = int(eg['siriusRising'].split('-')[1])
    assert 7 <= mon <= 9, eg['siriusRising']
    # 上升十分宫:此盘上升处女13° → 全 36 旬第 17 旬,迦勒底面主金星。
    assert eg['decanIndex'] == 17
    assert eg['decanSign'] == 'Virgo'
    assert eg['decanRuler'] == 'Venus'


def test_sirius_year_matches_rising_date():
    # B4 回归:高纬度该年天狼或不可见,heliacal_ut 顺推至次年 → siriusYear 须取实际升起年(日期前4位),不得与 siriusRising 矛盾。
    for case in [
        {'date': '1980/06/15', 'time': '12:00:00', 'zone': '+01:00', 'lat': '69N39', 'lon': '18E57', 'ad': 1, 'hsys': 1},   # Tromsø 高纬:顺推次年
        {'date': '1980/06/15', 'time': '12:00:00', 'zone': '+08:00', 'lat': '31N14', 'lon': '121E29', 'ad': 1, 'hsys': 1},   # 上海中纬:当年
    ]:
        eg = astroextra.analyze_chart(case)['egyptianCalendar']
        if eg.get('siriusRising'):
            assert eg['siriusYear'] == int(eg['siriusRising'][:4]), eg


def test_decan_index_range():
    r = astroextra.analyze_chart({
        'date': '2025/03/01', 'time': '12:00:00', 'zone': '+00:00',
        'lat': '40N00', 'lon': '000E00', 'ad': 1, 'hsys': 'PLACIDUS',
    })
    eg = r['egyptianCalendar']
    assert 1 <= eg['decanIndex'] <= 36
    assert eg['decanRuler'] in ('Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn')
