import type { RecoveryStartRequest, RecoveryVerifyRequest, VerificationSession } from '@trustid/contracts';
import { isDemoMode } from '../config/env.js';
import type { Providers } from '../container.js';
import type { SessionStore } from '../store/session-store.js';

const maskEmail = (email: string) => {
  const [user = '', domain = ''] = email.split('@');
  return `${user.slice(0, 1)}${'•'.repeat(Math.max(2, user.length - 1))}@${domain}`;
};

export class RecoveryService {
  constructor(
    private readonly providers: Providers,
    private readonly store: SessionStore,
  ) {}

  /**
   * Starts an account-recovery session. In production the lookup must not
   * reveal whether an email exists (anti-enumeration: same response and timing).
   */
  start(req: RecoveryStartRequest): VerificationSession {
    return this.store.create({
      flow: 'RECOVERY',
      scenario: req.scenario,
      account: {
        maskedEmail: maskEmail(req.email),
        maskedPhone: '+39 ••• ••• ••42',
        customerSince: '2019',
        knownDevices: 2,
        lastLoginLocation: 'Milan, IT',
      },
    });
  }

  async verify(req: RecoveryVerifyRequest) {
    const s = this.store.get(req.sessionId);
    const result = await this.providers.accountIdentity.verify({
      sessionId: s.id,
      flow: s.flow,
      demoScenario: isDemoMode() ? s.scenario : undefined,
    });
    this.store.update(s.id, (x) => (x.results.accountIdentity = result));
    return result;
  }
}
