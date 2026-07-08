"""
天文馆 升落中天(rise/set/transit)+ 行星视运动轨迹(trail)= 纯天文计算。

两项均为成熟天文量,基于瑞士星历真实历表:
  · 升落中天 —— swe.rise_trans(圆面中心),本地时刻;极区永昼/永夜优雅返 null。
  · 视运动轨迹 —— 一段日期窗口内的真实赤道(当日历元)ra/decl 点列,留/逆行段连续无跳变,
    口径与 bodies/overlays 一致(utils.eqCoords)。

铁律②:测试与代码内不出现任何外部软件名;命例为自有测试盘。
门控铁律:两项均默认关闭,仅显式请求(includeRiseSet/riseSet、includeTrails/trails)才算 →
默认请求零额外开销、零回归。
"""
import math

from astrostudy import perchart
from flatlib import const
from websrv.webplanetariumsrv import (
    _build_rise_set, _build_trails, _truthy_flag,
    _resolve_riseset_trail_ids, _DEFAULT_RISESET_TRAIL_IDS,
)

# 自有测试盘:中纬度沿海地点(确有日常升落),非极区。
CASE = {
    'date': '2026/06/26', 'time': '12:00:00', 'zone': '+08:00',
    'lat': '31N14', 'lon': '121E29', 'ad': 1, 'hsys': 'PLACIDUS',
}
# 高纬度盘:夏至附近太阳不落 / 冬至附近太阳不升(极昼/极夜)。
POLAR_SUMMER = dict(CASE, date='2026/06/26', lat='78N13', lon='15E38', zone='+01:00')
POLAR_WINTER = dict(POLAR_SUMMER, date='2026/12/26')


def _hh(timeinfo):
    return None if timeinfo is None else timeinfo['hour']


# ---------------------------------------------------------------- 门控 ----

def test_gate_default_off_explicit_on():
    """门控:无参数 → 关;显式真值 → 开;假值 → 仍关。"""
    assert _truthy_flag({}, 'includeRiseSet', 'riseSet') is False
    assert _truthy_flag({}, 'includeTrails', 'trails') is False
    for v in (True, 1, '1', 'true', 'True'):
        assert _truthy_flag({'riseSet': v}, 'includeRiseSet', 'riseSet') is True
        assert _truthy_flag({'includeTrails': v}, 'includeTrails', 'trails') is True
    for v in (False, 0, '0', 'false', None, 'no'):
        assert _truthy_flag({'riseSet': v}, 'includeRiseSet', 'riseSet') is False


def test_default_body_set_is_ten_real_bodies():
    """默认升落/轨迹星体 = 日月五星 + 天海冥(全 10 真实天体,均默认精确升落/轨迹);
    月交点是数学点、无升落圆面,不入此列。includeOuter 兼容保留(默认已含外行星,幂等)。"""
    ids = _resolve_riseset_trail_ids({})
    assert ids == _DEFAULT_RISESET_TRAIL_IDS
    assert {const.URANUS, const.NEPTUNE, const.PLUTO} <= ids          # 全 10 含外行星
    assert const.SUN in ids and const.MOON in ids
    assert const.NORTH_NODE not in ids and const.SOUTH_NODE not in ids  # 月交点(数学点)不入
    assert _resolve_riseset_trail_ids({'includeOuter': True}) == ids    # includeOuter 幂等


# ---------------------------------------------------- 升落中天 rise/set ----

def test_rise_set_midlatitude_reasonable():
    """中纬度:日月五星均算得 升 / 上中天 / 落;太阳升落次序与时刻合理。"""
    pc = perchart.PerChart(dict(CASE))
    rs = _build_rise_set(pc, dict(CASE))
    # 默认全 10 真实天体都在
    assert set(rs.keys()) == _DEFAULT_RISESET_TRAIL_IDS
    sun = rs[const.SUN]
    assert sun['rise'] and sun['transit'] and sun['set']
    # 本地时刻字段齐备
    for ev in ('rise', 'transit', 'set'):
        assert 'iso' in sun[ev] and 'time' in sun[ev] and 'jd' in sun[ev]
    # 夏季中纬度:日出在上午(<8 时本地)、上中天约正午、日落在傍晚(>18 时本地)。
    assert _hh(sun['rise']) < 8
    assert 11 < _hh(sun['transit']) < 13
    assert _hh(sun['set']) > 18
    # 上中天介于升落之间(同一日民用时序,中纬度太阳成立)。
    assert _hh(sun['rise']) < _hh(sun['transit']) < _hh(sun['set'])


def test_rise_set_includes_outer_when_requested():
    pc = perchart.PerChart(dict(CASE))
    rs = _build_rise_set(pc, dict(CASE, includeOuter=True))
    assert const.URANUS in rs and const.NEPTUNE in rs and const.PLUTO in rs


def test_rise_set_polar_summer_sun_never_sets():
    """极昼:太阳不升不落(rise/set 皆 null),但上中天恒存在(优雅降级,不抛错)。"""
    pc = perchart.PerChart(dict(POLAR_SUMMER))
    rs = _build_rise_set(pc, dict(POLAR_SUMMER))
    sun = rs[const.SUN]
    assert sun['rise'] is None
    assert sun['set'] is None
    assert sun['transit'] is not None  # 上中天总成立


def test_rise_set_polar_winter_sun_never_rises():
    """极夜:太阳不升不落(rise/set 皆 null),上中天仍可计算。"""
    pc = perchart.PerChart(dict(POLAR_WINTER))
    rs = _build_rise_set(pc, dict(POLAR_WINTER))
    sun = rs[const.SUN]
    assert sun['rise'] is None
    assert sun['set'] is None
    assert sun['transit'] is not None


def test_rise_set_times_are_local_zone():
    """返回时刻为观测地本地时(非 UT)。东八区日出的本地小时 = UT 小时 + 8(模 24)。"""
    import swisseph
    pc = perchart.PerChart(dict(CASE))
    rs = _build_rise_set(pc, dict(CASE))
    sun_rise = rs[const.SUN]['rise']
    ut_hour = swisseph.revjul(sun_rise['jd'])[3]  # jd 字段是 UT
    local_hour = _hh(sun_rise)
    assert abs(((ut_hour + 8.0) % 24.0) - local_hour) < 1e-3


# ----------------------------------------------------- 视运动轨迹 trail ----

def test_trails_default_window_and_bodies():
    """默认 ±45 天、步长 1 天 → 每星 91 点;默认全 10 真实天体、含当前时刻(offset 0)。"""
    pc = perchart.PerChart(dict(CASE))
    trails = _build_trails(pc, dict(CASE))
    ids = {t['id'] for t in trails}
    assert ids == _DEFAULT_RISESET_TRAIL_IDS
    merc = next(t for t in trails if t['id'] == const.MERCURY)
    offs = [p['offsetDays'] for p in merc['points']]
    assert offs[0] == -45.0 and offs[-1] == 45.0
    assert len(merc['points']) == 91
    assert 0.0 in offs  # 当前时刻必在点列,轨迹必过星体当前位置
    # 每点有赤道坐标且 ra 已规整到 [0,360)
    for p in merc['points']:
        assert 0.0 <= p['ra'] < 360.0
        assert -90.0 <= p['decl'] <= 90.0


def test_trails_configurable_window():
    pc = perchart.PerChart(dict(CASE))
    trails = _build_trails(pc, dict(CASE, trailDays=10, trailStep=2))
    merc = next(t for t in trails if t['id'] == const.MERCURY)
    offs = [p['offsetDays'] for p in merc['points']]
    assert offs[0] == -10.0 and offs[-1] == 10.0
    assert len(merc['points']) == 11  # -10..10 step 2


def test_trails_continuous_no_jumps_through_station():
    """留/逆行段连续:相邻点 RA 沿最短弧平滑过站,无 0↔360 跳变(真实历位逐点算)。
    阈值按各星真实日动给出上限(月最快 ~16°/日,行星 < 8°/日),只为捕捉伪跳变
    (坐标回绕/计算 glitch 会呈 ~180° 级跨度),不限制真实运动。"""
    # 各星单日 RA 位移的合理上限(度/天):月动最大(近地+至点处赤经压缩 ~17°/日),
    # 行星 < 8°/日。远低于回绕 glitch 的 ~180° 量级,故仍能稳稳捕捉伪跳变。
    max_step_per_day = {
        const.MOON: 18.5, const.SUN: 2.0, const.MERCURY: 8.0, const.VENUS: 4.0,
        const.MARS: 2.0, const.JUPITER: 1.0, const.SATURN: 1.0,
    }
    pc = perchart.PerChart(dict(CASE))
    trails = _build_trails(pc, dict(CASE, trailDays=45, trailStep=1))
    for t in trails:
        cap = max_step_per_day.get(t['id'], 8.0)
        pts = t['points']
        for a, b in zip(pts, pts[1:]):
            span = b['offsetDays'] - a['offsetDays']
            d = ((b['ra'] - a['ra'] + 540.0) % 360.0) - 180.0  # 最短弧
            assert abs(d) < cap * span + 0.5, \
                f"{t['id']}: RA jump {d:.3f}/{span}d at off {a['offsetDays']}->{b['offsetDays']}"


def test_trails_retrograde_flag_matches_speed_sign():
    """retrograde 标志须与黄经速度符号一致(speed<0 ⇔ 逆行)。"""
    pc = perchart.PerChart(dict(CASE))
    trails = _build_trails(pc, dict(CASE, trailDays=45, trailStep=1))
    merc = next(t for t in trails if t['id'] == const.MERCURY)
    assert any(p['retrograde'] for p in merc['points'])      # 窗口内确有逆行段
    assert any(not p['retrograde'] for p in merc['points'])  # 也有顺行段
    for p in merc['points']:
        assert p['retrograde'] == (p['lonspeed'] < 0)


def test_trails_includes_outer_when_requested():
    pc = perchart.PerChart(dict(CASE))
    trails = _build_trails(pc, dict(CASE, includeOuter=True, trailDays=5))
    ids = {t['id'] for t in trails}
    assert {const.URANUS, const.NEPTUNE, const.PLUTO} <= ids


def test_trails_step_safety_clamped():
    """步长/跨度安全夹紧:非法步长不致崩溃、不产生超量点。"""
    pc = perchart.PerChart(dict(CASE))
    # step<=0 回退为 1;trailDays 上限夹紧
    trails = _build_trails(pc, dict(CASE, trailStep=0, trailDays=3))
    merc = next(t for t in trails if t['id'] == const.MERCURY)
    assert len(merc['points']) == 7  # -3..3 step 1
