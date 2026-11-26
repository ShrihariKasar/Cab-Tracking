# Simple Cab Live Tracking MVP — Setup & Testing Report

## 1. Database Setup Instructions (PostgreSQL)
1. Start PostgreSQL (via `docker compose up -d postgres` or local PostgreSQL 16).
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` and `JWT_ACCESS_SECRET`.
3. Apply the 5-table MVP schema (`admins`, `drivers`, `vehicles`, `rides`, `driver_locations` + `ride_location_history`):
   ```bash
   cd backend
   npm install
   npm run migrate
   ```
4. Seed initial Admin (`+15550000001`) and Driver (`+15550000002` / `KA-01-AB-1234`):
   ```bash
   npx tsx src/database/seed.ts
   ```

## 2. Google Maps API Configuration
- **Android**: Restrict key in Google Cloud Console by Android package name + SHA-1 fingerprint (`Maps SDK for Android`). Set `GOOGLE_MAPS_API_KEY` in `mobile/android/local.properties` (referenced in `AndroidManifest.xml`).
- **iOS**: Restrict key by iOS Bundle ID (`Maps SDK for iOS`). Provide key in `AppDelegate.mm` (`GMSServices.provideAPIKey`).

## 3. Firebase Cloud Messaging (FCM) Configuration
1. Create a Firebase project and add Android (`google-services.json` -> `mobile/android/app/`) and iOS (`GoogleService-Info.plist` -> `mobile/ios/FleetPulse/`).
2. Generate a Service Account key in Firebase Console and set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in `backend/.env`.
3. Backend sends multicast push notifications (`"Ride Started"`, `"Ride Ended"`) to active admin FCM tokens.

## 4. Testing Report

### Automated Backend Verification (Executed)
- `cd backend && npm run build`: **Passed** (`tsc -p tsconfig.json`, 0 errors).
- `cd backend && npm test` (`vitest run`, mocked `pg` pool and `fcmService`): **5/5 tests passed** in `src/__tests__/mvpApi.test.ts`:
  - Driver login (`POST /api/auth/login`)
  - Admin-only guard on `GET /api/drivers` (403 for drivers)
  - Admin driver list (`GET /api/drivers`)
  - Cross-driver location impersonation block (`POST /api/drivers/:id/location` returns 403)
  - Ride start & end lifecycle (`POST /api/rides/start`, `POST /api/rides/end`)

### Physical Device Checklist (Pending Physical Android & iOS Hardware)
The following 17 scenarios require physical Android and iOS devices (not simulator-only):
- [ ] 1–5: Driver login, profile display, location permission prompt, GPS disabled warning, internet disabled warning
- [ ] 6–10: `START RIDE` tracking, admin ride-start notification, driver list, driver details, live Google Maps marker movement
- [ ] 11–15: Locked-screen background tracking, mobile data OFF (local queue + `"Internet disconnected – location updates paused."`), last captured location retained, mobile data ON (queue sync + live resume)
- [ ] 16–17: `END RIDE` stops tracking and notifies admin
