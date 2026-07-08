# -*- coding: utf-8 -*-
"""Sudarshana Chakra(三盘合参)单元测试。"""

from astrostudy.india.sudarshana import sudarshana_chakra


def _row_by_planet(result, planet):
    for r in result['rows']:
        if r['planet'] == planet:
            return r
    return None


def test_planet_same_sign_as_lagna_is_house_1():
    # 行星与命宫同星座 -> houseFromLagna == 1
    res = sudarshana_chakra(
        {'Sun': 'Leo'},
        lagna_sign='Leo', sun_sign='Aries', moon_sign='Taurus',
    )
    row = _row_by_planet(res, 'Sun')
    assert row is not None
    assert row['houseFromLagna'] == 1


def test_house_counting_and_wrap():
    # 参考后 2 个星座 -> 第 3 宫
    res = sudarshana_chakra(
        {'Mars': 'Gemini'},  # Aries(0) -> Gemini(2): (2-0)%12+1 = 3
        lagna_sign='Aries', sun_sign='Aries', moon_sign='Aries',
    )
    assert _row_by_planet(res, 'Mars')['houseFromLagna'] == 3

    # 环绕情形:参考 Pisces(11),行星 Aries(0) -> (0-11)%12+1 = 2
    res2 = sudarshana_chakra(
        {'Mars': 'Aries'},
        lagna_sign='Pisces', sun_sign='Pisces', moon_sign='Pisces',
    )
    assert _row_by_planet(res2, 'Mars')['houseFromLagna'] == 2


def test_sun_and_moon_columns_independent():
    # 同一行星,三参考各自独立起宫
    # 行星 Libra(6);Lagna=Aries(0) -> 7;Sun=Cancer(3) -> (6-3)%12+1=4;Moon=Libra(6) -> 1
    res = sudarshana_chakra(
        {'Jupiter': 'Libra'},
        lagna_sign='Aries', sun_sign='Cancer', moon_sign='Libra',
    )
    row = _row_by_planet(res, 'Jupiter')
    assert row['houseFromLagna'] == 7
    assert row['houseFromSun'] == 4
    assert row['houseFromMoon'] == 1


def test_all_nine_planets_canonical_order():
    planet_signs = {
        'Sun': 'Aries', 'Moon': 'Taurus', 'Mars': 'Gemini',
        'Mercury': 'Cancer', 'Jupiter': 'Leo', 'Venus': 'Virgo',
        'Saturn': 'Libra', 'North Node': 'Scorpio', 'South Node': 'Taurus',
    }
    res = sudarshana_chakra(
        planet_signs, lagna_sign='Aries', sun_sign='Aries', moon_sign='Aries',
    )
    assert len(res['rows']) == 9
    order = [r['planet'] for r in res['rows']]
    assert order == [
        'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn',
        'North Node', 'South Node',
    ]
    # 中文标签抽查
    assert _row_by_planet(res, 'North Node')['planetLabel'] == '罗睺'
    assert _row_by_planet(res, 'South Node')['planetLabel'] == '计都'


def test_missing_reference_moon_yields_none():
    res = sudarshana_chakra(
        {'Sun': 'Leo', 'Moon': 'Cancer'},
        lagna_sign='Leo', sun_sign='Aries', moon_sign=None,
    )
    assert res['moonSign'] is None
    for r in res['rows']:
        assert r['houseFromMoon'] is None
        # 其它两列仍正常
        assert r['houseFromLagna'] is not None
        assert r['houseFromSun'] is not None


def test_empty_planet_signs():
    res = sudarshana_chakra(
        {}, lagna_sign='Aries', sun_sign='Leo', moon_sign='Cancer',
    )
    assert res['available'] is True
    assert res['rows'] == []


def test_return_shape_and_note():
    res = sudarshana_chakra(
        {'Sun': 'Leo'}, lagna_sign='Leo', sun_sign='Leo', moon_sign='Leo',
    )
    assert set(res.keys()) == {
        'available', 'lagnaSign', 'sunSign', 'moonSign', 'rows', 'note',
    }
    assert res['note'] == (
        'Sudarshana Chakra 三盘合参:命宫/太阳/月亮分别为上升,同断一事三方印证'
    )
    row = res['rows'][0]
    assert set(row.keys()) == {
        'planet', 'planetLabel', 'sign',
        'houseFromLagna', 'houseFromSun', 'houseFromMoon',
    }
