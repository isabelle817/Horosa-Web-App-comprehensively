import { describeMundaneChart, describeEclipse, MUNDANE_HOUSE_MEANINGS, PLANET_IN_MUNDANE_HOUSE, ECLIPSE_DECAN } from '../describe';

function facts(){
	return {
		planets: {
			sun: { house: 10, sign: 'leo', signlon: 5, angularity: 'angular', retro: false },
			moon: { house: 4, sign: 'scorpio', signlon: 24, angularity: 'angular', retro: false },
			mars: { house: 7, sign: 'aries', signlon: 12, angularity: 'angular', retro: true },
		},
	};
}

describe('mundane describe', ()=>{
	it('逐行星落世俗宫产判词行', ()=>{
		const rows = describeMundaneChart(facts());
		expect(rows.length).toBe(3);
		const sun = rows.find((r) => r.planet === 'sun');
		expect(sun.house).toBe(10);
		expect(sun.houseMeaning).toBe(MUNDANE_HOUSE_MEANINGS[10]);
		expect(sun.text).toBe(PLANET_IN_MUNDANE_HOUSE.sun[10]);
		expect(rows.find((r) => r.planet === 'mars').retro).toBe(true);
	});

	it('行星落世俗宫表与分度表完整(10×12 / 36)', ()=>{
		Object.keys(PLANET_IN_MUNDANE_HOUSE).forEach((k) => {
			for(let h = 1; h <= 12; h++){ expect(typeof PLANET_IN_MUNDANE_HOUSE[k][h]).toBe('string'); }
		});
		let decanCount = 0;
		Object.keys(ECLIPSE_DECAN).forEach((s) => { expect(ECLIPSE_DECAN[s].length).toBe(3); decanCount += 3; });
		expect(decanCount).toBe(36);
	});

	it('日食看太阳座定元素+分度', ()=>{
		const ec = describeEclipse(facts(), 'solar');
		expect(ec.luminary).toBe('sun');
		expect(ec.sign).toBe('leo');
		expect(ec.element).toBe('fire');
		expect(ec.decan).toBe(0); // signlon 5 → 前期
	});

	it('月食看月亮座(天蝎 24° → 后期)', ()=>{
		const ec = describeEclipse(facts(), 'lunar');
		expect(ec.luminary).toBe('moon');
		expect(ec.sign).toBe('scorpio');
		expect(ec.element).toBe('water');
		expect(ec.decan).toBe(2);
	});
});
