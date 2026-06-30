# Sthira 大运 golden（§5.2：动7/固8/变9 = 96 年；Lagna 起座默认）。
from astrostudy.india.rasi_dasha import sthira_dasha, sign_at


def test_sthira_total_and_count():
    r = sthira_dasha(sign_at(0))      # Aries 起
    assert r['totalYears'] == 96
    assert len(r['mahadashas']) == 12


def test_sthira_year_by_modality():
    r = sthira_dasha(sign_at(0))      # Aries 奇足→顺:Aries(动)/Taurus(固)/Gemini(变)
    assert r['mahadashas'][0]['years'] == 7    # movable
    assert r['mahadashas'][1]['years'] == 8    # fixed
    assert r['mahadashas'][2]['years'] == 9    # dual
    assert r['mahadashas'][3]['years'] == 7    # Cancer movable


def test_sthira_cumulative():
    r = sthira_dasha(sign_at(0))
    assert r['mahadashas'][0]['startAge'] == 0
    assert r['mahadashas'][-1]['endAge'] == 96
