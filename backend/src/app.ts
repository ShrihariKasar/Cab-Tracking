import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { apiRouter } from './modules/routes.js';
import { MONITOR_HTML } from './monitorPage.js';
import { DRIVER_HTML } from './driverPage.js';

export function createApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use(
    '/api/auth',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false })
  );

  app.get('/', (_req, res) => {
    res.type('html').send(DRIVER_HTML);
  });

  app.get('/driver', (_req, res) => {
    res.type('html').send(DRIVER_HTML);
  });

  app.get('/monitor', (_req, res) => {
    res.type('html').send(MONITOR_HTML);
  });

  app.get('/privacy-policy', (_req, res) => {
    res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>FleetPulse Privacy Policy</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;line-height:1.6;color:#111}</style></head><body><h1>FleetPulse Privacy Policy</h1><p>FleetPulse collects driver GPS coordinates (including background location during active rides), driver name, mobile number, and assigned vehicle details solely to provide real-time corporate fleet tracking and dispatch operations.</p><h2>Location Data</h2><p>Background location is collected only after the driver taps <strong>START RIDE</strong> and stops immediately when the driver taps <strong>END RIDE</strong>. All data is transmitted over encrypted HTTPS/WSS connections.</p><h2>Data Retention &amp; Deletion</h2><p>Drivers and administrators may request account or location history deletion by contacting their fleet administrator.</p></body></html>`);
  });

  app.use('/api', apiRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    console.error('[API Error]', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  });

  return app;
}
