from flatlib import const
from flatlib.ephem import ephem as flatlib_ephem
from astrostudy.perchart import PerChart

LIST_OBJ = [
    const.SUN, const.MOON, const.MERCURY, const.VENUS, const.MARS, const.JUPITER, const.SATURN,
    const.NORTH_NODE, const.SOUTH_NODE, const.URANUS, const.NEPTUNE, const.PLUTO,
    const.DARKMOON, const.PURPLE_CLOUDS
]

def takeLon(obj):
    return obj['lon']


class MidPoint:
    # uranian=False(默认):与历史实现逐字节一致,供合盘(modern/chartcomp.py)复用,绝不改其输出。
    # uranian=True(量化盘 /germany/midpoint 专用):
    #   ① 中点对来源纳入 Asc/MC(四轴)+ 8 颗 TNP 虚星(汉堡学派核心,原实现遗漏);
    #   ② 无序对各算一个近中点(短弧),消除原 A-B/B-A 双算 + 浮点精确去重导致的近/远重复;
    #   ③ 相位判断跨 0° 归一(修原 abs 差未归一致 mid≈359、obj≈0 漏判);orb 可配;
    #   ④ TNP 也作相位目标(捕获 TNP 落中点轴)。
    def __init__(self, perchart: PerChart, orb=1.0, uranian=False):
        self.perchart = perchart
        self.uranian = bool(uranian)
        try:
            self.orb = float(orb)
        except (TypeError, ValueError):
            self.orb = 1.0
        if not (0 < self.orb <= 10):
            self.orb = 1.0
        self.objects = [self.perchart.chart.getObject(id) for id in LIST_OBJ]
        self.tnpObjs = []
        if self.uranian:
            chart = perchart.chart
            angleObjs = [a for a in chart.angles if a.id in (const.ASC, const.MC)]
            for uid in const.LIST_URANIAN:
                try:
                    self.tnpObjs.append(flatlib_ephem.getObject(uid, perchart.dateTime, perchart.pos))
                except Exception:
                    pass
            self.objects = self.objects + angleObjs + self.tnpObjs

    def getAspects(self, obj, mids):
        if self.uranian:
            return self._getAspectsUranian(obj, mids)
        # —— 历史路径(合盘复用,逐字节不变)——
        asps = {}
        asps[obj.id] = []
        for mid in mids:
            asp = {
                'idA': mid['idA'],
                'idB': mid['idB'],
                'aspect': -1
            }
            delta = abs(mid['lon'] - obj.lon)
            if delta < 1:
                asp['aspect'] = 0
                asp['delta'] = delta
            elif abs(delta - 90) < 1 or abs(delta - 270) < 1:
                tmpdelta = abs(delta - 90)
                if tmpdelta > 1:
                    tmpdelta = abs(delta - 270)
                asp['aspect'] = 90
                asp['delta'] = tmpdelta
            elif abs(delta - 180) < 1:
                asp['aspect'] = 180
                asp['delta'] = abs(delta - 180)

            if asp['aspect'] > -1:
                asps[obj.id].append(asp)
        return asps

    def _getAspectsUranian(self, obj, mids):
        orb = self.orb
        asps = {obj.id: []}
        for mid in mids:
            d = abs(mid['lon'] - obj.lon) % 360.0   # 跨 0° 归一到 0..180
            if d > 180.0:
                d = 360.0 - d
            asp = {'idA': mid['idA'], 'idB': mid['idB'], 'aspect': -1}
            if d < orb:                # 合(90°盘上 0/90/180/270 经归一后落 0 或 90 或 180)
                asp['aspect'] = 0
                asp['delta'] = d
            elif abs(d - 90.0) < orb:  # 刑(含 270 折叠)
                asp['aspect'] = 90
                asp['delta'] = abs(d - 90.0)
            elif abs(d - 180.0) < orb:  # 冲
                asp['aspect'] = 180
                asp['delta'] = abs(d - 180.0)
            if asp['aspect'] > -1:
                asps[obj.id].append(asp)
        return asps

    def getMidpoints(self):
        if self.uranian:
            return self._getMidpointsUranian()
        # —— 历史路径(合盘复用,逐字节不变)——
        midsdeg = set()
        mids = []
        objs = []
        for obj in self.objects:
            if not (obj in const.LIST_MIDDLE_POINTS):
                objs.append(obj)

        for objA in objs:
            for objB in objs:
                if objA.id == objB.id:
                    continue
                mid = (objA.lon + objB.lon) / 2.0
                if abs(mid - objA.lon) > 90:
                    mid = (mid + 180) % 360
                if mid in midsdeg:
                    continue
                sigidx = int(mid / 30)
                pnt = {
                    'lon': mid,
                    'signlon': mid % 30,
                    'sign': const.LIST_SIGNS[sigidx],
                    'idA': objA.id,
                    'idB': objB.id
                }
                mids.append(pnt)
                midsdeg.add(mid)
        mids.sort(key=takeLon)
        return mids;

    def _getMidpointsUranian(self):
        objs = [o for o in self.objects if o not in const.LIST_MIDDLE_POINTS]
        mids = []
        n = len(objs)
        for i in range(n):
            for j in range(i + 1, n):
                objA = objs[i]
                objB = objs[j]
                mid = (objA.lon + objB.lon) / 2.0
                if abs(mid - objA.lon) > 90:
                    mid = (mid + 180) % 360
                sigidx = int(mid / 30) % 12
                mids.append({
                    'lon': mid,
                    'signlon': mid % 30,
                    'sign': const.LIST_SIGNS[sigidx],
                    'idA': objA.id,
                    'idB': objB.id
                })
        mids.sort(key=takeLon)
        return mids


    def calculate(self):
        mids = self.getMidpoints()
        asps = {}
        # 相位目标:四轴 + 行星(+ uranian 时附 TNP)。非 uranian 时 tnpObjs 为空,与历史一致。
        targets = list(self.perchart.chart.angles) + list(self.perchart.chart.objects) + self.tnpObjs
        for obj in targets:
            objasp = self.getAspects(obj, mids)
            if len(objasp[obj.id]) > 0:
                asps[obj.id] = objasp[obj.id]

        res = {
            'midpoints': mids,
            'aspects': asps
        }
        return res
