# -*- coding: utf-8 -*-
"""Sudarshana Chakra(三盘合参)纯函数计算模块。

源典:古典印度占星 BPHS(《Brihat Parashara Hora Shastra》大帕拉萨拉占星经)
中 "Sudarshana Chakra Dasha" 一章(公有领域古籍)。

要义:同一组行星,分别以「命宫(Lagna)/太阳(Surya)/月亮(Chandra)」三者各自
为上升(第一宫)起宫,得三套宫位;同断一事时三方互相印证,故称三盘合参。

本模块只做纯计算,不依赖任何引擎/全局状态,可独立测试。
"""

# 黄道十二星座(从白羊起,顺行)
_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]
_SIGN_INDEX = {name: i for i, name in enumerate(_SIGNS)}

# 行星规范顺序(七政 + 罗睺/计都)
_PLANET_ORDER = [
    'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn',
    'North Node', 'South Node',
]

# 行星中文标签
_PLANET_LABEL = {
    'Sun': '太阳', 'Moon': '月亮', 'Mars': '火星', 'Mercury': '水星',
    'Jupiter': '木星', 'Venus': '金星', 'Saturn': '土星',
    'North Node': '罗睺', 'South Node': '计都',
}

_NOTE = 'Sudarshana Chakra 三盘合参:命宫/太阳/月亮分别为上升,同断一事三方印证'


def _house_from(ref_sign, planet_sign):
    """以 ref_sign 为第一宫,求 planet_sign 所落宫位(1-12)。

    ref 或 planet 星座缺失/非法时返回 None,不抛异常。
    """
    if ref_sign not in _SIGN_INDEX or planet_sign not in _SIGN_INDEX:
        return None
    # 顺数:同宫=1,下一宫=2 …… 故先取差再 +1
    return ((_SIGN_INDEX[planet_sign] - _SIGN_INDEX[ref_sign]) % 12) + 1


def sudarshana_chakra(planet_signs, lagna_sign, sun_sign, moon_sign):
    """计算 Sudarshana Chakra(三盘合参)。

    参数:
      planet_signs: dict,行星 id -> 星座名(英文)。
      lagna_sign / sun_sign / moon_sign: 三个参考点星座名(英文),可为 None/非法。

    返回:dict,见模块说明;含 available / 三参考星座 / rows / note。
    每个 row 给出该行星分别从命宫、太阳、月亮起算的宫位(参考缺失则对应列 None)。
    """
    safe = planet_signs if isinstance(planet_signs, dict) else {}

    rows = []
    for pid in _PLANET_ORDER:
        if pid not in safe:
            continue  # 缺失行星跳过
        sign = safe.get(pid)
        if sign not in _SIGN_INDEX:
            continue  # 行星星座非法/缺失则跳过该行
        rows.append({
            'planet': pid,
            'planetLabel': _PLANET_LABEL.get(pid, pid),
            'sign': sign,
            'houseFromLagna': _house_from(lagna_sign, sign),
            'houseFromSun': _house_from(sun_sign, sign),
            'houseFromMoon': _house_from(moon_sign, sign),
        })

    # 参考星座非法时回填为 None,保持返回结构稳定
    return {
        'available': True,
        'lagnaSign': lagna_sign if lagna_sign in _SIGN_INDEX else None,
        'sunSign': sun_sign if sun_sign in _SIGN_INDEX else None,
        'moonSign': moon_sign if moon_sign in _SIGN_INDEX else None,
        'rows': rows,
        'note': _NOTE,
    }
