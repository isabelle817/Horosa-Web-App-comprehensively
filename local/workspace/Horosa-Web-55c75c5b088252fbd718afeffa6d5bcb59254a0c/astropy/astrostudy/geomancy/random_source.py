# -*- coding: utf-8 -*-
"""起卦随机源:rng / time / manual + dice/sand/coins/tablets 视觉皮肤(同一 RNG,不同呈现,非物理模拟)。
确定性:manual seed 复现同盘。"""
from __future__ import annotations

import random
from typing import Optional

CAST_METHODS = ("rng", "time", "manual", "dice", "sand", "coins", "tablets")
MARK_STYLES = ("dots", "lines", "bindu", "tablets")


def make_rng(cast_method: str = "rng", seed: Optional[int] = None,
             time_seed: Optional[int] = None) -> random.Random:
    """返回可重现的 random.Random。manual→用 seed;time→用 time_seed(上游传入,内核不取系统时间);
    其余皮肤(dice/sand/coins/tablets)=同一 RNG 不同呈现。seed 缺省时退普通随机。"""
    if cast_method == "manual" and seed is not None:
        return random.Random(int(seed))
    if cast_method == "time" and time_seed is not None:
        return random.Random(int(time_seed))
    if seed is not None:
        return random.Random(int(seed))
    return random.Random()


def normalize_cast_method(v: str) -> str:
    return v if v in CAST_METHODS else "rng"


def normalize_mark_style(v: str) -> str:
    return v if v in MARK_STYLES else "dots"
