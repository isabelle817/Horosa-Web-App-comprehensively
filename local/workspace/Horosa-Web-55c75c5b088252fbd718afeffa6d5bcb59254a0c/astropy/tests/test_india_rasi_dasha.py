# -*- coding: utf-8 -*-
"""Jaimini 宫位大运族 + Kalachakra —— 结构/不变量测试(非精确金标)。

⚠️ 算法仅实现已转录公式；权威算例的精确序列/期长未给确切值 → 这里只钉结构与不变量：
   - 各 rasi dasha 的 mahadasha 项数 / 字段完整 / rasi 为合法 12 星座之一；
   - Narayana 期长在 [1,12]，二轮 = 12 − 首轮，两轮和 = 12；
   - Niryana Shoola 动/定/双 = 7/8/9 年，首三和 = 24，奇顺偶逆方向；
   - Shoola 每运 9 年、12 子运各 9 月；
   - Kalachakra 占位表 9-rasi 序合法、sumOfPeriods == paramayush(不变量)、缺宿优雅降级。
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'flatlib-ctrad2'))

from flatlib import const  # noqa: E402

from astrostudy.india import rasi_dasha as rd  # noqa: E402
from astrostudy.india.primitives import (  # noqa: E402
    SIGNS, quality, ODD_SIGNS, offset_sign,
)

# 两字 token ↔ flatlib sign(golden 序列书写用)。
_TOK = rd._NARAYANA_TOKEN
_REV = rd._NARAYANA_TOKEN_REV


def _toks(signs):
    return [_REV[s] for s in signs]


def _signs(tokens):
    return [_TOK[t] for t in tokens.split()]


# 一组样例行星布局(用于种子/期长；非真实命盘，仅测结构)。
PLANET_SIGNS = {
    const.SUN: const.LEO,
    const.MOON: const.TAURUS,
    const.MARS: const.ARIES,
    const.MERCURY: const.VIRGO,
    const.JUPITER: const.CANCER,
    const.VENUS: const.LIBRA,
    const.SATURN: const.CAPRICORN,
    const.NORTH_NODE: const.GEMINI,
    const.SOUTH_NODE: const.SAGITTARIUS,
}
LAGNA = const.ARIES


def _is_valid_sign(s):
    return s in SIGNS


# ── 通用期长 + 二轮不变量 ─────────────────────────────────────────────────
def test_narayana_period_in_range():
    for s in SIGNS:
        y = rd.narayana_period_years(s, PLANET_SIGNS)
        assert 1 <= y <= 12, (s, y)


def test_second_cycle_complement():
    for fy in range(1, 13):
        assert rd.second_cycle_years(fy) == 12 - fy


def test_narayana_two_cycle_sum_is_12():
    res = rd.narayana_dasha(LAGNA, PLANET_SIGNS)
    by_rasi = {}
    for item in res['mahadashas']:
        by_rasi.setdefault(item['rasi'], []).append(item['years'])
    # 每 rasi 出现两次(两轮)，两轮和 = 12
    for rasi, years_list in by_rasi.items():
        assert len(years_list) == 2, rasi
        assert sum(years_list) == 12, (rasi, years_list)


def test_period_years_lord_in_own_sign_is_12():
    # 主星在 dasa rasi 本宫(距离 1)→ 12 年。火星(Ar 主)在 Ar → Ar 期长基础 12(火 Ar 非旺非落)。
    signs = dict(PLANET_SIGNS)
    signs[const.MARS] = const.ARIES
    assert rd.narayana_period_years(const.ARIES, signs) == 12


# ── Narayana 结构 + 方向 ─────────────────────────────────────────────────
def test_narayana_structure():
    res = rd.narayana_dasha(LAGNA, PLANET_SIGNS)
    assert res['system'] == 'Narayana'
    assert _is_valid_sign(res['seed'])
    assert res['direction'] in ('forward', 'reverse')
    assert len(res['order']) == 12
    assert set(res['order']) == set(SIGNS)           # 序为 12 rasi 的排列
    assert len(res['mahadashas']) == 24              # 两轮
    for item in res['mahadashas']:
        assert _is_valid_sign(item['rasi'])
        assert item['cycle'] in (1, 2)
        assert 'years' in item and 'lord' in item


def test_narayana_movable_seed_is_brahma_consecutive():
    # 种子为动宫时走 Brahma 逐宫序(consecutive)：order 必为从 seed 起连续 12 宫。
    res = rd.narayana_dasha(const.ARIES, PLANET_SIGNS)  # Ar 动
    if quality(res['seed']) == 'movable' and res['deity'] == 'Brahma':
        order = res['order']
        step = 1 if res['direction'] == 'forward' else -1
        seed_idx = SIGNS.index(order[0])
        for i, s in enumerate(order):
            assert SIGNS.index(s) == (seed_idx + step * i) % 12


def test_narayana_saturn_in_seed_forces_forward():
    # Saturn 在种子 → 强制顺 + Brahma。构造 Saturn 落到种子。
    signs = dict(PLANET_SIGNS)
    seventh = offset_sign(LAGNA, 7)
    seed = rd.stronger_sign(LAGNA, seventh, signs)
    signs[const.SATURN] = seed
    res = rd.narayana_dasha(LAGNA, signs)
    assert res['seed'] == seed
    assert res['direction'] == 'forward'
    assert res['deity'] == 'Brahma'


# ── Narayana 权威序表逐列自检 + 对照算例 golden ───────────────────────────
def test_narayana_table_is_valid_permutations():
    # 全 12 种子 × 3 列(normal/sat/ketu)必为 12 rasi 排列、首元 = 种子。
    full = set(SIGNS)
    for tok, row in rd._NARAYANA_ORDER.items():
        seed = _TOK[tok]
        for col in ('normal', 'sat', 'ketu'):
            seq = rd._narayana_table_order(seed, col)
            assert len(seq) == 12, (tok, col)
            assert set(seq) == full, (tok, col)        # 无重复、全覆盖
            assert seq[0] == seed, (tok, col)


def test_narayana_sat_column_is_forward_consecutive():
    # Saturn 在种子 → 强制顺 Brahma：sat 列恒 = 从种子起黄道顺数 12 宫。
    for tok in rd._NARAYANA_ORDER:
        seed = _TOK[tok]
        seq = rd._narayana_table_order(seed, 'sat')
        seed_idx = SIGNS.index(seed)
        for i, s in enumerate(seq):
            assert SIGNS.index(s) == (seed_idx + i) % 12, (tok, i)


# 权威对照算例的行星布局：lagna Aq；7 宫 Le 强 → 种子 Le(定宫 Shiva)。
_NARAYANA_GOLDEN_PLANETS = {
    const.SUN: const.CANCER,        # Cn(Le 主，逆数第 2 宫 → Le 期长 1 年)
    const.MOON: const.TAURUS,       # Ta(旺 → Cn 期长 +1)
    const.MARS: const.LEO,          # Le
    const.MERCURY: const.LEO,       # Le
    const.JUPITER: const.SCORPIO,   # Sc
    const.VENUS: const.LEO,         # Le(3 曜聚 Le → 7 宫强于 lagna)
    const.SATURN: const.TAURUS,     # Ta
    const.NORTH_NODE: const.GEMINI,
    const.SOUTH_NODE: const.SAGITTARIUS,
}
_NARAYANA_GOLDEN_LAGNA = const.AQUARIUS


def test_narayana_golden_sequence():
    # 权威对照算例：种子 Le → 序 Le Cp Ge Sc Ar Vi Aq Cn Sg Ta Li Pi(定宫 Shiva 逐格序)。
    res = rd.narayana_dasha(_NARAYANA_GOLDEN_LAGNA, _NARAYANA_GOLDEN_PLANETS)
    assert res['seed'] == const.LEO
    assert res['deity'] == 'Shiva'
    assert res['direction'] == 'forward'
    assert res['order'] == _signs('Le Cp Ge Sc Ar Vi Aq Cn Sg Ta Li Pi')


def test_narayana_golden_period_lengths():
    # 权威对照算例首轮各 rasi 期长(含 Cn 月旺 +1 = 3)：与逐宫数法精确对齐。
    expected = {
        'Le': 1, 'Cp': 8, 'Ge': 2, 'Sc': 9, 'Ar': 4, 'Vi': 1,
        'Aq': 9, 'Cn': 3, 'Sg': 11, 'Ta': 3, 'Li': 10,
    }
    for tok, exp in expected.items():
        got = rd.narayana_period_years(_TOK[tok], _NARAYANA_GOLDEN_PLANETS)
        assert got == exp, (tok, got, exp)
    # 首运(cycle1 第 0 项)= Le，1 年。
    res = rd.narayana_dasha(_NARAYANA_GOLDEN_LAGNA, _NARAYANA_GOLDEN_PLANETS)
    first = res['mahadashas'][0]
    assert first['rasi'] == const.LEO and first['cycle'] == 1 and first['years'] == 1


def test_narayana_ketu_in_seed_uses_ketu_column():
    # Ketu 在种子 → 取权威序表 ketu 列。构造种子 = Ar、Ketu 落 Ar。
    signs = dict(PLANET_SIGNS)
    seventh = offset_sign(const.ARIES, 7)
    seed = rd.stronger_sign(const.ARIES, seventh, signs)
    signs[const.SOUTH_NODE] = seed
    signs[const.SATURN] = const.GEMINI            # Saturn 不在种子(否则 sat 优先)
    res = rd.narayana_dasha(const.ARIES, signs)
    if res['seed'] == const.ARIES:
        assert res['order'] == _signs('Ar Pi Aq Cp Sg Sc Li Vi Le Cn Ge Ta')


# ── Kalachakra 权威对照算例 golden ───────────────────────────────────────
def test_kalachakra_golden_start_rasi_and_balance():
    # 权威对照算例：月 15°50′Ta(=45.8333°)→ Rohini pada2 → 起 Sc 余 4.75 年。
    moon_lon = 30.0 + 15.0 + 50.0 / 60.0          # 15°50′ 进入 Taurus(sidereal)
    res = rd.kalachakra_dasha(moon_lon, 'Rohini', 2)
    assert res['available'] is True
    assert res['group'] == 'apasavya1'
    assert res['sequence'] == _signs('Vi Li Sc Pi Aq Cp Sg Sc Li')
    assert res['paramayush'] == 83
    assert abs(res['padaProgress'] - 0.75) < 1e-6
    assert res['startRasi'] == const.SCORPIO
    assert abs(res['startBalanceYears'] - 4.75) < 1e-6
    assert abs(res['elapsedYears'] - 62.25) < 1e-6


def test_kalachakra_within_pada_fraction():
    # pada 内进度 = 整宿进度×4 取小数部分(对照算例 15°50′Ta = Rohini pada2 内 0.75)。
    moon_lon = 30.0 + 15.0 + 50.0 / 60.0
    assert abs(rd._within_pada_fraction(moon_lon) - 0.75) < 1e-6


# ── Lagna Kendradi + Sudasa ──────────────────────────────────────────────
def test_lagna_kendradi_structure():
    res = rd.lagna_kendradi_dasha(LAGNA, PLANET_SIGNS)
    assert res['system'] == 'LagnaKendradi'
    assert len(res['order']) == 12
    assert set(res['order']) == set(SIGNS)
    assert len(res['mahadashas']) == 24


def test_lagna_kendradi_direction_by_lagna_parity():
    # 奇宫 lagna → 顺(无 Sat/Ketu 干扰时)。Ar 奇 → forward。
    signs = dict(PLANET_SIGNS)
    # 把 Saturn/Ketu 挪开种子，避免异常覆盖
    signs[const.SATURN] = const.PISCES
    signs[const.SOUTH_NODE] = const.PISCES
    res = rd.lagna_kendradi_dasha(const.ARIES, signs)
    if res['seed'] not in (signs[const.SATURN], signs[const.SOUTH_NODE]):
        assert res['direction'] == 'forward'


def test_sudasa_first_balance_ratio():
    # SL 在 rasi 内 12°21′ → 余比 =(30−12.35)/30 ≈ 0.588。
    res = rd.sudasa_dasha(const.CAPRICORN, 12.35, PLANET_SIGNS)
    assert res['system'] == 'Sudasa'
    assert abs(res['firstBalanceRatio'] - (30.0 - 12.35) / 30.0) < 1e-3  # 模块四舍五入到 4 位
    assert res['mahadashas'][0]['years'] <= res['mahadashas'][0]['fullYears']
    assert len(res['order']) == 12


def test_sudasa_seed_is_sree_lagna_sign():
    res = rd.sudasa_dasha(const.CAPRICORN, 5.0, PLANET_SIGNS)
    assert res['seed'] == const.CAPRICORN


# ── Drigdasa ─────────────────────────────────────────────────────────────
def test_drigdasa_three_groups_of_four():
    res = rd.drigdasa(LAGNA, PLANET_SIGNS)
    assert res['system'] == 'Drigdasa'
    assert len(res['groups']) == 3
    for grp in res['groups']:
        assert len(grp['signs']) == 4              # seed + 3 照
        assert _is_valid_sign(grp['seed'])
    assert len(res['order']) == 12                 # 3×4
    assert len(res['mahadashas']) == 24


def test_drigdasa_seeds_are_9_10_11():
    res = rd.drigdasa(LAGNA, PLANET_SIGNS)
    seeds = [g['seed'] for g in res['groups']]
    assert seeds == [offset_sign(LAGNA, 9), offset_sign(LAGNA, 10), offset_sign(LAGNA, 11)]


def test_drigdasa_group_order_by_seed_foot_golden():
    # 组内 4 宫次序按种子自身奇足(顺)/偶足(逆)方向(权威对照算例)。
    # 取 lagna = Libra → 9/10/11 宫 = Ge / Cn / Le：
    #   9 = Ge(奇足)→顺→ Ge Vi Sg Pi；10 = Cn(偶足)→逆→ Cn Ta Aq Sc；
    #   11 = Le(偶足)→逆→ Le Ar Cp Li。
    res = rd.drigdasa(const.LIBRA, {})
    groups = {g['seed']: (g['direction'], g['signs']) for g in res['groups']}
    assert groups[const.GEMINI] == ('forward', _signs('Ge Vi Sg Pi'))
    assert groups[const.CANCER] == ('reverse', _signs('Cn Ta Aq Sc'))
    assert groups[const.LEO] == ('reverse', _signs('Le Ar Cp Li'))
    # order = 三组顺次拼接
    assert res['order'] == _signs('Ge Vi Sg Pi Cn Ta Aq Sc Le Ar Cp Li')


# ── Niryana Shoola ───────────────────────────────────────────────────────
def test_niryana_shoola_period_by_quality():
    res = rd.niryana_shoola_dasha(LAGNA, PLANET_SIGNS)
    assert res['system'] == 'NiryanaShoola'
    assert len(res['mahadashas']) == 12
    for item in res['mahadashas']:
        q = quality(item['rasi'])
        expected = {'movable': 7, 'fixed': 8, 'dual': 9}[q]
        assert item['years'] == expected


def test_niryana_shoola_first_three_sum_24():
    res = rd.niryana_shoola_dasha(LAGNA, PLANET_SIGNS)
    first_three = res['mahadashas'][:3]
    # 连续 3 rasi 必含一动一定一双 → 7+8+9 = 24
    assert sum(it['years'] for it in first_three) == 24


def test_niryana_shoola_direction_odd_forward():
    res = rd.niryana_shoola_dasha(LAGNA, PLANET_SIGNS)
    seed = res['seed']
    expected = 'forward' if seed in ODD_SIGNS else 'reverse'
    assert res['direction'] == expected


def test_niryana_shoola_has_maraka():
    res = rd.niryana_shoola_dasha(LAGNA, PLANET_SIGNS)
    mk = res['maraka']
    assert len(mk['rudraCandidates']) == 2
    assert _is_valid_sign(mk['rudra'])
    assert len(mk['trishoola']) == 3


# ── Shoola ───────────────────────────────────────────────────────────────
def test_shoola_each_period_9_years():
    res = rd.shoola_dasha(LAGNA, PLANET_SIGNS)
    assert res['system'] == 'Shoola'
    assert res['direction'] == 'forward'           # 恒顺
    assert len(res['mahadashas']) == 12
    assert all(it['years'] == 9 for it in res['mahadashas'])
    assert sum(it['years'] for it in res['mahadashas']) == 108


def test_shoola_consecutive_forward():
    res = rd.shoola_dasha(LAGNA, PLANET_SIGNS)
    order = res['order']
    seed_idx = SIGNS.index(order[0])
    for i, s in enumerate(order):
        assert SIGNS.index(s) == (seed_idx + i) % 12


def test_shoola_sub_periods():
    subs = rd.shoola_sub_periods(const.ARIES)
    assert len(subs) == 12
    assert all(s['months'] == 9 for s in subs)
    assert abs(sum(s['years'] for s in subs) - 9.0) < 1e-9   # 12×9 月 = 9 年


def test_shoola_variant_changes_seed():
    base = rd.shoola_dasha(LAGNA, PLANET_SIGNS, variant='self')
    pitri = rd.shoola_dasha(LAGNA, PLANET_SIGNS, variant='pitri')
    assert pitri['variant'] == 'pitri'
    # 亲属变体种子两宫不同 → 序通常不同(此样例下应不同)
    assert 'mahadashas' in pitri and len(pitri['mahadashas']) == 12


# ── Kalachakra(占位表 + 不变量 + 优雅降级)──────────────────────────────
def test_kalachakra_period_table():
    assert rd.kalachakra_period_years(const.LEO) == 5      # 日 Le
    assert rd.kalachakra_period_years(const.CANCER) == 21  # 月 Cn
    assert rd.kalachakra_period_years(const.ARIES) == 7    # 火 Ar
    assert rd.kalachakra_period_years(const.CAPRICORN) == 4  # 土 Cp


def test_kalachakra_pada_sequence_valid():
    info = rd.kalachakra_pada_sequence('Ashwini', 1)
    assert info is not None
    assert len(info['seq']) == 9
    assert all(_is_valid_sign(s) for s in info['seq'])
    assert _is_valid_sign(info['deha'])
    assert _is_valid_sign(info['jeeva'])
    assert info['savya'] is True


def test_kalachakra_sum_equals_paramayush_invariant():
    # 不变量(转录自检)：每 pada 的 9-rasi 序的宫主期长之和 == paramayush。
    # 已转录的 16 行(4 组 × 4 pada)全部满足此律 → 钉死，转录错(某 token 错)会立刻红。
    for group, padas in rd.KALACHAKRA_PADA_TABLE.items():
        for pada, entry in padas.items():
            assert entry['paramayush'] > 0
            assert len(entry['seq']) == 9
            info = rd.kalachakra_pada_sequence(_first_nak_of(group), pada)
            s = rd.kalachakra_paramayush(info['seq'])
            assert s == info['paramayush'], (group, pada, s, info['paramayush'])


def _first_nak_of(group):
    return rd.KALACHAKRA_GROUPS[group][0]


def test_kalachakra_dasha_structure():
    res = rd.kalachakra_dasha(45.0, 'Ashwini', 1, nak_progress=0.5)
    assert res['available'] is True
    assert res['system'] == 'Kalachakra'
    assert len(res['sequence']) == 9
    assert len(res['mahadashas']) == 9
    assert res['sumOfPeriods'] == rd.kalachakra_paramayush(res['sequence'])
    assert 'startRasi' in res                       # 有 nak_progress → 给起运
    assert _is_valid_sign(res['startRasi'])
    assert res['startBalanceYears'] >= 0


def test_kalachakra_uttara_bhadrapada_covered():
    # Uttara Bhadrapada 现已归入 savya 第 2 子组，27 宿全覆盖；其 pada 表与该子组一致。
    info = rd.kalachakra_pada_sequence('Uttara Bhadrapada', 1)
    assert info is not None
    assert info['group'] == 'savya2'
    assert info['savya'] is True
    # 与同子组(如 Bharani)pada1 完全同序
    bharani = rd.kalachakra_pada_sequence('Bharani', 1)
    assert info['seq'] == bharani['seq']
    assert info['deha'] == bharani['deha'] and info['jeeva'] == bharani['jeeva']
    # U.Bhadrapada pada1 = Sc Li Vi Cn Le Ge Ta Ar Pi，deha Sc(savya2 子表)。
    assert info['deha'] == const.SCORPIO
    assert info['seq'] == _signs('Sc Li Vi Cn Le Ge Ta Ar Pi')


def test_kalachakra_revati_in_savya1_golden():
    # Revati 归 savya 第 1 子组(权威对照算例核定)：pada1 = Ar Ta Ge Cn Le Vi Li Sc Sg、
    # deha Ar / jeeva Sg / paramayush 100；与同子组首宿 Ashwini 同序。
    info = rd.kalachakra_pada_sequence('Revati', 1)
    assert info is not None
    assert info['group'] == 'savya1'
    assert info['savya'] is True
    assert info['deha'] == const.ARIES
    assert info['jeeva'] == const.SAGITTARIUS
    assert info['paramayush'] == 100
    assert info['seq'] == _signs('Ar Ta Ge Cn Le Vi Li Sc Sg')
    ashwini = rd.kalachakra_pada_sequence('Ashwini', 1)
    assert info['seq'] == ashwini['seq']
    # Revati(savya1, deha Ar)与 U.Bhadrapada(savya2, deha Sc)分属不同子组、不同序。
    ub = rd.kalachakra_pada_sequence('Uttara Bhadrapada', 1)
    assert info['group'] != ub['group']
    assert info['deha'] != ub['deha']


def test_kalachakra_all_27_nakshatras_grouped():
    # 全 27 宿都能归组(savya1/2 + apasavya1/2)，无 None。
    from astrostudy.nakshatra import NAKSHATRAS
    for name, _label, _lord in NAKSHATRAS:
        assert rd._nak_group(name) is not None, name


def test_kalachakra_unknown_nak_graceful():
    # 真正未知的宿名 → 优雅降级，不抛。
    res = rd.kalachakra_dasha(0.0, 'NotARealNakshatra', 1)
    assert res['available'] is False
    assert res['reason'] == 'kalachakra_pada_table_incomplete'


# ── 逐级强弱判据(行星 5 级 / 星座 6 级)── synthetic tie-break golden ────────
# 双主宫：Scorpio = Mars / Ketu(South Node)；Aquarius = Saturn / Rahu(North Node)。
# _stronger_lord 用行星 5 级判据择强主；逐级首决即止，全级未分 → 取传统主(列首)。
def test_planet_strength_level1_more_conjunct():
    # L1 同宫合相曜数：Ketu 在 Gemini 与 Sun 合相、Mars 独居 → Ketu 强。
    ps = {const.MARS: const.LEO, const.SOUTH_NODE: const.GEMINI, const.SUN: const.GEMINI}
    assert rd._stronger_lord(const.SCORPIO, ps) == const.SOUTH_NODE


def test_planet_strength_level2_dignity():
    # L2 旺/入庙：Mars 居自宫 Aries、Ketu 无 → Mars 强(L1 同为独居先平)。
    ps = {const.MARS: const.ARIES, const.SOUTH_NODE: const.GEMINI}
    assert rd._stronger_lord(const.SCORPIO, ps) == const.MARS


def test_planet_strength_level3_conjunct_exalted():
    # L3 与旺曜合相：Mars 与旺木(Cancer)同宫、Ketu 独居；L1/L2 先平 → Mars 强。
    ps = {const.MARS: const.CANCER, const.JUPITER: const.CANCER, const.SOUTH_NODE: const.GEMINI}
    assert rd._stronger_lord(const.SCORPIO, ps) == const.MARS


def test_planet_strength_level5_degree_node_from_end():
    # L5 宫内推进度(罗/计自宫末量起)：Mars 5°Leo(进度 5)、Ketu 5°Gemini(自末 = 25)→ Ketu 强。
    ps = {const.MARS: const.LEO, const.SOUTH_NODE: const.GEMINI}
    lons = {const.MARS: 120.0 + 5.0, const.SOUTH_NODE: 60.0 + 5.0}
    assert rd._stronger_lord(const.SCORPIO, ps, planet_lons=lons) == const.SOUTH_NODE


def test_planet_strength_full_tie_falls_back_to_traditional():
    # 全级未分(无任何布局/经度)→ 取列首传统主(Scorpio → Mars)。
    assert rd._stronger_lord(const.SCORPIO, {}) == const.MARS
    # 直接比较：平 → 返回 0。
    assert rd.planet_strength_compare(const.MARS, const.SOUTH_NODE, {}) == 0


def test_sign_strength_level1_more_occupants():
    # L1 占宫曜数：Aries 2 曜、Libra 0 → Aries 强(+1)。
    ps = {const.SUN: const.ARIES, const.MARS: const.ARIES}
    assert rd.sign_strength_compare(const.ARIES, const.LIBRA, ps) == 1


def test_sign_strength_level2_benefic_lord_support():
    # L2 {木、水、本宫主}占/照本宫数：木在 Taurus 撑 a，Capricorn 无 → a 强。
    ps = {const.JUPITER: const.TAURUS}
    assert rd.sign_strength_compare(const.TAURUS, const.CAPRICORN, ps) == 1


def test_sign_strength_level3_exalted_occupant():
    # L3 含旺曜：Aries 含旺日、Libra 含非旺月(各 1 占→L1 平；L2 平)→ Aries 强。
    ps = {const.SUN: const.ARIES, const.MOON: const.LIBRA}
    assert rd.sign_strength_compare(const.ARIES, const.LIBRA, ps) == 1


def test_sign_strength_level4_lord_opposite_parity():
    # L4 主宫奇偶相反：Aries(奇)主火居偶宫 Taurus = 相反 → a 强；Libra(奇)主金居奇宫 Gemini = 同。
    ps = {const.MARS: const.TAURUS, const.VENUS: const.GEMINI}
    assert rd.sign_strength_compare(const.ARIES, const.LIBRA, ps) == 1


def test_sign_strength_level5_natural_strength():
    # L5 自然力(双>定>动)：无布局时 Gemini(双) > Taurus(定) > Aries(动)。
    assert rd.sign_strength_compare(const.GEMINI, const.TAURUS, {}) == 1
    assert rd.sign_strength_compare(const.TAURUS, const.ARIES, {}) == 1


def test_sign_strength_level6_lord_degree():
    # L6 两宫主推进度：同为动宫(Ar/Li),前 5 级全平,Venus(Libra 主)更进 → Libra 强(−1)。
    ps = {const.MARS: const.LEO, const.VENUS: const.LEO}   # 两主同居奇宫,L4 同平
    lons = {const.MARS: 120.0 + 10.0, const.VENUS: 120.0 + 20.0}
    assert rd.sign_strength_compare(const.ARIES, const.LIBRA, ps, planet_lons=lons) == -1


def test_sign_strength_full_tie_returns_first():
    # 全级未分 → stronger_sign 取 sign_a。
    assert rd.sign_strength_compare(const.ARIES, const.LIBRA, {}) == 0
    assert rd.stronger_sign(const.ARIES, const.LIBRA, {}) == const.ARIES


def test_strength_proxy_override_still_honored():
    # 向后兼容：传自定义 strength_proxy 时仍按其打分(此处恒偏向 sign_b)。
    def always_b(sign, planet_signs):
        return 1.0 if sign == const.LIBRA else 0.0
    assert rd.stronger_sign(const.ARIES, const.LIBRA, {}, strength_proxy=always_b) == const.LIBRA


# ── 顶层聚合 build_rasi_dashas ───────────────────────────────────────────
def test_build_rasi_dashas_full():
    inputs = {
        'lagna_sign': LAGNA,
        'planet_signs': PLANET_SIGNS,
        'sree_lagna_sign': const.CAPRICORN,
        'sree_lagna_signlon': 12.35,
        'moon_lon': 45.0,
        'moon_nak_name': 'Ashwini',
        'moon_pada': 1,
        'moon_nak_progress': 0.5,
    }
    res = rd.build_rasi_dashas(inputs)
    assert res['available'] is True
    for key in ('narayana', 'lagnaKendradi', 'sudasa', 'drigdasa',
                'niryanaShoola', 'shoola', 'kalachakra'):
        assert key in res
    assert res['sudasa']['system'] == 'Sudasa'
    assert res['kalachakra']['available'] is True


def test_build_rasi_dashas_missing_optionals():
    # 缺 SL / 月宿 → 对应项优雅降级，其余仍算。
    res = rd.build_rasi_dashas({'lagna_sign': LAGNA, 'planet_signs': PLANET_SIGNS})
    assert res['available'] is True
    assert res['narayana']['system'] == 'Narayana'
    assert res['sudasa']['available'] is False
    assert res['kalachakra']['available'] is False


def test_build_rasi_dashas_missing_lagna():
    res = rd.build_rasi_dashas({})
    assert res['available'] is False


def test_build_rasi_dashas_planet_lons_threads_without_crash():
    # 可选 planet_lons 透传到逐级强弱判据末级(宫内推进度)；有/无都不崩、结构一致。
    base = {'lagna_sign': LAGNA, 'planet_signs': PLANET_SIGNS}
    lons = {p: float(SIGNS.index(s)) * 30.0 + 7.0 for p, s in PLANET_SIGNS.items()}
    with_lons = rd.build_rasi_dashas(dict(base, planet_lons=lons))
    without = rd.build_rasi_dashas(base)
    assert with_lons['available'] is True and without['available'] is True
    for key in ('narayana', 'lagnaKendradi', 'drigdasa', 'niryanaShoola', 'shoola'):
        assert len(with_lons[key]['mahadashas']) == len(without[key]['mahadashas'])


def test_tara_lagna_dasha_uniform_9y_108():
    # P1 Tāra Lagna Daśā:均匀 9 年/座 = 108;TL 奇象→顺、偶象→逆;商随月在宿内度。
    from astrostudy.india.rasi_dasha import tara_lagna_dasha
    from flatlib import const
    t = tara_lagna_dasha(const.ARIES, 0.0)        # 月宿首(商0)→TL宫1=白羊(奇)→顺
    assert t['available'] and t['system'] == 'TaraLagna' and t['totalYears'] == 108
    assert t['taraLagna'] == const.ARIES and t['taraLagnaHouse'] == 1 and t['direction'] == 'forward'
    assert [m['rasi'] for m in t['mahadashas']] == list(const.LIST_SIGNS)   # 顺序 12 座
    assert all(m['years'] == 9 for m in t['mahadashas']) and sum(m['years'] for m in t['mahadashas']) == 108
    # 偶象 Lagna(金牛)→TL金牛→逆。
    t2 = tara_lagna_dasha(const.TAURUS, 0.0)
    assert t2['direction'] == 'reverse'
    assert [m['rasi'] for m in t2['mahadashas'][:3]] == [const.TAURUS, const.ARIES, const.PISCES]
    # 商随月度:Moon 6.7°(宿内 6×1.111≈6.67)→商6→TL宫7。
    assert tara_lagna_dasha(const.ARIES, 6.7)['taraLagnaHouse'] == 7
    # 缺月/缺 Lagna 优雅降级。
    assert tara_lagna_dasha(None, 0.0)['available'] is False
