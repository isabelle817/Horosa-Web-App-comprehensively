#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PY_PID_FILE="${ROOT}/.horosa_py.pid"
JAVA_PID_FILE="${ROOT}/.horosa_java.pid"
WEB_PID_FILE="${ROOT}/.horosa_web.pid"
CHART_PORT="${HOROSA_CHART_PORT:-8899}"
BACKEND_PORT="${HOROSA_SERVER_PORT:-9999}"
WEB_PORT="${HOROSA_WEB_PORT:-8000}"

kill_pid_gracefully() {
  local pid="$1"
  local name="$2"
  if [ -z "${pid}" ] || ! kill -0 "${pid}" >/dev/null 2>&1; then
    return 1
  fi
  kill "${pid}" >/dev/null 2>&1 || true
  # 提速:固定 sleep 1 改 0.1s 轮询(进程提前退出即提前返回);超 ~1.2s 才强杀。
  # 退出清理跑在 app 退出关键路径上,这里每省 1s 都是用户可感知的。
  local i
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if ! kill -0 "${pid}" >/dev/null 2>&1; then
      echo "${name}: stopped pid ${pid}."
      return 0
    fi
    sleep 0.1
  done
  if kill -0 "${pid}" >/dev/null 2>&1; then
    kill -9 "${pid}" >/dev/null 2>&1 || true
  fi
  echo "${name}: stopped pid ${pid}."
  return 0
}

stop_by_pid_file() {
  local name="$1"
  local pid_file="$2"
  if [ ! -f "${pid_file}" ]; then
    echo "${name}: not running (pid file missing)."
    return
  fi

  local pid
  pid="$(cat "${pid_file}" 2>/dev/null || true)"
  # pid 空/非数字(写入中断/磁盘异常)直接清文件,不把空串喂给 kill。
  case "${pid}" in (''|*[!0-9]*)
    echo "${name}: pid file invalid, cleaning."
    rm -f "${pid_file}"
    return
  ;; esac
  if ! kill_pid_gracefully "${pid}" "${name}"; then
    echo "${name}: process not found, cleaning pid file."
  fi
  rm -f "${pid_file}"
}

port_listener_pids() {
  local port="$1"
  # 弃用 lsof:它要遍历全系统所有进程的 FD,遇到卡死/异常挂载的进程单次可 stall 30~100s
  # (实测本机即使带 -n -P 也偶发 91s),是退出/启动「卡住」的隐形大头。
  # netstat 只读内核连接表(~0.006s);macOS `netstat -anv` 第 4 列=本地地址、第 6 列=状态、
  # 第 11 列=pid(macOS 12+ 布局,Rust 侧行为测试钉住)。
  netstat -anv -p tcp 2>/dev/null \
    | awk -v port="${port}" '$6 == "LISTEN" && $4 ~ ("[.:]" port "$") { print $11 }' \
    | sort -u || true
}

process_command() {
  local pid="$1"
  ps -p "${pid}" -o command= 2>/dev/null || true
}

stop_by_port_pattern() {
  local name="$1"
  local port="$2"
  local pattern="$3"
  local pid_file="$4"
  local pid=""
  local cmd=""
  local stopped=0
  local pids=""

  pids="$(port_listener_pids "${port}")"
  if [ -z "${pids}" ]; then
    return
  fi

  for pid in ${pids}; do
    cmd="$(process_command "${pid}")"
    if [ -z "${cmd}" ]; then
      continue
    fi
    # Only reap listeners that belong to this workspace copy. Without this
    # guard, a second Horosa checkout on the same Mac can stop the wrong
    # services because the fallback matcher only knows the generic process
    # role (webchartsrv.py / astrostudyboot.jar / http.server).
    if ! printf '%s\n' "${cmd}" | grep -Fq "${ROOT}"; then
      continue
    fi
    if ! printf '%s\n' "${cmd}" | grep -Eq "${pattern}"; then
      continue
    fi
    if kill_pid_gracefully "${pid}" "${name}(port:${port})"; then
      stopped=1
    fi
  done

  if [ "${stopped}" = "1" ] && [ -n "${pid_file}" ]; then
    rm -f "${pid_file}"
  fi
}

# 提速:三个服务的停止互无顺序依赖(Java 调 Python 是请求方,谁先死都安全),并行收割。
# set -euo pipefail 下后台 job 非零会让裸 wait 失败 → 逐个 wait || true。
stop_by_pid_file "astropy" "${PY_PID_FILE}" &
STOP_P1=$!
stop_by_pid_file "astrostudyboot" "${JAVA_PID_FILE}" &
STOP_P2=$!
stop_by_pid_file "web" "${WEB_PID_FILE}" &
STOP_P3=$!
wait "${STOP_P1}" || true
wait "${STOP_P2}" || true
wait "${STOP_P3}" || true

# 兜底：即使 pid 文件丢失，也尝试按端口+进程特征回收 Horosa 残留进程(同样并行)
stop_by_port_pattern "astropy" "${CHART_PORT}" 'webchartsrv\.py' "${PY_PID_FILE}" &
STOP_Q1=$!
stop_by_port_pattern "astrostudyboot" "${BACKEND_PORT}" 'astrostudyboot\.jar' "${JAVA_PID_FILE}" &
STOP_Q2=$!
stop_by_port_pattern "web" "${WEB_PORT}" 'http\.server.*astrostudyui/(dist|dist-file)' "${WEB_PID_FILE}" &
STOP_Q3=$!
wait "${STOP_Q1}" || true
wait "${STOP_Q2}" || true
wait "${STOP_Q3}" || true
