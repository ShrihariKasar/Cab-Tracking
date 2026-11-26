import http from 'http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { io as ioc, Socket } from 'socket.io-client';
import request from 'supertest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));
vi.mock('../database/pool.js', () => ({
  pool: { query: mockQuery },
}));
vi.mock('../services/fcmService.js', () => ({
  notifyAllAdmins: vi.fn().mockResolvedValue(undefined),
}));

import { createApp } from '../app.js';
import { initTrackingGateway } from '../gateway/trackingGateway.js';
import { signToken } from '../middleware/auth.js';

describe('End-to-End Live Tracking (REST + Socket.IO)', () => {
  let server: http.Server;
  let baseUrl: string;

  const adminToken = signToken({
    sub: 'adm-1',
    role: 'ADMIN',
    mobileNumber: '+15550000001',
    fullName: 'Fleet Admin',
  });

  const driverToken = signToken({
    sub: 'drv-1',
    role: 'DRIVER',
    mobileNumber: '+15550000002',
    fullName: 'Rajesh Kumar',
  });

  beforeAll(async () => {
    const app = createApp();
    server = http.createServer(app);
    const io = initTrackingGateway(server);
    app.set('io', io);

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('rejects unauthenticated Socket.IO connections', async () => {
    const client = ioc(baseUrl, { transports: ['websocket'], autoConnect: true });
    const err = await new Promise<Error>((resolve) => {
      client.on('connect_error', resolve);
    });
    expect(err.message).toMatch(/Authentication required|Invalid token/);
    client.disconnect();
  });

  it('streams driver:ride:started, real-time driver:location:update -> admin:location:updated, and driver:ride:ended', async () => {
    const adminSocket: Socket = ioc(baseUrl, { auth: { token: adminToken }, transports: ['websocket'] });
    const driverSocket: Socket = ioc(baseUrl, { auth: { token: driverToken }, transports: ['websocket'] });

    await Promise.all([
      new Promise<void>((r) => adminSocket.on('connect', () => r())),
      new Promise<void>((r) => driverSocket.on('connect', () => r())),
    ]);

    try {
      // 1. Driver starts ride
      const rideStartedPromise = new Promise<any>((resolve) => {
        adminSocket.once('driver:ride:started', resolve);
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ full_name: 'Rajesh Kumar', vehicle_id: 'veh-1', registration_number: 'KA-01-AB-1234' }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'ride-1', startTime: '2026-11-26T08:00:00.000Z' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const startRes = await request(server)
        .post('/api/rides/start')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 12.9716, longitude: 77.5946, accuracy: 8 });
      expect(startRes.status).toBe(201);

      const startedEvent = await rideStartedPromise;
      expect(startedEvent.driverId).toBe('drv-1');
      expect(startedEvent.vehicleRegistration).toBe('KA-01-AB-1234');

      // 2. Driver emits live GPS update -> Admin receives admin:location:updated
      const locPromise = new Promise<any>((resolve) => {
        adminSocket.once('admin:location:updated', resolve);
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'ride-1' }] }) // active ride check in gateway
        .mockResolvedValueOnce({ rows: [] }) // upsert driver_locations
        .mockResolvedValueOnce({ rows: [] }); // insert ride_location_history

      const capturedAt = new Date().toISOString();
      driverSocket.emit('driver:location:update', {
        latitude: 12.975,
        longitude: 77.601,
        accuracy: 6.5,
        capturedAt,
      });

      const locEvent = await locPromise;
      expect(locEvent.driverId).toBe('drv-1');
      expect(locEvent.rideId).toBe('ride-1');
      expect(locEvent.latitude).toBe(12.975);
      expect(locEvent.longitude).toBe(77.601);
      expect(locEvent.lastSyncedAt).toBeTruthy();

      // 3. Driver ends ride -> Admin receives driver:ride:ended
      const rideEndedPromise = new Promise<any>((resolve) => {
        adminSocket.once('driver:ride:ended', resolve);
      });

      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'ride-1', endTime: '2026-11-26T08:30:00.000Z' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ full_name: 'Rajesh Kumar', registration_number: 'KA-01-AB-1234' }] });

      const endRes = await request(server)
        .post('/api/rides/end')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ latitude: 12.98, longitude: 77.61 });
      expect(endRes.status).toBe(200);

      const endedEvent = await rideEndedPromise;
      expect(endedEvent.rideId).toBe('ride-1');
    } finally {
      adminSocket.disconnect();
      driverSocket.disconnect();
    }
  });
});
