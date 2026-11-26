# Deployment & Release Checklist

## 1. Environment Variables
- Copy `backend/.env.example` -> `backend/.env`
- Copy `admin/.env.example` -> `admin/.env`
- Copy `mobile/.env.example` -> `mobile/.env`
- Never commit `.env` files or keystores.

## 2. Database & Infrastructure Setup
1. Start PostgreSQL + PostGIS and Redis:
   ```bash
   docker compose up -d
   ```
2. Run SQL migrations in `backend/src/database/migrations/`:
   ```bash
   cd backend && npm run migrate
   ```

## 3. Backend Deployment
1. `cd backend && npm ci && npm run build`
2. Run `npm test` to verify unit & integration suite.
3. Start with `NODE_ENV=production node dist/server.js` behind TLS reverse proxy (Nginx / ALB) with WebSocket upgrade support.

## 4. Admin Dashboard Deployment
1. `cd admin && npm ci && npm run build`
2. Serve `admin/dist/` via CDN / Nginx with `VITE_API_URL`, `VITE_SOCKET_URL`, and referrer-restricted `VITE_GOOGLE_MAPS_API_KEY`.

## 5. Mobile Release Preparation
- **Android**: Configure `android/app/build.gradle` signingConfigs, set `GOOGLE_MAPS_API_KEY` in `local.properties` / manifest placeholder, build release AAB: `./gradlew bundleRelease`.
- **iOS**: Configure Signing & Capabilities (`Background Modes: Location updates, Remote notifications`), install pods (`cd ios && pod install`), archive via Xcode.

## 6. Pre-Release Verification Checklist
- [ ] Physical Android & iOS device test: screen locked + minimized background tracking
- [ ] Network drop & offline GPS queue batch sync verified
- [ ] Cross-customer tracking isolation verified (IDOR test)
- [ ] Google Maps API key restrictions & billing alerts enabled
- [ ] TLS/HTTPS & WSS enabled in production
