# -*- coding: utf-8 -*-
"""对应查表 API:图形全字段(行星/双黄道/内外元素/动静/进出/公私/吉凶/身体/颜色/humor/Unicode/多语言名)、
12 宫表、192 宫断语。皆只读 data/*.json,不硬编码。"""
from __future__ import annotations

import json
import os
from typing import Dict, Optional

from .figures import FIG_BY_INT, FIG_BY_NAME

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _load(fn: str) -> dict:
    with open(os.path.join(_DATA_DIR, fn), encoding="utf-8") as f:
        return json.load(f)


_HOUSE_MEANINGS = _load("house_meanings.json")
_HOUSE_READINGS = _load("house_readings.json")
# (figure_latin, house) → reading 条
_READING_IDX = {(e["figure"], e["house"]): e for e in _HOUSE_READINGS["entries"]}
_FIGURE_MEANINGS = _load("figure_meanings.json")
_NAMES_GREEK = _load("names_greek.json")["names"]
_NAMES_HEBREW = _load("names_hebrew.json")["names"]
_SIKIDY_META = _load("sikidy.json")["columns"]


def figure_full(fig) -> dict:
    """图形全字段(传 int 或 latin 名)。"""
    i = fig if isinstance(fig, int) else FIG_BY_NAME[fig]
    return dict(FIG_BY_INT[i])


def house_meaning(house: int) -> Optional[dict]:
    return _HOUSE_MEANINGS["houses"].get(str(house))


def question_house(question_type: str) -> int:
    return _HOUSE_MEANINGS["question_house"].get(question_type, 1)


def house_reading(figure_latin: str, house: int) -> Optional[dict]:
    """192 宫断语:图×宫。"""
    return _READING_IDX.get((figure_latin, house))


def figure_meaning(figure_latin: str) -> Optional[dict]:
    """逐图×问题含义(总性/爱情/财富/事业/健康/诉讼/旅行/失物/是否/时机)。"""
    return _FIGURE_MEANINGS["figures"].get(figure_latin)


def figure_alt_names(figure_latin: str) -> dict:
    """各语言名(希腊/希伯来 义译 attested=false;阿拉伯/约鲁巴在 figures.json)。"""
    return {"greek": _NAMES_GREEK.get(figure_latin), "hebrew": _NAMES_HEBREW.get(figure_latin)}


def sikidy_meta() -> dict:
    """Sikidy 16 列(名+角色+指代义)。"""
    return dict(_SIKIDY_META)


def catalog() -> Dict[str, dict]:
    """全 16 图目录(latin → 全字段 + 逐图含义 + 希腊/希伯来名),供前端目录页/切流派刷新。"""
    out = {}
    for v in FIG_BY_INT.values():
        lat = v["latin"]
        item = dict(v)
        item["meanings"] = _FIGURE_MEANINGS["figures"].get(lat)
        item["name_greek"] = _NAMES_GREEK.get(lat)
        item["name_hebrew"] = _NAMES_HEBREW.get(lat)
        out[lat] = item
    return out
