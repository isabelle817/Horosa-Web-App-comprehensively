"""顶层包名卫生守护:防止本仓目录名 `astropy` 遮蔽 PyPI 天文库 astropy。

历史事故(2026-07-01 修):仓根曾误存 flatlib 模板的 `__init__.py`(93ec5433 残留),
令 `Horosa-Web/astropy` 成为 regular package;叠加个别测试把 `tests/../..`(=Horosa-Web)
insert 进 sys.path[0],全量收集时 `import astropy` 命中本仓、`astropy.units` 不存在,
炸掉 vendor kintaiyi golden(test_taiyi_kintaiyi_golden)的收集——且只在全量按字母序
先 import 过毒测试后才复现(单跑正常),极难排查。三条不变量即法律:

1. 仓根不得有 __init__.py(本仓所有代码 import `astrostudy.*` / `websrv.*`,
   顶层 `astropy` 包名只属于 PyPI 天文库)。
2. tests/*.py 不得把 Horosa-Web(tests/../..)裸插进 sys.path
   (conftest 已提供仓根与 flatlib-ctrad2,再插上层只会引毒)。
3. 运行到本测试时,`astropy` 若已被导入,必须解析到 site-packages(而非本仓)。
"""
import os
import re
import glob
import sys

_TESTS = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.dirname(_TESTS)                      # .../Horosa-Web/astropy


def test_repo_root_is_not_a_package():
    assert not os.path.exists(os.path.join(_REPO, '__init__.py')), (
        '仓根出现 __init__.py:会让本仓目录变成可导入的顶层 astropy 包,'
        '遮蔽 PyPI 天文库 astropy(vendor kintaiyi 依赖)。删掉它。'
    )


def test_no_test_inserts_horosa_web_onto_sys_path():
    # 匹配 join(dirname(__file__), "..", "..") 收尾(允许尾逗号/空白)——再接第三段(如
    # flatlib-ctrad2 / vendor)是合法的,不在此列。
    pat = re.compile(
        r"""sys\.path\.insert\(\s*\d+\s*,\s*os\.path\.join\(\s*os\.path\.dirname\(__file__\)\s*,\s*['"]\.\.['"]\s*,\s*['"]\.\.['"]\s*,?\s*\)\s*\)"""
    )
    offenders = []
    for path in glob.glob(os.path.join(_TESTS, '*.py')):
        if os.path.basename(path) == os.path.basename(__file__):
            continue
        with open(path, encoding='utf-8') as f:
            if pat.search(f.read()):
                offenders.append(os.path.basename(path))
    assert not offenders, (
        '这些测试把 tests/../..(=Horosa-Web)裸插进 sys.path,会令本仓 astropy 目录'
        '遮蔽 PyPI astropy:%r(conftest 已提供仓根,直接删该行)' % offenders
    )


def test_astropy_name_resolves_to_site_packages():
    mod = sys.modules.get('astropy')
    if mod is None:
        return   # 全程没人 import astropy 也算干净
    origin = getattr(mod, '__file__', None) or (list(getattr(mod, '__path__', [])) or [''])[0]
    assert origin and 'site-packages' in origin.replace('\\', '/'), (
        "sys.modules['astropy'] 解析到了 %r(应为 site-packages 的 PyPI 天文库):"
        '本仓目录遮蔽复发,检查 sys.path 注入与仓根 __init__.py。' % origin
    )
