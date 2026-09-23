import type { AccountIdentityResult } from '@trustid/contracts';
import { buildSignal } from '../../domain/signal-factory.js';
import type { AccountIdentityService, AnalysisContext } from '../provider-contracts.js';
import { check, profileFor, simulateLatency } from './mock-utils.js';

export class MockAccountIdentityService implements AccountIdentityService {
  readonly name = 'mock-account-graph@1.0';

  async verify(input: AnalysisContext): Promise<AccountIdentityResult> {
    await simulateLatency(1);
    const p = profileFor(input).accountIdentity;
    return {
      checks: [
        check('email', 'Email on file', p.checks.email),
        check('history', 'Recovery history', p.checks.history),
        check('device', 'Known device', p.checks.device),
        check('sim_swap', 'SIM swap check', p.checks.simSwap),
        check('location', 'Login location', p.checks.location),
      ],
      signal: buildSignal('account_identity', {
        score: p.score, confidence: p.confidence, explanation: p.explanation, evidence: p.evidence, provider: this.name,
      }),
    };
  }
}
