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
import sys
import threading
import traceback


class KentangServiceLoadError(RuntimeError):
    """A kentang lazy-mounted service failed to import / resolve its class / instantiate.

    Deliberately NOT an ``AttributeError``: CherryPy's object dispatcher walks the mount
    tree with ``getattr(node, name, None)``, which swallows AttributeError as "no such
    route" — that is exactly how the v3.2.0 太乙 failure became a permanent, traceback-free
    404. Any load failure must surface as a 5xx WITH a logged traceback, never a silent 404.
    """


def _import_kentang_service_module(spec):
    """KENTANG_LAZY_MOUNT_SELF_HEAL — import a kentang service adapter module, self-healing a
    poisoned ``sys.modules`` cache.

    Root cause this guards (三式合一 太乙 ``sanshi.taiyi.kintaiyi_unavailable``): the background
    services warmup swallows import errors (daemon + try/except), and a first-launch payload
    materialization race (or any transient import hiccup) can leave the adapter module — or its
    vendored engine package (e.g. ``kintaiyi``) — cached in ``sys.modules`` WITHOUT the expected
    service class defined. A plain ``__import__`` then returns that partial cached module; the
    subsequent ``getattr(module, class_name)`` raises ``AttributeError``; and because CherryPy
    resolves mounted handlers via ``getattr`` on the lazy-mount proxy, that route then returns
    **404 for the entire life of the process** — the warm dispatch never recovers on its own.

    Guard: after importing, if the module is missing its service class, purge the adapter module
    AND its vendor engine package (plus any partial submodules) from ``sys.modules`` and re-import
    once from clean state. If it is still incomplete, raise a real ``ImportError`` so the failure
    surfaces as a diagnosable 500 rather than a silent, permanent 404."""
    module_name = spec["module"]
    class_name = spec["class_name"]
    engine = spec.get("engine")
    first_error = None
    try:
        module = __import__(module_name, fromlist=[class_name])
        if getattr(module, class_name, None) is not None:
            return module
    except Exception as exc:
        first_error = exc  # a poisoned engine submodule can make the first import raise — purge + retry below
    # Poisoned / partial cache (classless adapter module, or a half-imported vendor engine such
    # as kintaiyi): purge the adapter module AND its engine package (+ any partial submodules)
    # from sys.modules, then re-import once from a clean state.
    prefixes = [module_name]
    if engine:
        prefixes.append(engine)
    for key in list(sys.modules):
        if any(key == p or key.startswith(p + ".") for p in prefixes):
            sys.modules.pop(key, None)
    try:
        module = __import__(module_name, fromlist=[class_name])
    except Exception as exc:
        # Keep the FIRST failure attached for diagnosis (it usually names the true poison).
        raise ImportError(
            "kentang service module %r failed to import after self-heal purge "
            "(engine=%r, first_error=%r)" % (module_name, engine, first_error)
        ) from exc
    if getattr(module, class_name, None) is None:
        raise ImportError(
            "kentang service module %r imported without class %r after self-heal purge "
            "(engine=%r, first_error=%r)" % (module_name, class_name, engine, first_error)
        )
    return module


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
            module = _import_kentang_service_module(spec)
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
        try:
            impl = self._load()
        except Exception as exc:
            # KENTANG_LOUD_LOAD_FAIL — a load failure must NEVER escape as AttributeError:
            # CherryPy's dispatcher resolves the route via getattr(node, name, None), which
            # treats AttributeError as "no such route" → the v3.2.0 太乙 failure surfaced as a
            # permanent, traceback-free 404 (the poisoned streamlit stub made the vendored
            # engine's import die with AttributeError). Re-raise as KentangServiceLoadError
            # (RuntimeError subclass) so the request becomes a diagnosable 5xx, and print the
            # full traceback so python.log carries first-class evidence.
            spec = object.__getattribute__(self, "_spec")
            print(
                "[kentang] service %r (mount %s) FAILED to load — request will error loudly "
                "instead of silently 404ing:" % (spec.get("key"), spec.get("mount")),
                file=sys.stderr, flush=True,
            )
            traceback.print_exc()
            raise KentangServiceLoadError(
                "kentang service %r failed to load: %s: %s"
                % (spec.get("key"), type(exc).__name__, exc)
            ) from exc
        return getattr(impl, name)


def _load_service(spec):
    module = _import_kentang_service_module(spec)
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
