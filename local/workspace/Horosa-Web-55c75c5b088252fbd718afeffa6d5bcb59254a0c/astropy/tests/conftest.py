"""
Pytest conftest for astropy tests.

Injects the in-tree flatlib-ctrad2 and the astropy package root onto sys.path,
so tests can import `astrostudy.*` and `flatlib.*` exactly as the runtime does
without requiring an editable install or PYTHONPATH env var.
"""
import sys
from pathlib import Path

_ASTROPY_ROOT = Path(__file__).resolve().parent.parent           # .../Horosa-Web/astropy
_HOROSA_WEB_ROOT = _ASTROPY_ROOT.parent                          # .../Horosa-Web
_FLATLIB_ROOT = _HOROSA_WEB_ROOT / 'flatlib-ctrad2'              # .../Horosa-Web/flatlib-ctrad2

for p in (_FLATLIB_ROOT, _ASTROPY_ROOT):
    sp = str(p)
    if sp not in sys.path:
        sys.path.insert(0, sp)
