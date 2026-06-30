"""玄史(中国玄学史)只读数据/查询包。

子模块分工：
- ``db``        —— 两个只读 SQLite bundle(public_data / editorial)的连接底座。
- ``period``    —— 朝代宏分类 / 年号→公历年 推算（时间轴排序源）。
- ``omen``      —— 天象 omen 规范化（14 个产品类）。
- ``fmt``       —— ISO 公历日期 → 中文显示。
- ``queries``   —— 玄学事件(xuanxue_event) / 地图 / 人物共现图 / 时间线 / 搜索。
- ``celestial`` —— 天象大章(celestial_event 27K 行) 列表 / 详情 / 聚合 / 微年表。
- ``editorial`` —— 编辑层(人物 / 故事 / 术数 / 词条 / 频道 / 今日推送 / 综合统计)。

``global_summary()`` 把上述各源拼成首页/概览所需的一站式统计快照，
所有计数严格来自内核函数（绝不硬编码常量）。
"""

from __future__ import annotations

from typing import Any

from . import db, period, omen, fmt, queries, celestial, editorial

__all__ = [
    "db", "period", "omen", "fmt", "queries", "celestial", "editorial",
    "global_summary",
]


def global_summary() -> dict[str, Any]:
    """首页/概览一站式统计快照。

    拼装：
    - counts        —— xuanxue(玄学事件) / celestial(天象) / map(地名) / person(人物节点) 行数。
    - events_by_tradition —— 玄学事件按正史/野载传统计数。
    - event_facets  —— 玄学事件 facet（朝代分组 / 史书 / 术数 / 传统）。
    - celestial_summary   —— 天象大章聚合（朝代×omen 矩阵、年代分布等）。
    - editorial     —— 编辑层综合统计（缺 editorial.sqlite 时为 {}）。
    - omen_labels   —— 14 个规范 omen 标签（+「其他」）。
    - period_macros —— 主朝代时间表 [(name, start, end)]（即时间轴横轴）。
    - health        —— 两库存在性健康位。

    全部计数走内核函数，单一真值源，绝不硬编码行数常量。
    """
    xx_events = queries.load_events()
    ce_events = celestial.load_events()

    # 玄学事件按传统计数（正史/野载）。
    by_tradition: dict[str, int] = {}
    for e in xx_events:
        trad = e.get("tradition") or queries.TRADITION_ZHENGSHI
        by_tradition[trad] = by_tradition.get(trad, 0) + 1

    # 地名 / 人物节点行数（轻量计数，不取全图）。
    conn = db.public_conn()
    map_total = conn.execute("SELECT COUNT(*) AS n FROM map_point").fetchone()["n"]
    person_total = conn.execute("SELECT COUNT(*) AS n FROM person_node").fetchone()["n"]

    return {
        "counts": {
            "xuanxue_events": len(xx_events),
            "celestial_events": len(ce_events),
            "map_points": int(map_total),
            "person_nodes": int(person_total),
        },
        "events_by_tradition": by_tradition,
        "event_facets": queries.event_facets(),
        "celestial_summary": celestial.summarize(ce_events),
        "editorial": editorial.editorial_stats(),
        "omen_labels": omen.CANONICAL_LABELS,
        "period_macros": period.all_macros(),
        "health": {
            "public_data_exists": db.public_exists(),
            "editorial_exists": db.editorial_exists(),
        },
    }
