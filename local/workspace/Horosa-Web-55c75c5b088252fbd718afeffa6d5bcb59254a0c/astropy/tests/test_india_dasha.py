# -*- coding: utf-8 -*-
"""
印度 Yogini(36年) / Ashtottari(108年) 大运 + 三级大运(pratyantardasha) 锁定测试。
- 权威参数:Yogini 8 女神 1..8 年=36;Ashtottari 8 曜 日6 月15 火8 水17 土10 木19 罗12 金21=108。
- Ashtottari 宿→曜用 Ardradi 派(从 Ardra 起,27 宿口径,各派略异——本测试钉住当前实现表)。
- _build_periods 与 vimshottari 同口径:首运含月宿余比;子周期按 total_years 比例细分;active 主运含三级。
"""
import os
import sys
from collections import Counter
from datetime import datetime

_ASTRO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ASTRO not in sys.path:
    sys.path.insert(0, _ASTRO)
_FLATLIB = os.path.abspath(os.path.join(_ASTRO, '..', 'flatlib-ctrad2'))
if _FLATLIB not in sys.path:
    sys.path.insert(0, _FLATLIB)

from astrostudy.india.jyotish_engine import (  # noqa: E402
    YOGINI_SEQUENCE, YOGINI_TOTAL, ASHTOTTARI_SEQUENCE, ASHTOTTARI_TOTAL,
    ASHTOTTARI_NAK_LORD, NAISARGIKA_ORDER, JyotishEngine,
)
from astrostudy.india.india_chart_kernel import IndiaChartKernel  # noqa: E402
from flatlib import const  # noqa: E402


def test_yogini_constants():
    assert len(YOGINI_SEQUENCE) == 8
    assert sum(x['years'] for x in YOGINI_SEQUENCE) == YOGINI_TOTAL == 36
    assert [x['yogini'] for x in YOGINI_SEQUENCE] == \
        ['Mangala', 'Pingala', 'Dhanya', 'Bhramari', 'Bhadrika', 'Ulka', 'Siddha', 'Sankata']
    assert [x['years'] for x in YOGINI_SEQUENCE] == [1, 2, 3, 4, 5, 6, 7, 8]


def test_ashtottari_constants():
    assert len(ASHTOTTARI_SEQUENCE) == 8
    assert sum(x['years'] for x in ASHTOTTARI_SEQUENCE) == ASHTOTTARI_TOTAL == 108
    assert [x['key'] for x in ASHTOTTARI_SEQUENCE] == \
        ['Sun', 'Moon', 'Mars', 'Mercury', 'Saturn', 'Jupiter', 'Rahu', 'Venus']
    assert [x['years'] for x in ASHTOTTARI_SEQUENCE] == [6, 15, 8, 17, 10, 19, 12, 21]


def test_ashtottari_ardradi_nak_lord():
    """权威表:权威宿→曜对照表。
    分组 4-3-4-3-3-3-4-3(=27);Rahu/Sun/Mars/Rahu 是 4 宿组,其余 3 宿组。"""
    assert len(ASHTOTTARI_NAK_LORD) == 27
    # 关键边界 + 用户偏好流派(Ardradi 从 Ardra 起)抽样
    assert ASHTOTTARI_NAK_LORD[0] == 'Rahu'    # 1 Ashwini   (Rahu 组跨年初)
    assert ASHTOTTARI_NAK_LORD[1] == 'Rahu'    # 2 Bharani
    assert ASHTOTTARI_NAK_LORD[2] == 'Venus'   # 3 Krittika
    assert ASHTOTTARI_NAK_LORD[5] == 'Sun'     # 6 Ardra     (Ardradi 起点,Sun 组)
    assert ASHTOTTARI_NAK_LORD[8] == 'Sun'     # 9 Ashlesha  (Sun 组末,书表第1组4宿)
    assert ASHTOTTARI_NAK_LORD[9] == 'Moon'    # 10 Magha
    assert ASHTOTTARI_NAK_LORD[12] == 'Mars'   # 13 Hasta
    assert ASHTOTTARI_NAK_LORD[15] == 'Mars'   # 16 Vishakha (Mars 组末)
    assert ASHTOTTARI_NAK_LORD[16] == 'Mercury'  # 17 Anuradha
    assert ASHTOTTARI_NAK_LORD[19] == 'Saturn'   # 20 P.Ashadha
    assert ASHTOTTARI_NAK_LORD[22] == 'Jupiter'  # 23 Dhanishta
    assert ASHTOTTARI_NAK_LORD[25] == 'Rahu'   # 26 U.Bhadra
    assert ASHTOTTARI_NAK_LORD[26] == 'Rahu'   # 27 Revati
    c = Counter(ASHTOTTARI_NAK_LORD)
    assert c['Sun'] == 4 and c['Moon'] == 3 and c['Mars'] == 4
    assert c['Mercury'] == 3 and c['Saturn'] == 3 and c['Jupiter'] == 3
    assert c['Rahu'] == 4 and c['Venus'] == 3


def test_ashtottari_example_59_rao_book():
    """权威算例:Moon at 24° Leo(=144°)落 P.Phalguni(idx 11)→ Moon dasa 15 年。"""
    # 24° Leo = 120° + 24° = 144°;每宿 13°20'(=13.333°),144/13.333 ≈ 10.8 → 宿 idx=10(0-based)→ 第 11 宿 P.Phalguni
    nak_idx_0based = int(144.0 / (360.0 / 27.0))   # = 10 → 11th nakshatra(P.Phalguni)
    assert nak_idx_0based == 10
    assert ASHTOTTARI_NAK_LORD[nak_idx_0based] == 'Moon'


def test_yogini_start_formula():
    # 起始女神 = (月宿序 + 3) mod 8(0→8 Sankata) → YOGINI_SEQUENCE[r-1]
    def start_yogini(n):
        r = (n + 3) % 8
        r = 8 if r == 0 else r
        return YOGINI_SEQUENCE[r - 1]['yogini']
    assert start_yogini(6) == 'Mangala'    # Ardra (6+3=9→1)
    assert start_yogini(1) == 'Bhramari'   # Ashwini (1+3=4)
    assert start_yogini(5) == 'Sankata'    # Mrigashira (5+3=8)


def _eng():
    return JyotishEngine.__new__(JyotishEngine)


def test_build_periods_yogini_structure():
    eng = _eng()
    birth = datetime(1990, 1, 1, 12, 0, 0)
    res = eng._build_periods(YOGINI_SEQUENCE, YOGINI_TOTAL, 'Moon', 0.5, birth)
    mh = res['mahadashas']
    assert len(mh) >= 8                       # 36 年周期需多轮覆盖 120 年
    assert mh[0]['lord']['key'] == 'Moon' and mh[0]['birthBalance'] is True
    assert [m['years'] for m in mh[:4]] == [1, 2, 3, 4]   # Mangala..Bhramari
    # 每个主运的子周期(antardasha)年合 ≈ 该主运年数(比例细分守恒)
    for m in mh[:8]:
        sub_years = sum(s['years'] for s in m['antardashas'])
        assert abs(sub_years - m['years']) < 0.02
        assert len(m['antardashas']) == 8    # 8 女神各一
    # 三级 pratyantardasha 对所有主运全算(每个大运卡片都可下钻到三级，不再仅 active)
    for m in mh:
        assert all('pratyantardashas' in s for s in m['antardashas'])
        assert all(len(s['pratyantardashas']) == 8 for s in m['antardashas'])


def test_build_periods_ashtottari_structure():
    eng = _eng()
    birth = datetime(1985, 6, 15, 6, 0, 0)
    res = eng._build_periods(ASHTOTTARI_SEQUENCE, ASHTOTTARI_TOTAL, 'Sun', 0.3, birth)
    mh = res['mahadashas']
    assert mh[0]['lord']['key'] == 'Sun'
    assert [m['lord']['key'] for m in mh[:3]] == ['Sun', 'Moon', 'Mars']  # 推进序
    assert [m['years'] for m in mh[:3]] == [6, 15, 8]
    for m in mh[:8]:
        sub_years = sum(s['years'] for s in m['antardashas'])
        assert abs(sub_years - m['years']) < 0.02
        assert len(m['antardashas']) == 8


def test_selected_dasha_full_others_maha_only():
    """大运 lazy 展开契约(性能优化:UI 一次只显示 1 个体系):
    仅**选中**的树形大运体系算完整三级(maha→antar→pratyantar,可下钻);
    其余三树(vimshottari/yogini/ashtottari/tribhagi)只出 maha 顶层(剪 antar/pratyantar,省体积)。
    maha 时间轴 + 顶层元数据两者保留(前端恒读)。覆盖 dasha_sub_periods(vim/tribhagi)+ _build_periods(yogini/ashtottari)路径。
    缺省 dasha_system → 'vimshottari'(默认全展开,零回归)。"""
    from astrostudy.india.india_chart_kernel import IndiaChartKernel
    data = {'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'}
    TREES = ('vimshottari', 'yogini', 'ashtottari', 'tribhagi')

    # ① 缺省(=vimshottari)：vimshottari 满三级、其余三树仅 maha。
    eng = JyotishEngine(IndiaChartKernel(data))
    for sysname in TREES:
        d = getattr(eng, sysname)()
        mahas = d['mahadashas']
        assert mahas, f'{sysname} 无主运'
        # 顶层元数据 + maha 时间轴恒在(不论选中与否)。
        assert d.get('available') and d.get('system') and d.get('mahadashas')
        for m in mahas:
            assert all(k in m for k in ('lord', 'years', 'start', 'end', 'startIso', 'endIso', 'startAge', 'active')), \
                f'{sysname} maha 节点缺顶层字段'
        if sysname == 'vimshottari':
            for m in mahas:
                ant = m['antardashas']
                assert ant and all(a.get('pratyantardashas') for a in ant), \
                    f'选中 {sysname} 主运 {m["lord"]["key"]} 有 antardasha 缺三级 pratyantardasha'
        else:
            assert all('antardashas' not in m for m in mahas), \
                f'未选中 {sysname} 不应含 antardashas(应仅 maha 顶层)'

    # ② 显式选中每个树形体系：该体系满三级、其余三树仅 maha。
    for selected in TREES:
        eng = JyotishEngine(IndiaChartKernel(data), dasha_system=selected)
        for sysname in TREES:
            mahas = getattr(eng, sysname)()['mahadashas']
            if sysname == selected:
                assert all(m.get('antardashas') and all(a.get('pratyantardashas') for a in m['antardashas'])
                           for m in mahas), f'选中 {selected} 应满三级'
            else:
                assert all('antardashas' not in m for m in mahas), \
                    f'选 {selected} 时 {sysname} 应仅 maha 顶层'


def test_naisargika_fixed_natural_periods_and_age_brackets():
    # P1 Naisargika:7 曜固定自然年(总 120,无节点)+ Varahamihira 成熟序/年龄段(经多源核验)。
    assert sum(y for _, _, y in NAISARGIKA_ORDER) == 120
    assert [c for _, c, _ in NAISARGIKA_ORDER] == ['月', '火', '水', '金', '木', '日', '土']
    assert [y for _, _, y in NAISARGIKA_ORDER] == [1, 2, 9, 20, 18, 20, 50]
    data = {'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'}
    nd = JyotishEngine(IndiaChartKernel(data)).naisargika_dasha()
    assert nd['available'] and nd['mode'] == 'varahamihira' and nd['totalYears'] == 120
    ages = [(p['startAge'], p['endAge']) for p in nd['periods']]
    assert ages == [(0, 1), (1, 3), (3, 12), (12, 32), (32, 50), (50, 70), (70, 120)]
    # 日历起讫由本命起算(首运起=本命年)。
    assert nd['periods'][0]['start'].startswith('1990-03-15')
    assert len(nd['periods']) == 7


def test_tribhagi_vimshottari_div3_three_rounds():
    # P1 Tribhāgī:每曜周期 = Vimśottarī ÷3;9 曜序绕 3 遍(总 120,每遍 40);首余 = 正常 ÷3。
    # 选中 tribhagi(dasha_system)→ 该体系满三级,使下方 antardasha/pratyantar 断言成立。
    data = {'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'}
    eng = JyotishEngine(IndiaChartKernel(data), dasha_system='tribhagi')
    tb = eng.tribhagi()
    vm = eng.vimshottari()
    assert tb['available'] and tb['system'] == 'Tribhagi' and tb['totalYears'] == 120
    mh = tb['mahadashas']
    # 首运主 = Vimśottarī 首运主;首余 = Vimśottarī 首余 ÷3。
    assert mh[0]['lord']['key'] == vm['mahadashas'][0]['lord']['key']
    assert abs(tb['firstBalanceYears'] - vm['firstBalanceYears'] / 3.0) < 1e-6
    # 每曜年 = Vimśottarī 年 ÷3。
    for m in mh[:9]:
        assert abs(m['years'] - m['lord']['years'] / 3.0) < 1e-9
    # 9 曜序绕遍自洽(第 i 与第 i+9 同主)。
    for i in range(9):
        assert mh[i]['lord']['key'] == mh[i + 9]['lord']['key']
    # bhaga 三分:段0..8=Alpa、9..17=Madhya、18..=Pūrṇa。
    assert mh[0]['bhaga'].startswith('Alpa') and mh[9]['bhaga'].startswith('Madhya') and mh[18]['bhaga'].startswith('Pūrṇa')
    # antardasha 比例守恒 + 三级。
    for m in mh[:9]:
        assert abs(sum(a['years'] for a in m['antardashas']) - m['years']) < 0.02
        assert all('pratyantardashas' in a for a in m['antardashas'])


def test_bhrigu_bindu_shorter_arc_midpoint():
    # P2 Nāḍī Bhrigu Bindu = Rahu/Moon 较短弧中点;落短弧内、座/宿齐全。
    data = {'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'}
    nd = JyotishEngine(IndiaChartKernel(data)).nadi()
    assert nd['available']
    bb = nd['bhriguBindu']
    m, r, mid = bb['moonLon'], bb['rahuLon'], bb['lon']
    exp = ((m + r) / 2.0) % 360.0
    if abs(r - m) > 180.0:
        exp = (exp + 180.0) % 360.0
    assert abs(mid - exp) < 1e-9
    assert bb['sign'] in const.LIST_SIGNS and bb['nakshatra']['name']
    # 中点到 Moon、Rahu 的(无向)角距相等 = 短弧半长。
    d = (r - m) % 360.0
    short = d if d <= 180.0 else 360.0 - d
    dist_moon = min((mid - m) % 360.0, (m - mid) % 360.0)
    dist_rahu = min((mid - r) % 360.0, (r - mid) % 360.0)
    assert abs(dist_moon - short / 2.0) < 1e-6
    assert abs(dist_rahu - short / 2.0) < 1e-6


def test_ayurdaya_pindayu_base_and_nisargayu():
    # P2 Āyurdāya:Piṇḍāyu 满寿表(127)+ 度式贡献∈[半,满]、庙旺满/落陷半;Nisargāyu 自然表(120)。
    assert JyotishEngine.PINDAYU_FULL == {const.SUN: 19, const.MOON: 25, const.MARS: 15,
                                          const.MERCURY: 12, const.JUPITER: 15, const.VENUS: 21, const.SATURN: 20}
    assert sum(JyotishEngine.PINDAYU_FULL.values()) == 127
    assert JyotishEngine.NISARGAYU_YEARS[const.SUN] == 20 and sum(JyotishEngine.NISARGAYU_YEARS.values()) == 120
    data = {'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'}
    ay = JyotishEngine(IndiaChartKernel(data)).ayurdaya()
    assert ay['available'] and ay['nisargayu']['totalYears'] == 120
    contribs = ay['pindayu']['contributions']
    assert len(contribs) == 7
    for c in contribs:
        assert c['fullYears'] * 0.5 - 1e-6 <= c['years'] <= c['fullYears'] + 1e-6
        exp = 0.5 + 0.5 * (180.0 - abs(c['arcFromDebil'] - 180.0)) / 180.0
        assert abs(c['fraction'] - exp) < 2e-4   # fraction 存 4 位小数
    assert abs(ay['pindayu']['baseYears'] - sum(c['years'] for c in contribs)) < 0.011
    # 基础 Piṇḍāyu 落在 [半和, 满和] 之间。
    assert 127 * 0.5 - 0.01 <= ay['pindayu']['baseYears'] <= 127 + 0.01


def test_mula_dasha_quota_and_ordering():
    # P1 Mūla(=Lagna Kendrādi Graha):18 段(9 曜×2 轮)、总 120、各曜两轮和=Vimśottarī(配额恢复)、
    # kendra 先;期长=Vims−((N−1)+E)。
    from astrostudy.india.jyotish_engine import MULA_VIMS_YEARS, MULA_MT_SIGN
    data = {'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'}
    md = JyotishEngine(IndiaChartKernel(data)).mula_dasha()
    assert md['available'] and md['system'] == 'Mula' and md['totalYears'] == 120
    assert len(md['mahadashas']) == 18
    assert abs(sum(m['years'] for m in md['mahadashas']) - 120) < 0.5
    per = {}
    for m in md['mahadashas']:
        per[m['planet']] = per.get(m['planet'], 0.0) + m['years']
    for p, v in MULA_VIMS_YEARS.items():
        if p in per:
            assert abs(per[p] - v) < 0.01      # 两轮恢复满 Vimśottarī 配额
    # 首轮先出 kendra(1/4/7/10)。
    r1 = [m for m in md['mahadashas'] if m['round'] == 1]
    KEN = {1, 4, 7, 10}
    first_non_kendra = next((i for i, m in enumerate(r1) if m['house'] not in KEN), len(r1))
    assert all(m['house'] in KEN for m in r1[:first_non_kendra])
    # MT 表/Vims 表完备(9 曜含罗计)。
    assert set(MULA_MT_SIGN) == set(MULA_VIMS_YEARS) and len(MULA_VIMS_YEARS) == 9
    assert MULA_VIMS_YEARS[const.SATURN] == 19 and MULA_MT_SIGN[const.SATURN] == const.AQUARIUS


def test_sudarshana_chakra_three_wheels():
    # P1 Sudarśana Chakra:12 年循环、三轮(日SL/月CL/升JL)自各参照每年顺 1 宫;年1=各参照座本身。
    data = {'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'}
    e = JyotishEngine(IndiaChartKernel(data))
    sc = e.sudarshana_chakra_dasha()
    assert sc['available'] and sc['cycleYears'] == 12 and len(sc['rows']) == 12
    LS = list(const.LIST_SIGNS)
    si, mi, li = LS.index(e.sun.sign), LS.index(e.moon.sign), LS.index(e.asc.sign)
    # 年1 = 各参照座本身;年 n 各轮 = 参照座 +(n-1)。
    for n in range(1, 13):
        r = sc['rows'][n - 1]
        assert r['sl'] == LS[(si + n - 1) % 12]
        assert r['cl'] == LS[(mi + n - 1) % 12]
        assert r['jl'] == LS[(li + n - 1) % 12]
    # 恰一行标 current(年龄入循环年)。
    assert sum(1 for r in sc['rows'] if r['current']) <= 1


def test_ayurdaya_amsayu_div200_and_bharana():
    # P2 Aṁśāyu(÷200 式):每曜 base∈[0,12];Bharaṇa 倍 ∈{1,2,3};years=base×倍;三法齐全。
    data = {'date': '1990/3/15', 'time': '07:30:00', 'zone': '+05:30',
            'lat': '28n36', 'lon': '77e12', 'indiaHsys': 0, 'indiaAyanamsa': 'lahiri'}
    ay = JyotishEngine(IndiaChartKernel(data)).ayurdaya()
    assert all(k in ay for k in ('pindayu', 'nisargayu', 'amsayu'))
    am = ay['amsayu']
    assert len(am['contributions']) == 7
    tot = 0.0
    for c in am['contributions']:
        assert 0.0 <= c['baseYears'] <= 12.0001         # 每贡献者上限 12
        assert c['multiplier'] in (1, 2, 3)
        assert abs(c['years'] - c['baseYears'] * c['multiplier']) < 0.01
        tot += c['years']
    assert abs(am['baseYears'] - round(tot, 2)) < 0.02
