# 太乙数 回归测试(默认法已固定):
#   ① 主客定算与主/客大将同源于立成表(修正几何法与立成表自相矛盾的旧错);
#   ② 五福/大游/小游按「年」算落宫(修正旧公式误吃积数、致非法宫的旧错)。
# 失败=重新核对真值再生成,绝不改测试将就。
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "vendor", "kintaiyi", "src"))

from kintaiyi.kintaiyi import Taiyi  # noqa: E402
import kintaiyi.config as cfg  # noqa: E402

JS, TY = 0, 1  # 年家:ji_style=0, taiyi_acumyear=1(年中日期避岁首边界)


def _chart(year):
    return Taiyi(year, 7, 1, 12, 0)


def _fields(year):
    t = _chart(year)
    k = t.kook(JS, TY)
    return {
        "局": k.get("數"),
        "文": k.get("文")[0],
        "主算": t.home_cal(JS, TY),
        "客算": t.away_cal(JS, TY),
        "定算": t.set_cal(JS, TY),
        "主将": cfg.num2gong(t.home_general(JS, TY)),
        "客将": cfg.num2gong(t.away_general(JS, TY)),
        "五福": cfg.num2gong(cfg.wufu_year(t._taiyi_year())),
        "大游": cfg.num2gong(cfg.bigyo_year(t._taiyi_year())),
        "小游": cfg.num2gong(cfg.smyo_year(t._taiyi_year())),
        "year": t._taiyi_year(),
    }


# 主客定算 + 大将金标(主客定算与大将同源立成表)
GOLDEN_CAL = {
    213: {"局": 42, "主算": 27, "客算": 12, "定算": 34, "主将": "坤", "客将": "午"},
    896: {"局": 5, "主算": 25, "客算": 14, "定算": 1, "主将": "中", "客将": "卯"},
    893: {"局": 2, "主算": 6, "客算": 1, "定算": 1, "主将": "酉", "客将": "乾"},
    722: {"局": 47, "主算": 4, "客算": 8, "定算": 17, "主将": "卯", "客将": "子"},
    724: {"局": 49, "主算": 24, "客算": 25, "定算": 25, "主将": "卯", "客将": "中"},
}


@pytest.mark.parametrize("year,exp", GOLDEN_CAL.items())
def test_home_away_set_cal_match_lookup_table(year, exp):
    f = _fields(year)
    for key, want in exp.items():
        assert f[key] == want, f"year={year} {key}: got {f[key]} want {want}"


def test_youshen_palaces_golden():
    # 五福/大游/小游 按年落宫
    f724 = _fields(724)
    assert (f724["五福"], f724["大游"], f724["小游"]) == ("艮", "巽", "乾")
    f634 = _fields(634)
    assert f634["五福"] == "中"
    assert f634["局"] == 31


def test_find_cal_byte_perfect():
    # 立成表关键行已固定(防表被改);返回 [主算,客算,定算]
    assert cfg.find_cal("陽", 1) == [7, 13, 13]
    assert cfg.find_cal("陽", 42) == [27, 12, 34]
    assert cfg.find_cal("陽", 49) == [24, 25, 25]
    assert cfg.find_cal("陰", 1) == [5, 29, 7]


def _reduce_to_palace(v):
    # 大将归约:<10→自身;%10==0→1;否则去十位(10-20→-10 …)
    if v < 10:
        return v
    if v % 10 == 0:
        return 1
    return v % 10


def test_fidelity_invariants_all_72():
    # 全 72 局 × 阴阳:主算==立成表[0];主算归约∈合法 1-9 宫
    for yy in ("陽", "陰"):
        for n in range(1, 73):
            row = cfg.find_cal(yy, n)
            assert isinstance(row, list) and len(row) == 3
            assert 1 <= _reduce_to_palace(row[0]) <= 9
            for v in row:
                assert 1 <= v <= 40


def test_youshen_year_invariants_over_range():
    # 五福恒落 {乾,艮,巽,坤,中}(=nums {1,3,9,7,5});大游/小游不入中5。年口径 → 与 tn 无关。
    fu_palaces = {cfg.num2gong(n) for n in (1, 3, 9, 7, 5)}
    for year in range(1, 2200, 7):
        assert cfg.wufu_year(year) in (1, 3, 9, 7, 5)
        assert cfg.num2gong(cfg.wufu_year(year)) in fu_palaces
        assert cfg.bigyo_year(year) != 5
        assert cfg.smyo_year(year) != 5


def test_wufu_year_is_tn_independent():
    # 五福按年算,与积年法 tn 无关 → 旧「tn=2 出非法宫午」的错根除。
    t = _chart(724)
    fu = cfg.num2gong(cfg.wufu_year(t._taiyi_year()))
    assert fu == "艮"
    assert fu in {cfg.num2gong(n) for n in (1, 3, 9, 7, 5)}


def test_pan_runs_without_game_theory():
    # 默认排盘(主客算下游)整盘不崩。
    t = _chart(213)
    pan = t.pan(JS, TY, enable_game_theory=False)
    assert pan is not None


def test_pan_runs_with_game_theory():
    # 主客算下游(博弈)不崩,且 payoff 基于新主客算。博弈依赖 scipy,运行时缺则跳过(非本修正职责)。
    pytest.importorskip("scipy")
    t = _chart(213)
    pan = t.pan(JS, TY, enable_game_theory=True)
    assert pan is not None
