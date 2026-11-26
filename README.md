# FleetPulse — Cab Live Tracking Application

Corporate cab live GPS tracking application built with **React Native + TypeScript** (shared Driver & Admin mobile app), **Node.js + Express + Socket.IO**, **PostgreSQL**, and **Firebase Cloud Messaging**.

## Monorepo Structure

- `mobile/` — Shared React Native + TypeScript app (Driver & Admin roles, background GPS tracking, offline queue, Keychain/Keystore token storage, Google Maps)
- `backend/` — Node.js + Express + TypeScript REST API, Socket.IO real-time tracking gateway, PostgreSQL schema & migrations, FCM push alerts
- `screenshots/` — Mobile UI screenshots verified across `375×812` and `320×568` viewports
- `documentation/` — Setup, database, GPS tracking, security, and testing documentation

## Mobile App Screenshots

### Authentication & Driver App (`375×812`)

| Login | Driver Home & Map | Driver Profile |
| :---: | :---: | :---: |
| <img src="screenshots/login.png" width="240" alt="Login Screen" /> | <img src="screenshots/driver-dashboard.png" width="240" alt="Driver Dashboard" /> | <img src="screenshots/driver-profile.png" width="240" alt="Driver Profile" /> |

### Admin Fleet & Live Tracking (`375×812`)

| Fleet & Driver List | Active Rides | Driver Details |
| :---: | :---: | :---: |
| <img src="screenshots/admin-drivers.png" width="240" alt="Admin Drivers" /> | <img src="screenshots/admin-active-rides.png" width="240" alt="Admin Active Rides" /> | <img src="screenshots/admin-driver-details.png" width="240" alt="Admin Driver Details" /> |

| Live Tracking Map | Admin Profile |
| :---: | :---: |
| <img src="screenshots/admin-live-map.png" width="240" alt="Admin Live Map" /> | <img src="screenshots/admin-profile.png" width="240" alt="Admin Profile" /> |

### Small-Device Responsive Verification (`320×568`)

| Driver Home (`320×568`) | Fleet List (`320×568`) | Live Map (`320×568`) |
| :---: | :---: | :---: |
| <img src="screenshots/driver-dashboard-320x568.png" width="210" alt="Driver Dashboard 320x568" /> | <img src="screenshots/admin-drivers-320x568.png" width="210" alt="Admin Drivers 320x568" /> | <img src="screenshots/admin-live-map-320x568.png" width="210" alt="Admin Live Map 320x568" /> |

## Documentation

- [MVP Setup & Testing Report](documentation/MVP_SETUP_AND_TESTING_REPORT.md)
- [API Documentation](documentation/API_DOCUMENTATION.md)
- [Database Schema](documentation/DATABASE_SCHEMA.md)
- [GPS Tracking Architecture](documentation/GPS_TRACKING.md)
- [Security Architecture](documentation/SECURITY.md)
- [Deployment & Release Checklist](documentation/DEPLOYMENT.md)
