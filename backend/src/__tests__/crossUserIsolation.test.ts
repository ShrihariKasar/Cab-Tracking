import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import http from 'http';
import request from 'supertest';
import { io as ioClient, Socket } from 'socket.io-client';

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

describe('Strict Cross-User Data Isolation & Zero Unauthorized Exposure', () => {
  const app = createApp();
  const userAToken = signToken({
    sub: 'drv-A',
    role: 'DRIVER',
    mobileNumber: '+15550000011',
    fullName: 'User A',
  });
  const userBToken = signToken({
    sub: 'drv-B',
    role: 'DRIVER',
    mobileNumber: '+15550000012',
    fullName: 'User B',
  });
  const adminToken = signToken({
    sub: 'adm-1',
    role: 'ADMIN',
    mobileNumber: '+15550000001',
    fullName: 'Admin One',
  });

  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
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

  it('denies User A from reading, updating, or posting location for User B (IDOR/BOLA)', async () => {
    const readOther = await request(app)
      .get('/api/drivers/drv-B')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(readOther.status).toBe(403);

    const patchOther = await request(app)
      .patch('/api/drivers/drv-B')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ fullName: 'Hacked B' });
    expect(patchOther.status).toBe(403);

    const postLocOther = await request(app)
      .post('/api/drivers/drv-B/location')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ latitude: 12.97, longitude: 77.59, accuracy: 5, capturedAt: new Date().toISOString() });
    expect(postLocOther.status).toBe(403);

    const getLocOther = await request(app)
      .get('/api/drivers/drv-B/location')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(getLocOther.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('denies User A from accessing admin endpoints, bulk driver lists, or User B ride routes', async () => {
    const driversList = await request(app)
      .get('/api/drivers')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(driversList.status).toBe(403);

    const activeRides = await request(app)
      .get('/api/rides/active')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(activeRides.status).toBe(403);

    const routeB = await request(app)
      .get('/api/rides/ride-B/route')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(routeB.status).toBe(403);

    const suppression = await request(app)
      .get('/api/compliance/marketing/suppression?email=b@example.com')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(suppression.status).toBe(403);
  });

  it('scopes data export and account deletion strictly to authenticated token sub (ignoring injected IDs)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'drv-A', fullName: 'User A' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const exp = await request(app)
      .get('/api/compliance/my-data?userId=drv-B&id=drv-B')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(exp.status).toBe(200);
    expect(mockQuery.mock.calls[0]?.[1]).toEqual(['drv-A']);

    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
    const del = await request(app)
      .delete('/api/compliance/account?userId=drv-B')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ userId: 'drv-B' });
    expect(del.status).toBe(200);
    expect(mockQuery.mock.calls[3]?.[1]).toEqual(['drv-A']);
  });

  it('enforces least-privilege: Admin cannot invoke driver-only ride, profile-patch, or self-delete endpoints', async () => {
    const startAsAdmin = await request(app)
      .post('/api/rides/start')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ latitude: 12.97, longitude: 77.59, accuracy: 5 });
    expect(startAsAdmin.status).toBe(403);

    const patchDriverAsAdmin = await request(app)
      .patch('/api/drivers/drv-A')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Changed' });
    expect(patchDriverAsAdmin.status).toBe(403);

    const delAsAdmin = await request(app)
      .delete('/api/compliance/account')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delAsAdmin.status).toBe(403);
  });

  it('sets private no-store Cache-Control and X-Robots-Tag on API responses', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/drivers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('private');
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['x-robots-tag']).toContain('noindex');
  });

  it('isolates WebSocket channels so User A never receives User B location updates', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'ride-B' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const userASocket: Socket = ioClient(baseUrl, { auth: { token: userAToken }, transports: ['websocket'] });
    const userBSocket: Socket = ioClient(baseUrl, { auth: { token: userBToken }, transports: ['websocket'] });

    await Promise.all([
      new Promise<void>((res) => userASocket.on('connect', () => res())),
      new Promise<void>((res) => userBSocket.on('connect', () => res())),
    ]);

    let leakedToA = false;
    userASocket.on('admin:location:updated', () => {
      leakedToA = true;
    });

    userBSocket.emit('driver:location:update', {
      latitude: 19.07,
      longitude: 72.87,
      accuracy: 4,
      capturedAt: new Date().toISOString(),
    });

    await new Promise((r) => setTimeout(r, 200));
    expect(leakedToA).toBe(false);

    userASocket.disconnect();
    userBSocket.disconnect();
  });
});
