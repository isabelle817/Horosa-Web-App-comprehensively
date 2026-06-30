# D150 Nāḍiāṃśa 公式 spec-lock（五支§4.4：每座 30°/150 = 0°12′；奇座顺、偶座逆）。
# 与 jyotish_engine.nadi() 内 _nadiamsa 同口径;数表是法律。


def nadiamsa(lon):
    sidx = int((lon % 360.0) // 30)          # 0 基座号
    raw = int((lon % 30.0) / 0.2)            # 0..149
    if raw > 149:
        raw = 149
    return (raw + 1) if (sidx % 2 == 0) else (150 - raw)   # 奇座(0基偶)顺、偶座逆


def test_d150_odd_sign_forward():
    assert nadiamsa(0.0) == 1        # 0° Aries(奇座)→ 第1
    assert nadiamsa(0.25) == 2       # raw=1 → 2
    assert nadiamsa(29.99) == 150    # raw=149 → 150


def test_d150_even_sign_reverse():
    assert nadiamsa(30.0) == 150     # 0° Taurus(偶座)逆 → 150
    assert nadiamsa(30.25) == 149
    assert nadiamsa(59.99) == 1


def test_d150_range_and_division_width():
    # 全周每 0°12′ 一格,恒落 1..150。
    for deg10 in range(0, 3600):
        n = nadiamsa(deg10 / 10.0 + 0.03)
        assert 1 <= n <= 150
