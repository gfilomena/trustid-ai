import { buildSignal } from '../../domain/signal-factory.js';
import type { BehaviourRiskService, ContextInput } from '../provider-contracts.js';
import { check, profileFor, simulateLatency } from './mock-utils.js';

export class MockBehaviourRiskService implements BehaviourRiskService {
  readonly name = 'mock-behavioural-biometrics@0.9';

  async assess(input: ContextInput) {
    await simulateLatency(0.8);
    const profile = profileFor(input);
    const b = profile.behaviour;
    const v = profile.velocity;
    const behaviourScore = profile.flowOverrides?.[input.flow]?.behaviourScore ?? b.score;
    const behaviour = buildSignal('behaviour', {
      score: behaviourScore, confidence: b.confidence, explanation: b.explanation, evidence: b.evidence, provider: this.name,
    });
    const velocity = buildSignal('velocity', {
      score: v.score, confidence: v.confidence, explanation: v.explanation, evidence: v.evidence, provider: 'mock-velocity@1.0',
    });

    return {
      checks: [
        check('behaviour_anomaly', 'Behaviour anomaly', { status: behaviour.status, score: behaviour.score, detail: b.evidence[0] ?? b.explanation }),
        check('velocity', 'Velocity check', { status: velocity.status, score: velocity.score, detail: v.evidence[0] ?? v.explanation }),
      ],
      signals: [behaviour, velocity],
    };
  }
}
