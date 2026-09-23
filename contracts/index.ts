/**
 * TrustID AI — shared API contracts.
 *
 * Single source of truth for every DTO exchanged between the Angular client and
 * the Node backend. Both projects import this file through the `@trustid/contracts`
 * path alias, so a contract change breaks the build on both sides at once.
 *
 * Type-only module: it must not contain runtime code.
 */

// ─── Primitives ────────────────────────────────────────────────────────────────

export type SignalStatus = 'PASS' | 'WARNING' | 'FAIL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Decision = 'APPROVE' | 'ADDITIONAL_VERIFICATION' | 'MANUAL_REVIEW' | 'REJECT';
export type FlowType = 'ONBOARDING' | 'RECOVERY';
export type RuntimeMode = 'demo' | 'production';

export type ScenarioId =
  | 'LEGITIMATE'
  | 'DEEPFAKE_ATTACK'
  | 'STOLEN_IDENTITY'
  | 'SUSPICIOUS_DEVICE'
  | 'ACCOUNT_TAKEOVER';

export type SignalCategory =
  | 'DOCUMENT'
  | 'BIOMETRIC'
  | 'LIVENESS'
  | 'SYNTHETIC_MEDIA'
  | 'DEVICE'
  | 'BEHAVIOUR'
  | 'IDENTITY';

export type SignalId =
  | 'document'
  | 'face_match'
  | 'liveness'
  | 'deepfake'
  | 'device'
  | 'behaviour'
  | 'velocity'
  | 'identity_consistency'
  | 'account_identity'
  | 'step_up';

/**
 * How to read `score`:
 * - TRUST: higher is better (e.g. document authenticity 96%).
 * - RISK:  higher is worse  (e.g. deepfake probability 87%).
 * `riskContribution` is always normalised to "higher is worse".
 */
export type ScorePolarity = 'TRUST' | 'RISK';

export interface RiskSignal {
  id: SignalId;
  name: string;
  category: SignalCategory;
  score: number;
  confidence: number;
  status: SignalStatus;
  explanation: string;
  evidence?: string[];
  polarity: ScorePolarity;
  /** 0–100, normalised risk this signal carries (higher = riskier). */
  riskContribution: number;
  /** Which provider produced the signal, e.g. "mock-deepfake@1.0". */
  provider: string;
}

/** A granular check that feeds a signal (e.g. "Lighting consistency"). */
export interface SubCheck {
  id: string;
  label: string;
  status: SignalStatus;
  score?: number;
  detail: string;
}

export interface RiskFactor {
  signalId: SignalId;
  label: string;
  impact: 'INCREASES_RISK' | 'REDUCES_RISK';
  /** Share of the overall risk explained by this factor (0–100). */
  weight: number;
}

export interface RiskAssessment {
  overallScore: number;
  riskLevel: RiskLevel;
  decision: Decision;
  signals: RiskSignal[];
  reasons: string[];
  confidence: number;
  timestamp: string;
  /** Structured version of `reasons` for richer rendering. */
  factors: RiskFactor[];
  /** Human-readable policy rule that produced the decision. */
  decisionRule: string;
  headline: string;
  nextStep: string;
  /** Present when the decision asks the user to do something more. */
  stepUpOptions?: StepUpMethod[];
  modelVersion: string;
}

// ─── Session ───────────────────────────────────────────────────────────────────

export interface ApplicantInfo {
  fullName: string;
  email: string;
  dateOfBirth: string;
  country: string;
  phone?: string;
}

/** Non-identifying client telemetry used by device & behaviour models. */
export interface ClientContext {
  userAgent: string;
  language: string;
  timezone: string;
  screen: string;
  /** Seconds the user spent filling in the personal-information form. */
  formFillSeconds?: number;
  pasteEvents?: number;
  keystrokes?: number;
}

export type VerificationStatus =
  | 'IN_PROGRESS'
  | 'ASSESSED'
  | 'STEP_UP_REQUIRED'
  | 'COMPLETED';

export interface VerificationSession {
  id: string;
  flow: FlowType;
  scenario: ScenarioId;
  status: VerificationStatus;
  createdAt: string;
  expiresAt: string;
  applicant?: ApplicantInfo;
  account?: RecoveryAccountSummary;
  results: VerificationResults;
  assessment?: RiskAssessment;
  stepUp?: StepUpResult;
}

export interface VerificationResults {
  document?: DocumentAnalysisResult;
  face?: FaceMatchResult;
  liveness?: LivenessResult;
  deepfake?: DeepfakeAnalysisResult;
  context?: ContextRiskResult;
  accountIdentity?: AccountIdentityResult;
}

// ─── Step DTOs ─────────────────────────────────────────────────────────────────

export type DocumentType = 'PASSPORT' | 'ID_CARD' | 'DRIVERS_LICENSE';

/** Only metadata leaves the browser in demo mode: never the image itself. */
export interface MediaMetadata {
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  source: 'UPLOAD' | 'CAMERA' | 'DEMO';
  frameCount?: number;
}

export interface StartVerificationRequest {
  scenario: ScenarioId;
  applicant: ApplicantInfo;
  clientContext: ClientContext;
}

export interface DocumentVerificationRequest {
  sessionId: string;
  documentType: DocumentType;
  media: MediaMetadata;
}

export interface DocumentAnalysisResult {
  detected: boolean;
  documentType: DocumentType;
  issuingCountry: string;
  ocrStatus: SignalStatus;
  authenticity: number;
  dataConsistency: number;
  extractedFields: { label: string; value: string }[];
  checks: SubCheck[];
  signal: RiskSignal;
}

export interface FaceVerificationRequest {
  sessionId: string;
  media: MediaMetadata;
}

export interface FaceMatchResult {
  faceDetected: boolean;
  matchScore: number;
  identityConsistency: number;
  checks: SubCheck[];
  signals: RiskSignal[];
}

export type LivenessChallengeId = 'LOOK' | 'TURN_LEFT' | 'TURN_RIGHT' | 'BLINK';

export interface LivenessRequest {
  sessionId: string;
  completedChallenges: LivenessChallengeId[];
  media: MediaMetadata;
}

export interface LivenessResult {
  confidence: number;
  challenges: { id: LivenessChallengeId; label: string; status: SignalStatus; detail: string }[];
  checks: SubCheck[];
  signal: RiskSignal;
}

export interface DeepfakeRequest {
  sessionId: string;
}

export interface DeepfakeAnalysisResult {
  probability: number;
  confidence: number;
  verdict: 'AUTHENTIC' | 'INCONCLUSIVE' | 'SYNTHETIC';
  checks: SubCheck[];
  signal: RiskSignal;
}

export interface ContextSignalsRequest {
  sessionId: string;
  clientContext: ClientContext;
}

export interface ContextRiskResult {
  checks: SubCheck[];
  signals: RiskSignal[];
}

export interface AssessRiskRequest {
  sessionId: string;
}

// ─── Step-up (additional verification) ─────────────────────────────────────────

export type StepUpMethod = 'OTP_REGISTERED_PHONE' | 'ADDITIONAL_SELFIE' | 'ADDITIONAL_DOCUMENT' | 'BANK_APP_CONFIRMATION';

export interface StepUpRequest {
  sessionId: string;
  method: StepUpMethod;
  /** Demo OTP entered by the user. */
  code?: string;
}

export interface StepUpResult {
  method: StepUpMethod;
  success: boolean;
  message: string;
  assessment: RiskAssessment;
}

// ─── Account recovery ─────────────────────────────────────────────────────────

export interface RecoveryStartRequest {
  email: string;
  scenario: ScenarioId;
  clientContext: ClientContext;
}

export interface RecoveryAccountSummary {
  maskedEmail: string;
  maskedPhone: string;
  customerSince: string;
  knownDevices: number;
  lastLoginLocation: string;
}

export interface RecoveryVerifyRequest {
  sessionId: string;
  lastKnownLocation?: string;
}

export interface AccountIdentityResult {
  checks: SubCheck[];
  signal: RiskSignal;
}

// ─── Scenarios & simulator ─────────────────────────────────────────────────────

export interface ScenarioSummary {
  id: ScenarioId;
  label: string;
  description: string;
  attackVector: string;
  expectedDecision: Decision;
  recommendedFlow: FlowType;
}

export interface SimulationRequest {
  scenario: ScenarioId;
  flow: FlowType;
}

export interface SimulationResult {
  session: VerificationSession;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardCase {
  id: string;
  time: string;
  user: string;
  flow: FlowType;
  risk: number;
  riskLevel: RiskLevel;
  mainSignal: string;
  decision: Decision;
  live: boolean;
}

export interface DashboardMetrics {
  totals: {
    attempts: number;
    approved: number;
    additionalVerification: number;
    manualReview: number;
    rejected: number;
  };
  averageRiskScore: number;
  deepfakeDetectionRate: number;
  suspiciousDeviceRate: number;
  verificationSuccessRate: number;
  riskDistribution: { bucket: string; count: number; level: RiskLevel }[];
  hourlyAttempts: { hour: string; attempts: number; flagged: number }[];
  topSignals: { signal: string; count: number }[];
  recentHighRiskCases: DashboardCase[];
  recentCases: DashboardCase[];
  generatedAt: string;
}

export interface HealthResponse {
  status: 'ok';
  mode: RuntimeMode;
  providers: Record<string, string>;
  version: string;
}

export interface ApiError {
  error: string;
  message: string;
}
