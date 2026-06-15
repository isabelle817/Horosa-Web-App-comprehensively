import { buildKeypoints, buildKeypointsSnapshotText, PERIOD_NUMBERS } from '../keypoints120';
import * as AstroConst from '../../constants/AstroConst';

function signLon(s){ return AstroConst.LIST_SIGNS.indexOf(s) * 30 + 5; }

// 月亮在白羊(释放点)，火星在第4座(巨蟹) → 火星位置数 k=4。
function chart(){
	return {
		chart: {
			objects: [
				{ id: 'Moon', sign: 'Aries', lon: signLon('Aries') },
				{ id: 'Sun', sign: 'Aries', lon: signLon('Aries') },
				{ id: 'Mars', sign: 'Cancer', lon: signLon('Cancer') },
				{ id: 'Mercury', sign: 'Taurus', lon: signLon('Taurus') },
				{ id: 'Venus', sign: 'Gemini', lon: signLon('Gemini') },
				{ id: 'Jupiter', sign: 'Leo', lon: signLon('Leo') },
				{ id: 'Saturn', sign: 'Virgo', lon: signLon('Virgo') },
			],
		},
		params: { birth: '1990-01-01 12:00:00' },
	};
}

describe('keypoints120', ()=>{
	it('火星落自月亮起第4座 → 位置数 k=4', ()=>{
		const r = buildKeypoints(chart(), { mode: 'soul', maxAge: 30 });
		const mars = r.positions.find((x) => x.planet === AstroConst.MARS);
		expect(mars.k).toBe(4);
	});

	it('第4年(及4的倍数)激活火星(位置)', ()=>{
		const r = buildKeypoints(chart(), { mode: 'soul', maxAge: 30 });
		const y4 = r.rows.find((row) => row.age === 4);
		expect(y4).toBeTruthy();
		expect(y4.posActive.some((x) => x.planet === AstroConst.MARS)).toBe(true);
	});

	it('小年激活:火星小年7 → 第7年小年激活火星', ()=>{
		expect(PERIOD_NUMBERS[AstroConst.MARS]).toBe(7);
		const r = buildKeypoints(chart(), { mode: 'soul', maxAge: 30 });
		const y7 = r.rows.find((row) => row.age === 7);
		expect(y7.tableActive.some((x) => x.planet === AstroConst.MARS)).toBe(true);
	});

	it('快照含 [数字相位推运];空盘空串', ()=>{
		expect(buildKeypointsSnapshotText(chart(), { maxAge: 30 })).toContain('[数字相位推运]');
		expect(buildKeypointsSnapshotText(null)).toBe('');
	});
});
