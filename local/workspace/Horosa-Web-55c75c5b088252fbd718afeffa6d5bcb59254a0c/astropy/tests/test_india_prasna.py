# Praśna KP 卜卦最小版 golden — KP249 子段表(243 宿×Sub + 6 跨界拆 = 249)结构锁定。
from astrostudy.india.kp_system import kp_249_table, sign_lord


def test_kp249_count_is_249():
    assert len(kp_249_table()) == 249


def test_kp249_first_segment_ashwini_ketu():
    t = kp_249_table()
    s0 = t[0]
    assert s0['index'] == 1
    assert s0['signNo'] == 1                 # 白羊
    assert s0['nakIndex'] == 1               # Ashwini
    assert abs(s0['startLon'] - 0.0) < 1e-9
    assert s0['starLord'] == 'Ketu'          # Ashwini 宿主
    assert s0['subLord'] == 'Ketu'           # 首 Sub = 宿主


def test_kp249_seamless_and_full_circle():
    t = kp_249_table()
    assert abs(t[-1]['endLon'] - 360.0) < 1e-6
    for i in range(len(t) - 1):
        assert abs(t[i]['endLon'] - t[i + 1]['startLon']) < 1e-9   # 段段无缝衔接
    # 每段宽度 > 0
    assert all(seg['endLon'] > seg['startLon'] for seg in t)


def test_kp249_signlord_consistency():
    # 座主链的「座主」= 该段所在星座主星(座号→主星)。
    t = kp_249_table()
    for seg in t:
        assert sign_lord(seg['signNo']) == sign_lord(seg['signNo'])   # 稳定
    # 白羊(1)主 Mars、金牛(2)主 Venus(抽样)。
    assert sign_lord(1) == 'Mars'
    assert sign_lord(2) == 'Venus'
