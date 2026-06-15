"""
印度占星 ayanamsa(黄道) + 分宫制(Bhāva) 全量补齐的精度/完整性测试。

- ayanamsa：全 47 个 Swiss Ephemeris SIDM 模式登记 + 逐个可算；关键值对 J2000.0 实测基准
  (pyswisseph 2.10.03 实跑值)。
- 分宫制：全 24 制登记 + 逐个能建出 12 宫有效盘(sidereal cusps)；整宫/Vehlow 语义。
- normalize：key/别名/越界回退。
全程零自研球面数学，精度由 Swiss Ephemeris 保证。
"""
import os
import swisseph as swe
from astrostudy.india import india_chart_kernel as k

_EPHE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    '..', 'flatlib-ctrad2', 'flatlib', 'resources', 'swefiles',
)
J2000 = 2451545.0


def _adiff(a, b):
    return abs((a - b + 180.0) % 360.0 - 180.0)


def _ayan(mode):
    if os.path.isdir(_EPHE):
        swe.set_ephe_path(_EPHE)
    swe.set_sid_mode(mode, 0, 0)
    return swe.get_ayanamsa_ut(J2000)


def _kernel(hsys, ayan='lahiri'):
    data = {
        'date': '2000/1/1', 'time': '12:00:00', 'zone': '+00:00',
        'lat': '28n36', 'lon': '77e12',
        'indiaHsys': hsys, 'indiaAyanamsa': ayan,
    }
    return k.IndiaChartKernel(data)


# === ayanamsa ===

def test_ayanamsa_count_and_compute():
    assert len(k.INDIA_AYANAMSA_MODES) == 47
    for key, m in k.INDIA_AYANAMSA_MODES.items():
        v = _ayan(m['mode'])
        assert isinstance(v, float)
        assert -10.0 < v < 360.0, f'{key} -> {v}'


# J2000.0 实测基准 (Swiss Ephemeris 2.10.03)
_REF = {
    'lahiri': 23.85709, 'lahiri_icrc': 23.85679, 'fagan_bradley': 24.7403,
    'raman': 22.41079, 'krishnamurti': 23.76024, 'krishnamurti_vp291': 23.78036,
    'yukteshwar': 22.4788, 'true_citra': 23.84002, 'true_revati': 20.04516,
    'true_pushya': 22.72709, 'true_mula': 24.57997, 'deluce': 27.81575,
    'suryasiddhanta': 20.89506, 'aryabhata': 20.89506, 'ss_citra': 23.00576,
    'jn_bhasin': 22.76214, 'sassanian': 19.99296, 'galcent_mula_wilhelm': 20.03924,
    'galcent_0sag': 26.84605, 'true_sheoran': 25.23445,
}


def test_ayanamsa_reference_values():
    for key, exp in _REF.items():
        assert key in k.INDIA_AYANAMSA_MODES, f'missing {key}'
        v = _ayan(k.INDIA_AYANAMSA_MODES[key]['mode'])
        assert abs(v - exp) < 1e-3, f'{key}: {v} != {exp}'


def test_ayanamsa_normalize():
    assert k.normalize_ayanamsa('pushya')['key'] == 'true_pushya'
    assert k.normalize_ayanamsa('icrc')['key'] == 'lahiri_icrc'
    assert k.normalize_ayanamsa('KP')['key'] == 'krishnamurti'
    assert k.normalize_ayanamsa('chandrahari')['key'] == 'true_mula'
    assert k.normalize_ayanamsa('zzz')['key'] == 'lahiri'
    assert k.normalize_ayanamsa(None)['key'] == 'lahiri'
    # lahiri_1940 现为独立真模式(不再被别名吞到 lahiri)
    assert k.normalize_ayanamsa('lahiri_1940')['key'] == 'lahiri_1940'


# === 分宫制 ===

def test_house_systems_count_and_build():
    assert len(k.INDIA_HOUSE_SYSTEMS) == 24
    for code in k.INDIA_HOUSE_SYSTEMS:
        kern = _kernel(code)
        houses = sorted(kern.chart.houses, key=lambda h: int(h.id[5:]))
        assert len(houses) == 12
        lons = [h.lon % 360.0 for h in houses]
        for i in range(12):
            gap = (lons[(i + 1) % 12] - lons[i]) % 360.0
            assert 0.0 < gap < 360.0, f'code {code} 宫 {i} gap={gap}'


def test_house_normalize():
    assert k.normalize_house_system('porphyry')[0] == 9
    assert k.normalize_house_system(6)[1]['key'] == 'vehlow_equal'
    assert k.normalize_house_system('koch')[0] == 4
    assert k.normalize_house_system('zzz')[0] == 0


def test_house_whole_sign_and_vehlow_semantics():
    # 整宫:H1 起点落在 30° 边界
    h1 = sorted(_kernel(0).chart.houses, key=lambda h: int(h.id[5:]))[0]
    assert (h1.lon % 30.0) < 1e-6 or abs((h1.lon % 30.0) - 30.0) < 1e-6
    # Vehlow 等宫·命居宫中:H1 起点 = Asc - 15°
    vk = _kernel(6)
    asc = vk.chart.getAngle('Asc').lon
    vh1 = sorted(vk.chart.houses, key=lambda h: int(h.id[5:]))[0]
    assert _adiff(vh1.lon, (asc - 15.0) % 360.0) < 1e-2
