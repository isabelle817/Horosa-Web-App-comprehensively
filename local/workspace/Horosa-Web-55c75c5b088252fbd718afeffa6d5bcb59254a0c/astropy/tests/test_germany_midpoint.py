"""
汉堡学派量化盘(/germany/midpoint)中点引擎测试。

守住两件事:
 1. uranian=True(量化盘):中点对纳入 Asc/MC + 8 TNP;相位跨 0° 归一;orb 可配;TNP 历表可用。
 2. uranian=False(默认,合盘 modern/chartcomp.py 复用):中点对只含传统体,绝不含 TNP/Asc/MC ——
    保证本次改动零侵入合盘。
"""
import gzip
import json
from pathlib import Path

from astrostudy import perchart
from astrostudy.germany.midpoint import MidPoint
from flatlib import const

_CORPUS = (
    Path(__file__).resolve().parent
    / 'data' / 'pd_calibration_corpus'
    / 'golden_alcabitius_ptolemy_v266.ndjson.gz'
)


def _sample_chart_data():
    with gzip.open(_CORPUS, 'rt', encoding='utf-8') as f:
        return json.loads(f.readline())['chart_data']


CD = _sample_chart_data()


def _perchart():
    return perchart.PerChart(dict(CD))


def _pair_ids(mids):
    ids = set()
    for m in mids:
        ids.add(m['idA'])
        ids.add(m['idB'])
    return ids


class _Stub:
    def __init__(self, oid, lon):
        self.id = oid
        self.lon = lon


def test_uranian_midpoints_include_tnp_and_angles():
    mids = MidPoint(_perchart(), uranian=True).getMidpoints()
    ids = _pair_ids(mids)
    assert const.ASC in ids and const.MC in ids, '四轴 Asc/MC 必须进中点对'
    present = [u for u in const.LIST_URANIAN if u in ids]
    assert len(present) == 8, f'8 TNP 必须进中点对,实得 {present}'


def test_composite_default_path_excludes_tnp_and_angles():
    # 默认 uranian=False —— 合盘路径,逐字节不变:绝不含 TNP/Asc/MC。
    mids = MidPoint(_perchart()).getMidpoints()
    ids = _pair_ids(mids)
    assert const.ASC not in ids and const.MC not in ids
    assert not any(u in ids for u in const.LIST_URANIAN)


def test_aspect_normalizes_across_zero():
    # 中点 359.6°、目标 0.3° → 真实角距 0.7°,应判「合」(原 abs 差 359.3 会漏判)。
    mp = MidPoint(_perchart(), orb=1.0, uranian=True)
    hits = mp.getAspects(_Stub('X', 0.3), [{'idA': 'a', 'idB': 'b', 'lon': 359.6}])['X']
    assert len(hits) == 1 and hits[0]['aspect'] == 0


def test_aspect_270_folds_to_square():
    mp = MidPoint(_perchart(), orb=1.0, uranian=True)
    hits = mp.getAspects(_Stub('X', 0.0), [{'idA': 'a', 'idB': 'b', 'lon': 270.0}])['X']
    assert hits and hits[0]['aspect'] == 90


def test_orb_configurable_monotonic():
    pc = _perchart()
    few = MidPoint(pc, orb=0.5, uranian=True).calculate()['aspects']
    many = MidPoint(pc, orb=3.0, uranian=True).calculate()['aspects']
    n_few = sum(len(v) for v in few.values())
    n_many = sum(len(v) for v in many.values())
    assert n_many >= n_few, f'放大 orb 不应减少相位数 (0.5°={n_few}, 3°={n_many})'


def test_tnp_ephemeris_eight_available():
    # 与 _build_uranian_tnp 同路径,但不依赖 cherrypy:验证 8 颗 Swiss Ephemeris 虚星可算。
    from flatlib.ephem import ephem as flatlib_ephem
    pc = _perchart()
    got = [flatlib_ephem.getObject(uid, pc.dateTime, pc.pos).id for uid in const.LIST_URANIAN]
    assert len(got) == 8
