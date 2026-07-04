#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""regen_patch.py — overlay 补丁再生器(LF-safe + round-trip 内建)。

用法(repo 根目录跑,Git-Bash 或 PowerShell 均可):
    python windows-adaptations/regen_patch.py <mac-ref> <ws-relpath> <patch-name> [--clone tmp/mac-sync-2.6.7]

    <mac-ref>     Mac 基线 ref(通常是版本 tag,如 v3.2.2;按 Horosa-Web/<ws-relpath> 取基线内容)
    <ws-relpath>  产品源相对路径(如 astrostudyui/src/utils/perfFlags.js)
    <patch-name>  输出到 windows-adaptations/patches/<patch-name>

生成「Mac 基线 → Windows 工作区现状」的累积补丁,并当场做 round-trip 验证
(把补丁打回纯净基线,LF 归一化后必须与工作区现状逐字节一致,否则退出码 1 且不落盘)。

institutionalizes(gotcha #49 的两个坑,永不再手踩):
  * python stdout 的 LF→CRLF 换行转换 → 本脚本全程 binary/newline='\\n';
  * git diff --no-index 头部的 Windows 临时路径 → 本脚本重写 diff/---/+++ 三行。
"""
import io
import os
import subprocess
import sys
import tempfile

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

WS = "local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c"


def sh(args, **kw):
    return subprocess.run(args, capture_output=True, **kw)


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith("--clone")]
    clone = "tmp/mac-sync-2.6.7"
    for a in sys.argv[1:]:
        if a.startswith("--clone="):
            clone = a.split("=", 1)[1]
    if len(argv) != 3:
        print(__doc__)
        return 2
    ref, rel, patch_name = argv
    ws_file = f"{WS}/{rel}"
    out = f"windows-adaptations/patches/{patch_name}"
    if not os.path.exists(ws_file):
        print(f"FATAL: workspace file missing: {ws_file}")
        return 1

    base = sh(["git", "-C", clone, "show", f"{ref}:Horosa-Web/{rel}"])
    if base.returncode != 0:
        print(f"FATAL: cannot read Mac baseline {ref}:Horosa-Web/{rel}\n{base.stderr.decode(errors='replace')}")
        return 1
    base_bytes = base.stdout

    tmpd = tempfile.mkdtemp().replace("\\", "/")
    base_path = f"{tmpd}/base"
    with open(base_path, "wb") as f:
        f.write(base_bytes)

    diff = sh(["git", "diff", "--no-index", "--text", base_path, ws_file])
    if diff.returncode not in (0, 1):
        print(f"FATAL: git diff failed\n{diff.stderr.decode(errors='replace')}")
        return 1
    if diff.returncode == 0:
        print(f"NOTE: {rel} is byte-identical to the Mac baseline — no patch needed.")
        return 0

    # 重写头三行为干净的 a/<rel> b/<rel>(binary 处理,零换行转换)
    out_lines = []
    for ln in diff.stdout.split(b"\n"):
        if ln.startswith(b"diff --git"):
            out_lines.append(f"diff --git a/{rel} b/{rel}".encode())
        elif ln.startswith(b"--- "):
            out_lines.append(f"--- a/{rel}".encode())
        elif ln.startswith(b"+++ "):
            out_lines.append(f"+++ b/{rel}".encode())
        else:
            out_lines.append(ln)
    patch_bytes = b"\n".join(out_lines)

    # round-trip:打回纯净基线,LF 归一后必须 == 工作区现状
    rt_dir = f"{tmpd}/rt"
    dst = f"{rt_dir}/{rel}"
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(base_bytes)
    tmp_patch = f"{tmpd}/p.patch"
    with open(tmp_patch, "wb") as f:
        f.write(patch_bytes)
    ap = sh(["git", "apply", "-p1", os.path.abspath(tmp_patch)], cwd=rt_dir)
    if ap.returncode != 0:
        print(f"ROUND-TRIP FAIL (apply): {ap.stderr.decode(errors='replace')[:400]}")
        return 1
    norm = lambda b: b.replace(b"\r\n", b"\n")
    with open(dst, "rb") as f:
        patched = f.read()
    with open(ws_file, "rb") as f:
        cur = f.read()
    if norm(patched) != norm(cur):
        print("ROUND-TRIP FAIL: patched baseline != workspace current (LF-normalized)")
        return 1

    with open(out, "wb") as f:
        f.write(patch_bytes)
    plus = sum(1 for ln in out_lines if ln.startswith(b"+") and not ln.startswith(b"+++"))
    print(f"OK: wrote {out} (+{plus} lines), round-trip verified against {ref}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
