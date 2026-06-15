"""
天文馆 二十八宿 = 赤道宿度(回归守护)。

二十八宿是**赤道**体系(赤道宿度):距星按其真赤经定宿、沿天赤道附近的实际星位排布,
**不是黄道**。曾有一版误把星宿标到黄道上(用 ecliptic lon 投影)被用户当场指出。本测试
钉死:默认(REAL)模式下 28 距星是真赤道坐标 —— ra 反映真赤经(普遍 ra≠lon)、decl 跨南北
两半天(真实星位),不得被压到黄道线上。

铁律②:测试与代码内不出现任何外部软件名;命例为自有测试盘。
"""
from astrostudy import perchart
from flatlib import const

CASE = {
    'date': '1994/05/21', 'time': '02:20:00', 'zone': '+08:00',
    'lat': '36N26', 'lon': '116E00', 'ad': 1, 'hsys': 'PLACIDUS',
}


def _ang_gap(a, b):
    g = abs(float(a) - float(b)) % 360
    return min(g, 360 - g)


def test_default_su28_is_equatorial_real_stars():
    # 不传 doubingSu28 -> 默认 SU28_MODE_REAL(赤道距星活体)。
    pc = perchart.PerChart(dict(CASE))
    stars = [s for s in pc.getFixedStarSu28() if s.type == const.OBJ_FIXED_STAR]
    assert len(stars) == 28
    # ra 是真赤经,普遍 != 黄经 lon(若被错当 ecliptic 处理则会 ra==lon)。
    real_ra = sum(1 for s in stars if _ang_gap(s.ra, s.lon) > 0.5)
    assert real_ra >= 20, f"only {real_ra}/28 mansions have ra!=lon — looks ecliptic, not equatorial"
    # decl 跨南北两半天(真实距星位置),不是被压平到某一条线上。
    decls = [float(s.decl) for s in stars]
    assert max(decls) > 5 and min(decls) < -5
