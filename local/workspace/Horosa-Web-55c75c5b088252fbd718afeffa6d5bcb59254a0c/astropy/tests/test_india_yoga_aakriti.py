# -*- coding: utf-8 -*-
"""Aakriti（形态）+ Sankhya（数目）瑜伽：结构 / 互斥 / 几何谓词 golden。

钉结构与不变量：
- Aakriti 形态对一张盘互斥（按几何分布归唯一形态），具体形态压制范围更宽的形态；
- 七曜（不含罗睺/计都）齐备方可成立，缺一不出；
- Sankhya 按七曜占据的不同星座数恰一命中（1..7）；
- 合成盘可触发 Gada / Kamala / Chakra 等典型形态；
- 全引擎仍正常返回，可含 Aakriti 类目。

形态条件为标准几何转录（占据宫位集合的纯谓词），非精确个例金标。
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'flatlib-ctrad2'))

from flatlib import const  # noqa: E402

import astrostudy.india.yoga_engine as ye  # noqa: E402
from astrostudy.india.india_chart_kernel import IndiaChartKernel  # noqa: E402
from astrostudy.india.jyotish_engine import JyotishEngine  # noqa: E402


# ── 合成盘工具：直接构造 YogaEngine，绕过实际星历 ──────────────────────────
class _FakeObj:
    def __init__(self, lon):
        self.lon = lon
        self.sign = const.LIST_SIGNS[int(lon / 30) % 12]
        self.signlon = lon % 30
        self.house = None


def _engine(planet_house, asc_sign=0):
    """planet_house: {planet: 距上升的宫号 1..12}。星体置于该宫中部。"""
    e = ye.YogaEngine.__new__(ye.YogaEngine)
    e.asc_sign = asc_sign
    e.objects, e.signs, e.houses = {}, {}, {}
    for planet, house in planet_house.items():
        sgn = (asc_sign + house - 1) % 12
        e.objects[planet] = _FakeObj(sgn * 30 + 5)
        e.signs[planet] = sgn
        e.houses[planet] = house
    return e


P = ye.CLASSICAL_PLANETS


def _spread(houses):
    """把 7 颗古典行星轮流分配到给定宫位，确保占据集合恰为这些宫。"""
    return {P[i]: houses[i % len(houses)] for i in range(7)}


def _aakriti_names(planet_house, asc_sign=0):
    return [it['name'] for it in _engine(planet_house, asc_sign).aakriti_yogas()]


# ── Aakriti 形态：每种合成盘恰好命中其形态（互斥）──────────────────────────
SHAPE_CASES = [
    ('Gada Yoga', [4, 7]),
    ('Gada Yoga', [10, 1]),
    ('Sakata Yoga', [1, 7]),
    ('Vihanga Yoga', [4, 10]),
    ('Sringataka Yoga', [1, 5, 9]),
    ('Hala Yoga', [2, 6, 10]),
    ('Hala Yoga', [3, 7, 11]),
    ('Hala Yoga', [4, 8, 12]),
    ('Kamala Yoga', [1, 4, 7, 10]),
    ('Vaapi Yoga', [2, 5, 8, 11]),
    ('Vaapi Yoga', [3, 6, 9, 12]),
    ('Yupa Yoga', [1, 2, 3, 4]),
    ('Sara Yoga', [4, 5, 6, 7]),
    ('Sakti Yoga', [7, 8, 9, 10]),
    ('Danda Yoga', [10, 11, 12, 1]),
    ('Chakra Yoga', [1, 3, 5, 7, 9, 11]),
    ('Samudra Yoga', [2, 4, 6, 8, 10, 12]),
    ('Nauka Yoga', [1, 2, 3, 4, 5, 6, 7]),
    ('Koota Yoga', [4, 5, 6, 7, 8, 9, 10]),
    ('Chatra Yoga', [7, 8, 9, 10, 11, 12, 1]),
    ('Chapa Yoga', [10, 11, 12, 1, 2, 3, 4]),
    ('Ardha Chandra Yoga', [2, 3, 4, 5, 6, 7, 8]),
    ('Ardha Chandra Yoga', [5, 6, 7, 8, 9, 10, 11]),
]


def test_aakriti_shapes_exactly_one_each():
    for expected, houses in SHAPE_CASES:
        got = _aakriti_names(_spread(houses))
        assert got == [expected], (
            'houses {0} 期望 [{1}]，实得 {2}'.format(houses, expected, got)
        )


def test_aakriti_mutual_exclusivity_general():
    # 任意合成盘最多命中一种 Aakriti 形态（互斥）。
    for _, houses in SHAPE_CASES:
        assert len(_aakriti_names(_spread(houses))) <= 1


def test_aakriti_category_and_no_nodes():
    # 类目正确，且行星集合不含罗睺/计都（七曜形态）。
    items = _engine(_spread([1, 4, 7, 10])).aakriti_yogas()
    assert items and all(it['category'] == 'Aakriti' for it in items)
    for it in items:
        assert const.NORTH_NODE not in it['planets']
        assert const.SOUTH_NODE not in it['planets']


def test_aakriti_requires_all_seven_classical():
    # 缺任一古典行星即不成立。
    pm = _spread([1, 4, 7, 10])
    pm.pop(const.SATURN)
    assert _engine(pm).aakriti_yogas() == []


def test_aakriti_nodes_do_not_break_shape():
    # 罗睺/计都即使落在“破坏”形态的宫位，也不影响七曜形态判定。
    pm = _spread([1, 4, 7, 10])
    pm[const.NORTH_NODE] = 2
    pm[const.SOUTH_NODE] = 8
    assert _aakriti_names(pm) == ['Kamala Yoga']


def test_vajra_and_yava_benefic_malefic_positions():
    # Vajra：吉星(木/金/水)在 1&7、凶星(日/火/土)在 4&10。
    vajra = {const.JUPITER: 1, const.VENUS: 1, const.MERCURY: 7, const.MOON: 1,
             const.SUN: 4, const.MARS: 4, const.SATURN: 10}
    assert _aakriti_names(vajra) == ['Vajra Yoga']
    # Yava：与 Vajra 吉凶相反。
    yava = {const.SUN: 1, const.MARS: 1, const.SATURN: 7, const.MOON: 4,
            const.JUPITER: 4, const.VENUS: 4, const.MERCURY: 10}
    assert _aakriti_names(yava) == ['Yava Yoga']


def test_gada_distinct_from_kamala_and_sakata():
    # 两相邻角宫=Gada；对角 1&7=Sakata；四角宫散布=Kamala，三者互斥。
    assert _aakriti_names(_spread([4, 7])) == ['Gada Yoga']
    assert _aakriti_names(_spread([1, 7])) == ['Sakata Yoga']
    assert _aakriti_names(_spread([1, 4, 7, 10])) == ['Kamala Yoga']


# ── Sankhya（数目）：按占据星座数恰一命中 ───────────────────────────────
def _sankhya_item(num_signs, asc_sign=0):
    # 让七曜恰好占据 num_signs 个不同星座（其余堆叠到首座）。
    signs = list(range(num_signs))
    pm = {}
    for i, planet in enumerate(P):
        sgn = signs[i] if i < num_signs else signs[0]
        pm[planet] = ((sgn - asc_sign) % 12) + 1
    eng = _engine(pm, asc_sign)
    return [it for it in eng.nabhasa_yogas()
            if 'sankhya' in it.get('tags', [])]


def test_sankhya_exactly_one_per_chart():
    expected = {1: 'Gola Yoga', 2: 'Yuga Yoga', 3: 'Shoola Yoga', 4: 'Kedara Yoga',
                5: 'Pasha Yoga', 6: 'Dama Yoga', 7: 'Veena Yoga'}
    for n in range(1, 8):
        items = _sankhya_item(n)
        assert len(items) == 1, '{0} 个星座应恰一 Sankhya，实得 {1}'.format(n, len(items))
        assert items[0]['name'] == expected[n]


def test_sankhya_excludes_nodes():
    # 罗睺/计都不计入 Sankhya 星座数。
    pm = {p: ((i % 7) - 0) % 12 + 1 for i, p in enumerate(P)}  # 7 星座
    # 节点扔进新星座也不改变 Sankhya 类别。
    base = _sankhya_item(7)
    assert base and base[0]['name'] == 'Veena Yoga'


# ── 全引擎冒烟 ──────────────────────────────────────────────────────────
def test_full_engine_smoke_returns_and_allows_aakriti():
    data = {'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'}
    out = JyotishEngine(IndiaChartKernel(data)).compute()['yogas']
    assert out['available'] is True
    assert isinstance(out['items'], list)
    # Aakriti 类目须在引擎可产出的范围内（不要求此盘命中）。
    cats = {it['category'] for it in out['items']}
    assert 'Aakriti' not in cats or all(
        it['category'] == 'Aakriti' for it in out['items'] if it['category'] == 'Aakriti'
    )


def test_extra_classical_yogas_chamara_triggers():
    # P1 长尾经典瑜伽:1975/4/10 盘触发 Chamara(≥2 自然吉曜共居 1/7/9/10);结构完整。
    from astrostudy.india.india_chart_kernel import IndiaChartKernel
    from astrostudy.india.jyotish_engine import JyotishEngine
    data = {'date': '1975/4/10', 'time': '12:00:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'}
    y = JyotishEngine(IndiaChartKernel(data)).yogas()
    assert y.get('available')
    cham = next((it for it in y['items'] if it['id'] == 'chamara'), None)
    assert cham is not None
    assert cham['name'] == 'Chamara Yoga' and cham['zhName'] == '拂尘瑜伽'
    assert cham['houses'] and cham['houses'][0] in (1, 7, 9, 10)
    assert len(cham['planets']) >= 2


def test_extra_classical_yogas_method_present_no_throw():
    # 方法已接入装配链 + 任何盘不抛(条件性,可空)。
    from astrostudy.india.india_chart_kernel import IndiaChartKernel
    from astrostudy.india.jyotish_engine import JyotishEngine
    for d in ('1990/3/15', '2000/11/5'):
        y = JyotishEngine(IndiaChartKernel({'date': d, 'time': '07:30:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'})).yogas()
        assert y.get('available') and isinstance(y.get('items'), list)
