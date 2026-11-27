# Data Flow & Data Inventory — FleetPulse (Cab-Tracking)

## 1. Personal Information Inventory

| Data Element | Source | Purpose | Storage Location | Who Can Access | Third-Party Recipients | Retention | Encryption |
|---|---|---|---|---|---|---|---|
| `full_name`, `mobile_number`, `date_of_birth` | Registration / Seed | Account identity, login, DPDP age verification | PostgreSQL `drivers` / `admins` | Driver (self), Fleet Admin | None | Until account deletion (`DELETE /api/compliance/account`) | TLS in transit (HTTPS) |
| `password_hash` | Login / Registration | Authentication | PostgreSQL `drivers` / `admins` | Backend auth service only (never returned) | None | Until account deletion | `bcryptjs` salted hash |
| `parent_name`, `parent_contact`, `verification_code_hash` | Under-18 Registration | DPDP verifiable parental consent | PostgreSQL `consent_records` | Backend compliance service | External OTP provider (when configured) | Audit retention (until account deletion / legal requirement) | OTP hashed with `bcryptjs` |
| `latitude`, `longitude`, `accuracy`, `captured_at`, `pickup_address`, `destination_address` | Mobile/Web GPS during `RIDE_STARTED` | Live fleet tracking & route display | PostgreSQL `driver_locations`, `ride_location_history`, `rides` | Driver (self), Fleet Admin (`/monitor`, `/api/drivers`) | Google Maps / Esri / Nominatim / OSRM (for map tiles, geocoding, and routing) | `[CONFIG_REQUIRED: Define retention period]` | TLS/WSS in transit |
| `fcm_token` | Mobile device | Push alerts on ride start/end | PostgreSQL `drivers` / `admins` | Backend notification service | Firebase Cloud Messaging (Google) if configured | Replaced on login / cleared on account deletion | TLS in transit |
| JWT & `serverUrl` | Login response | Session authentication | Mobile OS Keychain/Keystore (`react-native-keychain`) | Mobile app only | None | `7d` JWT expiry (`JWT_EXPIRES_IN`); cleared on logout | OS Keychain/Keystore |
| `analytics_consent`, `session_replay_consent` | Privacy Preferences UI | CIPA/GDPR consent persistence | PostgreSQL `privacy_preferences` | User (by `subjectKey`) | None | Until changed or account deleted | TLS in transit |
| `email` (suppressed) | Unsubscribe endpoint | CAN-SPAM suppression | PostgreSQL `marketing_email_suppressions` | Backend email service, Admin | None | Retained indefinitely to honor opt-out | TLS in transit |
