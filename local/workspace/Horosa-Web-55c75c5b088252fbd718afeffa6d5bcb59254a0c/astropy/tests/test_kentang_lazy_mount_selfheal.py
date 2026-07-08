# -*- coding: utf-8 -*-
"""KENTANG_LAZY_MOUNT_SELF_HEAL — regression guard.

Locks the fix for the observed production defect: the standalone 太乙盘 and 三式合一 太乙 both
failed with ``sanshi.taiyi.kintaiyi_unavailable`` and the ``/taiyi/pan`` route returned **404 for
the whole life of the backend process** — a permanent, un-self-healing failure.

Root cause: a kentang service adapter module (``websrv.web<key>srv``) — or its vendored engine
package (e.g. ``kintaiyi``) — was left cached in ``sys.modules`` WITHOUT its service class defined
(a swallowed background-warmup import error, or a first-launch payload-materialization race). The
lazy mount's ``__import__`` then returned that partial cached module; ``getattr(module,
class_name)`` raised ``AttributeError``; and because CherryPy resolves mounted handlers via
``getattr`` on the lazy-mount proxy, that route 404'd forever with no traceback.

``registry._import_kentang_service_module`` must detect the missing class, purge the poisoned
module (and its engine) from ``sys.modules``, and re-import from clean state — so the very first
real request self-heals transparently. A genuinely broken module must raise a real error (a
diagnosable 500), never a silent, permanent 404.
"""
import importlib
import os
import sys
import tempfile

_ASTRO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ASTRO not in sys.path:
    sys.path.insert(0, _ASTRO)

import pytest  # noqa: E402

from websrv.kentang.registry import (  # noqa: E402
    KentangServiceLoadError,
    _LazyMountedService,
    _import_kentang_service_module,
)


_PROBE_NAME = "horosa_kentang_selfheal_probe_srv"


def _install_probe(tmpdir, class_present=True):
    body = "class ProbeSrv(object):\n    exposed = True\n" if class_present else "value = 1\n"
    with open(os.path.join(tmpdir, _PROBE_NAME + ".py"), "w", encoding="utf-8") as fh:
        fh.write(body)
    importlib.invalidate_caches()


def _cleanup(tmpdir):
    sys.modules.pop(_PROBE_NAME, None)
    if tmpdir in sys.path:
        sys.path.remove(tmpdir)


def test_selfheal_recovers_from_classless_cached_module():
    """The exact permanent-404 state: adapter module cached WITHOUT its service class."""
    import types
    tmpdir = tempfile.mkdtemp()
    sys.path.insert(0, tmpdir)
    try:
        _install_probe(tmpdir, class_present=True)
        spec = {"module": _PROBE_NAME, "class_name": "ProbeSrv", "engine": None}

        # clean import works
        mod = _import_kentang_service_module(spec)
        assert getattr(mod, "ProbeSrv", None) is not None

        # poison the cache with a classless module (what made 太乙 404 forever)
        sys.modules[_PROBE_NAME] = types.ModuleType(_PROBE_NAME)
        assert getattr(sys.modules[_PROBE_NAME], "ProbeSrv", None) is None

        # self-heal: purge + re-import must recover the class transparently
        healed = _import_kentang_service_module(spec)
        assert getattr(healed, "ProbeSrv", None) is not None, \
            "self-heal did not recover the service class from a poisoned sys.modules cache"
    finally:
        _cleanup(tmpdir)


def test_selfheal_recovers_when_first_import_raises_via_engine_purge():
    """A poisoned engine submodule can make the first import RAISE; purging the engine must recover."""
    import types
    tmpdir = tempfile.mkdtemp()
    sys.path.insert(0, tmpdir)
    engine_name = "horosa_kentang_selfheal_probe_engine"
    try:
        # engine package with a real submodule that exports Value
        eng_dir = os.path.join(tmpdir, engine_name)
        os.makedirs(eng_dir)
        open(os.path.join(eng_dir, "__init__.py"), "w").close()
        with open(os.path.join(eng_dir, "core.py"), "w", encoding="utf-8") as fh:
            fh.write("VALUE = 42\n")
        # adapter imports the engine submodule at top level, then defines its class
        with open(os.path.join(tmpdir, _PROBE_NAME + ".py"), "w", encoding="utf-8") as fh:
            fh.write("from %s.core import VALUE\n\nclass ProbeSrv(object):\n    exposed = True\n" % engine_name)
        importlib.invalidate_caches()
        spec = {"module": _PROBE_NAME, "class_name": "ProbeSrv", "engine": engine_name}

        # poison the ENGINE submodule so the adapter's top-level `from engine.core import VALUE` fails,
        # and cache a classless adapter shell so __import__ returns it without re-running.
        sys.modules[engine_name + ".core"] = types.ModuleType(engine_name + ".core")  # no VALUE
        sys.modules[_PROBE_NAME] = types.ModuleType(_PROBE_NAME)  # classless

        healed = _import_kentang_service_module(spec)
        assert getattr(healed, "ProbeSrv", None) is not None, \
            "self-heal did not recover after purging a poisoned engine submodule"
    finally:
        sys.modules.pop(engine_name, None)
        sys.modules.pop(engine_name + ".core", None)
        _cleanup(tmpdir)


def test_genuinely_missing_service_raises_not_silent():
    """A service that truly cannot be imported must raise (diagnosable 500), never a silent 404."""
    spec = {"module": "horosa_kentang_definitely_absent_zzz", "class_name": "Nope", "engine": None}
    with pytest.raises(Exception):
        _import_kentang_service_module(spec)


def test_lazy_proxy_load_failure_is_never_attributeerror():
    """KENTANG_LOUD_LOAD_FAIL — the v3.2.1 hardening.

    CherryPy's dispatcher walks the tree with ``getattr(node, name, None)``, which swallows
    AttributeError as "no such route". The v3.2.0 太乙 outage escaped as AttributeError (the
    streamlit stub returned a function for ``__file__`` and the real astropy library's
    import-time inspect walk died) → permanent silent 404. The lazy proxy must therefore wrap
    ANY load failure — AttributeError included — into KentangServiceLoadError (a RuntimeError
    subclass) so it surfaces as a diagnosable 5xx.
    """
    tmpdir = tempfile.mkdtemp()
    sys.path.insert(0, tmpdir)
    mod_name = "horosa_kentang_attrerr_probe_srv"
    try:
        # adapter whose import dies with AttributeError — the exact poison shape of v3.2.0
        with open(os.path.join(tmpdir, mod_name + ".py"), "w", encoding="utf-8") as fh:
            fh.write("raise AttributeError(\"'function' object has no attribute 'endswith'\")\n")
        importlib.invalidate_caches()
        proxy = _LazyMountedService({"module": mod_name, "class_name": "ProbeSrv", "engine": None})

        with pytest.raises(KentangServiceLoadError) as exc_info:
            proxy.pan  # what CherryPy dispatch does for /<mount>/pan

        assert not isinstance(exc_info.value, AttributeError), \
            "load failure escaped as AttributeError - CherryPy would silently 404 the route"
        assert isinstance(exc_info.value, RuntimeError)
        # and getattr-with-default (the dispatcher idiom) must NOT swallow it either
        with pytest.raises(KentangServiceLoadError):
            getattr(proxy, "pan", None)
    finally:
        sys.modules.pop(mod_name, None)
        if tmpdir in sys.path:
            sys.path.remove(tmpdir)


def test_lazy_proxy_dunder_probe_stays_cheap_attributeerror():
    """Dunder probes on the proxy must stay AttributeError (no load, no wrap) — repr/type/hasattr
    introspection on an unloaded mount must not pull the implementation or turn into a 500."""
    proxy = _LazyMountedService({"module": "horosa_kentang_never_loaded_zzz", "class_name": "X", "engine": None})
    with pytest.raises(AttributeError):
        proxy.__wrapped__  # noqa: B018
    assert getattr(proxy, "__wrapped__", None) is None
