# -*- coding: utf-8 -*-
"""G20-P2 三分集变体 golden:PtolemaicWaterVariant(托勒密·水象变体)后端尊贵表。

口径对齐前端 astrostudyui/src/utils/triplicityRulers.js +
hellenisticData.json Water.text_variant: day=[Mars,Venus] / night=[Mars,Moon]。

铁律:默认 Dorothean(=tables.ESSENTIAL_DIGNITIES)与普通 Ptolemaic 表
对「非水象座」字节不变;水象变体仅覆盖水象三座的 trip。
"""
import copy
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from astrostudy import perchart
from flatlib.dignities import essential, tables

WATER_SIGNS = ('Cancer', 'Scorpio', 'Pisces')
NON_WATER = ('Aries', 'Taurus', 'Gemini', 'Leo', 'Virgo',
             'Libra', 'Sagittarius', 'Capricorn', 'Aquarius')


# ---------------------------------------------------------------- 表内容 golden

def test_water_variant_day_table_water_trip():
    """昼表:水象三座 trip == [Mars, Venus, '']。"""
    tbl = perchart._PTOLEMAIC_WATER_VARIANT_DIGNITIES_DAY
    for s in WATER_SIGNS:
        assert tbl[s]['trip'] == ['Mars', 'Venus', ''], s


def test_water_variant_night_table_water_trip():
    """夜表:水象三座 trip == [Mars, Moon, '']。"""
    tbl = perchart._PTOLEMAIC_WATER_VARIANT_DIGNITIES_NIGHT
    for s in WATER_SIGNS:
        assert tbl[s]['trip'] == ['Mars', 'Moon', ''], s


def test_water_variant_matches_frontend_text_variant():
    """昼第二主=金、夜第二主=月,与前端 text_variant 完全一致。"""
    day = perchart._PTOLEMAIC_WATER_VARIANT_DIGNITIES_DAY
    night = perchart._PTOLEMAIC_WATER_VARIANT_DIGNITIES_NIGHT
    for s in WATER_SIGNS:
        # day=[Mars(主), Venus(次)]
        assert day[s]['trip'][0] == 'Mars' and day[s]['trip'][1] == 'Venus', s
        # night=[Mars(主), Moon(次)]
        assert night[s]['trip'][0] == 'Mars' and night[s]['trip'][1] == 'Moon', s


# ---------------------------------------------------------------- 零回归守护

def test_zero_regression_default_table_untouched():
    """默认 Dorothean(tables.ESSENTIAL_DIGNITIES)所有座 trip 字节不变。"""
    # 水象默认仍是 ctrad 多罗特三主 [Venus, Mars, Moon];push/pop 后不得污染。
    for s in WATER_SIGNS:
        assert tables.ESSENTIAL_DIGNITIES[s]['trip'] == ['Venus', 'Mars', 'Moon'], s


def test_zero_regression_water_variant_nonwater_equals_ptolemaic():
    """水象变体表的「非水象座」与普通 Ptolemaic 表逐字节相等(火/土/风不分昼夜)。"""
    ptol = perchart._PTOLEMAIC_DIGNITIES
    for tbl in (perchart._PTOLEMAIC_WATER_VARIANT_DIGNITIES_DAY,
                perchart._PTOLEMAIC_WATER_VARIANT_DIGNITIES_NIGHT):
        for s in NON_WATER:
            assert tbl[s] == ptol[s], s


def test_zero_regression_plain_ptolemaic_water_unchanged():
    """普通 Ptolemaic 表水象仍是单主火星 [Mars, Mars, '']——未被水象变体改写。"""
    for s in WATER_SIGNS:
        assert perchart._PTOLEMAIC_DIGNITIES[s]['trip'] == ['Mars', 'Mars', ''], s


# ---------------------------------------------------------------- score/almuten 区分度

def _scores_under(tbl, sign, lon):
    """在给定表下取七政对 (sign,lon) 的 essential.score,临时换表后还原。"""
    orig = essential.TABLE
    try:
        essential.TABLE = tbl
        return {ID: essential.score(ID, sign, lon)
                for ID in ('Mars', 'Venus', 'Moon', 'Jupiter', 'Sun', 'Saturn', 'Mercury')}, \
               essential.almutem(sign, lon)
    finally:
        essential.TABLE = orig


def test_water_variant_scores_differ_from_default_and_ptolemaic():
    """水象座评分:昼变体≠默认、昼变体≠普通托勒密、昼变体≠夜变体。

    取 lon=10.0(避开端点)在天蝎座(水象)逐表对比。三分点(+3)的曜集合:
      默认 {Venus,Mars,Moon} / 普通托勒密 {Mars} / 水象昼 {Mars,Venus} / 水象夜 {Mars,Moon}。
    """
    sign, lon = 'Scorpio', 10.0
    default_sc, _ = _scores_under(tables.ESSENTIAL_DIGNITIES, sign, lon)
    ptol_sc, _ = _scores_under(perchart._PTOLEMAIC_DIGNITIES, sign, lon)
    day_sc, _ = _scores_under(perchart._PTOLEMAIC_WATER_VARIANT_DIGNITIES_DAY, sign, lon)
    night_sc, _ = _scores_under(perchart._PTOLEMAIC_WATER_VARIANT_DIGNITIES_NIGHT, sign, lon)

    assert day_sc != default_sc, '水象昼变体不得塌成默认多罗特'
    assert day_sc != ptol_sc, '水象昼变体不得塌成普通托勒密'
    assert night_sc != default_sc
    assert night_sc != ptol_sc
    assert day_sc != night_sc, '水象昼/夜变体必须可分(sect-aware 可见性)'

    # 具体投影:昼变体计金(+3 三分)、不计月三分;夜变体反之。
    assert day_sc['Venus'] - night_sc['Venus'] == 3   # 金:昼有三分、夜无
    assert night_sc['Moon'] - day_sc['Moon'] == 3     # 月:夜有三分、昼无
    assert day_sc['Mars'] == night_sc['Mars']         # 火:昼夜皆主,持平


def test_nonwater_signs_identical_across_water_variants():
    """非水象座在昼/夜水象变体表下评分完全相同(sect 仅影响水象)。"""
    for sign in ('Aries', 'Taurus', 'Gemini'):
        d, _ = _scores_under(perchart._PTOLEMAIC_WATER_VARIANT_DIGNITIES_DAY, sign, 12.0)
        n, _ = _scores_under(perchart._PTOLEMAIC_WATER_VARIANT_DIGNITIES_NIGHT, sign, 12.0)
        assert d == n, sign


# ---------------------------------------------------------------- push/pop 调度

def test_push_default_and_unknown_noop():
    """默认 Dorothean / 未知值 → push 返回 None 且不动 essential.TABLE(零回归)。"""
    before = essential.TABLE
    for v in (None, '', 'Dorothean', 'Nonsense'):
        tok = perchart.push_request_trip(v)
        assert tok is None
        assert essential.TABLE is before
        perchart.pop_request_trip(tok)  # None 安全 no-op
    assert essential.TABLE is before


def test_push_ptolemaic_swaps_then_pop_restores():
    before = essential.TABLE
    tok = perchart.push_request_trip('Ptolemaic')
    try:
        assert essential.TABLE is perchart._PTOLEMAIC_DIGNITIES
    finally:
        perchart.pop_request_trip(tok)
    assert essential.TABLE is before


def test_push_water_variant_lands_on_day_table_then_restores():
    """PtolemaicWaterVariant push 先落「昼」表(夜盘由 setupPlanets 据 isDiurnal 换夜表)。"""
    before = essential.TABLE
    tok = perchart.push_request_trip('PtolemaicWaterVariant')
    try:
        assert essential.TABLE is perchart._PTOLEMAIC_WATER_VARIANT_DIGNITIES_DAY
    finally:
        perchart.pop_request_trip(tok)
    assert essential.TABLE is before
