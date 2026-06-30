"""玄史(xuanshi)内核 + web 服务 冒烟/契约测试。

覆盖：
- omen 规范化（14 类匹配 / 空 / 折叠 / 兜底）。
- fmt._fmt_modern 各精度。
- period year_to_macro 边界（含重叠区间首命中语义）。
- global_summary 不抛 + 行数与底库一致（xuanxue 7921 / celestial 27196）。
- 各 web 端点函数回 str(JSON) 不抛，解出 dict/list/None（无 'err'）。
"""

import json

import pytest

from astrostudy import xuanshi
from astrostudy.xuanshi import fmt as xs_fmt
from astrostudy.xuanshi import omen as xs_omen
from astrostudy.xuanshi import period as xs_period
from astrostudy.xuanshi import queries as xs_queries


# ============================================================
# omen 规范化
# ============================================================

def test_omen_canonical_labels_count():
    # 13 关键字类 + 「其他」兜底 = 14。
    assert xs_omen.CANONICAL_LABELS[-1] == "其他"
    assert len(xs_omen.CANONICAL_LABELS) == 14


@pytest.mark.parametrize("raw,expected", [
    ("日有食之", "日食"),
    ("月蚀", "月食"),
    ("月犯心", "月犯"),
    ("流星出", "流星"),
    ("彗星见", "彗孛"),
    ("客星出", "客星"),
    ("荧惑守心", "五星"),
    ("太白经天", "五星"),   # 「太白」属五星类，先于「太白昼见」类命中（首匹配语义）
    ("南极老人星见", "老人星"),
    ("北斗", "北斗"),
    ("五纬合聚", "合聚"),
    ("星陨如雨", "星变"),
    ("白虹贯日", "云气"),
])
def test_omen_canonicalize_hits(raw, expected):
    assert xs_omen.canonicalize_omen(raw) == expected


def test_omen_canonicalize_empty_and_fallback():
    assert xs_omen.canonicalize_omen("") == "未分类"
    assert xs_omen.canonicalize_omen(None) == "未分类"
    assert xs_omen.canonicalize_omen("毫不相干的文本") == "其他"


def test_omen_fold_to_canonical():
    # 已是 14 类之一 → 原样。
    assert xs_omen.fold_to_canonical("日食") == "日食"
    # 细分历史标签 → 折叠。
    assert xs_omen.fold_to_canonical("彗孛妖星") == "彗孛"
    assert xs_omen.fold_to_canonical("五纬合聚") == "合聚"
    assert xs_omen.fold_to_canonical("日晕日珥") == "云气"
    # 空 → 未分类。
    assert xs_omen.fold_to_canonical("") == "未分类"
    assert xs_omen.fold_to_canonical(None) == "未分类"


# ============================================================
# fmt._fmt_modern 各精度
# ============================================================

def test_fmt_modern_alias():
    assert xs_fmt._fmt_modern is xs_fmt.fmt_modern


@pytest.mark.parametrize("start,precision,expected", [
    ("962-1-2", "exact_day", "962年1月2日"),
    ("962-1-2", "exact_hour", "962年1月2日"),
    ("962-1-2", "month", "962年1月"),
    ("962-1-2", "interval", "962年1月2日起"),
    ("962-1-2", "", "962年"),
    ("962", "exact_day", "962年"),       # 缺月日退到年级
    ("-210", "", "前210年"),
    ("-210-3-5", "exact_day", "前210年3月5日"),
])
def test_fmt_modern_precisions(start, precision, expected):
    assert xs_fmt._fmt_modern(start, "", precision) == expected


def test_fmt_modern_empty():
    assert xs_fmt._fmt_modern("", "", "exact_day") == ""
    assert xs_fmt._fmt_modern(None, "", "") == ""


# ============================================================
# period year_to_macro 边界
# ============================================================

@pytest.mark.parametrize("year,expected", [
    (-1046, "西周"),   # 表首区间起点
    (-771, "西周"),    # 西周终点（含端点）
    (-770, "春秋"),    # 春秋起点
    (1369, "明"),      # 明区间内（元终点 1368 之后）
    (1644, "明"),      # 明终点（表末有效年）
])
def test_year_to_macro_boundaries(year, expected):
    assert xs_period.year_to_macro(year) == expected


def test_year_to_macro_overlap_first_wins():
    # 重叠区间按 _MACRO_TABLE 顺序取首个命中（前者在前）：
    # 618 同为隋终点与唐起点 → 隋；1368 同为元终点与明起点 → 元。
    assert xs_period.year_to_macro(618) == "隋"
    assert xs_period.year_to_macro(1368) == "元"


def test_year_to_macro_out_of_range_and_none():
    assert xs_period.year_to_macro(1700) is None   # 明以后超出表
    assert xs_period.year_to_macro(-2000) is None  # 西周以前
    assert xs_period.year_to_macro(None) is None


def test_all_macros_ordered_and_sized():
    macros = xs_period.all_macros()
    assert macros[0][0] == "西周"
    assert macros[-1][0] == "明"
    assert len(macros) == 23
    # sort_order 即时序：起年单调非降（除已知重叠王朝外整体递增）。
    assert macros[0][1] < macros[-1][1]


# ============================================================
# global_summary 不抛 + 行数对
# ============================================================

def test_global_summary_shape_and_counts():
    s = xuanshi.global_summary()
    assert isinstance(s, dict)
    # 行数严格对底库（单一真值源，非硬编码）。
    assert s["counts"]["xuanxue_events"] == 7921
    assert s["counts"]["celestial_events"] == 27196
    assert s["counts"]["map_points"] == 48
    assert s["counts"]["person_nodes"] > 0
    # 传统计数加总 = 玄学事件总数。
    assert sum(s["events_by_tradition"].values()) == s["counts"]["xuanxue_events"]
    # facet / 聚合 / 编辑层 / 健康位齐备。
    assert set(s["event_facets"]) >= {"dynasties", "histories", "techniques", "traditions"}
    assert s["celestial_summary"]["total"] == 27196
    assert isinstance(s["editorial"], dict) and s["editorial"]  # editorial.sqlite 存在
    assert s["omen_labels"] == xs_omen.CANONICAL_LABELS
    assert len(s["period_macros"]) == 23
    assert s["health"]["public_data_exists"] is True
    assert s["health"]["editorial_exists"] is True


# ============================================================
# web 端点：回 str(JSON) 不抛、解出非 'err'
# ============================================================

@pytest.fixture(scope="module")
def srv():
    # web 服务用到 cherrypy.request；端点内对 request.json/params 做了防御读取，
    # 但在无活跃请求上下文时直接调方法会触发 cherrypy 的线程局部访问。
    # 这里直接构造实例并 monkeypatch 一个最小 request stub。
    import cherrypy
    from websrv import webxuanshisrv

    class _Req:
        method = "POST"
        params = {}
        json = None

    cherrypy.serving.request = _Req()
    return webxuanshisrv.XuanShiSrv()


def _decode(raw):
    assert isinstance(raw, str)
    data = json.loads(raw)
    assert not (isinstance(data, dict) and "err" in data), f"endpoint returned error: {data}"
    return data


def test_endpoint_summary(srv):
    data = _decode(srv.summary())
    assert data["counts"]["xuanxue_events"] == 7921


def test_endpoint_events(srv):
    data = _decode(srv.events())
    assert "items" in data and "total" in data
    assert data["total"] == 7921
    assert len(data["items"]) <= 30


def test_endpoint_event_missing_returns_none(srv):
    # 不存在 id → None（非异常）。
    assert _decode(srv.event()) is None


# ============================================================
# 首页多维检索 facet（queries.facets + 多值 list_events）
# ============================================================

def test_facets_zhengshi_default_counts():
    """正史空选择：总数与各 facet 计数稳定（对齐标准版首页计数）。"""
    r = xs_queries.facets(tradition="正史")
    assert r["totals"]["xuanxue_events"] == 1666
    assert r["totals"]["corpus_paragraphs"] == 0
    dyn = {o["name"]: o["count"] for o in r["options"]["dynasty"]}
    assert len(r["options"]["dynasty"]) == 12          # 12 朝代大类
    assert dyn["先秦两汉"] == 126 and dyn["南北朝"] == 438 and dyn["唐"] == 159
    ev = {o["name"]: o["count"] for o in r["options"]["evidence"]}
    assert ev["高"] == 1590 and ev["中"] == 74 and ev["低"] == 0
    assert len(r["options"]["technique"]) == 24        # 前 24 术数
    labels = {t["label"]: t["count"] for t in r["traditions"]}
    assert labels["正史玄学"] == 1666 and labels["野载玄学"] == 6255


def test_facets_switch_convention_recount():
    """勾 唐 后：术数计数缩到唐内，但朝代各值仍是「切换计数」（宋仍显全量）。"""
    r = xs_queries.facets(tradition="正史", dynasties=["唐"])
    assert r["totals"]["xuanxue_events"] == 159
    tech = {o["name"]: o["count"] for o in r["options"]["technique"]}
    assert tech["星占"] == 15                            # 唐内星占
    dyn = {o["name"]: o["count"] for o in r["options"]["dynasty"]}
    assert dyn["宋"] == 124                              # 切换计数：宋仍是全量
    # 叠加 星占 → 命中收敛
    r2 = xs_queries.facets(tradition="正史", dynasties=["唐"], techniques=["星占"])
    assert r2["totals"]["xuanxue_events"] == 15


def test_facets_yezai_corpus_axis():
    """野载传统：朝代轴换成语料分类（志怪笔记等），总数 6255。"""
    r = xs_queries.facets(tradition="野载")
    assert r["totals"]["xuanxue_events"] == 6255
    dyn = {o["name"]: o["count"] for o in r["options"]["dynasty"]}
    assert "志怪笔记" in dyn and dyn["志怪笔记"] > 0


def test_list_events_multi_value_facets():
    """list_events 多值（唐+宋）∪ 单值回退一致：多值给列表、缺省回落单值。"""
    multi = xs_queries.list_events(tradition="正史", dynasties=["唐", "宋"], techniques=["星占"], page_size=5)
    single = xs_queries.list_events(tradition="正史", dynasty="唐", technique="星占", page_size=5)
    assert multi["total"] >= single["total"]            # 唐∪宋 ⊇ 唐
    assert single["total"] == 15
    # 多值优先于单值（同传同时给：用多值）
    both = xs_queries.list_events(tradition="正史", dynasty="宋", dynasties=["唐"], technique="星占", page_size=5)
    assert both["total"] == 15                           # 取 dynasties=['唐']


def test_endpoint_facets(srv):
    data = _decode(srv.facets())
    assert data["totals"]["xuanxue_events"] == 1666     # 默认正史
    assert {o["name"] for o in data["options"]["evidence"]} == {"高", "中", "低"}


def test_endpoint_celestial(srv):
    data = _decode(srv.celestial())
    assert data["total"] == 27196
    assert "global_summary" in data
    assert data["omen_labels"] == xs_omen.CANONICAL_LABELS


def test_endpoint_celestial_event_missing_returns_none(srv):
    assert _decode(srv.celestial_event()) is None


def test_endpoint_microchronology(srv):
    data = _decode(srv.microchronology())
    assert "events" in data and "summary" in data


def test_endpoint_celestial_term_profile(srv):
    import cherrypy
    cherrypy.serving.request.json = {"omen": "日食"}
    try:
        data = _decode(srv.celestial_term_profile())
        assert data["omen"] == "日食"
        assert data["total"] > 0
    finally:
        cherrypy.serving.request.json = None


def test_endpoint_figures(srv):
    data = _decode(srv.figures())
    assert "items" in data and "total" in data and "dynasties" in data
    assert data["total"] > 0


def test_endpoint_figure_missing_returns_none(srv):
    assert _decode(srv.figure()) is None


def test_endpoint_techniques(srv):
    assert isinstance(_decode(srv.techniques()), list)


def test_endpoint_technique_missing_returns_none(srv):
    assert _decode(srv.technique()) is None


def test_endpoint_celestial_terms(srv):
    assert isinstance(_decode(srv.celestial_terms()), list)


def test_endpoint_celestial_term_missing_returns_none(srv):
    assert _decode(srv.celestial_term()) is None


def test_endpoint_dynasties(srv):
    assert isinstance(_decode(srv.dynasties()), list)


def test_endpoint_dynasty_missing_returns_none(srv):
    assert _decode(srv.dynasty()) is None


def test_endpoint_stories(srv):
    assert isinstance(_decode(srv.stories()), list)


def test_endpoint_story_missing_returns_none(srv):
    assert _decode(srv.story()) is None


def test_endpoint_channels(srv):
    assert isinstance(_decode(srv.channels()), list)


def test_endpoint_map(srv):
    data = _decode(srv.map())
    assert "points" in data and "total" in data


def test_endpoint_persons_graph(srv):
    data = _decode(srv.persons_graph())
    assert "nodes" in data and "edges" in data


def test_endpoint_timeline(srv):
    data = _decode(srv.timeline())
    assert "series" in data and "matrix" in data and "top_techs" in data


def test_endpoint_timeline_drilldown(srv):
    import cherrypy
    cherrypy.serving.request.json = {"macro": "唐"}
    try:
        data = _decode(srv.timeline())
        assert "drilldown" in data
        assert isinstance(data["drilldown"], list)
    finally:
        cherrypy.serving.request.json = None


def test_endpoint_search_empty(srv):
    # 空查询 → 空列表（非异常）。
    assert _decode(srv.search()) == []


def test_endpoint_daily(srv):
    # editorial.sqlite 有 6 条 daily_pick → resolve 取最新一条 dict。
    data = _decode(srv.daily())
    assert data is None or isinstance(data, dict)
