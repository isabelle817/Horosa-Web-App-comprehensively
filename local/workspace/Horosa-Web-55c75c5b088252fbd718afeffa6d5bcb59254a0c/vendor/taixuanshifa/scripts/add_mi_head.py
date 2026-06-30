# -*- coding: utf-8 -*-
"""
补全太玄筮法字典缺失的第 33 首「密」(code 2123)。

背景:
  taixuandict.p 的键 = 揲筮四位数字(方/州/部/家,每位∈{1,2,3})拼接,数值排序即
  扬雄《太玄经》八十一首的次第。原字典仅 80 首,缺 code 2123 = 第33首「密」
  (序在「眾」2122 与「親」2131 之间)。一旦揲筮得 2123(约 1/81≈1.23% 概率),
  taixuandict.get(2123) 返 None → 后端吞成空盘崩溃。

原文来源(逐字交叉核对):
  - 中國哲學書電子化計劃 ctext.org《太玄經·密》 https://ctext.org/taixuanjing/mi/zh
  - 维基文库《太玄經》「密」首(变体字差异已核对,取 ctext 通行字形)
首名/首序经 ctext.org《太玄經》目录 + 维基文库交叉确认:第33首「密」,
序在「眾」(第32首,2122) 与「親」(第34首,2131) 之间。

字段 schema 与既有 80 首完全一致:
  {"卦": {首名: 首辞}, "初一":..., "次二":..., ... "上九":...}
  首辞不含首名前缀/卦象字;每赞值 = 赞辞。測曰,「引文」、释文也。
"""
import pickle
import os
import json

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DICT_PATH = os.path.join(ROOT, "data", "taixuandict.p")

MI_CODE = 2123  # 第33首「密」的揲筮码(方2州1部2家3)

mi_entry = {
    "卦": {"密": "陽氣親天，萬物丸蘭，咸密無間。"},
    "初一": "窺之無間，大幽之門。測曰，「窺之無間」、密無方也。",
    "次二": "不密不比，我心即次。測曰，「不密不比」、違厥鄉也。",
    "次三": "密于親，利以作人。測曰，「密于親」、為利臧也。",
    "次四": "密于腥臊，三日不覺殽。測曰，「密于腥臊」、小惡通也。",
    "次五": "密密不𦉑，嬪于天。測曰，「密密不𦉑」、並天功也。",
    "次六": "大惡之比，或益之恤。測曰，「大惡之比」、匹異同也。",
    "次七": "密有口，小鰓。大君在，無後。測曰，「密口小鰓」、賴君逢也。",
    "次八": "琢齒依齦，三歲無君。測曰，「琢齒依齦」、君自拔也。",
    "上九": "密禍之比，先下後得其死。測曰，「密禍之比」、終不可奪也。",
}


def main():
    with open(DICT_PATH, "rb") as f:
        d = pickle.load(f)
    before = len(d)
    if MI_CODE in d:
        print("[skip] {} 已存在,不覆盖。当前 {} 首。".format(MI_CODE, before))
        return
    # 仅新增,绝不动其余 80 首
    d[MI_CODE] = mi_entry
    # protocol=3 与原 taixuandict.p 一致(避免无谓的字节编码变动)
    with open(DICT_PATH, "wb") as f:
        pickle.dump(d, f, protocol=3)
    print("[ok] 已加入第33首「密」code={}: {} -> {} 首".format(MI_CODE, before, len(d)))
    # 即刻回读校验
    with open(DICT_PATH, "rb") as f:
        d2 = pickle.load(f)
    assert len(d2) == 81, "期望81首,实得{}".format(len(d2))
    assert MI_CODE in d2
    expected_fields = {"卦", "初一", "次二", "次三", "次四", "次五", "次六", "次七", "次八", "上九"}
    assert set(d2[MI_CODE].keys()) == expected_fields, set(d2[MI_CODE].keys())
    assert list(d2[MI_CODE]["卦"].keys())[0] == "密"
    print("[verify] 81 首齐全,字段完整:")
    print(json.dumps(d2[MI_CODE], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
