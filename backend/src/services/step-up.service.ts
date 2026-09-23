import type { StepUpRequest, StepUpResult } from '@trustid/contracts';
import { ConflictError, HttpError } from '../api/errors.js';
import { getScenario } from '../domain/scenario-catalog.js';
import type { SessionStore } from '../store/session-store.js';
import type { DashboardService } from './dashboard.service.js';
import type { RiskAssessmentService } from './risk-assessment.service.js';

/** DEMO ONLY: the code shown in the UI. Production would use a real OTP / push provider. */
export const DEMO_OTP = '246810';

export class StepUpService {
  constructor(
    private readonly store: SessionStore,
    private readonly risk: RiskAssessmentService,
    private readonly dashboard: DashboardService,
  ) {}

  run(req: StepUpRequest): StepUpResult {
    const session = this.store.get(req.sessionId);
    const current = session.assessment;
    if (!current || current.decision !== 'ADDITIONAL_VERIFICATION') {
      throw new ConflictError('Additional verification is not required for this session.');
    }
    if (!current.stepUpOptions?.includes(req.method)) {
      throw new ConflictError(`Method ${req.method} is not allowed for this session.`);
    }

    const profile = getScenario(session.scenario).stepUp;
    const codeOk = req.method !== 'OTP_REGISTERED_PHONE' || req.code === DEMO_OTP;
    // A typo must not turn a genuine user into a rejection: let them retry.
    // Production: rate-limit attempts and expire codes after a few minutes.
    if (profile.succeeds && !codeOk) throw new HttpError(422, 'INVALID_CODE', 'The code entered is not valid. Please try again.');
    const success = profile.succeeds;
    const message = profile.message;

    // Re-score from the original signals plus the step-up outcome.
    const baseSignals = current.signals.filter((s) => s.id !== 'step_up');
    const assessment = this.risk.assess(baseSignals, { flow: session.flow, stepUp: { method: req.method, success } });
    const result: StepUpResult = { method: req.method, success, message, assessment };

    const updated = this.store.update(session.id, (x) => {
      x.assessment = assessment;
      x.stepUp = result;
      x.status = 'COMPLETED';
    });
    this.dashboard.record(updated);
    return result;
  }
}
