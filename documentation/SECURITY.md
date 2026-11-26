# Security Architecture

## 1. Authentication & Token Lifecycle
- **Mobile (Customer & Driver)**: 6-digit OTP sent via SMS provider (or dev-only log in local `NODE_ENV=development`), stored hashed with SHA-256 + expiry (5 minutes), max 5 verification attempts per OTP, rate-limited per phone & IP.
- **Admin**: Email + Argon2/bcrypt password hash + RBAC role verification.
- **Tokens**:
  - Access Token: Short-lived JWT (15m) signed with `JWT_ACCESS_SECRET`.
  - Refresh Token: Opaque/JWT token rotated on every use; reuse of a rotated token revokes the entire token family.
- **Mobile Storage**: Tokens stored exclusively in iOS Keychain / Android Keystore via `react-native-keychain` (never `AsyncStorage`).

## 2. Authorization & Anti-IDOR Controls
- Every `/bookings/:id` and `/trips/:id` endpoint verifies `customer_id === req.user.customerId` (for Customers), `driver_id === req.user.driverId` (for Drivers), or Admin RBAC permission.
- Socket.IO `trip:subscribe` validates trip ownership/assignment in PostgreSQL before joining `trip:<tripId>`.
- Driver GPS updates (`driver:location:update`) verify that `socket.user.driverId` matches the `driverId` and is currently assigned to the specified `tripId` (if provided).
- Drivers cannot approve their own accounts or modify verified `driver_documents`.

## 3. API & Transport Hardening
- `helmet` security headers, strict CORS allowlist (`CORS_ORIGINS`), `express-rate-limit` on auth and write routes.
- Input validation using `zod` schemas on all REST and Socket.IO payloads.
- Parameterized SQL queries via `pg` (zero string interpolation in SQL).
- Immutable `audit_logs` for admin actions, role changes, assignments, and account deletions.
- Google Maps API keys restricted by platform (Android package + SHA-1, iOS bundle ID, HTTP referrer for Admin, IP for Backend Directions/Geocoding) and never committed to source control.
