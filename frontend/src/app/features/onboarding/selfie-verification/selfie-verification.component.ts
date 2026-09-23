import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ApiError, ApiService } from '../../../core/services/api.service';
import { CameraService } from '../../../core/services/camera.service';
import type { FaceMatchResult, FlowType } from '../../../models/verification.models';
import { CheckListComponent } from '../../../shared/components/check-list/check-list.component';
import { ConfidenceIndicatorComponent } from '../../../shared/components/confidence-indicator/confidence-indicator.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { FaceFrameComponent } from './face-frame.component';

@Component({
  selector: 'app-selfie-verification',
  imports: [FaceFrameComponent, CheckListComponent, ConfidenceIndicatorComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="layout">
      <section class="card capture enter">
        <app-face-frame [scanning]="busy()" [label]="frameLabel()" [tone]="result() ? 'pass' : 'brand'" />
        <div class="row">
          <div class="mode" role="group" aria-label="Capture mode">
            <button type="button" [class.on]="!camera.stream()" (click)="camera.stop()">Demo mode</button>
            <button type="button" [class.on]="!!camera.stream()" [disabled]="!camera.supported" (click)="camera.start()">Use my camera</button>
          </div>
          <button class="btn btn--primary" type="button" [disabled]="busy() || !!result()" (click)="capture()">
            @if (busy()) { <span class="spinner"></span> Matching… } @else { ◉ Capture selfie }
          </button>
        </div>
        @if (camera.error()) { <p class="warn">{{ camera.error() }}</p> }
        <p class="note">🔒 Frames are processed on-device in demo mode; no image is uploaded or stored.</p>
      </section>

      <section class="card results" [class.empty]="!result()">
        @if (result(); as r) {
          <div class="enter">
            <div class="res-head">
              <div><span class="eyebrow">Biometric match</span><h3>Face detected</h3></div>
              <app-status-badge [status]="r.signals[0].status" size="lg" />
            </div>
            <div class="big">
              <div><span class="eyebrow">Face match</span><span class="num mono">{{ r.matchScore }}%</span></div>
              @if (flow() === 'ONBOARDING') {
                <div><span class="eyebrow">Identity consistency</span><span class="num mono">{{ r.identityConsistency }}%</span></div>
              }
            </div>
            <div class="meters">
              @for (s of r.signals; track s.id) { <app-confidence-indicator [value]="s.score" [label]="s.name" /> }
            </div>
            <p class="expl">{{ r.signals[0].explanation }}</p>
            <app-check-list [checks]="r.checks" />
            <div class="callout">
              <strong>Face match ≠ liveness.</strong> A match proves the face <em>looks like</em> the {{ flow() === 'RECOVERY' ? 'account owner' : 'document' }}.
              A deepfake built from a stolen photo can match too. That's why the next step checks that a live human is present.
            </div>
            <div class="continue">
              <button class="btn btn--primary btn--lg" type="button" (click)="completed.emit(r)">Continue to liveness →</button>
            </div>
          </div>
        } @else if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        } @else {
          <div class="placeholder">
            <span class="eyebrow">Position your face in the oval</span>
            <p class="muted">Good lighting, no glasses or hat. We compare your selfie with the {{ flow() === 'RECOVERY' ? 'biometric reference enrolled at onboarding' : 'portrait on your document' }}.</p>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
    .capture { display: flex; flex-direction: column; gap: 14px; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .mode { display: flex; padding: 3px; border-radius: 11px; background: var(--bg); border: 1px solid var(--border); }
    .mode button { border: 0; background: none; padding: 7px 12px; border-radius: 8px; font-size: 13px; cursor: pointer; color: var(--muted); }
    .mode button.on { background: var(--surface-3); color: var(--text); }
    .mode button:disabled { opacity: .4; cursor: not-allowed; }
    .note { font-size: 12px; color: var(--muted); }
    .warn { font-size: 12.5px; color: var(--warn); }
    .results.empty { display: grid; place-items: center; min-height: 380px; }
    .placeholder { text-align: center; max-width: 320px; display: flex; flex-direction: column; gap: 10px; font-size: 13.5px; }
    .res-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .res-head h3 { font-size: 22px; margin-top: 4px; }
    .big { display: flex; gap: 32px; margin-bottom: 16px; }
    .big div { display: flex; flex-direction: column; gap: 2px; }
    .num { font-size: 44px; font-weight: 600; letter-spacing: -.03em; line-height: 1.1; }
    .meters { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 12px; }
    .expl { font-size: 13.5px; color: var(--text-2); margin-bottom: 8px; }
    .callout { margin-top: 14px; padding: 12px 14px; border-radius: 12px; font-size: 13px; color: var(--text-2);
      background: var(--brand-soft); border: 1px solid color-mix(in srgb, var(--brand) 30%, transparent); }
    .callout strong { color: var(--text); }
    .continue { display: flex; justify-content: flex-end; margin-top: 18px; }
    .error { color: var(--fail); }
    @media (max-width: 1000px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class SelfieVerificationComponent {
  private readonly api = inject(ApiService);
  protected readonly camera = inject(CameraService);

  readonly sessionId = input.required<string>();
  readonly flow = input<FlowType>('ONBOARDING');
  readonly completed = output<FaceMatchResult>();

  protected readonly busy = signal(false);
  protected readonly result = signal<FaceMatchResult | null>(null);
  protected readonly error = signal<string | null>(null);

  protected frameLabel() {
    if (this.busy()) return 'Extracting 512-d face embedding…';
    if (this.result()) return `✓ Face match ${this.result()!.matchScore}%`;
    return this.camera.stream() ? 'Live camera' : 'Demo mode · simulated capture';
  }

  async capture() {
    this.busy.set(true);
    this.error.set(null);
    try {
      const [res] = await Promise.all([
        this.api.matchFace({ sessionId: this.sessionId(), media: { source: this.camera.stream() ? 'CAMERA' : 'DEMO', frameCount: 12 } }),
        new Promise((r) => setTimeout(r, 1400)),
      ]);
      this.result.set(res);
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Face verification failed');
    } finally {
      this.busy.set(false);
    }
  }
}
