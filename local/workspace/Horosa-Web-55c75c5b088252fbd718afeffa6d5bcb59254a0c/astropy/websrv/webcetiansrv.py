import traceback

import cherrypy
import jsonpickle

# 策天飞星已重写为自有引擎(astrostudy.cetian_ziwei),通用序列化辅助走自有 horosa_engine_common,
# 不再依赖 kentang/kinastro 框架(引擎已从 vendor/kinastro 摘出)。
from websrv.helper import enable_crossdomain
from websrv.horosa_engine_common import (
    build_snapshot,
    clean_text,
    coord_to_float,
    gender_cn,
    json_safe,
    parse_datetime,
    row,
    timezone_to_float,
)

from astrostudy.cetian_ziwei import (
    CETIAN_18_FLYING_STARS,
    CETIAN_AUX_STAR_NAMES,
    CETIAN_FLYING_RULES,
    CETIAN_MAIN_STAR_NAMES,
    CETIAN_PATTERNS,
    CETIAN_SIHUA_TABLE,
    CETIAN_STAR_ATTRIBUTES,
    EARTHLY_BRANCHES,
    HEAVENLY_STEMS,
    HOUR_BRANCH_NAMES,
    LUNAR_MONTH_NAMES,
    WU_XING_JU_NAMES,
    compute_cetian_ziwei_chart,
)


def _day_to_chinese(day):
    # 完整农历日名:初一..初十 / 十一..十九 / 二十 / 廿一..廿九 / 三十(自带「初」,调用处勿再加)。
    units = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
    if day <= 10:
        return f"初{units[day]}"
    if day < 20:
        return f"十{units[day - 10]}"
    if day == 20:
        return "二十"
    if day < 30:
        return f"廿{units[day - 20]}"
    return "三十"


def _palace_rows(palace, show_brightness=True, show_sihua=True, show_flying=True):
    # 书法无宫干/四化/飞星/格局(留空不显示);原法(kentang)有,则随数据出现。
    # show_* 仅过滤显示行,不改既有计算;默认全显=现状(零回归)。
    stem = palace.get("stem_name") or ""
    rows = [
        row("宫名", palace.get("name")),
        row("干支" if stem else "地支", f"{stem}{palace.get('branch_name')}"),
        row("正曜", palace.get("stars")),
        row("副曜", palace.get("aux_stars")),
    ]
    if show_brightness:
        rows.append(row("亮度", palace.get("brightness")))
    rows.append(row("大限", palace.get("da_xian")))
    if show_sihua and palace.get("sihua"):
        rows.append(row("四化", palace.get("sihua")))
    if show_flying and palace.get("flying_stars"):
        rows.append(row("飞星", palace.get("flying_stars")))
    if show_flying and palace.get("patterns"):
        rows.append(row("格局", palace.get("patterns")))
    return rows


def _build_sections(pan, show_wu_xing_ju=True, show_sihua=True, show_flying=True, show_brightness=True, show_solar_term=True):
    # show_* 显示开关仅过滤输出段/行,绝不改既有算法;默认全显=现状(字节级零回归)。
    chart = pan.get("cetian", {})
    lunar = pan.get("lunar", {})
    is_kentang = chart.get("method") == "kentang"

    mingshen_rows = [
        row("农历", lunar.get("text")),
        row("时辰", pan.get("hourBranch")),
        row("命宫", pan.get("mingGong")),
        row("身宫", pan.get("shenGong")),
    ]
    if is_kentang and pan.get("wuXingJu") and show_wu_xing_ju:
        mingshen_rows.append(row("五行局", pan.get("wuXingJu")))
    mingshen_rows.append(row("紫微", pan.get("ziwei")))
    if show_solar_term:
        mingshen_rows.append(row("节气", chart.get("solar_term_influence")))

    sections = [
        {
            "title": "起盘",
            "rows": [
                row("起盘时间", f"{pan.get('dateStr', '')} {pan.get('timeStr', '')}".strip()),
                row("时区", f"UTC{pan.get('timezone'):+.1f}"),
                row("经度", pan.get("longitude")),
                row("纬度", pan.get("latitude")),
                row("地点", pan.get("location")),
                row("性别", chart.get("gender")),
                row("阴阳", chart.get("yin_yang")),
                row("算法", "原法·标准紫微" if is_kentang else "书法·策天本法"),
            ],
        },
        {"title": "农历与命身", "rows": mingshen_rows},
    ]
    # 四化/飞星/格局:仅原法(kentang);show_sihua/show_flying 控制是否输出对应段(格局与飞星成对)。
    if is_kentang:
        if show_sihua:
            sections.append({
                "title": "四化",
                "rows": [row(s, h) for s, h in (chart.get("sihua") or {}).items()],
            })
        if show_flying:
            sections.append({
                "title": "飞星",
                "rows": [
                    row(s, f"{EARTHLY_BRANCHES[f.get('from_branch', 0)]} → {EARTHLY_BRANCHES[f.get('to_branch', 0)]}；{f.get('nature')}")
                    for s, f in (chart.get("star_flight") or {}).items()
                ],
            })
            sections.append({
                "title": "格局",
                "rows": [
                    row(it.get("name"), f"{it.get('stars')}；{it.get('meaning')}；{EARTHLY_BRANCHES[it.get('palace_branch', 0)]}宫")
                    for it in (chart.get("active_patterns") or [])
                ],
            })
    for palace in chart.get("palaces", []):
        sections.append({"title": palace.get("name", "宫位"), "rows": _palace_rows(palace, show_brightness, show_sihua, show_flying)})
    sections.append({
        "title": "星曜属性",
        "rows": [row(star, f"{attrs[0]} · {attrs[1]}") for star, attrs in CETIAN_STAR_ATTRIBUTES.items()],
    })
    sections.append({
        "title": "正曜副曜",
        "rows": [row("十二正曜", CETIAN_MAIN_STAR_NAMES), row("七副曜", CETIAN_AUX_STAR_NAMES)],
    })
    if is_kentang:
        if show_sihua:
            sections.append({
                "title": "宫干四化表",
                "rows": [
                    row(HEAVENLY_STEMS[i], {"禄": it[0], "权": it[1], "科": it[2], "忌": it[3]})
                    for i, it in enumerate(CETIAN_SIHUA_TABLE)
                ],
            })
        if show_flying:
            sections.append({"title": "飞化规则", "rows": [row(k, v) for k, v in CETIAN_FLYING_RULES.items()]})
            sections.append({"title": "古法格局规则", "rows": [row(k, v) for k, v in CETIAN_PATTERNS.items()]})
    sections.append({
        "title": "三合组",
        "rows": [
            row(f"三合{idx + 1}", [EARTHLY_BRANCHES[item] for item in group])
            for idx, group in enumerate(chart.get("sanhe_groups") or [])
        ],
    })
    return sections


class CeTianSrv:
    exposed = True

    def OPTIONS(*args, **kwargs):
        enable_crossdomain()

    @cherrypy.expose
    @cherrypy.config(**{"tools.cors.on": True})
    @cherrypy.tools.json_in()
    def pan(self):
        enable_crossdomain()
        try:
            if cherrypy.request.method == "OPTIONS":
                return jsonpickle.encode({"ResultCode": 0, "Result": "ok"}, unpicklable=False)
            data = cherrypy.request.json or {}
            dt = parse_datetime(data)
            timezone = timezone_to_float(data.get("zone") or data.get("timezone"), 8.0)
            latitude = coord_to_float(data.get("lat") or data.get("latitude"), 26.0667)
            longitude = coord_to_float(data.get("lon") or data.get("longitude"), 119.3167)
            location = clean_text(data.get("location") or data.get("place"), "星阙地点")
            gender = gender_cn(data.get("gender"), "男")
            chart = json_safe(compute_cetian_ziwei_chart(
                year=dt.year,
                month=dt.month,
                day=dt.day,
                hour=dt.hour,
                minute=dt.minute,
                timezone=timezone,
                latitude=latitude,
                longitude=longitude,
                location_name=location,
                gender=gender,
                method=("kentang" if str(data.get("method") or "book").lower() in ("kentang", "classic", "original") else "book"),
                lunar_mode=("classic" if str(data.get("lunarMode") or "sxtwl").lower() == "classic" else "sxtwl"),
                star_order=("forward" if str(data.get("starOrder") or "reverse").lower() == "forward" else "reverse"),
            ))
            is_kentang = chart.get("method") == "kentang"
            lunar_text = (
                f"{chart.get('lunar_year')}年"
                f"{HEAVENLY_STEMS[chart.get('lunar_year_stem', 0)]}{EARTHLY_BRANCHES[chart.get('lunar_year_branch', 0)]}年 "
                f"{'闰' if chart.get('is_leap_month') else ''}"
                f"{LUNAR_MONTH_NAMES[chart.get('lunar_month', 1) - 1]}"
                f"{_day_to_chinese(chart.get('lunar_day', 1))}"
            )
            pan = {
                "source": "horosa",
                "engine": "horosa-cetian",
                "technique": "cetian",
                "title": "策天飞星",
                "dateStr": data.get("date", dt.strftime("%Y-%m-%d")),
                "timeStr": data.get("time", dt.strftime("%H:%M:%S")),
                "timezone": timezone,
                "latitude": latitude,
                "longitude": longitude,
                "location": location,
                "lunar": {"text": lunar_text},
                "hourBranch": HOUR_BRANCH_NAMES[chart.get("hour_branch", 0)],
                "mingGong": f"{EARTHLY_BRANCHES[chart.get('ming_gong_branch', 0)]}宫",
                "shenGong": f"{EARTHLY_BRANCHES[chart.get('shen_gong_branch', 0)]}宫",
                "ziwei": f"{EARTHLY_BRANCHES[chart.get('ziwei_branch', 0)]}宫",
                "method": chart.get("method", "book"),
                "lunarMode": chart.get("lunar_mode", "sxtwl"),
                "starOrder": chart.get("star_order", "reverse"),
                "cetian": chart,
                "rules": {
                    "stars": json_safe(CETIAN_18_FLYING_STARS),
                    "starAttributes": json_safe(CETIAN_STAR_ATTRIBUTES),
                    "mainStars": json_safe(CETIAN_MAIN_STAR_NAMES),
                    "auxStars": json_safe(CETIAN_AUX_STAR_NAMES),
                },
                "classics": [
                    {
                        "title": "来源",
                        "rows": [
                            row("依据", "《十八飞星策天紫微斗数（附地星会源）》卷一安星定宫法")
                            if not is_kentang else
                            row("依据", "原法=标准紫微嫁接(五行局/按农历日起紫微/四化飞化格局),非本书"),
                            row("说明", "命/身/紫微/宫序/亮度/五行按本书,无五行局、四化、飞化。")
                            if not is_kentang else
                            row("说明", "左栏可切「书法/原法」;原法另可选 农历(sxtwl/原) 与 正曜(逆布/顺布)。"),
                        ],
                    },
                ],
                "capabilities": {
                    "inputs": ["date", "time", "gender", "timezone", "latitude", "longitude", "location", "method", "lunarMode", "starOrder"],
                    "outputs": ["lunarDate", "mingShen", "palaces", "18Stars", "starAttributes", "brightness", "sanheGroups", "solarTerm"],
                },
            }
            if is_kentang:
                pan["wuXingJu"] = WU_XING_JU_NAMES.get(chart.get("wu_xing_ju"), chart.get("wu_xing_ju"))
                pan["rules"]["sihuaTable"] = json_safe(CETIAN_SIHUA_TABLE)
                pan["rules"]["flyingRules"] = json_safe(CETIAN_FLYING_RULES)
                pan["rules"]["patterns"] = json_safe(CETIAN_PATTERNS)
            # 显示开关(默认 1=显示=现状);仅过滤输出,不改算法。showBrightness=0 主动清空 palace.brightness(图与表都隐)。
            def _flag(key):
                return str(data.get(key, 1)).strip().lower() not in ("0", "false", "no", "off", "")
            show_brightness = _flag("showBrightness")
            if not show_brightness:
                for _p in (chart.get("palaces") or []):
                    if isinstance(_p, dict):
                        _p["brightness"] = {}
            pan["sections"] = _build_sections(
                pan,
                show_wu_xing_ju=_flag("showWuXingJu"),
                show_sihua=_flag("showSihua"),
                show_flying=_flag("showFlying"),
                show_brightness=show_brightness,
                show_solar_term=_flag("showSolarTerm"),
            )
            pan["snapshot"] = build_snapshot(pan)
            return jsonpickle.encode({"ResultCode": 0, "Result": pan}, unpicklable=False)
        except Exception:
            traceback.print_exc()
            return jsonpickle.encode({"ResultCode": -1, "Result": "cetian calculation failed"}, unpicklable=False)
