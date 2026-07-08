# -*- coding: utf-8 -*-
"""websrv 入口共享守卫。

排盘入口此前对坐标零校验:gpsLat=200/gpsLon=500 会被静默接受并出盘
(swisseph 拿 200° 纬度算宫位 → 垃圾盘面,无任何报错,比崩溃更糟)。
这里只做边界合法性,不做任何业务取舍;astrostudy 核心层不动。
"""


def validate_geo(data):
    """坐标范围校验。非法返回结构化错误 dict(调用方直接 jsonpickle 返回),合法返回 None。

    只校验数值型 gpsLat/gpsLon(主用坐标);DMS 串(lat='41n26')由 PerChart 解析,
    解析失败有既有 param error 路径。字段缺失/非数值不在此拦(兼容旧请求形态)。
    """
    try:
        lat = data.get('gpsLat', None)
        lon = data.get('gpsLon', None)
        if lat is not None:
            lat = float(lat)
            if lat < -90.0 or lat > 90.0:
                return {'err': 'invalid_coordinates',
                        'detail': 'gpsLat must be within [-90, 90], got {0}'.format(lat)}
        if lon is not None:
            lon = float(lon)
            if lon < -180.0 or lon > 180.0:
                return {'err': 'invalid_coordinates',
                        'detail': 'gpsLon must be within [-180, 180], got {0}'.format(lon)}
    except (TypeError, ValueError):
        # 非数值坐标:交给下游既有解析路径报 param error,不在此误杀。
        return None
    return None
