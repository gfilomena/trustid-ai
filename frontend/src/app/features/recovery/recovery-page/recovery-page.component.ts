import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError, ApiService } from '../../../core/services/api.service';
import { CameraService } from '../../../core/services/camera.service';
import { ClientContextService } from '../../../core/services/client-context.service';
import { DemoScenarioService } from '../../../core/services/demo-scenario.service';
import type { RiskAssessment, StepUpResult, VerificationSession } from '../../../models/verification.models';
import { DEMO_PERSONAS } from '../../../models/risk.models';
import { AiAnalysisComponent } from '../../../shared/components/ai-analysis/ai-analysis.component';
import { VerificationStepperComponent } from '../../../shared/components/verification-stepper/verification-stepper.component';
import { LivenessCheckComponent } from '../../onboarding/liveness-check/liveness-check.component';
import { SelfieVerificationComponent } from '../../onboarding/selfie-verification/selfie-verification.component';
import { IdentityCheckComponent } from '../identity-check/identity-check.component';
import { RecoveryResultComponent } from '../recovery-result/recovery-result.component';

const STEPS = [
  { label: 'Enter email', what: 'Tell us which account to recover.', why: 'We look up the account without revealing whether it exists.' },
  { label: 'Identity check', what: 'Checking the request against the account history.', why: 'Account takeovers usually come from new devices, SIM swaps and unusual locations.' },
  { label: 'Face & liveness', what: 'Selfie plus a short liveness challenge.', why: 'We compare you with the biometric reference enrolled at onboarding, and make sure you are live.' },
  { label: 'AI risk assessment', what: 'Deepfake forensics and passive signals are running.', why: 'All signals are fused into a single explainable risk score.' },
  { label: 'Recovery decision', what: 'Your result.', why: 'Low risk recovers instantly; unusual requests get one proportionate extra step.' },
];

@Component({
  selector: 'app-recovery-page',
  imports: [RouterLink, VerificationStepperComponent, IdentityCheckComponent, SelfieVerificationComponent, LivenessCheckComponent, AiAnalysisComponent, RecoveryResultComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-head">
        <div>
          <span class="eyebrow">Account recovery · step {{ step() + 1 }} of {{ steps.length }}</span>
          <h1>{{ current().label }}</h1>
        </div>
        <div class="head-actions">
          @if (step() > 0) { <button class="btn btn--sm btn--ghost" type="button" (click)="restart()">↺ Restart</button> }
          <a class="btn btn--sm btn--ghost" routerLink="/">Exit</a>
        </div>
      </header>

      <app-verification-stepper [steps]="labels" [current]="step()" />

      <div class="context">
        <div><span class="k">What's happening</span><span>{{ current().what }}</span></div>
        <div><span class="k">Why</span><span>{{ current().why }}</span></div>
      </div>

      @switch (step()) {
        @case (0) {
          <form class="card email enter" (submit)="$event.preventDefault(); start()" (keydown)="client.keystroke()" (paste)="client.paste()">
            <div class="copy">
              <h2>Locked out? Let's get you back in.</h2>
              <p class="muted">No security questions, no call centre. Verify it's really you with your face, in under a minute.</p>
            </div>
            <div class="field">
              <label for="email">Account email</label>
              <input id="email" type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value)" required />
            </div>
            @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
            <button class="btn btn--primary btn--lg" type="submit" [disabled]="busy() || !validEmail()">
              @if (busy()) { <span class="spinner"></span> } Recover my account →
            </button>
          </form>
        }
        @case (1) { <app-identity-check [session]="session()!" (completed)="next()" /> }
        @case (2) {
          @if (!faceDone()) {
            <app-selfie-verification [sessionId]="sessionId()" flow="RECOVERY" (completed)="faceDone.set(true)" />
          } @else {
            <app-liveness-check [sessionId]="sessionId()" (completed)="next()" />
          }
        }
        @case (3) {
          <app-ai-analysis [sessionId]="sessionId()" (completed)="assessment.set($event.assessment)" />
          @if (assessment()) {
            <div class="continue enter">
              <button class="btn btn--primary btn--lg" type="button" (click)="next()">View recovery decision →</button>
            </div>
          }
        }
        @case (4) {
          <app-recovery-result [assessment]="assessment()!" [sessionId]="sessionId()" [stepUp]="stepUp()"
            (stepUpCompleted)="onStepUp($event)" (restart)="restart()" />
        }
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
    .email { max-width: 560px; display: flex; flex-direction: column; gap: 20px; }
    .email h2 { font-size: 26px; margin-bottom: 8px; }
    .error { color: var(--fail); font-size: 13px; }
    .continue { display: flex; justify-content: flex-end; }
  `,
})
export class RecoveryPageComponent {
  private readonly api = inject(ApiService);
  private readonly demo = inject(DemoScenarioService);
  private readonly camera = inject(CameraService);
  protected readonly client = inject(ClientContextService);

  protected readonly steps = STEPS;
  protected readonly labels = STEPS.map((s) => s.label);
  protected readonly step = signal(0);
  protected readonly current = computed(() => STEPS[this.step()]);
  protected readonly email = signal(DEMO_PERSONAS[this.demo.scenario()].email);
  protected readonly session = signal<VerificationSession | null>(null);
  protected readonly sessionId = computed(() => this.session()?.id ?? '');
  protected readonly faceDone = signal(false);
  protected readonly assessment = signal<RiskAssessment | null>(null);
  protected readonly stepUp = signal<StepUpResult | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly validEmail = computed(() => /^\S+@\S+\.\S+$/.test(this.email()));

  constructor() {
    this.client.startForm();
  }

  async start() {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.session.set(await this.api.startRecovery({ email: this.email(), scenario: this.demo.scenario(), clientContext: this.client.snapshot() }));
      this.next();
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Could not start recovery');
    } finally {
      this.busy.set(false);
    }
  }

  next() {
    this.step.update((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (this.step() > 2) this.camera.stop();
  }

  onStepUp(r: StepUpResult) {
    this.stepUp.set(r);
    this.assessment.set(r.assessment);
  }

  restart() {
    this.session.set(null);
    this.assessment.set(null);
    this.stepUp.set(null);
    this.faceDone.set(false);
    this.camera.stop();
    this.client.reset();
    this.email.set(DEMO_PERSONAS[this.demo.scenario()].email);
    this.step.set(0);
  }
}
