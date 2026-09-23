import type { DeepfakeAnalysisResult } from '@trustid/contracts';
import { buildSignal } from '../../domain/signal-factory.js';
import type { AnalysisContext, DeepfakeDetectionService } from '../provider-contracts.js';
import { check, profileFor, simulateLatency } from './mock-utils.js';

export class MockDeepfakeDetectionService implements DeepfakeDetectionService {
  readonly name = 'mock-deepfake-ensemble@3.1';

  async analyze(input: AnalysisContext): Promise<DeepfakeAnalysisResult> {
    await simulateLatency(2);
    const p = profileFor(input).deepfake;
    const signal = buildSignal('deepfake', {
      score: p.score,
      confidence: p.confidence,
      explanation: p.explanation,
      evidence: p.evidence,
      provider: this.name,
    });

    return {
      probability: p.score,
      confidence: p.confidence,
      verdict: signal.status === 'FAIL' ? 'SYNTHETIC' : signal.status === 'WARNING' ? 'INCONCLUSIVE' : 'AUTHENTIC',
      checks: [
        check('face', 'Face consistency', p.checks.face),
        check('frame', 'Frame consistency', p.checks.frame),
        check('lighting', 'Lighting consistency', p.checks.lighting),
        check('texture', 'Texture analysis', p.checks.texture),
        check('motion', 'Motion consistency', p.checks.motion),
        check('artifacts', 'Synthetic artifact analysis', p.checks.artifacts),
      ],
      signal,
    };
  }
}
