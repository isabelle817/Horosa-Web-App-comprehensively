"""
Nakshatra（27 宿）共享计算。

被印占引擎(india/jyotish_engine) 与西洋恒星黄道盘(perchart) 共用 —— 避免重复 + 循环 import。
纯函数,只依赖恒星黄道经度,零外部依赖。
"""

# 27 宿：(梵文名, 中文宿, 宿主行星)。顺序 = 黄经 0° 起每 13°20'。
NAKSHATRAS = [
    ('Ashwini', '马', 'Ketu'), ('Bharani', '胃', 'Venus'), ('Krittika', '昴', 'Sun'),
    ('Rohini', '毕', 'Moon'), ('Mrigashira', '参', 'Mars'), ('Ardra', '井', 'Rahu'),
    ('Punarvasu', '鬼', 'Jupiter'), ('Pushya', '柳', 'Saturn'), ('Ashlesha', '星', 'Mercury'),
    ('Magha', '张', 'Ketu'), ('Purva Phalguni', '翼', 'Venus'), ('Uttara Phalguni', '轸', 'Sun'),
    ('Hasta', '角', 'Moon'), ('Chitra', '亢', 'Mars'), ('Swati', '氐', 'Rahu'),
    ('Vishakha', '房', 'Jupiter'), ('Anuradha', '心', 'Saturn'), ('Jyeshtha', '尾', 'Mercury'),
    ('Mula', '箕', 'Ketu'), ('Purva Ashadha', '斗', 'Venus'), ('Uttara Ashadha', '牛', 'Sun'),
    ('Shravana', '女', 'Moon'), ('Dhanishta', '虚', 'Mars'), ('Shatabhisha', '危', 'Rahu'),
    ('Purva Bhadrapada', '室', 'Jupiter'), ('Uttara Bhadrapada', '壁', 'Saturn'), ('Revati', '奎', 'Mercury'),
]


def _norm(lon):
    return float(lon) % 360.0


def nakshatra_from_lon(lon):
    """由恒星黄道经度返回 nakshatra(含 index 1-27 / name / 中文宿 label / 宿主 lord / pada 1-4 / 进度)。"""
    span = 360.0 / 27.0
    value = _norm(lon)
    idx = min(26, int(value / span))
    progress = (value - idx * span) / span
    pada = min(4, int(progress * 4) + 1)
    name, label, lord = NAKSHATRAS[idx]
    # 28 宿口径(Abhijit)附加信息——27 宿主字段不变(Vimshottari/月宿/navamsa 仍按 27 宿)。
    from astrostudy.india.primitives import is_abhijit, nakshatra_number_28, ABHIJIT_NAME, ABHIJIT_LABEL
    abhijit = is_abhijit(value)
    return {
        'index': idx + 1,
        'name': name,
        'label': label,
        'lord': lord,
        'pada': pada,
        'progress': progress,
        'remainingRatio': 1 - progress,
        'isAbhijit': abhijit,
        'nak28Index': nakshatra_number_28(value, idx + 1),
        'nak28Name': ABHIJIT_NAME if abhijit else name,
        'nak28Label': ABHIJIT_LABEL if abhijit else label,
    }
