# Yogārdha 大运 golden（§5.5：每座 =(Sthira+Narayana)/2；序随 Narayana）。
from flatlib import const
from astrostudy.india.rasi_dasha import (yogardha_dasha, narayana_dasha, sthira_dasha, sign_at, index_of)

_PS = {const.SUN: sign_at(0), const.MOON: sign_at(3), const.MARS: sign_at(6),
       const.MERCURY: sign_at(1), const.JUPITER: sign_at(8), const.VENUS: sign_at(2),
       const.SATURN: sign_at(9), const.NORTH_NODE: sign_at(5), const.SOUTH_NODE: sign_at(11)}


def test_yogardha_12_positive():
    r = yogardha_dasha(sign_at(0), _PS)
    assert len(r['mahadashas']) == 12
    assert all(m['years'] > 0 for m in r['mahadashas'])
    assert r['totalYears'] > 0


def test_yogardha_is_average_of_sthira_narayana():
    lagna = sign_at(0)
    yog = yogardha_dasha(lagna, _PS)
    nar = narayana_dasha(lagna, _PS)
    nar_y = {m['rasi']: m['years'] for m in nar['mahadashas'][:12]}
    sth_y = (7, 8, 9)
    for m in yog['mahadashas']:
        expected = (nar_y[m['rasi']] + sth_y[index_of(m['rasi']) % 3]) / 2.0
        assert abs(m['years'] - expected) < 1e-9
