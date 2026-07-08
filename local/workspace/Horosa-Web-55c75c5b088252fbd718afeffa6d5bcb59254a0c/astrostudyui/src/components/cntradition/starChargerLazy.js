// perf 惰性化辅助：buildLocalBaziResult 仅对「当前公历年」eager 算 starCharger（值年星宿/28 宿），
// 其余流年/小运的 starCharger=null。本地引擎默认 UI 不读 starCharger，仅 legacy 视图
// （MainDirection / SmallDirection / MDSYear）展示。这些 legacy 消费端读到 null 时，按公历年
// on-demand 补算 buildStarChargerForYear(year, birthMonth, birthDay)（与 eager 逐字等价）。
import { buildStarChargerForYear } from '../../utils/baziLunarLocal';

// 从 bazi.nongli.birth（"YYYY-MM-DD HH:mm:ss"）解析出生月/日，供 safeSolarAtYearMD 同口径补算。
export function birthMonthDayFromBazi(bazi){
	const birth = bazi && bazi.nongli ? bazi.nongli.birth : '';
	if(typeof birth !== 'string'){
		return { month: undefined, day: undefined };
	}
	const m = birth.match(/^\s*\d+-(\d{1,2})-(\d{1,2})/);
	if(!m){
		return { month: undefined, day: undefined };
	}
	const month = Number(m[1]);
	const day = Number(m[2]);
	return {
		month: Number.isFinite(month) ? month : undefined,
		day: Number.isFinite(day) ? day : undefined,
	};
}

// 取某流年的 starCharger：已 eager 算（对象）直接用；惰性 null 时按公历年补算。返回对象（永不抛）。
export function resolveStarCharger(rawStarCharger, year, birthMonth, birthDay){
	if(rawStarCharger){
		return rawStarCharger;
	}
	if(!Number.isFinite(Number(year))){
		return {};
	}
	return buildStarChargerForYear(Number(year), birthMonth, birthDay) || {};
}
