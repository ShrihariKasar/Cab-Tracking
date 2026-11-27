# Privacy Compliance Report — FleetPulse (Cab-Tracking)

**Review Date:** 2026-11-27  
**Disclaimer:** This report documents technical privacy controls implemented in the repository. It does **not** constitute legal advice or legal certification.

---

## 1. Jurisdiction Applicability Matrix

| Jurisdiction / Law | Applicability | Rationale | Implemented Controls & Gaps |
|---|---|---|---|
| **India — DPDP Act, 2023** | **Applicable** | Application targets Indian cab operations (field tests & Nominatim/OSRM routes in India) and collects driver identity + GPS data. | Server-side DOB age calculation, under-18 verifiable parental consent workflow (`consent_records`), login blocked until verified, consent withdrawal (`POST /api/compliance/consent/withdraw`), data export & account deletion. **Gap:** Production SMS/email OTP gateway required to deliver parental verification code. |
| **EU / EEA — GDPR & ePrivacy** | **Potentially Applicable** (if EU/EEA admins or drivers use web/mobile) | Web portals (`/driver`, `/monitor`) and mobile app process IP addresses & personal data. | Zero Google Fonts (`fonts.googleapis.com`/`fonts.gstatic.com` absent); local `system-ui` font stack; opt-in privacy preferences (`analyticsConsent: false` default); data export & deletion endpoints. **Gap:** `monitorPage.ts` loads Leaflet from `unpkg.com` and tiles from `arcgisonline.com`, disclosing IP addresses; self-host for strict GDPR. |
| **UK — UK GDPR & PECR** | **Potentially Applicable** (mirroring EU GDPR) | Same technical posture as EU/EEA. | Same controls and `unpkg.com`/tile CDN note as EU GDPR. |
| **USA (California) — CCPA/CPRA & CIPA** | **Potentially Applicable** | Web/mobile portals if accessed by California residents. | Zero third-party session replay/analytics SDKs present; `analyticsGuard.ts` & web privacy controls disable analytics/replay by default, mask sensitive fields, and exclude auth/profile screens from replay. |
| **USA (Federal) — CAN-SPAM Act** | **Applicable if sending promotional emails** | Commercial/promotional email capability. | `marketingEmailService.ts` separates `MARKETING` vs `TRANSACTIONAL`, embeds sender identity, postal address, `List-Unsubscribe` header, one-click unauthenticated `/api/compliance/unsubscribe`, and `marketing_email_suppressions` list. **Gap:** External SMTP/ESP credentials not configured; `COMPANY_POSTAL_ADDRESS` must be set to verified physical address. |
| **USA — HIPAA / GLBA** | **Not Applicable** | No Protected Health Information (PHI) or covered consumer financial products are collected or processed. | N/A |
| **Brazil LGPD, Canada PIPEDA, Australia Privacy Act, Singapore PDPA, UAE/Saudi PDPL, Japan APPI, South Korea PIPA, South Africa POPIA** | **Requires Legal Confirmation** | Only applicable if the operator markets or deploys FleetPulse to users/drivers in those jurisdictions. | Core transparency, consent, access, and erasure primitives are in place; local DPO/representative/cross-border filings require counsel review if expanding to these regions. |

---

## 2. Cookies & Tracking Audit

- **Cookies**: No tracking or advertising cookies are set by the backend or mobile app.
- **Third-Party Trackers / Replay**: None found (no Clarity, Hotjar, FullStory, LogRocket, Google Analytics, Mixpanel, or Sentry).
- **Fonts**: Zero Google Fonts CDN requests; pure local `system-ui` font stack.
