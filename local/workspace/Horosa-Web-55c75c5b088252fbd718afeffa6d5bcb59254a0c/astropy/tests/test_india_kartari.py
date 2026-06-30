# -*- coding: utf-8 -*-
"""Kartari Yoga（夹击）单元测试。

钉定不变量：
- 两侧相邻宫（12th & 2nd from）皆吉星 → 吉夹 shubha；
- 两侧皆凶星 → 凶夹 papa；
- 混杂（一吉一凶）/ 任一侧空 → 该目标不成夹；
- 命宫（Lagna）同样可被夹；
- 空/非法输入 → available True 且 yogas 为空，不抛错。
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from astrostudy.india.kartari import kartari_yogas  # noqa: E402


def _find(result, target):
    for y in result['yogas']:
        if y['target'] == target:
            return y
    return None


def test_planet_hemmed_by_benefics_is_shubha():
    # Moon 在 Aries；前(Pisces)=Jupiter、后(Taurus)=Venus，两侧皆吉星 → 吉夹
    planet_signs = {
        'Moon': 'Aries',
        'Jupiter': 'Pisces',
        'Venus': 'Taurus',
    }
    res = kartari_yogas(planet_signs, lagna_sign=None)
    assert res['available'] is True
    moon = _find(res, 'Moon')
    assert moon is not None
    assert moon['type'] == 'shubha'
    assert moon['typeLabel'] == '吉夹 Shubha Kartari'
    assert moon['targetLabel'] == '月亮'
    assert moon['prevSign'] == 'Pisces'
    assert moon['nextSign'] == 'Taurus'
    assert moon['prevPlanets'] == ['Jupiter']
    assert moon['nextPlanets'] == ['Venus']
    assert moon['prevLabels'] == ['木星']
    assert moon['nextLabels'] == ['金星']


def test_planet_hemmed_by_malefics_is_papa():
    # 吉星 Jupiter 在 Leo；前(Cancer)=Saturn、后(Virgo)=Mars，两侧皆凶星 → 凶夹
    planet_signs = {
        'Jupiter': 'Leo',
        'Saturn': 'Cancer',
        'Mars': 'Virgo',
    }
    res = kartari_yogas(planet_signs, lagna_sign=None)
    jup = _find(res, 'Jupiter')
    assert jup is not None
    assert jup['type'] == 'papa'
    assert jup['typeLabel'] == '凶夹 Papa Kartari'
    assert jup['prevPlanets'] == ['Saturn']
    assert jup['nextPlanets'] == ['Mars']


def test_mixed_sides_not_hemmed():
    # Moon 在 Aries；前(Pisces)=Jupiter(吉)、后(Taurus)=Saturn(凶) → 混杂，不成夹
    planet_signs = {
        'Moon': 'Aries',
        'Jupiter': 'Pisces',
        'Saturn': 'Taurus',
    }
    res = kartari_yogas(planet_signs, lagna_sign=None)
    assert _find(res, 'Moon') is None


def test_one_side_empty_not_hemmed():
    # Moon 在 Aries；仅前(Pisces)=Jupiter，后(Taurus)空 → 不成夹
    planet_signs = {
        'Moon': 'Aries',
        'Jupiter': 'Pisces',
    }
    res = kartari_yogas(planet_signs, lagna_sign=None)
    assert _find(res, 'Moon') is None
    # Jupiter 自身也未被夹（其前 Aquarius / 后 Aries 邻宫无占据/不齐）
    assert _find(res, 'Jupiter') is None


def test_lagna_hemming_papa():
    # 命宫在 Gemini；前(Taurus)=Mars、后(Cancer)=Saturn，两侧皆凶星 → 命宫凶夹
    planet_signs = {
        'Mars': 'Taurus',
        'Saturn': 'Cancer',
    }
    res = kartari_yogas(planet_signs, lagna_sign='Gemini')
    lag = _find(res, 'Lagna')
    assert lag is not None
    assert lag['type'] == 'papa'
    assert lag['targetLabel'] == '命宫'
    assert lag['prevSign'] == 'Taurus'
    assert lag['nextSign'] == 'Cancer'
    assert sorted(lag['prevPlanets']) == ['Mars']
    assert sorted(lag['nextPlanets']) == ['Saturn']


def test_lagna_hemming_shubha():
    # 命宫在 Cancer；前(Gemini)=Mercury、后(Leo)=Venus，两侧皆吉星 → 命宫吉夹
    planet_signs = {
        'Mercury': 'Gemini',
        'Venus': 'Leo',
    }
    res = kartari_yogas(planet_signs, lagna_sign='Cancer')
    lag = _find(res, 'Lagna')
    assert lag is not None
    assert lag['type'] == 'shubha'
    assert lag['typeLabel'] == '吉夹 Shubha Kartari'


def test_nodes_count_as_malefics():
    # 罗睺/计都按凶星：Moon 在 Aries；前=Rahu、后=Ketu → 凶夹
    planet_signs = {
        'Moon': 'Aries',
        'North Node': 'Pisces',
        'South Node': 'Taurus',
    }
    res = kartari_yogas(planet_signs, lagna_sign=None)
    moon = _find(res, 'Moon')
    assert moon is not None
    assert moon['type'] == 'papa'
    assert moon['prevLabels'] == ['罗睺']
    assert moon['nextLabels'] == ['计都']


def test_multiple_occupants_one_side_must_all_match():
    # 后侧两占据者须全同属性方成夹：Sun(凶)+Mercury(吉) 同处 Taurus → 该侧混杂，不成夹
    planet_signs = {
        'Moon': 'Aries',
        'Mars': 'Pisces',       # 前侧凶
        'Sun': 'Taurus',        # 后侧凶
        'Mercury': 'Taurus',    # 后侧吉 → 后侧混杂
    }
    res = kartari_yogas(planet_signs, lagna_sign=None)
    assert _find(res, 'Moon') is None


def test_benefic_malefic_override():
    # 自定义集合：把 Mars 当吉星，则 Moon 前(Pisces)=Jupiter、后(Taurus)=Mars 皆吉 → 吉夹
    planet_signs = {
        'Moon': 'Aries',
        'Jupiter': 'Pisces',
        'Mars': 'Taurus',
    }
    res = kartari_yogas(
        planet_signs, lagna_sign=None,
        benefic_set={'Jupiter', 'Venus', 'Mercury', 'Moon', 'Mars'},
        malefic_set={'Sun', 'Saturn', 'North Node', 'South Node'},
    )
    moon = _find(res, 'Moon')
    assert moon is not None
    assert moon['type'] == 'shubha'


def test_empty_input_no_crash():
    res = kartari_yogas({}, lagna_sign=None)
    assert res['available'] is True
    assert res['yogas'] == []
    assert 'note' in res


def test_invalid_signs_skipped_no_crash():
    # 非法星座名 / 非字符串 lagna，皆跳过，不抛错
    planet_signs = {
        'Moon': 'NotASign',
        'Jupiter': 12345,
        'Venus': None,
        'Sun': 'Aries',
    }
    res = kartari_yogas(planet_signs, lagna_sign='Banana')
    assert res['available'] is True
    assert res['yogas'] == []


def test_return_shape_keys():
    planet_signs = {'Moon': 'Aries', 'Jupiter': 'Pisces', 'Venus': 'Taurus'}
    res = kartari_yogas(planet_signs, lagna_sign=None)
    assert set(res.keys()) == {'available', 'yogas', 'note'}
    y = res['yogas'][0]
    assert set(y.keys()) == {
        'target', 'targetLabel', 'type', 'typeLabel',
        'prevSign', 'nextSign', 'prevPlanets', 'nextPlanets',
        'prevLabels', 'nextLabels',
    }
