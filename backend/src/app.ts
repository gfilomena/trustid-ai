import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from './api/errors.js';
import { createRoutes } from './api/routes.js';
import { env } from './config/env.js';
import { createContainer } from './container.js';

export function createApp() {
  const container = createContainer();
  const app = express();

  app.disable('x-powered-by');
  // Small body limit on purpose: the API never accepts raw images in demo mode.
  app.use(express.json({ limit: '32kb' }));
  app.use(cors({ origin: env.allowedOrigins }));
  app.use((_req, res, next) => {
    // Baseline hardening. Production: helmet, rate limiting per IP/device,
    // authN for analyst endpoints (OIDC + RBAC), request signing, WAF.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use('/api', createRoutes(container));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown endpoint' }));

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      return;
    }
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.code, message: err.message });
      return;
    }
    console.error(err);
    // Never leak stack traces or provider errors to the client.
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected error' });
  };
  app.use(onError);

  return app;
}
