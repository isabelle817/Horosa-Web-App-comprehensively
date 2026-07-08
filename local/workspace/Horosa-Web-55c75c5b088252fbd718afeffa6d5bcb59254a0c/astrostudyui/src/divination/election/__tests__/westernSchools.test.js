// WP-0 西方子流派轴:五档 profile 完整性 + 引擎行为分派 + 默认档零回归不变式。
import { WEST_SCHOOLS, WEST_SCHOOL_ORDER, schoolOf } from '../westernSchools';
import { runElection } from '../electionEngine';
import { buildElectionSnapshot } from '../electionSnapshot';
import { buildMockResult } from './electionFixture';

describe('westernSchools 五档 profile', () => {
	it('五档齐全且字段完整', () => {
		expect(WEST_SCHOOL_ORDER).toEqual(['modern_main', 'hellenistic', 'persian', 'renaissance', 'modern_revival']);
		WEST_SCHOOL_ORDER.forEach((id) => {
			const s = WEST_SCHOOLS[id];
			expect(s.id).toBe(id);
			expect(typeof s.cn).toBe('string');
			expect(['full', 'annotate']).toContain(s.modernPlanets);
			expect(['high', 'medium']).toContain(s.sectEmphasis);
			expect(typeof s.orbProfile).toBe('string');
			expect(typeof s.desc).toBe('string');
		});
	});

	it('宫制联动:现代主流不联动,古典四档各归其制', () => {
		expect(WEST_SCHOOLS.modern_main.hsys).toBeNull();
		expect(WEST_SCHOOLS.hellenistic.hsys).toBe(0);   // 整宫
		expect(WEST_SCHOOLS.persian.hsys).toBe(1);        // Alcabitius
		expect(WEST_SCHOOLS.renaissance.hsys).toBe(2);    // Regiomontanus
		expect(WEST_SCHOOLS.modern_revival.hsys).toBe(0); // 整宫回归
	});

	it('schoolOf 兜底现代主流', () => {
		expect(schoolOf(undefined).id).toBe('modern_main');
		expect(schoolOf('no_such').id).toBe('modern_main');
		expect(schoolOf('persian').id).toBe('persian');
	});
});

describe('WP-0 引擎行为分派', () => {
	it('🔴 默认档零回归不变式:不带 opts / 显式 modern_main / 未知档 → 输出深等', () => {
		const strip = (j) => { const { facts, ...rest } = j; return rest; };
		const a = strip(runElection(buildMockResult(), 'marriage'));
		const b = strip(runElection(buildMockResult(), 'marriage', null, null, { westSchool: 'modern_main' }));
		const c = strip(runElection(buildMockResult(), 'marriage', null, null, { westSchool: 'bogus' }));
		expect(b).toEqual(a);
		expect(c).toEqual(a);
	});

	it('古典档:三王星红线降为 info 注记(不扣分),七曜红线原样', () => {
		// fixture 的 uranus 在 2 宫不触红线 → 改注入:天王星入 7 宫触 uranus_on_angle_1_7。
		const mk = () => {
			const r = buildMockResult();
			const u = r.chart.objects.find((o) => o.id === 'Uranus');
			u.house = 'House7'; u.lon = 204; u.sign = 'Libra'; u.signlon = 24;
			return r;
		};
		const modern = runElection(mk(), 'marriage');
		const hel = runElection(mk(), 'marriage', null, null, { westSchool: 'hellenistic' });

		const uModern = modern.hard_flags.find((f) => f.id === 'uranus_on_angle_1_7');
		const uHel = hel.hard_flags.find((f) => f.id === 'uranus_on_angle_1_7');
		expect(uModern.severity).toBe('high');
		expect(uHel.severity).toBe('info');
		expect(uHel.message).toContain('现代因素');
		// 七曜红线(水逆/火星角宫)两档同权
		['mercury_retro', 'malefic_on_angle'].forEach((id) => {
			expect(hel.hard_flags.find((f) => f.id === id).severity)
				.toBe(modern.hard_flags.find((f) => f.id === id).severity);
		});
		// info 不扣分:古典档罚分 < 现代档罚分
		expect(hel.penalty).toBeLessThan(modern.penalty);
		expect(hel.overall.score).toBeGreaterThan(modern.overall.score);
	});

	it('输出恒带 westSchool 标识;快照仅非默认档写流派行', () => {
		const dj = runElection(buildMockResult(), 'marriage');
		const pj = runElection(buildMockResult(), 'marriage', null, null, { westSchool: 'persian' });
		expect(dj.westSchool).toEqual({ id: 'modern_main', cn: '现代主流' });
		expect(pj.westSchool).toEqual({ id: 'persian', cn: '波斯-阿拉伯' });
		expect(buildElectionSnapshot(dj)).not.toContain('西方流派');
		expect(buildElectionSnapshot(pj)).toContain('西方流派：波斯-阿拉伯');
	});
});
