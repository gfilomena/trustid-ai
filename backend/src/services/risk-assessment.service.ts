import type { FlowType, RiskAssessment, RiskFactor, RiskLevel, RiskSignal, StepUpMethod } from '@trustid/contracts';
import { SIGNAL_DEFINITIONS, type EvidenceGroup } from '../domain/signal-definitions.js';
import { buildSignal } from '../domain/signal-factory.js';
import type { DecisionPolicy } from './decision-policy.js';

export interface AssessmentOptions {
  flow: FlowType;
  stepUp?: { method: StepUpMethod; success: boolean };
}

/** Tunables of the fusion model, kept together so they can be calibrated on labelled data. */
const MODEL = {
  version: 'trustid-risk-fusion@0.3 (demo calibration)',
  /** > 1 dampens weak noise so a clean profile stays near zero. */
  gamma: 1.1,
  /** 0 = only the strongest signal in a correlated group counts, 1 = fully independent. */
  intraGroupCorrelation: 0.5,
  /** A verified possession factor strongly reduces device/behaviour novelty risk. */
  stepUpContextDiscount: 0.35,
  levels: { lowMax: 30, mediumMax: 70 },
} as const;

/**
 * Multi-signal identity risk engine.
 *
 * 1. Each signal carries evidence e = weight × (risk/100)^γ.
 * 2. Signals are grouped into correlated evidence families (media integrity,
 *    identity, context). Inside a family: strongest + partial noisy-OR, so
 *    a deepfake degrading both liveness and deepfake scores is not double counted.
 * 3. Families are combined with noisy-OR: independent red flags compound and
 *    a single strong indicator is never averaged away.
 * 4. The score is mapped to a level; the DecisionPolicy picks the action.
 */
export class RiskAssessmentService {
  constructor(private readonly policy: DecisionPolicy) {}

  assess(inputSignals: RiskSignal[], options: AssessmentOptions): RiskAssessment {
    const signals = [...inputSignals];
    if (options.stepUp) {
      signals.push(
        buildSignal('step_up', {
          score: options.stepUp.success ? 97 : 4,
          confidence: 97,
          explanation: options.stepUp.success
            ? 'Additional verification succeeded on a trusted channel.'
            : 'Additional verification failed or was rejected by the account owner.',
          evidence: [`Method: ${options.stepUp.method}`],
          provider: 'trustid-step-up@1.0',
        }),
      );
    }

    const evidence = new Map(signals.map((s) => [s.id, this.evidenceOf(s, options)]));
    const overallScore = Math.round(100 * this.fuse(signals, evidence));
    const riskLevel = this.levelFor(overallScore);
    const verdict = this.policy.decide({ signals, overallScore, riskLevel, flow: options.flow, stepUp: options.stepUp });

    return {
      overallScore,
      riskLevel,
      decision: verdict.decision,
      signals,
      reasons: this.reasons(signals, evidence),
      factors: this.factors(signals, evidence),
      confidence: this.confidence(signals),
      decisionRule: verdict.rule,
      headline: verdict.headline,
      nextStep: verdict.nextStep,
      stepUpOptions: verdict.stepUpOptions,
      timestamp: new Date().toISOString(),
      modelVersion: MODEL.version,
    };
  }

  levelFor(score: number): RiskLevel {
    if (score <= MODEL.levels.lowMax) return 'LOW';
    return score <= MODEL.levels.mediumMax ? 'MEDIUM' : 'HIGH';
  }

  private evidenceOf(signal: RiskSignal, options: AssessmentOptions): number {
    const def = SIGNAL_DEFINITIONS[signal.id];
    let e = def.weight * Math.pow(signal.riskContribution / 100, MODEL.gamma);
    if (options.stepUp?.success && def.group === 'CONTEXT') e *= MODEL.stepUpContextDiscount;
    return e;
  }

  private fuse(signals: RiskSignal[], evidence: Map<string, number>): number {
    const groups = new Map<EvidenceGroup, number[]>();
    for (const s of signals) {
      const group = SIGNAL_DEFINITIONS[s.id].group;
      groups.set(group, [...(groups.get(group) ?? []), evidence.get(s.id) ?? 0]);
    }
    let survival = 1;
    for (const values of groups.values()) {
      const strongest = Math.max(...values);
      const independent = 1 - values.reduce((acc, v) => acc * (1 - v), 1);
      survival *= 1 - (strongest + MODEL.intraGroupCorrelation * (independent - strongest));
    }
    return 1 - survival;
  }

  /** Weighted mean of signal confidences, by signal reliability. */
  private confidence(signals: RiskSignal[]): number {
    const totalWeight = signals.reduce((a, s) => a + SIGNAL_DEFINITIONS[s.id].weight, 0);
    const weighted = signals.reduce((a, s) => a + s.confidence * SIGNAL_DEFINITIONS[s.id].weight, 0);
    return Math.round(weighted / totalWeight);
  }

  /**
   * INCREASES_RISK weight = share of the total evidence mass.
   * REDUCES_RISK weight   = how strongly the healthy signal vouches (reliability × score).
   */
  private factors(signals: RiskSignal[], evidence: Map<string, number>): RiskFactor[] {
    const risky = signals.filter((s) => s.status !== 'PASS');
    const mass = risky.reduce((a, s) => a + (evidence.get(s.id) ?? 0), 0) || 1;
    const increases: RiskFactor[] = risky
      .map((s) => ({
        signalId: s.id,
        label: s.explanation,
        impact: 'INCREASES_RISK' as const,
        weight: Math.round((100 * (evidence.get(s.id) ?? 0)) / mass),
      }))
      .sort((a, b) => b.weight - a.weight);
    const reduces: RiskFactor[] = signals
      .filter((s) => s.status === 'PASS')
      .map((s) => ({
        signalId: s.id,
        label: SIGNAL_DEFINITIONS[s.id].positiveReason,
        impact: 'REDUCES_RISK' as const,
        weight: Math.round(SIGNAL_DEFINITIONS[s.id].weight * s.score),
      }))
      .sort((a, b) => b.weight - a.weight);
    return [...increases, ...reduces];
  }

  private reasons(signals: RiskSignal[], evidence: Map<string, number>): string[] {
    const factors = this.factors(signals, evidence);
    const negatives = factors.filter((f) => f.impact === 'INCREASES_RISK').map((f) => f.label);
    const positives = factors.filter((f) => f.impact === 'REDUCES_RISK').map((f) => f.label);
    return [...negatives, ...positives.slice(0, negatives.length ? 3 : 4)];
  }
}
