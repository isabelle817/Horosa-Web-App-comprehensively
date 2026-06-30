# -*- coding: utf-8 -*-
"""印度占星（吠陀）补救法引擎 —— 宝石 / 真言 / 善行对照与建议。

纯函数模块，无副作用、不依赖排盘上下文。planet_key 约定与
``astrostudy/india/jyotish_engine.py`` 的 ``PLANET_CN`` 一致，即 flatlib
``const`` 行星 id 字符串：

    'Sun' 'Moon' 'Mars' 'Mercury' 'Jupiter' 'Venus' 'Saturn'
    'North Node'(罗睺/Rahu) 'South Node'(计都/Ketu)

数据来源标注（每个字段都带 ``source``）：
  - ``'classical'`` —— 取自权威综合教程的「权威宝石对照表」「行星与守护神对照表」
    （宝石、金属、真言诵念次数、守护神）。
  - ``'community'`` —— 通行占星共识补充（手指配属在权威表中仅给出部分行星，
    诵念用的星期取自标准七曜星期主星）。绝不臆造，仅作可显示的通行参考。

真言（mantra）正文：权威来源只以天城体（Devanagari）梵文图形给出，并明确反对
用罗马字转写以免误读，故本模块**不收录真言正文**，仅保留可文本化的
「推荐诵念次数」与「适宜星期」。
"""

# ── 行星键（与 jyotish_engine.PLANET_CN 对齐）────────────────────────────
SUN = 'Sun'
MOON = 'Moon'
MARS = 'Mars'
MERCURY = 'Mercury'
JUPITER = 'Jupiter'
VENUS = 'Venus'
SATURN = 'Saturn'
RAHU = 'North Node'   # 罗睺
KETU = 'South Node'   # 计都

PLANET_ORDER = [SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU]

PLANET_CN = {
    SUN: '太阳',
    MOON: '月亮',
    MARS: '火星',
    MERCURY: '水星',
    JUPITER: '木星',
    VENUS: '金星',
    SATURN: '土星',
    RAHU: '罗睺',
    KETU: '计都',
}

# 通行七曜星期主星（首次佩戴 / 诵念真言取该行星所主之日）。来源:通行共识。
PLANET_WEEKDAY_CN = {
    SUN: '周日',
    MOON: '周一',
    MARS: '周二',
    MERCURY: '周三',
    JUPITER: '周四',
    VENUS: '周五',
    SATURN: '周六',
    RAHU: '周六',   # 罗睺通常并入土星之日
    KETU: '周二',   # 计都通常并入火星之日
}

# 功能吉星 / 功能凶星（自然性质，仅作建议默认；功能吉凶随命宫而变，
# 引擎可在调用时以 functional_benefics 覆写）。来源:通行共识。
NATURAL_BENEFICS = {MOON, MERCURY, JUPITER, VENUS}
NATURAL_MALEFICS = {SUN, MARS, SATURN, RAHU, KETU}

# ── 权威宝石对照表（宝石 / 金属）+ 真言诵念次数 + 守护神 ──────────────────
# 宝石、金属、诵念次数、守护神 = 'classical'（取自权威综合教程之对照表）。
# 手指：权威表仅给出部分行星（木=食指、土=中指、日=无名指、水/金=小指），
#       其余行星手指标 None（书未给，不臆造）。
# 星期：'community'（标准七曜星期主星）。
_GEM_TABLE = {
    SUN: {
        'gem': '红宝石', 'gemEn': 'Ruby',
        'metal': '黄金', 'metalEn': 'Gold',
        'finger': '无名指', 'fingerEn': 'Ring finger',
        'mantraCount': 6000,
        'deity': ['湿婆 (Shiva)', '罗摩 (Rama)'],
        'goodDeed': '前往寺庙、向寺庙捐资或协助寺庙管理',
        'grain': '小麦',
    },
    MOON: {
        'gem': '珍珠', 'gemEn': 'White Pearl',
        'metal': '黄金', 'metalEn': 'Gold',
        'finger': None, 'fingerEn': None,
        'mantraCount': 10000,
        'deity': ['高丽 (Gauri)', '拉利塔 (Lalita)', '辩才天女 (Saraswati)', '黑天 (Krishna)'],
        'goodDeed': '向音乐机构捐资，或帮助有需要的女性',
        'grain': '稻米',
    },
    MARS: {
        'gem': '红珊瑚', 'gemEn': 'Red Coral',
        'metal': '紫铜', 'metalEn': 'Copper',
        'finger': None, 'fingerEn': None,
        'mantraCount': 7000,
        'deity': ['哈奴曼 (Hanuman)', '楼陀罗 (Rudra)', '室建陀 (Kartikeya/Subrahmanya)'],
        'goodDeed': '进行体育锻炼，或向学校体育馆捐资',
        'grain': '木豆 (toor daal)',
    },
    MERCURY: {
        'gem': '祖母绿', 'gemEn': 'Emerald',
        'metal': '白银 / 铂金', 'metalEn': 'Silver / Platinum',
        'finger': '小指', 'fingerEn': 'Little finger',
        'mantraCount': 17000,
        'deity': ['毗湿奴 (Vishnu)', '那罗延 (Narayana)', '佛陀 (Buddha)'],
        'goodDeed': '向学者团体捐资，或获得学者的祝福',
        'grain': '绿豆 (moong daal)',
    },
    JUPITER: {
        'gem': '黄宝石', 'gemEn': 'Yellow Sapphire',
        'metal': '黄金', 'metalEn': 'Gold',
        'finger': '食指', 'fingerEn': 'Index finger',
        'mantraCount': 16000,
        'deity': ['马首 (Hayagreeva)', '毗湿奴 (Vishnu)', '至上自在天 (Parameswara)', '达塔特雷耶 (Dattatreya)', '上师 (Guru)'],
        'goodDeed': '敬重并向有学问的婆罗门或祭司捐资，或向祭司奉献牛只',
        'grain': '鹰嘴豆',
    },
    VENUS: {
        'gem': '钻石', 'gemEn': 'Diamond',
        'metal': '白银 / 铂金', 'metalEn': 'Silver / Platinum',
        'finger': '小指', 'fingerEn': 'Little finger',
        'mantraCount': 20000,
        'deity': ['吉祥天女 (Lakshmi)', '雪山神女 (Parvati)'],
        'goodDeed': '诵读诗歌，或帮助诗人',
        'grain': '白色谷物',
    },
    SATURN: {
        'gem': '蓝宝石', 'gemEn': 'Blue Sapphire',
        'metal': '铁 (或白银)', 'metalEn': 'Iron (or Silver)',
        'finger': '中指', 'fingerEn': 'Middle finger',
        'mantraCount': 19000,
        'deity': ['毗湿奴 (Vishnu)', '梵天 (Brahma)'],
        'goodDeed': '从事体力劳作，或帮助以体力劳动谋生的人',
        'grain': '芝麻',
    },
    RAHU: {
        'gem': '锆石 (Gomedha)', 'gemEn': 'Hessonite (Gomedha)',
        'metal': '白银', 'metalEn': 'Silver',
        'finger': None, 'fingerEn': None,
        'mantraCount': 18000,
        'deity': ['杜尔迦 (Durga)'],
        'goodDeed': '向研究机构捐资，或前往朝圣',
        'grain': '黑吉豆 (black gram daal)',
    },
    KETU: {
        'gem': '猫眼', 'gemEn': "Cat's Eye",
        'metal': '白银', 'metalEn': 'Silver',
        'finger': None, 'fingerEn': None,
        'mantraCount': 7000,
        'deity': ['象头神 (Ganesa)'],
        'goodDeed': '进行冥想 (meditation)',
        'grain': None,
    },
}


def _classical_or_none(value, marker='classical'):
    """书中明确给出 -> 标 marker；书中缺省 (None/空) -> source 标 None。"""
    return marker if value not in (None, '', []) else None


def gemstone_for_planet(planet_key):
    """返回单颗行星的宝石补救资料。

    入参 ``planet_key``：flatlib const id（'Sun'..'Saturn'/'North
    Node'/'South Node'），与 jyotish_engine.PLANET_CN 一致。

    返回 dict，字段 source 逐项标注来源；书中缺省的字段值为 None：
        {
          planet, planetCn, gem, gemEn, metal, metalEn,
          finger, fingerEn, mantraCount, day, deity, goodDeed, grain,
          source: {gem, metal, finger, mantra, deity, day}
        }
    无效 planet_key 返回 None。
    """
    base = _GEM_TABLE.get(planet_key)
    if base is None:
        return None
    day = PLANET_WEEKDAY_CN.get(planet_key)
    return {
        'planet': planet_key,
        'planetCn': PLANET_CN.get(planet_key),
        'gem': base['gem'],
        'gemEn': base['gemEn'],
        'metal': base['metal'],
        'metalEn': base['metalEn'],
        'finger': base['finger'],
        'fingerEn': base['fingerEn'],
        'mantraCount': base['mantraCount'],
        'day': day,
        'deity': list(base['deity']) if base['deity'] else None,
        'goodDeed': base['goodDeed'],
        'grain': base['grain'],
        'source': {
            'gem': _classical_or_none(base['gem']),
            'metal': _classical_or_none(base['metal']),
            'finger': _classical_or_none(base['finger']),      # 部分行星书未给 -> None
            'mantra': _classical_or_none(base['mantraCount']),  # 诵念次数:书给出
            'deity': _classical_or_none(base['deity']),
            'day': _classical_or_none(day, marker='community'),  # 星期:通行共识
        },
    }


def gemstone_table():
    """完整九曜「权威宝石对照表」（用于前端展示）。

    返回按 PLANET_ORDER（日月火水木金土罗计）排序的 list[dict]，
    每项即 gemstone_for_planet 的返回结构。
    """
    return [gemstone_for_planet(p) for p in PLANET_ORDER]


def recommend_remedies(weak_planets, functional_benefics=None):
    """对需要增力的行星给出宝石/补救建议（信息性，非处方）。

    入参：
      - ``weak_planets``：行星键 list —— 引擎传入「需增力」的行星
        （如落陷 / 燃烧 / 力量偏低者）。容忍 None、空 list、重复、非法键。
      - ``functional_benefics``：可选行星键 list —— 该命盘的功能吉星。
        给定时以它判定吉/凶（功能吉星才推荐佩戴其宝石）；
        缺省时回退到自然吉凶（NATURAL_BENEFICS）。

    判定逻辑（遵循权威综合教程之宝石章）：
      - 弱行星属功能吉星 -> ``recommend=True``：佩戴其宝石可助其吐故纳新、
        加速其所许吉果。
      - 弱行星属功能凶星 -> ``recommend=False`` 且 ``caution=True``：
        书明确告诫「功能凶星之宝石应尽量避免」，故只**警示**、不推荐。

    返回 list[dict]（按 PLANET_ORDER 稳定排序、去重），每项：
        {
          planet, planetCn, gem, gemEn, metal, metalEn, finger, day,
          mantraCount, deity, goodDeed, grain,
          role: 'benefic' | 'malefic',
          recommend: bool,        # 仅功能吉星为 True
          caution: bool,          # 功能凶星宝石 -> True（应避免）
          note: str               # 中文说明
        }
    """
    if not weak_planets:
        return []

    if functional_benefics is not None:
        benefic_set = set(functional_benefics)

        def _is_benefic(pk):
            return pk in benefic_set
    else:
        def _is_benefic(pk):
            return pk in NATURAL_BENEFICS

    seen = set()
    out = []
    for planet_key in PLANET_ORDER:          # 稳定顺序遍历
        if planet_key not in weak_planets:
            continue
        if planet_key in seen:               # 去重
            continue
        seen.add(planet_key)

        gem = gemstone_for_planet(planet_key)
        if gem is None:                      # 非法键容错
            continue

        is_benefic = _is_benefic(planet_key)
        if is_benefic:
            note = (
                '功能吉星但力弱，可佩戴其宝石以增其力、加速其所许吉果；'
                '首次佩戴宜在该星所主之日且其力转强时。'
            )
        else:
            note = (
                '功能凶星之宝石应尽量避免佩戴（恐增其凶性）；'
                '宜改以善行、布施或诵念真言等方式安抚。'
            )

        out.append({
            'planet': planet_key,
            'planetCn': gem['planetCn'],
            'gem': gem['gem'],
            'gemEn': gem['gemEn'],
            'metal': gem['metal'],
            'metalEn': gem['metalEn'],
            'finger': gem['finger'],
            'day': gem['day'],
            'mantraCount': gem['mantraCount'],
            'deity': gem['deity'],
            'goodDeed': gem['goodDeed'],
            'grain': gem['grain'],
            'role': 'benefic' if is_benefic else 'malefic',
            'recommend': bool(is_benefic),
            'caution': bool(not is_benefic),
            'note': note,
        })
    return out


def compute(weak_planets=None, functional_benefics=None):
    """便捷聚合：一次返回完整对照表 + 针对弱星的建议。

    建议挂载到排盘结果的 ``remedies`` 键。返回：
        {
          'table': [...9 曜...],            # gemstone_table()
          'recommendations': [...],          # recommend_remedies(...)
          'meta': {
              'mantraNote': '...',           # 真言正文不收录的说明
              'disclaimer': '...',           # 信息性、非处方声明
          }
        }
    """
    return {
        'table': gemstone_table(),
        'recommendations': recommend_remedies(weak_planets, functional_benefics),
        'meta': {
            'mantraNote': (
                '各行星真言原文仅以天城体梵文传世，权威来源反对罗马字转写以免误读，'
                '故此处仅列推荐诵念次数与适宜星期；正文请向通晓者请教。'
            ),
            'disclaimer': (
                '以上为传统吠陀补救法的参考选项，仅供了解，非处方或保证；'
                '宝石/真言之取舍应结合整盘吉凶与功能吉凶慎重判断。'
            ),
        },
    }
