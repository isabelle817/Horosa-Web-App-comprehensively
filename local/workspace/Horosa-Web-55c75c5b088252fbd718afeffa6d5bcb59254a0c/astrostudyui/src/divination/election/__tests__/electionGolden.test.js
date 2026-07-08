// 择日引擎默认路径 golden 锚。
// 法律:西方深化各 WP 期间,默认(不带 opts / 现代主流档)输出必须与快照逐字一致;
// 新 WP 落地若纯新增段落,重生成快照时人工核 diff——旧行一行都不许变。
import { runElection } from '../electionEngine';
import { buildElectionSnapshot } from '../electionSnapshot';
import { buildMockResult } from './electionFixture';

// 摘要化:去掉 facts(含原始 result 引用,体积大且非输出面),锚全部对外输出字段。
function digest(j){
	if(!j) return null;
	const { facts, ...rest } = j;
	return rest;
}

describe('election golden(默认路径零回归锚)', () => {
	it('marriage 默认报告逐字锚', () => {
		const j = runElection(buildMockResult(), 'marriage');
		expect(digest(j)).toMatchSnapshot();
	});

	it('surgery 默认报告逐字锚(第二用事,保护 must_avoid/skip 路径)', () => {
		const j = runElection(buildMockResult(), 'surgery');
		expect(digest(j)).toMatchSnapshot();
	});

	it('AI 快照文本逐字锚', () => {
		const j = runElection(buildMockResult(), 'marriage');
		expect(buildElectionSnapshot(j)).toMatchSnapshot();
	});

	it('无效 topic 兜底 marriage(现状行为;castMoment 按原 topicId 查表走默认话术,亦为现状)', () => {
		const a = digest(runElection(buildMockResult(), 'no_such_topic'));
		const b = digest(runElection(buildMockResult(), 'marriage'));
		expect(a.castMoment).toBe('该用事最具象征意义的初始动作的时刻。');
		delete a.castMoment; delete b.castMoment;
		expect(a).toEqual(b);
	});
});
