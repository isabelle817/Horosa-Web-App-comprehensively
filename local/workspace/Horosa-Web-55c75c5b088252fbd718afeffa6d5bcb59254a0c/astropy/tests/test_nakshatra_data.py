"""
27 宿权威属性表（nakshatra_data）转录守卫。

5 条不变量即转录的法律：gunas 三进制严格递增 / lord 顺序与 nakshatra.py 一致 /
经度连续覆盖 0..360 / 五大元素分段 / 27 行齐全且字段非空 + 抽查。
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from astrostudy.india.nakshatra_data import (  # noqa: E402
    NAKSHATRA_DATA, NAK_SPAN, nakshatra_detail, nakshatra_detail_from_lon,
)
from astrostudy.nakshatra import NAKSHATRAS  # noqa: E402


# ── 不变量 1：gunas == 0-based 序号的三进制（R=0/T=1/S=2），严格递增 ──
def test_inv1_gunas_base3_strictly_increasing():
    digit = {'R': 0, 'T': 1, 'S': 2}
    for i, row in enumerate(NAKSHATRA_DATA):  # i = 0..26
        g = row['gunas']
        assert len(g) == 3, f"#{row['index']} gunas 长度应为 3"
        val = digit[g[0]] * 9 + digit[g[1]] * 3 + digit[g[2]]
        assert val == i, f"#{row['index']} gunas={g} 三进制={val} != 序号 {i}"
    # 端点：#1=RRR、#27=SSS
    assert NAKSHATRA_DATA[0]['gunas'] == 'RRR'
    assert NAKSHATRA_DATA[26]['gunas'] == 'SSS'
    # 整体严格递增
    vals = [digit[r['gunas'][0]] * 9 + digit[r['gunas'][1]] * 3 + digit[r['gunas'][2]]
            for r in NAKSHATRA_DATA]
    assert vals == sorted(vals) and len(set(vals)) == 27
    assert vals == list(range(27))


# ── 不变量 2：lord 顺序 == nakshatra.py NAKSHATRAS ──
def test_inv2_lord_order_matches_nakshatra_py():
    data_lords = [r['lord'] for r in NAKSHATRA_DATA]
    ref_lords = [lord for (_name, _label, lord) in NAKSHATRAS]
    assert data_lords == ref_lords, "lord 顺序须与 astrostudy/nakshatra.py 严格一致"
    # 同时核对 Vimshottari 9 曜循环 ×3
    cycle = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']
    assert data_lords == cycle * 3


# ── 不变量 3：经度连续，覆盖 0..360 ──
def test_inv3_range_continuous_covers_circle():
    assert len(NAKSHATRA_DATA) == 27
    assert abs(NAK_SPAN - 13.3333) < 0.001
    assert NAKSHATRA_DATA[0]['rangeStart'] == 0.0
    for i in range(26):
        expect = NAKSHATRA_DATA[i]['rangeStart'] + 13.3333
        assert abs(NAKSHATRA_DATA[i + 1]['rangeStart'] - expect) < 0.01, \
            f"#{i + 2} rangeStart 不连续"
    # rangeEnd 接续；末宿回到 360
    for i in range(26):
        assert abs(NAKSHATRA_DATA[i]['rangeEnd'] - NAKSHATRA_DATA[i + 1]['rangeStart']) < 0.01
    assert abs(NAKSHATRA_DATA[26]['rangeEnd'] - 360.0) < 0.01


# ── 不变量 4：五大元素分段 地1-5 / 水6-11 / 火12-17 / 风18-22 / 乙太23-27 ──
def test_inv4_element_segments():
    segments = {
        '地': range(1, 6),     # 1-5
        '水': range(6, 12),    # 6-11
        '火': range(12, 18),   # 12-17
        '风': range(18, 23),   # 18-22
        '乙太': range(23, 28),  # 23-27
    }
    for elem, rng in segments.items():
        for idx in rng:
            assert NAKSHATRA_DATA[idx - 1]['element'] == elem, \
                f"#{idx} element 应为 {elem}"


# ── 不变量 5：27 行齐全、字段非空 + 抽查 Ashwini / Bharani ──
def test_inv5_complete_nonempty_and_spotcheck():
    required = [
        'index', 'sanskrit', 'labelCn', 'rangeStart', 'rangeEnd', 'lord',
        'activity', 'varna', 'facing', 'windDir', 'gunas', 'purushartha',
        'element', 'gender', 'gana', 'bodyPart', 'symbol',
        'deity', 'yoniAnimal',
    ]
    assert len(NAKSHATRA_DATA) == 27
    seen_idx = set()
    for row in NAKSHATRA_DATA:
        for f in required:
            assert f in row, f"#{row.get('index')} 缺字段 {f}"
            v = row[f]
            assert v is not None and v != '', f"#{row['index']} 字段 {f} 为空"
        seen_idx.add(row['index'])
    assert seen_idx == set(range(1, 28)), "index 须 1..27 无缺无重"

    # Ashwini 抽查：神/吠舍/RRR/地/法/Ketu
    a = nakshatra_detail(1)
    assert a['sanskrit'] == 'Ashwini' and a['labelCn'] == '娄'
    assert a['gana'] == '神' and a['varna'] == '吠舍'
    assert a['gunas'] == 'RRR' and a['element'] == '地'
    assert a['purushartha'] == '法' and a['lord'] == 'Ketu'

    # Bharani 抽查：人/种姓外/利/Venus
    b = nakshatra_detail(2)
    assert b['sanskrit'] == 'Bharani' and b['labelCn'] == '胃'
    assert b['gana'] == '人' and b['varna'] == '种姓外'
    assert b['purushartha'] == '利' and b['lord'] == 'Venus'


# ── 标准补充字段守卫：deity 27 唯一 / yoniAnimal 14 类配对 ──
def test_supplement_deity_unique_and_yoni_pairs():
    deities = [r['deity'] for r in NAKSHATRA_DATA]
    assert len(set(deities)) == 27, "27 devata 应各不相同"
    assert deities[0] == 'Ashwini-Kumaras' and deities[26] == 'Pushan'

    # yoniAnimal 14 类；除「獴」单只外其余成对（各 2 只）。
    from collections import Counter
    yoni = Counter(r['yoniAnimal'] for r in NAKSHATRA_DATA)
    assert len(yoni) == 14, "yoni 应 14 类"
    assert yoni['獴'] == 1, "獴 无配对（UttaraAshadha 单只）"
    paired = {k: v for k, v in yoni.items() if k != '獴'}
    assert all(v == 2 for v in paired.values()), "除獴外每类 yoni 应成对"


# ── 函数：nakshatra_detail 边界 ──
def test_detail_bounds():
    assert nakshatra_detail(0) is None
    assert nakshatra_detail(28) is None
    assert nakshatra_detail(-1) is None
    assert nakshatra_detail(1)['index'] == 1
    assert nakshatra_detail(27)['index'] == 27


# ── 函数：nakshatra_detail_from_lon 与几何一致 ──
def test_detail_from_lon_matches_geometry():
    from astrostudy.nakshatra import nakshatra_from_lon
    # 抽样多个经度（含边界、跨 0、负数、>360）。
    for lon in [0.0, 6.5, 13.3333, 13.4, 120.0, 199.99, 200.0, 359.9, 360.0, 720.5, -10.0]:
        d = nakshatra_detail_from_lon(lon)
        g = nakshatra_from_lon(lon)
        assert d['index'] == g['index'], f"lon={lon} detail/几何 index 不一致"
        assert d['lord'] == g['lord']
    # 每宿中点都落回自身
    for row in NAKSHATRA_DATA:
        mid = row['rangeStart'] + NAK_SPAN / 2.0
        assert nakshatra_detail_from_lon(mid)['index'] == row['index']
