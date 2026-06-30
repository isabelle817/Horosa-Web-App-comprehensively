# WP-D golden:大统法原十二宫界次(不等宫) + identity-when-null 零回归契约。
import pytest
from astrostudy.guolao_tuibian import shoushi_palace_boundaries, palace_index_of_longitude, ZHOUTIAN_ANCIENT, ZHOUTIAN_MODERN

def test_boundaries_12_widths_ancient():
    b = shoushi_palace_boundaries(ZHOUTIAN_ANCIENT)
    assert len(b) == 12
    starts = [x[2] for x in b]
    widths = [(starts[(i + 1) % 12] - starts[i]) % ZHOUTIAN_ANCIENT for i in range(12)]
    assert abs(sum(widths) - ZHOUTIAN_ANCIENT) < 0.01, sum(widths)
    for w in widths:
        assert 30.43 <= w <= 30.44, w

def test_boundaries_scaled_360():
    b = shoushi_palace_boundaries(ZHOUTIAN_MODERN)
    starts = [x[2] for x in b]
    widths = [(starts[(i + 1) % 12] - starts[i]) % 360.0 for i in range(12)]
    assert abs(sum(widths) - 360.0) < 0.01
    for w in widths:
        assert 29.9 <= w <= 30.1, w

def test_index_identity_when_null():
    # 零回归契约:boundaries=None → int(lon/30)%12(modes 0–5 不等宫零启用的根)。
    for lon in (0, 15, 29.9, 30, 59, 95.5, 180, 359.9):
        assert palace_index_of_longitude(lon, None) == int((lon % 360) / 30) % 12

def test_index_unequal_covers_12():
    b = shoushi_palace_boundaries(ZHOUTIAN_MODERN)
    seen = set()
    for lon in range(0, 360, 3):
        idx = palace_index_of_longitude(lon, b)
        assert 0 <= idx < 12
        seen.add(idx)
    assert len(seen) == 12
