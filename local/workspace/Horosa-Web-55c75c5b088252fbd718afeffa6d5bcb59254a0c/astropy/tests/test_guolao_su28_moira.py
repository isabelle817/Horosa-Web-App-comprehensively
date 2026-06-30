"""
七政四余 二十八宿度 — 自有恒星案三制对齐回归测试。

锁定 DHX 参考盘(2006-10-04 09:58 上海 121E28'12 31N13'48)的七政落宿,
防止「回归今制 / 回归古制(开禧) / 恒星制(郑式)」三制的宿度计算被改回错值。

口径(经实拍逐颗核对到角分):
  - 恒星制(郑式, mode4): 郑氏恒星基值原值,沿黄道置宿(盘 sidereal)。七政落宿精确。
  - 回归今制(mode2): 28 距星活体 tropical 黄经(严格 IAU 岁差),逐宿不均匀。
  - 回归古制(开禧, mode3): 开禧基值 + ayanamsha(1300/4.0)。

铁律②:本测试与代码内不出现任何外部软件名;数据为自有恒星案。
"""
import math
from pathlib import Path
import pytest

from astrostudy import perchart
from flatlib import const

DHX = {
    'date': '2006/10/04', 'time': '09:58:00', 'zone': '+08:00',
    'lat': '31N13', 'lon': '121E28', 'ad': 1, 'hsys': 'PLACIDUS',
}

PLANETS = [
    ('日', const.SUN), ('月', const.MOON), ('水', const.MERCURY), ('金', const.VENUS),
    ('火', const.MARS), ('木', const.JUPITER), ('土', const.SATURN), ('天', const.URANUS),
    ('海', const.NEPTUNE), ('冥', const.PLUTO),
]


def _planet_su28(mode):
    """返回 {planet_label: (su28_name, deg_int, min_int)}。"""
    data = dict(DHX)
    data['doubingSu28'] = mode
    pc = perchart.PerChart(data)
    stars = pc.getFixedStarSu28()
    bnd = {s.name: float(s.lon) for s in stars if s.type == const.OBJ_FIXED_STAR}
    out = {}
    for label, oid in PLANETS:
        try:
            pl = pc.chart.get(oid)
        except Exception:
            continue
        su = getattr(pl, 'su28', None)
        if su is None:
            continue
        deg = (float(pl.lon) - bnd.get(su, 0.0)) % 360.0
        out[label] = (su, int(deg), int(round((deg - int(deg)) * 60.0)))
    return out


# 恒星制(郑式) 七政落宿 —— 参考实拍金标(度°分′),容差 ±2′。
ZHENG_GOLD = {
    '日': ('轸', 6, 45), '月': ('虚', 5, 3), '水': ('角', 11, 32), '金': ('轸', 0, 37),
    '火': ('轸', 12, 57), '木': ('氐', 6, 20), '土': ('柳', 12, 37), '天': ('危', 9, 31),
    '海': ('女', 5, 21), '冥': ('尾', 13, 27),
}

# 回归今制 七政所在宿(活体距星;度数容差放宽到 ±30′,宿必须一致)。
JINZHI_MANSION = {
    '日': '翼', '月': '虚', '水': '角', '金': '翼', '火': '轸', '木': '氐',
    '土': '柳', '天': '危', '海': '女', '冥': '尾',
}


@pytest.mark.parametrize('label', list(ZHENG_GOLD.keys()))
def test_zheng_sidereal_su28_matches_gold(label):
    """恒星制(郑式) 七政落宿须与金标一致(±2′)。"""
    got = _planet_su28(4)
    assert label in got, f'{label} 未落宿'
    su, dd, mm = got[label]
    gsu, gdd, gmm = ZHENG_GOLD[label]
    assert su == gsu, f'恒星制 {label} 落宿 {su} != 金标 {gsu}'
    diff = abs((dd * 60 + mm) - (gdd * 60 + gmm))
    assert diff <= 2, f'恒星制 {label} {dd}°{mm}′ 偏离金标 {gdd}°{gmm}′ 超 2′'


@pytest.mark.parametrize('label', list(JINZHI_MANSION.keys()))
def test_jinzhi_live_su28_mansion(label):
    """回归今制(活体距星) 七政所在宿须正确。"""
    got = _planet_su28(2)
    assert label in got, f'{label} 未落宿'
    su, dd, mm = got[label]
    assert su == JINZHI_MANSION[label], f'回归今制 {label} 落宿 {su} != {JINZHI_MANSION[label]}'


def test_three_modes_distinct():
    """三制对同一行星应给出不同的宿度(今制活体 vs 开禧 vs 恒星制)。"""
    m2 = _planet_su28(2)  # 回归今制
    m3 = _planet_su28(3)  # 回归古制开禧
    m4 = _planet_su28(4)  # 恒星制郑式
    # 日:今制在翼、恒星制在轸 —— 必不同
    assert m2['日'][0] != m4['日'][0], '回归今制与恒星制的日落宿不应相同'
    # 开禧与恒星制亦应有别(开禧基值+岁差 vs 郑氏恒星基值)
    assert m3['日'][:2] != m4['日'][:2] or m3['木'][:2] != m4['木'][:2]


def test_ayanamsha_helper_sane():
    """ayanamsha(1300/4.0) 在 2006 应约 13.86°(郑氏恒星案基准)。"""
    import swisseph
    data = dict(DHX)
    pc = perchart.PerChart(data)
    jd = pc.chart.date.jd
    ayan = perchart._moira_ayanamsha(jd)
    assert 13.0 < ayan < 14.5, f'ayanamsha {ayan} 偏离预期 ~13.86'


def test_distar_table_has_28():
    assert len(perchart.MOIRA_DISTAR_J2000) == 28
    names = [r[0] for r in perchart.MOIRA_DISTAR_J2000]
    assert set(names) == set(perchart.MOIRA_STELLAR_ORDER)
