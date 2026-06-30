# -*- coding: utf-8 -*-
"""地占纯内核 golden(astrostudy.geomancy,WP-1)。算法逐位锚点 + 法官恒偶/Sikidy 校验压测 + 192 宫断语 + 对应字段。
(旧 vendor 引擎测试见 test_geomancy.py,WP-3 退役后合并。)
运行: PYTHONPATH=Horosa-Web/astropy python3 -m pytest Horosa-Web/astropy/tests/test_geomancy_kernel.py -q"""
import random

from astrostudy import geomancy as g
from astrostudy.geomancy import correspondences as corr


N = g.FIG_BY_NAME


# ---- 图形 ----
def test_16_unique_full_set():
    assert set(g.FIG_BY_INT.keys()) == set(range(16))
    assert len(g.FIG_BY_NAME) == 16


def test_valid_judges_8_even():
    names = {g.name(i) for i in g.VALID_JUDGES}
    assert names == {"Via", "Populus", "Carcer", "Coniunctio",
                     "Amissio", "Acquisitio", "Fortuna Maior", "Fortuna Minor"}
    assert len(g.VALID_JUDGES) == 8


def test_palindromes():
    pal = {g.name(i) for i in g.FIG_BY_INT if g.reverse(i) == i}
    assert pal == {"Via", "Populus", "Carcer", "Coniunctio"}


def test_algebra():
    assert g.inverse(N["Via"]) == N["Populus"]
    assert g.reverse(N["Puer"]) == N["Puella"]
    assert g.inverse(N["Puer"]) == N["Albus"]
    for i in range(16):
        assert g.add(i, i) == 0
        assert g.add(i, 0) == i
        assert g.converse(i) == g.reverse(g.inverse(i))


def test_points():
    expect = {"Via": 4, "Populus": 8, "Cauda Draconis": 5, "Caput Draconis": 5,
              "Fortuna Maior": 6, "Fortuna Minor": 6, "Laetitia": 7, "Tristitia": 7,
              "Albus": 7, "Rubeus": 7, "Puer": 5, "Puella": 5,
              "Amissio": 6, "Acquisitio": 6, "Carcer": 6, "Coniunctio": 6}
    for nm, p in expect.items():
        assert g.points(N[nm]) == p, nm


# ---- 盾牌 ----
def test_worked_example():
    M = [N[x] for x in ["Puella", "Albus", "Fortuna Minor", "Caput Draconis"]]
    s = g.cast_shield_from_mothers(M)
    assert [g.name(x) for x in s.daughters] == ["Amissio", "Fortuna Maior", "Puer", "Carcer"]
    assert [g.name(x) for x in s.nieces] == ["Carcer", "Puella", "Carcer", "Rubeus"]
    assert g.name(s.right_witness) == "Albus"
    assert g.name(s.left_witness) == "Puer"
    assert g.name(s.judge) == "Via"
    assert g.name(s.reconciler) == "Rubeus"


def test_judge_always_even_stress():
    rng = random.Random(0)
    for _ in range(50000):
        s = g.cast_shield(rng)
        assert g.points(s.judge) % 2 == 0
        assert s.judge in g.VALID_JUDGES


def test_daughters_transpose():
    rng = random.Random(2)
    for _ in range(2000):
        M = [rng.randint(0, 15) for _ in range(4)]
        D = g.daughters_from_mothers(M)
        for j in range(4):
            for k in range(4):
                assert g.figures.row(D[j], 3 - k) == g.figures.row(M[k], 3 - j)


# ---- 宫位盘 + 占星定局 ----
def test_sequential_projection():
    M = [N[x] for x in ["Puella", "Albus", "Fortuna Minor", "Caput Draconis"]]
    hc = g.house_chart_sequential(g.cast_shield_from_mothers(M))
    assert g.name(hc[1]) == "Puella"
    assert g.name(hc[5]) == "Amissio"
    assert g.name(hc[9]) == "Carcer"
    assert g.name(hc[12]) == "Rubeus"


def test_ascendant_and_planets():
    M = [N[x] for x in ["Puella", "Albus", "Fortuna Minor", "Caput Draconis"]]
    hc = g.house_chart_sequential(g.cast_shield_from_mothers(M))
    assert g.ascendant_sign(hc, "classical") == "Libra"
    assert g.ascendant_sign(hc, "planetary") == "Libra"
    place = g.astro_place_planets_from_chart(hc)
    for p in g.PLANET_ORDER:
        assert p in place
        for h in place[p]:
            assert 1 <= h <= 12


def test_bytwelves_in_range():
    out = g.astro_place_planets_bytwelves(random.Random(3))
    for p in g.PLANET_ORDER:
        assert 1 <= out[p] <= 12


def test_derived_house():
    assert g.derived_house(3, 6) == 8
    assert g.derived_house(1, 7) == 7


# ---- 解读 ----
def _chart(mapping, filler="Via"):
    hc = {h: N[filler] for h in range(1, 13)}
    for h, nm in mapping.items():
        hc[h] = N[nm]
    return hc


def test_perfection_modes():
    assert g.perfection(_chart({1: "Acquisitio", 7: "Acquisitio"}), 1, 7) == "occupation"
    assert g.perfection(_chart({1: "Acquisitio", 7: "Tristitia", 6: "Acquisitio"}, "Populus"), 1, 7) == "conjunction"
    assert g.perfection(_chart({1: "Acquisitio", 7: "Tristitia", 3: "Acquisitio", 4: "Tristitia"}, "Populus"), 1, 7) == "mutation"
    assert g.perfection(_chart({1: "Acquisitio", 7: "Tristitia", 2: "Laetitia", 6: "Laetitia"}, "Populus"), 1, 7) == "translation"
    assert g.perfection(_chart({1: "Acquisitio", 7: "Tristitia", 2: "Albus", 6: "Puella", 8: "Carcer"}, "Populus"), 1, 7) == "none"


def test_aspect():
    assert [g.aspect(1, x) for x in (1, 3, 4, 5, 7, 2, 6)] == \
        ["conjunction", "sextile", "square", "trine", "opposition", "none", "none"]


def test_company_types():
    assert g.company(_chart({1: "Acquisitio", 2: "Acquisitio"}), 1, 2) == "simple"
    assert g.company(_chart({1: "Acquisitio", 2: "Laetitia"}), 1, 2) == "demi_simple"
    assert g.company(_chart({1: "Puer", 2: "Albus"}), 1, 2) == "compound"
    assert g.company(_chart({1: "Puella", 2: "Carcer"}), 1, 2) == "capitular"


# ---- 新补技法 ----
def test_prohibition():
    assert g.prohibition(_chart({1: "Acquisitio", 7: "Acquisitio", 4: "Rubeus"}, "Populus"), 1, 7) == 4
    assert g.prohibition(_chart({1: "Acquisitio", 7: "Acquisitio"}, "Populus"), 1, 7) is None


def test_points_parity():
    r = g.points_parity(_chart({}, "Populus"))   # 全 Populus(8点)×12 = 96 偶
    assert r["parity"] == "even" and r["bias"] == "yes"
    r2 = g.points_parity(_chart({1: "Via"}, "Populus"))   # 96-8+4=92 偶
    assert r2["total"] == 92


def test_timing_and_triplicities():
    t = g.timing(_chart({7: "Laetitia"}, "Populus"), 7)   # Laetitia 动·火
    assert t["speed"] == "fast" and t["unit"] == "日"
    assert sorted(g.triplicities(1)) == [1, 5, 9]
    assert sorted(g.triplicities(8)) == [4, 8, 12]


# ---- Sikidy ----
def test_sikidy_validity_stress():
    rng = random.Random(5)
    for _ in range(5000):
        col = g.cast_sikidy(rng)
        assert g.sikidy_valid(col)
        for k in range(4):
            assert col[5 + k] == tuple(col[c][k] for c in range(1, 5))


def test_sikidy_16_columns():
    col = g.cast_sikidy(random.Random(6))
    assert set(col.keys()) == set(range(1, 17))
    assert g.SIKIDY_COL_NAMES[1] == "Tale" and g.SIKIDY_COL_NAMES[16] == "Akiba"


# ---- 流派 + 对应 ----
def test_profiles():
    for k in ("european_classical", "european_planetary", "arabic_raml", "india_ramal", "sikidy", "hakata"):
        assert k in g.PROFILES
    assert g.PROFILES["arabic_raml"]["direction"] == "RTL"
    assert g.DEFAULT_PROFILE == "european_classical"


def test_correspondences_figure_fields():
    fm = corr.figure_full("Fortuna Maior")
    for key in ("element_inner", "element_outer", "body_part", "color", "humor", "tone", "unicode", "zodiac_classical", "zodiac_planetary"):
        assert key in fm and fm[key]
    assert fm["tone"] == "good"
    assert len(corr.catalog()) == 16


def test_house_readings_192():
    for fig in g.FIG_BY_NAME:
        for h in range(1, 13):
            r = corr.house_reading(fig, h)
            assert r is not None, f"{fig} 宫{h}"
            assert r["reading"]
    assert corr.question_house("marriage") == 7
    assert corr.house_meaning(10)["latin"] == "Regnum"


# ---- WP-2 读法补全 ----
def test_perfection_by_aspect():
    # 1↔5 三分、其间无强凶 + 常规完美 none → 借相位
    hc = _chart({1: "Acquisitio", 5: "Laetitia"}, "Albus")
    if g.perfection(hc, 1, 5) == "none":
        assert g.perfection_by_aspect(hc, 1, 5) == "trine"


def test_paternitas_tree():
    M = [N[x] for x in ["Puella", "Albus", "Fortuna Minor", "Caput Draconis"]]
    s = g.cast_shield_from_mothers(M)
    tree = g.paternitas(s)
    assert tree["name"] == "Via"                      # 判官
    assert [c["name"] for c in tree["children"]] == ["Albus", "Puer"]   # 右证/左证
    # 右证 Albus ← 甥1/甥2 ← 母
    assert tree["children"][0]["children"][0]["children"][0]["name"] == "Puella"   # M1


def test_via_puncti():
    M = [N[x] for x in ["Puella", "Albus", "Fortuna Minor", "Caput Draconis"]]
    s = g.cast_shield_from_mothers(M)
    vp = g.via_puncti(s)
    assert isinstance(vp["path"], list) and vp["path"][0] == "Via"
    assert "through" in vp


def test_natural_cosignificator():
    assert g.natural_cosignificator(N["Populus"]) == "Moon"
    assert g.natural_cosignificator(N["Via"]) == "Moon"
    assert g.natural_cosignificator(N["Acquisitio"]) is None


def test_sikidy_princes_slaves_red():
    rng = random.Random(11)
    col = g.cast_sikidy(rng)
    ps = g.princes_slaves(col)
    assert len(ps["princes"]) + len(ps["slaves"]) == 16
    assert isinstance(g.red_sikidy(col), bool)
    cc = g.column_compare(col, 1, 2)
    assert "equal" in cc and "xor" in cc


# ---- 整盘聚合(WP-3 服务入口) ----
def test_compute_reading_deterministic():
    a = g.compute_reading(question_type="marriage", cast_method="manual", seed=777)
    b = g.compute_reading(question_type="marriage", cast_method="manual", seed=777)
    assert a["judge"]["latin"] == b["judge"]["latin"]
    assert [h["figure"]["latin"] for h in a["houses"]] == [h["figure"]["latin"] for h in b["houses"]]


def test_compute_reading_shape():
    r = g.compute_reading(question_type="career", profile_id="european_classical", cast_method="manual", seed=42)
    assert r["quesited_house"] == 10                  # career→10
    assert len(r["houses"]) == 12
    assert all("figure" in h and "reading" in h for h in r["houses"])   # 图形入宫 + 192 断语
    assert r["judge"]["points"] % 2 == 0              # 判官偶
    assert "perfection" in r["reading"] and "via_puncti" in r["reading"]
    assert r["right_witness"]["latin"] and r["reconciler"]["latin"]


def test_compute_reading_sikidy_profile():
    r = g.compute_reading(profile_id="sikidy", cast_method="manual", seed=5)
    assert "sikidy" in r and r["sikidy"]["valid"] is True
    assert len(r["sikidy"]["columns"]) == 16
    assert r["sikidy"]["columns"]["1"]["meaning"]   # 列指代义已挂


# ---- 数据层(figure_meanings / 希腊希伯来名 / Hakata)----
def test_figure_meanings_16x10():
    TOPICS = ["总性", "爱情", "财富", "事业", "健康", "诉讼", "旅行", "失物", "是否", "时机"]
    for lat in g.FIG_BY_NAME:
        m = corr.figure_meaning(lat)
        assert m is not None, lat
        for t in TOPICS:
            assert t in m and m[t], f"{lat}.{t}"


def test_alt_names_greek_hebrew():
    for lat in g.FIG_BY_NAME:
        alt = corr.figure_alt_names(lat)
        assert alt["greek"] and alt["hebrew"], lat
    assert corr.figure_alt_names("Via")["greek"] == "Hodós"
    assert corr.figure_alt_names("Carcer")["hebrew"] == "Maʾasar"


def test_hakata_cast():
    h = g.cast_hakata(__import__("random").Random(3))
    assert len(h["tablets"]) == 4
    assert h["figure"] in g.FIG_BY_NAME
    assert h["reading"]
    # 4 片正反 → 4bit → 对应 int
    n = (h["bits"][0] << 3) | (h["bits"][1] << 2) | (h["bits"][2] << 1) | h["bits"][3]
    assert n == h["int"]


def test_compute_reading_hakata_profile():
    r = g.compute_reading(profile_id="hakata", cast_method="manual", seed=7)
    assert "hakata" in r and r["hakata"]["figure"] in g.FIG_BY_NAME


def test_catalog_enriched():
    cat = corr.catalog()
    fm = cat["Fortuna Maior"]
    assert fm["meanings"] and fm["name_greek"] and fm["name_hebrew"]


# ---- 压力测试:全流派 × 全问类 × 多种子 → compute_reading 不抛 + 合法 ----
def test_compute_reading_cartesian_stress():
    QTYPES = ["life", "health", "wealth", "marriage", "career", "children",
              "journey", "religion", "enemy", "death", "custom"]
    fail = []
    n = 0
    for pid in g.PROFILES:
        for qt in QTYPES:
            for seed in (1, 7, 42, 123, 9999):
                n += 1
                try:
                    r = g.compute_reading(question_type=qt, profile_id=pid, cast_method="manual", seed=seed)
                except Exception as e:  # noqa: BLE001
                    fail.append(f"{pid}/{qt}/{seed}: 抛 {e}")
                    continue
                if not (len(r["mothers"]) == 4 and len(r["daughters"]) == 4 and len(r["nieces"]) == 4):
                    fail.append(f"{pid}/{qt}/{seed}: 母女甥数不对")
                if g.points(r["judge"]["int"]) % 2 != 0:
                    fail.append(f"{pid}/{qt}/{seed}: 判官非偶")
                if len(r["houses"]) != 12:
                    fail.append(f"{pid}/{qt}/{seed}: houses={len(r['houses'])}")
                if any(h.get("reading") is None for h in r["houses"]):
                    fail.append(f"{pid}/{qt}/{seed}: 宫缺断语")
    assert fail == [], f"({n} 组) 失败样本: {fail[:8]}"


def test_compute_reading_determinism_across_profiles():
    # 同 profile+seed 两次完全一致(判官+十二宫图)
    for pid in g.PROFILES:
        a = g.compute_reading(profile_id=pid, cast_method="manual", seed=55)
        b = g.compute_reading(profile_id=pid, cast_method="manual", seed=55)
        assert a["judge"]["latin"] == b["judge"]["latin"]
        assert [h["figure"]["latin"] for h in a["houses"]] == [h["figure"]["latin"] for h in b["houses"]]
