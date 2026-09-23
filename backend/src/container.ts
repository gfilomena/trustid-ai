import { env } from './config/env.js';
import { MockAccountIdentityService } from './providers/mock/mock-account-identity.service.js';
import { MockBehaviourRiskService } from './providers/mock/mock-behaviour-risk.service.js';
import { MockDeepfakeDetectionService } from './providers/mock/mock-deepfake-detection.service.js';
import { MockDeviceRiskService } from './providers/mock/mock-device-risk.service.js';
import { MockDocumentVerificationService } from './providers/mock/mock-document-verification.service.js';
import { MockFaceMatchService } from './providers/mock/mock-face-match.service.js';
import { MockLivenessService } from './providers/mock/mock-liveness.service.js';
import type {
  AccountIdentityService,
  BehaviourRiskService,
  DeepfakeDetectionService,
  DeviceRiskService,
  DocumentVerificationService,
  FaceMatchService,
  LivenessService,
} from './providers/provider-contracts.js';
import { DashboardService } from './services/dashboard.service.js';
import { DecisionPolicy } from './services/decision-policy.js';
import { RecoveryService } from './services/recovery.service.js';
import { RiskAssessmentService } from './services/risk-assessment.service.js';
import { StepUpService } from './services/step-up.service.js';
import { VerificationService } from './services/verification.service.js';
import { SessionStore } from './store/session-store.js';

export interface Providers {
  document: DocumentVerificationService;
  face: FaceMatchService;
  liveness: LivenessService;
  deepfake: DeepfakeDetectionService;
  device: DeviceRiskService;
  behaviour: BehaviourRiskService;
  accountIdentity: AccountIdentityService;
}

/**
 * Composition root (manual constructor injection). To go live, replace the
 * Mock* bindings with real adapters, e.g.
 *   deepfake: new HttpDeepfakeDetectionService(process.env.DEEPFAKE_URL!, secrets.get('DEEPFAKE_KEY'))
 */
function createProviders(): Providers {
  if (env.mode === 'production') {
    throw new Error(
      'TRUSTID_MODE=production requires real provider adapters. Bind them in src/container.ts ' +
        '(see providers/real/http-deepfake-detection.service.ts). Refusing to start with mocks.',
    );
  }
  return {
    document: new MockDocumentVerificationService(),
    face: new MockFaceMatchService(),
    liveness: new MockLivenessService(),
    deepfake: new MockDeepfakeDetectionService(),
    device: new MockDeviceRiskService(),
    behaviour: new MockBehaviourRiskService(),
    accountIdentity: new MockAccountIdentityService(),
  };
}

export function createContainer() {
  const providers = createProviders();
  const store = new SessionStore(env.sessionTtlMinutes);
  const riskAssessment = new RiskAssessmentService(new DecisionPolicy());
  const dashboard = new DashboardService();
  const verification = new VerificationService(providers, store, riskAssessment, dashboard);
  const recovery = new RecoveryService(providers, store);
  const stepUp = new StepUpService(store, riskAssessment, dashboard);
  return { providers, store, riskAssessment, dashboard, verification, recovery, stepUp };
}

export type Container = ReturnType<typeof createContainer>;
