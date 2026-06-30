# -*- coding: utf-8 -*-
"""印度占星补救法引擎（宝石/真言/善行）结构性测试。"""

import pytest

from astrostudy.india import remedies as R


ALL_PLANETS = [
    'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter',
    'Venus', 'Saturn', 'North Node', 'South Node',
]

# 权威对照表预期值（宝石 / 金属），用于回归锁定转录。
EXPECTED_GEMS = {
    'Sun': ('红宝石', 'Ruby', '黄金'),
    'Moon': ('珍珠', 'White Pearl', '黄金'),
    'Mars': ('红珊瑚', 'Red Coral', '紫铜'),
    'Mercury': ('祖母绿', 'Emerald', '白银 / 铂金'),
    'Jupiter': ('黄宝石', 'Yellow Sapphire', '黄金'),
    'Venus': ('钻石', 'Diamond', '白银 / 铂金'),
    'Saturn': ('蓝宝石', 'Blue Sapphire', '铁 (或白银)'),
    'North Node': ('锆石 (Gomedha)', 'Hessonite (Gomedha)', '白银'),
    'South Node': ('猫眼', "Cat's Eye", '白银'),
}

# 真言诵念次数（书给出的可文本化数值）。
EXPECTED_MANTRA_COUNT = {
    'Sun': 6000, 'Moon': 10000, 'Mars': 7000, 'Mercury': 17000,
    'Jupiter': 16000, 'Venus': 20000, 'Saturn': 19000,
    'North Node': 18000, 'South Node': 7000,
}


# ── gemstone_table ───────────────────────────────────────────────────────
def test_table_has_nine_planets():
    table = R.gemstone_table()
    assert len(table) == 9
    assert [row['planet'] for row in table] == R.PLANET_ORDER


def test_table_order_is_sun_to_ketu():
    assert R.PLANET_ORDER == ALL_PLANETS


def test_every_gem_nonempty():
    for row in R.gemstone_table():
        assert row['gem'], row['planet']
        assert row['gemEn'], row['planet']
        assert row['metal'], row['planet']
        assert row['planetCn'], row['planet']


# ── gemstone_for_planet ──────────────────────────────────────────────────
@pytest.mark.parametrize('planet', ALL_PLANETS)
def test_gemstone_for_each_planet(planet):
    g = R.gemstone_for_planet(planet)
    assert g is not None
    cn, en, metal = EXPECTED_GEMS[planet]
    assert g['gem'] == cn
    assert g['gemEn'] == en
    assert g['metal'] == metal
    assert g['planet'] == planet


@pytest.mark.parametrize('planet', ALL_PLANETS)
def test_mantra_counts_match_book(planet):
    g = R.gemstone_for_planet(planet)
    assert g['mantraCount'] == EXPECTED_MANTRA_COUNT[planet]
    assert g['source']['mantra'] == 'classical'


def test_gemstone_invalid_key_returns_none():
    assert R.gemstone_for_planet('Pluto') is None
    assert R.gemstone_for_planet('') is None
    assert R.gemstone_for_planet(None) is None


def test_source_markers_present_and_valid():
    for planet in ALL_PLANETS:
        g = R.gemstone_for_planet(planet)
        src = g['source']
        for key in ('gem', 'metal', 'finger', 'mantra', 'deity', 'day'):
            assert key in src
            assert src[key] in (None, 'classical', 'community')
        # 宝石/金属/真言始终是书源。
        assert src['gem'] == 'classical'
        assert src['metal'] == 'classical'
        assert src['mantra'] == 'classical'
        # 星期为通行共识。
        assert src['day'] == 'community'


def test_finger_partial_book_coverage():
    # 书仅给出部分行星的手指；给出者标 classical，缺省者 finger=None & source=None。
    has_finger = {'Sun', 'Mercury', 'Jupiter', 'Venus', 'Saturn'}
    for planet in ALL_PLANETS:
        g = R.gemstone_for_planet(planet)
        if planet in has_finger:
            assert g['finger'], planet
            assert g['source']['finger'] == 'classical'
        else:
            assert g['finger'] is None, planet
            assert g['source']['finger'] is None


def test_deity_lists_nonempty_and_marked_classical():
    for planet in ALL_PLANETS:
        g = R.gemstone_for_planet(planet)
        assert isinstance(g['deity'], list)
        assert len(g['deity']) >= 1
        assert g['source']['deity'] == 'classical'


# ── recommend_remedies ───────────────────────────────────────────────────
def test_recommend_empty_list():
    assert R.recommend_remedies([]) == []
    assert R.recommend_remedies(None) == []


def test_recommend_full_list_natural_split():
    # 不给 functional_benefics -> 按自然吉凶。
    recs = R.recommend_remedies(ALL_PLANETS)
    assert len(recs) == 9
    by_planet = {r['planet']: r for r in recs}
    # 自然吉星推荐佩戴。
    for p in ('Moon', 'Mercury', 'Jupiter', 'Venus'):
        assert by_planet[p]['recommend'] is True
        assert by_planet[p]['caution'] is False
        assert by_planet[p]['role'] == 'benefic'
    # 自然凶星 -> 警示、不推荐。
    for p in ('Sun', 'Mars', 'Saturn', 'North Node', 'South Node'):
        assert by_planet[p]['recommend'] is False
        assert by_planet[p]['caution'] is True
        assert by_planet[p]['role'] == 'malefic'


def test_recommend_caution_flag_for_malefic_gem():
    # 单弱凶星 -> caution 必置位、不推荐。
    recs = R.recommend_remedies(['Saturn'])
    assert len(recs) == 1
    assert recs[0]['caution'] is True
    assert recs[0]['recommend'] is False


def test_recommend_benefic_gem_no_caution():
    recs = R.recommend_remedies(['Jupiter'])
    assert len(recs) == 1
    assert recs[0]['recommend'] is True
    assert recs[0]['caution'] is False
    assert recs[0]['gem'] == '黄宝石'


def test_functional_benefics_override():
    # 显式 functional_benefics 覆写自然吉凶:把 Saturn 当功能吉星 -> 推荐。
    recs = R.recommend_remedies(['Saturn', 'Moon'], functional_benefics=['Saturn'])
    by_planet = {r['planet']: r for r in recs}
    assert by_planet['Saturn']['recommend'] is True   # 被指定为功能吉星
    assert by_planet['Saturn']['caution'] is False
    assert by_planet['Moon']['recommend'] is False     # 未列入 -> 视为非吉
    assert by_planet['Moon']['caution'] is True


def test_recommend_dedup_and_stable_order():
    # 重复键去重 + 输出按 PLANET_ORDER 稳定排序。
    recs = R.recommend_remedies(['Venus', 'Sun', 'Venus', 'Sun'])
    planets = [r['planet'] for r in recs]
    assert planets == ['Sun', 'Venus']   # 去重 + 顺序为 PLANET_ORDER


def test_recommend_ignores_invalid_keys():
    recs = R.recommend_remedies(['Pluto', 'Jupiter', 'Nibiru'])
    assert [r['planet'] for r in recs] == ['Jupiter']


def test_recommend_items_have_all_fields():
    recs = R.recommend_remedies(['Jupiter', 'Saturn'])
    for r in recs:
        for key in ('planet', 'planetCn', 'gem', 'gemEn', 'metal',
                    'finger', 'day', 'mantraCount', 'deity', 'role',
                    'recommend', 'caution', 'note'):
            assert key in r, key
        assert r['note']


# ── compute ──────────────────────────────────────────────────────────────
def test_compute_shape():
    out = R.compute(weak_planets=['Jupiter'])
    assert set(out.keys()) == {'table', 'recommendations', 'meta'}
    assert len(out['table']) == 9
    assert len(out['recommendations']) == 1
    assert out['recommendations'][0]['planet'] == 'Jupiter'
    assert out['meta']['mantraNote']
    assert out['meta']['disclaimer']


def test_compute_default_empty_recs():
    out = R.compute()
    assert out['recommendations'] == []
    assert len(out['table']) == 9
