import type { RuntimeMode } from '@trustid/contracts';

/**
 * Runtime configuration. Provider credentials belong here (server-side only),
 * loaded from the environment or a secret manager — never from the client.
 */
const mode: RuntimeMode = process.env.TRUSTID_MODE === 'production' ? 'production' : 'demo';

export const env = {
  mode,
  port: Number(process.env.PORT ?? 4000),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:4200').split(','),
  mockLatencyMs: Number(process.env.MOCK_LATENCY_MS ?? 350),
  /** Sessions and derived scores live in memory only, and expire. */
  sessionTtlMinutes: Number(process.env.SESSION_TTL_MINUTES ?? 30),
  version: '0.1.0',
} as const;

export const isDemoMode = () => env.mode === 'demo';
