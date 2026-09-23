import type { LivenessChallengeId, LivenessResult } from '@trustid/contracts';
import { buildSignal } from '../../domain/signal-factory.js';
import type { LivenessInput, LivenessService } from '../provider-contracts.js';
import { check, profileFor, simulateLatency } from './mock-utils.js';

const CHALLENGES: { id: LivenessChallengeId; label: string }[] = [
  { id: 'LOOK', label: 'Look at the camera' },
  { id: 'TURN_LEFT', label: 'Turn your head left' },
  { id: 'TURN_RIGHT', label: 'Turn your head right' },
  { id: 'BLINK', label: 'Blink' },
];

export class MockLivenessService implements LivenessService {
  readonly name = 'mock-active-liveness@1.4';

  async verify(input: LivenessInput): Promise<LivenessResult> {
    await simulateLatency(1.2);
    const profile = profileFor(input);
    const p = profile.liveness;
    const score = profile.flowOverrides?.[input.flow]?.livenessScore ?? p.score;

    return {
      confidence: score,
      challenges: CHALLENGES.map((c) => {
        const failed = p.failedChallenges.includes(c.id);
        const skipped = !input.completedChallenges.includes(c.id);
        return {
          ...c,
          status: failed ? 'FAIL' : skipped ? 'WARNING' : 'PASS',
          detail: failed ? 'Response not physically plausible' : skipped ? 'Challenge not completed' : 'Natural response',
        };
      }),
      checks: [
        check('depth', '3D depth / parallax', p.depth),
        check('texture', 'Presentation-attack texture', p.texture),
        check('replay', 'Replay & injection detection', p.replay),
      ],
      signal: buildSignal('liveness', {
        score,
        confidence: p.confidence,
        explanation: score === p.score ? p.explanation : 'Liveness confidence is lower than expected for this user.',
        evidence: p.evidence,
        provider: this.name,
      }),
    };
  }
}
