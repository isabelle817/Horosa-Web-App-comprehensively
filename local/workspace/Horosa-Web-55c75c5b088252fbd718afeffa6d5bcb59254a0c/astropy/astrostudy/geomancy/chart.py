# -*- coding: utf-8 -*-
"""整盘聚合:起卦 → 盾牌盘 → 宫位盘(图形入宫) → 全套可计算读法 → 对应赋义。后端服务(webgeomancysrv)主入口。
返回富 JSON(每图全字段 + 见证/判官/调和者 + houses[*].figure 入宫 + perfection/aspect/company/points/timing/via_puncti/paternitas + sikidy)。"""
from __future__ import annotations

from typing import Optional

from . import correspondences as corr
from . import reading as R
from .figures import data, name, points, reverse, inverse
from .hakata import cast_hakata
from .house import (PLANET_ORDER, ascendant_sign, astro_place_planets_from_chart,
                    derived_house, house_chart_sequential)
from .random_source import make_rng, normalize_cast_method
from .shield import cast_shield
from .sikidy import (cast_sikidy, col_to_figure, princes_slaves, red_sikidy,
                     sikidy_valid, SIKIDY_COL_NAMES)
from .traditions import get_profile


def _fig_obj(f: int) -> dict:
    """图形对外对象:全字段 + 点数 + reverse/inverse 名 + 希腊/希伯来名 + 逐图含义(供前端标记/AI)。"""
    d = dict(data(f))
    lat = d["latin"]
    d["int"] = f
    d["points"] = points(f)
    d["reverse_of"] = name(reverse(f))
    d["inverse_of"] = name(inverse(f))
    alt = corr.figure_alt_names(lat)
    d["name_greek"] = alt.get("greek")
    d["name_hebrew"] = alt.get("hebrew")
    d["meanings"] = corr.figure_meaning(lat)
    return d


def compute_reading(question_type: str = "custom", profile_id: str = "european_classical",
                    cast_method: str = "rng", seed: Optional[int] = None,
                    time_seed: Optional[int] = None, reading_scope: Optional[str] = None,
                    zodiac_system: Optional[str] = None) -> dict:
    """一次完整判读。profile 决定方向/记号/黄道/范围/盘式/调和者/中止默认,可由显式参数覆盖。"""
    prof = get_profile(profile_id)
    zsys = zodiac_system or prof.get("zodiac_system", "classical")
    scope = reading_scope or prof.get("reading_scope", "L3")
    cm = normalize_cast_method(cast_method)
    rng = make_rng(cm, seed, time_seed)

    s = cast_shield(rng)
    hc = house_chart_sequential(s)
    q_house = 1
    t_house = corr.question_house(question_type)

    # 指示星角色 + 192 断语
    houses = []
    for h in range(1, 13):
        f = hc[h]
        role = []
        if h == q_house:
            role.append("querent")
        if h == t_house:
            role.append("quesited")
        hr = corr.house_reading(name(f), h)
        houses.append({
            "house": h, "meaning": corr.house_meaning(h),
            "figure": _fig_obj(f), "roles": role,
            "reading": hr.get("reading") if hr else None,
        })

    # 占星定局落星(图形落其所主图所在宫)
    planets = astro_place_planets_from_chart(hc)

    halted = name(s.mothers[0]) in prof.get("halt_on_first_mother", [])
    rd = {
        "perfection": R.perfection(hc, q_house, t_house),
        "perfection_by_aspect": R.perfection_by_aspect(hc, q_house, t_house),
        "aspect": R.aspect(q_house, t_house),
        "prohibition": R.prohibition(hc, q_house, t_house),
        "company": [{"pair": list(p), "type": R.company(hc, p[0], p[1])} for p in R.PAIRED_HOUSES],
        "points_parity": R.points_parity(hc),
        "timing": R.timing(hc, t_house),
        "triplicities": R.triplicities(t_house),
        "via_puncti": R.via_puncti(s),
        "paternitas": R.paternitas(s),
        "natural_cosignificator": R.natural_cosignificator(s.judge),
        "derived_house_example": derived_house(q_house, t_house),
    }

    out = {
        "profile": prof, "zodiac_system": zsys, "reading_scope": scope,
        "question_type": question_type, "querent_house": q_house, "quesited_house": t_house,
        "ascendant_sign": ascendant_sign(hc, zsys),
        "mothers": [_fig_obj(f) for f in s.mothers],
        "daughters": [_fig_obj(f) for f in s.daughters],
        "nieces": [_fig_obj(f) for f in s.nieces],
        "right_witness": _fig_obj(s.right_witness),
        "left_witness": _fig_obj(s.left_witness),
        "judge": _fig_obj(s.judge),
        "reconciler": _fig_obj(s.reconciler) if prof.get("reconciler", True) else None,
        "halted_on_first_mother": halted,
        "houses": houses, "planet_placement": planets, "reading": rd,
    }

    if prof.get("chart") == "sikidy":
        col = cast_sikidy(rng)
        meta = corr.sikidy_meta()
        out["sikidy"] = {
            "columns": {str(i): {"name": SIKIDY_COL_NAMES[i], "rows": list(col[i]),
                                 "figure": name(col_to_figure(col[i])),
                                 "role": (meta.get(str(i)) or {}).get("role"),
                                 "meaning": (meta.get(str(i)) or {}).get("meaning")} for i in range(1, 17)},
            "valid": sikidy_valid(col), "red_sikidy": red_sikidy(col),
            **princes_slaves(col),
        }
    if prof.get("chart") == "hakata":
        out["hakata"] = cast_hakata(rng)
    return out
