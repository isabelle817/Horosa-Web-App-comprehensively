# -*- coding: utf-8 -*-
"""流派 Profile:读 data/profiles.json。切流派=换 Profile,绝不改内核(随机源/排盘投影/赋义读法 全可插拔)。"""
from __future__ import annotations

import json
import os
from typing import Dict

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _load() -> dict:
    with open(os.path.join(_DATA_DIR, "profiles.json"), encoding="utf-8") as f:
        return json.load(f)


_RAW = _load()
PROFILES: Dict[str, dict] = _RAW["profiles"]
DEFAULT_PROFILE = _RAW["default"]


def get_profile(profile_id: str) -> dict:
    return dict(PROFILES.get(profile_id, PROFILES[DEFAULT_PROFILE]))
