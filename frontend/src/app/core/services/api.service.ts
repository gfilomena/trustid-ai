import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';
import type {
  AccountIdentityResult,
  ContextRiskResult,
  ContextSignalsRequest,
  DashboardMetrics,
  DeepfakeAnalysisResult,
  DocumentAnalysisResult,
  DocumentVerificationRequest,
  FaceMatchResult,
  FaceVerificationRequest,
  FlowType,
  HealthResponse,
  LivenessRequest,
  LivenessResult,
  RecoveryStartRequest,
  RiskAssessment,
  ScenarioId,
  ScenarioSummary,
  SimulationResult,
  StartVerificationRequest,
  StepUpRequest,
  StepUpResult,
  VerificationSession,
} from '../../models/verification.models';

/**
 * Typed REST client. The browser only talks to our backend: provider API keys
 * never reach Angular. Calls return Promises because every call is one-shot.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  health = () => this.call(this.http.get<HealthResponse>(`${this.base}/health`));
  scenarios = () => this.call(this.http.get<ScenarioSummary[]>(`${this.base}/scenarios`));

  startVerification = (body: StartVerificationRequest) => this.post<VerificationSession>('verification/start', body);
  analyzeDocument = (body: DocumentVerificationRequest) => this.post<DocumentAnalysisResult>('verification/document', body);
  matchFace = (body: FaceVerificationRequest) => this.post<FaceMatchResult>('verification/face', body);
  checkLiveness = (body: LivenessRequest) => this.post<LivenessResult>('verification/liveness', body);
  analyzeDeepfake = (sessionId: string) => this.post<DeepfakeAnalysisResult>('verification/deepfake', { sessionId });
  stepUp = (body: StepUpRequest) => this.post<StepUpResult>('verification/step-up', body);
  getSession = (id: string) => this.call(this.http.get<VerificationSession>(`${this.base}/verification/${id}`));

  contextSignals = (body: ContextSignalsRequest) => this.post<ContextRiskResult>('risk/signals', body);
  assessRisk = (sessionId: string) => this.post<RiskAssessment>('risk/assess', { sessionId });

  startRecovery = (body: RecoveryStartRequest) => this.post<VerificationSession>('recovery/start', body);
  verifyRecovery = (sessionId: string) => this.post<AccountIdentityResult>('recovery/verify', { sessionId });

  simulate = (scenario: ScenarioId, flow: FlowType) => this.post<SimulationResult>('simulator/run', { scenario, flow });
  dashboard = () => this.call(this.http.get<DashboardMetrics>(`${this.base}/dashboard/metrics`));

  private post<T>(path: string, body: unknown) {
    return this.call(this.http.post<T>(`${this.base}/${path}`, body));
  }

  private async call<T>(obs: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(obs);
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        const message = e.error?.message ?? (e.status === 0 ? 'Cannot reach the TrustID API. Is the backend running on :4000?' : e.message);
        throw new ApiError(message, e.status, e.error?.error);
      }
      throw e;
    }
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}
