# -*- coding: utf-8 -*-
"""八分点(Ashtakavarga)不变量 golden：
- SAV 必 = 337(7 曜 BAV 之和)——经典硬不变量。
- 各曜 BAV 总点数 = 标准定值(纯表结构，与具体盘无关)：日48/月49/火39/水54/木56/金52/土39。
- 每宫 bindu ∈ [0,8]；每曜 BAV 覆盖 12 宫。
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'flatlib-ctrad2'))

from astrostudy.india.india_chart_kernel import IndiaChartKernel  # noqa: E402
from astrostudy.india.jyotish_engine import (  # noqa: E402
    JyotishEngine, BENEFIC_HOUSES, KAKSHYA_LORDS, RASI_GUNAKARA, GRAHA_GUNAKARA)

# 标准各曜 BAV 总点数(表结构不变量)
_BAV_TOTALS = {'Sun': 48, 'Moon': 49, 'Mars': 39, 'Mercury': 54, 'Jupiter': 56, 'Venus': 52, 'Saturn': 39}


def test_benefic_houses_table_totals():
    # 纯表结构：每曜吉宫贡献总数 = 标准定值；7 曜和 = SAV 337。
    assert set(BENEFIC_HOUSES.keys()) == set(_BAV_TOTALS.keys())
    for target, table in BENEFIC_HOUSES.items():
        total = sum(len(houses) for houses in table.values())
        assert total == _BAV_TOTALS[target], f'{target} BAV 表总数 {total} != {_BAV_TOTALS[target]}'
    assert sum(_BAV_TOTALS.values()) == 337


def _av():
    data = {'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'}
    return JyotishEngine(IndiaChartKernel(data)).ashtakavarga()


def test_sav_337_per_chart():
    av = _av()
    assert av['available']
    assert sum(av['sarva'].values()) == 337                       # SAV 硬不变量
    for target, total in _BAV_TOTALS.items():
        assert sum(av['bhinna'][target].values()) == total        # 各曜 BAV 守恒
    for vals in av['bhinna'].values():
        assert len(vals) == 12 and all(0 <= b <= 8 for b in vals.values())


def test_kakshya_lords_and_gunakara_tables():
    # 转录护栏:Kakshya 主管次序 + 两 Gunakara 表(Graha 已核验,Rasi 各派一致)。
    assert KAKSHYA_LORDS == ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon', 'Lagna']
    assert RASI_GUNAKARA == [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12]
    assert GRAHA_GUNAKARA == {'Sun': 5, 'Moon': 5, 'Mars': 8, 'Mercury': 5,
                              'Jupiter': 10, 'Venus': 7, 'Saturn': 5}


def test_kakshya_prastara_sums_to_bav():
    # P0-6 自洽硬不变量:每曜每座 8 段(KAKSHYA_LORDS)贡献之和 == 该座 BAV bindu。
    av = _av()
    sign_names = list(av['sarva'].keys())          # 12 座(Aries..Pisces)
    assert set(av['kakshya'].keys()) == set(_BAV_TOTALS.keys())
    for target, grid in av['kakshya'].items():
        assert len(grid) == 12
        for sidx, cells in enumerate(grid):
            assert len(cells) == 8 and all(c in (0, 1) for c in cells)
            assert sum(cells) == av['bhinna'][target][sign_names[sidx]]


def test_sodhya_pinda_shape_and_formula():
    # P0-6 Sodhya Pinda:对 sodhana 削减后 BAV 求 RasiPinda+GrahaPinda;total = 两分量和且非负。
    av = _av()
    sign_names = list(av['sarva'].keys())
    sp = av['sodhyaPinda']
    assert set(sp.keys()) == set(_BAV_TOTALS.keys())
    for target, comp in sp.items():
        assert comp['total'] == comp['rasiPinda'] + comp['grahaPinda'] >= 0
        reduced = av['sodhana'][target]            # 12-list(idx 0=Ar);复算 RasiPinda 与引擎一致
        expect_rasi = sum(reduced[i] * RASI_GUNAKARA[i] for i in range(12))
        assert comp['rasiPinda'] == expect_rasi
