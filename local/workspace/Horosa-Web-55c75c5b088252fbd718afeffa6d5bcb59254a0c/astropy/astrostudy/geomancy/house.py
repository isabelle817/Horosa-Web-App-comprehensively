# -*- coding: utf-8 -*-
"""宫位盘 House + 占星定局。
P1 顺铺:宫1-12 = 四母+四女+四甥(12 图入 12 宫);占星定局:上升取第1宫图星座、行星落其所主图所在宫(甲)/点数定宫(乙)。"""
from __future__ import annotations

import random
from typing import Dict, List, Optional

from .figures import FIG_BY_INT, data, name
from .shield import Shield

# 行星 → 所主图(昼/夜两图);交点各一图。
PLANET_FIGURES = {
    "Sun": ["Fortuna Maior", "Fortuna Minor"],
    "Moon": ["Populus", "Via"],
    "Mercury": ["Albus", "Coniunctio"],
    "Venus": ["Puella", "Amissio"],
    "Mars": ["Puer", "Rubeus"],
    "Jupiter": ["Acquisitio", "Laetitia"],
    "Saturn": ["Tristitia", "Carcer"],
    "NorthNode": ["Caput Draconis"],
    "SouthNode": ["Cauda Draconis"],
}
PLANET_ORDER = ["Sun", "Moon", "Venus", "Mercury", "Saturn", "Jupiter", "Mars", "NorthNode", "SouthNode"]


def house_chart_sequential(s: Shield) -> Dict[int, int]:
    """P1 顺铺:宫1-12 = M1..M4, D1..D4, N1..N4。"""
    order = s.mothers + s.daughters + s.nieces
    return {h + 1: order[h] for h in range(12)}


def ascendant_sign(house_chart: Dict[int, int], zodiac_system: str = "classical") -> str:
    """上升 = 第1宫图星座。zodiac_system: classical(古典定局体系) / planetary(行星归属体系)。"""
    fd = data(house_chart[1])
    sign = fd["zodiac_classical"] if zodiac_system == "classical" else fd["zodiac_planetary"]
    return sign.rstrip("?")


def astro_place_planets_from_chart(house_chart: Dict[int, int]) -> Dict[str, List[int]]:
    """甲:行星落入其所主图所在之宫(可能多宫或缺席)。"""
    figs_in_house = {h: name(f) for h, f in house_chart.items()}
    placement = {}
    for p in PLANET_ORDER:
        ruled = set(PLANET_FIGURES[p])
        placement[p] = [h for h, fn in figs_in_house.items() if fn in ruled]
    return placement


def astro_place_planets_bytwelves(rng: Optional[random.Random] = None) -> Dict[str, int]:
    """乙(by-twelves):每星另起 4 行点,点数和 mod12(1..12) 定宫。"""
    r = rng or random
    out = {}
    for p in PLANET_ORDER:
        total = sum(r.randint(1, 16) for _ in range(4))
        h = total % 12
        out[p] = 12 if h == 0 else h
    return out


def derived_house(self_house: int, topic_house: int) -> int:
    """转宫:派生宫 = ((self-1)+(topic-1)) mod 12 + 1。"""
    return ((self_house - 1) + (topic_house - 1)) % 12 + 1
