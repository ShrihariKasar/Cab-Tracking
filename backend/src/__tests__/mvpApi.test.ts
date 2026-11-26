import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));
vi.mock('../database/pool.js', () => ({
  pool: { query: mockQuery },
}));
vi.mock('../services/fcmService.js', () => ({
  notifyAllAdmins: vi.fn().mockResolvedValue(undefined),
}));

import { createApp } from '../app.js';
import { signToken } from '../middleware/auth.js';

describe('Simple Cab Live Tracking MVP Backend', () => {
  const app = createApp();

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('logs in a driver via POST /api/auth/login', async () => {
    const hash = await bcrypt.hash('Driver@1234', 4);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'drv-1',
          mobile_number: '+15550000002',
          full_name: 'Rajesh Kumar',
          password_hash: hash,
          account_status: 'ACTIVE',
          availability_status: 'AVAILABLE',
          vehicle_id: 'veh-1',
          registration_number: 'KA-01-AB-1234',
          model: 'Innova',
          colour: 'White',
        },
      ],
    });

    const res = await request(app).post('/api/auth/login').send({
      mobileNumber: '+15550000002',
      password: 'Driver@1234',
      role: 'DRIVER',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('DRIVER');
  });

  it('blocks drivers from GET /api/drivers (admin only)', async () => {
    const drvToken = signToken({
      sub: 'drv-1',
      role: 'DRIVER',
      mobileNumber: '+15550000002',
      fullName: 'Rajesh',
    });

    const res = await request(app).get('/api/drivers').set('Authorization', `Bearer ${drvToken}`);
    expect(res.status).toBe(403);
  });

  it('allows admin to list drivers via GET /api/drivers', async () => {
    const admToken = signToken({
      sub: 'adm-1',
      role: 'ADMIN',
      mobileNumber: '+15550000001',
      fullName: 'Admin',
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'drv-1', fullName: 'Rajesh Kumar' }] });

    const res = await request(app).get('/api/drivers').set('Authorization', `Bearer ${admToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('prevents driver A from submitting GPS location for driver B', async () => {
    const drvAToken = signToken({
      sub: 'drv-A',
      role: 'DRIVER',
      mobileNumber: '+15550000002',
      fullName: 'Driver A',
    });

    const res = await request(app)
      .post('/api/drivers/drv-B/location')
      .set('Authorization', `Bearer ${drvAToken}`)
      .send({
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 10,
        capturedAt: new Date().toISOString(),
      });

    expect(res.status).toBe(403);
  });

  it('starts and ends a ride for authenticated driver', async () => {
    const drvToken = signToken({
      sub: 'drv-1',
      role: 'DRIVER',
      mobileNumber: '+15550000002',
      fullName: 'Rajesh Kumar',
    });

    // startRide queries: existing ride, driver+vehicle, insert ride, update driver, upsert location
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ full_name: 'Rajesh Kumar', vehicle_id: 'veh-1', registration_number: 'KA-01-AB-1234' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'ride-1', startTime: new Date().toISOString() }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const startRes = await request(app)
      .post('/api/rides/start')
      .set('Authorization', `Bearer ${drvToken}`)
      .send({ latitude: 12.9716, longitude: 77.5946, accuracy: 8 });

    expect(startRes.status).toBe(201);
    expect(startRes.body.data.rideId).toBe('ride-1');

    // endRide queries: update ride, update driver, update location, driver info
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'ride-1', endTime: new Date().toISOString() }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ full_name: 'Rajesh Kumar', registration_number: 'KA-01-AB-1234' }] });

    const endRes = await request(app)
      .post('/api/rides/end')
      .set('Authorization', `Bearer ${drvToken}`)
      .send({ latitude: 12.9352, longitude: 77.6245 });

    expect(endRes.status).toBe(200);
    expect(endRes.body.data.rideId).toBe('ride-1');
  });
});
