// 量化盘 四流派软预设(WP-1):原始汉堡 / 纯净派 / 美国对称 / 宇宙生物学。
// 每派一组默认(虚星/个人点集/容许度/盘基/十字指针/宫框/盘式);选派=套该派默认,用户可逐项覆盖。
// 默认 classic = 现状默认(虚星开/90°盘/orb 1/无十字指针/无宫框/折叠盘)→ 切 classic 即零回归基线。
import { SUN, MOON, ASC, MC, NORTH_NODE, SOUTH_NODE, ARIES_POINT } from '../../constants/AstroConst';

export const SCHOOL = {
	CLASSIC: 'classic',
	PURE: 'pure',
	URANIAN: 'uranian',
	COSMO: 'cosmo',
};

export const SCHOOL_OPTIONS = [
	{ value: 'classic', label: '原始汉堡' },
	{ value: 'pure', label: '纯净派' },
	{ value: 'uranian', label: '美国对称' },
	{ value: 'cosmo', label: '宇宙生物学' },
];

// personalKeys:个人点集(汉堡六点含白羊点;宇宙生物学 Basic Five 无白羊点/无南交)。
// includeTnp:是否纳入 8 虚星(宇宙生物学不用虚星)。
// dialBase:盘基谐波(默认 90)。crossPointer:十字指针 22.5°(纯净派默认开)。
// showHouseFrames:六宫框(汉堡/美国对称开;纯净派/宇宙生物学关)。
// orbMidpoint / orbPersonal:中点 / 个人点容许度。ephemBase:图形星历盘基(宇宙生物学 45°)。
// cosmogramDefault:默认切宇宙图盘式(宇宙生物学建议)。
export const SCHOOL_PRESETS = {
	classic: {
		includeTnp: true, personalKeys: [SUN, MOON, ASC, MC, NORTH_NODE, SOUTH_NODE, ARIES_POINT],
		dialBase: 90, crossPointer: false, showHouseFrames: true, orbMidpoint: 1.0, orbPersonal: 1.0, ephemBase: 22.5, cosmogramDefault: false,
	},
	pure: {
		includeTnp: true, personalKeys: [SUN, MOON, ASC, MC, NORTH_NODE, SOUTH_NODE, ARIES_POINT],
		dialBase: 90, crossPointer: true, showHouseFrames: false, orbMidpoint: 0.5, orbPersonal: 1.0, ephemBase: 22.5, cosmogramDefault: false,
	},
	uranian: {
		includeTnp: true, personalKeys: [SUN, MOON, ASC, MC, NORTH_NODE, SOUTH_NODE, ARIES_POINT],
		dialBase: 90, crossPointer: false, showHouseFrames: true, orbMidpoint: 1.0, orbPersonal: 1.5, ephemBase: 22.5, cosmogramDefault: false,
	},
	cosmo: {
		includeTnp: false, personalKeys: [SUN, MOON, ASC, MC, NORTH_NODE],   // Basic Five:无白羊点 / 无南交
		dialBase: 90, crossPointer: false, showHouseFrames: false, orbMidpoint: 1.5, orbPersonal: 5.0, ephemBase: 45, cosmogramDefault: true,
	},
};

export function presetForSchool(s) {
	return SCHOOL_PRESETS[s] || SCHOOL_PRESETS.classic;
}

// 个人点集(Set,供 cursorReadout / midpointTree / planetaryPictures 的 personal 选项)。
export function personalSetForSchool(s) {
	return new Set(presetForSchool(s).personalKeys);
}

// 流派 → 后端请求参数(/germany/midpoint 经 schoolToBackendParams + orb 下发;Java 白名单 WP-0 已通)。
export function schoolToBackendParams(s) {
	const p = presetForSchool(s);
	return { school: s, includeTnp: p.includeTnp, orbMidpoint: p.orbMidpoint, orbPersonal: p.orbPersonal, frames: p.showHouseFrames };
}
