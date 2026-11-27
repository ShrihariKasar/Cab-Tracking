import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { env } from '../config/env.js';
import { pool } from '../database/pool.js';
import { AuthUser, verifyToken } from '../middleware/auth.js';

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).default(0),
  capturedAt: z.string().datetime(),
});

interface AuthedSocket extends Socket {
  user?: AuthUser;
}

export function initTrackingGateway(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }
    try {
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    const user = socket.user!;
    if (user.role === 'ADMIN') {
      socket.join('admins');
    } else {
      socket.join(`driver:${user.sub}`);
    }

    socket.on('driver:location:update', async (raw: unknown) => {
      if (user.role !== 'DRIVER') return;
      const parsed = locationSchema.safeParse(raw);
      if (!parsed.success) return;

      const { latitude, longitude, accuracy, capturedAt } = parsed.data;
      const driverId = user.sub;

      const rideRes = await pool
        .query(
          `SELECT r.id
           FROM rides r
           JOIN drivers d ON d.id = r.driver_id
           WHERE r.driver_id = $1
             AND r.status = 'RIDE_STARTED'
             AND d.account_status = 'ACTIVE'
             AND d.consent_status = 'GRANTED'
           LIMIT 1`,
          [driverId]
        )
        .catch(() => ({ rows: [] as any[] }));
      const activeRide = rideRes.rows[0];
      if (!activeRide) return;

      const lastSyncedAt = new Date().toISOString();

      await pool
        .query(
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
          [driverId, activeRide.id, latitude, longitude, accuracy, capturedAt]
        )
        .catch(() => { });

      await pool
        .query(
          `INSERT INTO ride_location_history (ride_id, driver_id, latitude, longitude, accuracy, captured_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [activeRide.id, driverId, latitude, longitude, accuracy, capturedAt]
        )
        .catch(() => { });

      io.to('admins').emit('admin:location:updated', {
        driverId,
        rideId: activeRide.id,
        latitude,
        longitude,
        accuracy,
        capturedAt,
        lastSyncedAt,
      });
    });
  });

  return io;
}
