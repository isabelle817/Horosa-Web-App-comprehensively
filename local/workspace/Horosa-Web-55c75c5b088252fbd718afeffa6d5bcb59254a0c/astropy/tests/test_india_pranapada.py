# Praṇapada PP golden — 09_chartcasting §5.4(BPHS Ch.3,公式 + 算例皆文档,不臆造)。
from astrostudy.india.upagraha import pranapada, special_lagnas


def _sign(lon):
    return int(lon // 30) % 12


def _deg(lon):
    return lon % 30


def test_pranapada_worked_example():
    # 日出太阳 Leo 7°55′=127.9167°; ishta 9.0314h=541.884min; Sun 固定(Leo)→+240 → Libra 17°20′。
    sun = 4 * 30 + 7 + 55 / 60.0
    elapsed = 9.0314 * 60.0
    pp = pranapada(sun, elapsed)
    assert _sign(pp) == 6                          # Libra
    assert abs(_deg(pp) - 17.337) < 0.05           # 17°20′


def test_pranapada_X_and_modality():
    # X=(历时分×5°)mod360;偏移 动象+0/固定+240/变动+120。
    assert abs(pranapada(0.0, 0.0) - 0.0) < 1e-9               # 白羊(动)0° → +0
    assert abs(pranapada(30 + 10.0, 0.0) - 280.0) < 1e-9       # 金牛(固)10° → +240 → 280
    assert abs(pranapada(60 + 5.0, 0.0) - 185.0) < 1e-9        # 双子(变)5° → +120 → 185
    assert abs(pranapada(90 + 3.0, 0.0) - 93.0) < 1e-9         # 巨蟹(动)3° → +0 → 93
    # X 周期 72 分 = 360°:与 0 分同 X。
    assert abs(pranapada(0.0, 72.0) - pranapada(0.0, 0.0)) < 1e-9


def test_special_lagnas_pranapada_dual_variant():
    # 双变体:出生太阳缺省时只给 sunrise;给出生太阳则附 variantBirth。
    r1 = special_lagnas(120.0, 300.0, 100.0, 50.0)
    assert 'pranapada' in r1
    assert 'variantBirth' not in r1['pranapada']
    assert r1['pranapada']['lon'] == r1['pranapada']['variantSunrise']
    r2 = special_lagnas(120.0, 300.0, 100.0, 50.0, sun_lon_at_birth=120.5)
    assert 'variantBirth' in r2['pranapada']
    assert r2['pranapada']['variantSunrise'] == r1['pranapada']['lon']
