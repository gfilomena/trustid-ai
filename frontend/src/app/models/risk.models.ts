import type { Decision, RiskLevel, ScenarioId, SignalStatus, StepUpMethod } from '@trustid/contracts';

export type Tone = 'pass' | 'warn' | 'fail' | 'brand';

export const statusTone = (s: SignalStatus): Tone => (s === 'PASS' ? 'pass' : s === 'WARNING' ? 'warn' : 'fail');

export const levelTone = (l: RiskLevel): Tone => (l === 'LOW' ? 'pass' : l === 'MEDIUM' ? 'warn' : 'fail');

export const DECISION_META: Record<Decision, { label: string; tone: Tone; icon: string }> = {
  APPROVE: { label: 'Approved', tone: 'pass', icon: '✓' },
  ADDITIONAL_VERIFICATION: { label: 'Additional verification', tone: 'warn', icon: '↻' },
  MANUAL_REVIEW: { label: 'Manual review', tone: 'fail', icon: '⚑' },
  REJECT: { label: 'Rejected', tone: 'fail', icon: '✕' },
};

export const STEP_UP_META: Record<StepUpMethod, { label: string; description: string; icon: string }> = {
  OTP_REGISTERED_PHONE: { label: 'One-time code', description: 'We send a 6-digit code to your registered phone.', icon: '#' },
  BANK_APP_CONFIRMATION: { label: 'Confirm in banking app', description: 'Approve the request on a device already linked to the account.', icon: '⎚' },
  ADDITIONAL_SELFIE: { label: 'Additional selfie', description: 'One more selfie in better lighting.', icon: '◉' },
  ADDITIONAL_DOCUMENT: { label: 'Additional document', description: 'Upload a second identity document.', icon: '▤' },
};

/** Demo personas pre-filled in the onboarding form for each scenario. */
export const DEMO_PERSONAS: Record<ScenarioId, { fullName: string; email: string; dateOfBirth: string; country: string; phone: string }> = {
  LEGITIMATE: { fullName: 'Giulia Bianchi', email: 'giulia.bianchi@mail.it', dateOfBirth: '1991-03-14', country: 'Italy', phone: '+39 347 555 0142' },
  DEEPFAKE_ATTACK: { fullName: 'Marco Ferri', email: 'm.ferri.acct@proton.me', dateOfBirth: '1986-09-02', country: 'Italy', phone: '+39 351 555 0917' },
  STOLEN_IDENTITY: { fullName: 'Elena Russo', email: 'elena.russo.88@gmail.com', dateOfBirth: '1972-06-30', country: 'Italy', phone: '+39 320 555 0381' },
  SUSPICIOUS_DEVICE: { fullName: 'Luca Moretti', email: 'luca.moretti@outlook.com', dateOfBirth: '1995-01-09', country: 'Italy', phone: '+39 333 555 0764' },
  ACCOUNT_TAKEOVER: { fullName: 'Sara Conti', email: 'sara.conti@mail.it', dateOfBirth: '1989-11-21', country: 'Italy', phone: '+39 348 555 0229' },
};

export const SCENARIO_ICONS: Record<ScenarioId, string> = {
  LEGITIMATE: '✓',
  DEEPFAKE_ATTACK: '◐',
  STOLEN_IDENTITY: '⊘',
  SUSPICIOUS_DEVICE: '⌬',
  ACCOUNT_TAKEOVER: '⚿',
};
