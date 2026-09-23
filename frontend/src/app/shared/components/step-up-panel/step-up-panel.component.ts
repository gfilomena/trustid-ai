import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiError, ApiService } from '../../../core/services/api.service';
import type { RiskAssessment, StepUpMethod, StepUpResult } from '../../../models/verification.models';
import { STEP_UP_META } from '../../../models/risk.models';

/** DEMO ONLY: mirrors the backend demo OTP so presenters can complete the flow. */
const DEMO_OTP = '246810';

/** Proportionate step-up: friction is added only because the risk engine asked for it. */
@Component({
  selector: 'app-step-up-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card stepup enter">
      <div class="intro">
        <span class="eyebrow">Additional verification</span>
        <h3>One more step and you're done</h3>
        <p class="muted">We're not rejecting you. A few signals were unusual, so we're asking for one quick extra check. Genuine users pass it in seconds.</p>
        <ul class="why">
          @for (r of reasons(); track r) { <li>{{ r }}</li> }
        </ul>
      </div>

      <div class="action">
        @if (!method()) {
          <div class="options">
            @for (m of assessment().stepUpOptions ?? []; track m) {
              <button type="button" class="option" (click)="choose(m)">
                <span class="icon" aria-hidden="true">{{ meta[m].icon }}</span>
                <span><strong>{{ meta[m].label }}</strong><small>{{ meta[m].description }}</small></span>
                <span aria-hidden="true">→</span>
              </button>
            }
          </div>
        } @else if (method() === 'OTP_REGISTERED_PHONE') {
          <form class="otp" (submit)="$event.preventDefault(); submit()">
            <label for="otp">Enter the 6-digit code sent to your registered phone</label>
            <input id="otp" class="mono" inputmode="numeric" maxlength="6" autocomplete="one-time-code"
              [value]="code()" (input)="code.set($any($event.target).value)" placeholder="••••••" />
            <span class="hint mono">Demo code: {{ demoOtp }}</span>
            <div class="buttons">
              <button type="button" class="btn btn--ghost" (click)="method.set(null)">Back</button>
              <button type="submit" class="btn btn--primary" [disabled]="busy() || code().length !== 6">
                @if (busy()) { <span class="spinner"></span> } Verify code
              </button>
            </div>
          </form>
        } @else {
          <div class="waiting">
            <span class="spinner"></span>
            <div><strong>{{ meta[method()!].label }}</strong><p class="muted">{{ waitingText() }}</p></div>
          </div>
        }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </div>
    </section>
  `,
  styles: `
    .stepup { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; border-color: color-mix(in srgb, var(--warn) 30%, var(--border));
      background: radial-gradient(500px 240px at 100% 0%, var(--warn-soft), transparent 70%), var(--surface); }
    h3 { font-size: 22px; margin: 6px 0 8px; }
    .why { margin: 14px 0 0; padding-left: 18px; font-size: 13px; color: var(--text-2); display: flex; flex-direction: column; gap: 4px; }
    .options { display: flex; flex-direction: column; gap: 10px; }
    .option { display: grid; grid-template-columns: 40px 1fr auto; gap: 14px; align-items: center; text-align: left; padding: 14px 16px;
      border-radius: 14px; border: 1px solid var(--border-strong); background: var(--surface-2); cursor: pointer; transition: all .2s var(--ease); }
    .option:hover { border-color: var(--brand); background: var(--surface-3); transform: translateX(2px); }
    .option .icon { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand); font-size: 18px; }
    .option strong { display: block; font-size: 14px; }
    .option small { color: var(--muted); font-size: 12.5px; }
    .otp { display: flex; flex-direction: column; gap: 10px; }
    .otp label { font-size: 13px; color: var(--text-2); }
    .otp input { height: 60px; font-size: 28px; letter-spacing: .5em; text-align: center; border-radius: 14px; border: 1px solid var(--border-strong);
      background: var(--bg); outline: none; }
    .otp input:focus { border-color: var(--brand); box-shadow: 0 0 0 4px var(--brand-soft); }
    .hint { font-size: 11.5px; color: var(--muted); }
    .buttons { display: flex; gap: 10px; justify-content: flex-end; }
    .waiting { display: flex; gap: 14px; align-items: center; padding: 18px; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); }
    .error { color: var(--fail); font-size: 13px; margin-top: 10px; }
    @media (max-width: 900px) { .stepup { grid-template-columns: 1fr; } }
  `,
})
export class StepUpPanelComponent {
  private readonly api = inject(ApiService);

  readonly assessment = input.required<RiskAssessment>();
  readonly sessionId = input.required<string>();
  readonly completed = output<StepUpResult>();

  protected readonly meta = STEP_UP_META;
  protected readonly demoOtp = DEMO_OTP;
  protected readonly method = signal<StepUpMethod | null>(null);
  protected readonly code = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly reasons = computed(() =>
    this.assessment().factors.filter((f) => f.impact === 'INCREASES_RISK').slice(0, 3).map((f) => f.label),
  );
  protected readonly waitingText = computed(() =>
    this.method() === 'BANK_APP_CONFIRMATION' ? 'Waiting for approval on your registered device…' : 'Verifying…',
  );

  choose(m: StepUpMethod) {
    this.method.set(m);
    this.error.set(null);
    if (m !== 'OTP_REGISTERED_PHONE') setTimeout(() => this.submit(), 2200);
  }

  async submit() {
    const method = this.method();
    if (!method) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.api.stepUp({ sessionId: this.sessionId(), method, code: method === 'OTP_REGISTERED_PHONE' ? this.code() : undefined });
      this.completed.emit(result);
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Verification failed. Please try again.');
      if (method !== 'OTP_REGISTERED_PHONE') this.method.set(null);
    } finally {
      this.busy.set(false);
    }
  }
}
