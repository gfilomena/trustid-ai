import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { RiskAssessment, StepUpResult } from '../../../models/verification.models';
import { RiskAssessmentViewComponent } from '../../../shared/components/risk-assessment-view/risk-assessment-view.component';
import { StepUpPanelComponent } from '../../../shared/components/step-up-panel/step-up-panel.component';

@Component({
  selector: 'app-recovery-result',
  imports: [RiskAssessmentViewComponent, StepUpPanelComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-risk-assessment-view [assessment]="assessment()" flow="RECOVERY">
      @if (stepUp(); as su) {
        <div class="card outcome enter" [class]="'card outcome enter ' + (su.success ? 'tone-pass' : 'tone-fail')">
          <strong>{{ su.success ? '✓ Additional verification passed' : '✕ Recovery blocked' }}</strong>
          <span>{{ su.message }}</span>
        </div>
      } @else if (assessment().decision === 'ADDITIONAL_VERIFICATION') {
        <app-step-up-panel [assessment]="assessment()" [sessionId]="sessionId()" (completed)="stepUpCompleted.emit($event)" />
      }
      <div class="actions">
        <button class="btn" type="button" (click)="restart.emit()">↺ Start a new recovery</button>
        <a class="btn btn--primary" routerLink="/dashboard">Open analyst dashboard →</a>
      </div>
    </app-risk-assessment-view>
  `,
  styles: `
    .actions { display: flex; justify-content: flex-end; gap: 10px; }
    .outcome { display: flex; flex-direction: column; gap: 4px; background: var(--tone-soft); border-color: color-mix(in srgb, var(--tone) 40%, transparent); }
    .outcome strong { color: var(--tone); font-size: 16px; }
    .outcome span { color: var(--text-2); }
  `,
})
export class RecoveryResultComponent {
  readonly assessment = input.required<RiskAssessment>();
  readonly sessionId = input.required<string>();
  readonly stepUp = input<StepUpResult | null>(null);
  readonly stepUpCompleted = output<StepUpResult>();
  readonly restart = output<void>();
}
