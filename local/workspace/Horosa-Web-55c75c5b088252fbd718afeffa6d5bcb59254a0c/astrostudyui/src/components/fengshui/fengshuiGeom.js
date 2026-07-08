// 风水盘共享几何工具（从 fengshuiEngine.js 抽出，供引擎与 baguaCore 复用，无 DOM/无状态）。

export function rotatePoint(point, origin, angleDeg) {
	const rad = (angleDeg * Math.PI) / 180;
	const dx = point.x - origin.x;
	const dy = point.y - origin.y;
	return {
		x: origin.x + dx * Math.cos(rad) - dy * Math.sin(rad),
		y: origin.y + dx * Math.sin(rad) + dy * Math.cos(rad),
	};
}

// 角度是否落在扇区 [start,end)（支持跨 360°，如 337.5~22.5）。
export function angleInSector(angle, start, end) {
	if (start < end) return angle >= start && angle < end;
	return angle >= start || angle < end;
}

export function formatAngle(value) {
	if (value === null || value === undefined || Number.isNaN(value)) return '--';
	return `${Math.round(value * 10) / 10}°`;
}

export function normalizeDeg(angle) {
	let a = angle % 360;
	if (a < 0) a += 360;
	return a;
}
