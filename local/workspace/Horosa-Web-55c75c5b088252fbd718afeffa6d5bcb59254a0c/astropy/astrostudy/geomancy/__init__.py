# -*- coding: utf-8 -*-
"""地占(十六图二进制占卜家族)纯内核:16 图不可变内核 + 可插拔流派 Profile。
覆盖 盾牌盘 / 宫位盘(图形入宫)/ 占星定局 / 可计算读法 / Sikidy 异或表盘 / 多流派对应。
数据走 data/*.json 真值源,内核只读不硬编码。"""
from __future__ import annotations

from . import chart, correspondences, figures, hakata, house, random_source, reading, sikidy, traditions
from .chart import compute_reading
from .hakata import cast_hakata
from .figures import (
    FIG_BY_INT, FIG_BY_NAME, VALID_JUDGES,
    add, converse, data, inverse, name, planet, points, reverse,
)
from .house import (
    ascendant_sign, astro_place_planets_bytwelves, astro_place_planets_from_chart,
    derived_house, house_chart_sequential, PLANET_ORDER,
)
from .reading import (aspect, company, natural_cosignificator, paternitas, perfection,
                      perfection_by_aspect, points_parity, prohibition, timing, triplicities, via_puncti)
from .shield import Shield, cast_shield, cast_shield_from_mothers, daughters_from_mothers
from .sikidy import (SIKIDY_COL_NAMES, cast_sikidy, col_to_figure, column_compare,
                     princes_slaves, red_sikidy, sikidy_valid)
from .traditions import DEFAULT_PROFILE, PROFILES, get_profile

__all__ = [
    "figures", "shield", "house", "reading", "sikidy", "correspondences", "traditions",
    "FIG_BY_INT", "FIG_BY_NAME", "VALID_JUDGES", "add", "converse", "data", "inverse",
    "name", "planet", "points", "reverse", "Shield", "cast_shield", "cast_shield_from_mothers",
    "daughters_from_mothers", "house_chart_sequential", "ascendant_sign",
    "astro_place_planets_from_chart", "astro_place_planets_bytwelves", "derived_house", "PLANET_ORDER",
    "perfection", "aspect", "company", "prohibition", "points_parity", "timing", "triplicities",
    "cast_sikidy", "sikidy_valid", "SIKIDY_COL_NAMES", "PROFILES", "DEFAULT_PROFILE", "get_profile",
]
