# API & Real-Time Socket.IO Documentation

Base URL: `/api/v1`

All protected endpoints require `Authorization: Bearer <accessToken>` (short-lived JWT, e.g. 15m).
Refresh tokens are rotated on every `/auth/refresh` call and hashed in PostgreSQL.

## 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/otp/request` | Public | Request 6-digit OTP for mobile number (`customer` or `driver`) |
| POST | `/auth/otp/verify` | Public | Verify OTP, register/login user, issue JWT + refresh token |
| POST | `/auth/admin/login` | Public | Admin email + password login |
| POST | `/auth/refresh` | Public | Rotate refresh token and issue new access/refresh pair |
| POST | `/auth/logout` | Bearer | Revoke current refresh token family & clear device token |
| POST | `/auth/recover` | Public | Account recovery via verified email / backup phone OTP |
| GET | `/auth/me` | Bearer | Get authenticated user profile & role |

## 2. Customer (`/api/v1/customers`)

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/customers/profile` | Customer | Get customer profile, saved addresses, preferences |
| PATCH | `/customers/profile` | Customer | Update name, email, notification/privacy preferences |
| POST | `/customers/saved-addresses` | Customer | Add saved address (Home, Office, Custom) |
| DELETE | `/customers/saved-addresses/:id` | Customer | Remove saved address |
| POST | `/customers/emergency-contacts` | Customer | Add/update emergency contact |
| POST | `/customers/delete-request` | Customer | Submit GDPR/account deletion request |

## 3. Bookings & Trips (`/api/v1/bookings`, `/api/v1/trips`)

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| POST | `/bookings` | Customer, Admin | Create booking (pickup, drop, coords, scheduledAt, vehicleCategory, passengers, instructions) |
| GET | `/bookings` | Customer, Admin | List customer's bookings or all bookings (Admin) |
| GET | `/bookings/:id` | Customer (owner), Driver (assigned), Admin | Get booking + trip + assigned driver/vehicle |
| PATCH | `/bookings/:id/cancel` | Customer (owner), Admin | Cancel booking with reason |
| POST | `/bookings/:id/assign` | Admin (Dispatcher+) | Assign or reassign driver & vehicle to booking |
| GET | `/trips/active` | Customer, Driver | Get currently active trip for caller |
| GET | `/trips/history` | Customer, Driver, Admin | Paginated trip history with filters (daily/weekly/monthly) |
| GET | `/trips/:id/tracking` | Customer (owner), Driver (assigned), Admin | Get last known location, route polyline, ETA, and status timeline |
| GET | `/trips/:id/location-history` | Admin, Customer (owner, post-trip) | Get historical GPS breadcrumbs for trip |
| PATCH | `/trips/:id/status` | Driver (assigned), Admin | Transition trip status using validated state machine |
| POST | `/trips/:id/issues` | Driver (assigned), Customer (owner) | Report trip incident/issue |

### Valid Trip Status State Machine
1. `BOOKING_REQUESTED`
2. `BOOKING_CONFIRMED`
3. `DRIVER_ASSIGNED`
4. `DRIVER_ON_THE_WAY`
5. `DRIVER_ARRIVED`
6. `PASSENGER_PICKED_UP`
7. `TRIP_STARTED`
8. `TRIP_COMPLETED`
9. `TRIP_CANCELLED`

## 4. Driver (`/api/v1/drivers`)

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/drivers/dashboard` | Driver | Today's summary, assigned vehicle, availability, active/upcoming trips |
| PATCH | `/drivers/availability` | Driver | Toggle `ONLINE` / `OFFLINE` (blocked if on active trip) |
| POST | `/drivers/device` | Driver | Register device ID and FCM push token |
| POST | `/drivers/location/batch` | Driver | Sync offline-queued GPS location batches (validated against active trip/duty) |
| GET | `/drivers/profile` | Driver | Driver profile, license, verification status, assigned vehicle, documents |
| POST | `/drivers/assignments/:tripId/respond` | Driver | Accept or reject assignment (if permitted by policy) |

## 5. Notifications (`/api/v1/notifications`)

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/notifications` | All Auth | List user notifications (paginated) |
| PATCH | `/notifications/:id/read` | All Auth | Mark notification as read |
| PATCH | `/notifications/read-all` | All Auth | Mark all as read |

## 6. Admin (`/api/v1/admin`)

RBAC Roles: `SUPER_ADMIN`, `OPERATIONS_MANAGER`, `DISPATCHER`, `READ_ONLY_MONITOR`

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| GET | `/admin/overview` | `READ_ONLY_MONITOR` | Fleet KPIs (vehicles, drivers, active trips, completed today, pending, cancelled) |
| GET | `/admin/fleet/live` | `READ_ONLY_MONITOR` | Snapshot of all active vehicles from Redis + stale GPS flags |
| GET | `/admin/drivers` | `READ_ONLY_MONITOR` | List/search drivers |
| POST | `/admin/drivers` | `OPERATIONS_MANAGER` | Create driver |
| PATCH | `/admin/drivers/:id` | `OPERATIONS_MANAGER` | Edit driver / approve / suspend |
| GET | `/admin/vehicles` | `READ_ONLY_MONITOR` | List/search vehicles |
| POST | `/admin/vehicles` | `OPERATIONS_MANAGER` | Add vehicle |
| PATCH | `/admin/vehicles/:id` | `OPERATIONS_MANAGER` | Edit vehicle / assign driver |
| GET | `/admin/reports/:type` | `READ_ONLY_MONITOR` | Generate report (`daily`, `monthly`, `driver-performance`, `vehicle-utilization`, `distance`, `cancellations`) with `?format=json\|csv\|xlsx` |
| GET | `/admin/audit-logs` | `SUPER_ADMIN` | Query immutable audit trail |

## 7. Socket.IO Real-Time Protocol

Namespace: `/` with JWT handshake (`auth: { token }`).

### Rooms & Authorization
- `customer:<customerId>` — personal trip notifications
- `driver:<driverId>` — assignments and dispatch commands
- `trip:<tripId>` — authorized customer (booking owner), assigned driver, and authorized admins only
- `admin:fleet` — authenticated admin users only

### Client -> Server Events
- `driver:location:update` `{ tripId?, vehicleId, latitude, longitude, accuracy, speed, heading, clientTimestamp }`
- `driver:availability:update` `{ status: 'ONLINE' | 'OFFLINE' }`
- `trip:subscribe` `{ tripId }` (server verifies ownership/assignment before joining room)
- `trip:start` `{ tripId }`
- `trip:complete` `{ tripId }`
- `trip:status:update` `{ tripId, status, note? }`

### Server -> Client Events
- `vehicle:location:updated` `{ tripId, vehicleId, driverId, latitude, longitude, speed, heading, accuracy, serverTimestamp }`
- `trip:assigned` `{ tripId, bookingId, pickup, destination, customerName }`
- `trip:status:changed` `{ tripId, status, updatedAt, note? }`
- `driver:arrived` `{ tripId, driverId, arrivedAt }`
- `tracking:connection:status` `{ connected, lastUpdateAt, stale }`
