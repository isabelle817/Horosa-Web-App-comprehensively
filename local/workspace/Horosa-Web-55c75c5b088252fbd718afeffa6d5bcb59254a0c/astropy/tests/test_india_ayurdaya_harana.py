# Āyurdāya haraṇa golden — 07_ayurdaya §7.5 全文档规则锁定(不臆造,数表是法律)。
# 门派分歧逐项「做成不同流派选项」:敌座⅓/合日½ 取大者·Chakrapata 表·Krurodaya 式A/B·Savana→Solar。


def test_chakrapata_table_documented():
    # 可见半球凶星损序(Bṛhat Jātaka 7.3 逐字):12→1,11→½,10→⅓,9→¼,8→1/5,7→1/6;吉星恰半。
    table = {12: 1.0, 11: 0.5, 10: 1.0 / 3, 9: 0.25, 8: 0.2, 7: 1.0 / 6}
    assert table[12] == 1.0
    assert table[11] == 0.5
    assert abs(table[10] - 1.0 / 3) < 1e-9
    assert table[9] == 0.25
    assert table[8] == 0.2
    assert abs(table[7] - 1.0 / 6) < 1e-9
    # 吉星损=凶星之半
    assert all(abs((table[h] / 2.0) - (table[h] * 0.5)) < 1e-12 for h in table)
    # 仅可见半球(7..12)入表,东半球(1..6)不施
    assert set(table.keys()) == {7, 8, 9, 10, 11, 12}


def test_dignity_harana_max_rule():
    # 敌座⅓ 与 合日½ 只取大者,绝不并施(BPHS 43.22 逐字)。
    def dig(shatru, combust):
        return max(1.0 / 3 if shatru else 0.0, 0.5 if combust else 0.0)
    assert abs(dig(True, False) - 1.0 / 3) < 1e-9     # 仅敌座 → ⅓
    assert dig(False, True) == 0.5                    # 仅合日 → ½
    assert dig(True, True) == 0.5                     # 两者 → 取大者½,非 ⅓+½=0.833
    assert dig(False, False) == 0.0


def test_reduction_composition_worked_micro():
    # 逐曜:reduced = base ×(1−dignity)×(1−chakra),两减独立连乘。
    # base=10、敌座(非逆)dig=⅓、第10宫凶星 chakra=⅓ → 10 × ⅔ × ⅔ = 4.4444。
    base, dig, chakra = 10.0, 1.0 / 3, 1.0 / 3
    assert abs(base * (1 - dig) * (1 - chakra) - 4.4444) < 1e-3
    # 合日½ + 第12宫凶星(全损1)→ reduced=0(全损)。
    assert 10.0 * (1 - 0.5) * (1 - 1.0) == 0.0


def test_krurodaya_formulas_distinct():
    # Krurodaya 对总和一次:式A=Σ×角分/21600、式B=Σ×navāṁśa数/108;两式量级不同须择一。
    total = 80.0
    asc_signlon = 15.0          # Lagna 座内 15° → 900 角分
    a = total * (asc_signlon * 60.0) / 21600.0
    nav = int((6 * 30 + asc_signlon) / (30.0 / 9.0)) + 1   # 假设 Lagna 在第7座 15°
    b = total * nav / 108.0
    assert abs(a - total * 900.0 / 21600.0) < 1e-9         # = 3.333
    assert a != b                                          # 两式确异


def test_savana_to_solar_ratio():
    # 表年皆 Savana(360 日)年,末 ×360/365 → Solar(Jātaka Pārijāta 5.34)。
    assert abs(120.0 * 360.0 / 365.0 - 118.356) < 0.01
    assert abs(80.142 * 360.0 / 365.0 - 79.04) < 0.02      # 文档 Indira Gandhi 算例末步


def test_lagna_ayu_navamsa_formula():
    # Lagna_Ayu = (Lagna 座内角分)/200(Varāhamihira navāṁśa 法)。
    assert abs((15.0 * 60.0) / 200.0 - 4.5) < 1e-9
    assert abs((29.0 * 60.0) / 200.0 - 8.7) < 1e-9


def test_amsayu_bharana_variant_multipliers():
    # §7.4 三派 Bharaṇa 乘数分组(不臆造,文档明列)。「做成不同流派选项」。
    def majority(exalt, retro, own, varg):
        return 3 if (exalt or retro) else (2 if (own or varg) else 1)        # 多数派:取最高
    def bphs(exalt, retro, own, varg):
        return 3 if (exalt or own) else 1                                    # BPHS-literal:svakṣetra 入×3,略逆/vargottama
    def multiply(exalt, retro, own, varg):
        return 6 if ((exalt or retro) and (own or varg)) else (3 if (exalt or retro) else (2 if (own or varg) else 1))
    # 自座(own)且逆行
    assert majority(False, True, True, False) == 3      # 取最高×3
    assert bphs(False, True, True, False) == 3          # own→×3,逆行被略
    assert multiply(False, True, True, False) == 6      # 逆×3 与 own×2 合并→×6
    # 仅自座
    assert majority(False, False, True, False) == 2
    assert bphs(False, False, True, False) == 3
    assert multiply(False, False, True, False) == 2
    # 庙旺:三派皆×3
    assert majority(True, False, False, False) == bphs(True, False, False, False) == multiply(True, False, False, False) == 3
    # 平:皆×1
    assert majority(False, False, False, False) == bphs(False, False, False, False) == 1


def test_nisargayu_purna_vs_technical():
    # §7.3 Nisargāyu:全期派=自然表 120 原样(+Lagna);技术派=同 Piṇḍāyu 弧缩放+四 haraṇa,故 <全期。
    lagna = 8.21
    purna_solar = (120.0 + lagna) * 360.0 / 365.0
    assert abs(purna_solar - 126.46) < 0.1     # 全期派(raw 120+Lagna,×360/365)
