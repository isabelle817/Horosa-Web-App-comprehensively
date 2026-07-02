import math
import swisseph

from flatlib.datetime import Datetime
from flatlib.geopos import GeoPos
from flatlib.chart import Chart
from flatlib import const
from flatlib import utils
from flatlib import angle
from astrostudy.helper import distance
from astrostudy.helper import convertLonToStr
from astrostudy.helper import convertLatToStr

# Reuse the India module's 47-ayanamsa registry (single source of truth) for the
# sidereal readout, incl. its alias table so keys like 'kp' resolve. Guarded import
# so ACG never hard-fails if that module moves.
try:
    from astrostudy.india.india_chart_kernel import INDIA_AYANAMSA_MODES as _AYAN_MODES
    from astrostudy.india.india_chart_kernel import INDIA_AYANAMSA_ALIASES as _AYAN_ALIASES
except Exception:
    _AYAN_MODES = {}
    _AYAN_ALIASES = {}

ACG_LIST_OBJECTS = [
    const.SUN, const.MOON, const.MERCURY, const.VENUS, const.MARS, const.JUPITER, const.SATURN,
    const.URANUS, const.NEPTUNE, const.PLUTO, const.NORTH_NODE, const.CHIRON,
    const.SOUTH_NODE, const.DARKMOON, const.PURPLE_CLOUDS
]

ACG_LIST_OBJECTS_NOCHIRON = [
    const.SUN, const.MOON, const.MERCURY, const.VENUS, const.MARS, const.JUPITER, const.SATURN,
    const.URANUS, const.NEPTUNE, const.PLUTO, const.NORTH_NODE,
    const.SOUTH_NODE, const.DARKMOON, const.PURPLE_CLOUDS
]

# flatlib object id → Swiss Ephemeris planet number (heliocentric / CCG recompute).
SWE_NUM = {
    const.SUN: swisseph.SUN, const.MOON: swisseph.MOON, const.MERCURY: swisseph.MERCURY,
    const.VENUS: swisseph.VENUS, const.MARS: swisseph.MARS, const.JUPITER: swisseph.JUPITER,
    const.SATURN: swisseph.SATURN, const.URANUS: swisseph.URANUS, const.NEPTUNE: swisseph.NEPTUNE,
    const.PLUTO: swisseph.PLUTO, const.CHIRON: swisseph.CHIRON,
}

# CCG(Cyclo-Carto-Graphy, Lewis 1982)标准混合:内行星用二次推运、外行星用行运(文献常用)。
CCG_PROGRESSED_SET = {const.SUN, const.MOON, const.MERCURY, const.VENUS, const.MARS}
# Heliocentric view (§ coord): only Sun-orbiting bodies have a heliocentric position.
# The Sun becomes Earth (helio Earth = geo Sun ± 180°); Moon/nodes/Lilith/紫炁 are
# geocentric-only and are omitted from the heliocentric map.
HELIO_OBJECTS = [
    const.SUN, const.MERCURY, const.VENUS, const.MARS, const.JUPITER, const.SATURN,
    const.URANUS, const.NEPTUNE, const.PLUTO, const.CHIRON,
]

# Astrocartography line geometry, analytic (Jim Lewis in-mundo) method.
# Conventions: longitude east-positive, normalised to (-180, 180]; degrees.

# Latitude sampling step (degrees) for the rising/setting great-circle curves.
ACG_LAT_STEP = 0.5

# Fallback obliquity if swisseph nutation lookup is unavailable.
DEFAULT_OBLIQUITY = 23.4392911

# Local-space great circle sampling step (degrees of arc).
LS_STEP = 3

# Aspect-to-angle line set (§3.1). Conjunction/opposition already == MC/IC lines.
ACG_ASPECTS = [60.0, 90.0, 120.0, 45.0, 135.0]

# Geodetic schools (§7/§21): 0°Aries terrestrial longitude (east+). Sepharial/McRae put
# 0°Aries at Greenwich; Johndro's zero point is disputed → default West 30° (documented).
GEODETIC_ZERO = {'sepharial': 0.0, 'mcrae': 0.0, 'johndro': -30.0}

# House-system friendly names → Swiss Ephemeris single-char codes (§15). Also accepts
# a raw 1-char code directly. High-latitude failures fall back to Porphyry ('O').
HSYS_MAP = {
    'placidus': b'P', 'koch': b'K', 'whole': b'W', 'wholesign': b'W',
    'equal': b'A', 'equalasc': b'A', 'equalmc': b'D', 'vehlow': b'V', 'aries': b'N',
    'porphyry': b'O', 'alcabitius': b'B', 'regiomontanus': b'R', 'campanus': b'C',
    'topocentric': b'T', 'meridian': b'X', 'axial': b'X', 'morinus': b'M',
    'krusinski': b'U', 'apc': b'Y', 'horizon': b'H', 'gauquelin': b'G',
    'carter': b'F', 'sunshine': b'I', 'sripati': b'S', 'pullensd': b'L', 'pullensr': b'Q',
}
HSYS_HIGH_LAT_SAFE = set(b'AEDVWNORCMXUFHG')   # 高纬有定义者(Placidus/Koch/Topo 近极失效)


def hsys_code(hsys):
    """ Friendly name or raw 1-char code → swe byte code (default Whole Sign). """
    if not hsys:
        return b'W'
    s = str(hsys)
    if len(s) == 1:
        return s.encode()
    return HSYS_MAP.get(s.lower().replace(' ', '').replace('-', ''), b'W')

# Fixed stars for ACG lines / Starlight parans (Brady). Swiss Ephemeris resolves each
# by traditional name from sefstars; Chinese names are public 古天文 asterism names.
# (sweName, 中文名, key). ~18 brightest / most-used named stars keeps lines readable.
ACG_STARS = [
    ('Sirius', '天狼', 'sirius'), ('Canopus', '老人', 'canopus'), ('Arcturus', '大角', 'arcturus'),
    ('Vega', '织女一', 'vega'), ('Capella', '五车二', 'capella'), ('Rigel', '参宿七', 'rigel'),
    ('Procyon', '南河三', 'procyon'), ('Betelgeuse', '参宿四', 'betelgeuse'), ('Altair', '河鼓二', 'altair'),
    ('Aldebaran', '毕宿五', 'aldebaran'), ('Antares', '心宿二', 'antares'), ('Spica', '角宿一', 'spica'),
    ('Pollux', '北河三', 'pollux'), ('Fomalhaut', '北落师门', 'fomalhaut'), ('Deneb', '天津四', 'deneb'),
    ('Regulus', '轩辕十四', 'regulus'), ('Algol', '大陵五', 'algol'), ('Alcyone', '昴宿六', 'alcyone'),
]

# Parans are computed only for the main planets to keep the latitude-line set readable.
PARAN_OBJECTS = [
    const.SUN, const.MOON, const.MERCURY, const.VENUS, const.MARS,
    const.JUPITER, const.SATURN, const.URANUS, const.NEPTUNE, const.PLUTO,
]
PARAN_EVENTS = ['rise', 'set', 'mc', 'ic']
PARAN_LAT_LIMIT = 66.0
# Default to luminary parans (a pair involving the Sun or Moon) — the classic, readable set.
PARAN_LUMINARIES = [const.SUN, const.MOON]


def norm360(x):
    return x % 360.0


def norm180(x):
    return (x + 180.0) % 360.0 - 180.0


def findMundaneEvent(kind, jd_from, direction='next'):
    """ 世运事件时刻(UTC jd):solar_eclipse / lunar_eclipse(swe when 系列)、
    aries/cancer/libra/capricorn_ingress(swe.solcross 太阳过 0/90/180/270)、
    newmoon / fullmoon(日月角差根搜,±180 wrap 幅度守卫)。找不到返回 None。 """
    back = (direction == 'prev')
    try:
        if kind in ('solar_eclipse', 'lunar_eclipse'):
            fn = swisseph.sol_eclipse_when_glob if kind == 'solar_eclipse' else swisseph.lun_eclipse_when
            r = fn(jd_from, swisseph.FLG_SWIEPH, 0, back)
            return float(r[1][0])
        if kind in ('aries_ingress', 'cancer_ingress', 'libra_ingress', 'capricorn_ingress'):
            tgt = {'aries_ingress': 0.0, 'cancer_ingress': 90.0,
                   'libra_ingress': 180.0, 'capricorn_ingress': 270.0}[kind]
            if back:
                t = swisseph.solcross(tgt, jd_from - 400.0)
                nxt = swisseph.solcross(tgt, t + 1.0)
                while nxt < jd_from:
                    t = nxt
                    nxt = swisseph.solcross(tgt, t + 1.0)
                return float(t)
            return float(swisseph.solcross(tgt, jd_from))
        if kind in ('newmoon', 'fullmoon'):
            off = 0.0 if kind == 'newmoon' else 180.0

            def f(j):
                s = swisseph.calc_ut(j, swisseph.SUN, swisseph.FLG_SWIEPH)[0][0]
                m = swisseph.calc_ut(j, swisseph.MOON, swisseph.FLG_SWIEPH)[0][0]
                return norm180(m - s - off)
            step = -1.0 if back else 1.0
            j = jd_from
            f0 = f(j)
            for _ in range(35):
                j2 = j + step
                f2 = f(j2)
                # 幅度守卫:±180 wrap 处 -178→+178 的假变号要排除
                if abs(f0) < 90.0 and abs(f2) < 90.0 and f0 * f2 <= 0.0:
                    lo, hi = (j, j2) if not back else (j2, j)
                    flo = f(lo)
                    for _ in range(45):
                        mid = (lo + hi) / 2.0
                        fm = f(mid)
                        if (flo <= 0.0) == (fm <= 0.0):
                            lo, flo = mid, fm
                        else:
                            hi = mid
                    return (lo + hi) / 2.0
                j, f0 = j2, f2
    except Exception:
        return None
    return None


class ACGraph:
    def __init__(self, data):
        date = data['date']
        self.time = data['time']
        self.zone = data['zone']
        self.lat = data['lat']
        self.lon = data['lon']

        parts = date.split('/')
        if len(parts) == 1:
            parts = date.split('-')
        if len(parts) == 4:
            self.year = '-{0}'.format(parts[1])
            self.month = parts[2]
            self.day = parts[3]
        else:
            self.year = parts[0]
            self.month = parts[1]
            self.day = parts[2]

        self.date = '{0}/{1}/{2}'.format(self.year, self.month, self.day)
        if 'ad' in data.keys():
            if int(data['ad']) == 1:
                pass
            else:
                if self.date[0:1] != '-':
                    self.date = '-{0}'.format(self.date)
                    self.year = '-{0}'.format(self.year)

        self.zodiacal = const.TROPICAL
        self.house = const.HOUSES_WHOLE_SIGN

        # ── 口径开关(默认=现状,零回归) ──
        # mode: 'mundo' 本体(真黄纬 β,Jim Lewis 原版,默认) | 'zodiac' 黄道度(β=0)
        self.mode = str(data.get('mode', 'mundo')).lower()
        if self.mode not in ('mundo', 'zodiac'):
            self.mode = 'mundo'
        # lsMode: 'great' 大圆(Erlewine,默认) | 'rhumb' 等角航线(墨卡托直线)
        self.lsMode = str(data.get('lsMode', 'great')).lower()
        if self.lsMode not in ('great', 'rhumb'):
            self.lsMode = 'great'
        # geodetic 地理等价流派(§7):sepharial(默认)/mcrae/johndro;变体 longitude(默认)/ra
        self.geodetic = str(data.get('geodetic', 'sepharial')).lower()
        if self.geodetic not in GEODETIC_ZERO:
            self.geodetic = 'sepharial'
        self.geodeticVar = str(data.get('geodeticVar', 'longitude')).lower()
        if self.geodeticVar not in ('longitude', 'ra'):
            self.geodeticVar = 'longitude'
        # cuspLines 十二宫尖线(§17.2)opt-in(逐纬度 root-find,较贵,默认关=零开销零回归)
        self.cuspLines = str(data.get('cuspLines', '0')) in ('1', 'true', 'True', 'yes')
        self.acgHsys = hsys_code(data.get('hsys', 'placidus')) if self.cuspLines else b'P'
        # coord 坐标系:'geo' 地心(默认,现状零回归) | 'helio' 日心(仅绕日天体,日→地)
        self.coord = str(data.get('coord', 'geo')).lower()
        if self.coord not in ('geo', 'helio'):
            self.coord = 'geo'
        # ayanamsa 恒星黄道读数(默认''=回归/tropical,零回归):非空且在 47 注册表内才启用,
        # 仅作恒星度标注(sidLon + 落点面板恒星列),不改任何"物理"线几何(升落/中天恒相同)。
        self.ayanamsa = str(data.get('ayanamsa', '')).lower().strip().replace('-', '_')
        self.ayanamsa = _AYAN_ALIASES.get(self.ayanamsa, self.ayanamsa)   # 别名→规范键(kp→krishnamurti)
        if self.ayanamsa not in _AYAN_MODES:
            self.ayanamsa = ''
        self.ayanVal = None
        # stars 固定星线 + Starlight 交映 parans(§ · Brady):opt-in(较贵,默认关=零开销零回归)
        self.stars = str(data.get('stars', '0')) in ('1', 'true', 'True', 'yes')
        # CCG 时间地图(Lewis 1982):对行运/推运位置画 ACG 线,与重置盘四角比对 = 用出生
        # 时刻框架(natal gmst/eps)投影。opt-in:提供 ccgDate 才启用(默认关=零回归)。
        # ccgMix:mixed(文献标准:内行星二推/外行星行运,默认)| transit 全行运 | progressed 全二推。
        self.ccgDate = str(data.get('ccgDate', '')).strip()
        self.ccgTime = str(data.get('ccgTime', '12:00:00')).strip() or '12:00:00'
        self.ccgMix = str(data.get('ccgMix', 'mixed')).lower()
        if self.ccgMix not in ('mixed', 'transit', 'progressed'):
            self.ccgMix = 'mixed'

        self.dateTime = Datetime(self.date, self.time, self.zone)
        self.pos = GeoPos(self.lat, self.lon)

        # ── 关系盘(§18):relMode + B 盘出生数据(relDate 缺失=关,零回归) ──
        # davison 时空中点真实盘(时间 jd 平均/地点算术平均·经度最短弧,astro.com 古典口径)
        # composite 中点合盘(行星=两盘对应行星短弧中点,β=0 合成点) | synastry 双人线叠加
        self.relMode = str(data.get('relMode', '')).lower()
        if self.relMode not in ('davison', 'composite', 'synastry'):
            self.relMode = ''
        self.relData = None
        self.chartB = None
        self.davison = None
        if self.relMode:
            rd = str(data.get('relDate', '')).strip().replace('-', '/') or ''
            if not rd:
                self.relMode = ''
            else:
                self.relData = {
                    'date': rd,
                    'time': str(data.get('relTime', '12:00:00')).strip() or '12:00:00',
                    'zone': str(data.get('relZone', self.zone)).strip() or self.zone,
                    'lat': str(data.get('relLat', self.lat)),
                    'lon': str(data.get('relLon', self.lon)),
                }
        if self.relMode == 'davison' and self.relData:
            try:
                dtB = Datetime(self.relData['date'], self.relData['time'], self.relData['zone'])
                posB = GeoPos(self.relData['lat'], self.relData['lon'])
                jd_mid = (self.dateTime.jd + dtB.jd) / 2.0
                y, m, d, h = swisseph.revjul(jd_mid)
                hh = int(h)
                mi = int((h - hh) * 60.0)
                ss = int(round(((h - hh) * 60.0 - mi) * 60.0))
                if ss >= 60:
                    ss -= 60
                    mi += 1
                if mi >= 60:
                    mi -= 60
                    hh += 1
                latD = (self.pos.lat + posB.lat) / 2.0
                lonD = norm180(self.pos.lon + norm180(posB.lon - self.pos.lon) / 2.0)
                self.dateTime = Datetime('{0}/{1:02d}/{2:02d}'.format(y, m, d),
                                         '{0:02d}:{1:02d}:{2:02d}'.format(hh, mi, ss), '+00:00')
                self.pos = GeoPos(latD, lonD)
                self.davison = {'date': '{0}/{1:02d}/{2:02d}'.format(y, m, d),
                                'time': '{0:02d}:{1:02d}:{2:02d}'.format(hh, mi, ss),
                                'lat': round(latD, 4), 'lon': round(lonD, 4)}
            except Exception:
                self.relMode = ''
                self.davison = None

        self.objlists = ACG_LIST_OBJECTS
        jd = self.dateTime.jd
        noChiron = jd > 3419437.5 or jd < 1967601.5
        if noChiron:
            self.objlists = ACG_LIST_OBJECTS_NOCHIRON
        if self.coord == 'helio':
            self.objlists = [o for o in HELIO_OBJECTS if not (noChiron and o == const.CHIRON)]
        self.jd = jd

        # 恒星黄道 ayanamsa 度数(set_sid_mode→get_ayanamsa_ut 相邻两行;swisseph 全局态,
        # flatlib 走 tropical 不受影响,故先算本盘再取此值不污染)。失败=退回 tropical。
        if self.ayanamsa:
            try:
                swisseph.set_sid_mode(_AYAN_MODES[self.ayanamsa]['mode'], 0, 0)
                self.ayanVal = float(swisseph.get_ayanamsa_ut(jd))
            except Exception:
                self.ayanVal = None
                self.ayanamsa = ''

        self.chart = Chart(self.dateTime, self.pos, self.zodiacal, hsys=self.house,
                           IDs=self.objlists, needpars=False)
        # composite 中点合盘需要 B 盘行星(合成点在 _objPos 取短弧中点)
        if self.relMode == 'composite' and self.relData:
            try:
                dtB = Datetime(self.relData['date'], self.relData['time'], self.relData['zone'])
                posB = GeoPos(self.relData['lat'], self.relData['lon'])
                self.chartB = Chart(dtB, posB, self.zodiacal, hsys=self.house,
                                    IDs=self.objlists, needpars=False)
            except Exception:
                self.relMode = ''
                self.chartB = None

        self.eps = self._obliquity(jd)
        self.theta0 = self._gmst(jd)

    # ----- astronomical primitives -------------------------------------------------

    def _obliquity(self, jd):
        """ True obliquity of the ecliptic (degrees). """
        try:
            nut = swisseph.calc_ut(jd, swisseph.ECL_NUT, swisseph.FLG_SWIEPH)[0]
            return nut[0]
        except Exception:
            return DEFAULT_OBLIQUITY

    def _gmst(self, jd):
        """ Greenwich (apparent) sidereal time in degrees. """
        try:
            return norm360(swisseph.sidtime(jd) * 15.0)
        except Exception:
            # ARMC (apparent RA of MC) at birth == apparent LST == gmst + birthLon
            try:
                _, ascmc = swisseph.houses(jd, self.pos.lat, self.pos.lon, b'P')
            except swisseph.Error:
                _, ascmc = swisseph.houses(jd, self.pos.lat, self.pos.lon, b'W')
            return norm360(ascmc[2] - self.pos.lon)

    def _radec(self, lon, lat):
        """ Apparent right ascension / declination for ecliptic (lon, lat) in degrees.

        mode='mundo': uses the object's true ecliptic latitude β (in-mundo, Jim Lewis).
        mode='zodiac': uses β=0 (the zodiacal degree of the body) — lines differ from
        in-mundo in proportion to β (Moon/Pluto/fixed stars offset by degrees).
        Works for every object including computed points (月孛/紫炁).
        """
        beta = 0.0 if self.mode == 'zodiac' else lat
        eq = swisseph.cotrans([lon, beta, 1.0], -self.eps)
        return norm360(eq[0]), eq[1]

    def _objPos(self, oid):
        """ Ecliptic (lon, lat) of an object under the active coordinate system.
        coord='geo'(默认): flatlib geocentric — byte-identical to before.
        coord='helio': Swiss Ephemeris heliocentric; the Sun is mapped to the Earth
        (helio Earth = geo Sun ± 180°). Returns (None, None) for bodies with no
        heliocentric meaning so the caller skips them.
        relMode='composite': 合盘行星 = 两盘对应行星短弧中点(合成点无真黄纬,β=0)。 """
        if self.relMode == 'composite' and self.chartB is not None:
            try:
                a = self.chart.getObject(oid)
                b = self.chartB.getObject(oid)
            except Exception:
                return None, None
            return norm360(a.lon + norm180(b.lon - a.lon) / 2.0), 0.0
        if self.coord == 'helio':
            num = SWE_NUM.get(oid)
            if num is None:
                return None, None
            try:
                if oid == const.SUN:   # 日心视角下"太阳"= 地球(= 地心太阳 ±180°)
                    xx, _ = swisseph.calc_ut(self.jd, swisseph.SUN, swisseph.FLG_SWIEPH)
                    return norm360(xx[0] + 180.0), 0.0
                xx, _ = swisseph.calc_ut(self.jd, num, swisseph.FLG_SWIEPH | swisseph.FLG_HELCTR)
                return norm360(xx[0]), xx[1]
            except swisseph.Error:
                return None, None
        obj = self.chart.getObject(oid)
        return obj.lon, obj.lat

    def createChart(self, lat, lon, planetid):
        """ Relocated chart at (lat, lon) for a single object. Kept for point reports. """
        pos = GeoPos(lat, lon)
        ids = [planetid]
        return Chart(self.dateTime, pos, self.zodiacal, hsys=self.house, IDs=ids, needpars=False)

    # ----- planet/angle lines ------------------------------------------------------

    def _mcLon(self, ra):
        """ Longitude of the MC (upper culmination) meridian for right ascension ra. """
        return norm180(ra - self.theta0)

    def _icLon(self, ra):
        return norm180(ra - self.theta0 + 180.0)

    def _ascDescLines(self, ra, dec):
        """ Rising (Asc) and setting (Dsc) great-circle curves.

        For each geographic latitude phi the body is on the horizon at hour angle
        +/-H where cos H = -tan(phi) tan(dec). LST = ra -/+ H, longitude = LST - gmst.
        Where |cos H| > 1 the body is circumpolar / never rises at that latitude, so
        the curve simply terminates (the characteristic polar "hook").
        """
        asc = []
        desc = []
        tanDec = math.tan(math.radians(dec))
        # Body rises/sets where |tan(phi)*tan(dec)| <= 1, i.e. |phi| <= 90 - |dec|.
        band = 89.5 if abs(tanDec) < 1e-6 else min(89.5, 90.0 - abs(dec))
        if band <= 0:
            return asc, desc
        # Fine sampling + EXACT band endpoints so the curve is smooth and closes onto
        # the MC/IC meridians (at |phi|=band, H=0 or 180 -> asc/desc reach MC/IC longitude).
        lats = []
        la = -band
        while la < band:
            lats.append(la)
            la += ACG_LAT_STEP
        lats.append(band)
        for la in lats:
            c = -math.tan(math.radians(la)) * tanDec
            if c < -1.0:
                c = -1.0
            elif c > 1.0:
                c = 1.0
            H = math.degrees(math.acos(c))
            asc.append({'lat': la, 'lon': norm180(ra - H - self.theta0)})
            desc.append({'lat': la, 'lon': norm180(ra + H - self.theta0)})
        return asc, desc

    # ----- geographic reference lines ----------------------------------------------

    def _hLine(self, lat):
        # Multi-point parallel of latitude. A 2-point [-180..180] line is degenerate on
        # the antimeridian (d3.geoPath clips it to nothing) — sample across the span.
        pts = [{'lat': lat, 'lon': float(l)} for l in range(-179, 180, 20)]
        pts.append({'lat': lat, 'lon': 179.0})
        return pts

    def _geoLines(self):
        equator = self._hLine(0.0)
        tropicN = self._hLine(self.eps)
        tropicS = self._hLine(-self.eps)
        # Ecliptic-overhead curve: zenith lies on the ecliptic <=> tan(phi)=tan(eps) sin(LST)
        tanEps = math.tan(math.radians(self.eps))
        ecliptic = []
        ilon = -180
        while ilon <= 180:
            lst = math.radians(self.theta0 + ilon)
            phi = math.degrees(math.atan(tanEps * math.sin(lst)))
            ecliptic.append({'lat': phi, 'lon': float(ilon)})
            ilon += 3
        return {
            'equator': equator,
            'tropicN': tropicN,
            'tropicS': tropicS,
            'ecliptic': ecliptic,
        }

    # ----- local space lines -------------------------------------------------------

    def _localSpace(self, ra, dec):
        """ Local-space line from the birthplace along the body's compass azimuth.

        lsMode='great' (default): great circle (orthodrome, wraps the globe).
        lsMode='rhumb': loxodrome — keeps a constant compass bearing (straight on
        Mercator), spirals toward the pole; drawn both directions through birthplace.
        """
        phi0 = math.radians(self.pos.lat)
        lon0 = self.pos.lon
        H0 = math.radians(norm360(self.theta0 + lon0 - ra))
        decr = math.radians(dec)
        az = math.atan2(-math.cos(decr) * math.sin(H0),
                        math.cos(phi0) * math.sin(decr) - math.sin(phi0) * math.cos(decr) * math.cos(H0))
        if self.lsMode == 'rhumb':
            return self._lsRhumb(self.pos.lat, lon0, math.degrees(az))
        pts = []
        d = 0
        while d <= 360:
            dr = math.radians(d)
            latr = math.asin(math.sin(phi0) * math.cos(dr) + math.cos(phi0) * math.sin(dr) * math.cos(az))
            lonr = math.atan2(math.sin(az) * math.sin(dr) * math.cos(phi0),
                              math.cos(dr) - math.sin(phi0) * math.sin(latr))
            pts.append({'lat': math.degrees(latr), 'lon': norm180(lon0 + math.degrees(lonr))})
            d += LS_STEP
        return pts

    def _lsRhumb(self, lat0, lon0, bearing_deg):
        """ Rhumb (loxodrome) sample points through (lat0,lon0), both directions. """
        phi1 = math.radians(lat0)
        lam1 = math.radians(lon0)

        def point(bearing, dist):
            theta = math.radians(bearing)
            delta = math.radians(dist)
            dphi = delta * math.cos(theta)
            phi2 = max(min(phi1 + dphi, math.pi / 2 - 1e-9), -math.pi / 2 + 1e-9)
            dpsi = math.log(math.tan(math.pi / 4 + phi2 / 2) / math.tan(math.pi / 4 + phi1 / 2))
            q = (phi2 - phi1) / dpsi if abs(dpsi) > 1e-12 else math.cos(phi1)
            dlam = delta * math.sin(theta) / q if abs(q) > 1e-12 else 0.0
            return {'lat': math.degrees(phi2), 'lon': norm180(math.degrees(lam1 + dlam))}

        def sample(bearing):
            out = []
            d = 0.0
            while d <= 180.0:
                pt = point(bearing, d)
                out.append(pt)
                if abs(pt['lat']) > 84.0:   # 近极点螺旋无意义 → 停止取样
                    break
                d += LS_STEP
            return out

        back = sample((bearing_deg + 180.0) % 360.0)[1:]   # 去掉出生地重复点
        fwd = sample(bearing_deg % 360.0)
        back.reverse()
        return back + fwd

    # ----- aspect lines (§3.1) -----------------------------------------------------

    def _aspectMeridian(self, target_mc_lon):
        """ Vertical meridian whose MC ecliptic degree == target_mc_lon (zodiacal). """
        ra = swisseph.cotrans([norm360(target_mc_lon), 0.0, 1.0], -self.eps)[0]
        return norm180(norm360(ra) - self.theta0)

    def _aspectLines(self, plon):
        """ Aspect-to-MC/IC meridians for a planet's zodiacal longitude.

        Conjunction(0)/opposition(180) coincide with the existing MC/IC lines, so
        only the 60/90/120 (and minor 45/135) aspects add new lines. Dedup rule
        (§3.1): aspect X to MC == (180−X) to IC, so listing ±X to the MC covers both.
        """
        out = []
        for asp in ACG_ASPECTS:
            for sign in (-1.0, 1.0):
                out.append({'aspect': int(asp), 'sign': int(sign),
                            'lon': self._aspectMeridian(plon + sign * asp)})
        return out

    def _eastWestLines(self, plon):
        """ East Point / West Point (equatorial ascendant) meridians (§16).

        East Point = the ecliptic point whose RA == RAMC+90°, so the planet sits on
        the East Point where its zodiacal RA == RAMC+90 → RAMC = RA−90 → vertical line.
        West Point = East Point + 180° in RAMC. Both are latitude-independent meridians.
        """
        ra_z = norm360(swisseph.cotrans([norm360(plon), 0.0, 1.0], -self.eps)[0])
        return {
            'ep': {'lon': norm180(ra_z - 90.0 - self.theta0)},
            'wp': {'lon': norm180(ra_z + 90.0 - self.theta0)},
        }

    def _antisciaLines(self, plon):
        """ Antiscion (180−λ, 至点轴镜像) / contra-antiscion (−λ, 分点轴镜像) MC 子午线(§17.5). """
        return {
            'antiscion': {'lon': self._aspectMeridian(180.0 - plon), 'deg': round(norm360(180.0 - plon), 3)},
            'contra': {'lon': self._aspectMeridian(-plon), 'deg': round(norm360(-plon), 3)},
        }

    def _cuspLines(self, plon):
        """ House-cusp lines (§17.2): locus where a relocated intermediate house cusp equals
        the planet's zodiac degree. Per-latitude root-find on ARMC (opt-in, coarse sampling).
        High-latitude Placidus failures terminate the curve naturally. """
        if not self.cuspLines:
            return None
        code = self.acgHsys
        eps = self.eps
        mids = [(2, 1), (3, 2), (5, 4), (6, 5), (8, 7), (9, 8), (11, 10), (12, 11)]  # (house, cusp index)
        out = {str(h): [] for h, _ in mids}

        def cuspval(armc, lat, hi):
            try:
                cs, _ = swisseph.houses_armc(armc, lat, eps, code)
            except Exception:
                return None
            return norm180(cs[hi] - plon)

        la = -60.0
        while la <= 60.0:
            for h, hi in mids:
                prev = cuspval(0.0, la, hi)
                prev_a = 0.0
                a = 6.0
                while a <= 360.0:
                    cur = cuspval(a, la, hi)
                    if prev is not None and cur is not None and abs(prev) < 90.0 and abs(cur) < 90.0 and prev * cur <= 0.0:
                        lo, hi2, flo = prev_a, a, prev
                        for _ in range(18):
                            mid = (lo + hi2) / 2.0
                            fm = cuspval(mid, la, hi)
                            if fm is None:
                                break
                            if flo * fm <= 0.0:
                                hi2 = mid
                            else:
                                lo, flo = mid, fm
                        out[str(h)].append({'lat': la, 'lon': norm180((lo + hi2) / 2.0 - self.theta0)})
                        break
                    prev_a, prev = a, cur
                    a += 6.0
            la += 3.0
        for k in out:
            out[k].sort(key=lambda p: p['lat'])
        return out

    def _lotsLines(self):
        """ Arabic Parts / Lots lines (§3.5): Part of Fortune / Spirit as frozen virtual
        longitudes (using the birth ASC) → MC/IC meridians. Day/night reverses the formula. """
        try:
            asc = self.chart.get(const.ASC).lon
            sun = self.chart.getObject(const.SUN).lon
            moon = self.chart.getObject(const.MOON).lon
            day = self.chart.isDiurnal()
        except Exception:
            return {}
        fortune = norm360(asc + (moon - sun if day else sun - moon))
        spirit = norm360(asc + (sun - moon if day else moon - sun))
        return {
            'day': day,
            'fortune': {'deg': round(fortune, 3), 'mc': {'lon': self._aspectMeridian(fortune)},
                        'ic': {'lon': self._aspectMeridian(fortune + 180.0)}},
            'spirit': {'deg': round(spirit, 3), 'mc': {'lon': self._aspectMeridian(spirit)},
                       'ic': {'lon': self._aspectMeridian(spirit + 180.0)}},
        }

    def _midpointLines(self, plon_map):
        """ Midpoint (short-arc) MC meridians for every main-planet pair (§3.2). """
        ids = [i for i in PARAN_OBJECTS if i in plon_map]
        out = []
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                a = plon_map[ids[i]]
                b = plon_map[ids[j]]
                mid = norm360(a + norm180(b - a) / 2.0)
                out.append({'a': ids[i], 'b': ids[j], 'deg': round(mid, 3), 'lon': self._aspectMeridian(mid)})
        return out

    def _geodeticLines(self, plon):
        """ Geodetic MC/IC meridians (§7): map the planet's zodiac degree to a terrestrial
        longitude with 0°Aries fixed at the school's zero meridian. Time-independent mapping
        (not gmst-based) — distinct from the ACG lines. variant='ra' first converts to RA. """
        if self.geodeticVar == 'ra':
            val = norm360(swisseph.cotrans([norm360(plon), 0.0, 1.0], -self.eps)[0])
        else:
            val = norm360(plon)
        mc = norm180(val + GEODETIC_ZERO.get(self.geodetic, 0.0))
        return {'mc': {'lon': mc}, 'ic': {'lon': norm180(mc + 180.0)}}

    def _vertexLines(self, plon):
        """ Vertex / Antivertex curves (§16): locus where the relocated Vertex equals
        the planet's zodiacal degree. Vertex = ASC at co-latitude (90−φ) on the west,
        so cos Hv = −cot(φ)·tan(dec); RAMC = RA ± Hv − 180 → lon = RAMC − gmst.
        Latitude-dependent → a mid/high-latitude curve (undefined near the equator). """
        eq = swisseph.cotrans([norm360(plon), 0.0, 1.0], -self.eps)
        ra = norm360(eq[0])
        tanDec = math.tan(math.radians(eq[1]))
        vtx, avtx = [], []
        la = 12.0
        while la <= 84.0:
            for sgn in (1.0, -1.0):
                phi = sgn * la
                t = math.tan(math.radians(phi))
                if abs(t) < 1e-9:
                    continue
                c = -(tanDec / t)
                if -1.0 <= c <= 1.0:
                    hv = math.degrees(math.acos(c))
                    vtx.append({'lat': phi, 'lon': norm180(ra - hv - 180.0 - self.theta0)})
                    avtx.append({'lat': phi, 'lon': norm180(ra + hv - 180.0 - self.theta0)})
            la += ACG_LAT_STEP
        vtx.sort(key=lambda p: p['lat'])
        avtx.sort(key=lambda p: p['lat'])
        return vtx, avtx

    # ----- parans (latitude crossing lines) ----------------------------------------

    def _eventLST(self, event, ra, dec, phi):
        if event == 'mc':
            return ra
        if event == 'ic':
            return norm360(ra + 180.0)
        c = -math.tan(math.radians(phi)) * math.tan(math.radians(dec))
        if c < -1.0 or c > 1.0:
            return None
        H = math.degrees(math.acos(c))
        return norm360(ra - H) if event == 'rise' else norm360(ra + H)

    def _fixedVarLats(self, c, event, ra, dec):
        """ One body fixed on the meridian (LST=c); solve the rising/setting latitude of the other. """
        H = norm360(ra - c) if event == 'rise' else norm360(c - ra)
        if H > 180.0:
            return []
        tand = math.tan(math.radians(dec))
        if abs(tand) < 1e-9:
            return []
        return [math.degrees(math.atan(-math.cos(math.radians(H)) / tand))]

    def _varVarLats(self, ea, ara, adec, eb, bra, bdec):
        """ Both bodies rising/setting; root-find the latitude where their event times coincide. """
        def f(phi):
            la = self._eventLST(ea, ara, adec, phi)
            lb = self._eventLST(eb, bra, bdec, phi)
            if la is None or lb is None:
                return None
            return norm180(la - lb)
        res = []
        phi = -PARAN_LAT_LIMIT
        prev = None
        prevphi = None
        while phi <= PARAN_LAT_LIMIT:
            v = f(phi)
            if v is not None and prev is not None and abs(prev) < 90.0 and abs(v) < 90.0:
                if (prev <= 0 <= v) or (prev >= 0 >= v):
                    lo, hi, flo = prevphi, phi, prev
                    for _ in range(40):
                        mid = (lo + hi) / 2.0
                        fm = f(mid)
                        if fm is None:
                            break
                        if (flo <= 0 <= fm) or (flo >= 0 >= fm):
                            hi = mid
                        else:
                            lo, flo = mid, fm
                    res.append((lo + hi) / 2.0)
            prev, prevphi = v, phi
            phi += 1.0
        return res

    def _parans(self, bodies):
        main = [b for b in bodies if b[0] in PARAN_OBJECTS]
        res = []
        for i in range(len(main)):
            for j in range(i + 1, len(main)):
                ai, ara, adec = main[i]
                bi, bra, bdec = main[j]
                for ea in PARAN_EVENTS:
                    for eb in PARAN_EVENTS:
                        fa = ea in ('mc', 'ic')
                        fb = eb in ('mc', 'ic')
                        if fa and fb:
                            continue
                        if fa:
                            lats = self._fixedVarLats(ara if ea == 'mc' else norm360(ara + 180.0), eb, bra, bdec)
                        elif fb:
                            lats = self._fixedVarLats(bra if eb == 'mc' else norm360(bra + 180.0), ea, ara, adec)
                        else:
                            lats = self._varVarLats(ea, ara, adec, eb, bra, bdec)
                        ptype = 'RSRS' if (not fa and not fb) else 'RSCA'
                        for lat in lats:
                            if abs(lat) > PARAN_LAT_LIMIT:
                                continue
                            res.append({'lat': round(lat, 3), 'a': ai, 'aEvent': ea,
                                        'b': bi, 'bEvent': eb, 'type': ptype})
        return res

    # ----- line crossings (§3.3) ---------------------------------------------------

    def _crossings(self, planets):
        """ Points where one main planet is on the MC/IC (vertical line) and another is
        on the ASC/DSC (curve) simultaneously — Martin Davis "Destiny Points". """
        verts, curves = [], []
        for pid in PARAN_OBJECTS:
            pd = planets.get(pid)
            if not pd:
                continue
            L = pd['lines']
            verts.append((pid, 'mc', L['mc']['lon']))
            verts.append((pid, 'ic', L['ic']['lon']))
            curves.append((pid, 'asc', L['asc']))
            curves.append((pid, 'desc', L['desc']))
        out = []
        for pv, av, lonv in verts:
            for pc, ac, pts in curves:
                if pv == pc or not pts:
                    continue
                for k in range(len(pts) - 1):
                    a = pts[k]
                    b = pts[k + 1]
                    if abs(norm180(b['lon'] - a['lon'])) > 90.0:
                        continue                          # skip antimeridian wrap
                    la = norm180(a['lon'] - lonv)
                    lb = norm180(b['lon'] - lonv)
                    if abs(la) < 90.0 and abs(lb) < 90.0 and la * lb <= 0.0:
                        denom = la - lb
                        t = la / denom if abs(denom) > 1e-12 else 0.0
                        lat = a['lat'] + t * (b['lat'] - a['lat'])
                        out.append({'lon': round(lonv, 3), 'lat': round(lat, 3),
                                    'a': pv, 'aAngle': av, 'b': pc, 'bAngle': ac})
                        break
        return out

    # ----- fixed stars (§ · Brady Starlight) ---------------------------------------

    def _starRaDec(self, lon, lat):
        beta = 0.0 if self.mode == 'zodiac' else lat
        eq = swisseph.cotrans([lon, beta, 1.0], -self.eps)
        return norm360(eq[0]), eq[1]

    def _starLines(self):
        """ Fixed-star MC/IC/ASC/DSC lines. Returns (list, bodies) — bodies feed parans.
        Uses each star's apparent ecliptic (λ,β); mode='zodiac' flattens β like planets. """
        if not self.stars:
            return None, []
        out = []
        bodies = []
        for sweName, cn, key in ACG_STARS:
            try:
                res = swisseph.fixstar2_ut(sweName, self.jd, swisseph.FLG_SWIEPH)
                xx = res[0] if isinstance(res[0], (list, tuple)) else res
                slon, slat = float(xx[0]), float(xx[1])
            except Exception:
                continue
            ra, dec = self._starRaDec(slon, slat)
            asc, desc = self._ascDescLines(ra, dec)
            bodies.append((key, ra, dec))
            out.append({
                'key': key, 'name': cn, 'lon': round(slon, 3), 'lat': round(slat, 3),
                'ra': round(ra, 3), 'decl': round(dec, 3),
                'zenith': {'lat': dec, 'lon': self._mcLon(ra)},
                'lines': {'mc': {'lon': self._mcLon(ra)}, 'ic': {'lon': self._icLon(ra)},
                          'asc': asc, 'desc': desc},
            })
        return out, bodies

    def _starParans(self, star_bodies, planet_bodies):
        """ Starlight parans (Brady): latitudes where a star and a planet are
        simultaneously angular (rise/set/culminate). Star × main-planet cross pairs. """
        res = []
        for si, sra, sdec in star_bodies:
            for pi, pra, pdec in planet_bodies:
                for ea in PARAN_EVENTS:
                    for eb in PARAN_EVENTS:
                        fa = ea in ('mc', 'ic')
                        fb = eb in ('mc', 'ic')
                        if fa and fb:
                            continue
                        if fa:
                            lats = self._fixedVarLats(sra if ea == 'mc' else norm360(sra + 180.0), eb, pra, pdec)
                        elif fb:
                            lats = self._fixedVarLats(pra if eb == 'mc' else norm360(pra + 180.0), ea, sra, sdec)
                        else:
                            lats = self._varVarLats(ea, sra, sdec, eb, pra, pdec)
                        for lat in lats:
                            if abs(lat) > PARAN_LAT_LIMIT:
                                continue
                            res.append({'lat': round(lat, 3), 'star': si, 'sEvent': ea,
                                        'planet': pi, 'pEvent': eb})
        return res

    # ----- CCG time maps (Lewis 1982) ----------------------------------------------

    def _ccgJd(self):
        """ Target-date jd (natal zone, default noon). Returns None when ccgDate unset/bad. """
        if not self.ccgDate:
            return None
        d = self.ccgDate.replace('-', '/')
        parts = [p for p in d.split('/') if p != '']
        if len(parts) != 3:
            return None
        try:
            dt = Datetime('{0}/{1}/{2}'.format(parts[0], parts[1], parts[2]), self.ccgTime, self.zone)
            return dt.jd
        except Exception:
            return None

    def _ccgLines(self):
        """ CCG(时间地图):对选定日期的 行运/推运 行星位置画 ACG 角化线,与重置盘四角
        比对 = 用出生时刻框架(natal gmst/eps)投影(线几何全复用)。
        混合口径(文献标准,ccgMix='mixed'):日月水金火 → 二次推运(一天=一年,仓内
        推运同口径 Δ天/365.2425);木土天海冥 → 行运。也可全行运/全二推。 """
        jd_t = self._ccgJd()
        if jd_t is None:
            return None
        jd_p = self.jd + (jd_t - self.jd) / 365.2425   # 次限:一天=一年(与 astroextra secondary 同口径)
        out = {'date': self.ccgDate, 'time': self.ccgTime, 'mix': self.ccgMix,
               'jd': round(jd_t, 6), 'jdProgressed': round(jd_p, 6), 'planets': {}}
        for pid in PARAN_OBJECTS:
            num = SWE_NUM.get(pid)
            if num is None:
                continue
            prog = (self.ccgMix == 'progressed') or (self.ccgMix == 'mixed' and pid in CCG_PROGRESSED_SET)
            try:
                xx, _ = swisseph.calc_ut(jd_p if prog else jd_t, num, swisseph.FLG_SWIEPH)
            except swisseph.Error:
                continue
            plon, plat = norm360(xx[0]), xx[1]
            ra, dec = self._radec(plon, plat)
            asc, desc = self._ascDescLines(ra, dec)
            out['planets'][pid] = {
                'kind': 'progressed' if prog else 'transit',
                'lon': round(plon, 4), 'lat': round(plat, 4),
                'ra': round(ra, 4), 'decl': round(dec, 4),
                'lines': {'mc': {'lon': self._mcLon(ra)}, 'ic': {'lon': self._icLon(ra)},
                          'asc': asc, 'desc': desc},
            }
        return out

    # ----- relocation point report -------------------------------------------------

    def pointReport(self, lat, lon, orb=2.0, hsys='whole'):
        """ Planets within orb of a local angle at (lat, lon) — planets on angles.
        Optionally reports the relocated 12 house cusps for the chosen house system
        (§15;高纬 Placidus/Koch 失效自动回退 Porphyry). Four angles unchanged. """
        chart = Chart(self.dateTime, GeoPos(lat, lon), self.zodiacal, hsys=self.house,
                      IDs=self.objlists, needpars=False)
        angids = [const.ASC, const.DESC, const.MC, const.IC]
        angs = {a: chart.get(a).lon for a in angids}
        hits = []
        for id in self.objlists:
            # 行星黄经统一走 _objPos:composite=合成中点/helio=日心,与地图线口径一致
            # (geo 默认时 _objPos 即重置盘同一 flatlib 位置——行星黄经与观察地无关,零回归)
            plon, _plat = self._objPos(id)
            if plon is None:
                continue
            best = None
            for a in angids:
                d = abs(norm180(plon - angs[a]))
                if d <= orb and (best is None or d < best['orb']):
                    best = {'planet': id, 'angle': a, 'orb': round(d, 3)}
            if best is not None:
                hits.append(best)
        hits.sort(key=lambda h: h['orb'])
        # 重置盘 12 宫尖(依所选宫制;高纬失效回退 Porphyry)
        code = hsys_code(hsys)
        cusps = None
        used = code
        try:
            cusps_raw, _ = swisseph.houses(self.jd, lat, lon, code)
            cusps = [round(c, 3) for c in cusps_raw[:12]]
        except swisseph.Error:
            try:
                cusps_raw, _ = swisseph.houses(self.jd, lat, lon, b'O')
                cusps = [round(c, 3) for c in cusps_raw[:12]]
                used = b'O'
            except swisseph.Error:
                cusps = None
        out = {
            'lat': lat,
            'lon': lon,
            'orb': orb,
            'hits': hits,
            'relocAngles': {a: round(angs[a], 3) for a in angids},
            'hsys': used.decode('ascii'),
            'cusps': cusps,
        }
        # 恒星黄道读数(选了 ayanamsa 才有;= tropical − ayanVal)——角/宫尖恒星度列
        if self.ayanVal is not None:
            out['ayanVal'] = round(self.ayanVal, 4)
            out['sidAngles'] = {a: round(norm360(angs[a] - self.ayanVal), 3) for a in angids}
            out['sidCusps'] = [round(norm360(c - self.ayanVal), 3) for c in cusps] if cusps else None
        return out

    # ----- entry point -------------------------------------------------------------

    def compute(self):
        planets = {}
        bodies = []
        plon_map = {}
        for id in self.objlists:
            plon, plat = self._objPos(id)
            if plon is None:
                continue
            ra, dec = self._radec(plon, plat)
            bodies.append((id, ra, dec))
            plon_map[id] = plon
            asc, desc = self._ascDescLines(ra, dec)
            ew = self._eastWestLines(plon)
            vtx, avtx = self._vertexLines(plon)
            planets[id] = {
                'ra': ra,
                'decl': dec,
                'lon': plon,
                'lat': plat,
                # 恒星黄经(仅标注;tropical 时为 None,零回归)
                'sidLon': round(norm360(plon - self.ayanVal), 4) if self.ayanVal is not None else None,
                # 天顶(子平点)= 行星正当头顶处;OOB 超界 = |赤纬| > 黄赤交角(超回归线)
                'zenith': {'lat': dec, 'lon': self._mcLon(ra)},
                'oob': abs(dec) > self.eps,
                'lines': {
                    'mc': {'lon': self._mcLon(ra)},
                    'ic': {'lon': self._icLon(ra)},
                    'asc': asc,
                    'desc': desc,
                    'ls': self._localSpace(ra, dec),
                    'aspects': self._aspectLines(plon),
                    'ep': ew['ep'],
                    'wp': ew['wp'],
                    'antiscia': self._antisciaLines(plon),
                    'vertex': vtx,
                    'antivertex': avtx,
                    'geodetic': self._geodeticLines(plon),
                    'cusps': self._cuspLines(plon) if id in PARAN_OBJECTS else None,
                },
            }

        star_lines, star_bodies = self._starLines()

        # synastry 双人叠加(§18.3):B 盘完整四轴线(B 用自己出生时刻的框架 gmst_B),前端双图层找交叉
        second = None
        if self.relMode == 'synastry' and self.relData:
            try:
                sub = ACGraph({'date': self.relData['date'], 'time': self.relData['time'],
                               'zone': self.relData['zone'], 'lat': self.relData['lat'],
                               'lon': self.relData['lon'], 'mode': self.mode})
                sres = sub.compute()
                second = {
                    'meta': {'gmst': sres['meta']['gmst'], 'birth': sres['meta']['birth']},
                    'planets': {pid: {'lon': v['lon'],
                                      'lines': {'mc': v['lines']['mc'], 'ic': v['lines']['ic'],
                                                'asc': v['lines']['asc'], 'desc': v['lines']['desc']}}
                                for pid, v in sres['planets'].items()},
                }
            except Exception:
                second = None

        return {
            'meta': {
                'gmst': self.theta0,
                'obliquity': self.eps,
                'jd': self.jd,
                'birth': {'lat': self.pos.lat, 'lon': self.pos.lon},
                'mode': self.mode,
                'lsMode': self.lsMode,
                'geodetic': self.geodetic,
                'geodeticVar': self.geodeticVar,
                'coord': self.coord,
                'ayanamsa': self.ayanamsa or None,
                'ayanLabel': (_AYAN_MODES.get(self.ayanamsa, {}).get('label') if self.ayanamsa else None),
                'ayanVal': round(self.ayanVal, 4) if self.ayanVal is not None else None,
                'relMode': self.relMode or None,
                'davison': self.davison,
            },
            'planets': planets,
            'geo': self._geoLines(),
            'parans': self._parans(bodies),
            'midpoints': self._midpointLines(plon_map),
            'lots': self._lotsLines(),
            'crossings': self._crossings(planets),
            'stars': star_lines,
            'starParans': self._starParans(star_bodies, [b for b in bodies if b[0] in PARAN_OBJECTS]) if self.stars else None,
            'ccg': self._ccgLines(),
            'second': second,
        }
