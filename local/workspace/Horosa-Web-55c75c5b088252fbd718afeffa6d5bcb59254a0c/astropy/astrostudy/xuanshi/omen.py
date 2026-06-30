"""天象（celestial_event）omen 规范化。

口径：玄史天象统一归到 **14 个规范类**（产品口径）：

    日食 / 月食 / 月犯 / 流星 / 彗孛 / 客星 / 五星 /
    太白昼见 / 老人星 / 北斗 / 合聚 / 星变 / 云气 / 其他

``canonicalize_omen(raw)`` 按关键字子串匹配把原始 omen_type/omen_class 文本归到这 14 类，
顺序优先（命中第一个即停），全不命中归「其他」，空串归「未分类」。

注：``public_data.sqlite`` 的 ``celestial_event.omen`` 列是更细的历史标签
（如「彗孛妖星」「五纬合聚」「日晕日珥」等），``fold_to_canonical`` 把这些细标签
折叠到上述 14 类，供 facet / 聚合 / 前端筛选统一口径。
"""

from __future__ import annotations

from typing import Optional

# 14 个规范类（产品口径）。顺序即匹配优先级与展示顺序。
OMEN_CANONICAL: list[tuple[str, list[str]]] = [
    ("日食",     ["日食", "日蚀", "日有食之", "日掩", "日变"]),
    ("月食",     ["月食", "月蚀", "月掩"]),
    ("月犯",     ["月犯", "月入", "月行", "月当", "月晕", "月生齿"]),
    ("流星",     ["流星", "陨星", "天狗", "陨石", "石陨", "陨于"]),
    ("彗孛",     ["彗", "孛", "长星", "蓬星", "妖星"]),
    ("客星",     ["客星"]),
    ("五星",     ["五星", "荧惑", "岁星", "太白", "辰星", "镇星", "填星",
                  "木星", "火星", "金星", "水星", "土星", "犯守"]),
    ("太白昼见", ["太白昼见", "太白经天"]),
    ("老人星",   ["老人", "南极老人"]),
    ("北斗",     ["北斗", "斗", "魁"]),
    ("合聚",     ["合聚", "五纬", "三星合", "聚于"]),
    ("星变",     ["星变", "星陨", "星孛", "星亡", "无云而见"]),
    ("云气",     ["云气", "白虹", "赤气", "黑气", "黄气", "云霞", "霾", "雾",
                  "日晕", "日珥", "戴", "背", "珥", "抱", "璚"]),
    # 「其他」为兜底，不挂关键字。
]

CANONICAL_LABELS: list[str] = [label for label, _ in OMEN_CANONICAL] + ["其他"]
_CANONICAL_SET = set(CANONICAL_LABELS) | {"未分类"}

# 历史细标签 → 14 类的折叠表（覆盖 public_data.sqlite 的 omen 列可能出现的细分值）。
_FOLD_MAP: dict[str, str] = {
    "彗孛妖星": "彗孛",
    "五纬合聚": "合聚",
    "日晕日珥": "云气",
    "月晕": "月犯",
    "雷电雹": "其他",
    "风灾": "其他",
    "水旱": "其他",
    "地震山崩": "其他",
    "生物异": "其他",
    "人事异": "其他",
    "天鼓": "其他",
    "陨石": "流星",
    "火灾": "其他",
}


def canonicalize_omen(raw: Optional[str]) -> str:
    """原始 omen 文本 → 14 类规范标签。空→未分类；不命中→其他。"""
    if not raw:
        return "未分类"
    s = str(raw).strip()
    if not s:
        return "未分类"
    for label, needles in OMEN_CANONICAL:
        for n in needles:
            if n in s:
                return label
    return "其他"


def fold_to_canonical(label: Optional[str]) -> str:
    """已有标签（细分历史标签或原始文本）→ 14 类。

    - 已是 14 类之一 / 未分类：原样返回。
    - 命中折叠表：返回映射后的 14 类。
    - 其余：再走一次关键字 canonicalize。
    """
    if not label:
        return "未分类"
    s = str(label).strip()
    if not s:
        return "未分类"
    if s in _CANONICAL_SET:
        return s
    if s in _FOLD_MAP:
        return _FOLD_MAP[s]
    return canonicalize_omen(s)
