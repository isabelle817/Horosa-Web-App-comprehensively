import { buildTriplicityPeriods, buildTriplicityRulersSnapshotText } from '../triplicityRulers';
import * as AstroConst from '../../constants/AstroConst';

function signLon(s){ return AstroConst.LIST_SIGNS.indexOf(s) * 30 + 5; }

function chart({ diurnal, sunSign, moonSign }){
	return {
		chart: {
			isDiurnal: diurnal,
			objects: [
				{ id: 'Sun', sign: sunSign, lon: signLon(sunSign), signlon: 5, house: 'House10', movedir: 'Direct' },
				{ id: 'Moon', sign: moonSign, lon: signLon(moonSign), signlon: 5, house: 'House4', movedir: 'Direct' },
			],
		},
		params: { birth: '1990-01-01 12:00:00' },
	};
}

describe('triplicityRulers', ()=>{
	it('昼盘取区间光体太阳所在座的第一三分主星(白羊→日)', ()=>{
		const r = buildTriplicityPeriods(chart({ diurnal: true, sunSign: 'Aries', moonSign: 'Cancer' }), { division: 'thirds' });
		expect(r.sectLight).toBe(AstroConst.SUN);
		expect(r.periods[0].ruler).toBe(AstroConst.SUN); // Trip[Aries][0]
		expect(r.periods[2].ruler).toBe(AstroConst.SATURN); // 协作 Trip[2]
	});

	it('夜盘看月亮所在座并昼夜换序(白羊夜→主三分主星=木)', ()=>{
		const r = buildTriplicityPeriods(chart({ diurnal: false, sunSign: 'Leo', moonSign: 'Aries' }), { division: 'thirds' });
		expect(r.sectLight).toBe(AstroConst.MOON);
		expect(r.periods[0].ruler).toBe(AstroConst.JUPITER); // Trip[Aries][1]
	});

	it('三分边界 0–25 / 25–50 / 50–75', ()=>{
		const r = buildTriplicityPeriods(chart({ diurnal: true, sunSign: 'Aries', moonSign: 'Cancer' }), { division: 'thirds', lifespan: 75 });
		expect(r.periods[0].fromAge).toBe(0);
		expect(Math.round(r.periods[1].fromAge)).toBe(25);
		expect(Math.round(r.periods[2].fromAge)).toBe(50);
	});

	it('快照含 [三分主星推运] 段头;空盘返回空串', ()=>{
		const txt = buildTriplicityRulersSnapshotText(chart({ diurnal: true, sunSign: 'Aries', moonSign: 'Cancer' }));
		expect(txt).toContain('[三分主星推运]');
		expect(buildTriplicityRulersSnapshotText(null)).toBe('');
	});
});
