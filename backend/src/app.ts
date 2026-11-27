import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { apiRouter } from './modules/routes.js';
import { MONITOR_HTML } from './monitorPage.js';
import { DRIVER_HTML } from './driverPage.js';
import { renderPrivacyPolicyHtml, renderTermsHtml } from './legalPages.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(
    helmet({
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
          imgSrc: ["'self'", 'data:', 'https://server.arcgisonline.com', 'https://*.tile.openstreetmap.org'],
          connectSrc: [
            "'self'",
            'wss:',
            'ws:',
            'https://router.project-osrm.org',
            'https://nominatim.openstreetmap.org',
          ],
          frameAncestors: ["'none'"],
        },
      },
    })
  );
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), payment=(), geolocation=(self)');
    next();
  });
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use(
    '/api/auth',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false })
  );
  app.use(
    '/api/compliance/parental-consent',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false })
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
    res.type('html').send(renderPrivacyPolicyHtml());
  });

  app.get('/terms-and-conditions', (_req, res) => {
    res.type('html').send(renderTermsHtml());
  });

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
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
