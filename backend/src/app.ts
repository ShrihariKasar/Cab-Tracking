import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { apiRouter } from './modules/routes.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use(
    '/api/auth',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false })
  );

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
