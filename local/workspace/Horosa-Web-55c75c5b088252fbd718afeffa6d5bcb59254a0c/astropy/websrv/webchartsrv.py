
import os
import sys
import traceback
import json
import time
import socket
import signal
import subprocess
import threading
import cherrypy

try:
    import jsonpickle
except ImportError:
    class _JsonpickleCompat:
        @staticmethod
        def encode(obj, unpicklable=False):
            return json.dumps(obj, ensure_ascii=False, default=str)

    jsonpickle = _JsonpickleCompat()

# v3.0.1 perf ROUND-5 (#18 观测):HOROSA_PY_CHART_TIMING=1 时对 /chart 打三段计时(init/build/encode),
# 与 Java 侧 B0(CHART_PERF_SEG_REV)对齐,补齐 python= 段的构成黑盒。默认关=输出与响应逐字节不变。
_PY_CHART_TIMING = os.environ.get('HOROSA_PY_CHART_TIMING', '0').lower() in ('1', 'true', 'yes', 'on')

# Ensure flatlib is resolvable from bundled sources.
_CUR_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJ_ROOT = os.path.abspath(os.path.join(_CUR_DIR, "..", ".."))
_FLATLIB_CANDIDATES = [
    os.path.join(_PROJ_ROOT, "flatlib-ctrad2"),
    os.path.abspath(os.path.join(_PROJ_ROOT, "..", "flatlib-ctrad2")),
]
for _cand in reversed(_FLATLIB_CANDIDATES):
    if os.path.isdir(os.path.join(_cand, "flatlib")) and _cand not in sys.path:
        sys.path.insert(0, _cand)

from astrostudy.perchart import PerChart, push_request_terms, pop_request_terms, parse_terms_variant, push_request_trip, pop_request_trip
from astrostudy.guostarsect.guostarsect import GuoStarSect
from astrostudy.thirteenthchart import ThirteenthChart, HarmonicChart
from astrostudy.helper import getPredictivesObj
from websrv.helper import enable_crossdomain
from websrv._guards import validate_geo
from websrv.webpredictsrv import PredictSrv
from websrv.webindiasrv import IndiaAstroSrv, warmup_india
from websrv.webmodernsrv import ModernAstroSrv
from websrv.webgermanysrv import GermanyAstroSrv
from websrv.webjieqisrv import JieQiSrv
from websrv.webjdn import WebJdnSrv
from websrv.webcalc import WebCalcSrv
from websrv.webacgsrv import AcgSrv
from websrv.webastroextrasrv import AstroExtraSrv
from websrv.webplanetariumsrv import PlanetariumSrv
# 策天飞星:已按《十八飞星策天紫微斗数》全面重写为自有引擎,从 kentang 摘出直接挂载。
# v3.0.1 perf ROUND-5 (HOROSA_CETIAN_LAZY):webcetiansrv 顶层拉起 streamlit —— 启动导入墙的 49%
# (973 个启动模块中的 320 个,实测暖导入 1.3-1.9s、冷 ~2.4s+),是懒挂载模式漏掉的唯一重挂载。
# 与 kentang 17 个服务同款 _LazyMountedService 惰性代理(首个 /cetian 请求才导入,sys.modules 记忆化,
# 行为逐字节不变);预热线程会在空闲期提前导入。kill-switch:HOROSA_CETIAN_LAZY=0 恢复饿加载。
from websrv.kentang.registry import mount_kentang_services, _LazyMountedService

_CETIAN_LAZY = os.environ.get('HOROSA_CETIAN_LAZY', '1').lower() not in ('0', 'false', 'no', 'off')
if not _CETIAN_LAZY:
    from websrv.webcetiansrv import CeTianSrv



class WebChartSrv:
    exposed = True
    PD_SYNC_REV = 'pd_method_sync_v12'
    WARMED = False  # PD warmup 完成置 True;/healthz 据此报「真就绪」(P0 启动稳健化,纯增量)
    PD_WARMUP_SAMPLE = {
        'date': '2028/04/06',
        'time': '09:33:00',
        'zone': '+00:00',
        'lat': '41n26',
        'lon': '174w30',
        'gpsLat': -41.433333,
        'gpsLon': 174.5,
        'hsys': 1,
        'tradition': False,
        'predictive': True,
        'includePrimaryDirection': True,
        'zodiacal': 0,
        'simpleAsp': False,
        'strongRecption': False,
        'virtualPointReceiveAsp': True,
        'southchart': False,
        'ad': 1,
        'pdtype': 0,
        'pdMethod': 'core_alchabitius',
        'pdTimeKey': 'Ptolemy',
        'pdaspects': [0, 60, 90, 120, 180],
    }

    @cherrypy.expose
    @cherrypy.config(**{'tools.cors.on': True})
    def healthz(self):
        # 免签名就绪探针(P0):warmup 完成后 warm=True;能连通即存活,warm 区分「真就绪」。纯增量,不影响既有路由。
        enable_crossdomain()
        return jsonpickle.encode({'ok': True, 'service': 'chart', 'warm': WebChartSrv.WARMED, 'pdSyncRev': WebChartSrv.PD_SYNC_REV}, unpicklable=False)

    @cherrypy.expose
    @cherrypy.config(**{'tools.cors.on': True})
    @cherrypy.tools.json_in()
    def index(self):
        enable_crossdomain()
        if cherrypy.request.method != 'POST':
            return jsonpickle.encode({
                'ok': True,
                'service': 'chart',
                'pdSyncRev': self.PD_SYNC_REV,
            }, unpicklable=False)
        # 界系(termsVariant)请求级临界区:push 取锁+换 essential.TERMS,整盘计算(尊贵/界主/互容接纳/
        # 围攻日木互容/predictives)都用所选界,finally 必还原+释放锁(防并发串界)。默认埃及=零回归。
        _terms_orig = None
        try:
            data = cherrypy.request.json

            # 畸形日期护栏：前端 PD-sync 偶发会发来 date/time='NaN...'（旧 bug，前端亦已多处拦截）。
            # 此处干净返回、不进 PerChart（避免 Datetime 抛栈刷日志），前端按空响应处理、不弹 param error。
            _dprobe = '{0}'.format(data.get('date', ''))
            _tprobe = '{0}'.format(data.get('time', ''))
            if 'NaN' in _dprobe or 'NaN' in _tprobe or _dprobe.strip() == '':
                return jsonpickle.encode({'err': 'invalid_date'}, unpicklable=False)
            _geoerr = validate_geo(data)
            if _geoerr:
                return jsonpickle.encode(_geoerr, unpicklable=False)
            print(data)

            _terms_orig = push_request_terms(data.get('termsVariant', 0), data.get('leoBoundFirst'))
            _trip_orig = push_request_trip(data.get('triplicity'))
            _pt0 = time.perf_counter() if _PY_CHART_TIMING else 0.0
            perchart = PerChart(data)
            _pt1 = time.perf_counter() if _PY_CHART_TIMING else 0.0
            guostar = GuoStarSect(perchart)
            guolao_sunrise_time = None
            if data.get('guolaoLifeMode') == 'yumao':
                try:
                    guolao_sunrise_time = perchart.getSunRiseTime().get('timeStr')
                except Exception:
                    traceback.print_exc()

            obj = {
                'params': {
                    'birth': perchart.getBirthStr(),
                    'ad': -1 if perchart.isBC else 1,
                    'lat': data['lat'],
                    'lon': data['lon'],
                    'hsys': data['hsys'],
                    'zone': data['zone'],
                    'tradition': perchart.tradition,
                    'zodiacal': perchart.zodiacal,
                    'siderealAyanamsa': perchart.siderealAyanamsa,
                    'doubingSu28': perchart.su28Mode,
                    'termsVariant': parse_terms_variant(data.get('termsVariant', 0)),
                    'showPdBounds': data.get('showPdBounds', 1),
                    'pdtype': perchart.pdtype,
                    'pdMethod': perchart.pdMethod,
                    'pdTimeKey': perchart.pdTimeKey,
                    'pdDirect': 1 if perchart.pdDirect else 0,
                    'pdConverse': 1 if perchart.pdConverse else 0,
                    'pdAntiscia': 1 if perchart.pdAntiscia else 0,
                    'pdTerms': 1 if perchart.pdTerms else 0,
                    'pdSyncRev': self.PD_SYNC_REV,
                },
                'chart': perchart.getChartObj(),
                'receptions': perchart.getReceptions(),
                'mutuals': perchart.getMutuals(),
                'declParallel': perchart.getParallel(),
                'aspects': {
                    'normalAsp': perchart.getAspects(),
                    'immediateAsp': perchart.getImmediateAspects(),
                    'signAsp': perchart.getSignAspects()
                },
                'lots': perchart.getPars(perchart.chart),
                'surround': {
                    'planets': perchart.surroundPlanets(),
                    'attacks': perchart.surroundAttacks(),
                    'houses': perchart.surroundHouses(),
                    'besiegement': perchart.besiegementDetail()
                },
                'guoStarSect': {
                    'houses': guostar.allTerm()
                }
            }
            if guolao_sunrise_time:
                obj['params']['guolaoLifeMode'] = data.get('guolaoLifeMode')
                obj['params']['guolaoSunRiseTime'] = guolao_sunrise_time

            predictives = getPredictivesObj(data, perchart)
            if predictives is not None:
                obj['predictives'] = predictives

            _pt2 = time.perf_counter() if _PY_CHART_TIMING else 0.0
            res = jsonpickle.encode(obj, unpicklable=False)
            if _PY_CHART_TIMING:
                _pt3 = time.perf_counter()
                print('CHART_PY_PERF rev=py_chart_seg_v1 init={0:.0f} build={1:.0f} encode={2:.0f} total={3:.0f}'.format(
                    (_pt1 - _pt0) * 1000, (_pt2 - _pt1) * 1000, (_pt3 - _pt2) * 1000, (_pt3 - _pt0) * 1000), flush=True)
            return res
        except:
            traceback.print_exc()
            obj = {
                'err': 'param error'
            }
            return jsonpickle.encode(obj, unpicklable=False)
        finally:
            pop_request_trip(_trip_orig)
            pop_request_terms(_terms_orig)

    @cherrypy.expose
    @cherrypy.config(**{'tools.cors.on': True})
    @cherrypy.tools.json_in()
    def chart13(self):
        enable_crossdomain()
        _terms_orig = None
        try:
            data = cherrypy.request.json

            data['tradition'] = False
            data['predictive'] = False
            _terms_orig = push_request_terms(data.get('termsVariant', 0), data.get('leoBoundFirst'))
            _trip_orig = push_request_trip(data.get('triplicity'))
            perchart = PerChart(data)
            chart13 = ThirteenthChart(perchart)
            chart13.fractal()

            guostar = GuoStarSect(perchart)

            obj = {
                'params': {
                    'birth': perchart.getBirthStr(),
                    'ad': -1 if perchart.isBC else 1,
                    'lat': data['lat'],
                    'lon': data['lon'],
                    'hsys': data['hsys'],
                    'zone': data['zone'],
                    'tradition': perchart.tradition,
                    'zodiacal': perchart.zodiacal,
                    'termsVariant': parse_terms_variant(data.get('termsVariant', 0)),
                    'showPdBounds': data.get('showPdBounds', 1),
                    'pdtype': perchart.pdtype,
                    'pdMethod': perchart.pdMethod,
                    'pdTimeKey': perchart.pdTimeKey,
                    'pdDirect': 1 if perchart.pdDirect else 0,
                    'pdConverse': 1 if perchart.pdConverse else 0,
                    'pdAntiscia': 1 if perchart.pdAntiscia else 0,
                    'pdTerms': 1 if perchart.pdTerms else 0,
                    'pdSyncRev': self.PD_SYNC_REV,
                },
                'chart': perchart.getChartObj(),
                'receptions': perchart.getReceptions(),
                'mutuals': perchart.getMutuals(),
                'declParallel': perchart.getParallel(),
                'aspects': {
                    'normalAsp': perchart.getAspects(),
                    'immediateAsp': perchart.getImmediateAspects(),
                    'signAsp': perchart.getSignAspects()
                },
                'lots': perchart.getPars(perchart.chart),
                'surround': {
                    'planets': perchart.surroundPlanets(),
                    'attacks': perchart.surroundAttacks(),
                    'houses': perchart.surroundHouses(),
                    'besiegement': perchart.besiegementDetail()
                },
                'guoStarSect': {
                    'houses': guostar.allTerm()
                }
            }

            predictives = getPredictivesObj(data, perchart)
            if predictives is not None:
                obj['predictives'] = predictives

            res = jsonpickle.encode(obj, unpicklable=False)
            return res
        except:
            traceback.print_exc()
            obj = {
                'err': 'param error'
            }
            return jsonpickle.encode(obj, unpicklable=False)
        finally:
            pop_request_trip(_trip_orig)
            pop_request_terms(_terms_orig)

    @cherrypy.expose
    @cherrypy.config(**{'tools.cors.on': True})
    @cherrypy.tools.json_in()
    def chart12(self):
        # 十二分盘(Dwadasamsa):newlon = (lon × 12) mod 360,与十三分盘同结构,仅换 HarmonicChart(perchart, 12)。
        enable_crossdomain()
        _terms_orig = None
        try:
            data = cherrypy.request.json

            data['tradition'] = False
            data['predictive'] = False
            _terms_orig = push_request_terms(data.get('termsVariant', 0), data.get('leoBoundFirst'))
            _trip_orig = push_request_trip(data.get('triplicity'))
            perchart = PerChart(data)
            HarmonicChart(perchart, 12).apply()

            guostar = GuoStarSect(perchart)

            obj = {
                'params': {
                    'birth': perchart.getBirthStr(),
                    'ad': -1 if perchart.isBC else 1,
                    'lat': data['lat'],
                    'lon': data['lon'],
                    'hsys': data['hsys'],
                    'zone': data['zone'],
                    'tradition': perchart.tradition,
                    'zodiacal': perchart.zodiacal,
                    'termsVariant': parse_terms_variant(data.get('termsVariant', 0)),
                    'showPdBounds': data.get('showPdBounds', 1),
                    'pdtype': perchart.pdtype,
                    'pdMethod': perchart.pdMethod,
                    'pdTimeKey': perchart.pdTimeKey,
                    'pdDirect': 1 if perchart.pdDirect else 0,
                    'pdConverse': 1 if perchart.pdConverse else 0,
                    'pdAntiscia': 1 if perchart.pdAntiscia else 0,
                    'pdTerms': 1 if perchart.pdTerms else 0,
                    'pdSyncRev': self.PD_SYNC_REV,
                },
                'chart': perchart.getChartObj(),
                'receptions': perchart.getReceptions(),
                'mutuals': perchart.getMutuals(),
                'declParallel': perchart.getParallel(),
                'aspects': {
                    'normalAsp': perchart.getAspects(),
                    'immediateAsp': perchart.getImmediateAspects(),
                    'signAsp': perchart.getSignAspects()
                },
                'lots': perchart.getPars(perchart.chart),
                'surround': {
                    'planets': perchart.surroundPlanets(),
                    'attacks': perchart.surroundAttacks(),
                    'houses': perchart.surroundHouses(),
                    'besiegement': perchart.besiegementDetail()
                },
                'guoStarSect': {
                    'houses': guostar.allTerm()
                }
            }

            predictives = getPredictivesObj(data, perchart)
            if predictives is not None:
                obj['predictives'] = predictives

            res = jsonpickle.encode(obj, unpicklable=False)
            return res
        except:
            traceback.print_exc()
            obj = {
                'err': 'param error'
            }
            return jsonpickle.encode(obj, unpicklable=False)
        finally:
            pop_request_trip(_trip_orig)
            pop_request_terms(_terms_orig)


def CORS():
    if cherrypy.request.method == 'OPTIONS':
        # preflign request
        # see http://www.w3.org/TR/cors/#cross-origin-request-with-preflight-0
        cherrypy.response.headers['Access-Control-Allow-Methods'] = 'GET, POST, HEAD, PUT, DELETE, OPTIONS'
        cherrypy.response.headers['Access-Control-Allow-Headers'] = 'Accept, Accept-Encoding, Accept-Language, Host, Origin, X-Requested-With, Content-Type, User-Agent, Content-Length, Last-Modified, Access-Control-Request-Headers, HTTP_X_REAL_IP, HTTP_X_FORWARDED_FOR, x-forwarded-for, Token, x-remote-IP, x-originating-IP, x-remote-addr, x-remote-ip, x-client-ip, x-client-IP, X-Real-ip, ImgTokenListName, SmsTokenListName, _IMGTOKENLIST, _SMSTOKENLIST, Signature, LocalIp, ClientChannel, ClientApp, ClientVer'
        cherrypy.response.headers['Access-Control-Allow-Origin'] = '*'
        # tell CherryPy no avoid normal handler
        return True
    else:
        cherrypy.response.headers['Access-Control-Allow-Origin'] = '*'


def _chart_port_free(host, port):
    """True if (host, port) can be bound right now (即没有活进程在 LISTEN)。"""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((host, port))
        return True
    except OSError:
        return False
    finally:
        try:
            s.close()
        except Exception:
            pass


def _pids_listening_on(port):
    """Best-effort 跨平台:返回正在 LISTEN 指定 TCP 端口的 PID 集合。"""
    pids = set()
    try:
        if sys.platform.startswith('win'):
            out = subprocess.run(['netstat', '-ano', '-p', 'tcp'],
                                 capture_output=True, text=True, timeout=6).stdout or ''
            needle = ':%d' % port
            for line in out.splitlines():
                parts = line.split()
                if len(parts) >= 5 and parts[0].upper() == 'TCP' \
                        and parts[1].endswith(needle) and 'LISTEN' in parts[3].upper():
                    pid = parts[-1]
                    if pid.isdigit():
                        pids.add(int(pid))
        else:
            # -nP 必带:不带时 lsof 做 DNS/服务名反查,离线/DNS 慢时可拖数十秒(超出 timeout=6 假阴性)。
            out = subprocess.run(['lsof', '-nP', '-tiTCP:%d' % port, '-sTCP:LISTEN'],
                                 capture_output=True, text=True, timeout=6).stdout or ''
            for line in out.splitlines():
                line = line.strip()
                if line.isdigit():
                    pids.add(int(line))
    except Exception:
        pass
    return pids


def _is_stale_chart_python(pid):
    """启发式:该 PID 是否是「我们自己的 chart-service python 僵尸」(可安全回收)。
    只在命令行同时含 python 且含 webchartsrv/astropy/horosa 时为真 —— 绝不误杀第三方应用。"""
    try:
        if sys.platform.startswith('win'):
            out = subprocess.run(
                ['wmic', 'process', 'where', 'ProcessId=%d' % pid, 'get', 'CommandLine'],
                capture_output=True, text=True, timeout=6).stdout or ''
        else:
            out = subprocess.run(['ps', '-p', str(pid), '-o', 'command='],
                                 capture_output=True, text=True, timeout=6).stdout or ''
        cmd = out.lower()
        if 'python' not in cmd:
            return False
        return any(k in cmd for k in ('webchartsrv', 'astropy', 'horosa'))
    except Exception:
        return False


def _kill_pid(pid):
    try:
        if sys.platform.startswith('win'):
            subprocess.run(['taskkill', '/F', '/T', '/PID', str(pid)],
                           capture_output=True, timeout=6)
        else:
            os.kill(pid, signal.SIGKILL)
    except Exception:
        pass


def ensure_chart_port_free(host, port, attempts=12, wait=0.5):
    """成熟方案:CherryPy 绑定前确保 chart 端口可用,彻底消除「Port not free / 本地排盘服务未就绪」反复起不来。
    场景:上次实例崩溃/被强退后,僵尸 python 仍 LISTEN 8899 → CherryPy portend 直接 'Port not free' 退出(code 70)。
    做法:①探测端口;②若被占,定位 LISTEN 该端口的 PID,仅当它是「我们自己的 chart python 僵尸」才 kill(安全,不误杀他人);
         ③轮询等待 OS 释放后重试。返回端口是否最终可用。"""
    if _chart_port_free(host, port):
        return True
    print('[chart] port %d busy at boot, reclaiming stale runtime...' % port, flush=True)
    killed = False
    for pid in _pids_listening_on(port):
        if pid == os.getpid():
            continue
        if _is_stale_chart_python(pid):
            print('[chart] killing stale chart python pid=%d holding port %d' % (pid, port), flush=True)
            _kill_pid(pid)
            killed = True
    if not killed:
        print('[chart] no stale Horosa python found on port %d (held by another app?).' % port, flush=True)
    for _ in range(max(1, attempts)):
        if _chart_port_free(host, port):
            print('[chart] port %d is free, proceeding.' % port, flush=True)
            return True
        time.sleep(wait)
    print('[chart] WARNING port %d still busy after %d attempts.' % (port, attempts), flush=True)
    return _chart_port_free(host, port)


# ── 启动就绪门(温启提速):warmup(PD+india)移后台线程,HOROSA_READY 提前 ~1.5-2s。
# 正确性:业务 POST 在门上等 warmup 完成才放行 —— 与旧同步方案同语义(请求最早也要等
# warmup 完),但端口/探活/前端导航全部提前;任何请求的最早可服务时刻不晚于旧方案。
# 并发安全:门保证 warmup 期间无业务请求并发(沿旧注释对 swisseph 全局 sid_mode 的顾虑,
# 见 tests/test_swe_concurrency.py);探活(GET /、/healthz、OPTIONS)不改 sid_mode,放行。
# kill-switch:HOROSA_PY_WARMUP_SYNC=1 回退旧同步顺序。
STARTUP_GATE = threading.Event()


def _startup_gate_tool():
    if STARTUP_GATE.is_set():
        return
    req = cherrypy.request
    if req.method in ('GET', 'OPTIONS', 'HEAD'):
        return  # 探活/预检不碰计算与 sid_mode
    # 兜底超时:warmup 异常挂死也不至于永久拒绝服务(warmup 平常 1.5-2s)
    STARTUP_GATE.wait(timeout=60)


def _run_warmups():
    try:
        t0 = time.perf_counter()
        warm_chart = PerChart(dict(WebChartSrv.PD_WARMUP_SAMPLE))
        warm_chart.getPredict().getPrimaryDirection()
        WebChartSrv.WARMED = True
        print('pd warmup ready in {0:.3f}s'.format(time.perf_counter() - t0), flush=True)
    except Exception:
        traceback.print_exc()
    # 印度盘预热:把 india 各子算法冷路径载入,消除首次进入印度占星的 ~3s 冷启动;
    # 与业务请求的并发由启动门隔离(门开前无业务 POST 进入)。失败静默不影响服务。
    try:
        t1 = time.perf_counter()
        warmup_india()
        print('india warmup ready in {0:.3f}s'.format(time.perf_counter() - t1), flush=True)
    except Exception:
        traceback.print_exc()
    STARTUP_GATE.set()


if __name__ == '__main__':
    _warmup_sync = os.environ.get('HOROSA_PY_WARMUP_SYNC', '0') == '1'
    if _warmup_sync:
        _run_warmups()   # 旧行为:warmup 完才继续起服务

    chart_port = int(os.environ.get('HOROSA_CHART_PORT', '8899'))
    cherrypy.config.update({'server.socket_host': '127.0.0.1',
                            'server.socket_port': chart_port,
                            'server.thread_pool': 30,
                            'engine.autoreload.on': False,
                            })

    cherrypy.tools.cors = cherrypy._cptools.HandlerTool(CORS)
    cherrypy.tools.startup_gate = cherrypy.Tool('before_handler', _startup_gate_tool, priority=10)
    cherrypy.config.update({'tools.startup_gate.on': True})

    cherrypy.tree.mount(WebChartSrv(), '/')
    cherrypy.tree.mount(PredictSrv(), '/predict')
    cherrypy.tree.mount(IndiaAstroSrv(), '/india')
    cherrypy.tree.mount(ModernAstroSrv(), '/modern')
    cherrypy.tree.mount(GermanyAstroSrv(), '/germany')
    cherrypy.tree.mount(JieQiSrv(), '/jieqi')
    cherrypy.tree.mount(WebJdnSrv(), '/jdn')
    cherrypy.tree.mount(WebCalcSrv(), '/calc')
    cherrypy.tree.mount(AcgSrv(), '/location')
    if _CETIAN_LAZY:
        cherrypy.tree.mount(_LazyMountedService({'module': 'websrv.webcetiansrv', 'class_name': 'CeTianSrv'}), '/cetian')
    else:
        cherrypy.tree.mount(CeTianSrv(), '/cetian')
    cherrypy.tree.mount(AstroExtraSrv(), '/astroextra')
    cherrypy.tree.mount(PlanetariumSrv(), '/planetarium')
    mount_kentang_services(cherrypy)

    # 绑定前先确保端口可用(回收上次崩溃残留的僵尸 chart python),消除「Port 8899 not free」反复起不来。
    ensure_chart_port_free('127.0.0.1', chart_port)

    if not _warmup_sync:
        threading.Thread(target=_run_warmups, name='horosa-warmup', daemon=True).start()
    else:
        STARTUP_GATE.set()

    cherrypy.engine.start()
    # P0 启动握手:监听后向 stdout 报端口,壳/launcher 可确认「此端口确为本次起的 chart 后端」(消 TOCTOU/误判)。
    print('HOROSA_READY chart_port={0}'.format(chart_port), flush=True)

    # v3.0.1 perf ROUND-3 R3 (HOROSA_XUANSHI_WARMUP): the kentang registry's LazyMountedService
    # (marker: HOROSA_KENTANG_LAZY_MOUNT) defers webxuanshisrv's heavy import chain (xuanshi's 5
    # submodules + 99MB SQLite bundles) OFF the startup path. That saves ~5-10s of Windows cold
    # import, BUT it shifts the cost to the first user click on the 玄学史 tab. To hide that
    # click-latency behind idle time — same trick Round-2's chartProbeWarmupPromise (service-manager
    # side) plays for the /chart cold path — spawn a background daemon thread that sleeps past the
    # visible-window paint, then imports webxuanshisrv once. Non-blocking, non-fatal on
    # error, idempotent (importlib memoizes in sys.modules). Kill-switch: HOROSA_XUANSHI_WARMUP=0
    # (or if lazy mount itself is disabled via HOROSA_KENTANG_LAZY_MOUNT=0, warmup is redundant
    # anyway since the module was already eagerly imported at mount time).
    def _horosa_xuanshi_warmup():
        import os as _os_wu
        import time as _time_wu
        import threading as _threading_wu
        import importlib as _importlib_wu
        if _os_wu.environ.get('HOROSA_XUANSHI_WARMUP', '1').lower() in ('0', 'false', 'no', 'off'):
            return
        def _run():
            try:
                # PERF-R6:20s→10s —— streamlit 桩+裁包后各服务冷导入大幅变便宜,预热整体前移,
                # 用户更早点开玄学史也是暖的;与 CDS eager dump(60s)完全错开,错峰结构不变。
                _time_wu.sleep(10.0)
                _importlib_wu.import_module('websrv.webxuanshisrv')
                # v3.0.1 perf ROUND-4 R4 (HOROSA_XUANSHI_WARMUP): also materialize the 玄学史 global
                # summary once so the FIRST /xuanshi/summary click hits an already-warm cache instead of
                # paying the full-table load_events() SELECT + translation-join + celestial load on the
                # visible path. global_summary() is pure read-only + memoized (_XX_CACHE / celestial load
                # cache / db._CONNS), so computing it at warmup vs at first request returns the IDENTICAL
                # dict — byte-identical, just paid off the click path. Non-fatal.
                try:
                    from astrostudy import xuanshi as _xs_wu
                    _xs_wu.global_summary()
                except Exception:
                    pass
            except Exception:
                pass  # non-fatal — cold path will pay the cost on first request instead
        _threading_wu.Thread(target=_run, name='HorosaXuanShiWarmup', daemon=True).start()
    _horosa_xuanshi_warmup()

    # v3.0.1 perf ROUND-4 R4 (HOROSA_QIZHENG_WARMUP): the 七政四余 起盘 itself is already fast
    # (swe.sweObject, ~0.6s), but the qizheng service module webqizhengkinsrv historically paid a
    # heavy one-time COLD import on the user's first 七政四余 click (the kentang LazyMountedService
    # defers it off startup, same as xuanshi; since v3.1.0 the upstream streamlit stub removes the
    # biggest chunk, the pre-import still hides the remaining engine/data cost). Pre-import it on a
    # STAGGERED background daemon (after the xuanshi warmup so the two heavy imports don't spike CPU
    # together), hiding the import behind idle time. Non-blocking, non-fatal, idempotent
    # (sys.modules memoizes → the first real request reuses the warmed module). Byte-identical: only
    # pre-runs the SAME import the lazy mount would run on first request; zero change to
    # compute_chart / shensha / dasha output. Kill-switch: HOROSA_QIZHENG_WARMUP=0.
    def _horosa_qizheng_warmup():
        import os as _os_qw
        import time as _time_qw
        import threading as _threading_qw
        import importlib as _importlib_qw
        if _os_qw.environ.get('HOROSA_QIZHENG_WARMUP', '1').lower() in ('0', 'false', 'no', 'off'):
            return
        def _run():
            try:
                _time_qw.sleep(14.0)  # PERF-R6:24s→14s(紧跟 xuanshi 之后错峰)
                _importlib_qw.import_module('websrv.webqizhengkinsrv')
            except Exception:
                pass  # non-fatal — cold path will pay the cost on first request instead
        _threading_qw.Thread(target=_run, name='HorosaQiZhengWarmup', daemon=True).start()
    _horosa_qizheng_warmup()

    # v3.0.1 perf ROUND-4 R4 (HOROSA_SERVICES_WARMUP): 泛化版技法服务预热。kentang 的
    # LazyMountedService 把全部技法服务的重导入挪出了启动路径,但也意味着每个技法的**首次点击**
    # 要付一次冷导入(普查实测:MED 档 geomancy/shaozi/tieban/fendjing/beiji/nanji/chunzi/xianqin
    # 各有 astro 数据束/SQL 初始化等一次性成本)。这里在 xuanshi(20s)/qizheng(24s)之后再错峰 28s,
    # 用**单个**守护线程按序逐个预导入其余服务模块,每个之间 sleep 0.8s——单线程+错峰保证预热期
    # CPU 无可感占用。字节级安全:与懒挂载首请求执行的是同一个 import(sys.modules 记忆化,首请求
    # 直接复用已热模块),不改任何计算。每个模块独立 try/except,失败=该技法回到首点付冷成本的现状。
    # Kill-switch: HOROSA_SERVICES_WARMUP=0。
    def _horosa_services_warmup():
        import os as _os_sw
        import time as _time_sw
        import threading as _threading_sw
        import importlib as _importlib_sw
        if _os_sw.environ.get('HOROSA_SERVICES_WARMUP', '1').lower() in ('0', 'false', 'no', 'off'):
            return
        def _run():
            _time_sw.sleep(18.0)  # PERF-R6:28s→18s(排在 xuanshi/qizheng 之后,0.8s 间距不变)
            for _mod in (
                # cetian 置首:历史上它拖 streamlit(启动导入墙的 49%,ROUND-5 起改为懒挂载;
                # v3.1.0 上游 stub 后仍有引擎/数据一次性成本),预热最先补它。
                'websrv.webcetiansrv',
                'websrv.webgeomancysrv',
                'websrv.webshaozisrv',
                'websrv.webtiebansrv',
                'websrv.webfendjingsrv',
                'websrv.webbeijisrv',
                'websrv.webnanjisrv',
                'websrv.webchunzisrv',
                'websrv.webxianqinsrv',
                'websrv.webtaiyisrv',
                'websrv.webjinkousrv',
                'websrv.webqimensrv',
                'websrv.webwangjisrv',
                'websrv.webwuzhaosrv',
                'websrv.webtaixuansrv',
                'websrv.webjingjuesrv',
                'websrv.webshenyishusrv',
            ):
                try:
                    _importlib_sw.import_module(_mod)
                except Exception:
                    pass  # non-fatal — 该技法首点自付冷导入,与现状一致
                _time_sw.sleep(0.8)
        _threading_sw.Thread(target=_run, name='HorosaServicesWarmup', daemon=True).start()
    _horosa_services_warmup()

    cherrypy.engine.block()
