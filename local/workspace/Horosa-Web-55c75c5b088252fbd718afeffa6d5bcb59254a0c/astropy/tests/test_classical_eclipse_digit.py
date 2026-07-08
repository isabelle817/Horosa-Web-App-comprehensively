# -*- coding: utf-8 -*-
"""WI-23 交食食分 digit = magnitude×12 + 分档(小/中/大/全)。2025 四食验。"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import swisseph
from astrostudy import astroextra


def test_eclipse_digit_band_2025():
    ev = astroextra.calc_eclipses(swisseph.julday(2025, 1, 1, 0.0), swisseph.julday(2025, 12, 31, 0.0), '+08:00')
    assert len(ev) == 4, '2025 应 4 食(2 月全 + 2 日偏)'
    for e in ev:
        assert e['magnitude'] is not None
        assert abs(e['digit'] - round(e['magnitude'] * 12.0, 1)) < 0.01   # digit = mag×12
        assert e['band'] in ('小', '中', '大', '全')
    lunar = [e for e in ev if e['type'] == 'lunar_eclipse']
    assert all(e['digit'] > 12 and e['band'] == '全' for e in lunar), '2025 两次月食皆全食(digit>12)'


def test_eclipse_band_thresholds():
    assert astroextra._eclipse_band(1.5) == '小'
    assert astroextra._eclipse_band(5.0) == '中'
    assert astroextra._eclipse_band(11.9) == '大'
    assert astroextra._eclipse_band(12.0) == '全'
    assert astroextra._eclipse_band(16.3) == '全'
    assert astroextra._eclipse_band(None) is None
