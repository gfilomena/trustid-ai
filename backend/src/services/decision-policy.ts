import type { Decision, FlowType, RiskLevel, RiskSignal, SignalId, StepUpMethod } from '@trustid/contracts';

export interface PolicyInput {
  signals: RiskSignal[];
  overallScore: number;
  riskLevel: RiskLevel;
  flow: FlowType;
  stepUp?: { method: StepUpMethod; success: boolean };
}

export interface PolicyVerdict {
  decision: Decision;
  rule: string;
  headline: string;
  nextStep: string;
  stepUpOptions?: StepUpMethod[];
}

interface Rule {
  id: string;
  description: string;
  when: (i: PolicyInput, s: (id: SignalId) => RiskSignal | undefined) => boolean;
  then: (i: PolicyInput, s: (id: SignalId) => RiskSignal | undefined) => Omit<PolicyVerdict, 'rule'>;
}

const isFail = (s?: RiskSignal) => s?.status === 'FAIL';
const isPass = (s?: RiskSignal) => !s || s.status === 'PASS';

/**
 * Decision policy, kept separate from scoring: the score measures risk,
 * the policy decides the action. Principle: add friction only when needed,
 * never auto-reject what a human or a step-up could legitimately resolve.
 * Rules are evaluated in order; the first match wins.
 */
const RULES: Rule[] = [
  {
    id: 'R0-STEP_UP_FAILED',
    description: 'Additional verification failed',
    when: (i) => i.stepUp?.success === false,
    then: (i) => ({
      decision: 'REJECT',
      headline: i.flow === 'RECOVERY' ? 'Account recovery blocked' : 'Verification rejected',
      nextStep: 'The request was blocked and the legitimate owner has been notified on their registered channels.',
    }),
  },
  {
    id: 'R1-STEP_UP_PASSED',
    description: 'Step-up verification resolved the outstanding risk',
    when: (i) => i.stepUp?.success === true && !i.signals.some((s) => s.id !== 'step_up' && isFail(s)),
    then: (i) => ({
      decision: 'APPROVE',
      headline: i.flow === 'RECOVERY' ? 'Identity confirmed. Account recovery approved.' : 'Identity verified. Welcome aboard.',
      nextStep: i.flow === 'RECOVERY' ? 'Set a new password. Other sessions will be signed out.' : 'Your account is ready to use.',
    }),
  },
  {
    id: 'R2-BIOMETRIC_IDENTITY_MISMATCH',
    description: 'The presented face does not belong to the identity or account',
    when: (_i, s) => isFail(s('face_match')) || isFail(s('account_identity')),
    then: () => ({
      decision: 'REJECT',
      headline: 'Identity could not be confirmed',
      nextStep: 'The face presented does not match the identity holder. If you believe this is an error, visit a branch with your document.',
    }),
  },
  {
    id: 'R3-DOCUMENT_INVALID',
    description: 'Identity document failed authenticity checks',
    when: (_i, s) => isFail(s('document')),
    then: () => ({
      decision: 'REJECT',
      headline: 'Document could not be verified',
      nextStep: 'Please try again with a valid, unexpired identity document.',
    }),
  },
  {
    id: 'R4-PRESENTATION_ATTACK_SUSPECTED',
    description: 'Synthetic media or failed liveness: route to a human analyst (never auto-approve, never blind-reject)',
    when: (_i, s) => isFail(s('deepfake')) || isFail(s('liveness')),
    then: () => ({
      decision: 'MANUAL_REVIEW',
      headline: 'Verification under review',
      nextStep: 'A fraud specialist will review this application within 24 hours. No further action is needed right now.',
    }),
  },
  {
    id: 'R5-CONTEXT_RISK_STEP_UP',
    description: 'High risk driven by device/behaviour while biometrics passed: verify a registered channel instead of rejecting',
    when: (i, s) => i.riskLevel === 'HIGH' && isPass(s('face_match')) && isPass(s('liveness')) && isPass(s('deepfake')),
    then: (i) => ({
      decision: 'ADDITIONAL_VERIFICATION',
      headline: 'Additional verification required',
      nextStep:
        i.flow === 'RECOVERY'
          ? 'Confirm this request on a device or phone number already registered to the account.'
          : 'Confirm your phone number to continue.',
      stepUpOptions: ['BANK_APP_CONFIRMATION', 'OTP_REGISTERED_PHONE'],
    }),
  },
  {
    id: 'R6-HIGH_RISK_REVIEW',
    description: 'High overall risk',
    when: (i) => i.riskLevel === 'HIGH',
    then: () => ({
      decision: 'MANUAL_REVIEW',
      headline: 'Verification under review',
      nextStep: 'A fraud specialist will review this request within 24 hours.',
    }),
  },
  {
    id: 'R7-MEDIUM_RISK_STEP_UP',
    description: 'Medium risk: ask for one proportionate extra step',
    when: (i) => i.riskLevel === 'MEDIUM',
    then: (_i, s) => ({
      decision: 'ADDITIONAL_VERIFICATION',
      headline: 'Additional verification required',
      nextStep: 'One more quick step keeps your account safe. It takes less than 30 seconds.',
      stepUpOptions: isPass(s('liveness'))
        ? ['OTP_REGISTERED_PHONE', 'BANK_APP_CONFIRMATION']
        : ['OTP_REGISTERED_PHONE', 'ADDITIONAL_SELFIE'],
    }),
  },
  {
    id: 'R8-LOW_RISK_APPROVE',
    description: 'Low risk: frictionless approval',
    when: () => true,
    then: (i) => ({
      decision: 'APPROVE',
      headline: i.flow === 'RECOVERY' ? 'Identity confirmed. Account recovery approved.' : 'Identity verified. Welcome aboard.',
      nextStep: i.flow === 'RECOVERY' ? 'Set a new password to regain access.' : 'Your account is ready. No extra steps needed.',
    }),
  },
];

export class DecisionPolicy {
  decide(input: PolicyInput): PolicyVerdict {
    const byId = (id: SignalId) => input.signals.find((s) => s.id === id);
    const rule = RULES.find((r) => r.when(input, byId))!;
    return { ...rule.then(input, byId), rule: `${rule.id}: ${rule.description}` };
  }
}
