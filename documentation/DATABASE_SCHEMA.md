# Database Schema (PostgreSQL + PostGIS)

All tables use UUID primary keys (`gen_random_uuid()`), `created_at` (`TIMESTAMPTZ`), and `updated_at` (`TIMESTAMPTZ`). Soft deletion uses `deleted_at TIMESTAMPTZ NULL`.

## Tables (14 Normalized Entities)

1. **`users`**
   - `id`, `phone` (unique), `email` (unique nullable), `password_hash` (admin only), `full_name`, `role` (`CUSTOMER | DRIVER | ADMIN`), `is_active`, `fcm_token`, `last_login_at`, `deleted_at`
2. **`admin_roles`**
   - `id`, `user_id` (FK -> `users`), `role_name` (`SUPER_ADMIN | OPERATIONS_MANAGER | DISPATCHER | READ_ONLY_MONITOR`), `permissions` (JSONB)
3. **`customers`**
   - `id`, `user_id` (FK -> `users` unique), `corporate_account`, `saved_addresses` (JSONB), `notification_prefs` (JSONB), `privacy_prefs` (JSONB), `deletion_requested_at`
4. **`drivers`**
   - `id`, `user_id` (FK -> `users` unique), `license_number` (unique), `license_expiry`, `verification_status` (`PENDING | APPROVED | SUSPENDED`), `availability_status` (`ONLINE | OFFLINE | ON_TRIP`), `device_id`, `approved_by` (FK -> `users`), `approved_at`
5. **`vehicles`**
   - `id`, `registration_number` (unique), `model`, `colour`, `category` (`SEDAN | SUV | HATCHBACK | LUXURY | VAN`), `capacity`, `assigned_driver_id` (FK -> `drivers` nullable), `insurance_expiry`, `permit_expiry`, `fitness_expiry`, `status` (`AVAILABLE | ON_TRIP | MAINTENANCE | INACTIVE`)
6. **`bookings`**
   - `id`, `booking_code` (unique human-readable e.g. `CAB-2026-0001`), `customer_id` (FK -> `customers`), `pickup_address`, `pickup_location` (`GEOGRAPHY(POINT, 4326)`), `destination_address`, `destination_location` (`GEOGRAPHY(POINT, 4326)`), `scheduled_at`, `vehicle_category`, `passenger_count`, `special_instructions`, `status`
7. **`trips`**
   - `id`, `booking_id` (FK -> `bookings` unique), `driver_id` (FK -> `drivers`), `vehicle_id` (FK -> `vehicles`), `status` (9-state enum), `route_polyline` (TEXT), `distance_meters`, `estimated_duration_sec`, `started_at`, `arrived_at`, `completed_at`, `cancelled_at`, `cancellation_reason`
8. **`trip_assignments`**
   - `id`, `trip_id` (FK -> `trips`), `driver_id` (FK -> `drivers`), `vehicle_id` (FK -> `vehicles`), `assigned_by` (FK -> `users`), `response_status` (`PENDING | ACCEPTED | REJECTED | REASSIGNED`), `responded_at`
9. **`driver_locations`**
   - `id`, `driver_id` (FK -> `drivers` unique), `vehicle_id` (FK -> `vehicles`), `location` (`GEOGRAPHY(POINT, 4326)`), `accuracy_meters`, `speed_mps`, `heading_deg`, `recorded_at` (`TIMESTAMPTZ`), `server_received_at` (`TIMESTAMPTZ`)
10. **`trip_location_history`**
    - `id`, `trip_id` (FK -> `trips`), `driver_id` (FK -> `drivers`), `vehicle_id` (FK -> `vehicles`), `location` (`GEOGRAPHY(POINT, 4326)`), `accuracy_meters`, `speed_mps`, `heading_deg`, `recorded_at`, `server_received_at`
11. **`notifications`**
    - `id`, `user_id` (FK -> `users`), `trip_id` (FK -> `trips` nullable), `type`, `title`, `body`, `data` (JSONB), `is_read`, `read_at`
12. **`emergency_contacts`**
    - `id`, `user_id` (FK -> `users`), `name`, `relationship`, `phone`, `is_primary`
13. **`driver_documents`**
    - `id`, `driver_id` (FK -> `drivers`), `document_type` (`LICENSE | ID_PROOF | POLICE_CLEARANCE | BADGE`), `document_number`, `file_url`, `expiry_date`, `verified_by` (FK -> `users`), `verified_at`, `status` (`PENDING | VERIFIED | REJECTED`)
14. **`audit_logs`**
    - `id`, `actor_user_id` (FK -> `users` nullable), `actor_role`, `action`, `resource_type`, `resource_id`, `metadata` (JSONB), `ip_address`, `user_agent`, `created_at`

## Spatial & Performance Indexes
- GIST spatial indexes on `bookings.pickup_location`, `bookings.destination_location`, `driver_locations.location`, `trip_location_history.location`.
- Composite B-tree index on `trip_location_history (trip_id, recorded_at DESC)`.
- B-tree indexes on `bookings (customer_id, created_at DESC)`, `trips (driver_id, status)`, `audit_logs (created_at DESC)`.

## Data Retention Policy
- `trip_location_history`: Retained for **90 days** in hot storage, then aggregated/purged via scheduled retention job (`DELETE FROM trip_location_history WHERE server_received_at < NOW() - INTERVAL '90 days'`).
- `audit_logs`: Retained for **365 days** for compliance.
- Deleted user PII: Anonymized within **30 days** of verified deletion request while preserving anonymized trip financial/operational aggregates.
