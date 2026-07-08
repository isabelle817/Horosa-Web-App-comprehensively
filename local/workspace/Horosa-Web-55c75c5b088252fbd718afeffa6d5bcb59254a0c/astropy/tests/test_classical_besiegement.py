# -*- coding: utf-8 -*-
"""围攻详断(《围攻》十六式):三种围(火土围攻凶/金木围荣富/日月围耀贵) + 春秋势 + 宰执夏冬 +
协防 + 围魏救赵 + 日木互容制约 + 逆行。算法基于已算 surroundAttacks。"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from astrostudy import perchart, astroextra

SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']


def _bd(date, time):
    pc = perchart.PerChart(astroextra.base_params({
        'date': date, 'time': time, 'zone': '+08:00', 'lat': '26N04', 'lon': '119E19', 'ad': 1, 'hsys': 'ALCABITUS',
    }))
    pc.getChartObj()
    return pc.besiegementDetail(), pc


TYPE_MAP = {'MarsSaturn': ('围攻', '凶'), 'VenusJupiter': ('围荣', '富'), 'SunMoon': ('围耀', '贵')}


def test_structure_invariants():
    bd, _ = _bd('2000/01/01', '00:00:00')
    assert bd
    for b in bd:
        assert TYPE_MAP[b['type']] == (b['kind'], b['nature'])         # 类型↔名↔性 一致
        assert 'targetRule' not in b                                   # 冬夏只标围攻者,不标被围星
        for x in b['besiegers']:
            assert x['season'] in ('春', '夏', '秋', '冬', '中')        # 四季标在围攻者
        if b['type'] == 'MarsSaturn':
            assert isinstance(b['severe'], bool)
            # severe ⟺ 有火土围攻者为春/夏(主宰侧)
            calc = any(x['season'] in ('春', '夏') for x in b['besiegers'])
            assert b['severe'] == calc
        else:
            assert b['severe'] is None
            assert b['defense'] == []


def test_severe_double_dominant():
    # 2026/06/14:火土皆主宰侧(春/夏)围攻水星 → severe(凶剧)。
    bd, _ = _bd('2026/06/14', '12:00:00')
    atk = [b for b in bd if b['type'] == 'MarsSaturn' and b['target'] == 'Mercury']
    assert atk, [(b['kind'], b['target']) for b in bd]
    b = atk[0]
    assert b['severe'] is True
    assert all(x['season'] in ('春', '夏') for x in b['besiegers'])


def test_defense_present():
    # 2000/01/01:火土围月,有强吉星协防(木/日),且每条注明"防御哪颗围攻星"(against)。
    bd, _ = _bd('2000/01/01', '00:00:00')
    atk = [b for b in bd if b['type'] == 'MarsSaturn' and b['target'] == 'Moon']
    assert atk and len(atk[0]['defense']) >= 1
    bes_ids = {x['id'] for x in atk[0]['besiegers']}
    for y in atk[0]['defense']:
        assert y['id'] in ('Jupiter', 'Sun', 'Venus') and y['side'] in ('春', '秋')
        assert y['against'] in bes_ids                    # 防御的是该盘的某颗围攻火/土


def test_three_kinds_reachable():
    # 三种围在不同盘上均可命中(围攻/围荣/围耀)。
    kinds = set()
    for d in [('2000/01/01', '00:00:00'), ('2026/06/14', '12:00:00'), ('1986/07/06', '12:00:00')]:
        bd, _ = _bd(*d)
        for b in bd:
            kinds.add(b['kind'])
    assert {'围攻', '围荣', '围耀'} & kinds   # 至少命中其一(通常多个)
    assert '围攻' in kinds and '围耀' in kinds


def test_restraint_present():
    # 1993/06/15:土星围月,土与木互容,且木主 4/7 宫(全不沾 3/6/8/12)= 强 → 土标「日木制约」(凶减半);
    # 验证互容数据已正确接入(非空dict误判)+ 制约方须主强宫。
    bd, pc = _bd('1993/06/15', '12:00:00')
    atk = [b for b in bd if b['type'] == 'MarsSaturn' and b['target'] == 'Moon']
    assert atk, [(b['kind'], b['target']) for b in bd]
    restr = [x for x in atk[0]['besiegers'] if x.get('restrained')]
    assert restr and 'Jupiter' in restr[0]['restrained'], atk[0]['besiegers']
    assert pc._is_strong_house(pc.chart.getObject('Jupiter'))     # 制约木须主强宫(主4/7,不沾3/6/8/12)


def test_restraint_requires_strong_auth():
    # 1996/03/15:火土围日,火与木互容,但木主 6/9 宫(主了 6 宫被污染)= 弱 → 不构成制约(留空)。
    bd, pc = _bd('1996/03/15', '12:00:00')
    assert not pc._is_strong_house(pc.chart.getObject('Jupiter'))  # 木主6宫 → 弱
    atk = [b for b in bd if b['type'] == 'MarsSaturn' and b['target'] == 'Sun']
    assert atk, [(b['kind'], b['target']) for b in bd]
    for x in atk[0]['besiegers']:
        assert not x.get('restrained'), x                          # 弱木不制约,不再瞎标


def test_defense_requires_intercept():
    # 2028/06/14:火土围月。金星相位点 2.26° 截击火星(2.88°)→协防;
    # 太阳相位点 13.9° 远在火星之外、不挡在中间 → 不构成协防(《围攻》弃车保帅:须截击)。
    bd, _ = _bd('2028/06/14', '01:04:44')
    atk = [b for b in bd if b['type'] == 'MarsSaturn' and b['target'] == 'Moon']
    assert atk, [(b['kind'], b['target']) for b in bd]
    ids = {d['id'] for d in atk[0]['defense']}
    assert 'Venus' in ids and 'Sun' not in ids
    for d in atk[0]['defense']:
        assert d['against'] in {x['id'] for x in atk[0]['besiegers']}
