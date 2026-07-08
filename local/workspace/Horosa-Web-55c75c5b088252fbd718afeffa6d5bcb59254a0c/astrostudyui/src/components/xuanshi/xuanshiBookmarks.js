// 案头·私藏 —— 收藏系统(复刻参考 在线版收藏接口 的离线版)。
// 各详情页(人物/事件/故事/术数/天象/朝代)右上角 ☆ 调 toggleBookmark;案头读 listBookmarks 展示、点开。
//
// 🔴 真值源 = window 级 in-memory 单例(非 localStorage)。
//   缘由:prod 桌面壳是 WKWebView/JavaScriptCore,其 localStorage 写入在某些情形会静默失败/受限
//   (与 dev 的 Chromium 不同)。若直接拿 localStorage 当真值源,☆ 写失败 → 案头读空 → 「点收藏没反应」。
//   故改为:in-memory list 为唯一真值源(本会话内 ☆↔案头 必定同步),localStorage 仅作「尽力而为」的
//   跨重启持久化后端(写成则持久,写败也不影响本会话表现)。挂 window 上 → 即便被打包进多 chunk 也共享单例。
import { safeJsonParseFromStorage, safeJsonStringifyToStorage } from '../../utils/safeStorage';

const BM_KEY = 'horosa.xuanshi.bookmarks.v1';
let _ssrStore = null; // 无 window(SSR/jest 早期)时的模块级兜底单例

function store() {
	if (typeof window === 'undefined') {
		if (!_ssrStore) { _ssrStore = { list: [], subs: new Set() }; }
		return _ssrStore;
	}
	if (!window.__horosaXuanshiBM) {
		// 首次:从 localStorage 灌入既有收藏(跨重启恢复);读失败则空列表
		const v = safeJsonParseFromStorage(BM_KEY);
		window.__horosaXuanshiBM = { list: Array.isArray(v) ? v : [], subs: new Set() };
	}
	return window.__horosaXuanshiBM;
}

function read() { return store().list.slice(); } // 返回副本,防外部 mutate 污染真值源
function write(list) {
	const s = store();
	s.list = (list || []).slice(0, 300);
	safeJsonStringifyToStorage(BM_KEY, s.list); // 尽力持久化:成则跨重启留存,败也不影响 in-memory
	s.subs.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } });
}

export function listBookmarks() { return read(); }
export function isBookmarked(kind, ref) { return store().list.some((b) => b.kind === kind && String(b.ref) === String(ref)); }
export function removeBookmark(kind, ref) { write(store().list.filter((b) => !(b.kind === kind && String(b.ref) === String(ref)))); }

// item: { kind, ref, title, subtitle }；返回切换后的收藏态(true=已收藏)
export function toggleBookmark(item) {
	const list = read();
	const i = list.findIndex((b) => b.kind === item.kind && String(b.ref) === String(item.ref));
	if (i >= 0) { list.splice(i, 1); write(list); return false; }
	list.unshift({ kind: item.kind, ref: item.ref, title: item.title || item.ref, subtitle: item.subtitle || '', ts: Date.now() });
	write(list);
	return true;
}

// 订阅变更(组件 componentDidMount 注册、unmount 注销)
export function subscribeBookmarks(fn) { const s = store(); s.subs.add(fn); return () => s.subs.delete(fn); }
