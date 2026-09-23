import type {
  AssessRiskRequest,
  ContextRiskResult,
  ContextSignalsRequest,
  DeepfakeRequest,
  DocumentVerificationRequest,
  FaceVerificationRequest,
  FlowType,
  LivenessRequest,
  RiskAssessment,
  RiskSignal,
  ScenarioId,
  StartVerificationRequest,
  VerificationSession,
} from '@trustid/contracts';
import { ConflictError } from '../api/errors.js';
import { isDemoMode } from '../config/env.js';
import type { Providers } from '../container.js';
import type { AnalysisContext } from '../providers/provider-contracts.js';
import type { SessionStore } from '../store/session-store.js';
import type { DashboardService } from './dashboard.service.js';
import type { RiskAssessmentService } from './risk-assessment.service.js';

const DEMO_CLIENT_CONTEXT = { userAgent: 'simulator', language: 'en-GB', timezone: 'Europe/Rome', screen: '1440x900' };

/** Orchestrates the verification steps. Holds no AI logic of its own. */
export class VerificationService {
  constructor(
    private readonly providers: Providers,
    private readonly store: SessionStore,
    private readonly risk: RiskAssessmentService,
    private readonly dashboard: DashboardService,
  ) {}

  start(req: StartVerificationRequest): VerificationSession {
    return this.store.create({ flow: 'ONBOARDING', scenario: req.scenario, applicant: req.applicant });
  }

  get(id: string) {
    return this.store.get(id);
  }

  async document(req: DocumentVerificationRequest) {
    const s = this.store.get(req.sessionId);
    const result = await this.providers.document.analyze({ ...this.ctx(s), media: req.media, documentType: req.documentType });
    this.store.update(s.id, (x) => (x.results.document = result));
    return result;
  }

  async face(req: FaceVerificationRequest) {
    const s = this.store.get(req.sessionId);
    const result = await this.providers.face.match({ ...this.ctx(s), media: req.media });
    this.store.update(s.id, (x) => (x.results.face = result));
    return result;
  }

  async liveness(req: LivenessRequest) {
    const s = this.store.get(req.sessionId);
    const result = await this.providers.liveness.verify({
      ...this.ctx(s),
      media: req.media,
      completedChallenges: req.completedChallenges,
    });
    this.store.update(s.id, (x) => (x.results.liveness = result));
    return result;
  }

  async deepfake(req: DeepfakeRequest) {
    const s = this.store.get(req.sessionId);
    const result = await this.providers.deepfake.analyze(this.ctx(s));
    this.store.update(s.id, (x) => (x.results.deepfake = result));
    return result;
  }

  async context(req: ContextSignalsRequest): Promise<ContextRiskResult> {
    const s = this.store.get(req.sessionId);
    const input = { ...this.ctx(s), clientContext: req.clientContext };
    const [device, behaviour] = await Promise.all([
      this.providers.device.assess(input),
      this.providers.behaviour.assess(input),
    ]);
    const result = { checks: [...device.checks, ...behaviour.checks], signals: [device.signal, ...behaviour.signals] };
    this.store.update(s.id, (x) => (x.results.context = result));
    return result;
  }

  assess(req: AssessRiskRequest): RiskAssessment {
    const s = this.store.get(req.sessionId);
    const signals = this.collectSignals(s);
    if (signals.length < 4) throw new ConflictError('Not enough signals collected to assess risk. Complete the verification steps first.');
    const assessment = this.risk.assess(signals, { flow: s.flow });
    const updated = this.store.update(s.id, (x) => {
      x.assessment = assessment;
      x.stepUp = undefined;
      x.status = assessment.decision === 'ADDITIONAL_VERIFICATION' ? 'STEP_UP_REQUIRED' : 'ASSESSED';
    });
    this.dashboard.record(updated);
    return assessment;
  }

  /**
   * Fraud Scenario Simulator: runs every provider for a scenario in one call.
   * Demo mode only.
   */
  async simulate(scenario: ScenarioId, flow: FlowType): Promise<VerificationSession> {
    if (!isDemoMode()) throw new ConflictError('The scenario simulator is disabled outside demo mode.');
    const session = this.store.create({
      flow,
      scenario,
      applicant: flow === 'ONBOARDING' ? { fullName: 'Demo Applicant', email: 'demo@trustid.ai', dateOfBirth: '1990-01-01', country: 'IT' } : undefined,
    });
    const media = { source: 'DEMO' as const };
    const ctx = this.ctx(session);
    const [document, face, liveness, deepfake, accountIdentity] = await Promise.all([
      flow === 'ONBOARDING' ? this.providers.document.analyze({ ...ctx, media, documentType: 'PASSPORT' }) : undefined,
      this.providers.face.match({ ...ctx, media }),
      this.providers.liveness.verify({ ...ctx, media, completedChallenges: ['LOOK', 'TURN_LEFT', 'TURN_RIGHT', 'BLINK'] }),
      this.providers.deepfake.analyze(ctx),
      flow === 'RECOVERY' ? this.providers.accountIdentity.verify(ctx) : undefined,
    ]);
    this.store.update(session.id, (x) => (x.results = { document, face, liveness, deepfake, accountIdentity }));
    await this.context({ sessionId: session.id, clientContext: DEMO_CLIENT_CONTEXT });
    this.assess({ sessionId: session.id });
    return this.store.get(session.id);
  }

  collectSignals(s: VerificationSession): RiskSignal[] {
    const r = s.results;
    return [
      r.document?.signal,
      ...(r.face?.signals ?? []),
      r.accountIdentity?.signal,
      r.liveness?.signal,
      r.deepfake?.signal,
      ...(r.context?.signals ?? []),
    ].filter((x): x is RiskSignal => !!x);
  }

  private ctx(s: VerificationSession): AnalysisContext {
    // The demo scenario only reaches providers in demo mode.
    return { sessionId: s.id, flow: s.flow, demoScenario: isDemoMode() ? s.scenario : undefined };
  }
}
