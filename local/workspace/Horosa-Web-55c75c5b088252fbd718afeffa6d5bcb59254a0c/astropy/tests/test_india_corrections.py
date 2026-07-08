# §2 与书不符订正 golden（以书 Example 为准，不钉实现）：
#   B2 Ashtottari 起运弧余比(Ex.59 月24°Le→Moon 6 年) · B3 子运从下一曜起(木运=罗金日月火水土木)
#   B4 Jaimini 8 卡拉卡(Ex.28 罗→AK)。
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from astrostudy.india.jyotish_engine import (  # noqa: E402
    ASHTOTTARI_ARC, ASHTOTTARI_SEQUENCE, ashtottari_arc_remaining,
)


# ── B2 弧余比 ──
def test_b2_ashtottari_ex59():
    # Ex.59：月 24°Leo = 144°，Moon 所辖弧 120°-160°(naks 10-12)。
    # 剩余比 = (160−144)/40 = 0.4 → 起运余年 = 0.4 × Moon(15 年) = 6 年(旧错=3)。
    assert abs(ashtottari_arc_remaining('Moon', 144.0) - 0.4) < 1e-9
    moon_years = next(x['years'] for x in ASHTOTTARI_SEQUENCE if x['key'] == 'Moon')
    assert abs(0.4 * moon_years - 6.0) < 1e-9


def test_b2_arc_table_and_wrap():
    # 弧起点：Venus(naks 3-5) 起 2×(360/27)=26.667；Rahu(26,27,1,2) 起 25×=333.333 且跨 0°。
    assert abs(ASHTOTTARI_ARC['Venus'][0] - 26.6667) < 0.01
    assert abs(ASHTOTTARI_ARC['Rahu'][0] - 333.3333) < 0.01
    assert abs(ASHTOTTARI_ARC['Rahu'][1] - 53.3333) < 0.01  # 4 宿
    # Rahu 弧跨 0°：月 350° → 已过 16.667，弧长 53.333 → 剩余 (53.333−16.667)/53.333
    r = ashtottari_arc_remaining('Rahu', 350.0)
    assert 0 < r <= 1
    assert abs(r - (53.3333 - 16.6667) / 53.3333) < 0.002
    # 弧长总和 = 360
    assert abs(sum(v[1] for v in ASHTOTTARI_ARC.values()) - 360.0) < 1e-6


# ── B3 子运起序 ──
def test_b3_ashtottari_antar_order():
    # 木运(Jupiter)子运从下一曜起、末位本曜 = 罗金日月火水土木
    keys = [x['key'] for x in ASHTOTTARI_SEQUENCE]
    idx = keys.index('Jupiter')
    order = [keys[(idx + 1 + j) % len(keys)] for j in range(len(keys))]
    assert order == ['Rahu', 'Venus', 'Sun', 'Moon', 'Mars', 'Mercury', 'Saturn', 'Jupiter']
