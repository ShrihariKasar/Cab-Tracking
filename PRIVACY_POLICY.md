# Privacy Policy — FleetPulse

**Effective Date:** `[CONFIG_REQUIRED: Effective Date]`  
**Last Updated:** 2026-11-27  
**Data Controller:** `FleetPulse Operations Inc.` (`COMPANY_NAME` env)  
**Postal Address:** `548 Market St, PMB 00000, San Francisco, CA 94104, USA` (`COMPANY_POSTAL_ADDRESS` env — replace with verified address)  
**Privacy Contact / Grievance Officer:** `[CONFIG_REQUIRED: privacy@your-domain.com & Grievance Officer Name]`

Live web version served at: `/privacy-policy`

## 1. Scope
This Privacy Policy applies to the FleetPulse mobile app (Driver & Admin) and web portals (`/driver`, `/monitor`).

## 2. Information Collected
- **Account & Registration:** Full name, mobile number, password (bcrypt hash), date of birth, account/availability status.
- **Vehicle Assignment:** Registration number, model, colour.
- **Location Data:** GPS coordinates, accuracy, timestamps, and pickup/destination addresses collected only during active rides (`START RIDE` to `END RIDE`).
- **Consent & Preferences:** DPDP consent records, timestamps, verification references, analytics/replay preferences, email suppression status.
- **Push Notifications:** FCM device token (if Firebase is configured).

## 3. Third-Party Services
- Google Maps SDK / Esri World Street Map / Leaflet CDN (`unpkg.com`) for map rendering.
- OpenStreetMap Nominatim & OSRM (`router.project-osrm.org`) for place search and driving routes.
- Firebase Cloud Messaging (if configured) for admin ride alerts.

## 4. Your Rights
- **Access / Export:** `GET /api/compliance/my-data` or Profile Settings → *Export My Personal Data*.
- **Correction:** `PATCH /api/drivers/:id` or Profile Settings → *Edit Profile*.
- **Consent Withdrawal:** `POST /api/compliance/consent/withdraw` or Profile Settings → *Withdraw DPDP Consent*.
- **Account Deletion:** `DELETE /api/compliance/account` or Profile Settings → *Delete My Account*.
- **Marketing Unsubscribe:** One-click `/api/compliance/unsubscribe` link in every promotional email (no login or fee required).

## 5. Children's Privacy
Under-18 driver registration requires server-verified parental/guardian consent before account activation.
