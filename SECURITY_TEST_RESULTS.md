# Security & Compliance Test Results — FleetPulse (Cab-Tracking)

**Execution Date:** 2026-11-27  
**Environment:** Local Windows workspace (`s:\GitHub_NEW\Cab-Tracking`), Vitest (backend with mocked `pool.query` & `fcmService`) and Jest (mobile with mocked RN native modules).

## 1. Backend Build & Vitest Suite
- **Command:** `cd backend && npm run build && npm test`
- **TypeScript (`tsc -p tsconfig.json`):** Exit code `0`
- **Vitest (`vitest run`):** **3 test files passed, 14/14 tests passed**
  - `src/__tests__/mvpApi.test.ts`: 5/5 passed (Auth login, driver list, RBAC, ride start/end)
  - `src/__tests__/liveTrackingSocket.test.ts`: 2/2 passed (Socket.IO JWT auth & live location broadcast)
  - `src/__tests__/compliance.test.ts`: 7/7 passed:
    1. Adult registration (`POST /api/auth/register`) with `GRANTED` consent
    2. Under-18 registration server-side enforcement, login blocking (`403`), and parental OTP verification
    3. Consent withdrawal (`POST /api/compliance/consent/withdraw`) suspending account & ending active rides
    4. Zero Google Fonts CDN URLs in `/driver`, `/monitor`, and `/privacy-policy`
    5. Analytics & session replay disabled by default (`GET /api/compliance/privacy-preferences`)
    6. CAN-SPAM marketing email `List-Unsubscribe` + postal address + unauthenticated unsubscribe + suppression list enforcement
    7. Security headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Permissions-Policy`, `CSP`), `/terms-and-conditions`, XSS `esc()` helper, `GET /api/compliance/my-data`, and `DELETE /api/compliance/account`

## 2. Mobile TypeCheck & Jest Suite
- **Command:** `cd mobile && npm run typecheck && npm test`
- **TypeScript (`tsc --noEmit`):** Exit code `0`
- **Jest (`jest`):** **2 test suites passed, 8/8 tests passed**
  - `src/__tests__/analyticsGuard.test.ts`: 2/2 passed (default-off analytics/replay, excluded auth/profile screens, sensitive field masking)
  - `src/__tests__/responsiveLayout.test.tsx`: 6/6 passed across `320x568`, `360x800`, `375x812`, `390x844`, `414x896`, and `430x932`

## 3. Dependency Vulnerability Scan (`npm audit`)
- **Backend:** 16 vulnerabilities (2 critical devDeps: `vitest`, `tinypool`; 3 high: `vite` devDep, `xlsx` no-fix, `zod` major-bump fix; 11 moderate)
- **Mobile:** 8 vulnerabilities (1 high transitive CLI devDep: `image-size`; 7 low)
- **SBOM:** Generated at `SBOM.cdx.json` (CycloneDX 1.5, 51 direct/dev components across `backend` & `mobile`).
