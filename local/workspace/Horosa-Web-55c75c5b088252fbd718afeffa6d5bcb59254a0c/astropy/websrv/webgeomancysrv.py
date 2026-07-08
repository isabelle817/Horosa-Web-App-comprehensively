"""天文地占 web 服务。

调本仓纯内核 ``astrostudy.geomancy``(16 图不可变内核 + 可插拔流派 Profile),
覆盖盾牌盘 / 宫位盘(图形入宫)/ 占星定局 / 可计算读法 / Sikidy 异或表盘 / 多流派对应。
确定性:castMethod='manual' + seed 复现同盘。返回超集 JSON(旧字段兼容 + 新内核富数据)。
"""

import secrets
import traceback
from numbers import Integral, Real

import cherrypy
import jsonpickle

from websrv.helper import enable_crossdomain

from astrostudy.geomancy import chart as geo_chart
from astrostudy.geomancy import correspondences as geo_corr
from astrostudy.geomancy.figures import inverse, name as fig_name, points, reverse
from astrostudy.geomancy.traditions import PROFILES
from astrostudy.geomancy.random_source import normalize_cast_method

# 种子上界:与前端 InputNumber max 对齐(int32 正区间),保证回传种子可手填复现。
_SEED_MAX = 2147483647

# 黄道星座中文
_SIGN_ZH = {
    "Aries": "白羊", "Taurus": "金牛", "Gemini": "双子", "Cancer": "巨蟹", "Leo": "狮子",
    "Virgo": "处女", "Libra": "天秤", "Scorpio": "天蝎", "Sagittarius": "射手",
    "Capricorn": "摩羯", "Aquarius": "水瓶", "Pisces": "双鱼",
}
# 问类(11)→中文 + 主宫(对齐内核 question_house)
_QTYPES = [
    ("life", "命主/性格"), ("health", "疾病/健康"), ("wealth", "财富"), ("marriage", "婚姻/合伙"),
    ("career", "事业/名誉"), ("children", "子女/恋爱"), ("journey", "远行"), ("religion", "宗教/学问"),
    ("enemy", "对手/暗敌"), ("death", "死亡/遗产"), ("custom", "自定/综合"),
]


def _to_int(value, default=0):
    try:
        if value is None or value == "":
            return default
        return int(value)
    except Exception:
        return default


def _clean(value, default=""):
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def _sanitize_question(value):
    text = _clean(value)
    return text.replace("<", "").replace(">", "").replace("&", "＆")[:200]


def _json_safe(value):
    if isinstance(value, dict):
        return {_clean(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if isinstance(value, Integral) and not isinstance(value, bool):
        return int(value)
    if isinstance(value, Real) and not isinstance(value, bool):
        return float(value)
    return value


def _fig_dict(f, zodiac_system="classical"):
    """内核图形对象 → 前端超集(旧字段 nameEn/nameZh/dots/element*/planet*/sign*/quality*/keywords* 兼容 + 新字段透传)。"""
    if not f:
        return None
    sign = f.get("zodiac_classical") if zodiac_system == "classical" else f.get("zodiac_planetary")
    sign = (sign or "").rstrip("?")
    return {
        "nameEn": f.get("latin"), "nameZh": f.get("name_zh"),
        "dots": list(f.get("bits") or []),
        "element": f.get("element_inner"), "elementZh": f.get("element_inner_zh"),
        "planet": f.get("planet"), "planetZh": f.get("planet_zh"),
        "sign": sign, "signZh": _SIGN_ZH.get(sign, sign),
        "quality": f.get("quality"), "qualityZh": f.get("quality_zh"),
        "keywordsZh": f.get("nature"), "keywordsEn": "",
        # 新内核字段(WP-1/2):
        "points": f.get("points"), "tone": f.get("tone"),
        "elementOuter": f.get("element_outer"), "elementOuterZh": f.get("element_outer_zh"),
        "direction": f.get("direction"), "partiality": f.get("partiality"),
        "bodyPart": f.get("body_part"), "color": f.get("color"), "humor": f.get("humor"),
        "unicode": f.get("unicode"), "nameArabic": f.get("name_arabic"), "nameYoruba": f.get("name_yoruba"),
        "nameGreek": f.get("name_greek"), "nameHebrew": f.get("name_hebrew"),
        "meanings": f.get("meanings"),
        "reverseOf": f.get("reverse_of"), "inverseOf": f.get("inverse_of"),
    }


def _figure_catalog(zodiac_system="classical"):
    cat = geo_corr.catalog()
    out = []
    for v in cat.values():
        i = v["int"]
        out.append(_fig_dict({**v, "points": points(i),
                              "reverse_of": fig_name(reverse(i)), "inverse_of": fig_name(inverse(i))}, zodiac_system))
    return out


def _build_response(r, seed=None):
    """内核 compute_reading 结果 → 前端超集响应。

    seed:本盘实际用于起卦的确定性种子(manual=输入种子;random/time=服务端生成)。
    回传给前端供「锁定复现 / 历史回放 / AI 快照」一致复现同盘。
    """
    zsys = r.get("zodiac_system", "classical")
    mothers = [_fig_dict(f, zsys) for f in r["mothers"]]
    daughters = [_fig_dict(f, zsys) for f in r["daughters"]]
    nieces = [_fig_dict(f, zsys) for f in r["nieces"]]
    rw = _fig_dict(r["right_witness"], zsys)
    lw = _fig_dict(r["left_witness"], zsys)
    judge = _fig_dict(r["judge"], zsys)
    recon = _fig_dict(r["reconciler"], zsys) if r.get("reconciler") else None
    figures16 = mothers + daughters + nieces + [rw, lw, judge] + ([recon] if recon else [])
    houses = []
    for h in r["houses"]:
        hm = h.get("meaning") or {}
        houses.append({
            "house": h["house"], "figure": _fig_dict(h["figure"], zsys),
            "roles": h.get("roles", []), "reading": h.get("reading"),
            "nameZh": hm.get("latin"), "topicsZh": hm.get("theme"),
            "sign": hm.get("sign"), "signZh": _SIGN_ZH.get(hm.get("sign", ""), hm.get("sign", "")),
            "ruler": hm.get("ruler"), "element": hm.get("element"),
        })
    reading = {
        "questionType": r.get("question_type"), "primaryHouse": r.get("quesited_house"),
        "querentHouse": r.get("querent_house"),
        "ascendantSign": r.get("ascendant_sign"),
        "ascendantSignZh": _SIGN_ZH.get(r.get("ascendant_sign", ""), r.get("ascendant_sign", "")),
        "ascendantFigure": mothers[0] if mothers else None,
        "zodiacSystem": zsys, "readingScope": r.get("reading_scope"),
        "haltedOnFirstMother": r.get("halted_on_first_mother"),
        "motherFigures": mothers, "daughterFigures": daughters, "nieceFigures": nieces,
        "rightWitness": rw, "leftWitness": lw,
        "figures16": figures16, "judge": judge, "reconciler": recon,
        "houses": houses,
        "technique": _json_safe(r.get("reading") or {}),
        "planetPlacement": _json_safe(r.get("planet_placement") or {}),
        "profileId": (r.get("profile") or {}).get("id"),
    }
    if seed is not None:
        reading["seed"] = int(seed)
    if r.get("sikidy"):
        reading["sikidy"] = _json_safe(r["sikidy"])
    if r.get("hakata"):
        reading["hakata"] = _json_safe(r["hakata"])
    return reading


class GeomancySrv:
    exposed = True

    def OPTIONS(*args, **kwargs):
        enable_crossdomain()

    @cherrypy.expose
    @cherrypy.config(**{"tools.cors.on": True})
    @cherrypy.tools.json_in()
    def reading(self, **params):
        enable_crossdomain()
        try:
            if cherrypy.request.method == "OPTIONS":
                return jsonpickle.encode({"ResultCode": 0, "Result": "ok"}, unpicklable=False)
            data = dict(params or {})
            data.update(getattr(cherrypy.request, "json", None) or {})

            question = _sanitize_question(data.get("question"))
            question_type = _clean(data.get("questionType") or data.get("question_type"), "custom")
            valid_q = {k for k, _ in _QTYPES}
            if question_type not in valid_q:
                question_type = "custom"
            # 起卦:新参 castMethod 优先,回退旧 seedMode(random/time_seed/manual)。
            cast_method = _clean(data.get("castMethod"), "") or {
                "manual": "manual", "time_seed": "time", "random": "rng",
            }.get(_clean(data.get("seedMode") or data.get("seed_mode"), "random"), "rng")
            cast_method = normalize_cast_method(cast_method)
            manual_seed = _to_int(data.get("seed") or data.get("manualSeed"), None)
            time_seed = _to_int(data.get("timeSeed"), None)
            # 落定一个确定性 int 种子:manual=输入(缺省 0);time=优先 timeSeed,缺则真随机生成;
            # random/皮肤(dice/sand/coins/tablets)=有显式 seed 则用,否则真随机生成。
            # 三者都成确定 int 再喂内核 → random/time 也可复现,且把实际种子回传前端。
            if cast_method == "manual":
                effective_seed = manual_seed if manual_seed is not None else 0
            elif cast_method == "time":
                effective_seed = time_seed if time_seed is not None else secrets.randbelow(_SEED_MAX + 1)
            else:
                effective_seed = manual_seed if manual_seed is not None else secrets.randbelow(_SEED_MAX + 1)
            # 按内核 make_rng 取值优先级喂入:time 模式走 time_seed,其余走 seed。
            kernel_seed = None if cast_method == "time" else effective_seed
            kernel_time_seed = effective_seed if cast_method == "time" else None
            profile_id = _clean(data.get("tradition") or data.get("profile"), "european_classical")
            if profile_id not in PROFILES:
                profile_id = "european_classical"
            zodiac_system = _clean(data.get("zodiacSystem"), "") or None
            reading_scope = _clean(data.get("readingScope"), "") or None

            r = geo_chart.compute_reading(
                question_type=question_type, profile_id=profile_id,
                cast_method=cast_method, seed=kernel_seed, time_seed=kernel_time_seed,
                reading_scope=reading_scope, zodiac_system=zodiac_system,
            )
            reading = _build_response(r, seed=effective_seed)
            reading["question"] = question
            zsys = reading["zodiacSystem"]
            result = {
                "reading": _json_safe(reading),
                "squareSvg": "", "wheelSvg": "",   # 前端用原生暗金盘,不取引擎 SVG
                "figures": _figure_catalog(zsys),
                "questionTypes": [{"key": k, "label": lb, "primaryHouse": geo_corr.question_house(k)} for k, lb in _QTYPES],
                "traditions": [{"id": pid, "label": p.get("label", pid)} for pid, p in PROFILES.items()],
                "aiPrompt": "",
            }
            return jsonpickle.encode({"ResultCode": 0, "Result": result}, unpicklable=False)
        except Exception:
            traceback.print_exc()
            return jsonpickle.encode({"ResultCode": -1, "Result": "geomancy calculation failed"}, unpicklable=False)

    @cherrypy.expose
    @cherrypy.config(**{"tools.cors.on": True})
    @cherrypy.tools.json_in()
    def catalog(self, **params):
        """切流派即时刷新 16 图目录(随黄道体系)。"""
        enable_crossdomain()
        try:
            if cherrypy.request.method == "OPTIONS":
                return jsonpickle.encode({"ResultCode": 0, "Result": "ok"}, unpicklable=False)
            data = dict(params or {})
            data.update(getattr(cherrypy.request, "json", None) or {})
            profile_id = _clean(data.get("tradition") or data.get("profile"), "european_classical")
            prof = PROFILES.get(profile_id, PROFILES["european_classical"])
            zsys = _clean(data.get("zodiacSystem"), "") or prof.get("zodiac_system", "classical")
            result = {"figures": _figure_catalog(zsys),
                      "traditions": [{"id": pid, "label": p.get("label", pid)} for pid, p in PROFILES.items()]}
            return jsonpickle.encode({"ResultCode": 0, "Result": result}, unpicklable=False)
        except Exception:
            traceback.print_exc()
            return jsonpickle.encode({"ResultCode": -1, "Result": "geomancy catalog failed"}, unpicklable=False)
