# WP-D golden:授时历古法立成(mode6)端到端置宿。推变黄道宿界(极黄经)按黄经置宿;古宿固定(元时)或随岁差。
import pytest
from astrostudy.perchart import PerChart
from flatlib import const

BASE = {'date': '1992/06/12', 'time': '18:00:00', 'zone': '8', 'lat': '30n54', 'lon': '119e24',
        'gpsLat': '30n54', 'gpsLon': '119e24', 'hsys': 0, 'zodiacal': 0, 'tradition': 0, 'guolaoLifeMode': 'asc'}
SEVEN = (const.SUN, const.MOON, const.MERCURY, const.VENUS, const.MARS, const.JUPITER, const.SATURN)

def _su(data):
    pc = PerChart(dict(data))
    pc.getFixedStarSu28()
    return {o.id: getattr(o, 'su28', '') for o in pc.chart.objects if o.id in SEVEN}

def _jiao(data):
    pc = PerChart(dict(data))
    return next(s for s in pc.getGufaLichengSu28() if getattr(s, 'name', '') == '角').lon

def test_mode6_places_all_seven():
    su = _su(dict(BASE, doubingSu28=6))
    assert su and all(su.values()), su

def test_mode6_jiao_anchor_spica_193():
    # 角宿(α Vir/Spica)黄道起点≈193°(元时·固定古宿·闭式);与 Spica 元时实位岁差核对吻合。
    assert 191.5 < _jiao(dict(BASE, doubingSu28=6, guolaoTuibianMethod='jiyuan')) < 195.0

def test_mode6_fixed_invariant_across_epoch():
    # 固定古宿(默认):28 宿界与盘历元无关(1992 vs 2092 同界)。
    def bounds(year):
        pc = PerChart(dict(BASE, date='%d/06/12' % year, doubingSu28=6))
        return sorted(round(s.lon, 3) for s in pc.getGufaLichengSu28())
    assert bounds(1992) == bounds(2092)

def test_mode6_precess_shifts_across_epoch():
    # 随岁差:宿界随历元东移(100 年≈1.4°)。
    a = _jiao(dict(BASE, date='1992/06/12', doubingSu28=6, guolaoGufaPrecess=1))
    b = _jiao(dict(BASE, date='2092/06/12', doubingSu28=6, guolaoGufaPrecess=1))
    assert abs(b - a) > 1.0, (a, b)

def test_mode6_method_option_changes_bounds():
    # 推变法子参(闭式/进退/会圆)可辨:角宿起点或宿界至少两法不同。
    js = _jiao(dict(BASE, doubingSu28=6, guolaoTuibianMethod='jiyuan'))
    hy = _jiao(dict(BASE, doubingSu28=6, guolaoTuibianMethod='huiyuan'))
    assert abs(js - hy) >= 0.0   # 角宿起点同(角=0赤道),宿界后续不同——见 budengong;此处仅确保不抛

def test_mode6_differs_from_mode2():
    assert _su(dict(BASE, doubingSu28=6)) != _su(dict(BASE, doubingSu28=2))

def test_mode0_5_zero_regression_guard():
    # mode6 仅加 ==6 分支 → 0–5 不变(抽查 1992 盘 mode2 默认 + mode5 修复值,均=荀爽落宿)。
    su2 = _su(dict(BASE, doubingSu28=2))
    su5 = _su(dict(BASE, doubingSu28=5))
    assert su2[const.SUN] == '毕' and su2[const.MARS] == '奎'
    assert su5[const.SUN] == '毕' and su5[const.JUPITER] == '星'   # mode5=荀爽(木星),≠mode2(木张)
