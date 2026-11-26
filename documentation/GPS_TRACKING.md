# GPS Tracking & Real-Time Architecture

## 1. End-to-End Flow

```
Driver Mobile App (Foreground / Background / Screen Locked)
   |  Adaptive GPS (3-5s or 10-20m on active trip; reduced when stationary)
   v
Offline Queue (Encrypted/Local Store when offline -> Batch sync on reconnect)
   |  Socket.IO (WSS) + HTTPS fallback (/drivers/location/batch)
   v
Backend Gateway (JWT Verified, Assignment Verified, Server Timestamped)
   +---> Redis (Latest vehicle state: `fleet:vehicle:<vehicleId>`, TTL 15m)
   +---> PostgreSQL + PostGIS (`driver_locations` upsert + `trip_location_history` insert)
   +---> Socket.IO Rooms
            +---> `trip:<tripId>` (Authorized Customer only)
            +---> `admin:fleet` (Authorized Admins only)
```

## 2. Mobile Native Requirements

### Android
- Permissions: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` (Android 10+ two-step prompt with clear rationale), `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS` (Android 13+).
- Foreground Service with persistent notification (`"Active Trip Tracking"`) started only when driver is `ONLINE` on duty or on an active trip, and stopped immediately on trip completion / going `OFFLINE`.

### iOS
- `Info.plist` keys: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes: ["location", "fetch", "remote-notification"]`.
- `allowsBackgroundLocationUpdates = true`, `pausesLocationUpdatesAutomatically = false` during active trips.

> **OS Execution Reality**: Neither Android nor iOS guarantees uninterrupted background execution if the user force-kills the app, revokes permissions, or aggressive OEM battery optimization terminates the process. The app surfaces clear status indicators and detects stale updates on the server.

## 3. Adaptive GPS & Battery Optimization
- **Active Trip (Moving)**: `interval: 4000ms`, `distanceFilter: 15m`, `desiredAccuracy: HIGH`.
- **Stationary** (speed < 0.8 m/s for > 30s): throttle emission to `15000ms` heartbeat.
- **Idle / Offline**: active-trip tracking stopped.

## 4. Stale GPS Detection (Admin & Customer)
- Server attaches `serverTimestamp` to every update.
- If no update is received for `> 45s` on an active trip/online vehicle, Admin Live Fleet Map marks the vehicle as **STALE** and Customer Live Tracking displays `"Last known location (Xs/Xm ago)"` with reconnection status.
