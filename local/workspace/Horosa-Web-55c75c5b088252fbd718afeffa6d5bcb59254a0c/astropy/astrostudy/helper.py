import jsonpickle
import datetime
from flatlib import const

from astrostudy.guostarsect.guostarsect import GuoStarSect

PD_SYNC_REV = 'pd_method_sync_v12'


def includePrimaryDirection(data):
    if data is None:
        return False
    val = data.get('includePrimaryDirection', False)
    if isinstance(val, str):
        return val.strip().lower() in ['1', 'true', 'yes', 'y', 'on']
    return bool(val)


def getPredictivesObj(data, perchart):
    if not ('predictive' in data.keys() and data['predictive']):
        return None

    perpredict = perchart.getPredict()
    predictives = {
        'firdaria': perpredict.getFirdaria(),
        'yearsystem129': perpredict.getYearSystem129()
    }
    if includePrimaryDirection(data):
        predictives['primaryDirection'] = perpredict.getPrimaryDirection()
    return predictives


def getChartDate(date):
    parts = date.split('/')
    if len(parts) == 1:
        parts = date.split('-')
    year = parts[0]
    month = parts[1]
    day = parts[2]
    return '{0}/{1}/{2}'.format(year, month, day)

def getMiddleDate(date1, time1, date2, time2):
    parts1 = date1.split('/')
    if len(parts1) == 1:
        parts1 = date1.split('-')
    tmpart1 = time1.split(':')
    parts2 = date2.split('/')
    if len(parts2) == 1:
        parts2 = date2.split('-')
    tmpart2 = time2.split(':')

    dt1 = datetime.datetime(int(parts1[0]),
                           int(parts1[1]),
                           int(parts1[2]),
                           int(tmpart1[0]),
                           int(tmpart1[1]))
    dt2 = datetime.datetime(int(parts2[0]),
                           int(parts2[1]),
                           int(parts2[2]),
                           int(tmpart2[0]),
                           int(tmpart2[1]))
    tm = (dt1.timestamp() + dt2.timestamp()) / 2
    dt = datetime.datetime.fromtimestamp(tm)
    date = dt.strftime('%Y/%m/%d')
    time = dt.strftime('%H:%M')
    obj = {
        'date': date,
        'time': time
    }
    return obj

def convertLatStrToDegree(lat):
    # 数值型纬度(十进制度)直接返回;无 n/s 方向字母的十进制字符串亦容错为浮点。
    # 否则 lat.lower()/索引会对地图选点存的浮点经纬度(部分命盘 record lat/lon 为 number)崩溃。
    if isinstance(lat, (int, float)):
        return float(lat)
    latstr = str(lat).lower()
    if ('n' not in latstr) and ('s' not in latstr):
        try:
            return float(latstr)
        except (TypeError, ValueError):
            return 0.0
    positive = 1
    parts = latstr.split('n')
    if len(parts) == 1:
        parts = latstr.split('s')
        positive = -1
    # 标准 度+分/60。原实现 `deg + 1.0/min`(应为 min/60) + else 分支 `*10` 均错
    # ('39n54'→39.0185 而非 39.9),致真太阳时经度差/时空中点盘定位偏。
    # 与前端 AstroHelper.convertLatStrToDegree、perpredict._coreParseCoord 同口径。
    try:
        min = int(parts[1]) if parts[1] else 0
    except ValueError:
        min = 0
    deg = int(parts[0])
    return (deg + min / 60.0) * positive


def convertLonStrToDegree(lon):
    # 数值型经度(十进制度)直接返回;无 e/w 方向字母的十进制字符串亦容错为浮点。
    # 否则 lon.lower()/索引会对地图选点存的浮点经纬度崩溃(合盘「'float' object has no attribute 'lower'」真因)。
    if isinstance(lon, (int, float)):
        return float(lon)
    lonstr = str(lon).lower()
    if ('e' not in lonstr) and ('w' not in lonstr):
        try:
            return float(lonstr)
        except (TypeError, ValueError):
            return 0.0
    positive = 1
    parts = lonstr.split('e')
    if len(parts) == 1:
        parts = lonstr.split('w')
        positive = -1
    # 标准 度+分/60(同 convertLatStrToDegree 的修正,'116e24'→116.4 而非 116.04)。
    try:
        min = int(parts[1]) if parts[1] else 0
    except ValueError:
        min = 0
    deg = int(parts[0])
    return (deg + min / 60.0) * positive

def splitDegree(degree):
    res = []
    deg = int(degree)
    minute = int(round((degree - deg) * 60))
    # 59.99′ 四舍五入到 60 时进位,防序列化出 '39n60' 这类非法分值
    if minute >= 60:
        deg += 1
        minute -= 60
    elif minute <= -60:
        deg -= 1
        minute += 60
    res.append(deg)
    res.append(minute)
    return res

def convertLatToStr(degree):
    deg = splitDegree(degree)
    latdeg = deg[0] if deg[0] >= 0 else -deg[0]
    latmin = deg[1] if deg[1] >= 0 else -deg[1]
    dir = 'n' if deg[0] >= 0 else 's'
    # >= 10:原 `> 10` 把恰好 10 分串成 '010'(3 位),回读解析错位
    latmin = str(latmin) if latmin >= 10 else '0' + str(latmin)
    return str(latdeg) + dir + str(latmin)

def convertLonToStr(degree):
    deg = splitDegree(degree)
    londeg = deg[0] if deg[0] >= 0 else -deg[0]
    lonmin = deg[1] if deg[1] >= 0 else -deg[1]
    dir = 'e' if deg[0] >= 0 else 'w'
    lonmin = str(lonmin) if lonmin >= 10 else '0' + str(lonmin)
    return str(londeg) + dir + lonmin


def getMiddleSpace(lat1, lon1, lat2, lon2):
    latdeg1 = convertLatStrToDegree(lat1)
    londeg1 = convertLonStrToDegree(lon1)
    latdeg2 = convertLatStrToDegree(lat2)
    londeg2 = convertLonStrToDegree(lon2)

    latdeg = (latdeg1 + latdeg2) / 2
    londeg = (londeg1 + londeg2) / 2
    obj = {
        'lat': convertLatToStr(latdeg),
        'lon': convertLonToStr(londeg)
    }
    return obj



def getChartObj(data, perchart):
    guostar = GuoStarSect(perchart)

    obj = {
        'params': {
            'birth': perchart.getBirthStr(),
            'ad': -1 if perchart.isBC else 1,
            'lat': data['lat'],
            'lon': data['lon'],
            'hsys': data['hsys'],
            'zone': data['zone'],
            'tradition': perchart.tradition,
            'zodiacal': perchart.zodiacal,
            'siderealAyanamsa': perchart.siderealAyanamsa,
            'doubingSu28': perchart.su28Mode,
            'showPdBounds': data.get('showPdBounds', 1),
            'pdtype': perchart.pdtype,
            'pdMethod': perchart.pdMethod,
            'pdTimeKey': perchart.pdTimeKey,
            'pdSyncRev': PD_SYNC_REV,
        },
        'chart': perchart.getChartObj(),
        'receptions': perchart.getReceptions(),
        'mutuals': perchart.getMutuals(),
        'declParallel': perchart.getParallel(),
        'aspects': {
            'normalAsp': perchart.getAspects(),
            'immediateAsp': perchart.getImmediateAspects(),
            'signAsp': perchart.getSignAspects()
        },
        'lots': perchart.getPars(perchart.chart),
        'surround': {
            'planets': perchart.surroundPlanets(),
            'attacks': perchart.surroundAttacks(),
            'houses': perchart.surroundHouses()
        },
        'guoStarSect': {
            'houses': guostar.allTerm()
        }
    }

    if 'name' in data.keys():
        obj['params']['name'] = data['name']

    predictives = getPredictivesObj(data, perchart)
    if predictives is not None:
        obj['predictives'] = predictives

    return obj

def getChartJson(data, perchart):
    obj = getChartObj(data, perchart)
    res = jsonpickle.encode(obj, unpicklable=False)
    return res

def distance(ang1, ang2):
    # 有符号最短弧 ang1-ang2,范围 (-180, 180]。
    # 原实现只在 270°/90° 两个窗口做回绕,中段大分离(如 100,300)返回 -200 而非 +160,
    # 致日返寻根从年初种子倒走、收敛到上一年返照。本式对原正确分支逐值相等,只救中段。
    return (ang1 - ang2 + 180) % 360 - 180

def absDistance(ang1, ang2):
    # ang1 → ang2 的顺行弧长 [0, 360)。原通用分支即此语义,但第二窗口
    # `360-ang2-ang1` 把 +ang1 误写成 -ang1(如 (10,350) 得 0 而非 340),
    # 致月返寻根在该窗口种子步长归零、把种子时间当返照返回。本式对原正确分支逐值相等。
    return (ang2 - ang1) % 360

def isLeap(year):
    if year == 4:
        return False
    if year <= 1582:
        if year % 4 == 0:
            return True
        else:
            return False
    else:
        if year % 4 == 0:
            if year % 400 == 0:
                return True
            if year % 100 == 0:
                return False
            return True
        else:
            return False

def calRealDate(isBC, startDate, endDate):
    res = {
        'isBC': isBC,
        'date': datetime.datetime(endDate.year, endDate.month, endDate.day, endDate.hour, endDate.minute, endDate.second)
    }
    if isBC == False:
        return res

    isNowBC = isBC
    y = startDate.year
    ydelta = endDate.year - y
    m = endDate.month
    d = endDate.day
    date = res['date']
    if ydelta == 0:
        isNowBC = True
    elif ydelta < y:
        ny = endDate.year - y
        if isLeap(ny) == False and m == 2 and d == 29:
            m = 3
            d = 1
        date = datetime.datetime(ny, m, d, endDate.hour, endDate.minute, endDate.second)
        isNowBC = True
    else:
        offdelta = 1 if y == 1 else y + 1
        ny = endDate.year - offdelta
        if isLeap(ny) == False and m == 2 and d == 29:
            m = 3
            d = 1
        date = datetime.datetime(ny, m, d, endDate.hour, endDate.minute, endDate.second)
        isNowBC = False

    res['isBC'] = isNowBC
    res['date'] = date
    return res


def getSignLon(sign):
    idx = const.LIST_SIGNS.index(sign)
    lon = idx * 30
    return lon
