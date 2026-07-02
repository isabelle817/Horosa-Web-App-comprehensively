"""Registry for kentang2017-backed calculation services.

This file is the only place the root CherryPy app should know about
Kentang-backed service mounts. Each concrete adapter remains in its own
one web service adapter module so the raw vendor library, Horosa normalization, and
HTTP route stay identifiable.
"""


KENTANG_SERVICE_SPECS = [
    {
        "key": "taiyi",
        "engine": "kintaiyi",
        "mount": "/taiyi",
        "module": "websrv.webtaiyisrv",
        "class_name": "TaiYiSrv",
    },
    {
        "key": "jinkou",
        "engine": "kinjinkou",
        "mount": "/jinkou",
        "module": "websrv.webjinkousrv",
        "class_name": "JinKouSrv",
    },
    {
        "key": "qimen",
        "engine": "kinqimen",
        "mount": "/qimen",
        "module": "websrv.webqimensrv",
        "class_name": "QiMenSrv",
    },
    {
        "key": "wangji",
        "engine": "kinwangji",
        "mount": "/wangji",
        "module": "websrv.webwangjisrv",
        "class_name": "WangJiSrv",
    },
    {
        "key": "wuzhao",
        "engine": "kinwuzhao",
        "mount": "/wuzhao",
        "module": "websrv.webwuzhaosrv",
        "class_name": "WuZhaoSrv",
    },
    {
        "key": "taixuan",
        "engine": "taixuanshifa",
        "mount": "/taixuan",
        "module": "websrv.webtaixuansrv",
        "class_name": "TaiXuanSrv",
    },
    {
        "key": "jingjue",
        "engine": "jingjue",
        "mount": "/jingjue",
        "module": "websrv.webjingjuesrv",
        "class_name": "JingJueSrv",
    },
    {
        "key": "shenyishu",
        "engine": "shenyishu",
        "mount": "/shenyishu",
        "module": "websrv.webshenyishusrv",
        "class_name": "ShenYiShuSrv",
    },
    {
        "key": "geomancy",
        "engine": "astronomical_geomancy",
        "mount": "/geomancy",
        "module": "websrv.webgeomancysrv",
        "class_name": "GeomancySrv",
    },
    {
        "key": "shaozi",
        "engine": "kinastro-shaozi",
        "mount": "/shaozi",
        "module": "websrv.webshaozisrv",
        "class_name": "ShaoZiSrv",
    },
    {
        "key": "tieban",
        "engine": "kinastro-tieban",
        "mount": "/tieban",
        "module": "websrv.webtiebansrv",
        "class_name": "TieBanSrv",
    },
    {
        "key": "fendjing",
        "engine": "kinastro-fendjing",
        "mount": "/fendjing",
        "module": "websrv.webfendjingsrv",
        "class_name": "FenDingJingSrv",
    },
    {
        "key": "beiji",
        "engine": "kinastro-beiji",
        "mount": "/beiji",
        "module": "websrv.webbeijisrv",
        "class_name": "BeiJiSrv",
    },
    {
        "key": "nanji",
        "engine": "kinastro-nanji",
        "mount": "/nanji",
        "module": "websrv.webnanjisrv",
        "class_name": "NanJiSrv",
    },
    {
        "key": "chunzi",
        "engine": "kinastro-chunzi",
        "mount": "/chunzi",
        "module": "websrv.webchunzisrv",
        "class_name": "ChunZiSrv",
    },
    {
        "key": "xianqin",
        "engine": "kinastro-xianqin",
        "mount": "/xianqin",
        "module": "websrv.webxianqinsrv",
        "class_name": "XianQinSrv",
    },
    {
        "key": "qizhengkin",
        "engine": "kinastro-qizheng",
        "mount": "/qizhengkin",
        "module": "websrv.webqizhengkinsrv",
        "class_name": "QiZhengKinSrv",
    },
    {
        "key": "xuanshi",
        "engine": "xuanshi_history",
        "mount": "/xuanshi",
        "module": "websrv.webxuanshisrv",
        "class_name": "XuanShiSrv",
    },
]


import os
import threading


# v3.0.1 perf ROUND-3 R3 (HOROSA_KENTANG_LAZY_MOUNT): the original _load_service +
# mount_kentang_services eagerly `__import__`-ed every one of the 17 kentang service specs
# at server start. Each import pulled its underlying engine (kintaiyi, kinqimen, ...,
# webxuanshisrv → xuanshi's 5 heavy submodules + 99MB SQLite bundles). On Windows this
# added 5-10s of Python cold-import to the Horosa startup path — a v3.0.0-era net-new
# cost (v2.6.9 had no xuanshi module and a smaller kentang set). Fix: wrap every spec in
# _LazyMountedService and let CherryPy dispatch demand-load the concrete adapter on the
# FIRST request that hits its mount point. Warm dispatch after first hit == pre-round-3
# performance (memoized). Kill-switch HOROSA_KENTANG_LAZY_MOUNT=0 reverts to the eager
# path, spec-by-spec identical to the original. This is the fix that actually bites the
# webxuanshisrv startup cost (it does `from astrostudy.xuanshi import celestial as xs_celestial`
# etc. at top level, bypassing xuanshi/__init__.py's PEP 562 lazy pattern), so this
# registry-level wrap is the primary lever.
class _LazyMountedService(object):
    """CherryPy-compatible proxy that defers spec module import + class instantiation
    until the first attribute access (== first dispatched request). Attribute lookup
    resolves against the real service instance once loaded; __getattr__ is only invoked
    on failed default lookup, so CherryPy's expose/dispatch introspection walks straight
    into the real handler without knowing about the wrap."""
    __slots__ = ("_spec", "_impl", "_lock")

    exposed = False  # dispatchers only inspect this on leaf handlers; on the root we let
                     # the default (False) fall through so CherryPy walks into child attrs.

    def __init__(self, spec):
        object.__setattr__(self, "_spec", spec)
        object.__setattr__(self, "_impl", None)
        object.__setattr__(self, "_lock", threading.Lock())

    def _load(self):
        impl = object.__getattribute__(self, "_impl")
        if impl is not None:
            return impl
        lock = object.__getattribute__(self, "_lock")
        with lock:
            impl = object.__getattribute__(self, "_impl")
            if impl is not None:
                return impl
            spec = object.__getattribute__(self, "_spec")
            module = __import__(spec["module"], fromlist=[spec["class_name"]])
            service_cls = getattr(module, spec["class_name"])
            impl = service_cls()
            object.__setattr__(self, "_impl", impl)
            return impl

    def __getattr__(self, name):
        # __getattr__ is only called when normal lookup fails. Slots (_spec/_impl/_lock)
        # and the class-level `exposed` attribute resolve normally; everything else
        # (real handlers, dispatch attributes, etc.) triggers the lazy load.
        if name.startswith("__") and name.endswith("__"):
            # Never load on dunder probes — keeps `hasattr(node, '__something__')` cheap
            # and avoids pulling the impl for stuff like repr/type inspection.
            raise AttributeError(name)
        return getattr(self._load(), name)


def _load_service(spec):
    module = __import__(spec["module"], fromlist=[spec["class_name"]])
    service_cls = getattr(module, spec["class_name"])
    return service_cls()


def mount_kentang_services(cherrypy):
    lazy_mount = os.environ.get("HOROSA_KENTANG_LAZY_MOUNT", "1").lower() not in ("0", "false", "no", "off")
    for spec in KENTANG_SERVICE_SPECS:
        if lazy_mount:
            service = _LazyMountedService(spec)
        else:
            service = _load_service(spec)
        cherrypy.tree.mount(service, spec["mount"])
