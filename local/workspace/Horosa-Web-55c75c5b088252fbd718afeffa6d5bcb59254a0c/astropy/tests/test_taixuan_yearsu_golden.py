# -*- coding: utf-8 -*-
"""太玄筮法 28 宿度带 golden(vendor/taixuanshifa)。

锚定 ``yearsu``(365 度宿带,星宿 starLodge 真值源)逐宿连续覆盖 365 度、28 宿不丢。
历史 bug:``c = dict(zip(b, a))`` 以宿度(有重复值)为键 → 塌成 16 项、丢 12 宿,
``yearsu`` 随之错位(牛一..牛八 后错跳「角」,应跳「女」)。本测钉死正解并设回归护栏。

宿名/宿度系公有古天文常数(《太玄经》玄数,二十八宿赤道宿度),可不署来源。
运行: PYTHONPATH=Horosa-Web/astropy python3 -m pytest Horosa-Web/astropy/tests/test_taixuan_yearsu_golden.py -q
"""
import itertools
import sys
from pathlib import Path

import pytest

_ASTROPY_ROOT = Path(__file__).resolve().parent.parent       # .../Horosa-Web/astropy
_HOROSA_WEB_ROOT = _ASTROPY_ROOT.parent                      # .../Horosa-Web
_TAIXUAN_SRC = _HOROSA_WEB_ROOT / "vendor" / "taixuanshifa"   # vendor 顶层模块


def _import_taixuan():
    """与 websrv.webtaixuansrv 同法:隔离插 sys.path 引 vendor 顶层模块。"""
    sp = str(_TAIXUAN_SRC)
    previous = sys.modules.pop("taixuanshifa", None)
    inserted = sp not in sys.path
    if inserted:
        sys.path.insert(0, sp)
    try:
        import taixuanshifa as taixuan_core  # noqa: E402
        return taixuan_core
    finally:
        if previous is not None:
            sys.modules["taixuanshifa"] = previous
        else:
            sys.modules.pop("taixuanshifa", None)
        if inserted:
            try:
                sys.path.remove(sp)
            except ValueError:
                pass


try:
    _TX = _import_taixuan()
except Exception as exc:  # pragma: no cover - 依赖 cnlunar/cn2an,缺失时跳过
    _TX = None
    _IMPORT_ERR = exc


# ---- 正解金表:二十八宿自牛起(冬至锚),逐宿赤道宿度 ----
# (宿名, 宿度);总度数 = 365。顺序即玄数 yearsu 的铺带顺序。
GOLDEN_LODGE_SPANS = [
    ("牛", 8), ("女", 12), ("虛", 10), ("危", 17), ("室", 16), ("壁", 9), ("奎", 16),
    ("婁", 12), ("胃", 14), ("昴", 11), ("畢", 16), ("觜", 2), ("參", 9), ("井", 33),
    ("鬼", 4), ("柳", 15), ("星", 7), ("張", 18), ("翼", 18), ("軫", 17), ("角", 12),
    ("亢", 9), ("氐", 15), ("房", 5), ("心", 5), ("尾", 18), ("箕", 11), ("斗", 26),
]

# 中文序数(一..三十三),足够覆盖最大宿度(井 33)。
_CN_ORD = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
           "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
           "二十一", "二十二", "二十三", "二十四", "二十五", "二十六", "二十七", "二十八",
           "二十九", "三十", "三十一", "三十二", "三十三"]


def _expected_yearsu():
    """金表 → 期望 365 度宿带:逐宿 宿名+一..宿度 连续铺开。"""
    return list(itertools.chain.from_iterable(
        [f"{lodge}{_CN_ORD[i]}" for i in range(1, span + 1)]
        for lodge, span in GOLDEN_LODGE_SPANS
    ))


pytestmark = pytest.mark.skipif(_TX is None, reason="taixuanshifa 依赖缺失,跳过")


def test_golden_total_is_365():
    assert sum(span for _, span in GOLDEN_LODGE_SPANS) == 365
    assert len(GOLDEN_LODGE_SPANS) == 28


def test_yearsu_equals_golden_band():
    """整带逐元素等于金表展开——一处错位即红。"""
    expected = _expected_yearsu()
    assert len(_TX.yearsu) == 365
    assert list(_TX.yearsu) == expected


def test_yearsu_each_lodge_continuous_and_no_loss():
    """28 宿全在、顺序正确、每宿 一..宿度 连续(不丢宿、不串带)。"""
    idx = 0
    seen = []
    for lodge, span in GOLDEN_LODGE_SPANS:
        seen.append(lodge)
        for k in range(1, span + 1):
            assert _TX.yearsu[idx] == f"{lodge}{_CN_ORD[k]}", (idx, lodge, k)
            idx += 1
    assert idx == 365
    # 顺序 + 全集
    assert seen == [lodge for lodge, _ in GOLDEN_LODGE_SPANS]
    assert len(set(seen)) == 28


def test_boundary_niu_to_nv_not_jiao():
    """关键回归点:牛八 之后是 女一(非旧 bug 的「角」)。"""
    assert _TX.yearsu[6:10] == ["牛七", "牛八", "女一", "女二"]
    # 12 个曾被覆盖丢失的宿必须全部回到带内
    lost_before = ["女", "危", "室", "壁", "奎", "婁", "昴", "參", "柳", "張", "翼", "房"]
    band_lodges = {e[0] for e in _TX.yearsu}
    for lodge in lost_before:
        assert lodge in band_lodges, lodge


def test_c_is_lossless_name_to_degree():
    """修正后 c 为「宿名→宿度」单射,28 键齐全(不再以宿度为键塌成 16)。"""
    assert len(_TX.c) == 28
    for lodge, span in GOLDEN_LODGE_SPANS:
        assert _TX.c[lodge] == span


def test_regression_old_lossy_path_would_differ():
    """护栏:旧 dict(zip(b,a)) 度数为键的路径会丢宿,与金表不同——确保没退回。"""
    a = list(_TX.a)
    b = list(_TX.b)
    bad_c = dict(zip(b, a))  # 旧 bug:度数键塌成 16 项
    assert len(bad_c) < 28
    bad_yearsu = list(itertools.chain.from_iterable(
        [f"{bad_c.get(deg)}{_CN_ORD[i]}" for i in range(1, deg + 1)] for deg in b
    ))
    assert bad_yearsu != _expected_yearsu()
    # 旧路径正是「牛八 后跳 角」的错位
    assert bad_yearsu[8] == "角一"
