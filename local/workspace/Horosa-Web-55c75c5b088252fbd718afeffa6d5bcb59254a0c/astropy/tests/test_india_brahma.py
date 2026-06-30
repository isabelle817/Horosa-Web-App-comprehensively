# Brahma graha + Sthira 起座选项 golden(§10.5 Jaimini 2-1-49 主流读法)。
# 默认 Lagna 起座字节零回归;brahma 起座为可选变体。
from flatlib import const
from astrostudy.india.rasi_dasha import compute_brahma, sthira_dasha, build_rasi_dashas

S = const.LIST_SIGNS


def _ps():
    # 固定盘:太阳白羊/月巨蟹/火天蝎/水室女/木射手/金金牛/土摩羯/罗水瓶/计狮子
    return {const.SUN: S[0], const.MOON: S[3], const.MARS: S[7], const.MERCURY: S[5],
            const.JUPITER: S[8], const.VENUS: S[1], const.SATURN: S[9],
            const.NORTH_NODE: S[10], const.SOUTH_NODE: S[4]}


def test_brahma_excludes_saturn_nodes_and_picks_pool():
    # 白羊 lagna:6/8/12 宫(自 Lagna/7 强者)主中排除土罗计,取最强偏奇象。
    br = compute_brahma(S[0], _ps())
    assert br is not None
    assert br['planet'] not in (const.SATURN, const.NORTH_NODE, const.SOUTH_NODE)
    assert br['fromHouse'] in (6, 8, 12)
    # 该固定盘 golden:白羊 6/8/12 = 室女/天蝎/双鱼(主 水/火/木);水星居室女最强 → Brahma = 水星·室女座
    assert br['planet'] == const.MERCURY
    assert br['sign'] == const.VIRGO


def test_sthira_brahma_start_differs_from_lagna():
    ps = _ps()
    br = compute_brahma(S[0], ps)
    d_lagna = sthira_dasha(S[0])
    d_brahma = sthira_dasha(S[0], brahma=br)
    assert d_lagna['startMode'] == 'lagna' and d_lagna['order'][0] == S[0]
    assert d_brahma['startMode'] == 'brahma' and d_brahma['order'][0] == br['sign']
    assert d_lagna['order'] != d_brahma['order']
    assert d_lagna['totalYears'] == d_brahma['totalYears'] == 96   # 96 年总长不变


def test_build_rasi_dashas_sthira_start_option():
    ps = _ps()
    out_def = build_rasi_dashas({'lagna_sign': S[0], 'planet_signs': ps})
    out_br = build_rasi_dashas({'lagna_sign': S[0], 'planet_signs': ps, 'sthira_start': 'brahma'})
    assert out_def['sthira']['startMode'] == 'lagna'      # 默认零回归
    assert out_br['sthira']['startMode'] == 'brahma'
    assert 'brahma' in out_br['sthira']


def test_brahma_none_when_no_planets():
    # 不臆造:缺 planet_signs → None,Sthira 退默认 Lagna。
    assert compute_brahma(S[0], {}) is None
    assert sthira_dasha(S[0], brahma=None)['startMode'] == 'lagna'
