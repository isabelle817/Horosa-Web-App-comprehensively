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

echo "== 17. v3.0.1 perf ROUND-5 (Python 排盘热路径请求内 memo;纯每实例缓存、reinit() 重置、无行为开关、golden 字节全等) =="
# perchart.py:同一 /chart 请求内重复计算的 6 处纯函数结果 memo(67 恒星批/28 宿调整批/28 宿原始批/
# 日出求解/围攻/互容 —— 均为「同请求同输入被算 2-3 次」的浪费)。缓存挂在 chart 实例上,reinit() 清零,
# 跨请求零共享;golden 4 变体(标准/南盘/斗柄/七政)PYTHONHASHSEED=0 下逐字节全等。重复盘 617-747ms → 443-504ms。
apply_patch _getFixedStars67Cached         astropy/astrostudy/perchart.py                astropy__perchart.chartMemo.py.patch
# guo74.py:virtualSu28 逐星 chart.getFixedStar()×28 → 改读 perchart 的原始 28 宿批缓存(同一请求第三次取数)。
apply_patch getRawFixedStarSu28Cached      astropy/astrostudy/guostarsect/guo74.py       astropy__guostarsect__guo74.su28Batch.py.patch
# flatlib ephem.py:恒星批(67 星/28 宿)只依赖 (IDs, jd, pos, height, flags, sidereal 上下文),与宫位制/
# 容许度无关 → 有界 LRU(8 条,线程安全,存取皆 deepcopy 防 relocate/+180° 串染)。「改设置重排同一盘」
# 恒星段 379-480ms → 183-236ms。kill-switch HOROSA_STAR_LRU=0。
apply_patch HOROSA_STAR_LRU                flatlib-ctrad2/flatlib/ephem/ephem.py         flatlib__ephem.starLru.py.patch

echo "== 18. v3.0.1 perf ROUND-5 (历法求解降维:NongLi.approach 朔/节候选 + BirthJieQi 上升瘦盘;同一 HOROSA_JIEQI_FAST_APPROACH 开关) =="
# NongLi.approach:朔(日月合)与节气候选求解原本每迭代 new 完整 Chart;改 swe.sweObject 直读日/月经度,
# 收敛判据一字不动 → 4 年(含公元前 500)golden 逐字节全等;整年农历表 1445-2460ms → 113-194ms。
apply_patch _JIEQI_FAST_APPROACH           astropy/astrostudy/jieqi/NongLi.py            astropy__jieqi__NongLi.fastApproach.py.patch
# BirthJieQi(R3 patch 已重生成,现同时携带 R5 _ascChart):卯时/上升求解只读 ASC → 瘦 Chart(仅太阳、
# needpars=False);3 个代表日期 golden 全等,398-490ms → 30-36ms。guard 沿用 HOROSA_JIEQI_FAST_APPROACH(§12 已应用则跳过)。

echo "== 19. v3.0.1 perf ROUND-5 (webchartsrv 追加:cetian 懒挂载 + /chart 三段计时;patch 已并入 §14 同一文件) =="
# §14 的 webchartsrv patch 已于 v3.1.0 基线重生成,现同时携带:HOROSA_CETIAN_LAZY(cetian 懒挂载;历史上
# webcetiansrv 拖 streamlit=启动导入墙 49%,v3.1.0 上游 stub 后仍省引擎冷导入)、HOROSA_PY_CHART_TIMING
# (=1 时打 CHART_PY_PERF init/build/encode 三段,纯观测)。
# 注:Windows ROUND-5 的 HOROSA_PY_WARMUP_BLOCKING/_run_startup_warmups 已被 v3.1.0 上游「启动就绪门」
# (STARTUP_GATE + HOROSA_PY_WARMUP_SYNC,warmup 后台线程 + 业务 POST 门闸)取代收编,不再由本 overlay 携带。
# guard 沿用 §14 的 HOROSA_SERVICES_WARMUP(pristine 必缺 → 全量重放,patch 含全部追加)。

echo "== 20. v3.0.1 perf ROUND-5 B-F3 (农历「日级」外部缓存读写桌面版停用;年表持久化不动) — REQUIRES a jar rebuild =="
# NongliHelper:每个未见过的日期一读一写外部缓存(读基本必 miss)。日行是内存月表的纯推导,重算逐字节
# 一致 → env HOROSA_NONGLI_DAY_PERSIST=0(桌面壳注入)跳过日级读写;env 缺省=原行为(Mac/服务器零变化)。
apply_patch nongli_day_persist_v1          astrostudysrv/astrostudy/src/main/java/spacex/astrostudy/helper/NongliHelper.java astrostudy__NongliHelper.dayPersist.java.patch
# OnlyFourColumns.forwardDirect:流水 println(每盘一行 stdout 管道噪音,零响应字节)删除。
apply_patch quiet_println_v1               astrostudysrv/astrostudycn/src/main/java/spacex/astrostudycn/model/OnlyFourColumns.java astrostudycn__OnlyFourColumns.quietPrintln.java.patch
echo "   ^^ astrostudy+astrostudycn are BACKEND Java. After these patches rebuild astrostudyboot.jar (SKILL gotcha #5):"
echo "      astrostudy install -> astrostudycn install -> astrostudyboot clean package, then copy to bundle."

echo "== 21. v3.1.0 官方仓库链接平台化(「关于」法律文档 + 官方下载渠道指向 Windows 仓库) =="
# Mac v3.1.0 在 PageHeader「关于」里挂了 docs/legal 与 releases 链接,但 HOROSA_OFFICIAL_REPO 硬编码为
# Mac 仓库 URL —— Windows 用户点「官方下载渠道」会落到错误平台的下载页。改指本仓库(docs/legal 已随
# 同步 tracked 进本仓库,链接同构有效)。marker = Windows 仓库 URL 本身。
apply_patch "comprehensively-improved-Windows" astrostudyui/src/components/homepage/PageHeader.js src__components__homepage__PageHeader.officialRepo.js.patch

echo "== done. Verify: npm run selfcheck (windows-ahead / perf sentinels must all pass). =="
