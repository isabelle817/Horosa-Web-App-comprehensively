# 七政四余 · 授时历古法立成:传统推变黄道术(赤道宿度 → 黄道宿度) + 大统法原十二宫界次(不等宫)。
# 权威数据取自《古今星制之别考》ch.2/9(元明赤道宿度 p9 / 大统法原宫界次 p10 / 会圆 worked-example p9)。
# 纯函数、无副作用(仿 guolao_const.py)。输出为「极黄经」宿界(古历黄经):直用立成值,勿转现代黄经
#   (离黄道远的宿如觜/参,极黄经与现代黄经可差 7–8°,系古法本然)。中性命名,无软件名/书名。
import math

SU28_NAMES = ['角', '亢', '氐', '房', '心', '尾', '箕', '斗', '牛', '女', '虚', '危',
              '室', '壁', '奎', '娄', '胃', '昴', '毕', '觜', '参', '井', '鬼', '柳',
              '星', '张', '翼', '轸']

# 元明赤道宿度(ch.2 p9,顺序角…轸;和≈365.25)。
YUANMING_EQUATORIAL_SU = [12.1, 9.2, 16.3, 5.6, 6.5, 19.1, 10.4, 25.2, 7.2, 11.35,
                          8.9575, 15.4, 17.1, 8.6, 16.6, 11.8, 15.6, 11.3, 17.4, 0.05,
                          11.1, 33.3, 2.2, 13.3, 6.3, 17.25, 18.75, 17.3]

ZHOUTIAN_ANCIENT = 365.2575     # 古周天(大统法原)
ZHOUTIAN_MODERN = 360.0
OBLIQUITY_YUAN = 23.9           # 元历黄赤交角(古测)

# 元时春分点赤道度(ch.2 p9「元时春分点在壁 6 度」)= 壁宿起始累积赤道 + 6。
# 壁起 = 角…室累积。下方 _cumulative_equatorial() 复核。
_CHUNFEN_AT_BI_DEGREE = 6.0


def _cumulative_equatorial():
    """各宿起始的累积赤道度(角起 0),返回 [起0, 起1, … 起27, 周天]。"""
    acc = [0.0]
    for w in YUANMING_EQUATORIAL_SU:
        acc.append(acc[-1] + w)
    return acc


def chunfen_equatorial():
    """元时春分点的累积赤道度。"""
    cum = _cumulative_equatorial()
    bi_start = cum[SU28_NAMES.index('壁')]
    return bi_start + _CHUNFEN_AT_BI_DEGREE


def _yaoshunfu_diff(c):
    """姚舜辅纪元历闭式 黄赤道差(度),c∈[0,45.65545];黄道差=(c/1000)(101−c)。"""
    return (c / 1000.0) * (101.0 - c)


# 进退法(大衍历)表 8-3:a∈{0,5,…,45} → 黄赤道差累积 (l−a)(单位:度,1/24 制)。线性插值。
_JINTUI_A = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45]
_JINTUI_DIFF = [0.0, 12 / 24.0, 23 / 24.0, 1 + 9 / 24.0, 1 + 18 / 24.0,
                2 + 2 / 24.0, 2 + 9 / 24.0, 2 + 15 / 24.0, 2 + 20 / 24.0, 3.0]


def _jintui_diff(c):
    """进退法 黄赤道差,c∈[0,45]。表 8-3 线性插值。"""
    if c <= 0:
        return 0.0
    if c >= 45:
        return _JINTUI_DIFF[-1]
    for i in range(len(_JINTUI_A) - 1):
        a0, a1 = _JINTUI_A[i], _JINTUI_A[i + 1]
        if a0 <= c <= a1:
            t = (c - a0) / (a1 - a0)
            return _JINTUI_DIFF[i] + t * (_JINTUI_DIFF[i + 1] - _JINTUI_DIFF[i])
    return _JINTUI_DIFF[-1]


def _huiyuan_diff(c, obliquity_deg):
    """会圆术(授时历)球面近似 黄赤道差,c∈[0,45.65];以 atan(tanα/cosε) 归化。
    PDF 会圆表给奎=17.87(本近似≈17.9);表全本 OCR 残缺,采球面式近似,golden 容差 ±0.1°。"""
    cr = math.radians(c)
    lam = math.degrees(math.atan2(math.tan(cr), math.cos(math.radians(obliquity_deg))))
    return lam - c


_QUARTER = ZHOUTIAN_ANCIENT / 4.0       # 91.314…(春分→夏至)
_EIGHTH = _QUARTER / 2.0                # 45.657…


def _diff_at(c_from_chunfen, method, obliquity_deg):
    """自春分起赤道积度 c 处的「有向」黄赤道差(度)。两分→两至加(黄道>赤道)、两至→两分减。
    每象限内对 45.65 反射到 [0,45.65] 域取差幅。"""
    c = c_from_chunfen % ZHOUTIAN_ANCIENT
    quarter_idx = int(c // _QUARTER)            # 0..3
    phase = c - quarter_idx * _QUARTER          # [0, 91.31)
    pr = phase if phase <= _EIGHTH else (_QUARTER - phase)   # 反射到 [0,45.65]
    if method == 'jintui':
        mag = _jintui_diff(pr)
    elif method == 'huiyuan':
        mag = _huiyuan_diff(pr, obliquity_deg)
    else:  # jiyuan(姚舜辅闭式,默认)
        mag = _yaoshunfu_diff(pr)
    sign = 1.0 if quarter_idx % 2 == 0 else -1.0    # 分→至 加;至→分 减
    return sign * mag


def _huangdao_jidu(equatorial_abs, method, obliquity_deg):
    """绝对赤道积度(角起 0) → 黄道积度(自春分)= c + 黄赤道差(c)。"""
    cf = chunfen_equatorial()
    c = (equatorial_abs - cf) % ZHOUTIAN_ANCIENT
    return c + _diff_at(c, method, obliquity_deg)


def mansion_huangdao_table(method='jiyuan', obliquity_deg=OBLIQUITY_YUAN):
    """28 宿黄道距度立成(mode6 量天尺):元明赤道宿度 → 逐宿黄道距度(极黄经)。
    method∈{jiyuan(闭式·默认)、jintui(进退)、huiyuan(会圆球面近似)};返回 28 长 list,顺序角…轸。"""
    cum = _cumulative_equatorial()       # 各宿起始累积赤道(角起 0)
    res = []
    for i in range(28):
        jd_start = _huangdao_jidu(cum[i], method, obliquity_deg)
        jd_end = _huangdao_jidu(cum[i + 1], method, obliquity_deg)
        span = (jd_end - jd_start) % ZHOUTIAN_ANCIENT
        res.append(round(span, 4))
    return res


def chidao_to_huangdao(ra_deg, method='jiyuan', obliquity_deg=OBLIQUITY_YUAN):
    """单点:绝对赤道度(角起 0)→ 黄道积度(自春分,极黄经)。供行星按赤道度求古黄经。"""
    return _huangdao_jidu(ra_deg % ZHOUTIAN_ANCIENT, method, obliquity_deg)


# ── 大统法原 十二宫界次(ch.2 p10,周天 365.2575)。各宫起始 = 宿+度。──
# (宫支, 十二次, 起宿, 起度)。宫序按 PDF 罗列(子玄枵…丑星纪)。
SHOUSHI_PALACE_RAW = [
    ('子', '玄枵', '女', 2.1309), ('亥', '娵訾', '危', 12.2615), ('戌', '降娄', '奎', 1.5996),
    ('酉', '大梁', '胃', 3.6378), ('申', '实沈', '毕', 7.1759), ('未', '鹑首', '井', 9.064),
    ('午', '鹑火', '柳', 4.0021), ('巳', '鹑尾', '张', 14.8403), ('辰', '寿星', '轸', 9.2784),
    ('卯', '大火', '氐', 1.1165), ('寅', '析木', '尾', 3.1546), ('丑', '星纪', '斗', 4.0928),
]


def shoushi_palace_boundaries(zhoutian=ZHOUTIAN_MODERN):
    """十二宫界次起始绝对度(默认换算到 360 圈;传 ZHOUTIAN_ANCIENT 则留古周天)。
    返回 12 个 (宫支, 十二次, 绝对起始度),按绝对度升序。"""
    cum = _cumulative_equatorial()
    scale = zhoutian / ZHOUTIAN_ANCIENT
    out = []
    for zhi, ci, su, deg in SHOUSHI_PALACE_RAW:
        ra_abs = cum[SU28_NAMES.index(su)] + deg
        out.append((zhi, ci, (ra_abs * scale) % zhoutian))
    out.sort(key=lambda x: x[2])
    return out


def palace_index_of_longitude(lon, boundaries=None):
    """经度 → 十二宫序(0..11)。boundaries is None → 今制等分整宫 int(lon/30)%12(零回归路径);
    否则按不等宫界次二分(boundaries = shoushi_palace_boundaries() 的绝对起始度升序 list)。"""
    if boundaries is None:
        return int((lon % 360.0) / 30.0) % 12
    starts = [b[2] if isinstance(b, (list, tuple)) else b for b in boundaries]
    n = len(starts)
    L = lon % 360.0
    idx = n - 1
    for i in range(n):
        nxt = starts[(i + 1) % n]
        lo = starts[i]
        hi = nxt if nxt > lo else nxt + 360.0
        x = L if L >= lo else L + 360.0
        if lo <= x < hi:
            idx = i
            break
    return idx
