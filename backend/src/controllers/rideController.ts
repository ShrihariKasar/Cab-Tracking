import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/pool.js';
import { notifyAllAdmins } from '../services/fcmService.js';

const rideCoordsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).default(0),
  capturedAt: z.string().datetime().optional(),
  pickupAddress: z.string().max(250).optional(),
  destinationAddress: z.string().max(250).optional(),
  destinationLatitude: z.number().min(-90).max(90).optional(),
  destinationLongitude: z.number().min(-180).max(180).optional(),
});

export async function startRide(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'DRIVER') {
      return res.status(403).json({ success: false, message: 'Only drivers can start a ride' });
    }
    const driverId = req.user!.sub;
    const coords = rideCoordsSchema.parse(req.body);
    const capturedAt = coords.capturedAt || new Date().toISOString();

    const existing = await pool.query(
      `SELECT id FROM rides WHERE driver_id = $1 AND status = 'RIDE_STARTED' LIMIT 1`,
      [driverId]
    );
    if (existing.rows[0]) {
      return res.status(409).json({ success: false, message: 'Ride already started', data: { rideId: existing.rows[0].id } });
    }

    const drvInfo = await pool.query(
      `SELECT d.full_name, v.id AS vehicle_id, v.registration_number
       FROM drivers d LEFT JOIN vehicles v ON v.driver_id = d.id WHERE d.id = $1`,
      [driverId]
    );
    const info = drvInfo.rows[0];
    if (!info) return res.status(404).json({ success: false, message: 'Driver not found' });

    const rideRes = await pool.query(
      `INSERT INTO rides (driver_id, vehicle_id, status, start_time, start_latitude, start_longitude, pickup_address, destination_address, destination_latitude, destination_longitude)
       VALUES ($1, $2, 'RIDE_STARTED', NOW(), $3, $4, $5, $6, $7, $8)
       RETURNING id, start_time AS "startTime"`,
      [
        driverId,
        info.vehicle_id,
        coords.latitude,
        coords.longitude,
        coords.pickupAddress?.trim() || 'Current GPS Location',
        coords.destinationAddress?.trim() || null,
        coords.destinationLatitude ?? null,
        coords.destinationLongitude ?? null,
      ]
    );
    const ride = rideRes.rows[0];

    await pool.query(
      `UPDATE drivers SET availability_status = 'ON_RIDE', internet_connected = TRUE, gps_enabled = TRUE, updated_at = NOW() WHERE id = $1`,
      [driverId]
    );

    await pool.query(
      `INSERT INTO driver_locations (driver_id, ride_id, latitude, longitude, accuracy, captured_at, last_synced_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (driver_id) DO UPDATE SET
         ride_id = EXCLUDED.ride_id,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         accuracy = EXCLUDED.accuracy,
         captured_at = EXCLUDED.captured_at,
         last_synced_at = NOW(),
         updated_at = NOW()`,
      [driverId, ride.id, coords.latitude, coords.longitude, coords.accuracy, capturedAt]
    );

    const eventPayload = {
      rideId: ride.id,
      driverId,
      driverName: info.full_name,
      vehicleRegistration: info.registration_number || 'Unassigned',
      startTime: ride.startTime,
      latitude: coords.latitude,
      longitude: coords.longitude,
      pickupAddress: coords.pickupAddress?.trim() || 'Current GPS Location',
      destinationAddress: coords.destinationAddress?.trim() || null,
      destinationLatitude: coords.destinationLatitude ?? null,
      destinationLongitude: coords.destinationLongitude ?? null,
    };

    const io = req.app.get('io');
    io?.to('admins').emit('driver:ride:started', eventPayload);

    await notifyAllAdmins({
      title: 'Ride Started',
      body: `${info.full_name} (${info.registration_number || 'Cab'}) started a ride.`,
      data: {
        type: 'RIDE_STARTED',
        driverId,
        rideId: ride.id,
        vehicleRegistration: info.registration_number || '',
      },
    });

    res.status(201).json({ success: true, data: eventPayload });
  } catch (err) {
    next(err);
  }
}

export async function endRide(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user!.role !== 'DRIVER') {
      return res.status(403).json({ success: false, message: 'Only drivers can end a ride' });
    }
    const driverId = req.user!.sub;
    const coords = rideCoordsSchema.partial().parse(req.body || {});

    const rideRes = await pool.query(
      `UPDATE rides
       SET status = 'RIDE_ENDED',
           end_time = NOW(),
           end_latitude = COALESCE($1, end_latitude),
           end_longitude = COALESCE($2, end_longitude),
           updated_at = NOW()
       WHERE driver_id = $3 AND status = 'RIDE_STARTED'
       RETURNING id, end_time AS "endTime"`,
      [coords.latitude ?? null, coords.longitude ?? null, driverId]
    );
    const ride = rideRes.rows[0];
    if (!ride) return res.status(404).json({ success: false, message: 'No active ride found' });

    await pool.query(
      `UPDATE drivers SET availability_status = 'AVAILABLE', updated_at = NOW() WHERE id = $1`,
      [driverId]
    );

    if (coords.latitude !== undefined && coords.longitude !== undefined) {
      await pool.query(
        `UPDATE driver_locations SET latitude = $1, longitude = $2, captured_at = NOW(), last_synced_at = NOW(), updated_at = NOW() WHERE driver_id = $3`,
        [coords.latitude, coords.longitude, driverId]
      );
    }

    const drvInfo = await pool.query(
      `SELECT d.full_name, v.registration_number FROM drivers d LEFT JOIN vehicles v ON v.driver_id = d.id WHERE d.id = $1`,
      [driverId]
    );

    const payload = {
      rideId: ride.id,
      driverId,
      driverName: drvInfo.rows[0]?.full_name || 'Driver',
      vehicleRegistration: drvInfo.rows[0]?.registration_number || '',
      endTime: ride.endTime,
    };

    const io = req.app.get('io');
    io?.to('admins').emit('driver:ride:ended', payload);

    await notifyAllAdmins({
      title: 'Ride Ended',
      body: `${payload.driverName} (${payload.vehicleRegistration || 'Cab'}) completed the ride.`,
      data: { type: 'RIDE_ENDED', driverId, rideId: ride.id },
    });

    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
}

export async function getActiveRides(_req: Request, res: Response, next: NextFunction) {
  try {
    const r = await pool.query(
      `SELECT r.id AS "rideId", r.driver_id AS "driverId", r.start_time AS "startTime",
              d.full_name AS "driverName", d.mobile_number AS "mobileNumber", d.photo_url AS "photoUrl",
              v.registration_number AS "vehicleRegistration", v.model AS "vehicleModel",
              dl.latitude, dl.longitude, dl.captured_at AS "capturedAt", dl.last_synced_at AS "lastSyncedAt"
       FROM rides r
       JOIN drivers d ON d.id = r.driver_id
       LEFT JOIN vehicles v ON v.id = r.vehicle_id
       LEFT JOIN driver_locations dl ON dl.driver_id = d.id
       WHERE r.status = 'RIDE_STARTED'
       ORDER BY r.start_time DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    next(err);
  }
}

export async function getRideRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const rideId = String(req.params.id);
    const rideRes = await pool.query(
      `SELECT id, driver_id AS "driverId", status, start_time AS "startTime", end_time AS "endTime",
              start_latitude AS "startLat", start_longitude AS "startLng",
              end_latitude AS "endLat", end_longitude AS "endLng",
              pickup_address AS "pickupAddress", destination_address AS "destinationAddress",
              destination_latitude AS "destinationLat", destination_longitude AS "destinationLng"
       FROM rides WHERE id = $1`,
      [rideId]
    );
    const ride = rideRes.rows[0];
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    const ptsRes = await pool.query(
      `SELECT latitude, longitude, captured_at AS "capturedAt"
       FROM ride_location_history WHERE ride_id = $1 ORDER BY captured_at ASC`,
      [rideId]
    );

    res.json({
      success: true,
      data: {
        ...ride,
        points: ptsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}
