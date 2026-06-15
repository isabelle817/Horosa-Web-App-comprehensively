import React from 'react';
import { Modal, message } from 'antd';
import { ServerRoot } from '../../utils/constants';

// Mac issue #12 / Win #11 #14: 排盘失败 → 本地服务未就绪 时的可操作对话框。
// 把「重试 / 重启后端 / 打开诊断中心 / 复制诊断信息」全部集成,
// 回应用户「不知道在哪查看服务运行状态」的痛点。
//
// 为什么独立成组件:dva 的 model parser 不支持 JSX,只能在 React 组件层写。
// 由 src/models/astro.js 在 fetchChart 失败时调用此 showChartServiceError()。

const headerBoxStyle = { padding: '8px 10px', background: '#fff7e6', border: '1px solid #ffe7a3', borderRadius: 6, marginBottom: 10, color: '#8a5800' };
const codeChipStyle = { background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 3 };
// 弹窗体走主题变量:Modal 容器在暗色下是深底(app.less 已暗化),硬编码浅色会让正文隐形/按钮刺眼。
const ulStyle = { margin: '0 0 8px 18px', padding: 0, fontSize: 12.5, color: 'var(--horosa-text-soft, #555)' };
const hintStyle = { fontSize: 12, color: 'var(--horosa-muted, #888)' };
const footerWrap = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const footerLeft = { display: 'flex', gap: 6, flexWrap: 'wrap' };
const footerRight = { display: 'flex', gap: 6 };
const btn = { padding: '4px 12px', fontSize: 13, borderRadius: 6, border: '1px solid var(--horosa-border, #d9d9d9)', background: 'var(--horosa-surface-solid, #fff)', color: 'var(--horosa-text, #262626)', cursor: 'pointer' };

// audit 修:tauriInvoke 之前不等不报错,用户点完没反馈不知道有没有发出。
// 现在 await + try/catch + message 反馈。
async function tauriInvoke(cmd, successMsg, errorMsg) {
  if (typeof window === 'undefined' || !window.__TAURI__) {
    message.warning('当前不在桌面应用中,无法执行此操作');
    return false;
  }
  try {
    const api = window.__TAURI__.core || window.__TAURI__;
    if (api && api.invoke) {
      await api.invoke(cmd);
      if (successMsg) message.success(successMsg);
      return true;
    }
    return false;
  } catch (e) {
    message.error(errorMsg || `命令失败：${(e && e.message) || e}`);
    return false;
  }
}

async function probeBackend(root) {
  if (!root) return false;
  try {
    const url = `${String(root).replace(/\/$/, '')}/heartbeat`;
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, 3500) : null;
    const rsp = await fetch(url, { method: 'GET', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
    if (t) clearTimeout(t);
    return !!rsp;
  } catch (_) { return false; }
}

function buildDiagText(root, extraDetail) {
  const ts = new Date().toLocaleString();
  return [
    '[Horosa 排盘失败诊断]',
    `时间: ${ts}`,
    `后端地址: ${root || '未配置'}`,
    extraDetail || '',
    `用户代理: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
  ].join('\n');
}

export function showChartServiceError(extraDetail) {
  const root = ServerRoot || '';
  const hasTauri = typeof window !== 'undefined' && !!window.__TAURI__;
  const diagText = buildDiagText(root, extraDetail);

  // audit 修:clipboard.writeText 是 async,之前不 await 用户看到假成功。
  const handleCopyDiag = async () => {
    if (!navigator || !navigator.clipboard) {
      message.warning('当前环境不支持剪贴板,请手动复制');
      return;
    }
    try {
      await navigator.clipboard.writeText(diagText);
      message.success('诊断信息已复制,可粘贴到 issue');
    } catch (e) {
      message.error(`复制失败：${(e && e.message) || '权限不足或非 HTTPS 上下文'}`);
    }
  };

  const content = (
    <div style={{ lineHeight: 1.7, fontSize: 13 }}>
      <div style={headerBoxStyle}>
        本地排盘服务 (<code style={codeChipStyle}>{root || '未知地址'}</code>) 暂时不可达。
      </div>
      <div style={{ marginBottom: 6, fontWeight: 600 }}>常见原因：</div>
      <ul style={ulStyle}>
        <li>首次启动需解压运行时 (≈ 10–60s)，请稍候再试</li>
        <li>系统代理可能拦截了本地回环（v2.5.1+ 已修，请确认是最新版）</li>
        <li>端口被其它程序占用 → 可点「重启后端」让 app 换口重启</li>
        <li>杀毒软件 / 防火墙拦截 Java 进程 → 加入白名单</li>
      </ul>
      <div style={hintStyle}>下方可任选一个操作；多数情况「立即重试」即可恢复。</div>
    </div>
  );

  const footer = (_, { OkBtn, CancelBtn }) => (
    <div style={footerWrap}>
      <div style={footerLeft}>
        {hasTauri ? (
          <button type="button" onClick={() => tauriInvoke('trigger_runtime_repair_command', '已请求重启后端,请等待 10-60 秒', '重启后端失败')} style={btn}>🔧 重启后端</button>
        ) : null}
        {hasTauri ? (
          <button type="button" onClick={() => tauriInvoke('open_diagnostics_window_command', null, '打开诊断中心失败')} style={btn}>🔍 打开诊断中心</button>
        ) : null}
        <button type="button" onClick={handleCopyDiag} style={btn}>📋 复制诊断信息</button>
      </div>
      <div style={footerRight}>
        <CancelBtn />
        <OkBtn />
      </div>
    </div>
  );

  Modal.confirm({
    title: '排盘失败：本地服务未就绪',
    width: 520,
    icon: null,
    content,
    okText: '立即重试',
    cancelText: '关闭',
    footer,
    onOk: async () => {
      const ok = await probeBackend(root);
      if (ok) {
        Modal.success({ title: '后端已在线', content: '重新执行您的排盘操作即可。' });
      } else {
        Modal.warning({ title: '仍不可达', content: '后端可能还在启动中。建议等几秒后再试，或点「重启后端」。' });
      }
    },
  });
}

export default showChartServiceError;
