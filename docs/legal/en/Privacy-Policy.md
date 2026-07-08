# Horosa — Privacy Policy

**Applies to:** Horosa for Windows (Windows 10 / 11, x64)
**Last updated:** 2026-07-02

> **One-minute plain-language summary (informal, for understanding only)**
> - Your **charts, cases, preferences, and AI keys stay only on your own computer.** We cannot see them and do not upload them.
> - The Software has **no telemetry, no analytics beacons, no ads, and no behavioral-tracking SDKs.**
> - Core charting works **fully offline.** Only three things go online, and all are triggered or controlled by you: **update checks (GitHub)**, **AI analysis (sent to the model you configure)**, and **map-based geocoding (AutoNavi / Amap)**.
> - When you use AI analysis, your chart text is sent to the third-party model you choose — please be aware and choose carefully.

---

## 1. Who We Are (Data Handler)

This policy is published by the **Horosa open-source project** (the "Project," "we," "us"). For data processing under this policy, you can reach us at:

- Contact: the Issues page of the official repository (https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/issues)
- Official channels: https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases

> 📌 Note: The Project currently operates under a project name / pseudonym. If your jurisdiction (e.g., the EU under GDPR) requires an identifiable data controller and contact, please reach us via the email above; we will cooperate to a reasonable extent.

---

## 2. Our Privacy Principles

- **Local-first:** your core data is stored only on your device by default.
- **Data minimization:** we process only the data necessary to provide functionality.
- **Zero tracking:** we use no third-party analytics, telemetry, beacons, or advertising trackers.
- **Transparent and controllable:** networking behavior is clearly listed; optional features are enabled by you.

---

## 3. What We Do **Not** Collect or Upload

- We do **not** collect your **account information** on a server in order to use the desktop app's core functionality — **the desktop app requires no registration or login** to use local charting and other core features.
- We do **not** collect your usage behavior, clicks, dwell time, or other **telemetry/statistics.**
- We do **not** embed any **advertising, third-party analytics, or tracking SDK.**
- We do **not** proactively upload your charts, cases, or analysis results to any server controlled by the Project.

> If the Software later offers **optional** online account / cloud-sync features, their data processing will be separately disclosed and consented to before enablement, and this policy will be updated accordingly.

---

## 4. Data Stored Locally on Your Device

The following data is stored in your device's local application storage (such as browser-style local storage `localStorage`, the application support directory, and local log files) and is **owned and controlled by you**:

| Category | Examples | Notes |
|---|---|---|
| Chart / natal data | Name or alias, birth date, birth time, birthplace, latitude/longitude, gender | Used for chart computation; **may contain sensitive personal information** (see Section 7) |
| Divination / case records | Liu Yao, Qi Men, Liu Ren, etc. casting records | Records you save |
| Preferences and settings | Theme, chart style, algorithm options, etc. | Remember your habits |
| AI service configuration | The third-party model service URL, model, and **API key** you enter | Used for AI analysis; stored locally only, see Section 6.2 |
| Local logs | Startup and runtime diagnostic logs | Written only to local files for self-diagnosis; **not auto-reported** |

**This data resides on your device and we cannot access it.** You may delete records within the Software at any time, or remove them by uninstalling the Software / clearing application data (see Section 9).

---

## 5. Networked Features and Outbound Data (Factual List)

On the **desktop version**, the Software goes online only in the following three situations. Other legacy domains that may appear in the source code are **not called** in the desktop version.

### 5.1 Software Update Check (default, controllable)
- **Purpose:** check for a new version and (after your confirmation) download the installer.
- **Recipient:** GitHub (`github.com` / `api.github.com`), operated by GitHub.
- **Data transmitted:** a version-query request. As with any network request, this exposes your **IP address** and standard request metadata to GitHub. **We do not thereby obtain your identity or chart data.**
- **Third-party policy:** subject to GitHub's privacy policy.
- **Controllability:** checking is initiated by you manually via the "Check for Updates" menu item — the Software performs **no scheduled background checks**; downloading and installing updates is conditioned on your confirmation. (Connections to GitHub also occur when first installing, repairing, or updating local components.)

### 5.2 AI Analysis (optional, you trigger it and supply your own key)
- **Purpose:** send the chart/divination content you select to a large language model to generate an analysis.
- **Recipient:** **the third-party model service you configure** — possibly a provider's official API (whose servers may be located **outside your country/region**), or your self-hosted/local model.
- **Data transmitted:** the **chart/divination snapshot text** of the technique(s) you select (which may include birth date, time, and place) plus your analysis instructions; authenticated with **your own API key.**
- **Important:** once enabled, the relevant data **leaves your device**, is sent to the third party you chose, and is **subject to that third party's terms and privacy policy.** Choose your provider carefully and handle sensitive information with care.
- **Cross-border transfer:** if your chosen model's servers are outside your country/region, a **cross-border transfer** occurs (see Section 8).

### 5.3 Map & Geocoding Selection (optional, loaded only when you open it)
- **Purpose:** help you search for a location and obtain its latitude/longitude when selecting a birthplace/location.
- **Recipient:** **AutoNavi / Amap (Alibaba)** (built-in map API).
- **Data transmitted:** map-interaction and location-search requests (e.g., the place name you enter, map-browsing requests).
- **Third-party policy:** subject to the terms and privacy policy of AutoNavi / Amap / Alibaba.
- **Controllability:** loaded only when you open the location/geocoding feature; you may also enter latitude/longitude manually without using map search.

> **The Software does not send any data beyond the above to servers controlled by the Project; the Project does not operate a backend for collecting user data.**

---

## 6. Special Note: AI API Keys and Sensitive Data

6.1 **API keys are stored locally only.** The third-party API key you enter for AI analysis is stored in your device's local storage and is used to make requests directly to the model service you chose. **Do not save keys on public or shared devices,** and keep them safe (see the Security Statement).

6.2 **Charts are sensitive information.** Birth date, time, and place may constitute **sensitive personal information.** When you use AI analysis, this information is sent to the third-party model along with the snapshot text. **Whether to send it, and to whom, is entirely your decision.**

---

## 7. Children's and Minors' Privacy

The Software contains divination content and is designed for adults. We do not knowingly collect the personal information of minors. Minors should use the Software only with a guardian's knowledge, consent, and guidance. If a guardian discovers that a minor has used the Software's networked features without consent, please contact us via Section 1.

---

## 8. Cross-Border Data Transfers

The Software is distributed globally. **Local data is not transferred across borders.** Cross-border transfers may occur only when you **actively use** networked features:
- **AI analysis:** if your chosen model's servers are outside your country/region, the analysis data you input is transferred to an overseas recipient;
- **Update check / map:** the corresponding requests go to GitHub / AutoNavi servers.

The above transfers are **triggered by you** and are **subject to the applicable compliance mechanisms of the respective third parties.** In jurisdictions that require separate consent, enabling such features is deemed your awareness of and consent to the corresponding cross-border transfer. If you do not wish such transfers to occur, do not enable the relevant optional features, or choose a local/in-region alternative (e.g., a locally hosted model).

---

## 9. Your Rights and How to Exercise Them

Because your data is stored primarily **locally on your own device,** you can exercise control over it **directly and immediately**:

- **Access / view:** view your saved charts, cases, and settings within the Software.
- **Rectify:** edit the relevant records within the Software.
- **Delete:** delete records within the Software; or uninstall the Software / clear local application data to remove them completely.
- **Portability:** obtain your data via the Software's export features.
- **Withdraw consent:** stop using the relevant optional networked feature (e.g., stop using AI analysis) to withdraw the corresponding processing.

Depending on your jurisdiction, you may also have the following rights, which we will respect and support to the applicable extent:

- **China PIPL:** rights to be informed, to decide, to access, to copy, to rectify, to delete, to deregister, to request an explanation of processing rules, and rights related to automated decision-making, among others.
- **EU GDPR:** rights of access, rectification, erasure ("right to be forgotten"), restriction of processing, data portability, objection, and to lodge a complaint with a supervisory authority, among others.
- **California (CCPA/CPRA):** rights to know, delete, correct, and to "not sell/share personal information" — **note: the Project does not sell or share your personal information.**

For assistance with matters you cannot complete locally, or to lodge a complaint, contact us via Section 1. We will respond within the period required by applicable law. You also have the right to complain to your local data-protection authority.

---

## 10. Data Security

We reduce data risk through a "local-first, minimized, no-upload" design, and we publish SHA256 checksum manifests for releases and verify in-app updates via sha512 plus an Ed25519 signature to ensure integrity. Security measures are detailed in the accompanying **Security Statement.** Note: the security of local data also depends on the security of your own device (e.g., system updates, disk encryption, account password).

---

## 11. Changes to This Policy

We may update this policy from time to time; the updated version will be published through official channels with a "Last updated" date. For material changes, we will provide notice by reasonable means. Please check periodically for the latest version.

---

## 12. Contact Us

- Contact: the Issues page of the official repository (https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/issues)
- Official channels: https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases
