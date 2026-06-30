# -*- coding: utf-8 -*-
"""七政四余数据底座 golden(guolao_const)。校验距度合 360、度主循环、庙旺 7×12、化曜 10 干全、四余行度、五虎遁。
运行: PYTHONPATH=Horosa-Web/astropy python3 -m pytest Horosa-Web/astropy/tests/test_guolao_const.py -q"""
from astrostudy import guolao_const as gc


def test_su28_full_and_sum():
    assert len(gc.SU28) == 28 and len(set(gc.SU28)) == 28
    assert len(gc.SU28_DISTANCE) == 28
    assert sum(gc.SU28_DISTANCE) == 360, f"距度合应 360,实得 {sum(gc.SU28_DISTANCE)}"
    assert gc.SU28[0] == "角" and gc.SU28[27] == "轸"


def test_degree_lord_cycle():
    assert len(gc.SU28_DEGREE_LORD) == 28
    # 木金土日月火水 循环;角(0)=木、亢(1)=金、轸(27)=水
    assert gc.SU28_DEGREE_LORD[0] == "木"
    assert gc.SU28_DEGREE_LORD[1] == "金"
    assert gc.SU28_DEGREE_LORD[6] == "水"
    assert gc.SU28_DEGREE_LORD[7] == "木"   # 循环回


def test_cumulative_lookup():
    cum = gc.su28_cumulative(gc.SU28_JIAO_START_MODERN)
    assert len(cum) == 28
    assert abs(cum[0] - 203.84) < 1e-9
    # 累积 = 起点 + 前缀距度和;末项 + 末距度 = 起点 + 360
    assert abs((cum[-1] + gc.SU28_DISTANCE[-1]) - (gc.SU28_JIAO_START_MODERN + 360)) < 1e-9


def test_palace_lord_12():
    assert len(gc.PALACE_LORD) == 12
    assert gc.PALACE_LORD["午"][0] == "日"      # 午=狮子=日庙
    assert gc.PALACE_LORD["子"][0] == "土"
    assert gc.PALACE_LORD["丑"][1] == "火" and gc.PALACE_LORD["丑"][2] == 28.0   # 火旺丑28°


def test_dignity_table_shape():
    assert set(gc.DIGNITY_TABLE.keys()) == {"日", "月", "水", "金", "火", "木", "土"}
    for star, row in gc.DIGNITY_TABLE.items():
        assert len(row) == 12, star
        assert all(v in ("庙", "旺", "落", "陷", "平", "得地") for v in row), star
    # 锚:日午庙、日戌旺、火卯庙、土子庙
    assert gc.dignity_of("日", "午") == "庙"
    assert gc.dignity_of("日", "戌") == "旺"
    assert gc.dignity_of("火", "卯") == "庙"
    assert gc.dignity_of("土", "子") == "庙"


def test_huayao_a_full():
    assert set(gc.HUAYAO_A.keys()) == set("甲乙丙丁戊己庚辛壬癸")
    assert gc.HUAYAO_A["甲"] == "火" and gc.HUAYAO_A["癸"] == "罗睺"
    assert gc.HUAYAO_A["辛"] == "紫炁" and gc.HUAYAO_A["壬"] == "计都"
    # A 诀 ≠ B 诀
    assert gc.HUAYAO_A != gc.KUIXING_B
    assert len(gc.SHIHUA_ORDER) == 10
    assert gc.SHIHUA_ORDER[0] == ("天禄", "官禄", "化禄")


def test_siyu_rates():
    assert gc.SIYU_DAILY_RATE["罗睺"] < 0 and gc.SIYU_DAILY_RATE["月孛"] > 0
    assert gc.SIYU_DAILY_RATE["计都"] == gc.SIYU_DAILY_RATE["罗睺"]   # 计=罗+180 同速
    assert gc.SIYU_WUXING == {"罗睺": "火", "计都": "土", "月孛": "水", "紫炁": "木"}


def test_dongwei_years():
    assert len(gc.DONGWEI_PALACE_YEARS) == 12
    assert gc.DONGWEI_PALACE_YEARS["命宫"] == 15
    # 合计 ≈ 百六(约 106)
    total = sum(gc.DONGWEI_PALACE_YEARS.values())
    assert 100 <= total <= 112, f"洞微合计 {total}"


def test_wuhu_dun():
    # 甲(0)年 → 正月丙寅(丙=2)
    assert gc.wuhu_yin_stem_index(0) == 2
    # 己(5)年 → 丙寅(甲己丙作首):(5×2+2)%10=12%10=2=丙
    assert gc.wuhu_yin_stem_index(5) == 2
    # 命宫=寅(支序2)时,命宫干=寅宫干
    assert gc.life_palace_stem_index(0, 2) == 2
    # 命宫=卯(3)→寅干+1
    assert gc.life_palace_stem_index(0, 3) == 3


def test_motion_consts():
    assert set(gc.MEAN_SPEED.keys()) == {"日", "月", "水", "金", "火", "木", "土"}
    assert gc.MEAN_SPEED["月"] > gc.MEAN_SPEED["土"]   # 月最快、土最慢
    assert all(t > 0 for t in gc.STATION_THRESH.values())
