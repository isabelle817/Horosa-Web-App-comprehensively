#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""port_from_mac.py — Mac→Windows 产品源逐字节移植 + LF 归一化完整性校验。

用法(repo 根目录跑):
    python windows-adaptations/port_from_mac.py <base-ref> <target-ref> [--apply] [--clone tmp/mac-sync-2.6.7]

    <base-ref>    上次同步基线(memory CURRENT 节记录的 SHA/tag)
    <target-ref>  本次同步目标(通常 vX.Y.Z tag;先按 SKILL 铁律 2 确认无历史重写)

默认 dry-run:打印分类清单(移植 A/C/M/R + 需手工镜像的删除 D + 非产品文件跳过)。
--apply:对 Horosa-Web/ 下的 A/C/M/R 文件做 `git show` 字节精确落盘(绝不经文本管道),
删除项打印命令**不自动执行**(删除永远人工确认),最后 LF 归一化逐文件校验(0 差异才 exit 0)。

institutionalizes:#35 跨仓对比必须 LF 归一化内容比;#45 抽取管道转码坑;#49 移植后校验纪律。
overlay 文件冲突交给 apply.sh + selfcheck 哨兵(本脚本只做「纯移植面」)。
"""
import os
import subprocess
import sys

# Windows 控制台默认 cp1252/936 会让中文输出炸 UnicodeEncodeError —— 强制 UTF-8(输出仅供人读)。
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

WS = "local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c"
PREFIX = "Horosa-Web/"


def sh(args, **kw):
    return subprocess.run(args, capture_output=True, **kw)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    apply_mode = "--apply" in sys.argv
    clone = "tmp/mac-sync-2.6.7"
    for a in sys.argv[1:]:
        if a.startswith("--clone="):
            clone = a.split("=", 1)[1]
    if len(args) != 2:
        print(__doc__)
        return 2
    base, target = args

    # 基线必须仍在目标历史内(不在=Mac 重写历史,停下走 SKILL 铁律 2 的桥接法)
    anc = sh(["git", "-C", clone, "merge-base", "--is-ancestor", base, target])
    if anc.returncode != 0:
        print(f"FATAL: {base} is NOT an ancestor of {target} — Mac 历史重写/基线错误。")
        print("按 SKILL 铁律 2 / 存档 #29 桥接:在旧 clone 内 fetch 新历史后用旧 SHA 直连 diff。")
        return 1

    ns = sh(["git", "-C", clone, "diff", "--name-status", base, target, "--", PREFIX], text=True)
    ported, deletions, renames = [], [], []
    for line in ns.stdout.splitlines():
        parts = line.split("\t")
        st = parts[0]
        if st.startswith("R"):
            old, new = parts[1], parts[2]
            renames.append((old, new))
        elif st == "D":
            deletions.append(parts[1])
        else:
            ported.append(parts[1])

    print(f"delta {base[:9]}..{target[:9]}: port={len(ported)} rename={len(renames)} delete={len(deletions)}")
    for old, new in renames:
        print(f"  RENAME: {old} -> {new}(新路径按移植处理,旧路径按删除处理)")
        ported.append(new)
        deletions.append(old)
    if not apply_mode:
        for f in ported:
            print(f"  PORT:   {f}")
        for f in deletions:
            print(f"  DELETE(manual): rm '{WS}/{f[len(PREFIX):]}'")
        print("\ndry-run(加 --apply 执行移植;删除永远手工确认)")
        return 0

    for f in ported:
        rel = f[len(PREFIX):]
        dst = f"{WS}/{rel}"
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        blob = sh(["git", "-C", clone, "show", f"{target}:{f}"])
        if blob.returncode != 0:
            print(f"FATAL: cannot read {target}:{f}")
            return 1
        with open(dst, "wb") as fh:
            fh.write(blob.stdout)
        print(f"ported {rel}")

    norm = lambda b: b.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    bad = 0
    for f in ported:
        rel = f[len(PREFIX):]
        mac = sh(["git", "-C", clone, "show", f"{target}:{f}"]).stdout
        with open(f"{WS}/{rel}", "rb") as fh:
            win = fh.read()
        if norm(mac) != norm(win):
            print(f"VERIFY DIFF: {rel}")
            bad += 1
    print(f"LF-normalized verify: {len(ported)} files, mismatches={bad}")
    if deletions:
        print("\n下列删除需手工镜像(逐条确认后执行):")
        for f in deletions:
            print(f"  rm '{WS}/{f[len(PREFIX):]}'")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
