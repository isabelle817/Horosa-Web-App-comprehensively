# -*- coding: utf-8 -*-
"""出生须臾(一日 30 须臾) 结构/不变量 + 边界落段。

- 昼 15 + 夜 15 = 30；第 8 昼须臾为 Abhijit(至吉)。
- birth_muhurta 在段边界精确取 index;极地(日出不定)优雅降级 None。
- 须臾名/性取权威三十须臾对照表通行定本。
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'flatlib-ctrad2'))

from astrostudy.india.muhurta_day import (  # noqa: E402
    day_muhurtas, night_muhurtas, all_muhurtas, birth_muhurta,
    AUSPICIOUS, INAUSPICIOUS, MIXED,
)

_NATURES = {AUSPICIOUS, INAUSPICIOUS, MIXED}


# ── 参照表结构 ──────────────────────────────────────────────────────────
def test_counts_15_15_30():
    assert len(day_muhurtas()) == 15
    assert len(night_muhurtas()) == 15
    a = all_muhurtas()
    assert len(a['day']) + len(a['night']) == 30


def test_indices_contiguous_1_to_15():
    assert [m['index'] for m in day_muhurtas()] == list(range(1, 16))
    assert [m['index'] for m in night_muhurtas()] == list(range(1, 16))


def test_entry_shape_and_natures():
    for m in day_muhurtas() + night_muhurtas():
        assert set(m.keys()) == {'index', 'name', 'nameEn', 'lord', 'nature', 'isAbhijit'}
        assert m['nature'] in _NATURES
        assert isinstance(m['name'], str) and m['name']
        assert isinstance(m['nameEn'], str) and m['nameEn']
        assert isinstance(m['lord'], str) and m['lord']
        assert isinstance(m['isAbhijit'], bool)


def test_eighth_day_is_abhijit():
    day = day_muhurtas()
    abhijit = day[7]                       # 第 8 昼须臾
    assert abhijit['index'] == 8
    assert abhijit['nameEn'] == 'Abhijit'
    assert abhijit['isAbhijit'] is True
    assert abhijit['nature'] == AUSPICIOUS
    # 唯一一个 Abhijit
    flagged = [m for m in day + night_muhurtas() if m['isAbhijit']]
    assert len(flagged) == 1


def test_no_abhijit_in_night():
    assert all(m['isAbhijit'] is False for m in night_muhurtas())


# ── 出生落段：昼 ────────────────────────────────────────────────────────
# 取一段干净的昼/夜：日出 0.0、日没 0.5(昼 12h)、次日出 1.0(夜 12h)。
# 昼每须臾 = 0.5/15;夜每须臾 = 0.5/15。
_SR, _SS, _NSR = 0.0, 0.5, 1.0
_DAY_SLOT = (_SS - _SR) / 15.0
_NIGHT_SLOT = (_NSR - _SS) / 15.0


def test_day_first_muhurta_at_sunrise():
    r = birth_muhurta(_SR, _SR, _SS, _NSR)
    assert r['period'] == 'day'
    assert r['index'] == 1
    assert r['nameEn'] == day_muhurtas()[0]['nameEn']
    assert abs(r['startJd'] - _SR) < 1e-12
    assert abs(r['endJd'] - (_SR + _DAY_SLOT)) < 1e-12


def test_day_abhijit_boundary():
    # 第 8 昼须臾覆盖 [sunrise+7*slot, sunrise+8*slot)
    jd = _SR + 7 * _DAY_SLOT + _DAY_SLOT * 0.5
    r = birth_muhurta(jd, _SR, _SS, _NSR)
    assert r['period'] == 'day'
    assert r['index'] == 8
    assert r['isAbhijit'] is True
    assert r['nameEn'] == 'Abhijit'


def test_day_muhurta_boundary_exact_start_picks_next():
    # 恰在第 k 段起点(floor)→ index k(0-based idx=k-1)
    for k in (1, 2, 8, 15):
        jd = _SR + (k - 1) * _DAY_SLOT
        r = birth_muhurta(jd, _SR, _SS, _NSR)
        assert r['period'] == 'day'
        assert r['index'] == k, (k, r['index'])


def test_day_last_muhurta_just_before_sunset():
    jd = _SS - 1e-9
    r = birth_muhurta(jd, _SR, _SS, _NSR)
    assert r['period'] == 'day'
    assert r['index'] == 15


# ── 出生落段：夜 ────────────────────────────────────────────────────────
def test_night_first_muhurta_at_sunset():
    r = birth_muhurta(_SS, _SR, _SS, _NSR)   # jd == sunset → 夜段第 1
    assert r['period'] == 'night'
    assert r['index'] == 1
    assert r['nameEn'] == night_muhurtas()[0]['nameEn']
    assert abs(r['startJd'] - _SS) < 1e-12


def test_night_muhurta_boundaries():
    for k in (1, 8, 15):
        jd = _SS + (k - 1) * _NIGHT_SLOT
        r = birth_muhurta(jd, _SR, _SS, _NSR)
        assert r['period'] == 'night'
        assert r['index'] == k, (k, r['index'])


def test_night_last_just_before_next_sunrise():
    jd = _NSR - 1e-9
    r = birth_muhurta(jd, _SR, _SS, _NSR)
    assert r['period'] == 'night'
    assert r['index'] == 15


def test_startend_jd_contiguous_cover_day_and_night():
    # 全部 30 段首尾相接，覆盖 [sunrise, next_sunrise) 无缝无叠
    bounds = []
    for k in range(15):
        jd = _SR + (k + 0.5) * _DAY_SLOT
        r = birth_muhurta(jd, _SR, _SS, _NSR)
        bounds.append((r['startJd'], r['endJd']))
    for k in range(15):
        jd = _SS + (k + 0.5) * _NIGHT_SLOT
        r = birth_muhurta(jd, _SR, _SS, _NSR)
        bounds.append((r['startJd'], r['endJd']))
    assert abs(bounds[0][0] - _SR) < 1e-12
    assert abs(bounds[-1][1] - _NSR) < 1e-12
    for i in range(1, len(bounds)):
        assert abs(bounds[i][0] - bounds[i - 1][1]) < 1e-12


# ── 极地/缺值优雅降级 ──────────────────────────────────────────────────
def test_polar_none_sunrise():
    assert birth_muhurta(0.3, None, _SS, _NSR) is None


def test_none_birth_jd():
    assert birth_muhurta(None, _SR, _SS, _NSR) is None


def test_missing_sunset_or_next_sunrise():
    assert birth_muhurta(0.3, _SR, None, _NSR) is None
    assert birth_muhurta(0.3, _SR, _SS, None) is None


def test_illegal_interval_no_day():
    # 日没早于日出 → 非法 → None(极地无昼)
    assert birth_muhurta(0.3, 0.5, 0.4, 1.0) is None


def test_illegal_interval_no_night():
    # 次日出不晚于日没 → 非法 → None(极地无夜)
    assert birth_muhurta(0.7, 0.0, 0.5, 0.5) is None


def test_jd_before_sunrise_out_of_window():
    # 午夜后、次日出前但落在 sunrise 之前(不在本日昼夜窗)→ None
    assert birth_muhurta(_SR - 0.01, _SR, _SS, _NSR) is None
