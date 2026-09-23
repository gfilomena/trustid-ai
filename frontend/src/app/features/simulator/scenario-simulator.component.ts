import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError } from '../../core/services/api.service';
import { DemoScenarioService } from '../../core/services/demo-scenario.service';
import { RiskService } from '../../core/services/risk.service';
import type { FlowType, ScenarioId, SignalId, VerificationSession } from '../../models/verification.models';
import { DECISION_META, SCENARIO_ICONS, levelTone, statusTone } from '../../models/risk.models';
import { RiskAssessmentViewComponent } from '../../shared/components/risk-assessment-view/risk-assessment-view.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

const MATRIX_ROWS: { id: SignalId; label: string }[] = [
  { id: 'document', label: 'Document' },
  { id: 'account_identity', label: 'Account ownership' },
  { id: 'face_match', label: 'Face match' },
  { id: 'liveness', label: 'Liveness' },
  { id: 'deepfake', label: 'Deepfake' },
  { id: 'device', label: 'Device risk' },
  { id: 'behaviour', label: 'Behaviour' },
  { id: 'velocity', label: 'Velocity' },
];

/** DEMO ONLY: deterministic fraud scenarios for live presentations. */
@Component({
  selector: 'app-scenario-simulator',
  imports: [RiskAssessmentViewComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scenario-simulator.component.html',
  styleUrl: './scenario-simulator.component.scss',
})
export class ScenarioSimulatorComponent {
  protected readonly demo = inject(DemoScenarioService);
  private readonly risk = inject(RiskService);
  private readonly router = inject(Router);

  protected readonly icons = SCENARIO_ICONS;
  protected readonly decisionMeta = DECISION_META;
  protected readonly levelTone = levelTone;
  protected readonly statusTone = statusTone;
  protected readonly rows = MATRIX_ROWS;

  protected readonly selected = signal<ScenarioId>(this.demo.scenario());
  protected readonly flow = signal<FlowType>('ONBOARDING');
  protected readonly running = signal(false);
  protected readonly session = signal<VerificationSession | null>(null);
  protected readonly matrix = signal<Record<string, VerificationSession> | null>(null);
  protected readonly matrixBusy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly summary = computed(() => this.demo.scenarios().find((s) => s.id === this.selected()));

  select(id: ScenarioId) {
    this.selected.set(id);
    const s = this.demo.scenarios().find((x) => x.id === id);
    if (s) this.flow.set(s.recommendedFlow);
    this.session.set(null);
  }

  async run() {
    this.running.set(true);
    this.error.set(null);
    this.session.set(null);
    try {
      const [s] = await Promise.all([this.risk.simulate(this.selected(), this.flow()), new Promise((r) => setTimeout(r, 700))]);
      this.session.set(s);
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Simulation failed');
    } finally {
      this.running.set(false);
    }
  }

  async runAll() {
    this.matrixBusy.set(true);
    this.error.set(null);
    try {
      const list = this.demo.scenarios();
      const results = await Promise.all(list.map((s) => this.risk.simulate(s.id, s.recommendedFlow)));
      this.matrix.set(Object.fromEntries(results.map((r) => [r.scenario, r])));
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Simulation failed');
    } finally {
      this.matrixBusy.set(false);
    }
  }

  signalOf(s: VerificationSession, id: SignalId) {
    return s.assessment?.signals.find((x) => x.id === id);
  }

  playGuided() {
    this.demo.select(this.selected());
    this.router.navigateByUrl(this.flow() === 'RECOVERY' ? '/recovery' : '/onboarding');
  }
}
