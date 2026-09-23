import { randomUUID } from 'node:crypto';
import type { VerificationSession } from '@trustid/contracts';
import { NotFoundError } from '../api/errors.js';

/**
 * In-memory, TTL-bound session store.
 *
 * Privacy by design: only derived scores and masked fields are held — never
 * document images, selfies or biometric templates — and everything expires.
 * Production: replace with an encrypted store (e.g. Redis with TLS + at-rest
 * encryption), per-tenant keys and an audit log of every decision.
 */
export class SessionStore {
  private readonly sessions = new Map<string, VerificationSession>();

  constructor(private readonly ttlMinutes: number) {
    setInterval(() => this.purgeExpired(), 60_000).unref();
  }

  create(init: Omit<VerificationSession, 'id' | 'createdAt' | 'expiresAt' | 'status' | 'results'>): VerificationSession {
    const now = Date.now();
    const session: VerificationSession = {
      ...init,
      id: `vrf_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      status: 'IN_PROGRESS',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.ttlMinutes * 60_000).toISOString(),
      results: {},
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): VerificationSession {
    const session = this.sessions.get(id);
    if (!session || Date.parse(session.expiresAt) < Date.now()) {
      throw new NotFoundError(`Verification session ${id} not found or expired`);
    }
    return session;
  }

  update(id: string, mutate: (s: VerificationSession) => void): VerificationSession {
    const session = this.get(id);
    mutate(session);
    return session;
  }

  private purgeExpired() {
    const now = Date.now();
    for (const [id, s] of this.sessions) if (Date.parse(s.expiresAt) < now) this.sessions.delete(id);
  }
}
