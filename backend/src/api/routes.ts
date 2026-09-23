import { Router, type Request } from 'express';
import type { z } from 'zod';
import { env } from '../config/env.js';
import type { Container } from '../container.js';
import { listScenarios } from '../domain/scenario-catalog.js';
import { schemas } from './schemas.js';

const body = <T extends z.ZodType>(schema: T, req: Request): z.infer<T> => schema.parse(req.body);

export function createRoutes(c: Container): Router {
  const r = Router();

  r.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      mode: env.mode,
      version: env.version,
      providers: Object.fromEntries(Object.entries(c.providers).map(([k, p]) => [k, p.name])),
    });
  });

  // ── Onboarding verification ────────────────────────────────────────────────
  r.post('/verification/start', (req, res) => {
    res.status(201).json(c.verification.start(body(schemas.start, req)));
  });
  r.post('/verification/document', async (req, res) => {
    res.json(await c.verification.document(body(schemas.document, req)));
  });
  r.post('/verification/face', async (req, res) => {
    res.json(await c.verification.face(body(schemas.face, req)));
  });
  r.post('/verification/liveness', async (req, res) => {
    res.json(await c.verification.liveness(body(schemas.liveness, req)));
  });
  r.post('/verification/deepfake', async (req, res) => {
    res.json(await c.verification.deepfake(body(schemas.session, req)));
  });
  r.post('/verification/step-up', (req, res) => {
    res.json(c.stepUp.run(body(schemas.stepUp, req)));
  });
  r.get('/verification/:id', (req, res) => {
    res.json(c.verification.get(schemas.id.parse(req.params.id)));
  });

  // ── Risk ────────────────────────────────────────────────────────────────────
  r.post('/risk/signals', async (req, res) => {
    res.json(await c.verification.context(body(schemas.context, req)));
  });
  r.post('/risk/assess', (req, res) => {
    res.json(c.verification.assess(body(schemas.session, req)));
  });

  // ── Account recovery ────────────────────────────────────────────────────────
  r.post('/recovery/start', (req, res) => {
    res.status(201).json(c.recovery.start(body(schemas.recoveryStart, req)));
  });
  r.post('/recovery/verify', async (req, res) => {
    res.json(await c.recovery.verify(body(schemas.recoveryVerify, req)));
  });

  // ── Demo tooling & analytics ────────────────────────────────────────────────
  r.get('/scenarios', (_req, res) => {
    res.json(listScenarios());
  });
  r.post('/simulator/run', async (req, res) => {
    const { scenario, flow } = body(schemas.simulate, req);
    res.json({ session: await c.verification.simulate(scenario, flow) });
  });
  r.get('/dashboard/metrics', (_req, res) => {
    res.json(c.dashboard.metrics());
  });

  return r;
}
