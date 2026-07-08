# Horosa — Open-Source & Third-Party Notices

**Applies to:** Horosa for Windows (Windows 10 / 11, x64)
**Last updated:** 2026-07-02

---

## 1. The Software's License: AGPL-3.0

Horosa is **free and open-source software**, released under the **GNU Affero General Public License, Version 3 (AGPL-3.0-only).**

Under AGPL-3.0, you have the following freedoms:
- **run** the Software for any purpose;
- **study** how the Software works and **modify** it as needed (provided you can obtain the source code);
- **redistribute** the original Software;
- **redistribute** your modified version — **provided it is likewise open-sourced under AGPL-3.0 and retains the applicable copyright and license notices.**

**Obtaining the source code:** the complete corresponding source code of the Software is publicly available at https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows. The full text of AGPL-3.0 is provided with the Software (see the accompanying `LICENSE` file).

> **Why AGPL?** The Software's high-precision astronomical calculations depend on **Swiss Ephemeris** and **kerykeion**, both licensed under **AGPL-3.0**. Their license requires that software incorporating them also be released under AGPL-3.0. This is the direct reason the Software uses AGPL-3.0.

---

## 2. Open-Source & Free Commitment · Official Channels

- The Software is **open source and free forever.** Versions released through official channels are provided free to end users.
- **If any charge ever occurs, only the Founder personally / official channels may do so;** any charging from non-official sources is unrelated to the Project.
- Because AGPL-3.0 permits anyone to lawfully redistribute (and even charge distribution/service fees), **a redistributed third-party version is not an official version;** its safety and responsibility rest with its publisher. Please obtain the Software **only from official channels** (see the Security Statement).
- The "星阙" / "Horosa" names and logos are reserved by the Project, **not granted by open source**, and must not be used by third parties to impersonate an official version (see Terms of Service, Section 10).

---

## 3. Key Components with Copyleft (AGPL) Obligations

| Component | Use | License |
|---|---|---|
| **Swiss Ephemeris** (via the `pyswisseph` binding) | High-precision planetary/lunar ephemeris, houses, eclipses, declinations, and other underlying astronomical calculations | **AGPL-3.0**; Copyright © Astrodienst AG, Zürich |
| **kerykeion** | Part of the astrology calculations | **AGPL-3.0** |

> The AGPL obligations of these two components determine that the Software as a whole must be open-sourced under AGPL-3.0.

---

## 4. Metaphysical Calculation Engines (Bundled / Vendored Components)

Some of the Software's metaphysical charting features incorporate and adapt the following open-source calculation engines (each retains its original copyright and license notice; the Software keeps its own interface and adapts their output for display). Full information is in the repository's root **`THIRD_PARTY_NOTICES.md`**.

| Component | Use | License |
|---|---|---|
| kintaiyi | Tai Yi calculation | MIT |
| kinjinkou | Jin Kou Jue calculation | MIT |
| kinwangji | Huang Ji Jing Shi calculation | MIT |
| kinwuzhao | Wu Zhao divination calculation | MIT |
| kinastro | Shu Suan / Yan Qin / Seven Governors, etc. calculations | MIT |
| kinqimen | Qi Men Dun Jia calculation | MIT |
| taixuanshifa | Tai Xuan divination calculation | No explicit upstream open-source license (stated as-is) |
| jingjue | Jing Jue calculation | No explicit upstream open-source license (stated as-is) |
| shenyishu | Shen Yi Shu calculation | No explicit upstream open-source license (stated as-is) |
| **flatlib** (maintained fork) | Traditional / Hellenistic astrology calculation | MIT; Copyright © João Ventura and contributors |

---

## 5. Astronomical Data

| Data | Use | License / Source |
|---|---|---|
| **d3-celestial**-derived data | Constellation lines, IAU constellation boundaries, and Three Enclosures walls for the planetarium 3D celestial sphere | BSD 3-Clause; Copyright © 2015 Olaf Frohn. The data has been reshaped into the Software's own JSON structure |

---

## 6. Major Third-Party Libraries

The following are the major open-source libraries used by the Software (versions may change with releases; refer to the notices shipped with the Software). Each library's copyright belongs to its respective authors.

**Front end**
| Library | License |
|---|---|
| React / React-DOM (17.x) | MIT |
| UmiJS (^3.5) | MIT |
| Ant Design (antd) | MIT |
| dva | MIT |
| Babylon.js (^7) | Apache-2.0 |
| D3 (^7) | ISC / BSD |
| ECharts (^6) | Apache-2.0 |
| marked (^4) | MIT |
| DOMPurify (^2) | Apache-2.0 / MPL-2.0 (dual) |
| lunar-javascript (^1) | MIT |
| react-quill | MIT |

**Back end / computation runtime (Python)**
| Library | License |
|---|---|
| CherryPy | BSD |
| NumPy | BSD |
| cn2an | MIT |
| cnlunar | MIT |
| sxtwl | Per its upstream declaration |
| jsonpickle | BSD |
| python-dateutil | Apache-2.0 / BSD (dual) |

> Note: this list covers the major components and may not include every transitive dependency. The authoritative license text of each component is the file shipped with it and the corresponding notice in the repository.

---

## 7. Trademark Note

The names and trademarks of the third-party projects, libraries, and datasets listed above belong to their respective owners and are used here solely to **identify the source truthfully and accurately** (nominative use); this does not imply those owners' endorsement of the Software.

---

## 8. Full Notices and Contact

- The complete third-party notices are in the repository root **`THIRD_PARTY_NOTICES.md`**;
- The full text of AGPL-3.0 is in the accompanying `LICENSE` file;
- If you believe this statement contains an omission or an attribution/license detail that needs correction, please contact us via the Issues page of the official repository (https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/issues) and we will verify and correct it promptly.
