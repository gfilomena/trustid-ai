import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ApplicantInfo,
  ContextRiskResult,
  DeepfakeAnalysisResult,
  DocumentAnalysisResult,
  FaceMatchResult,
  LivenessResult,
  RiskAssessment,
  StepUpResult,
  VerificationSession,
} from '../../models/verification.models';
import { ApiService } from './api.service';
import { ClientContextService } from './client-context.service';
import { DemoScenarioService } from './demo-scenario.service';

/**
 * Onboarding flow state (Signals). Provided at the onboarding page level so each
 * run starts clean. Holds derived results only: never images.
 */
@Injectable()
export class VerificationService {
  private readonly api = inject(ApiService);
  private readonly client = inject(ClientContextService);
  private readonly demo = inject(DemoScenarioService);

  readonly session = signal<VerificationSession | null>(null);
  readonly document = signal<DocumentAnalysisResult | null>(null);
  readonly face = signal<FaceMatchResult | null>(null);
  readonly liveness = signal<LivenessResult | null>(null);
  readonly deepfake = signal<DeepfakeAnalysisResult | null>(null);
  readonly context = signal<ContextRiskResult | null>(null);
  readonly assessment = signal<RiskAssessment | null>(null);
  readonly stepUp = signal<StepUpResult | null>(null);

  readonly sessionId = computed(() => this.session()?.id ?? '');

  async start(applicant: ApplicantInfo) {
    const session = await this.api.startVerification({
      scenario: this.demo.scenario(),
      applicant,
      clientContext: this.client.snapshot(),
    });
    this.session.set(session);
    return session;
  }

  reset() {
    this.session.set(null);
    this.document.set(null);
    this.face.set(null);
    this.liveness.set(null);
    this.deepfake.set(null);
    this.context.set(null);
    this.assessment.set(null);
    this.stepUp.set(null);
    this.client.reset();
  }
}
