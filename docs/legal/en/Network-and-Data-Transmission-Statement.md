# Horosa — Network & Data Transmission Statement

**Applies to:** Horosa for Windows (Windows 10 / 11, x64)
**Last updated:** 2026-07-02

For the sake of transparency, this statement fully lists **all networking behavior** of Horosa's desktop version — who it connects to, why, what it sends, and whether it is optional. It supplements and refines the Privacy Policy.

---

## 1. Bottom Line

- **The Software's core functionality works fully offline.** Charting, prediction, rendering, and the saving and viewing of charts/cases are all performed **locally** on your device, with no network required.
- The Software goes online **only in three situations**, all triggered by or under your control: **① update checks, ② AI analysis, ③ map-based location selection.**
- The Software **does not** send your charts, cases, or analysis results to any server controlled by the Project; **the Project does not operate a backend for collecting user data.**

---

## 2. Local Communication (Stays on Your Machine)

The Software consists of a front-end interface and a built-in local computation service. The two communicate over the machine's **loopback address `127.0.0.1`**:

- the local service **binds only to `127.0.0.1`** and **accepts only local-process access,** not exposed to the LAN or the public internet;
- charting/prediction inputs and results flow within your machine and **do not traverse the internet;**
- the relevant request content is encrypted in transit.

---

## 3. Outbound Network Request List

| # | Feature | Trigger | Recipient | Data transmitted | Optional |
|---|---|---|---|---|---|
| 1 | Check/download updates | **Only when you manually click "Check for Updates"**; plus downloads when installing/repairing/updating local components | GitHub (`github.com`, `api.github.com`) | Version query; standard requests when downloading the installer (includes your IP) | Checking is initiated manually by you; download & install require your confirmation |
| 2 | AI analysis | You enable it and start an analysis | The **third-party model service you configure** (a provider's official API, or your self-hosted/local model) | The **snapshot text** of the technique(s) you select + analysis instructions; authenticated with **your key** | **Fully optional**; nothing is sent if unused |
| 3 | Map location selection | When you open "select location/coordinates" | AutoNavi / Amap (Alibaba) | Map-interaction and location-search requests | **Optional**; can be replaced by entering coordinates manually |

> Other legacy domains that may appear in the source code (e.g., early online-version / streaming addresses) are **not called in the desktop version.**

### 3.1 Update Check (see §3, row #1)
Updates let you promptly receive fixes and new features. The Software **checks GitHub for an update once at each launch** (silent when there is nothing new or on error; you can also check manually from the menu). The check is an ordinary HTTPS request which — as with any networking operation — exposes your IP to the other side; this process **does not involve** your chart or identity data. **Downloading and installing an update always requires your confirmation** — nothing is downloaded in the background. Releases ship a SHA256 checksum manifest, and in-app updates are verified via both sha512 and an Ed25519 signature before installing (no verification, no install).

### 3.2 AI Analysis (see §3, row #2)
This is the **only** feature that sends your chart-related content externally, and it is **entirely under your control**:
- you choose the provider, enter your own key, and decide whether to start an analysis;
- data is sent to the recipient **you chose** and is **subject to that third party's terms and privacy policy;**
- if the recipient's servers are overseas, a **cross-border transfer** occurs (see Privacy Policy, Section 8);
- if you never use AI analysis, no chart data leaves your device. You may also choose a **locally hosted model** so data never leaves your machine.

### 3.3 Map Location Selection (see §3, row #3)
The AutoNavi / Amap API is loaded only when you use location/geocoding search. If you prefer not to use this third-party map, you can **enter latitude/longitude manually** to complete a chart.

---

## 4. What the Software Does Not Do

- Does **not** upload your charts, cases, or analysis results to a Project server;
- Does **not** collect usage behavior, statistics, or telemetry;
- Does **not** embed ads or third-party tracking SDKs;
- Does **not** covertly establish network connections you did not expect;
- Does **not** connect to legacy domains left in the source but unused by the desktop version.

All of the above can be verified by anyone reviewing the Software's open-source code.

---

## 5. How to Reduce Networking Further

- For AI analysis, choose a **local/self-hosted model** so data does not leave your network;
- Use **manual coordinate entry** instead of map search;
- Update checks are already manual-only (no background auto-checking), so no extra switch is needed;
- If needed, use Windows Firewall (outbound rules) to restrict the Software's outbound connections (this may affect updates and AI features).

---

## 6. Contact Us

- Contact: the Issues page of the official repository (https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/issues)
- Official channels: https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases
