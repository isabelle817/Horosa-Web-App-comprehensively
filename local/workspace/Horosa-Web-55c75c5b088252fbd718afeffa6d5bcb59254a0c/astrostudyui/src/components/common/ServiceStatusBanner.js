import React from 'react';
import { subscribeServiceStatus, markServiceOnline } from '../../utils/serviceStatus';
import { ServerRoot } from '../../utils/constants';

// 修法6（升级版,Mac issue #12 增强）:非阻塞「本地服务连接中断」重连横幅。
//
// 在线时渲染 null(零 DOM、对正常路径零影响);
// 离线时显示在顶部居中的横幅,带可操作按钮:「立即重试」「重启后端」「打开诊断」(Tauri 环境)。
// 按钮区域 pointerEvents:auto;横幅其余部分 pointerEvents:none,不拦截背景点击。
//
// 离线 / 在线状态由 utils/serviceStatus 驱动:request.js / chartFetch.js 在确认后端不可达时置离线、
// 在收到任何后端响应时置在线。本组件主动按下「立即重试」会探测 /heartbeat,成功→ markServiceOnline。
//
// 配色取中性告警色(琥珀),非术数语义色,明暗主题下均可读。
export default function ServiceStatusBanner() {
  const [online, setOnline] = React.useState(true);
  const [retrying, setRetrying] = React.useState(false);

  React.useEffect(() => {
    const unsub = subscribeServiceStatus((v) => setOnline(v));
    return unsub;
  }, []);

  const hasTauri = typeof window !== 'undefined' && !!window.__TAURI__;

  const handleRetry = React.useCallback(async () => {
    if (!ServerRoot || retrying) return;
    setRetrying(true);
    try {
      const url = `${String(ServerRoot).replace(/\/$/, '')}/heartbeat`;
      const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      const t = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, 3500) : null;
      await fetch(url, { method: 'GET', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
      if (t) clearTimeout(t);
      markServiceOnline();
    } catch (_) {
      // 仍不可达;横幅继续显示
    } finally {
      setRetrying(false);
    }
  }, [retrying]);

  // audit 修:await + 反馈,避免 silent fail
  const handleRestart = React.useCallback(async () => {
    if (!hasTauri) return;
    try {
      const api = window.__TAURI__.core || window.__TAURI__;
      if (api && api.invoke) {
        await api.invoke('trigger_runtime_repair_command');
      }
    } catch (e) {
      try { console.warn('[ServiceStatusBanner] restart failed', e); } catch (_) {}
    }
  }, [hasTauri]);

  const handleDiag = React.useCallback(async () => {
    if (!hasTauri) return;
    try {
      const api = window.__TAURI__.core || window.__TAURI__;
      if (api && api.invoke) {
        await api.invoke('open_diagnostics_window_command');
      }
    } catch (e) {
      try { console.warn('[ServiceStatusBanner] open diag failed', e); } catch (_) {}
    }
  }, [hasTauri]);

  if (online) return null;

  // audit 修:pointerEvents 父 none 会吞掉子元素事件 → 改为父 auto + 用 transparent 占位让背景能透过点击。
  // 关键:把横幅本身放进一个 fit-content 的内联块,周围空白用 pointer-events:none 包裹。
  const wrapStyle = {
    position: 'fixed', top: 0, left: 0, right: 0,
    zIndex: 2000,
    display: 'flex', justifyContent: 'center',
    pointerEvents: 'none', // 整个 wrap 让点击穿透
  };
  const barStyle = {
    marginTop: 8,
    maxWidth: '96%',
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 1.4,
    color: '#7a4f01',
    background: 'rgba(255, 244, 222, 0.97)',
    border: '1px solid rgba(214, 158, 46, 0.55)',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
    pointerEvents: 'auto', // 但 bar 本身收事件 - 子元素自动继承
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
    cursor: 'default',
  };
  const btnStyle = {
    padding: '3px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
    border: '1px solid rgba(214, 158, 46, 0.7)',
    background: 'rgba(255, 255, 255, 0.7)',
    color: '#7a4f01',
  };

  return (
    <div style={wrapStyle} aria-live="polite">
      <div style={barStyle}>
        <span>⚠️ 本地服务暂时不可达，操作会自动重试。</span>
        <button type="button" disabled={retrying} onClick={handleRetry} style={btnStyle}>
          {retrying ? '正在重试…' : '立即重试'}
        </button>
        {hasTauri ? (
          <button type="button" onClick={handleRestart} style={btnStyle}>🔧 重启后端</button>
        ) : null}
        {hasTauri ? (
          <button type="button" onClick={handleDiag} style={btnStyle}>🔍 打开诊断</button>
        ) : null}
      </div>
    </div>
  );
}
