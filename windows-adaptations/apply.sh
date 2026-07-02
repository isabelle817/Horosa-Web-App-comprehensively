#!/usr/bin/env bash
# Re-apply the Windows-only adaptations onto a freshly wholesale-replaced product source.
#
# WHY THIS EXISTS: the Windows product source (local/workspace/Horosa-Web-*/) is gitignored
# (build-harness-only repo) + is wholesale-replaced from the Mac repo on every sync. The Mac
# tree LACKS these Windows adaptations, so each sync drops them. A `git reset --hard` / wipe
# also loses them. They were once lost with no recovery (the v2.5.0 "disaster"), so they now
# live HERE, tracked in git, and this script restores them deterministically.
#
# USAGE (from repo root, after wholesale-replacing the product source from the Mac clone):
#   bash windows-adaptations/apply.sh <workspace-product-dir> [mac-clone-Horosa-Web-dir]
# e.g.
#   bash windows-adaptations/apply.sh \
#     local/workspace/Horosa-Web-55c75c5b088252fbd718afeffa6d5bcb59254a0c \
#     tmp/mac-sync-2.5.0/Horosa-Web
set -uo pipefail
OV="$(cd "$(dirname "$0")" && pwd)"
WS="${1:?usage: apply.sh <workspace-product-dir> [mac-clone-Horosa-Web-dir]}"
MAC="${2:-}"
[ -d "$WS/astrostudyui" ] || { echo "ERR: $WS is not a product dir (no astrostudyui/)"; exit 1; }
ok(){ echo "  [ok] $*"; } ; warn(){ echo "  [!!] $*"; }

echo "== 1. Windows-only files (umi-runner.js / loadCryptoDeps.js / scripts/vendor) =="
cp "$OV/files/astrostudyui/scripts/umi-runner.js"     "$WS/astrostudyui/scripts/umi-runner.js"     && ok umi-runner.js
cp "$OV/files/astrostudyui/scripts/loadCryptoDeps.js" "$WS/astrostudyui/scripts/loadCryptoDeps.js" && ok loadCryptoDeps.js
rm -rf "$WS/astrostudyui/scripts/vendor"
cp -r "$OV/files/astrostudyui/scripts/vendor" "$WS/astrostudyui/scripts/vendor" && ok "scripts/vendor/ ($(find "$WS/astrostudyui/scripts/vendor" -type f | wc -l) files)"

echo "== 2. astropy/requirements.txt — strip the unresolvable flatlib pin (flatlib is vendored via sys.path) =="
if grep -q '^flatlib==' "$WS/astropy/requirements.txt" 2>/dev/null; then
  sed -i '/^flatlib==/d' "$WS/astropy/requirements.txt"; ok "flatlib pin removed"
else ok "flatlib pin already absent"; fi

echo "== 3. astrostudyui/package.json — keep Mac deps, restore Windows name + umi-runner scripts =="
node -e '
const fs=require("fs");
const pkgP=process.argv[1], winP=process.argv[2];
const pkg=JSON.parse(fs.readFileSync(pkgP,"utf8")), win=JSON.parse(fs.readFileSync(winP,"utf8"));
pkg.name=win.name; pkg.scripts=win.scripts;
fs.writeFileSync(pkgP, JSON.stringify(pkg,null,"\t")+"\n");
console.log("  [ok] name="+pkg.name+"; scripts="+Object.keys(pkg.scripts).join(","));
' "$WS/astrostudyui/package.json" "$OV/files/astrostudyui/package.name-scripts.json"

echo "== 4. THIRD_PARTY_NOTICES.md — Mac keeps it at REPO ROOT; Windows needs it in the workspace root =="
if [ -n "$MAC" ] && [ -f "$MAC/../THIRD_PARTY_NOTICES.md" ]; then
  cp "$MAC/../THIRD_PARTY_NOTICES.md" "$WS/THIRD_PARTY_NOTICES.md"; ok "copied from $MAC/../THIRD_PARTY_NOTICES.md"
elif [ -n "$MAC" ] && [ -f "$MAC/THIRD_PARTY_NOTICES.md" ]; then
  cp "$MAC/THIRD_PARTY_NOTICES.md" "$WS/THIRD_PARTY_NOTICES.md"; ok "copied from $MAC/THIRD_PARTY_NOTICES.md"
else warn "Mac clone not given/found — copy THIRD_PARTY_NOTICES.md from the Mac repo root into $WS/ manually"; fi

echo "== 5. source patches (isDesktopShellWindow + ensureField) — applied only if the marker is missing =="
apply_patch(){ # $1=marker $2=target-rel $3=patchfile
  if grep -q "$1" "$WS/$2" 2>/dev/null; then ok "$2 already has $1"; return; fi
  if git apply -p1 --directory="$WS" "$OV/patches/$3" 2>/dev/null || (cd "$WS" && patch -p1 --silent < "$OV/patches/$3" 2>/dev/null); then
    ok "patched $2 ($1)";
  else warn "auto-patch FAILED for $2 — apply the $1 change by hand per windows-adaptations/README.md"; fi
}
apply_patch isDesktopShellWindow astrostudyui/src/utils/windowSizePersistence.js src__utils__windowSizePersistence.js.patch
apply_patch ensureField           astrostudyui/src/pages/index.js                 src__pages__index.js.patch

echo "== 6. backend patch (boundless #14: loopback NEVER via the system proxy) — REQUIRES a jar rebuild =="
apply_patch isLoopbackTarget     astrostudysrv/boundless/src/main/java/boundless/net/http/HttpUriRequestHystrixCommand.java boundless__HttpUriRequestHystrixCommand.java.patch
echo "   ^^ boundless is BACKEND Java. After this patch you MUST rebuild astrostudyboot.jar (SKILL gotcha #5):"
echo "      boundless install -> astrostudy install -> astrostudycn install -> astrostudyboot clean package,"
echo "      then copy target/astrostudyboot.jar to local/workspace/runtime/windows/bundle/. apply.sh does NOT rebuild it,"
echo "      and prepare:runtime's auto-build pulls boundless from .m2 (stale) — so the manual rebuild is mandatory."

echo "== 7. performance overlays (天文馆渲染门控 + echarts 模块化;纯前端、只动时机/打包、可一键回退) =="
# net-new:玄学史 echarts 模块化注册(整包 -> 按需 use())。
cp "$OV/files/astrostudyui/src/components/xuanshi/echartsCore.js" "$WS/astrostudyui/src/components/xuanshi/echartsCore.js" && ok "echartsCore.js"
# marker-guarded:Mac 若已合入同款优化,marker 命中即跳过 -> apply.sh 变 no-op(isLoopbackTarget 先例)。
apply_patch planetariumRenderGatingEnabled astrostudyui/src/utils/perfFlags.js                          src__utils__perfFlags.js.patch
apply_patch "perf:planetariumRenderGating" astrostudyui/src/components/planetarium/PlanetariumBabylon.js src__components__planetarium__PlanetariumBabylon.js.patch
apply_patch "./echartsCore"                astrostudyui/src/components/xuanshi/XuanShiCelestial.js       src__components__xuanshi__XuanShiCelestial.js.patch
apply_patch "./echartsCore"                astrostudyui/src/components/xuanshi/XuanShiMap.js             src__components__xuanshi__XuanShiMap.js.patch

echo "== 8. v3.0.1 perf round-2 (交互/切技法;纯前端结果缓存 + 后端逐段计时;均带 kill-switch、功能零降级) =="
# 前端:技法结果缓存开关(techniqueResultCacheEnabled)——须先应用上面的 planetarium perfFlags 补丁(本补丁上下文含其行)。
apply_patch techniqueResultCacheEnabled    astrostudyui/src/utils/perfFlags.js                          src__utils__perfFlags.techniqueCache.js.patch
# 前端:紫微本盘 /ziwei/birth 走确定性缓存(cachedPost),重复/来回切秒回。
apply_patch techniqueResultCacheEnabled    astrostudyui/src/components/ziwei/ZiWeiMain.js               src__components__ziwei__ZiWeiMain.js.patch
echo "== 9. backend perf: /chart 逐段计时(B0,纯观测日志、不改结果)— REQUIRES a jar rebuild =="
apply_patch CHART_PERF_SEG_REV             astrostudysrv/astrostudycn/src/main/java/spacex/astrostudycn/controller/ChartController.java astrostudycn__ChartController.java.patch
echo "   ^^ astrostudycn is BACKEND Java. After this patch you MUST rebuild astrostudyboot.jar (SKILL gotcha #5):"
echo "      astrostudycn install -> astrostudyboot clean package, then copy target/astrostudyboot.jar to bundle."

echo "== 10. v3.0.1 perf round-3 (首屏并行 + 每请求日志栈回溯去除;均带 kill-switch、功能零降级) =="
# 前端:首屏并行化开关(firstLoadParallelEnabled)——须先应用上面的 perfFlags 补丁(本补丁上下文含其行)。
apply_patch firstLoadParallelEnabled       astrostudyui/src/utils/perfFlags.js                          src__utils__perfFlags.firstLoadParallel.js.patch
# 前端:玄学史首屏 4 请求并行(总览/玄典/名家/事件),首开更快。
apply_patch firstLoadParallelEnabled       astrostudyui/src/components/xuanshi/XuanShiMain.js           src__components__xuanshi__XuanShiMain.js.patch
echo "== 11. backend perf: QueueLog 去掉每条日志的同步栈回溯(默认关,-Dhorosa.queuelog.callerLocation=true 恢复)— REQUIRES a jar rebuild =="
apply_patch "horosa.queuelog.callerLocation" astrostudysrv/boundless/src/main/java/boundless/log/QueueLog.java boundless__QueueLog.java.patch
echo "   ^^ boundless is BACKEND Java (base of all modules). After this patch rebuild astrostudyboot.jar (SKILL gotcha #5):"
echo "      boundless install -> astrostudy install -> astrostudycn install -> astrostudyboot clean package, then copy to bundle."

echo "== 12. v3.0.1 perf ROUND-3 R1 (jieqi/year 30s→2-3s: swap Chart-per-iteration for direct swe.sweObject(SUN);跨平台代码 bug,Mac 靠算力盖住) =="
# YearJieQi.approach + BirthJieQi.approach 原本每次收敛迭代都 new 一个完整 flatlib Chart(20+ 行星+12 宫+40 阿拉伯点=100+ swe 调用)只为读太阳位置。
# 直接 swe.sweObject(SUN, jd, SEDEFAULT_FLAG) 返回同一 {lon, lonspeed}，收敛判据/delta 公式/Datetime.fromJD 全部一字未动 → 结果逐字节等价。
# 自证:golden diff 24 term + 100+ 随机组合 max_jdn_diff=0.000e+00, VERDICT=ALL_EQUAL, SPEEDUP 21-44×。kill-switch HOROSA_JIEQI_FAST_APPROACH=0。
apply_patch HOROSA_JIEQI_FAST_APPROACH     astropy/astrostudy/jieqi/YearJieQi.py         astropy__jieqi__YearJieQi.fastApproach.py.patch
apply_patch HOROSA_JIEQI_FAST_APPROACH     astropy/astrostudy/jieqi/BirthJieQi.py        astropy__jieqi__BirthJieQi.fastApproach.py.patch

echo "== 13. v3.0.1 perf ROUND-3 R2 (paramhash 磁盘缓存永远 silent no-op 根治;centralized persistable()·所有 11 controller 自动受惠) — REQUIRES a jar rebuild =="
# JieQiController.getYearParams() 直接把 TimeZiAlg + PhaseType 两个 Java Enum 塞进返回体;
# ParamHashCacheHelper.canPersistLocal() 遇非原语返回 false → saveToLocal 无异常无日志 return → 磁盘缓存零条,每次冷 recompute。
# ChartController 早年用私有 toPlainMap 补丁式绕过,JieQiController/LiuRengController/PaiBaZiController 等全部漏抄。
# 根治式泛化:promote toPlainMap 为 helper.persistable(Object) 公共方法,并在 ParamHashCacheHelper.get(...) 内部
# fun.apply 之后 saveToLocal 之前统一 round-trip。全 11 处 controller 调用点(ChartController × 3 / JieQiController × 2 /
# LiuRengController × 2 / IndiaChartController / BaZiBirthController / PaiBaZiController / AstroHelper)自动受惠,
# 未来任何新 controller 也不再有可能复发此 bug。
apply_patch PARAMHASH_PERSISTABLE_REV      astrostudysrv/astrostudy/src/main/java/spacex/astrostudy/helper/ParamHashCacheHelper.java astrostudy__ParamHashCacheHelper.persistable.java.patch
echo "   ^^ astrostudy is BACKEND Java (base of astrostudycn+astrostudyboot). After this patch rebuild astrostudyboot.jar (SKILL gotcha #5):"
echo "      astrostudy install -> astrostudycn install -> astrostudyboot clean package, then copy to bundle."

echo "== 14. v3.0.1 perf ROUND-3 R3 (Python 冷启 -5-10s:kentang 全 17 service 惰性 mount + xuanshi idle 预热) =="
# webchartsrv.py 里 mount_kentang_services() 原本同步 __import__ 17 个 spec,其中 webxuanshisrv 递归拉起 xuanshi
# 整棵树(db + queries + celestial + editorial + 99MB SQLite bundles)。v3.0.0 新增,v2.6.9 无此路径 → 就是「同机器 v2.6.9 快 v3.0.0 慢」的元凶。
# 根治式泛化:全 17 service 一律走 _LazyMountedService(CherryPy 挂载对象、method 触发时 importlib.import_module 一次并 memoize),
# 未来任何新增大模块也不再引入启动 regression;另加 background daemon thread 睡 5s 后预热 webxuanshisrv,让第一次点玄学史 tab 也秒开。
# 自证:mount_call_ms=12,018ms → 0.2ms(60,000× 加速),webxuanshisrv + 7 个 xuanshi 子模块从启动 tree 完全消失。
# kill-switch HOROSA_KENTANG_LAZY_MOUNT=0(回退)、HOROSA_XUANSHI_WARMUP=0(关预热)、HOROSA_XUANSHI_LAZY_IMPORT=0(关 xuanshi 包 PEP 562 lazy)。
apply_patch HOROSA_KENTANG_LAZY_MOUNT      astropy/websrv/kentang/registry.py            astropy__kentang__registry.lazyMountAll.py.patch
apply_patch "xuanshi.lazyImport"           astropy/astrostudy/xuanshi/__init__.py        astropy__xuanshi__init.lazyImport.py.patch
# ROUND-4 追加：该 patch 现同时携带 玄学史 global_summary 预热(首点数据物化)、七政 streamlit 错峰预热
# (HOROSA_QIZHENG_WARMUP)、以及全技法泛化预热 _horosa_services_warmup(HOROSA_SERVICES_WARMUP，9s 起
# 错峰逐个预导入其余 16 个懒挂载服务模块)。守卫 marker 用最新的 HOROSA_SERVICES_WARMUP：同步后的
# pristine 文件必缺它 → patch 全量重放；patch 内含全部预热(R3 xuanshi + R4 三项)。
apply_patch HOROSA_SERVICES_WARMUP         astropy/websrv/webchartsrv.py                 astropy__webchartsrv.xuanshiWarmup.py.patch

echo "== 15. v3.0.1 perf ROUND-4 P0 (log4j Windows 缺陷：6 个程序化 appender 以字面 env:HOME 模板建文件, NTFS 拒绝 → 启动报错刷屏 + perf/错误日志静默丢失) — REQUIRES a jar rebuild =="
# 根因：AppLoggers.createLog/changeLogFile/getBaseDir 用 getStrSubstitutor().getVariableResolver().lookup("basedir")
# 拿到的是 log4j2.xml 里未替换的模板串(POSIX 容忍这种目录名所以 mac/linux 能用，NTFS 直接拒绝)。
# 修法：resolveBaseDir() 优先读启动器一直在传的 -Dhorosa.log.basedir；缺省回落原 lookup；结果仍含未解析模板
# 再回落 user.home/.horosa-logs/astrostudyboot。changeLogFile 的按日重建加 startsWith 守卫(只轮转本 basedir
# 布局的 appender，XML appender 跳过 —— 修掉原 substring 位置数学的越界/停旧未建新隐患)。无 -D 时行为与原实现
# 一致 → 服务器/mac 部署零变化。marker: log_basedir_v1 (HOROSA_LOG_BASEDIR_REV 常量，兼作 jar 内容哨兵)。
apply_patch log_basedir_v1                 astrostudysrv/boundless/src/main/java/boundless/log/AppLoggers.java boundless__AppLoggers.logBasedir.java.patch
echo "   ^^ boundless is BACKEND Java. After this patch you MUST rebuild astrostudyboot.jar (SKILL gotcha #5):"
echo "      boundless install -> astrostudyboot clean package, then copy target/astrostudyboot.jar to local/workspace/runtime/windows/bundle/."

echo "== 16. v3.0.1 perf ROUND-4 P1 (占星首盘 9.7s 的 80%=baziAssemble 7781ms 一次性冷成本 → 启动后台预跑一次) — REQUIRES a jar rebuild =="
# B0 分段实测:首盘 /chart seg ms python=1884 baziAssemble=7781 predictSign=4 predSync=0 total=9669。
# OnlyFourColumns/NongliHelper 首次执行付 类初始化+历法表加载+JIT;之后瞬完。加 baziAssembleWarmup
# CommandLineRunner(daemon,合成参数预跑 构造+getNongli,结果丢弃,失败静默)。kill: HOROSA_CHART_WARMUP=0。
# marker: bazi_warmup_v1(HOROSA_CHART_WARMUP_REV 常量,兼作 jar 内容哨兵)。
apply_patch bazi_warmup_v1                 astrostudysrv/astrostudyboot/src/main/java/spacex/astrostudyboot/AstroStudyProgram.java astrostudyboot__AstroStudyProgram.baziWarmup.java.patch
echo "   ^^ astrostudyboot is BACKEND Java. After this patch rebuild: astrostudyboot clean package, then copy to bundle."

echo "== done. Verify: npm run selfcheck (windows-ahead / perf sentinels must all pass). =="
