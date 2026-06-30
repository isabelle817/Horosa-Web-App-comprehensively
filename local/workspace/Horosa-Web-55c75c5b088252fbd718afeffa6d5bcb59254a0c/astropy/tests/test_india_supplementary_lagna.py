# -*- coding: utf-8 -*-
"""补充上升族(月上升/烹煮上升/Karakamsa/Swamsa/行星参照点)纯函数 + 引擎接线 golden。

钉定义与结构：
  - Chandra Lagna = 月星座；
  - Paaka Lagna = 上升主星所居星座(权威对照算例：双鱼上升+木星巨蟹→巨蟹；狮子上升+太阳处女→处女)；
  - Karakamsa / Swamsa = AK 的 D9 星座(两者同值，命名区分)；
  - Graha Lagnas = 权威对照表(太阳9/10/11 月4/1/2/11/9 火3 水6 木5 金7 土8/12)逐宫从行星星座顺数。
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'flatlib-ctrad2'))

from flatlib import const  # noqa: E402

from astrostudy.india.supplementary_lagna import (  # noqa: E402
    compute_supplementary_lagnas, chandra_lagna, paaka_lagna,
    karakamsa, swamsa, graha_lagnas, lagna_lord, offset_sign,
    indu_lagna, INDU_KALA, GRAHA_LAGNA_HOUSES, SIGN_CN,
)

S = const


# ── Chandra Lagna ─────────────────────────────────────────────────────────
def test_chandra_lagna_is_moon_sign():
    e = chandra_lagna(S.GEMINI)
    assert e['key'] == 'chandraLagna'
    assert e['sign'] == S.GEMINI
    assert e['signIndex'] == 2
    assert e['signLabel'] == SIGN_CN[S.GEMINI]


# ── Paaka Lagna (上升主星所居星座) ─────────────────────────────────────────
def test_lagna_lord_map():
    # 传统单主：双鱼=木、狮子=日、天蝎=火、水瓶=土。
    assert lagna_lord(S.PISCES) == S.JUPITER
    assert lagna_lord(S.LEO) == S.SUN
    assert lagna_lord(S.SCORPIO) == S.MARS
    assert lagna_lord(S.AQUARIUS) == S.SATURN


def test_paaka_lagna_authoritative_cases():
    # 对照算例①：双鱼上升 + 木星在巨蟹 → 烹煮上升 = 巨蟹。
    e1 = paaka_lagna(S.PISCES, lagna_lord_sign=S.CANCER)
    assert e1['key'] == 'paakaLagna'
    assert e1['sign'] == S.CANCER
    # 对照算例②：狮子上升 + 太阳在处女 → 烹煮上升 = 处女。
    e2 = paaka_lagna(S.LEO, lagna_lord_sign=S.VIRGO)
    assert e2['sign'] == S.VIRGO


def test_paaka_lagna_falls_back_to_lagna_when_lord_sign_missing():
    e = paaka_lagna(S.ARIES)  # 未给上升主所居星座 → 占位为上升星座本身
    assert e['sign'] == S.ARIES


# ── Karakamsa / Swamsa ────────────────────────────────────────────────────
def test_karakamsa_and_swamsa_same_sign_distinct_keys():
    k = karakamsa(S.SCORPIO)
    sw = swamsa(S.SCORPIO)
    assert k['key'] == 'karakamsa' and k['sign'] == S.SCORPIO
    assert sw['key'] == 'swamsa' and sw['sign'] == S.SCORPIO
    assert k['sign'] == sw['sign']      # 同星座
    assert k['key'] != sw['key']        # 命名区分


def test_entry_none_sign_degrades_gracefully():
    e = karakamsa(None)
    assert e['sign'] is None
    assert e['signIndex'] is None
    assert e['signLabel'] is None


# ── Graha Lagnas (权威对照表) ─────────────────────────────────────────────
def test_graha_lagna_table_houses_exact():
    # 逐字钉权威对照表。
    assert GRAHA_LAGNA_HOUSES[S.SUN] == [9, 10, 11]
    assert GRAHA_LAGNA_HOUSES[S.MOON] == [4, 1, 2, 11, 9]
    assert GRAHA_LAGNA_HOUSES[S.MARS] == [3]
    assert GRAHA_LAGNA_HOUSES[S.MERCURY] == [6]
    assert GRAHA_LAGNA_HOUSES[S.JUPITER] == [5]
    assert GRAHA_LAGNA_HOUSES[S.VENUS] == [7]
    assert GRAHA_LAGNA_HOUSES[S.SATURN] == [8, 12]
    # 节点不在表中(不臆造)。
    assert const.NORTH_NODE not in GRAHA_LAGNA_HOUSES
    assert const.SOUTH_NODE not in GRAHA_LAGNA_HOUSES


def test_graha_lagnas_house_signs_counted_from_planet_sign():
    # 太阳在白羊：所司宫 9/10/11 从白羊顺数 → 射手/摩羯/水瓶。
    rows = graha_lagnas({S.SUN: S.ARIES})
    assert len(rows) == 1
    sun = rows[0]
    assert sun['planet'] == S.SUN
    assert sun['sign'] == S.ARIES
    got = {hs['house']: hs['sign'] for hs in sun['houseSigns']}
    assert got[9] == offset_sign(S.ARIES, 9) == S.SAGITTARIUS
    assert got[10] == S.CAPRICORN
    assert got[11] == S.AQUARIUS


def test_graha_lagnas_empty_when_no_planets():
    assert graha_lagnas(None) == []
    assert graha_lagnas({}) == []


def test_graha_lagnas_skips_unlisted_bodies():
    # 节点给了星座也不进表(表中未列)。
    rows = graha_lagnas({const.NORTH_NODE: S.AQUARIUS, S.MARS: S.ARIES})
    planets = {r['planet'] for r in rows}
    assert const.NORTH_NODE not in planets
    assert S.MARS in planets


# ── 汇总结构 ──────────────────────────────────────────────────────────────
def test_compute_returns_all_keys():
    res = compute_supplementary_lagnas(
        S.PISCES, S.GEMINI, S.SCORPIO,
        planet_signs={S.SUN: S.ARIES, S.MOON: S.GEMINI, S.MARS: S.LEO},
        lagna_lord_sign=S.CANCER,
    )
    for key in ('chandraLagna', 'paakaLagna', 'karakamsa', 'swamsa', 'grahaLagnas'):
        assert key in res
    assert res['chandraLagna']['sign'] == S.GEMINI       # 月双子
    assert res['paakaLagna']['sign'] == S.CANCER         # 双鱼上升主(木)在巨蟹
    assert res['karakamsa']['sign'] == S.SCORPIO
    assert res['swamsa']['sign'] == S.SCORPIO
    assert isinstance(res['grahaLagnas'], list)
    for entry in (res['chandraLagna'], res['paakaLagna'], res['karakamsa'], res['swamsa']):
        for field in ('key', 'label', 'sign', 'signIndex', 'signLabel'):
            assert field in entry


# ── 引擎接线 smoke(真盘) ──────────────────────────────────────────────────
def test_engine_smoke_supplementary_lagnas_present():
    from astrostudy.india.india_chart_kernel import IndiaChartKernel
    from astrostudy.india.jyotish_engine import JyotishEngine
    data = {
        'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
        'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri',
    }
    kernel = IndiaChartKernel(data)
    result = JyotishEngine(kernel).compute()
    assert 'supplementaryLagnas' in result
    sl = result['supplementaryLagnas']
    assert sl.get('available') is True
    # 三个核心点都有星座。
    assert sl['chandraLagna']['sign'] in const.LIST_SIGNS
    assert sl['paakaLagna']['sign'] in const.LIST_SIGNS
    assert sl['karakamsa']['sign'] in const.LIST_SIGNS
    # Karakamsa 与 Swamsa 同星座。
    assert sl['karakamsa']['sign'] == sl['swamsa']['sign']
    # Graha Lagnas 为列表(真盘 7 曜都在 → 7 条)。
    assert isinstance(sl['grahaLagnas'], list)
    assert len(sl['grahaLagnas']) == 7


# ── Indu Lagna(财富点·kala 法) ──────────────────────────────────────────
def test_indu_kala_table():
    # 转录护栏:Kala 值表(Sun30/Moon16/Mars6/Mercury8/Jupiter10/Venus12/Saturn1)。
    assert INDU_KALA == {const.SUN: 30, const.MOON: 16, const.MARS: 6,
                         const.MERCURY: 8, const.JUPITER: 10, const.VENUS: 12, const.SATURN: 1}


def test_indu_lagna_worked_example():
    # Lagna 白羊、Moon 巨蟹:9th-from-Aries=Sagittarius(Jup10)、9th-from-Cancer=Pisces(Jup10);
    # S=(10+10)%12=8 → 自巨蟹起第 8 座 = 水瓶(Aquarius)。
    il = indu_lagna(const.ARIES, const.CANCER)
    assert il['ninthFromLagnaLord'] == const.JUPITER
    assert il['ninthFromMoonLord'] == const.JUPITER
    assert il['sumKala'] == 20 and il['stepS'] == 8
    assert il['sign'] == const.AQUARIUS == offset_sign(const.CANCER, 8)


def test_indu_lagna_s_mod12_zero_takes_12():
    # 选一组使 S=(k1+k2)%12==0 → 取 12。Sun(30)+Mars(6)=36 → 36%12=0 → S=12。
    # 9th-from-Lagna 主为日(其座主曜=Sun)需 9th 宫=狮子 → Lagna=Sagittarius(9th=Leo,Sun)。
    # 9th-from-Moon 主为火 → Moon 使 9th=白羊/天蝎(Mars)。取 Moon=Cancer(9th=Pisces? Jup)... 直接构造:
    from astrostudy.india.supplementary_lagna import SIGN_LORDS
    # 找 9th 宫主曜为 Sun 的 Lagna(9th=Leo):Lagna = Sagittarius。
    assert SIGN_LORDS.get(offset_sign(const.SAGITTARIUS, 9)) == const.SUN
    # 找 9th 宫主曜为 Mars 的 Moon(9th=Aries 或 Scorpio):Moon=Leo→9th=Aries(Mars)。
    assert SIGN_LORDS.get(offset_sign(const.LEO, 9)) == const.MARS
    il = indu_lagna(const.SAGITTARIUS, const.LEO)
    assert il['sumKala'] == 36 and il['stepS'] == 12
    assert il['sign'] == offset_sign(const.LEO, 12)


def test_indu_lagna_in_compute_and_graceful():
    res = compute_supplementary_lagnas(const.ARIES, const.CANCER, const.LEO)
    assert res['induLagna']['sign'] == const.AQUARIUS
    # 缺座不臆造。
    assert indu_lagna(None, None)['sign'] is None


def test_varnada_lagna_formula():
    # P1 Varṇada:奇座自白羊顺数/偶座自双鱼逆数 → A/B;同向(座同奇偶)N=A+B、异向 N=|A−B|;N%12(0→12)。
    from astrostudy.india.supplementary_lagna import varnada_lagna
    # 同奇座:白羊L(A=1)/狮子HL(B=5)→ 同向 N=6;Lagna奇→自白羊第6=处女。
    v = varnada_lagna(const.ARIES, const.LEO)
    assert v['countLagna'] == 1 and v['countHora'] == 5 and v['step'] == 6
    assert v['sign'] == const.VIRGO
    # 异向:白羊L(奇,A=1)/金牛HL(偶,B=11)→ N=|1-11|=10;Lagna奇→自白羊第10=摩羯。
    v2 = varnada_lagna(const.ARIES, const.TAURUS)
    assert v2['step'] == 10 and v2['sign'] == const.CAPRICORN
    # 异向 + Lagna 偶:金牛L(偶,A=11)/白羊HL(奇,B=1)→ N=10;Lagna偶→自双鱼逆数第10=双子。
    v3 = varnada_lagna(const.TAURUS, const.ARIES)
    assert v3['step'] == 10 and v3['sign'] == const.GEMINI
    # 缺 HL 优雅降级。
    assert varnada_lagna(const.ARIES, None)['sign'] is None


def test_varnada_in_compute():
    # 白羊L/金牛HL → 异向 N=10 → 摩羯。
    res = compute_supplementary_lagnas(const.ARIES, const.CANCER, const.LEO, hora_lagna_sign=const.TAURUS)
    assert res['varnadaLagna']['sign'] == const.CAPRICORN


def test_varnada_dual_direction_step4():
    # Varṇada Step-4 方向两派(_agentA_chartcasting.md:664-672):默认 Lagna 奇偶(Rath/Raman) vs altSign 积数 N 奇偶(Santhanam/Sharma)。
    # 奇 Lagna 盘两法可异;偶 Lagna 多同。主值=默认(零回归)。
    from flatlib import const
    from astrostudy.india.supplementary_lagna import varnada_lagna
    S = const.LIST_SIGNS
    e_even = varnada_lagna(S[5], S[1])           # 室女(偶)→ 两法同
    assert e_even['altDiffers'] is False
    assert e_even['altSign'] == e_even['sign']
    e_odd = varnada_lagna(S[0], S[1])            # 白羊(奇)→ 两法异
    assert e_odd['altDiffers'] is True
    assert e_odd['altSign'] != e_odd['sign']
    assert e_odd['altSignLabel'] is not None
    assert varnada_lagna(S[0], None)['sign'] is None    # 缺 HL → None(不臆造)
