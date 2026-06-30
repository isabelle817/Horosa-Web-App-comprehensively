# WP-D golden:推变黄道术内核(赤道宿度→黄道宿度立成)。对《古今星制之别考》ch.2/9 worked-example。
import pytest
from astrostudy.guolao_tuibian import (
    YUANMING_EQUATORIAL_SU, SU28_NAMES, mansion_huangdao_table, chunfen_equatorial, ZHOUTIAN_ANCIENT,
)

def _su(name, table):
    return table[SU28_NAMES.index(name)]

def test_yuanming_equatorial_sum():
    assert len(YUANMING_EQUATORIAL_SU) == 28
    assert abs(sum(YUANMING_EQUATORIAL_SU) - 365.25) < 0.02

def test_chunfen_at_bi6():
    # 元时春分点在壁 6 度(ch.2 p9)。壁起累积 + 6。
    cum = 0.0
    for i in range(SU28_NAMES.index('壁')):
        cum += YUANMING_EQUATORIAL_SU[i]
    assert abs(chunfen_equatorial() - (cum + 6.0)) < 1e-6

def test_jiyuan_worked_examples():
    # 闭式立成 vs 授时历官方(会圆表)worked-example:奎=17.87 / 壁=9.34(PDF ch.9),闭式近似容差±0.12°。
    t = mansion_huangdao_table('jiyuan')
    assert abs(_su('奎', t) - 17.87) < 0.12, _su('奎', t)
    assert abs(_su('壁', t) - 9.34) < 0.12, _su('壁', t)

def test_huangdao_table_full_circle():
    for m in ('jiyuan', 'jintui', 'huiyuan'):
        t = mansion_huangdao_table(m)
        assert len(t) == 28
        assert all(x > 0 for x in t)
        # 黄道周天≈赤道周天(局部加减整圈抵消)
        assert abs(sum(t) - ZHOUTIAN_ANCIENT) < 0.6, (m, sum(t))

def test_methods_consistent_kui():
    # 三法奎宿都落 17.7–18.15(同量级,各异)
    vals = {m: _su('奎', mansion_huangdao_table(m)) for m in ('jiyuan', 'jintui', 'huiyuan')}
    for v in vals.values():
        assert 17.7 < v < 18.15, vals
    assert len(set(round(v, 3) for v in vals.values())) >= 2   # 至少两法不同
