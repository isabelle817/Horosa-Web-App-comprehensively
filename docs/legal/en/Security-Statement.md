# Horosa — Security Statement

**Applies to:** Horosa for Windows (Windows 10 / 11, x64)
**Last updated:** 2026-07-02

This statement describes Horosa's security design, our commitments, and the self-protection measures you can take.

---

## 1. Security Design Overview

### 1.1 Local-first, reduced attack surface
The Software performs charting, prediction, and rendering **locally** on your device, and chart data **stays on your machine** by default. Because data is not uploaded, transmission-side and server-side leakage risks are fundamentally reduced.

### 1.2 Local service binds the loopback address only
The Software's built-in local computation service **binds only to the loopback address `127.0.0.1`** and is **accessible only to processes on your own machine, not exposed to the LAN or the public internet.** Other devices cannot reach your local service over the network.

### 1.3 Installer integrity and update verification
The Windows installer is currently **not Authenticode code-signed**, so Windows SmartScreen may show "Windows protected your PC" on first run — that message only reflects the absence of a commercial code-signing certificate, not that the content is unsafe. Verify integrity through these mechanisms instead:

- every release ships a **`SHA256SUMS.txt`** checksum manifest: compare your download's SHA256 hash against the official manifest before installing;
- **in-app auto-update is fail-closed** ("no verification, no install"): the update metadata (`latest.yml`) carries the installer's sha512, and a separate **Ed25519 signature file (`horosa-update.sig`)** binds the version number and the installer hash together, verified offline against a public key embedded in the app — if any check fails, the update is refused and you are asked to verify manually;
- updates are distributed only over the **HTTPS channel of GitHub Releases**.

If your downloaded installer's hash does not match the official `SHA256SUMS.txt`, **do not install** — this likely means you obtained a version that is not official, complete, and untampered (see Section 4).

### 1.4 Transport encryption
- Communication with the built-in local service occurs within the machine's loopback; the application applies encryption to the relevant request content.
- All optional outbound network requests (update checks, AI analysis, maps) go over **HTTPS/TLS** encrypted channels (the specific encryption for the AI service is provided by the provider you choose).

### 1.5 No telemetry, no backdoors
The Software contains **no** telemetry, beacons, ads, or behavioral-tracking components and **does not** covertly collect or upload your data in the background. The Software is **AGPL-3.0 open source**, so its behavior can be verified by anyone reviewing the source code.

---

## 2. Security of Your Keys and Sensitive Data

2.1 **AI API keys are stored locally.** The third-party API key you configure for AI analysis is stored in your device's local storage. Please note:
- **do not** save your API key on public or shared computers;
- if the device may be accessed by others, use system-level protection (login password, disk encryption);
- if you suspect a key is compromised, **revoke and rotate the key** at the corresponding model provider immediately;
- when you stop using a service, you can delete its AI configuration within the Software.

2.2 **Charts and other sensitive information.** Birth information is sensitive personal information. Using AI analysis sends it to the third party you choose — choose your provider carefully and note its data policy.

---

## 3. Update Security

- Software updates come from the **official GitHub Releases** and are verified before installing via both sha512 and an Ed25519 signature (no verification, no install).
- Downloading and installing updates is conditioned on **your confirmation.**
- Obtain updates only through the Software's update mechanism or official channels; **do not** download so-called "update packages" from non-official links.

---

## 4. Download Only from Official Channels · Anti-Counterfeiting & Anti-Fraud

> ⚠️ **This is the single most important thing for your safety.**

- The Software is **free forever**; please download it **only from official channels**: https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases.
- Be wary of any non-official **"paid version," "membership version," "cracked version," "localized version," "accelerated download," "download/install-for-you," or "top-up service"** — these **may contain malware, steal information, or perpetrate fraud.** The Project cannot guarantee their safety and is not responsible for any resulting loss.
- Because the Software is AGPL-3.0 open source, others have the lawful right to redistribute it, but **no third-party version is an official version;** its safety is the responsibility of its publisher. **Only versions from official channels carry the Project's security commitments.**
- **If charging ever occurs, only the Founder personally / official channels are entitled to charge.** Any charging in the name of the Software from other sources is not official — do not pay, and do not provide sensitive personal information or payment credentials.

---

## 5. Self-Protection Measures You Can Take

- Keep **Windows and the Software up to date**;
- Enable **BitLocker disk encryption** and set a strong password for your system account;
- Do not save charts and AI keys on devices others can freely access;
- Before using AI analysis, confirm that you trust the model provider you chose;
- Download from official channels and compare your installer's hash against the official `SHA256SUMS.txt`.

---

## 6. Vulnerability Reporting (Responsible Disclosure)

We welcome security researchers and users to report potential security issues.

- **How to report:** please report privately via **GitHub Security Advisories** on the official repository; if unavailable, leave a note on the Issues page requesting a private channel (do not disclose vulnerability details in a public issue).
- **Please include:** the affected version, reproduction steps, an impact assessment, and (if possible) a suggested fix.
- **Please disclose responsibly:** do **not** publicly disclose vulnerability details until we have had a reasonable time to fix them; do not exploit a vulnerability to access, modify, or damage data that is not your own.
- **Our commitment:** we will acknowledge receipt as soon as possible, assess it, fix it within a reasonable time, and, with your consent, credit your contribution.

> 📌 Note: The Project is currently primarily community/individual in nature and does not offer a paid bug bounty; we nonetheless take every responsible report seriously.

---

## 7. Contact Us

- Security reports: GitHub Security Advisories / the Issues page of the official repository (https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/issues)
- Official channels: https://github.com/Horace-Maxwell/Horosa-Web-App-comprehensively-improved-Windows/releases
