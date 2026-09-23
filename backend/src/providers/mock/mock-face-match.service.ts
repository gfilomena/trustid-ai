import type { FaceMatchResult } from '@trustid/contracts';
import { buildSignal } from '../../domain/signal-factory.js';
import type { FaceMatchService, MediaInput } from '../provider-contracts.js';
import { check, profileFor, simulateLatency } from './mock-utils.js';

export class MockFaceMatchService implements FaceMatchService {
  readonly name = 'mock-face-match@2.0';

  async match(input: MediaInput): Promise<FaceMatchResult> {
    await simulateLatency(1.2);
    const profile = profileFor(input);
    const p = profile.face;
    const reference = input.flow === 'RECOVERY' ? 'enrolled biometric template' : 'document portrait';

    const faceSignal = buildSignal('face_match', {
      score: p.score,
      confidence: p.confidence,
      explanation: p.explanation,
      evidence: [`Compared against ${reference}`, ...p.evidence],
      provider: this.name,
    });

    // Identity consistency is an onboarding signal (applicant vs document vs sources).
    // In recovery, account ownership is assessed by AccountIdentityService instead.
    const signals = [faceSignal];
    if (input.flow === 'ONBOARDING') {
      const ic = profile.identityConsistency;
      signals.push(
        buildSignal('identity_consistency', {
          score: ic.score,
          confidence: ic.confidence,
          explanation: ic.explanation,
          evidence: ic.evidence,
          provider: 'mock-identity-graph@1.0',
        }),
      );
    }

    return {
      faceDetected: true,
      matchScore: p.score,
      identityConsistency: profile.identityConsistency.score,
      checks: [
        check('detected', 'Face detected', { status: 'PASS', detail: 'Exactly one face in frame' }),
        check('quality', 'Capture quality', p.quality),
        check('reference', 'Reference comparison', p.reference),
      ],
      signals,
    };
  }
}
