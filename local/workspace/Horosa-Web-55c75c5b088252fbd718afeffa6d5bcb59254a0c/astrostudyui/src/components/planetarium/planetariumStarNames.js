// Proper / Chinese names for the brightest, most-recognizable stars — keyed by
// Yale Bright Star (HR) number. Purely an ENHANCEMENT for display + search
// (对齐成熟软件 like Stellarium); the catalog already carries Bayer/Flamsteed/
// constellation, so a missing or imperfect entry here changes nothing functional —
// the star still shows and is searchable by its catalog designation.
//
// buildStarIndex() looks these up by star.id ("bsc5-2491"), "HR2491", "HR 2491", or "2491".

export const STAR_PROPER_NAMES = {
	// brightest stars
	'2491': { zh: '天狼', proper: 'Sirius' },
	'2326': { zh: '老人', proper: 'Canopus' },
	'5340': { zh: '大角', proper: 'Arcturus' },
	'7001': { zh: '织女一', proper: 'Vega' },
	'1708': { zh: '五车二', proper: 'Capella' },
	'1713': { zh: '参宿七', proper: 'Rigel' },
	'2943': { zh: '南河三', proper: 'Procyon' },
	'2061': { zh: '参宿四', proper: 'Betelgeuse' },
	'472': { zh: '水委一', proper: 'Achernar' },
	'7557': { zh: '河鼓二', proper: 'Altair' },
	'1457': { zh: '毕宿五', proper: 'Aldebaran' },
	'6134': { zh: '心宿二', proper: 'Antares' },
	'5056': { zh: '角宿一', proper: 'Spica' },
	'2990': { zh: '北河三', proper: 'Pollux' },
	'8728': { zh: '北落师门', proper: 'Fomalhaut' },
	'7924': { zh: '天津四', proper: 'Deneb' },
	'3982': { zh: '轩辕十四', proper: 'Regulus' },
	'2891': { zh: '北河二', proper: 'Castor' },
	'1790': { zh: '参宿五', proper: 'Bellatrix' },
	// pole + variable + well-known doubles
	'424': { zh: '勾陈一', proper: 'Polaris' },
	'936': { zh: '大陵五', proper: 'Algol' },
	// 北斗七星 (Big Dipper)
	'4301': { zh: '天枢', proper: 'Dubhe' },
	'4295': { zh: '天璇', proper: 'Merak' },
	'4554': { zh: '天玑', proper: 'Phecda' },
	'4660': { zh: '天权', proper: 'Megrez' },
	'4905': { zh: '玉衡', proper: 'Alioth' },
	'5054': { zh: '开阳', proper: 'Mizar' },
	'5191': { zh: '摇光', proper: 'Alkaid' },
};
