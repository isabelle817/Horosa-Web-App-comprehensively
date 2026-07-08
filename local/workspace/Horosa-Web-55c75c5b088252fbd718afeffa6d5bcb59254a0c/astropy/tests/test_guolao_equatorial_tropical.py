# 额外档 golden:赤道回归制(mode7)。固定元明赤道宿度立成(春分/牛前冬至锚、赤经常数、不随岁差),
# 行星按盘历元赤经落宿。判定性区别于 mode5(现代天赤恒星·随历元变):mode7 宿界跨历元恒定。
import pytest
from astrostudy.perchart import PerChart
from flatlib import const

BASE = {'date': '1992/06/12', 'time': '18:00:00', 'zone': '8', 'lat': '30n54', 'lon': '119e24',
        'gpsLat': '30n54', 'gpsLon': '119e24', 'hsys': 0, 'zodiacal': 0, 'tradition': 0, 'guolaoLifeMode': 'asc'}
SEVEN = (const.SUN, const.MOON, const.MERCURY, const.VENUS, const.MARS, const.JUPITER, const.SATURN)


def _ring(data):
    pc = PerChart(dict(data))
    return {s.name: round(s.ra, 3) for s in pc.getEquatorialTropicalSu28()}


def _su(data):
    pc = PerChart(dict(data))
    pc.getFixedStarSu28()
    return {o.id: getattr(o, 'su28', '') for o in pc.chart.objects if o.id in SEVEN}


def test_mode7_cross_epoch_invariant():
    # 回归锚·不进动:1992 与 2092 两盘,28 宿界 RA 完全相同(与 mode5 随历元变的判定性区别)。
    assert _ring(dict(BASE, doubingSu28=7)) == _ring(dict(BASE, date='2092/06/12', doubingSu28=7))


def test_mode7_anchor_dongzhi_default():
    # 默认锚=牛前冬至:牛宿前缘 = 冬至 RA 270°。
    assert abs(_ring(dict(BASE, doubingSu28=7))['牛'] - 270.0) < 0.01


def test_mode7_anchor_chunfen_option():
    # 春分锚:壁宿2.3度 = 春分 RA 0°(壁起 + 2.3×360/365.2575 ≡ 0/360)。
    bi = _ring(dict(BASE, doubingSu28=7, guolaoEqTropicalAnchor='chunfen'))['壁']
    assert abs(((bi + 2.3 * 360.0 / 365.2575) % 360.0)) < 0.05 or abs(((bi + 2.3 * 360.0 / 365.2575) % 360.0) - 360.0) < 0.05


def test_mode7_anchor_makes_difference():
    # 两锚产出不同宿界(牛前冬至 vs 春分壁2.3)。
    assert _ring(dict(BASE, doubingSu28=7)) != _ring(dict(BASE, doubingSu28=7, guolaoEqTropicalAnchor='chunfen'))


def test_mode7_places_all_seven_and_siyu():
    pc = PerChart(dict(BASE, doubingSu28=7))
    pc.getFixedStarSu28()
    su7 = {o.id: getattr(o, 'su28', '') for o in pc.chart.objects if o.id in SEVEN}
    assert su7 and all(su7.values()), su7
    # 含四余(罗计须有赤经落宿,F5)。
    siyu = [o.id for o in pc.chart.objects if o.id in (const.NORTH_NODE, const.SOUTH_NODE) and getattr(o, 'su28', '')]
    assert len(siyu) >= 2, siyu


def test_mode7_differs_from_mode5():
    # 赤道回归(宿界钉死) ≠ 赤道恒星 mode5(宿随真星走)。
    assert _su(dict(BASE, doubingSu28=7)) != _su(dict(BASE, doubingSu28=5))


def test_mode0_to_6_zero_regression():
    # mode7 仅加 ==7 分支 → mode 0–6 输出字节不变(抽查 mode2 默认 + mode5 修复值 + mode6 古法)。
    su2 = _su(dict(BASE, doubingSu28=2))
    su5 = _su(dict(BASE, doubingSu28=5))
    su6 = _su(dict(BASE, doubingSu28=6))
    assert su2[const.SUN] == '毕' and su2[const.MARS] == '奎'
    assert su5[const.SUN] == '毕' and su5[const.JUPITER] == '星'
    assert su6 and all(su6.values())
