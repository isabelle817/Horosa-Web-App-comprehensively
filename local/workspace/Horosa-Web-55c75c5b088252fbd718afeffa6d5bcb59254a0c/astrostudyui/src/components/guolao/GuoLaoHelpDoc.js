// 七政四余 · 操作手册(帮助页内容组件,占星页/七政页右上角「帮助」打开)。
// 逐流派/用制写清「怎么算 + 差在哪」;中性表述,纯展示零后端。规则与 perchart 置宿、guolaoData 单源一致。
import { Component } from 'react';
import { Tabs } from 'antd';

const { TabPane } = Tabs;
const MUTED = 'var(--horosa-muted, #999)';
const h = { fontWeight: 700, fontSize: 13.5, margin: '10px 0 3px' };
const p = { margin: '0 0 5px', lineHeight: 1.7 };
const ul = { margin: '0 0 6px', paddingLeft: 18 };
const li = { margin: '0 0 3px', lineHeight: 1.6 };
const card = { border: '1px solid var(--horosa-border, rgba(120,120,120,0.25))', borderRadius: 6, padding: '7px 9px', margin: '0 0 7px' };
const ct = { fontWeight: 700, marginBottom: 2 };
const kv = (k, v) => <div style={{ margin: '1px 0', lineHeight: 1.55 }}><span style={{ color: MUTED }}>{k}：</span>{v}</div>;
const body = { maxHeight: '56vh', overflowY: 'auto', fontSize: 13, paddingRight: 4 };

class GuoLaoHelpDoc extends Component{
	render(){
		return (
			<div style={{ marginTop: 10, borderTop: '1px solid var(--horosa-border, rgba(120,120,120,0.25))', paddingTop: 8 }}>
				<div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>七政四余 · 操作手册</div>
				<Tabs defaultActiveKey="overview" size="small">
					<TabPane tab="总览" key="overview">
						<div style={body}>
							<p style={p}><b>黄仪（黄道坐标 · 黄极为心）</b> vs <b>赤仪（赤道坐标 · 天极/天赤恒定）</b>:立足点不同 → 定命、定宫、置宿皆不同。</p>
							<p style={p}>一句话古今之别:<b>清以前赤道定、黄道有岁差(以赤求黄)</b>;<b>清以后黄道定、赤道时改(以黄求赤)</b>。</p>
							<ul style={ul}>
								<li style={li}>左栏「宿度制」分 <b>黄仪</b>(按黄经置宿:回归今宿/回归古制开禧/恒星制/授时历古法)与 <b>赤仪</b>(按赤经置宿:荀爽距星19年测/斗柄定房法/恒星制·现代天赤)两组。</li>
								<li style={li}>盘面落宫一律黄道(等分整宫 30°,命宫起);唯「授时历古法」档启用古法不等宫(周天 365.25)。</li>
								<li style={li}>切任一用制/命身设置 → 实时全组合重算(盘面 + 右栏命曜限度 + AI 挂载)。</li>
							</ul>
							<div style={h}>星盘样式(顶部切换)</div>
							<ul style={ul}>
								<li style={li}><b>多环命盘(默认)</b>:多层环排(宿环 / 十二宫 / 七政四余 / 神煞 / 流年),并提供「显示」开关组(行星相位、庙旺标注、神煞圈、限度年龄环等,见末页「显示·资料」)。</li>
								<li style={li}><b>经典盘</b>:传统单层圆形盘 / 方形盘(下方「盘式」子选项切换),版式古朴。</li>
								<li style={li}><b>天星择日</b>:以动盘择时为主的盘式,可另设流年 / 择日时间。</li>
							</ul>
							<p style={{ ...p, color: MUTED, marginTop: 4 }}>设置分两类:<b>影响落宫</b>(宿度制 / 命度 / 身宫 / 四余真平 / 报时星 等,改后整盘重算)与<b>仅影响呈现</b>(相位 / 庙旺标注 / 留伏迟疾 / 神煞圈等显示开关,改后即生效、不重排)。</p>
						</div>
					</TabPane>

					<TabPane tab="宿度制" key="su28">
						<div style={body}>
							<p style={{ ...p, color: MUTED }}>逐档:原理 / 置宿坐标 / 锚点 / 框架 / 岁差 / 周天 / 与邻档差在哪。</p>
							<div style={card}><div style={ct}>回归今宿（2 · 默认 · 黄仪）</div>
								{kv('置宿', '28 距星 J2000 活体 → 严格 IAU 岁差进动到盘历元 → 回归黄经,逐宿不均匀,按黄经定宿')}
								{kv('框架', '回归黄道(tropical)')}{kv('周天', '360°')}</div>
							<div style={card}><div style={ct}>回归古制开禧（3 · 黄仪）</div>
								{kv('置宿', '开禧历宿基值 + 岁差(ayanamsha≈1300年/4°)投射,按黄经')}
								{kv('注', '随生年漂移(时变岁差),非「永不变盘」')}</div>
							<div style={card}><div style={ct}>恒星制（4 · 黄仪）</div>
								{kv('置宿', '郑氏恒星基值,盘走恒星黄道(sidereal,历元≈585CE),行星亦 sidereal,按黄经')}
								{kv('岁差', '可选「恒星岁差」子下拉(郑式默认 + 47 种 Lahiri/Raman/KP… 任选)')}</div>
							<div style={card}><div style={ct}>授时历古法（6 · 黄仪 · 古法立成）</div>
								{kv('置宿', '元明赤道宿度 → 传统推变黄道术(进退/纪元/会圆三法可选) → 授时历黄道宿度立成,按黄经')}
								{kv('宫制', '配古法不等宫(大统法原十二宫界次,周天 365.25);切回别档恢复等分整宫')}
								{kv('注', '产出为「极黄经」宿界(古历黄经),离黄道远的宿与现代黄经可差 7–8°,系古法本然,非误差')}</div>
							<div style={card}><div style={ct}>荀爽距星 19 年测（0 · 赤仪）</div>
								{kv('置宿', 'chart 实测距星活体 + 危/鬼宿年改正(实测家法微调),按赤经')}</div>
							<div style={card}><div style={ct}>斗柄定房法（1 · 赤仪 · 实验性）</div>
								{kv('置宿', '北斗摇光(Alkaid)立春锚 + 38°,按赤经;与今宿差约 5°(锚偏移)')}</div>
							<div style={card}><div style={ct}>恒星制 · 现代天赤（5 · 赤仪）</div>
								{kv('置宿', '与荀爽同一份正确赤道真星活体(J2000+自行+IAU岁差到盘历元),按赤经,但去荀爽危/鬼改正')}
								{kv('周天', '360°(非古度立成,与第 6 档「授时历古法」365.25 古度体系区分)')}
								{kv('注', '与荀爽仅差危/鬼微调;曾误用黄经表的赤经致偏 10–44°,现已真修')}</div>
							<div style={card}><div style={ct}>赤道回归（7 · 赤仪）</div>
								{kv('置宿', '固定元明赤道宿度立成(×360/365.25),宿界钉死于黄道零点、赤经常数、不随岁差;行星按盘历元赤经落宿')}
								{kv('锚点', '可选「回归锚点」子下拉:牛前·冬至270°(默认,中国天文起点) / 春分·壁2.3°')}
								{kv('对比', '与「恒星制·现代天赤(5)」正相反:5 是宿随真星走(锚恒星),7 是星随宿移(锚回归点);跨历元宿界恒定')}</div>
							<p style={{ ...p, color: MUTED, marginTop: 4 }}>宿宽天生不等:宿由距星间隔定义。觜≈1°(古度低至 0.05°)、鬼≈2–4° 极窄,井≈30°+ 巨宽,皆正确非 bug。</p>
						</div>
					</TabPane>

					<TabPane tab="宫位制" key="palace">
						<div style={body}>
							<div style={h}>定宫法</div>
							<ul style={ul}>
								<li style={li}><b>今 · 等分整宫(默认)</b>:12 宫各 30°,自命宫起。</li>
								<li style={li}><b>古 · 不等宫(授时历古法档启用)</b>:大统法原十二宫界次(周天 365.25,移宫过度),各宫宽约 30.44° 不等。</li>
							</ul>
							<div style={h}>命宫安法(命度)</div>
							<ul style={ul}>
								<li style={li}><b>占星上升(默认)</b>:取黄道上升点为命度。<span style={{ color: MUTED }}>(西占借用;古法本宗为日出/遇卯,可自选。)</span></li>
								<li style={li}><b>日出安命</b> / <b>遇卯安命(古法 · 固定 06:00 卯)</b> / <b>赤黄转换</b> / <b>自定地支</b>。</li>
							</ul>
							<div style={h}>身宫安法</div>
							<ul style={ul}>
								<li style={li}><b>太阴落宫(果老 · 默认)</b>=月亮所落宫。</li>
								<li style={li}><b>逢酉(琴堂)</b>=月宫 + 9 − 生时支 / <b>自定地支</b>。</li>
							</ul>
							<div style={h}>命主取法</div>
							<ul style={ul}>
								<li style={li}><b>宫主(默认)</b> / <b>度主</b> / <b>贬宫主专度主(果老)</b>。</li>
							</ul>
						</div>
					</TabPane>

					<TabPane tab="四余·报时星" key="siyu">
						<div style={body}>
							<div style={h}>四余取法</div>
							<ul style={ul}>
								<li style={li}><b>罗睺/计都(交点)</b>:真交点(SE_TRUE_NODE)/ 平交点(SE_MEAN_NODE),默认平(零回归)。计=罗 +180° 对冲。</li>
								<li style={li}><b>月孛</b>:真远地点 / 平远地点,默认平。</li>
								<li style={li}>古法立成走匀速平行每日行度;今法走真交点/真拱点精算。罗火、计土、孛水、炁木。</li>
							</ul>
							<div style={h}>报时星(太阳时)</div>
							<ul style={ul}>
								<li style={li}><b>真太阳时(默认)</b>=经度 + 均时差;<b>平太阳时</b>=仅经度;<b>钟表时</b>=0(用钟表时刻)。</li>
							</ul>
							<div style={h}>罗计南北</div>
							<ul style={ul}>
								<li style={li}><b>北罗南计</b> / <b>北计南罗</b>:北交点取罗睺或计都之别(流派分歧,可选)。</li>
							</ul>

							<div style={h}>七政擢升度数(庙旺峰值)</div>
							<ul style={ul}>
								<li style={li}>盘面/右栏在七政落入其<b>擢升(旺)本座</b>时,标出该曜的<b>擢升度数</b>(旺度峰值);距峰值 ≤1° 另标「精擢」。擢升度由各宫庙主旺度派生,用以细判七政庙旺强弱,非另起一盘。</li>
							</ul>
						</div>
					</TabPane>

					<TabPane tab="行运·流派" key="luck">
						<div style={body}>
							<div style={h}>行运法（限度法）</div>
							<ul style={ul}>
								<li style={li}><b>古度限度法(默认)</b>:命度十二宫大限,自命度起,各宫按古度年数推。</li>
								<li style={li}><b>洞微大限</b>:命宫顺行,各宫年数不等(命15·相10·福11·官15·迁8·妻11·奴4.5·男4.5·田4.5·财5·兄5·疾7);起限虚岁 = 10 + 太阳宫内度/3 + 月份/12;每宫每年飞星吊度 = 30/宫年数,逐岁链式。</li>
								<li style={li}><b>小限</b>:生年支加命宫逆数,每年行一宫,12 年一轮。</li>
								<li style={li}><b>月限</b>:当年小限宫起生月,按节气月逆寻。</li>
								<li style={li}><b>童限</b>:命财疾妻福顺排;出童限 ≈ 逆数至太阳交中气(三日一年) + 基数。</li>
							</ul>
							<div style={h}>童限基数（仅行运法=童限时显示）</div>
							<ul style={ul}>
								<li style={li}><b>通行十年(默认)</b>:三日一年 + 10。</li>
								<li style={li}><b>古九岁</b>:三日一年 + 9。</li>
								<li style={li}><b>虚十一·早不过11岁</b>:三日一年 + 11,出限钳于 [11,20](早不过十一、晚不过二十)。</li>
							</ul>
							<div style={h}>流派预设（一键套各开关组合,选后回「自定」可微调）</div>
							<ul style={ul}>
								<li style={li}><b>自定</b>:逐项手动。</li>
								<li style={li}><b>琴堂五星</b>:日出安命 + 逢酉身宫 + 平太阳时。</li>
								<li style={li}><b>果老星宗</b>:日出安命 + 太阴身宫 + 真太阳时 + 洞微大限 + 贬宫主专度主。</li>
								<li style={li}><b>天官/耶律</b>:赤黄转换命 + 真交点。</li>
								<li style={li}><b>弧角天星</b>:占星上升 + 真交点 + 真太阳时 + 赤道现代天赤。</li>
							</ul>
							<div style={h}>命主取法</div>
							<ul style={ul}>
								<li style={li}><b>宫主(默认)</b>=命宫宫主曜;<b>度主</b>=命度所落宿之宿主曜;<b>贬宫主专度主</b>=果老派专取度主(三主表恒显宫主/度主/身主,便于对照)。</li>
							</ul>
							<div style={h}>星盘样式 / 盘式</div>
							<ul style={ul}>
								<li style={li}><b>多环命盘(默认)</b>:多环排布(宿环 / 十二宫 / 七政四余 / 神煞 / 流年),附「显示」开关组(见末页)。</li>
								<li style={li}><b>经典盘</b>:传统单层盘,下方「盘式」子选项切 <b>圆形盘 / 方形盘</b>。</li>
								<li style={li}><b>天星择日</b>:动盘择时盘式,可另设流年 / 择日时间。</li>
							</ul>
						</div>
					</TabPane>

					<TabPane tab="显示·资料" key="display">
						<div style={body}>
							<p style={{ ...p, color: MUTED }}>下列开关在「多环命盘 / 天星择日」盘式的左栏「显示」组提供,均为呈现偏好,即改即生效、不重排盘。</p>

							<div style={h}>行星相位</div>
							<ul style={ul}>
								<li style={li}>可多选要在盘面画出的相位:<b>會(0°) / 衝(180°) / 刑(90°) / 合(60°) / 半合(30°) / 半刑(45°) / 四合(135°)</b>。</li>
								<li style={li}><b>默认显示</b>會、衝、刑、合、半合五种;半刑、四合默认不画,需要时勾上。相位标注用于看七政四余之间的会照、对冲、相刑等关系。</li>
							</ul>

							<div style={h}>庙旺标注(默认开)</div>
							<ul style={ul}>
								<li style={li}>在七政落入其庙 / 旺 / 得地 / 平 / 落 / 陷之位时标出庙旺徽记。力量序为<b>庙＞旺＞得地三方＞平＞落＞陷</b>(庙=入庙本宫、旺=擢升本座、落=旺之对宫、陷=庙之对宫)。</li>
								<li style={li}>七政落入<b>擢升(旺)本座</b>时另标该曜的<b>擢升度数</b>(旺度峰值),距峰值 ≤1° 再标「精擢」,用以细判庙旺强弱(详见「四余·报时星」页)。</li>
							</ul>

							<div style={h}>留伏迟疾(默认关)</div>
							<ul style={ul}>
								<li style={li}>开启后按七政当下行度标注<b>顺 / 逆 / 留 / 迟 / 速</b>五种动态:速度为负标「逆」、接近 0 标「留」、明显低于均速标「迟」、明显高于均速标「速」、其余为「顺」。果老星宗与弧角天星预设默认开启此项。</li>
							</ul>

							<div style={h}>神煞圈 / 限度年龄环</div>
							<ul style={ul}>
								<li style={li}><b>本命神煞圈(默认开)</b>:在盘外环标本命神煞落宫。</li>
								<li style={li}><b>限度年龄环(默认开)</b>:按当前所选行运法画出宫限环,标出当前年龄所在宫与吊度。</li>
								<li style={li}><b>流年神煞圈</b>(多环命盘特有):另设流年时间后,叠画该年流年神煞。</li>
							</ul>

							<div style={h}>神煞总集</div>
							<ul style={ul}>
								<li style={li}>盘面与右栏「神煞」可列出本命神煞(吉神如禄勋·文昌·天厨·天德·天喜·红鸾·天贵·玉贵·国印·解神等;凶神如劫杀·灾煞·咸池·三刑·孤辰·寡宿·飞廉·亡神·空亡·阳刃·大耗等;另有华盖·驿马·岁驾等中性神),并附逐神判语。</li>
							</ul>

							<div style={h}>资料速查(左栏底部弹窗)</div>
							<ul style={ul}>
								<li style={li}>内置一份古法立成速查表,含:<b>二十八宿</b>(各宿距度、度主,及今宿 / 古宿零点)、<b>十二宫</b>(各宫宫主与旺曜擢升度数)、<b>庙旺</b>(七政 7×12 力量表)、<b>化曜</b>(化曜 A 诀≠魁星 B 诀明示,十化次序与所管宫、约略对应紫微四化)、<b>四余</b>(罗计孛炁五行、每日平行度、周期)、<b>洞微大限</b>(各宫年数)、<b>流派对照</b>(设置组合→派相)。</li>
							</ul>

							<div style={h}>右栏面板(多环命盘 / 天星择日)</div>
							<ul style={ul}>
								<li style={li}><b>概览</b>:起盘时间、流年、真太阳与日出没、命身与限度,以及三主(宫主 / 度主 / 身主)、五虎遁配干、生年化曜(A诀)。</li>
								<li style={li}><b>星曜</b>:七政四余落位、庙旺、虚实(顺逆留迟速)。</li>
								<li style={li}><b>宫限</b>:随所选行运法显示大限 / 洞微 / 小限 / 月限 / 童限。</li>
								<li style={li}><b>神煞</b>:本命 / 流年神煞圈与判语。</li>
								<li style={li}><b>格局</b>:命中的喜格 / 忌格及说明(随坐向、设置实时重判)。</li>
							</ul>
						</div>
					</TabPane>

					<TabPane tab="古今星制之别" key="diff">
						<div style={body}>
							<ul style={ul}>
								<li style={li}>春分太阳:古制在亥宫壁宿 2–3 度(非现代白羊 0°)——岁差累积使「岁实起点」与星空错位。</li>
								<li style={li}>黄赤宫界古今变制:古以赤道十二次定宫界(不等),今以黄道等分整宫;同一行星黄经,古今落宫可异。</li>
								<li style={li}>四正子午卯酉:对应冬至/夏至/春分/秋分四枢,古今坐标系下其黄经位置随岁差迁移。</li>
								<li style={li}>极黄经 ≠ 现代黄经:古历「黄经」以赤极为心投影到黄道(极黄经),与现代黄极为心的黄经,近黄道差约 2.5°、远黄道(觜/参)可达 7–8°;「授时历古法」档忠实采用极黄经立成值。</li>
							</ul>
						</div>
					</TabPane>
				</Tabs>
			</div>
		);
	}
}

export default GuoLaoHelpDoc;
