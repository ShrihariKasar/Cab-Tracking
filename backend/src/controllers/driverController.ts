import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/pool.js';

const locationPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).default(0),
  capturedAt: z.string().datetime(),
});

const postLocationSchema = z.union([
  locationPointSchema,
  z.object({ locations: z.array(locationPointSchema).min(1) }),
]);

export async function listDrivers(_req: Request, res: Response, next: NextFunction) {
  try {
    const r = await pool.query(
      `SELECT d.id, d.mobile_number AS "mobileNumber", d.full_name AS "fullName", d.photo_url AS "photoUrl",
              d.account_status AS "accountStatus", d.availability_status AS "availabilityStatus",
              d.internet_connected AS "internetConnected", d.gps_enabled AS "gpsEnabled",
              v.registration_number AS "vehicleRegistration", v.model AS "vehicleModel", v.colour AS "vehicleColour",
              dl.latitude, dl.longitude, dl.accuracy, dl.captured_at AS "capturedAt", dl.last_synced_at AS "lastSyncedAt",
              r.id AS "activeRideId", r.status AS "rideStatus", r.start_time AS "rideStartTime",
              r.pickup_address AS "pickupAddress", r.destination_address AS "destinationAddress"
       FROM drivers d
       LEFT JOIN vehicles v ON v.driver_id = d.id
       LEFT JOIN driver_locations dl ON dl.driver_id = d.id
       LEFT JOIN rides r ON r.driver_id = d.id AND r.status = 'RIDE_STARTED'
       ORDER BY d.full_name ASC`
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    next(err);
  }
}

export async function getDriverById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    if (req.user!.role === 'DRIVER' && req.user!.sub !== id) {
      return res.status(403).json({ success: false, message: 'Drivers can only view their own profile' });
    }

    const r = await pool.query(
      `SELECT d.id, d.mobile_number AS "mobileNumber", d.full_name AS "fullName", d.photo_url AS "photoUrl",
              d.account_status AS "accountStatus", d.availability_status AS "availabilityStatus",
              d.internet_connected AS "internetConnected", d.gps_enabled AS "gpsEnabled",
              v.id AS "vehicleId", v.registration_number AS "vehicleRegistration", v.model AS "vehicleModel", v.colour AS "vehicleColour",
              dl.latitude, dl.longitude, dl.accuracy, dl.captured_at AS "capturedAt", dl.last_synced_at AS "lastSyncedAt",
              r.id AS "activeRideId", r.status AS "rideStatus", r.start_time AS "rideStartTime",
              r.pickup_address AS "pickupAddress", r.destination_address AS "destinationAddress"
       FROM drivers d
       LEFT JOIN vehicles v ON v.driver_id = d.id
       LEFT JOIN driver_locations dl ON dl.driver_id = d.id
       LEFT JOIN rides r ON r.driver_id = d.id AND r.status = 'RIDE_STARTED'
       WHERE d.id = $1`,
      [id]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function updateDriverProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    if (req.user!.role !== 'DRIVER' || req.user!.sub !== id) {
      return res.status(403).json({ success: false, message: 'Unauthorized profile update' });
    }
    const body = z
      .object({
        fullName: z.string().min(2).max(150).optional(),
        photoUrl: z.string().url().nullable().optional(),
        internetConnected: z.boolean().optional(),
        gpsEnabled: z.boolean().optional(),
      })
      .parse(req.body);

    await pool.query(
      `UPDATE drivers
       SET full_name = COALESCE($1, full_name),
           photo_url = COALESCE($2, photo_url),
           internet_connected = COALESCE($3, internet_connected),
           gps_enabled = COALESCE($4, gps_enabled),
           updated_at = NOW()
       WHERE id = $5`,
      [body.fullName ?? null, body.photoUrl ?? null, body.internetConnected ?? null, body.gpsEnabled ?? null, id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function postDriverLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const driverId = String(req.params.id);
    if (req.user!.role !== 'DRIVER' || req.user!.sub !== driverId) {
      return res.status(403).json({ success: false, message: 'Drivers can only submit their own location' });
    }

    const parsed = postLocationSchema.parse(req.body);
    const points = 'locations' in parsed ? parsed.locations : [parsed];

    // Validate active ride
    const rideRes = await pool.query(
      `SELECT id FROM rides WHERE driver_id = $1 AND status = 'RIDE_STARTED' ORDER BY start_time DESC LIMIT 1`,
      [driverId]
    );
    const activeRide = rideRes.rows[0];
    if (!activeRide) {
      return res.status(400).json({ success: false, message: 'No active ride in progress' });
    }

    const io = req.app.get('io');
    let latestSyncedAt = new Date().toISOString();

    for (const pt of points) {
      const captured = new Date(pt.capturedAt);
      if (Number.isNaN(captured.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid location timestamp' });
      }

      const upsert = await pool.query(
        `INSERT INTO driver_locations (driver_id, ride_id, latitude, longitude, accuracy, captured_at, last_synced_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (driver_id) DO UPDATE SET
           ride_id = EXCLUDED.ride_id,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           accuracy = EXCLUDED.accuracy,
           captured_at = EXCLUDED.captured_at,
           last_synced_at = NOW(),
           updated_at = NOW()
         RETURNING last_synced_at`,
        [driverId, activeRide.id, pt.latitude, pt.longitude, pt.accuracy, captured.toISOString()]
      );
      latestSyncedAt = upsert.rows[0]?.last_synced_at ?? latestSyncedAt;

      await pool.query(
        `INSERT INTO ride_location_history (ride_id, driver_id, latitude, longitude, accuracy, captured_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [activeRide.id, driverId, pt.latitude, pt.longitude, pt.accuracy, captured.toISOString()]
      );
    }

    const last = points[points.length - 1];
    io?.to('admins').emit('admin:location:updated', {
      driverId,
      rideId: activeRide.id,
      latitude: last.latitude,
      longitude: last.longitude,
      accuracy: last.accuracy,
      capturedAt: last.capturedAt,
      lastSyncedAt: latestSyncedAt,
    });

    res.json({ success: true, data: { syncedCount: points.length, lastSyncedAt: latestSyncedAt } });
  } catch (err) {
    next(err);
  }
}

export async function getDriverLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const driverId = String(req.params.id);
    const r = await pool.query(
      `SELECT dl.driver_id AS "driverId", dl.ride_id AS "rideId", dl.latitude, dl.longitude, dl.accuracy,
              dl.captured_at AS "capturedAt", dl.last_synced_at AS "lastSyncedAt",
              d.full_name AS "driverName", d.availability_status AS "availabilityStatus",
              d.internet_connected AS "internetConnected", d.gps_enabled AS "gpsEnabled",
              v.registration_number AS "vehicleRegistration", v.model AS "vehicleModel",
              r.status AS "rideStatus", r.start_time AS "rideStartTime",
              r.pickup_address AS "pickupAddress", r.destination_address AS "destinationAddress"
       FROM drivers d
       LEFT JOIN driver_locations dl ON dl.driver_id = d.id
       LEFT JOIN vehicles v ON v.driver_id = d.id
       LEFT JOIN rides r ON r.driver_id = d.id AND r.status = 'RIDE_STARTED'
       WHERE d.id = $1`,
      [driverId]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    next(err);
  }
}
