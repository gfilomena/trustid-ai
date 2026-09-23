import { Injectable, inject } from '@angular/core';
import type { FlowType, RiskAssessment, ScenarioId, VerificationSession } from '../../models/verification.models';
import { ApiService } from './api.service';
import { ClientContextService } from './client-context.service';

export interface AnalysisStage {
  id: 'deepfake' | 'context' | 'fusion';
  label: string;
}

/** Risk-side operations: the AI analysis pipeline and the scenario simulator. */
@Injectable({ providedIn: 'root' })
export class RiskService {
  private readonly api = inject(ApiService);
  private readonly client = inject(ClientContextService);

  readonly stages: AnalysisStage[] = [
    { id: 'deepfake', label: 'AI deepfake analysis' },
    { id: 'context', label: 'Device & behavioural signals' },
    { id: 'fusion', label: 'Multi-signal risk fusion' },
  ];

  runDeepfake = (sessionId: string) => this.api.analyzeDeepfake(sessionId);
  runContext = (sessionId: string) => this.api.contextSignals({ sessionId, clientContext: this.client.snapshot() });
  assess = (sessionId: string): Promise<RiskAssessment> => this.api.assessRisk(sessionId);

  async simulate(scenario: ScenarioId, flow: FlowType): Promise<VerificationSession> {
    return (await this.api.simulate(scenario, flow)).session;
  }
}
