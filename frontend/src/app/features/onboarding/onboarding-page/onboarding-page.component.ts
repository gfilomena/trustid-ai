import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoScenarioService } from '../../../core/services/demo-scenario.service';
import { VerificationService } from '../../../core/services/verification.service';
import { CameraService } from '../../../core/services/camera.service';
import { AiAnalysisComponent } from '../../../shared/components/ai-analysis/ai-analysis.component';
import { VerificationStepperComponent } from '../../../shared/components/verification-stepper/verification-stepper.component';
import { DocumentVerificationComponent } from '../document-verification/document-verification.component';
import { LivenessCheckComponent } from '../liveness-check/liveness-check.component';
import { OnboardingResultComponent } from '../onboarding-result/onboarding-result.component';
import { PersonalInfoComponent } from '../personal-info/personal-info.component';
import { SelfieVerificationComponent } from '../selfie-verification/selfie-verification.component';

const STEPS = [
  { label: 'Personal information', what: 'Tell us who you are.', why: 'We compare these details with your document and trusted data sources.' },
  { label: 'Identity document', what: 'Scan a passport, ID card or driver’s licence.', why: 'Document AI checks security features, tampering and data consistency.' },
  { label: 'Face verification', what: 'Take a quick selfie.', why: 'We confirm the face matches the document portrait.' },
  { label: 'Liveness check', what: 'Follow four short prompts.', why: 'Proves a real, live person is present, not a photo, replay or deepfake.' },
  { label: 'AI risk assessment', what: 'Sit back: our models are analysing.', why: 'Deepfake forensics and passive device signals run without any extra effort from you.' },
  { label: 'Decision', what: 'Your result.', why: 'Every decision comes with a clear explanation.' },
];

@Component({
  selector: 'app-onboarding-page',
  imports: [
    RouterLink,
    VerificationStepperComponent,
    PersonalInfoComponent,
    DocumentVerificationComponent,
    SelfieVerificationComponent,
    LivenessCheckComponent,
    AiAnalysisComponent,
    OnboardingResultComponent,
  ],
  providers: [VerificationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <span class="eyebrow">Digital onboarding · step {{ step() + 1 }} of {{ steps.length }}</span>
          <h1>{{ current().label }}</h1>
        </div>
        <div class="head-actions">
          @if (step() > 0) {
            <button class="btn btn--sm btn--ghost" type="button" (click)="restart()">↺ Restart</button>
          }
          <a class="btn btn--sm btn--ghost" routerLink="/">Exit</a>
        </div>
      </header>

      <app-verification-stepper [steps]="labels" [current]="step()" />

      <div class="context">
        <div><span class="k">What's happening</span><span>{{ current().what }}</span></div>
        <div><span class="k">Why</span><span>{{ current().why }}</span></div>
        @if (demo.scenario() !== 'LEGITIMATE' && step() === 0) {
          <div class="scenario"><span class="k">Demo scenario</span><span>{{ demo.current()?.label }}: {{ demo.current()?.attackVector }}</span></div>
        }
      </div>

      @switch (step()) {
        @case (0) { <app-personal-info (completed)="next()" /> }
        @case (1) { <app-document-verification (completed)="flow.document.set($event); next()" /> }
        @case (2) { <app-selfie-verification [sessionId]="flow.sessionId()" (completed)="flow.face.set($event); next()" /> }
        @case (3) { <app-liveness-check [sessionId]="flow.sessionId()" (completed)="flow.liveness.set($event); next()" /> }
        @case (4) {
          <app-ai-analysis [sessionId]="flow.sessionId()"
            (completed)="flow.deepfake.set($event.deepfake); flow.context.set($event.context); flow.assessment.set($event.assessment); analysisDone.set(true)" />
          @if (analysisDone()) {
            <div class="continue enter">
              <span class="muted">Analysis complete: {{ flow.assessment()?.signals?.length }} signals fused.</span>
              <button class="btn btn--primary btn--lg" type="button" (click)="next()">View risk assessment →</button>
            </div>
          }
        }
        @case (5) { <app-onboarding-result (restart)="restart()" /> }
      }
    </div>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 24px; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
    h1 { font-size: 34px; margin-top: 6px; }
    .head-actions { display: flex; gap: 6px; }
    .context { display: flex; gap: 12px; flex-wrap: wrap; }
    .context > div { display: flex; gap: 10px; align-items: baseline; padding: 10px 14px; border-radius: 12px; background: var(--surface);
      border: 1px solid var(--border); font-size: 13.5px; color: var(--text-2); }
    .k { font: 600 10.5px var(--font-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--brand); white-space: nowrap; }
    .scenario { border-color: color-mix(in srgb, var(--fail) 35%, transparent) !important; }
    .scenario .k { color: var(--fail); }
    .continue { display: flex; justify-content: flex-end; align-items: center; gap: 16px; }
  `,
})
export class OnboardingPageComponent {
  protected readonly flow = inject(VerificationService);
  protected readonly demo = inject(DemoScenarioService);
  private readonly camera = inject(CameraService);

  protected readonly steps = STEPS;
  protected readonly labels = STEPS.map((s) => s.label);
  protected readonly step = signal(0);
  protected readonly current = computed(() => STEPS[this.step()]);
  protected readonly analysisDone = signal(false);

  next() {
    this.step.update((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (this.step() > 3) this.camera.stop();
  }

  restart() {
    this.flow.reset();
    this.camera.stop();
    this.analysisDone.set(false);
    this.step.set(0);
  }
}
