# -*- coding: utf-8 -*-
"""
pd_engine.py — 主限法(primary directions)通用推运引擎(自研)。

设计:
  1) 通用数值法(universal numerical method),建在 swisseph 的 swe.house_pos() 之上 ——
     对任意点给出「世俗位置(mundane position)」,推运 = 在「转动天球(改 ARMC)」上
     对世俗位置求根。
  2) 时间钥匙:静态常数表 + 逐盘真算(真太阳弧等,逐盘动态)。
  3) 允星扩展:黄道相位 / 世俗相位 / 映点 antiscia / 界 terms。
  本仓支持的方位法以 perpredict._PD_METHOD_REGISTRY 为准。

约定:
  * 角度一律用「度」。
  * 弧 arc > 0 = direct(顺周日运动,promissor 前向到达 significator);arc < 0 = converse。
  * 时角 H = RAMC - RA(向西为正)。

依赖:swisseph(pyswisseph)。纯球面三角 + swisseph 原语,不依赖具体星历数据文件。
"""

import math

import swisseph

DEG = math.pi / 180.0


# ---------------------------------------------------------------------------
# 角度工具
# ---------------------------------------------------------------------------
def norm360(x):
    return x % 360.0


def norm180(x):
    return (x + 180.0) % 360.0 - 180.0


def sind(x):
    return math.sin(x * DEG)


def cosd(x):
    return math.cos(x * DEG)


def tand(x):
    return math.tan(x * DEG)


def asind(x):
    return math.degrees(math.asin(max(-1.0, min(1.0, x))))


def acosd(x):
    return math.degrees(math.acos(max(-1.0, min(1.0, x))))


def atand(x):
    return math.degrees(math.atan(x))


def atan2d(y, x):
    return math.degrees(math.atan2(y, x))


# ---------------------------------------------------------------------------
# 1. 基础球面天文学(所有方法共用的积木)
# ---------------------------------------------------------------------------
def ecl_to_eq(lon, lat, eps):
    """黄道(lon,lat) -> 赤道(RA, dec)。zodiacal 方向时传 lat=0。"""
    ra = atan2d(sind(lon) * cosd(eps) - tand(lat) * sind(eps), cosd(lon))
    dec = asind(sind(lat) * cosd(eps) + cosd(lat) * sind(eps) * sind(lon))
    return norm360(ra), dec


def ascensional_difference(dec, phi):
    """AD = asin(tan phi * tan dec);拱极点 clamp。"""
    v = tand(phi) * tand(dec)
    if v >= 1.0:
        return 90.0
    if v <= -1.0:
        return -90.0
    return asind(v)


def semiarc(dec, phi, diurnal=True):
    """昼半弧 DSA = 90 + AD;夜半弧 NSA = 90 - AD。"""
    ad = ascensional_difference(dec, phi)
    return (90.0 + ad) if diurnal else (90.0 - ad)


def hour_angle(ra, ramc):
    """时角 H = RAMC - RA(向西为正),归一到 ±180。"""
    return norm180(ramc - ra)


def meridian_distance(ra, ramc):
    """上子午距 MD = RA - RAMC(= -H),归一到 ±180。"""
    return norm180(ra - ramc)


def is_above_horizon(ra, dec, ramc, phi):
    """|H| < 昼半弧 则在地平之上。"""
    return abs(hour_angle(ra, ramc)) < semiarc(dec, phi, True)


def relevant_semiarc(ra, dec, ramc, phi):
    """该点当前所在的半弧(在地平上用昼半弧,否则夜半弧)。"""
    return semiarc(dec, phi, is_above_horizon(ra, dec, ramc, phi))


# (本文件保留时间钥匙函数与通用量度原语;方位法集以 perpredict._PD_METHOD_REGISTRY 为准。)


# ---------------------------------------------------------------------------
# 4. 时间钥匙:arc(°) -> 年(动态钥匙;静态比例换算在 perpredict 的 STATIC 表)
# ---------------------------------------------------------------------------
def _sun_ra(jd):
    return swisseph.calc_ut(jd, swisseph.SUN, swisseph.FLG_EQUATORIAL)[0][0]


def key_placidus_true_solar_arc(arc, natal_jd):
    """真太阳弧:把 arc 加到本命太阳赤经,求真太阳走到该赤经的天数;1 天 = 1 年。"""
    ra0 = _sun_ra(natal_jd)
    target = ra0 + arc

    def acc_ra(days):
        ra = _sun_ra(natal_jd + days)
        k = round((target - ra) / 360.0)
        return ra + 360.0 * k

    d0, d1 = arc * 0.98, arc * 1.05 + 0.5
    f0 = acc_ra(d0) - target
    f1 = acc_ra(d1) - target
    for _ in range(60):
        if abs(f1 - f0) < 1e-12:
            break
        d2 = d1 - f1 * (d1 - d0) / (f1 - f0)
        d0, f0 = d1, f1
        d1, f1 = d2, acc_ra(d2) - target
        if abs(f1) < 1e-9:
            break
    return d1


def solar_arc_for_years(years, natal_jd):
    """真太阳弧的逆:给定流逝年数,求该旋转对应的赤经弧(度)。
    主限法「盘」用(date→弧);与 key_placidus_true_solar_arc(弧→年)互逆,确保盘与表格对 TrueSolarArc 一致。"""
    ra0 = _sun_ra(natal_jd)
    ra1 = _sun_ra(natal_jd + float(years))
    arc = ra1 - ra0
    # 连续化到最接近 years 的等价值,消除 ±360 wrap(太阳日行≈1°,arc≈years)。
    k = round((float(years) - arc) / 360.0)
    return arc + 360.0 * k


def _sun_lon(jd):
    return swisseph.calc_ut(jd, swisseph.SUN)[0][0]


def key_symbolic_solar_arc(arc, natal_jd):
    """太阳弧(黄经)钥匙:求真太阳前向走过 |arc| 黄经的天数;1 天 = 1 年。
    正负弧统一按前向 |arc| 进动取年数(30 例数据正负两侧 res 均 ~1e-3° 坐实),
    返回值带原弧符号以兼容既有日期管线(负=converse,日期同样前向)。"""
    a = abs(float(arc))
    lo0 = _sun_lon(natal_jd)
    target = lo0 + a

    def acc_lon(days):
        lo = _sun_lon(natal_jd + days)
        k = round((target - lo) / 360.0)
        return lo + 360.0 * k

    d0, d1 = a * 0.98, a * 1.05 + 0.5
    f0 = acc_lon(d0) - target
    f1 = acc_lon(d1) - target
    for _ in range(60):
        if abs(f1 - f0) < 1e-12:
            break
        d2 = d1 - f1 * (d1 - d0) / (f1 - f0)
        d0, f0 = d1, f1
        d1, f1 = d2, acc_lon(d2) - target
        if abs(f1) < 1e-9:
            break
    return d1 if arc >= 0 else -d1


def symbolic_solar_arc_for_years(years, natal_jd):
    """太阳弧(黄经)的逆:流逝年数 → 黄经弧(盘 date→弧 用,与上互逆 round-trip)。"""
    lo0 = _sun_lon(natal_jd)
    lo1 = _sun_lon(natal_jd + float(years))
    arc = lo1 - lo0
    k = round((float(years) - arc) / 360.0)
    return arc + 360.0 * k


# ---------------------------------------------------------------------------
# 5. 允星扩展:相位 / 映点 / 界
# ---------------------------------------------------------------------------
def zodiacal_aspect_point(prom_lon, aspect_deg, sign=+1):
    """黄道相位点:promissor 黄经 ± 相位角处的虚点(弃黄纬)。"""
    return {'lon': norm360(prom_lon + sign * aspect_deg), 'lat': 0.0}


def antiscion(lon):
    return norm360(180.0 - lon)


def contra_antiscion(lon):
    return norm360(360.0 - lon)


# 埃及界 Egyptian terms(每宫 5 段的起始度)。
EGYPTIAN_TERMS = {
    0: [('Jup', 0), ('Ven', 6), ('Mer', 12), ('Mar', 20), ('Sat', 25)],
    1: [('Ven', 0), ('Mer', 8), ('Jup', 14), ('Sat', 22), ('Mar', 27)],
    2: [('Mer', 0), ('Jup', 6), ('Ven', 12), ('Mar', 17), ('Sat', 24)],
    3: [('Mar', 0), ('Ven', 7), ('Mer', 13), ('Jup', 19), ('Sat', 26)],
    4: [('Jup', 0), ('Ven', 6), ('Sat', 11), ('Mer', 18), ('Mar', 24)],
    5: [('Mer', 0), ('Ven', 7), ('Jup', 17), ('Mar', 21), ('Sat', 28)],
    6: [('Sat', 0), ('Mer', 6), ('Jup', 14), ('Ven', 21), ('Mar', 28)],
    7: [('Mar', 0), ('Ven', 7), ('Mer', 11), ('Jup', 19), ('Sat', 24)],
    8: [('Jup', 0), ('Ven', 12), ('Mer', 17), ('Sat', 21), ('Mar', 26)],
    9: [('Mer', 0), ('Jup', 7), ('Ven', 14), ('Sat', 22), ('Mar', 26)],
    10: [('Mer', 0), ('Ven', 7), ('Jup', 13), ('Mar', 20), ('Sat', 25)],
    11: [('Ven', 0), ('Jup', 12), ('Mer', 16), ('Mar', 19), ('Sat', 28)],
}


def term_boundaries():
    """所有界的边界黄经 -> [(ruler, sign, start_lon), ...]。"""
    out = []
    for sign, rows in EGYPTIAN_TERMS.items():
        for ruler, start in rows:
            out.append((ruler, sign, norm360(sign * 30 + start)))
    return out


# ---------------------------------------------------------------------------
# 6. 弧分发(按方位法选闭式;数值法供世俗相位/校验)
# ---------------------------------------------------------------------------
TERM_RULER_FULL = {'Jup': 'Jupiter', 'Ven': 'Venus', 'Mer': 'Mercury',
                   'Mar': 'Mars', 'Sat': 'Saturn'}
# 界(terms) 促发星 id 的「星座」段须用星座名(前端 planetText 据此渲染星座符号);
# 旧版误写绝对黄经数字 → 前端把数字塞进星符字体显示成乱码。星座弧度仍由 prom_pt['lon'] 承载。
TERM_SIGN_NAMES = ('Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces')
