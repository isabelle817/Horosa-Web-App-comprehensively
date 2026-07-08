# Maṇḍūka(蛙跳)大运 golden（§5.5：kendra+3 序；7/8/9 按类型=96；奇足起 Lagna 顺）。
from astrostudy.india.rasi_dasha import manduka_dasha, sign_at


def test_manduka_total_and_count():
    r = manduka_dasha(sign_at(0))     # Aries 奇足 → 起 Aries 顺
    assert r['totalYears'] == 96
    assert len(r['mahadashas']) == 12
    assert len(set(r['order'])) == 12   # 12 座置换


def test_manduka_leap_order():
    r = manduka_dasha(sign_at(0))
    o = r['order']
    assert o[0] == sign_at(0)    # Aries(kendra起)
    assert o[1] == sign_at(3)    # Cancer(+3)
    assert o[2] == sign_at(6)    # Libra(+6)
    assert o[3] == sign_at(9)    # Capricorn(+9)
    assert o[4] == sign_at(1)    # Taurus(panaphara起)


def test_manduka_years_by_modality():
    r = manduka_dasha(sign_at(0))
    by = {m['rasi']: m['years'] for m in r['mahadashas']}
    assert by[sign_at(0)] == 7    # Aries movable
    assert by[sign_at(1)] == 8    # Taurus fixed
    assert by[sign_at(2)] == 9    # Gemini dual
