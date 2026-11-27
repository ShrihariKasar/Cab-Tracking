# User Data Privacy & Cross-User Isolation Audit — FleetPulse (Cab-Tracking)

**Audit Date:** 2026-11-27  
**Scope:** Backend API, PostgreSQL schema & RLS policies, Socket.IO gateway, Mobile session/cache lifecycle, and third-party integrations.  
**Disclaimer:** Automated tests ran against local Express/Socket.IO with mocked `pool.query` and `fcmService`; PostgreSQL RLS DDL (`003_rls_isolation.sql`) was authored and reviewed, and requires execution against a live PostgreSQL instance with a non-superuser role to enforce at the database engine layer.

---

## 1. Access-Control Rules & Endpoint Matrix

| Endpoint / Channel | Auth Required | Role / Ownership Boundary | Sensitive Fields Excluded |
|---|---|---|---|
| `POST /api/auth/login`, `POST /api/auth/register` | No | Server calculates age; blocks login if `consent_status !== 'GRANTED'` or `account_status !== 'ACTIVE'` | `password_hash`, `verification_code_hash` |
| `GET /api/drivers/:id`, `PATCH /api/drivers/:id`, `POST /api/drivers/:id/location` | `requireAuth` | `DRIVER`: strictly `req.user.sub === id` (`403` otherwise); `ADMIN` cannot `PATCH` or `POST` driver location | `password_hash`, `fcm_token`, `date_of_birth` |
| `GET /api/drivers`, `GET /api/drivers/:id/location`, `GET /api/rides/active`, `GET /api/rides/:id/route` | `requireAuth` + `requireAdmin` | `ADMIN` only (`403` for `DRIVER`) | `password_hash`, `fcm_token` |
| `POST /api/rides/start`, `POST /api/rides/end` | `requireAuth` | `DRIVER` only (`403` for `ADMIN`), `driver_id` derived exclusively from `req.user.sub` | — |
| `GET /api/compliance/my-data` | `requireAuth` | Scoped exclusively to `req.user.sub` (ignores injected `userId`/`id` params) | `password_hash`, `verification_code_hash` |
| `DELETE /api/compliance/account` | `requireAuth` | `DRIVER` only (`403` for `ADMIN`); deletes strictly `req.user.sub` | — |
| `POST /api/compliance/marketing/send`, `GET /api/compliance/marketing/suppression` | `requireAuth` + `requireAdmin` | `ADMIN` only (`403` for `DRIVER`) | — |
| Socket.IO (`trackingGateway.ts`) | JWT handshake | `DRIVER` joins `driver:${user.sub}`; `ADMIN` joins `admins`; `driver:location:update` verifies `DRIVER` role + `RIDE_STARTED` + `ACTIVE` + `GRANTED` | Broadcasts only to `admins` room |

---

## 2. Database Tables & Row-Level Security (RLS)

Defined in [001_mvp_schema.sql](file:///s:/GitHub_NEW/Cab-Tracking/backend/src/database/migrations/001_mvp_schema.sql), [002_compliance_schema.sql](file:///s:/GitHub_NEW/Cab-Tracking/backend/src/database/migrations/002_compliance_schema.sql), and [003_rls_isolation.sql](file:///s:/GitHub_NEW/Cab-Tracking/backend/src/database/migrations/003_rls_isolation.sql):

- **Tables with RLS enabled**: `drivers`, `rides`, `driver_locations`, `ride_location_history`, `consent_records`, `privacy_preferences`.
- **Policies**: `SELECT`/`INSERT`/`UPDATE`/`DELETE` scoped to `current_setting('app.current_user_id', true)` and `current_setting('app.current_user_role', true)`.
- **Admin Audit Table**: `admin_audit_logs` created in `003_rls_isolation.sql`.

---

## 3. Caching, Session & External Data Leakage Controls

- **API Cache Headers** ([app.ts](file:///s:/GitHub_NEW/Cab-Tracking/backend/src/app.ts)): Every `/api/*` response sets `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, and `X-Robots-Tag: noindex, nofollow`.
- **Mobile Session & Cache Wipe** ([gpsService.ts](file:///s:/GitHub_NEW/Cab-Tracking/mobile/src/services/gpsService.ts), [AuthContext.tsx](file:///s:/GitHub_NEW/Cab-Tracking/mobile/src/contexts/AuthContext.tsx)): `logout()` now calls `gpsService.resetSessionState()`, `socketManager.disconnect()`, and `clearSession()` (Keychain/Keystore wipe) so User A's in-memory coordinates/queue never persist into User B's session.
- **File Uploads**: No user file upload endpoints or public storage buckets exist in the repository.
- **External Services**: Google Maps / Esri / Leaflet (`unpkg.com`), Nominatim, OSRM, and optional Firebase FCM receive only map/routing coordinates or ride alert metadata—never passwords, JWTs, or OTPs.

---

## 4. Cross-User Isolation Test Results

Executed via `cd backend && npm run build && npm test` and `cd mobile && npm run typecheck && npm test`:
- **Backend Vitest**: **4 test files passed, 20/20 tests passed** (including `src/__tests__/crossUserIsolation.test.ts` — 6/6 tests passed verifying User A vs User B IDOR/BOLA rejection, bulk/admin/route denial, token-scoped data export & deletion, least-privilege admin denial, `private, no-store` headers, and WebSocket channel isolation).
- **Mobile Jest**: **2 test suites passed, 8/8 tests passed** (`analyticsGuard.test.ts` & `responsiveLayout.test.tsx`).

---

## 5. Remaining Risks & Operational Requirements

1. **Database Role & GUC Binding**: In production PostgreSQL, connect as a non-superuser role without `BYPASSRLS` and bind `app.current_user_id` / `app.current_user_role` per transaction if relying on database-layer RLS in addition to application-layer checks.
2. **Per-Admin Granular Permissions**: Currently all `ADMIN` accounts share fleet-wide visibility; if multi-tenant organizations are added later, add an `organization_id` tenant column and scope all admin queries to it.
3. **Admin Audit Log Wiring**: `admin_audit_logs` table is created in `003_rls_isolation.sql`; wire `INSERT INTO admin_audit_logs` into `driverController.getDriverLocation` and `rideController.getRideRoute` if per-view audit trails are mandated by policy.
