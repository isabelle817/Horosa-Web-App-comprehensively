# -*- coding: utf-8 -*-
"""马达加斯加 Sikidy(异或表盘):16 列 toetry。列1-4 随机母 → 列5-8 转置 → 列9-16 XOR 级联;附三道一致性校验。"""
from __future__ import annotations

import random
from typing import Dict, Optional, Tuple

SIKIDY_COL_NAMES = {
    1: "Tale", 2: "Maly", 3: "Fahatelo", 4: "Bilady", 5: "Fianahana", 6: "Abidy",
    7: "Betsimisay", 8: "Fahavalo", 9: "Fahasivy", 10: "Omasina", 11: "Haja",
    12: "Haky", 13: "Sorotany", 14: "Saily", 15: "Safary", 16: "Akiba",
}


def _xorcol(a: Tuple[int, ...], b: Tuple[int, ...]) -> Tuple[int, ...]:
    return tuple(1 if a[i] != b[i] else 0 for i in range(4))


def cast_sikidy(rng: Optional[random.Random] = None) -> Dict[int, Tuple[int, int, int, int]]:
    r = rng or random
    col: Dict[int, Tuple[int, ...]] = {}
    for c in range(1, 5):
        col[c] = tuple(r.randint(0, 1) for _ in range(4))
    for k in range(4):
        col[5 + k] = tuple(col[c][k] for c in range(1, 5))   # 列5-8 = 转置
    col[9] = _xorcol(col[7], col[8])
    col[10] = _xorcol(col[5], col[6])
    col[11] = _xorcol(col[3], col[4])
    col[12] = _xorcol(col[1], col[2])
    col[13] = _xorcol(col[9], col[10])
    col[14] = _xorcol(col[11], col[12])
    col[15] = _xorcol(col[13], col[14])
    col[16] = _xorcol(col[15], col[1])
    return col


def sikidy_valid(col: Dict[int, Tuple[int, ...]]) -> bool:
    """三道一致性校验(全部应成立)。"""
    cols = [col[i] for i in range(1, 17)]
    chk1 = any(cols[i] == cols[j] for i in range(16) for j in range(i + 1, 16))
    chk2 = (_xorcol(col[13], col[16]) == _xorcol(col[14], col[1]) == _xorcol(col[11], col[2]))
    chk3 = (sum(col[15]) % 2 == 0)
    return chk1 and chk2 and chk3


def col_to_figure(c: Tuple[int, ...]) -> int:
    """一列 4 行(火气水地,自上而下)→ 图形 int(bit3=火)。"""
    return (c[0] << 3) | (c[1] << 2) | (c[2] << 1) | c[3]


def col_points(c: Tuple[int, ...]) -> int:
    """一列点数:单点(1)计1、双点(0)计2。"""
    return sum(1 if v else 2 for v in c)


def princes_slaves(col: Dict[int, Tuple[int, ...]]) -> dict:
    """诸侯/奴隶(§11.5):列点数为偶=诸侯(princes,8列)、奇=奴隶(slaves,8列)。返回列号分组。"""
    princes, slaves = [], []
    for i in range(1, 17):
        (princes if col_points(col[i]) % 2 == 0 else slaves).append(i)
    return {"princes": princes, "slaves": slaves}


def red_sikidy(col: Dict[int, Tuple[int, ...]]) -> bool:
    """红 sikidy(§11.5,最凶兆):前 4 列(母)皆全双(全 0=Populus)。"""
    return all(all(v == 0 for v in col[c]) for c in range(1, 5))


def column_compare(col: Dict[int, Tuple[int, ...]], a: int, b: int) -> dict:
    """两列比对(判读用):是否相等、XOR 结果列、各自图形/点数。"""
    return {
        "equal": col[a] == col[b],
        "xor": _xorcol(col[a], col[b]),
        "figure_a": col_to_figure(col[a]), "figure_b": col_to_figure(col[b]),
        "points_a": col_points(col[a]), "points_b": col_points(col[b]),
    }
