# -*- coding: utf-8 -*-
"""Kartari Yoga（夹击 / scissors hemming）— 古典印度占星（Jyotish）。

来源：古典 Jyotish 经典《Phaladeepika》（公有古籍）所载夹击法。
- 某目标（命宫 Lagna，或任一行星）被「夹」：其前一宫（12th-from，黄道前一星座，回绕）
  与后一宫（2nd-from，黄道后一星座，回绕）皆有行星占据。
- 两侧占据者全为天然吉星 → 吉夹 Shubha Kartari（护佑）。
- 两侧占据者全为天然凶星 → 凶夹 Papa Kartari（不利）。
- 否则（混杂，或任一侧空）→ 该目标不成夹。
天然吉/凶星采用标准九曜分类（罗睺/计都按凶星计）。本函数为纯函数，无外部依赖。
"""

# ── 黄道十二星座（顺行序）──────────────────────────────────────────────
SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]
_SIGN_INDEX = {s: i for i, s in enumerate(SIGNS)}

# ── 九曜中文名 ────────────────────────────────────────────────────────
PLANET_CN = {
    'Sun': '太阳', 'Moon': '月亮', 'Mars': '火星', 'Mercury': '水星',
    'Jupiter': '木星', 'Venus': '金星', 'Saturn': '土星',
    'North Node': '罗睺', 'South Node': '计都',
}
LAGNA_CN = '命宫'

# ── 天然吉/凶星（标准九曜分类）默认集 ─────────────────────────────────
DEFAULT_BENEFICS = frozenset({'Jupiter', 'Venus', 'Mercury', 'Moon'})
DEFAULT_MALEFICS = frozenset({'Sun', 'Mars', 'Saturn', 'North Node', 'South Node'})


def _prev_sign(sign):
    """前一星座（12th-from，回绕）。无效返回 None。"""
    i = _SIGN_INDEX.get(sign)
    if i is None:
        return None
    return SIGNS[(i - 1) % 12]


def _next_sign(sign):
    """后一星座（2nd-from，回绕）。无效返回 None。"""
    i = _SIGN_INDEX.get(sign)
    if i is None:
        return None
    return SIGNS[(i + 1) % 12]


def _occupants(sign, planet_signs, exclude=None):
    """某星座的占据行星 id 列表（按九曜固定序，排除目标自身）。"""
    out = []
    for pid in PLANET_CN:  # PLANET_CN 顺序即九曜固定序，输出稳定
        if pid == exclude:
            continue
        if planet_signs.get(pid) == sign:
            out.append(pid)
    return out


def _classify_side(occupants, benefic_set, malefic_set):
    """判定一侧占据者属性：'shubha' / 'papa' / None（空或混杂/未知）。"""
    if not occupants:
        return None
    all_benefic = all(p in benefic_set for p in occupants)
    all_malefic = all(p in malefic_set for p in occupants)
    if all_benefic and not all_malefic:
        return 'shubha'
    if all_malefic and not all_benefic:
        return 'papa'
    return None  # 混杂，或落在两集合之外的未知曜


def _eval_target(target_id, target_label, target_sign,
                 planet_signs, benefic_set, malefic_set):
    """对单一目标判夹。成夹返回 yoga dict，否则 None。"""
    prev_sign = _prev_sign(target_sign)
    next_sign = _next_sign(target_sign)
    if prev_sign is None or next_sign is None:
        return None

    # 目标自身不计入相邻宫占据者
    exclude = target_id if target_id != 'Lagna' else None
    prev_planets = _occupants(prev_sign, planet_signs, exclude=exclude)
    next_planets = _occupants(next_sign, planet_signs, exclude=exclude)

    prev_kind = _classify_side(prev_planets, benefic_set, malefic_set)
    next_kind = _classify_side(next_planets, benefic_set, malefic_set)

    # 两侧须皆有占据者且属性一致，方成夹
    if prev_kind is None or next_kind is None or prev_kind != next_kind:
        return None

    kind = prev_kind
    type_label = '吉夹 Shubha Kartari' if kind == 'shubha' else '凶夹 Papa Kartari'
    return {
        'target': target_id,
        'targetLabel': target_label,
        'type': kind,
        'typeLabel': type_label,
        'prevSign': prev_sign,
        'nextSign': next_sign,
        'prevPlanets': prev_planets,
        'nextPlanets': next_planets,
        'prevLabels': [PLANET_CN.get(p, p) for p in prev_planets],
        'nextLabels': [PLANET_CN.get(p, p) for p in next_planets],
    }


def kartari_yogas(planet_signs, lagna_sign, benefic_set=None, malefic_set=None):
    """计算夹击格局（吉夹/凶夹），评估命宫与九曜共 10 个目标。

    planet_signs: {planet-id: sign-name}；lagna_sign: 上升所在星座名。
    缺失/非法的星座一律跳过，不抛错。返回 dict（结构见模块文档）。
    """
    benefic_set = DEFAULT_BENEFICS if benefic_set is None else benefic_set
    malefic_set = DEFAULT_MALEFICS if malefic_set is None else malefic_set
    planet_signs = planet_signs or {}

    yogas = []

    # 命宫（Lagna）
    if isinstance(lagna_sign, str) and lagna_sign in _SIGN_INDEX:
        y = _eval_target('Lagna', LAGNA_CN, lagna_sign,
                         planet_signs, benefic_set, malefic_set)
        if y:
            yogas.append(y)

    # 九曜（按固定序）
    for pid in PLANET_CN:
        sign = planet_signs.get(pid)
        if not isinstance(sign, str) or sign not in _SIGN_INDEX:
            continue  # 缺失/非法星座跳过
        y = _eval_target(pid, PLANET_CN[pid], sign,
                         planet_signs, benefic_set, malefic_set)
        if y:
            yogas.append(y)

    return {
        'available': True,
        'yogas': yogas,
        'note': '夹击格局:前后相邻宫(12th & 2nd from)皆吉星=吉夹/皆凶星=凶夹',
    }
