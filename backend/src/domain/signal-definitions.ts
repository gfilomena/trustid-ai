import type { ScorePolarity, SignalCategory, SignalId, SignalStatus } from '@trustid/contracts';

/**
 * Evidence families. Signals inside one family are correlated (for example, a
 * replayed deepfake video degrades BOTH liveness and deepfake scores), so the
 * risk engine must not count them as independent evidence.
 */
export type EvidenceGroup = 'MEDIA_INTEGRITY' | 'IDENTITY' | 'CONTEXT' | 'STEP_UP';

export interface SignalDefinition {
  id: SignalId;
  name: string;
  category: SignalCategory;
  polarity: ScorePolarity;
  group: EvidenceGroup;
  /** Reliability of the signal as fraud evidence (0–1). */
  weight: number;
  /**
   * For TRUST polarity: score >= pass → PASS, >= warn → WARNING, else FAIL.
   * For RISK polarity:  score <= pass → PASS, <= warn → WARNING, else FAIL.
   */
  thresholds: { pass: number; warn: number };
  /** Short sentence used by the explainability layer when the signal is healthy. */
  positiveReason: string;
}

export const SIGNAL_DEFINITIONS: Record<SignalId, SignalDefinition> = {
  document: {
    id: 'document', name: 'Document Verification', category: 'DOCUMENT', polarity: 'TRUST',
    group: 'IDENTITY', weight: 0.6, thresholds: { pass: 85, warn: 60 },
    positiveReason: 'Identity document is authentic and machine-readable',
  },
  face_match: {
    id: 'face_match', name: 'Face Match', category: 'BIOMETRIC', polarity: 'TRUST',
    group: 'IDENTITY', weight: 0.72, thresholds: { pass: 85, warn: 60 },
    positiveReason: 'Face match against the reference image is strong',
  },
  identity_consistency: {
    id: 'identity_consistency', name: 'Identity Consistency', category: 'IDENTITY', polarity: 'TRUST',
    group: 'IDENTITY', weight: 0.5, thresholds: { pass: 85, warn: 60 },
    positiveReason: 'Applicant data is consistent across document and trusted sources',
  },
  account_identity: {
    id: 'account_identity', name: 'Account Ownership', category: 'IDENTITY', polarity: 'TRUST',
    group: 'IDENTITY', weight: 0.6, thresholds: { pass: 85, warn: 60 },
    positiveReason: 'Recovery request is consistent with the account history',
  },
  liveness: {
    id: 'liveness', name: 'Liveness Detection', category: 'LIVENESS', polarity: 'TRUST',
    group: 'MEDIA_INTEGRITY', weight: 0.6, thresholds: { pass: 80, warn: 60 },
    positiveReason: 'Liveness passed: a real person is present in front of the camera',
  },
  deepfake: {
    id: 'deepfake', name: 'Deepfake Detection', category: 'SYNTHETIC_MEDIA', polarity: 'RISK',
    group: 'MEDIA_INTEGRITY', weight: 0.78, thresholds: { pass: 30, warn: 69 },
    positiveReason: 'No significant deepfake or synthetic-media indicators',
  },
  device: {
    id: 'device', name: 'Device Risk', category: 'DEVICE', polarity: 'RISK',
    group: 'CONTEXT', weight: 0.62, thresholds: { pass: 34, warn: 89 },
    positiveReason: 'Device and network have a clean reputation',
  },
  behaviour: {
    id: 'behaviour', name: 'Behavioural Anomaly', category: 'BEHAVIOUR', polarity: 'RISK',
    group: 'CONTEXT', weight: 0.55, thresholds: { pass: 34, warn: 89 },
    positiveReason: 'Interaction patterns are consistent with a genuine human user',
  },
  velocity: {
    id: 'velocity', name: 'Velocity Check', category: 'BEHAVIOUR', polarity: 'RISK',
    group: 'CONTEXT', weight: 0.5, thresholds: { pass: 34, warn: 89 },
    positiveReason: 'Normal attempt velocity for this identity and device',
  },
  step_up: {
    id: 'step_up', name: 'Step-up Verification', category: 'IDENTITY', polarity: 'TRUST',
    group: 'STEP_UP', weight: 0.9, thresholds: { pass: 85, warn: 60 },
    positiveReason: 'Additional verification completed on a trusted channel',
  },
};

export function statusFor(id: SignalId, score: number): SignalStatus {
  const { polarity, thresholds } = SIGNAL_DEFINITIONS[id];
  if (polarity === 'TRUST') {
    if (score >= thresholds.pass) return 'PASS';
    return score >= thresholds.warn ? 'WARNING' : 'FAIL';
  }
  if (score <= thresholds.pass) return 'PASS';
  return score <= thresholds.warn ? 'WARNING' : 'FAIL';
}

export function riskContributionFor(id: SignalId, score: number): number {
  return SIGNAL_DEFINITIONS[id].polarity === 'TRUST' ? 100 - score : score;
}
