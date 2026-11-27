# Security Audit Report — FleetPulse (Cab-Tracking)

**Audit Date:** 2026-11-27  
**Scope:** Full monorepo inspection (`backend/`, `mobile/`, `.github/workflows/`), static analysis, dependency audit (`npm audit`), and automated API/UI regression tests.  
**Disclaimer:** This report reflects technical inspection and automated test results at the time of review. It is **not** a formal security certification or external penetration test.

---

## 1. Architecture Discovered

- **Backend (`backend/`)**: Node.js + Express + TypeScript (`src/app.ts`, `src/server.ts`), Socket.IO real-time gateway (`src/gateway/trackingGateway.ts`), PostgreSQL / `@electric-sql/pglite` (`src/database/`), JWT (`jsonwebtoken`), `bcryptjs`, `zod`, `helmet`, `express-rate-limit`, optional `firebase-admin` FCM push alerts, plus server-rendered HTML portals (`/driver`, `/monitor`, `/privacy-policy`, `/terms-and-conditions`).
- **Mobile (`mobile/`)**: React Native `0.75.4` + TypeScript (`src/`), `react-native-keychain` for OS Keychain/Keystore token storage, `react-native-maps`, `react-native-geolocation-service`, `react-native-background-actions`, `@react-native-community/netinfo`, `socket.io-client`, Android Gradle project (`mobile/android/`).
- **CI/CD (`.github/workflows/android-build.yml`)**: Builds Android release APK & AAB using GitHub Actions Secrets (`API_URL`, `SOCKET_URL`, `GOOGLE_MAPS_API_KEY`, `ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`).

---

## 2. Security Checks & Findings Summary

| ID | Category | Finding & Location | Severity | Status |
|---|---|---|---|---|
| SEC-01 | Secret Management | `backend/src/config/env.ts`: `jwtSecret` fell back to hardcoded dev string even when `NODE_ENV=production`. | **High** | **Fixed** (fails fast in production if `JWT_ACCESS_SECRET` is missing/default) |
| SEC-02 | XSS / Browser Security | `backend/src/monitorPage.ts`: Driver names, vehicle registrations, and pickup/destination addresses rendered via string concatenation into `innerHTML` and Leaflet `.bindPopup()` without HTML escaping. | **Medium** | **Fixed** (`esc()` HTML-escaping helper applied) |
| SEC-03 | Security Headers & CSP | `backend/src/app.ts`: `helmet({ contentSecurityPolicy: false })` disabled CSP and lacked `Permissions-Policy`, `Referrer-Policy`, and `trust proxy` for `express-rate-limit`. | **Medium** | **Fixed** (CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `trust proxy = 1` configured) |
| SEC-04 | Abuse / Brute-Force | `backend/src/app.ts`: `/api/compliance/parental-consent/verify` (6-digit code) lacked strict rate limiting. | **High** | **Fixed** (10 requests per 15 min rate limit added) |
| SEC-05 | Privacy Rights | Missing self-service data export (`GET /api/compliance/my-data`) and account deletion (`DELETE /api/compliance/account`). | **High** | **Fixed** (endpoints + mobile Profile UI buttons added) |
| SEC-06 | Legal Pages | Missing `/terms-and-conditions` and mobile links to legal docs. | **Medium** | **Fixed** (`legalPages.ts` + mobile links) |
| SEC-07 | Dependencies (`npm audit`) | `backend`: 16 vulnerabilities (2 critical: `vitest`/`tinypool` devDeps; 3 high: `vite` devDep, `xlsx` no-fix, `zod` major-bump fix). `mobile`: 8 vulnerabilities (1 high: `image-size` transitive CLI devDep). | **Medium** | **Open / Monitored** (documented; avoid forced breaking major bumps without compatibility testing) |
| SEC-08 | Auth / Brute-Force | No per-account exponential lockout or MFA on `/api/auth/login` beyond IP-based `60 req / 15 min` rate limit. | **Low** | **Open** (recommended for production hardening) |
| SEC-09 | CORS | `CORS_ORIGINS` defaults to `'*'` if unset in environment. | **Medium** | **Config Required** (set explicit `CORS_ORIGINS` in Render env) |

---

## 3. OWASP / Industry Control Mapping (Reference Only)

- **OWASP ASVS 5.0.0 / Top 10**:
  - *A01 Broken Access Control*: `requireAuth` & `requireAdmin` middleware, driver self-scoped `PATCH/GET/POST /drivers/:id`, server-side consent enforcement on login.
  - *A02 Cryptographic Failures*: `bcryptjs` password & OTP hashing, `react-native-keychain` device storage, HMAC-SHA256 unsubscribe tokens, production `JWT_ACCESS_SECRET` enforcement.
  - *A03 Injection*: Parameterized SQL queries (`$1, $2...`) via `pg`/`PGlite`, `zod` request validation, `esc()` HTML escaping in `monitorPage.ts`.
  - *A05 Security Misconfiguration*: Helmet CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy`, `Referrer-Policy`.
- **OWASP MASVS**: Token/credential storage via `react-native-keychain` (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`), `android:usesCleartextTraffic="false"` in `AndroidManifest.xml`, `android:exported="false"` on `RNBackgroundActionsTask`.

---

## 4. Final Audit Summary Table

| Category | Status | Evidence |
|---|---|---|
| Authentication | Pass (with noted Low gap) | `authController.ts` bcryptjs hashing, JWT expiry, consent gating, rate limit (`60/15m`) |
| Authorization | Pass | `requireAuth`, `requireAdmin`, self-scoped driver endpoints, `compliance.test.ts` |
| API security | Pass | `zod` validation, `1mb` JSON limit, parameterized SQL, strict OTP rate limit (`10/15m`) |
| Database security | Pass | Parameterized queries (`$n`), SSL support in `pool.ts`, `001`/`002` migrations |
| Encryption | Pass (in-app) / Needs env check | `bcryptjs`, HMAC-SHA256 tokens, Keychain; TLS terminated by hosting proxy (Render) |
| Dependencies | Needs review | `npm audit`: `backend` 16 (2 crit dev, 3 high), `mobile` 8 (1 high dev); `SBOM.cdx.json` generated |
| Infrastructure | Needs review | `CORS_ORIGINS` & `JWT_ACCESS_SECRET` must be verified in Render/CI env |
| Privacy compliance | Needs legal/OTP setup | DPDP, CIPA guard, CAN-SPAM & GDPR local fonts implemented; requires OTP & SMTP providers |
| Privacy Policy | Pass (placeholders marked) | `/privacy-policy` (`legalPages.ts`) & `PRIVACY_POLICY.md` |
| Terms & Conditions | Pass (placeholders marked) | `/terms-and-conditions` (`legalPages.ts`) & `TERMS_AND_CONDITIONS.md` |
| Mobile security | Pass | `react-native-keychain`, `usesCleartextTraffic="false"`, `analyticsGuard.ts` |
| Backup and recovery | Not tested | Managed PostgreSQL/Render backup & restore drill not executed in this workspace |
