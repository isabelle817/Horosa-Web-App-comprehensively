"""日期/文本格式化工具。

``fmt_modern`` 把 ISO 公历日期按精度转中文显示：

    exact_day/exact_hour + 月日 → "962年1月2日"
    month + 月            → "962年1月"
    interval + 月日       → "962年1月2日起"
    其余 / 仅有年         → "962年" / 负年 "前210年"
"""

from __future__ import annotations

from typing import Optional, Tuple


def _parse(s: str) -> Optional[Tuple[int, Optional[int], Optional[int]]]:
    s = (s or "").strip()
    if not s:
        return None
    neg = s.startswith("-")
    if neg:
        s = s[1:]
    parts = s.split("-")
    try:
        y = int(parts[0])
        mo = int(parts[1]) if len(parts) > 1 else None
        d = int(parts[2]) if len(parts) > 2 else None
    except Exception:
        return None
    return (-y if neg else y, mo, d)


def fmt_modern(start: str, end: str = "", precision: str = "") -> str:
    """ISO 公历日期 → 中文显示：962年1月2日 / 前210年 / 月、年级近似。"""
    p = _parse(start)
    if not p:
        return ""
    y, mo, d = p
    ytxt = f"前{abs(y)}年" if y < 0 else f"{y}年"
    if precision in ("exact_day", "exact_hour") and mo and d:
        return f"{ytxt}{mo}月{d}日"
    if precision == "month" and mo:
        return f"{ytxt}{mo}月"
    if precision == "interval" and mo and d:
        return f"{ytxt}{mo}月{d}日起"
    return ytxt


# 源仓内部命名兼容别名
_fmt_modern = fmt_modern
