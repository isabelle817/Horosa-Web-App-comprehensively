# -*- coding: utf-8 -*-
"""stub_dunder_guard_v1 — regression guard for the v3.2.0 太乙 root cause.

The desktop runtime ships without streamlit; ``websrv.kentang.kinastro_common`` pre-injects a
``sys.modules`` compatibility stub. The original stub's ``__getattr__`` returned a no-op FUNCTION
for **every** attribute — including ``__file__``. ``inspect.getmodule()`` walks all of
``sys.modules`` reading each module's ``__file__`` (a str), so the first import of the real
``astropy`` PyPI library (kintaiyi/太乙's dependency, whose import runs that walk) died with
``AttributeError: 'function' object has no attribute 'endswith'`` whenever the stub was already
installed — i.e. whenever ANY kinastro adapter (七政四余 warmup at +14s) imported before 太乙.
CherryPy then swallowed the AttributeError as "no such route" → /taiyi/pan 404'd for the whole
process life.

The fix: dunder probes on the stub raise AttributeError ("attribute absent"), so hasattr(stub,
'__file__') is False and every standard introspection walk (inspect / pickle / copy) skips it.
These tests lock that contract.
"""
import os
import subprocess
import sys
import types

_ASTRO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ASTRO not in sys.path:
    sys.path.insert(0, _ASTRO)

import pytest  # noqa: E402


def _fresh_stub_modules():
    """Install the stub into THIS process exactly as kinastro_common does, returning the saved
    module state. Works even on interpreters that HAVE real streamlit (the build-machine
    workspace runtime): a ``sys.modules['streamlit'] = None`` placeholder makes
    ``import streamlit`` raise ImportError, forcing ``_ensure_streamlit_stub`` down its stub
    branch — so the REAL stub class is exercised everywhere, not just on the pruned payload."""
    import websrv.kentang.kinastro_common as kc
    saved = {k: sys.modules.get(k) for k in ("streamlit", "streamlit.components", "streamlit.components.v1")}
    for k in saved:
        sys.modules.pop(k, None)
    sys.modules["streamlit"] = None  # import blocker: `import streamlit` now raises ImportError
    kc._ensure_streamlit_stub()
    stub = sys.modules.get("streamlit")
    assert getattr(stub, "__horosa_slim_stub__", False) is True, "stub did not activate"
    return saved


def _restore(saved):
    for k in ("streamlit", "streamlit.components", "streamlit.components.v1"):
        sys.modules.pop(k, None)
    for k, v in saved.items():
        if v is not None:
            sys.modules[k] = v


def test_stub_dunder_probes_report_absent_not_callable():
    saved = _fresh_stub_modules()
    try:
        for name in ("streamlit", "streamlit.components", "streamlit.components.v1"):
            mod = sys.modules[name]
            assert isinstance(mod, types.ModuleType)
            assert getattr(mod, "__horosa_slim_stub__", False) is True
            # THE regression: __file__ (and any other unset dunder) must read as ABSENT,
            # never as a callable.
            val = getattr(mod, "__file__", None)
            assert not callable(val), "%s.__file__ is callable - inspect.getmodule() will crash" % name
            assert not callable(getattr(mod, "__spec__", None))
            assert not callable(getattr(mod, "__path__", None))
            with pytest.raises(AttributeError):
                mod.__wrapped__  # arbitrary unset dunder
    finally:
        _restore(saved)


def test_stub_survives_inspect_getmodule_walk():
    """inspect.getmodule() iterates sys.modules and reads __file__ of every module — the exact
    walk the real astropy library runs at import time. It must not raise with the stub installed."""
    import inspect
    saved = _fresh_stub_modules()
    try:
        frame = sys._getframe()
        inspect.getmodule(frame)  # must not raise
        # and the direct shape that killed 太乙:
        for mod in (sys.modules["streamlit"],):
            f = getattr(mod, "__file__", None)
            if f is not None:
                f.endswith(".py")  # would raise if f were a function
    finally:
        _restore(saved)


def test_stub_decorator_and_noop_semantics_preserved():
    """The fix must not change what vendor code actually uses: bare/parametrized @st.cache_data,
    arbitrary no-op calls, and the components.v1 submodule path."""
    saved = _fresh_stub_modules()
    try:
        st = sys.modules["streamlit"]

        @st.cache_data
        def double(x):
            return x * 2

        assert double(21) == 42

        @st.cache_data(ttl=600, show_spinner=False)
        def plus_one(x):
            return x + 1

        assert plus_one(1) == 2
        assert st.warning("noop") is None          # arbitrary attr -> callable no-op
        assert callable(st.session_state)          # non-dunder attrs stay callable no-ops
        assert sys.modules["streamlit.components.v1"] is st.components.v1
    finally:
        _restore(saved)


def test_real_astropy_imports_with_stub_installed_subprocess():
    """END-TO-END regression (the v3.2.0 failure, minimally): in a FRESH interpreter, install the
    stub first (import kinastro_common), then import the real astropy library. Before the fix this
    died with AttributeError inside inspect.getsourcefile; it must now succeed."""
    import importlib.util
    if importlib.util.find_spec("astropy") is None:
        pytest.skip("real astropy library not installed on this interpreter")
    code = (
        "import os, sys\n"
        "proj = sys.argv[1]\n"
        "os.chdir(proj)\n"
        "sys.path[:] = [p for p in sys.path if p not in ('', os.getcwd())]\n"
        "sys.path[0:0] = [os.path.join(proj, 'astropy'), os.path.join(proj, 'flatlib-ctrad2')]\n"
        "sys.modules['streamlit'] = None  # blocker: force the stub branch even if real streamlit exists\n"
        "import websrv.kentang.kinastro_common  # installs the streamlit stub\n"
        "assert getattr(sys.modules.get('streamlit'), '__horosa_slim_stub__', False), 'stub not active'\n"
        "import astropy.units  # noqa: F401 - the real PyPI library; died pre-fix\n"
        "print('astropy-ok')\n"
    )
    proj = os.path.abspath(os.path.join(_ASTRO, ".."))
    proc = subprocess.run(
        [sys.executable, "-E", "-s", "-X", "utf8", "-c", code, proj],
        capture_output=True, text=True, timeout=300,
    )
    assert proc.returncode == 0, (
        "real astropy failed to import with the streamlit stub installed:\n%s" % (proc.stderr or "")
    )
    assert "astropy-ok" in proc.stdout
