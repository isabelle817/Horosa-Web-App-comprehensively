"""量化盘 WP-11 平行/赤纬接触(declination contacts)。

只做一件事:在量化盘已算好的点集(10 行星 + 8 TNP 虚星)上,按【赤纬】判平行/反平行,
作为 /germany/midpoint 响应的【新增】字段下发。绝不改 MidPoint 任何输出(uranian=False 字节守护)。

口径(与本仓既有赤纬平行实现 perchart.py 同源):
 · 平行(parallel,≈合):两点赤纬【同号】且 |decA − decB| ≤ orb。
 · 反平行(contraParallel,≈冲):两点赤纬【异号】且 |abs(decA) − abs(decB)| ≤ orb。

赤纬来源:
 · 10 行星 —— 直接读 perchart 已设好的 obj.decl(perchart.py 在 _setEqCoords 阶段对七政/交点写入真赤纬)。
 · 8 TNP —— flatlib_ephem.getObject 返回的对象 .decl 恒为默认 0.0(历表只填黄道 lon/lat,不填赤纬),
   故【不可信】,改用 utils.eqCoords(lon, lat) 现算真赤纬(= swisseph.cotrans 黄→赤,本仓 perchart 给宫位
   定赤纬的同一函数)。

四轴排除:Asc/MC/Desc/IC 一律不入点集 —— swe.sweHouses 把 Asc.decl 设成地理纬度(lat)而非真赤纬,
纳入会污染;本法的赤纬接触本就只论星体。

健壮性:任一点 decl 为 None / NaN / 取不到 → 跳过该点,绝不抛栈。
"""
import math

from flatlib import const
from flatlib import utils
from flatlib.ephem import ephem as flatlib_ephem


# 行星点集:10 颗(七政 + 天王海王冥王 + 南北交)。与 midpoint.LIST_OBJ 同源,但去黑月/紫炁
# (二者非真实天体、本仓 perchart 不一定给真赤纬),只取有可信赤纬的标准体。
LIST_DECL_PLANET = [
    const.SUN, const.MOON, const.MERCURY, const.VENUS, const.MARS, const.JUPITER, const.SATURN,
    const.URANUS, const.NEPTUNE, const.PLUTO,
    const.NORTH_NODE, const.SOUTH_NODE,
]


def _finite(x):
    """把可能为 None / 非数 / NaN / Inf 的赤纬安全转成 float,失败回 None(调用方据此跳过)。"""
    if x is None:
        return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if math.isnan(v) or math.isinf(v):
        return None
    return v


def _planet_decls(perchart):
    """读 perchart 上 10 行星的真赤纬(已由 perchart 设好)。返回 {id: decl_float}(只含有限值)。"""
    out = {}
    for oid in LIST_DECL_PLANET:
        try:
            obj = perchart.chart.getObject(oid)
        except Exception:
            continue
        d = _finite(getattr(obj, 'decl', None))
        if d is not None:
            out[oid] = d
    return out


def _tnp_decls(perchart):
    """8 颗 TNP 真赤纬:历表对象 .decl 不可信(恒 0.0),用 eqCoords(lon, lat) 现算。
    返回 {id: decl_float}(只含算成功且有限的)。"""
    out = {}
    for oid in const.LIST_URANIAN:
        try:
            obj = flatlib_ephem.getObject(oid, perchart.dateTime, perchart.pos)
        except Exception:
            continue
        try:
            # eqCoords 返回 (ra, decl);TNP 有真实 lon/lat,故此处赤纬为真值。
            decl = utils.eqCoords(obj.lon, obj.lat)[1]
        except Exception:
            continue
        d = _finite(decl)
        if d is not None:
            out[oid] = d
    return out


def compute_declination(perchart, orb=1.0, include_tnp=True):
    """量化盘赤纬接触。

    参数:
      perchart    —— 已建好的 PerChart。
      orb         —— 赤纬容许度(度),默认 1.0;非法(非正/过大)回退 1.0。
      include_tnp —— 是否纳入 8 颗 TNP 虚星(cosmo 流派关、其余开)。

    返回:
      {
        'parallel':      [{'a','b','decA','decB','delta'}, ...],   # 同号,|decA-decB|≤orb
        'contraParallel':[{'a','b','decA','decB','delta'}, ...],   # 异号,|abs(decA)-abs(decB)|≤orb
        'decls':         {id: round(decl,4), ...},                 # 入算各点赤纬一览
      }
    每对仅出现一次(无序对,a<b 顺序由 points 列表序固定);四轴不入算;NaN/None 跳过不崩。
    """
    try:
        orb = float(orb)
    except (TypeError, ValueError):
        orb = 1.0
    if not (0 < orb <= 10):
        orb = 1.0

    # 点集:行星 + (可选)TNP;四轴天然不在此二来源内 → 已排除。
    decls = dict(_planet_decls(perchart))
    if include_tnp:
        decls.update(_tnp_decls(perchart))

    # 固定顺序遍历(无序对只算一次)。
    points = list(decls.keys())
    parallel = []
    contra = []
    n = len(points)
    for i in range(n):
        for j in range(i + 1, n):
            ida, idb = points[i], points[j]
            da, db = decls[ida], decls[idb]
            same_sign = (da * db) > 0
            if same_sign:
                delta = abs(da - db)
                if delta <= orb:
                    parallel.append({
                        'a': ida, 'b': idb,
                        'decA': round(da, 4), 'decB': round(db, 4),
                        'delta': round(delta, 4),
                    })
            else:
                # 异号(含恰一方为 0 时 same_sign 为 False → 归反平行口径)。
                delta = abs(abs(da) - abs(db))
                if delta <= orb:
                    contra.append({
                        'a': ida, 'b': idb,
                        'decA': round(da, 4), 'decB': round(db, 4),
                        'delta': round(delta, 4),
                    })

    return {
        'parallel': parallel,
        'contraParallel': contra,
        'decls': {oid: round(d, 4) for oid, d in decls.items()},
    }
