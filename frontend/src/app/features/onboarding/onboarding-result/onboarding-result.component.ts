import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoScenarioService } from '../../../core/services/demo-scenario.service';
import { VerificationService } from '../../../core/services/verification.service';
import type { StepUpResult } from '../../../models/verification.models';
import { RiskAssessmentViewComponent } from '../../../shared/components/risk-assessment-view/risk-assessment-view.component';
import { StepUpPanelComponent } from '../../../shared/components/step-up-panel/step-up-panel.component';

@Component({
  selector: 'app-onboarding-result',
  imports: [RiskAssessmentViewComponent, StepUpPanelComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (flow.assessment(); as a) {
      <app-risk-assessment-view [assessment]="a" flow="ONBOARDING">
        @if (flow.stepUp(); as su) {
          <div class="card outcome enter" [class]="'card outcome enter ' + (su.success ? 'tone-pass' : 'tone-fail')">
            <strong>{{ su.success ? '✓ Additional verification passed' : '✕ Additional verification failed' }}</strong>
            <span>{{ su.message }} Risk re-scored with the new evidence.</span>
          </div>
        } @else if (a.decision === 'ADDITIONAL_VERIFICATION') {
          <app-step-up-panel [assessment]="a" [sessionId]="flow.sessionId()" (completed)="onStepUp($event)" />
        }
        <div class="actions">
          <button class="btn" type="button" (click)="restart.emit()">↺ Run another onboarding</button>
          @if (isLegit()) {
            <button class="btn" type="button" (click)="tryAttack()">◐ Replay as “Deepfake attack”</button>
          }
          <a class="btn btn--primary" routerLink="/dashboard">Open analyst dashboard →</a>
        </div>
      </app-risk-assessment-view>
    }
  `,
  styles: `
    .actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
    .outcome { display: flex; flex-direction: column; gap: 4px; border-color: color-mix(in srgb, var(--tone) 40%, transparent);
      background: var(--tone-soft); }
    .outcome strong { color: var(--tone); font-size: 16px; }
    .outcome span { color: var(--text-2); font-size: 14px; }
  `,
})
export class OnboardingResultComponent {
  protected readonly flow = inject(VerificationService);
  private readonly demo = inject(DemoScenarioService);
  readonly restart = output<void>();
  protected readonly isLegit = computed(() => this.flow.session()?.scenario === 'LEGITIMATE');

  onStepUp(r: StepUpResult) {
    this.flow.stepUp.set(r);
    this.flow.assessment.set(r.assessment);
  }

  tryAttack() {
    this.demo.select('DEEPFAKE_ATTACK');
    this.restart.emit();
  }
}
