# WP-B golden:现代天赤恒星制(mode5)真修后正确性。
# 病根:原 mode5 取 MOIRA_DISTAR_J2000 的 RA 定宿(该表为 mode2 黄经调好),数行赤纬非物理
#   (亢/柳/胃/星/张/翼/鬼)——黄仪取黄经恰好遮住、赤仪取赤经就爆,定宿偏 10–44°。
# 修后:改用与荀爽(mode0)同一份正确赤道距星活体 chart.getFixedStartsSu28(),去掉 mode0 荀爽一家的
#   危/鬼 年改正 → 与荀爽逐距星 RA 一致(危/鬼除外)。绝不动 MOIRA_DISTAR_J2000(保 mode2/3/4 字节默认)。
import pytest
from astrostudy.perchart import PerChart
from flatlib import const

BASE = {'date': '1985/03/20', 'time': '08:15:00', 'zone': '8',
        'lat': '31n14', 'lon': '121e29', 'gpsLat': '31n14', 'gpsLon': '121e29',
        'hsys': 0, 'zodiacal': 0, 'tradition': 0, 'guolaoLifeMode': 'asc'}

# 七政 + 四余(罗睺=北交/计都=南交/月孛=暗月/紫炁=紫云,引擎缺者自动跳过)
WATCH = (const.SUN, const.MOON, const.MERCURY, const.VENUS, const.MARS, const.JUPITER, const.SATURN,
         const.NORTH_NODE, const.SOUTH_NODE, const.DARKMOON, const.PURPLE_CLOUDS)


def _su(mode):
    pc = PerChart(dict(BASE, doubingSu28=mode))
    pc.getFixedStarSu28()
    return {o.id: getattr(o, 'su28', '') for o in pc.chart.objects if o.id in WATCH}


def test_mode5_planets_all_place():
    # 七政 + 四余 全部落到某一宿(无空值)。
    su5 = _su(5)
    assert su5
    assert all(su5.values()), su5


def test_mode5_matches_xunshuang_except_weigui():
    # 修后 mode5(现代天赤)= 荀爽(mode0)去危鬼改正 → 七政四余落宿与荀爽一致
    #   (危/鬼边界附近的星可能差一宿,容差:至多一星不同)。
    su5 = _su(5)
    su0 = _su(0)
    diff = [k for k in su5 if su5.get(k) != su0.get(k)]
    assert len(diff) <= 1, f'mode5 与荀爽 落宿差异过多: {diff}; su5={su5} su0={su0}'


def test_mode5_distar_ra_no_gross_error():
    # 距星 RA:mode5 与 mode0 仅差危/鬼实测改正(<2°),不再 10–44° 爆开(亢/柳/胃/星/张/翼/鬼)。
    pc5 = PerChart(dict(BASE, doubingSu28=5))
    pc0 = PerChart(dict(BASE, doubingSu28=0))
    d5 = {s.id: s.ra for s in pc5.getEquatorialSu28()}
    d0 = {s.id: s.ra for s in pc0.getAdjustFixedStarSu28()}
    assert len(d5) == 28 and len(d0) == 28
    for sid in d5:
        if sid in (const.START_WEI, const.START_GUI):
            continue   # 危/鬼:mode0 有实测年改正,允许差异(<2°)
        diff = abs((d5[sid] - d0[sid] + 180.0) % 360.0 - 180.0)
        assert diff < 0.1, f'{sid}: mode5 RA {d5[sid]:.3f} vs mode0 {d0[sid]:.3f} 差 {diff:.3f}°'
    # 危/鬼:仅微调,不应 10–44°
    for sid in (const.START_WEI, const.START_GUI):
        diff = abs((d5[sid] - d0[sid] + 180.0) % 360.0 - 180.0)
        assert diff < 2.5, f'{sid}: 危/鬼改正差 {diff:.3f}° 异常'


def test_mode234_byte_unchanged_guard():
    # MOIRA_DISTAR_J2000 未动 → mode2 默认盘宿不变(护栏:与 test_default_su28_zero_regression 同口径)。
    guard = {'date': '1990/08/15', 'time': '12:30:00', 'zone': '8',
             'lat': '39n54', 'lon': '116e24', 'gpsLat': '39n54', 'gpsLon': '116e24',
             'hsys': 0, 'zodiacal': 0, 'tradition': 0, 'guolaoLifeMode': 'asc'}
    pc = PerChart(dict(guard, doubingSu28=2))
    pc.getFixedStarSu28()
    su = {o.id: getattr(o, 'su28', '') for o in pc.chart.objects if o.id in (const.SUN, const.MARS)}
    assert su[const.SUN] == '柳'
    assert su[const.MARS] == '胃'
