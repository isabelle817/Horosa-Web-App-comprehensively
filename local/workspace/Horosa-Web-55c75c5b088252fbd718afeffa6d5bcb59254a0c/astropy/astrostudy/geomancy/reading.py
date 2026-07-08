# -*- coding: utf-8 -*-
"""解读技法:完美 Perfection / 相位 Aspect / 同伴 Company(移植);阻碍 / 点数是否 / 应期数量 / 三方(新补)。
每条判定均可由宫位盘 + 图形数据确定性导出,供上游赋义与 AI 真值。"""
from __future__ import annotations

from typing import Dict, List, Optional

from .figures import FIRE, data, inverse, planet, points, reverse, row

PAIRED_HOUSES = [(1, 2), (3, 4), (5, 6), (7, 8), (9, 10), (11, 12)]


def _adj(h: int, wrap: bool = False) -> List[int]:
    if wrap:
        return [(h - 2) % 12 + 1, h % 12 + 1]
    return [x for x in (h - 1, h + 1) if 1 <= x <= 12]


def perfection(hc: Dict[int, int], q: int, t: int) -> str:
    """完美:occupation/conjunction/mutation/translation/none(检测顺序固定)。"""
    fq, ft = hc[q], hc[t]
    if fq == ft:
        return "occupation"
    if any(hc[h] == fq for h in _adj(t) if h != q) or any(hc[h] == ft for h in _adj(q) if h != t):
        return "conjunction"
    for h in range(1, 12):
        if h in (q, t) or (h + 1) in (q, t):
            continue
        if {hc[h], hc[h + 1]} == {fq, ft}:
            return "mutation"
    adj_q = {hc[h] for h in _adj(q)}
    adj_t = {hc[h] for h in _adj(t)}
    if (adj_q & adj_t) - {fq, ft}:
        return "translation"
    return "none"


def aspect(h1: int, h2: int) -> str:
    d = abs(h1 - h2)
    d = min(d, 12 - d)
    return {0: "conjunction", 2: "sextile", 3: "square", 4: "trine", 6: "opposition"}.get(d, "none")


def company(hc: Dict[int, int], a: int, b: int, compound_mode: str = "inverse") -> str:
    """同伴四型(成对宫):simple/demi_simple/compound/capitular/none。"""
    fa, fb = hc[a], hc[b]
    if fa == fb:
        return "simple"
    if planet(fa) == planet(fb):
        return "demi_simple"
    opp = inverse(fb) if compound_mode == "inverse" else reverse(fb)
    if fa == opp:
        return "compound"
    if row(fa, FIRE) == row(fb, FIRE):
        return "capitular"
    return "none"


# ---- 新补(WP-2 起步) ----
_MALEFIC = {"Rubeus", "Cauda Draconis"}


def prohibition(hc: Dict[int, int], q: int, t: int) -> Optional[int]:
    """阻碍:两指示宫宫序间(开区间)插入强凶图(Rubeus/Cauda)→ 返回该阻碍宫号,否则 None。"""
    lo, hi = (q, t) if q <= t else (t, q)
    from .figures import name as _name
    for h in range(lo + 1, hi):
        if _name(hc[h]) in _MALEFIC:
            return h
    return None


def points_parity(hc: Dict[int, int]) -> dict:
    """点数是否:十二宫总点数奇偶。偶→是/稳、奇→否/动(古法通则)。"""
    total = sum(points(hc[h]) for h in range(1, 13))
    return {"total": total, "parity": "even" if total % 2 == 0 else "odd",
            "bias": "yes" if total % 2 == 0 else "no"}


# 应期:动静(quality) × 元素单位 × 宫角速度。
_UNIT = {"Fire": "日", "Air": "周", "Water": "月", "Earth": "年"}
_ANGULAR = {1: "fast", 4: "fast", 7: "fast", 10: "fast",
            2: "mid", 5: "mid", 8: "mid", 11: "mid",
            3: "slow", 6: "slow", 9: "slow", 12: "slow"}   # 角/续/果宫


def timing(hc: Dict[int, int], house: int) -> dict:
    """应期与速度:动→快/静→慢;单位按内元素(火日风周水月地年);宫角:角宫快续宫中果宫慢。"""
    fd = data(hc[house])
    speed = "fast" if fd["quality"] == "mobile" else "slow"
    return {"speed": speed, "unit": _UNIT.get(fd["element_inner"], "月"),
            "angularity": _ANGULAR.get(house, "mid"), "reason": f"{fd['quality']}·{fd['element_inner']}"}


_TRIPLICITY = {"fire": [1, 5, 9], "earth": [2, 6, 10], "air": [3, 7, 11], "water": [4, 8, 12]}


def triplicities(house: int) -> List[int]:
    """黄道三方(宫位):火 1/5/9、地 2/6/10、风 3/7/11、水 4/8/12。"""
    for hs in _TRIPLICITY.values():
        if house in hs:
            return list(hs)
    return [house]


def perfection_by_aspect(hc: Dict[int, int], q: int, t: int) -> Optional[str]:
    """相位完美(§17.2):若常规完美为 none,但两指示宫成吉相位(六分/拱)且其间无强凶图 → 借相位成局。"""
    if perfection(hc, q, t) != "none":
        return None
    asp = aspect(q, t)
    if asp in ("sextile", "trine") and prohibition(hc, q, t) is None:
        return asp
    return None


# ---- 盾牌树:亲缘 paternitas + 点之路 via puncti(需 Shield) ----
def paternitas(shield) -> dict:
    """亲缘生成树:判官←{右证,左证};右证←{甥1,甥2}←{母1母2,母3母4};左证←{甥3,甥4}←{女1女2,女3女4}。
    返回 {node: figure_int, children:[...]} 嵌套(叶=母/女)。"""
    from .figures import name as _name
    M, D, Nz = shield.mothers, shield.daughters, shield.nieces

    def leaf(f):
        return {"figure": f, "name": _name(f), "children": []}

    def node(f, kids):
        return {"figure": f, "name": _name(f), "children": kids}

    n1 = node(Nz[0], [leaf(M[0]), leaf(M[1])])
    n2 = node(Nz[1], [leaf(M[2]), leaf(M[3])])
    n3 = node(Nz[2], [leaf(D[0]), leaf(D[1])])
    n4 = node(Nz[3], [leaf(D[2]), leaf(D[3])])
    rw = node(shield.right_witness, [n1, n2])
    lw = node(shield.left_witness, [n3, n4])
    return node(shield.judge, [rw, lw])


def via_puncti(shield) -> dict:
    """点之路(§3.3/§17.6):自判官沿火行单点上溯。每层取火行=单点(active)的子;
    若恰一子为单点则贯通,若两子皆单/皆双则该层断/分叉。返回 {path:[名…], broken_at:层名 或 None}。"""
    tree = paternitas(shield)
    path = [tree["name"]]
    node = tree
    broken_at = None
    level_names = ["判官", "证", "甥/母层"]
    depth = 0
    while node["children"]:
        actives = [c for c in node["children"] if row(c["figure"], FIRE) == 1]
        if len(actives) == 1:
            node = actives[0]
            path.append(node["name"])
        else:
            broken_at = level_names[depth] if depth < len(level_names) else f"层{depth}"
            break
        depth += 1
    return {"path": path, "broken_at": broken_at, "through": broken_at is None}


def natural_cosignificator(judge_fig: int) -> Optional[str]:
    """月亮自然共主(§17.5):判官为 Populus/Via(月亮系)时,月亮作天然共主参断。"""
    from .figures import name as _name
    return "Moon" if _name(judge_fig) in ("Populus", "Via") else None
