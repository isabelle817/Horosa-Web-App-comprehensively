# 分盘变体 golden（大运§9.2 / 09_chartcasting 算例）。默认=标准 Parāśara 零回归。
from astrostudy.india.varga import varga_position


def _sign(lon):
    return int(lon // 30) % 12   # 0 基座号


def test_d3_variants_pisces_example():
    # 双鱼 25°(sidx11,part2):标准天蝎(7)/Parivṛtti双鱼(11)/Jagannātha双鱼(11)。
    lon = 11 * 30 + 25
    assert _sign(varga_position(lon, 3)) == 7                       # 标准 → Scorpio
    assert _sign(varga_position(lon, 3, 'parivritti')) == 11        # → Pisces
    assert _sign(varga_position(lon, 3, 'jagannatha')) == 11        # → Pisces


def test_d2_parivritti_differs():
    lon = 0 * 30 + 20   # Aries 20°(奇,h=1)
    assert _sign(varga_position(lon, 2)) == 3                       # 标准奇 d≥15 → Cancer
    assert _sign(varga_position(lon, 2, 'parivritti')) == 1        # ((0%6)*2+1)%12 → Taurus


def test_d24_correct_even_reverse():
    lon = 1 * 30 + 10   # Taurus(偶) 10°, part=8
    assert _sign(varga_position(lon, 24)) == 11                    # 标准偶 (3+8)%12
    assert _sign(varga_position(lon, 24, 'correct')) == 7          # 偶座逆 (3−8)%12


def test_d30_equal():
    lon = 0 * 30 + 3    # Aries 3°
    assert _sign(varga_position(lon, 30, 'equal')) == 3           # 30×1°等分 (0+3)%12


def test_variant_default_zero_regression():
    for cn in (2, 3, 9, 24, 30, 60):
        lon = 5 * 30 + 12.34
        assert varga_position(lon, cn) == varga_position(lon, cn, None)
        assert varga_position(lon, cn) == varga_position(lon, cn, 'standard')


def test_d60_nature_worked_example():
    from astrostudy.india.varga import shashtiamsa_nature
    r = shashtiamsa_nature(2 * 30 + 17.4167)   # 双子17°25′(奇,seg35)→Krūra含35→恶
    assert r['segment'] == 35
    assert r['nature'] == 'malefic'


def test_d60_nature_even_reverse():
    from astrostudy.india.varga import shashtiamsa_nature
    r = shashtiamsa_nature(1 * 30 + 17.4167)   # 金牛(偶)逆序 deity=61-35=26 ∉Krūra→吉
    assert r['segment'] == 35
    assert r['deityIndex'] == 26
    assert r['nature'] == 'benefic'


def test_d60_deity_names_worked_example():
    # _agentA_chartcasting.md:441-445 算例:双子 17°25′ → 第35段 deity Yama 凶;金牛同度 → 逆序26 Ārdra 吉。
    from astrostudy.india.varga import shashtiamsa_nature, _D60_NAMES
    assert len(_D60_NAMES) == 60
    g = shashtiamsa_nature(2 * 30 + 17.4167)   # 双子(奇)
    assert g['segment'] == 35 and g['deity'] == 'Yama' and g['nature'] == 'malefic'
    c = shashtiamsa_nature(3 * 30 + 17.4167)   # 巨蟹(偶)逆序
    assert c['deityIndex'] == 26 and c['deity'] == 'Ārdra' and c['nature'] == 'benefic'
    assert _D60_NAMES[0] == 'Ghora' and _D60_NAMES[59] == 'Candrarekhā'


def test_blocked_variants_fall_back_to_standard():
    # 不臆造铁律:跨盘错配/未知变体 → 必回退标准,绝不臆造另算。
    # (D2 Kashinatha / D3 Somanatha 已实现,见专测;此处含其跨盘错配 D2-somanatha / D3-kashinatha → 仍回退。)
    from astrostudy.india.varga import varga_position
    lon = 5 * 30 + 12.34
    for cn, bad in [(24, 'parivritti'), (24, 'jagannatha'), (30, 'jagannatha'),
                    (9, 'parivritti'), (2, 'equal'), (3, 'correct'), (60, 'parivritti'),
                    (12, 'whatever'), (2, 'somanatha'), (3, 'kashinatha')]:
        assert varga_position(lon, cn, bad) == varga_position(lon, cn), (cn, bad)


def test_d2_kashinatha_lord_dependent():
    # D2 Kashinatha(_agentA_chartcasting.md:206-215):唯一依源座主星 → 日horā取主星昼强座、月horā夜强座。
    from astrostudy.india.varga import varga_position
    def sgn(lon):
        return int(lon // 30) % 12
    # 白羊(火星主):日horā(0-15°)→火星昼强座 天蝎(7);月horā(15-30°)→夜强座 白羊(0)
    assert sgn(varga_position(0 * 30 + 5, 2, 'kashinatha')) == 7
    assert sgn(varga_position(0 * 30 + 20, 2, 'kashinatha')) == 0
    # 巨蟹/狮子 发光体对(日horā→狮子4、月horA→巨蟹3):狮子奇象首半=日→狮子;巨蟹偶象首半=月→巨蟹
    assert sgn(varga_position(4 * 30 + 5, 2, 'kashinatha')) == 4    # 狮子 0-15°(日)→ 狮子
    assert sgn(varga_position(3 * 30 + 5, 2, 'kashinatha')) == 3    # 巨蟹 0-15°(月)→ 巨蟹
    assert sgn(varga_position(3 * 30 + 20, 2, 'kashinatha')) == 4   # 巨蟹 15-30°(日)→ 狮子
    # 与标准 D2(仅狮子/巨蟹)相异
    assert varga_position(0 * 30 + 5, 2, 'kashinatha') != varga_position(0 * 30 + 5, 2)


def test_d3_somanatha_odd_forward_even_reverse():
    # D3 Somanatha(_agentA_chartcasting.md:241-255)四向校验表:双鱼 20-30°→天秤、狮子 10-20°→天蝎。
    from astrostudy.india.varga import varga_position
    def sgn(lon):
        return int(lon // 30) % 12
    assert sgn(varga_position(11 * 30 + 25, 3, 'somanatha')) == 6   # Pisces 20-30 → Libra
    assert sgn(varga_position(4 * 30 + 15, 3, 'somanatha')) == 7    # Leo 10-20 → Scorpio
    # 标准 Parāśara D3 不同(双鱼 20-30 标准→天蝎 7)
    assert sgn(varga_position(11 * 30 + 25, 3)) == 7


def test_clean_variant_set_is_exactly_seven():
    # 面板暴露的洁净变体集恰 7 个 (chartnum, variant)。新增变体须有 golden,杜绝悄悄臆造扩集。
    from astrostudy.india.varga import _varga_variant_sign
    clean = [(cn, v) for cn in (2, 3, 24, 30)
             for v in ('parivritti', 'jagannatha', 'correct', 'equal', 'kashinatha', 'somanatha')
             if _varga_variant_sign(cn, v, 5, 1) is not None]
    assert set(clean) == {(2, 'parivritti'), (2, 'kashinatha'),
                          (3, 'parivritti'), (3, 'jagannatha'), (3, 'somanatha'),
                          (24, 'correct'), (30, 'equal')}


def test_d60_segment_boundaries():
    from astrostudy.india.varga import shashtiamsa_nature
    assert shashtiamsa_nature(0 * 30 + 0.0)['segment'] == 1       # 段宽 0°30′,首段
    assert shashtiamsa_nature(0 * 30 + 0.4999)['segment'] == 1
    assert shashtiamsa_nature(0 * 30 + 0.5)['segment'] == 2
    assert shashtiamsa_nature(0 * 30 + 29.99)['segment'] == 60    # 末段
    # 奇象 deity 顺(=段号);偶象 deity 逆(61−段)
    assert shashtiamsa_nature(0 * 30 + 0.0)['deityIndex'] == 1    # Aries 奇
    assert shashtiamsa_nature(1 * 30 + 0.0)['deityIndex'] == 60   # Taurus 偶 61−1


def test_d60_krura_count_is_24():
    # Krūra(恶段)恰 24 个 → 奇象座该 24 段为凶、余 36 段为吉(段号即 deity)。
    from astrostudy.india.varga import shashtiamsa_nature, _D60_KRURA
    assert len(_D60_KRURA) == 24
    malefic = sum(1 for seg in range(1, 61)
                  if shashtiamsa_nature(0 * 30 + (seg - 0.5) * 0.5)['nature'] == 'malefic')
    assert malefic == 24
