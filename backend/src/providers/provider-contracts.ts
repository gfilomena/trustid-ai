import type {
  AccountIdentityResult,
  ClientContext,
  ContextRiskResult,
  DeepfakeAnalysisResult,
  DocumentAnalysisResult,
  DocumentType,
  FaceMatchResult,
  FlowType,
  LivenessChallengeId,
  LivenessResult,
  MediaMetadata,
  RiskSignal,
  ScenarioId,
  SubCheck,
} from '@trustid/contracts';

/**
 * Provider ports. Every AI / risk capability is behind one of these interfaces
 * and resolved through the container, so a Mock* implementation can be swapped
 * for a real vendor (document AI, biometric SDK, deepfake API, device
 * intelligence) without touching the orchestration or the risk engine.
 */

/**
 * Common context for every analysis call.
 * `demoScenario` is only honoured by mock providers; real providers must ignore it.
 */
export interface AnalysisContext {
  sessionId: string;
  flow: FlowType;
  demoScenario?: ScenarioId;
}

export interface MediaInput extends AnalysisContext {
  /**
   * Metadata only. A real integration would receive a short-lived, encrypted
   * object-storage reference (or a stream) — never persist the raw bytes here.
   */
  media: MediaMetadata;
}

export interface DocumentInput extends MediaInput {
  documentType: DocumentType;
}

export interface LivenessInput extends MediaInput {
  completedChallenges: LivenessChallengeId[];
}

export interface ContextInput extends AnalysisContext {
  clientContext: ClientContext;
}

export interface DocumentVerificationService {
  readonly name: string;
  analyze(input: DocumentInput): Promise<DocumentAnalysisResult>;
}

export interface FaceMatchService {
  readonly name: string;
  /** Onboarding: selfie vs document portrait. Recovery: selfie vs enrolled template. */
  match(input: MediaInput): Promise<FaceMatchResult>;
}

export interface LivenessService {
  readonly name: string;
  verify(input: LivenessInput): Promise<LivenessResult>;
}

export interface DeepfakeDetectionService {
  readonly name: string;
  analyze(input: AnalysisContext): Promise<DeepfakeAnalysisResult>;
}

export interface DeviceRiskService {
  readonly name: string;
  assess(input: ContextInput): Promise<{ checks: SubCheck[]; signal: RiskSignal }>;
}

export interface BehaviourRiskService {
  readonly name: string;
  /** Returns behavioural-anomaly and velocity signals. */
  assess(input: ContextInput): Promise<{ checks: SubCheck[]; signals: RiskSignal[] }>;
}

export interface AccountIdentityService {
  readonly name: string;
  verify(input: AnalysisContext): Promise<AccountIdentityResult>;
}

export type { ContextRiskResult };
