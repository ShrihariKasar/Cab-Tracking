# Google Play Store & Production Release Guide

## 1. Deploy Backend to Production (Render — 1-Click Blueprint)
1. Push your repo to GitHub (already done).
2. Go to [render.com](https://render.com) -> **New +** -> **Blueprint** -> select `ShrihariKasar/Cab-Tracking`.
3. Render automatically reads `render.yaml`, creates `fleetpulse-db` (PostgreSQL) and `fleetpulse-backend`, runs `npm run migrate`, and gives you a permanent HTTPS URL: `https://fleetpulse-backend.onrender.com`.
4. (Optional) Seed initial accounts in Render Shell:
   ```bash
   npx tsx src/database/seed.ts
   ```
5. Privacy Policy URL for Play Console: `https://fleetpulse-backend.onrender.com/privacy-policy`.

## 2. Configure Mobile App for Production
1. Copy `mobile/.env.example` to `mobile/.env`:
   ```env
   API_URL=https://fleetpulse-backend.onrender.com/api
   SOCKET_URL=https://fleetpulse-backend.onrender.com
   GOOGLE_MAPS_API_KEY=YOUR_ANDROID_RESTRICTED_MAPS_KEY
   ```
2. Add `GOOGLE_MAPS_API_KEY=YOUR_ANDROID_RESTRICTED_MAPS_KEY` to `mobile/android/local.properties`.
3. Download `google-services.json` from Firebase Console and place it in `mobile/android/app/google-services.json`.

## 3. Generate Release Keystore (One-Time)
```powershell
cd mobile\android\app
keytool -genkeypair -v -storetype PKCS12 -keystore fleetpulse-release.keystore -alias fleetpulse -keyalg RSA -keysize 2048 -validity 10000
```
Create `mobile/android/keystore.properties` (gitignored):
```properties
MYAPP_UPLOAD_STORE_FILE=fleetpulse-release.keystore
MYAPP_UPLOAD_KEY_ALIAS=fleetpulse
MYAPP_UPLOAD_STORE_PASSWORD=YOUR_STORE_PASSWORD
MYAPP_UPLOAD_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

## 4. Build Installable APK & Play Store AAB
- **Installable APK (for direct phone testing):**
  ```powershell
  cd mobile\android
  .\gradlew assembleRelease
  ```
  APK output: `mobile\android\app\build\outputs\apk\release\app-release.apk`
- **Google Play Store App Bundle (`.aab`):**
  ```powershell
  cd mobile\android
  .\gradlew bundleRelease
  ```
  AAB output: `mobile\android\app\build\outputs\bundle\release\app-release.aab`

## 5. Google Play Console Checklist
1. **App Content -> Privacy Policy:** Set `https://<your-backend-domain>/privacy-policy`.
2. **App Content -> Sensitive Permissions (`ACCESS_BACKGROUND_LOCATION` & `FOREGROUND_SERVICE_LOCATION`):**
   - Explain: *"Drivers share live GPS coordinates with company dispatchers during active rides, including when the screen is locked."*
   - Upload a short unlisted YouTube video showing the Driver opening the app, seeing the in-app location disclosure, tapping **START RIDE**, locking the screen, and the Admin seeing the live marker.
3. **App Content -> Data Safety:** Declare collection of Approximate/Precise Location, Phone Number, Name, and Account Deletion support, encrypted in transit (`HTTPS`/`WSS`).
4. **Store Listing:** Upload `512×512` icon, `1024×500` feature graphic, and screenshots from `/screenshots`.
5. **Testing Track:** Upload `app-release.aab` to **Internal Testing** -> **Closed Testing** -> **Production**.
