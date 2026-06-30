# -*- coding: utf-8 -*-
"""
次要推运(minor)月长算法 minorVariant 锁定测试。
- 'engine'(默认): 保留引擎历史取值 age_days/12.3685/365.2425(疑似漏乘 /365.2425),零回归。
- 'synodic'(标准·朔望月/年): age_days*29.530589/365.2425(权威:Astrodienst/Wikipedia「a lunar month for a year」)。
- 'sidereal'(月亮回归·恒星月/年): age_days*27.321661/365.2425。
secondary/tertiary 不受 minorVariant 影响。不传 minor_variant ⇒ 与 'engine' 逐字一致(默认即现状·铁律1)。
"""
import os
import sys

_ASTRO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ASTRO not in sys.path:
    sys.path.insert(0, _ASTRO)

from astrostudy.astroextra import progression_date  # noqa: E402


class _DT:
    def __init__(self, jd):
        self.jd = jd


BASE = _DT(2451545.0)          # J2000
TARGET = _DT(2451545.0 + 10957.0)  # +30 历年
AGE = 10957.0


def _approx(a, b, eps=1e-6):
    return abs(a - b) <= eps


def test_secondary_unchanged():
    assert _approx(progression_date(BASE, TARGET, 'secondary'), BASE.jd + AGE / 365.2425)


def test_tertiary_unchanged():
    assert _approx(progression_date(BASE, TARGET, 'tertiary'), BASE.jd + AGE / 27.321661)


def test_minor_engine_default_is_legacy():
    legacy = BASE.jd + AGE / 12.3685 / 365.2425
    # 不传 variant == 显式 'engine' == 历史现状
    assert _approx(progression_date(BASE, TARGET, 'minor'), legacy)
    assert _approx(progression_date(BASE, TARGET, 'minor', 'engine'), legacy)


def test_minor_synodic_standard():
    expect = BASE.jd + AGE * 29.530589 / 365.2425
    assert _approx(progression_date(BASE, TARGET, 'minor', 'synodic'), expect)
    # 标准朔望月/年应远大于 engine(后者漏乘约365倍)
    assert (progression_date(BASE, TARGET, 'minor', 'synodic') - BASE.jd) > \
           (progression_date(BASE, TARGET, 'minor', 'engine') - BASE.jd) * 100


def test_minor_sidereal():
    expect = BASE.jd + AGE * 27.321661 / 365.2425
    assert _approx(progression_date(BASE, TARGET, 'minor', 'sidereal'), expect)


def test_unknown_variant_falls_back_to_engine():
    legacy = BASE.jd + AGE / 12.3685 / 365.2425
    assert _approx(progression_date(BASE, TARGET, 'minor', 'nonsense'), legacy)
