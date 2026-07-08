# -*- coding: utf-8 -*-
"""Arudha pada + Argala 结构/不变量 golden。

⚠️ 算法为标准转录公式；逐宫精确落点数值核对待书 Example(参照单盘全 12 pada)。
本测试钉结构与不变量(AL=A1/UL=A12、落 1/7→第 10 例外、双主取强、Argala 宫距、Ketu 逆数)，
非精确金标(无书内确切 pada 数表前)。
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'flatlib-ctrad2'))

from flatlib import const  # noqa: E402

from astrostudy.india.arudha import (  # noqa: E402
    sign_lords, arudha_of_sign, _pada_from_signs,
    house_arudhas, arudha_lagna, upapada_lagna,
    ARUDHA_LABELS, AL_INDEX, UL_INDEX,
    argala_signs, argala_for_sign, argala_all_houses,
    graha_padas, compute_arudha,
    RAHU, KETU, SIGN_LORDS, SIGN_COLORDS,
    ARGALA_PRIMARY, ARGALA_SECONDARY,
)

S = const  # 简写

# 一个手可追的简单布局：行星各占一宫(rasi 占位)。
SAMPLE = {
    S.SUN: S.LEO,
    S.MOON: S.CANCER,
    S.MARS: S.ARIES,
    S.MERCURY: S.GEMINI,
    S.JUPITER: S.SAGITTARIUS,
    S.VENUS: S.TAURUS,
    S.SATURN: S.CAPRICORN,
    RAHU: S.AQUARIUS,
    KETU: S.LEO,
}


# ── 主星表 ────────────────────────────────────────────────────────────────
def test_sign_lords_single():
    assert sign_lords(S.LEO) == [S.SUN]
    assert sign_lords(S.CANCER) == [S.MOON]
    assert sign_lords(S.GEMINI) == [S.MERCURY]


def test_sign_lords_dual():
    # 双主古典口径：天蝎=火+计、水瓶=土+罗。
    assert sign_lords(S.SCORPIO) == [S.MARS, KETU]
    assert sign_lords(S.AQUARIUS) == [S.SATURN, RAHU]
    assert SIGN_COLORDS[S.SCORPIO] == KETU
    assert SIGN_COLORDS[S.AQUARIUS] == RAHU


def test_all_signs_have_lord():
    from astrostudy.india.primitives import SIGNS
    for s in SIGNS:
        assert s in SIGN_LORDS


# ── Arudha 落点核心算法 ──────────────────────────────────────────────────
def test_pada_basic():
    # 参照 Ar、主星在 Le：Ar→Le=5，从 Le 数 5 → Sg。
    assert _pada_from_signs(S.ARIES, S.LEO) == S.SAGITTARIUS


def test_pada_exception_first_house():
    # 主星在参照本宫(dist=1)→落本宫(1)→改第 10 宫(Ar 的第10=Cp)。
    assert _pada_from_signs(S.ARIES, S.ARIES) == S.CAPRICORN


def test_pada_exception_seventh_house():
    # 主星在参照第 7 宫(dist=7)→落第 7 宫→改第 10 宫(Cp)。
    assert _pada_from_signs(S.ARIES, S.LIBRA) == S.CAPRICORN


def test_pada_exception_always_tenth():
    # 落 1/7 例外永远收敛到「参照的第 10 宫」，遍历全 12 参照 rasi 验证。
    from astrostudy.india.primitives import SIGNS, offset_sign
    for ref in SIGNS:
        tenth = offset_sign(ref, 10)
        # 主星与参照同宫(dist1) / 在第7宫(dist7) 两种触发例外。
        assert _pada_from_signs(ref, ref) == tenth
        assert _pada_from_signs(ref, offset_sign(ref, 7)) == tenth


def test_arudha_of_sign_uses_lord_position():
    # Mars 在 Ar；参照 Ar → 主星 Mars 在本宫 → 例外 → Cp。
    signs = {S.MARS: S.ARIES}
    assert arudha_of_sign(S.ARIES, signs) == S.CAPRICORN


def test_arudha_missing_lord_none():
    # 主星不在 planet_signs → 返回 None(不臆造)。
    assert arudha_of_sign(S.ARIES, {}) is None


# ── 12 宫 / AL / UL ──────────────────────────────────────────────────────
def test_house_arudhas_length_and_labels():
    rows = house_arudhas(S.ARIES, SAMPLE)
    assert len(rows) == 12
    assert [r['label'] for r in rows] == ARUDHA_LABELS
    assert [r['house'] for r in rows] == list(range(1, 13))


def test_al_is_a1():
    lagna = S.ARIES
    rows = house_arudhas(lagna, SAMPLE)
    al = arudha_lagna(lagna, SAMPLE)
    # AL = 第 1 宫 arudha = A1。
    assert rows[AL_INDEX - 1]['label'] == 'A1'
    assert rows[AL_INDEX - 1]['sign'] == al


def test_ul_is_a12():
    lagna = S.ARIES
    rows = house_arudhas(lagna, SAMPLE)
    ul = upapada_lagna(lagna, SAMPLE)
    # UL = 第 12 宫 arudha = A12。
    assert rows[UL_INDEX - 1]['label'] == 'A12'
    assert rows[UL_INDEX - 1]['sign'] == ul


def test_al_index_constants():
    assert AL_INDEX == 1 and UL_INDEX == 12
    assert ARUDHA_LABELS[0] == 'A1' and ARUDHA_LABELS[-1] == 'A12'


def test_house_arudha_signindex_consistent():
    from astrostudy.india.primitives import index_of
    rows = house_arudhas(S.LEO, SAMPLE)
    for r in rows:
        if r['sign'] is not None:
            assert r['signIndex'] == index_of(r['sign']) + 1


def test_al_exception_triggers_tenth():
    # 构造 lagna=Ar，使 Ar 主星 Mars 落在 Ar 本宫 → AL 走例外 → Ar 第10宫=Cp。
    signs = dict(SAMPLE)
    signs[S.MARS] = S.ARIES
    assert arudha_lagna(S.ARIES, signs) == S.CAPRICORN


# ── 双主取强 ──────────────────────────────────────────────────────────────
def test_dual_lord_picks_dignified():
    # 参照 Aquarius(土/罗)。让 Saturn 居自身 own(Cp)、Rahu 平凡 → 取 Saturn 定位 pada。
    signs = {S.SATURN: S.CAPRICORN, RAHU: S.GEMINI}
    # Saturn 在 Cp(own)更强 → 用 Saturn 位(Cp)：Aq→Cp dist=12，从 Cp 数12→Aq？验证落点取自 Saturn。
    pada = arudha_of_sign(S.AQUARIUS, signs)
    from astrostudy.india.arudha import _pada_from_signs as pf
    assert pada == pf(S.AQUARIUS, S.CAPRICORN)   # 用了 Saturn(强者)所在 rasi


def test_dual_lord_other_dignified():
    # 反过来让 Rahu 居旺(Ta)、Saturn 平凡 → 取 Rahu 位定 pada。
    signs = {S.SATURN: S.GEMINI, RAHU: S.TAURUS}
    pada = arudha_of_sign(S.AQUARIUS, signs)
    from astrostudy.india.arudha import _pada_from_signs as pf
    assert pada == pf(S.AQUARIUS, S.TAURUS)      # 用了 Rahu(旺者)所在 rasi


def test_dual_lord_degree_tiebreak():
    # 两主均无尊贵 → 用本宫度数高者；planet_lons 给度数。
    signs = {S.MARS: S.GEMINI, KETU: S.LIBRA}     # 参照 Scorpio(火/计)
    lons = {S.MARS: 65.0, KETU: 188.0}            # Mars 在 Ge 5°、Ketu 在 Li 8° → Ketu 度更高
    from astrostudy.india.arudha import _pada_from_signs as pf
    pada = arudha_of_sign(S.SCORPIO, signs, planet_lons=lons)
    assert pada == pf(S.SCORPIO, S.LIBRA)         # Ketu(度高)胜


def test_dual_lord_strength_override():
    # 调用方可注入自定义强弱：强制选副主(Ketu)。
    signs = {S.MARS: S.GEMINI, KETU: S.LIBRA}
    def force_ketu(lords, sign, planet_signs):
        return KETU
    from astrostudy.india.arudha import _pada_from_signs as pf
    pada = arudha_of_sign(S.SCORPIO, signs, ruler_strength=force_ketu)
    assert pada == pf(S.SCORPIO, S.LIBRA)


def test_dual_lord_deterministic_default():
    # 无尊贵、无度数 → 确定性退化到首主(传统主星)，不报错。
    signs = {S.SATURN: S.GEMINI, RAHU: S.LIBRA}
    from astrostudy.india.arudha import _pada_from_signs as pf
    pada = arudha_of_sign(S.AQUARIUS, signs)
    assert pada == pf(S.AQUARIUS, S.GEMINI)       # 退化到 Saturn(传统主)


# ── graha pada ───────────────────────────────────────────────────────────
def test_graha_padas_per_planet():
    gp = graha_padas(SAMPLE)
    # 每行星以自身所在 rasi 为参照求 pada。
    assert set(gp.keys()) == set(SAMPLE.keys())
    for p, info in gp.items():
        assert info['refSign'] == SAMPLE[p]
        if info['sign'] is not None:
            assert info['sign'] == arudha_of_sign(SAMPLE[p], SAMPLE)


def test_graha_pada_subset():
    gp = graha_padas(SAMPLE, planets=[S.SUN, S.MOON])
    assert set(gp.keys()) == {S.SUN, S.MOON}


# ── Argala 几何 ──────────────────────────────────────────────────────────
def test_argala_geometry_signs():
    g = argala_signs(S.ARIES)
    # 主 argala 2/4/11、次 5。
    assert g['argala'][2] == S.TAURUS
    assert g['argala'][4] == S.CANCER
    assert g['argala'][11] == S.AQUARIUS
    assert g['argala'][ARGALA_SECONDARY] == S.LEO
    # virodha 12/10/3/9。
    assert g['virodha'][12] == S.PISCES
    assert g['virodha'][10] == S.CAPRICORN
    assert g['virodha'][3] == S.GEMINI
    assert g['virodha'][9] == S.SAGITTARIUS


def test_argala_primary_constants():
    assert ARGALA_PRIMARY == (2, 4, 11)
    assert ARGALA_SECONDARY == 5


def test_argala_distances_house_relative():
    # argala/virodha 宫距相对参照宫恒定，遍历全 12 参照 rasi 验证 house_distance。
    from astrostudy.india.primitives import SIGNS, house_distance
    for ref in SIGNS:
        g = argala_signs(ref)
        for d, sign in g['argala'].items():
            assert house_distance(ref, sign) == d
        for v, sign in g['virodha'].items():
            assert house_distance(ref, sign) == v


def test_argala_reverse_for_ketu_geometry():
    # 逆黄道：从 Ar 逆数 2 宫 = Pisces(而非 Taurus)。
    g = argala_signs(S.ARIES, reverse=True)
    assert g['argala'][2] == S.PISCES
    assert g['argala'][4] == S.CAPRICORN


def test_argala_for_sign_ketu_triggers_reverse():
    # 参照 rasi 含 Ketu → reverse 自动开启。
    signs = {KETU: S.ARIES}
    res = argala_for_sign(S.ARIES, signs)
    assert res['reverse'] is True
    # 逆数下 2 宫 = Pisces。
    a2 = next(r for r in res['argala'] if r['dist'] == 2)
    assert a2['sign'] == S.PISCES


def test_argala_for_sign_no_ketu_forward():
    signs = {S.SUN: S.LEO}                          # 参照 Ar 不含 Ketu
    res = argala_for_sign(S.ARIES, signs)
    assert res['reverse'] is False
    a2 = next(r for r in res['argala'] if r['dist'] == 2)
    assert a2['sign'] == S.TAURUS


def test_argala_counts_occupants():
    # 第 2 宫(Ta)放金、第 12 宫(Pi)放木 → argalaCount/virodhaCount 各计。
    signs = {S.VENUS: S.TAURUS, S.JUPITER: S.PISCES}
    res = argala_for_sign(S.ARIES, signs)
    a2 = next(r for r in res['argala'] if r['dist'] == 2)
    assert S.VENUS in a2['planets'] and a2['count'] == 1
    assert res['argalaCount'] >= 1 and res['virodhaCount'] >= 1


def test_argala_subha_papa_split():
    # 吉星(金)进 argala 位 = subhargala；凶星(土)= papargala。
    signs = {S.VENUS: S.TAURUS, S.SATURN: S.CANCER}
    res = argala_for_sign(S.ARIES, signs)
    a2 = next(r for r in res['argala'] if r['dist'] == 2)
    a4 = next(r for r in res['argala'] if r['dist'] == 4)
    assert S.VENUS in a2['subha']
    assert S.SATURN in a4['papa']


def test_argala_net_stronger():
    # argala 位多于 virodha 位 → netStronger=='argala'。
    signs = {S.VENUS: S.TAURUS, S.MARS: S.CANCER}   # 第2(Ta)、第4(Cn) argala 占据，virodha 空
    res = argala_for_sign(S.ARIES, signs)
    assert res['argalaCount'] == 2 and res['virodhaCount'] == 0
    assert res['netStronger'] == 'argala'


def test_argala_third_house_malefic_flip():
    # 第 3 宫(Ge)≥2 凶且无吉 → 由 virodha 反转成 argala。
    signs = {S.SUN: S.GEMINI, S.MARS: S.GEMINI}     # 日+火 两凶在第3宫
    res = argala_for_sign(S.ARIES, signs)
    assert res['thirdFlip'] is True
    # 第 3 宫不再出现在 virodha 列；出现在 argala 列(flippedFromVirodha)。
    assert all(r['dist'] != 3 for r in res['virodha'])
    flipped = [r for r in res['argala'] if r.get('flippedFromVirodha')]
    assert len(flipped) == 1 and flipped[0]['sign'] == S.GEMINI


def test_argala_third_house_no_flip_with_benefic():
    # 第 3 宫 1 凶 1 吉 → 不反转(malefic 不占多数)。
    signs = {S.SUN: S.GEMINI, S.JUPITER: S.GEMINI}
    res = argala_for_sign(S.ARIES, signs)
    assert res['thirdFlip'] is False
    assert any(r['dist'] == 3 for r in res['virodha'])


# ── 聚合入口 ──────────────────────────────────────────────────────────────
def test_argala_all_houses_keys():
    res = argala_all_houses(S.ARIES, SAMPLE)
    assert set(res.keys()) == set(range(1, 13))


def test_compute_arudha_shape():
    res = compute_arudha(S.ARIES, SAMPLE)
    assert res['lagnaSign'] == S.ARIES
    assert len(res['houseArudhas']) == 12
    assert res['arudhaLagna'] == res['houseArudhas'][0]['sign']    # AL=A1
    assert res['upapadaLagna'] == res['houseArudhas'][11]['sign']  # UL=A12
    assert set(res['argala'].keys()) == set(range(1, 13))
    assert set(res['grahaPadas'].keys()) == set(SAMPLE.keys())


def test_compute_arudha_no_graha_pada():
    res = compute_arudha(S.ARIES, SAMPLE, include_graha_pada=False)
    assert 'grahaPadas' not in res


def test_empty_chart_safe():
    # 空盘(无行星)→ pada 全 None、argala 计数为 0，不抛异常。
    res = compute_arudha(S.ARIES, {})
    assert all(r['sign'] is None for r in res['houseArudhas'])
    for h in range(1, 13):
        assert res['argala'][h]['argalaCount'] == 0
        assert res['argala'][h]['virodhaCount'] == 0
