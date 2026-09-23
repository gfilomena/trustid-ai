import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ApiError, ApiService } from '../../../core/services/api.service';
import { CameraService } from '../../../core/services/camera.service';
import type { LivenessChallengeId, LivenessResult } from '../../../models/verification.models';
import { statusTone } from '../../../models/risk.models';
import { CheckListComponent } from '../../../shared/components/check-list/check-list.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { FaceFrameComponent, type HeadPose } from '../selfie-verification/face-frame.component';

const CHALLENGES: { id: LivenessChallengeId; label: string; pose: HeadPose }[] = [
  { id: 'LOOK', label: 'Look at the camera', pose: 'center' },
  { id: 'TURN_LEFT', label: 'Turn your head left', pose: 'left' },
  { id: 'TURN_RIGHT', label: 'Turn your head right', pose: 'right' },
  { id: 'BLINK', label: 'Blink', pose: 'blink' },
];

@Component({
  selector: 'app-liveness-check',
  imports: [FaceFrameComponent, CheckListComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="layout">
      <section class="card capture enter">
        <app-face-frame [pose]="pose()" [scanning]="running() || analysing()" [label]="frameLabel()" [tone]="frameTone()" />
        <div class="row">
          <span class="muted small">Active challenge-response · randomised order in production</span>
          <button class="btn btn--primary" type="button" [disabled]="running() || analysing() || !!result()" (click)="start()">
            @if (running() || analysing()) { <span class="spinner"></span> } Start liveness check
          </button>
        </div>
      </section>

      <section class="card side">
        <span class="eyebrow">Liveness verification</span>
        <h3>Please:</h3>
        <ol class="challenges">
          @for (c of challenges; track c.id; let i = $index) {
            <li [class]="rowClass(c.id, i)">
              <span class="mark">{{ rowIcon(c.id, i) }}</span>
              <span class="lbl">{{ c.label }}</span>
              @if (resultFor(c.id); as rc) { <span class="detail">{{ rc.detail }}</span> }
            </li>
          }
        </ol>

        @if (result(); as r) {
          <div class="outcome enter" [class]="'outcome enter tone-' + tone()">
            <div><span class="eyebrow">Liveness confidence</span><span class="num mono">{{ r.confidence }}%</span></div>
            <div><span class="eyebrow">Status</span><app-status-badge [status]="r.signal.status" size="lg" /></div>
          </div>
          <p class="expl">{{ r.signal.explanation }}</p>
          <app-check-list [checks]="r.checks" />
          <div class="continue">
            <button class="btn btn--primary btn--lg" type="button" (click)="completed.emit(r)">Run AI risk assessment →</button>
          </div>
        } @else if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        } @else {
          <div class="callout">
            <strong>Why liveness is different from face match</strong>
            <div class="compare">
              <div><span class="q">Face match asks</span>"Is this the same person as the document?"</div>
              <div><span class="q">Liveness asks</span>"Is a real, live human in front of the camera right now?"</div>
            </div>
            <p>Random prompts, 3D depth, texture and injection checks defeat photos, screen replays and virtual-camera deepfakes.</p>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
    .capture { display: flex; flex-direction: column; gap: 14px; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .small { font-size: 12px; }
    .side h3 { font-size: 22px; margin: 4px 0 14px; }
    .challenges { list-style: none; margin: 0 0 18px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .challenges li { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px;
      background: var(--surface-2); border: 1px solid var(--border); transition: all .3s var(--ease); color: var(--muted); }
    .challenges li.active { border-color: var(--brand); color: var(--text); background: var(--brand-soft); transform: translateX(4px); }
    .challenges li.done { color: var(--text-2); }
    .challenges li.done .mark { color: var(--pass); }
    .challenges li.failed { border-color: color-mix(in srgb, var(--fail) 45%, transparent); background: var(--fail-soft); color: var(--text); }
    .challenges li.failed .mark { color: var(--fail); }
    .challenges li.warned .mark { color: var(--warn); }
    .mark { font-weight: 700; text-align: center; }
    .lbl { font-weight: 550; font-size: 14px; }
    .detail { font-size: 12px; color: var(--muted); }
    .outcome { display: flex; gap: 32px; align-items: flex-end; padding: 16px; border-radius: 14px; margin-bottom: 12px;
      background: var(--tone-soft); border: 1px solid color-mix(in srgb, var(--tone) 30%, transparent); }
    .outcome div { display: flex; flex-direction: column; gap: 6px; }
    .num { font-size: 42px; font-weight: 600; line-height: 1; color: var(--tone); }
    .expl { font-size: 13.5px; color: var(--text-2); margin-bottom: 6px; }
    .callout { padding: 16px; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); font-size: 13px; color: var(--text-2);
      display: flex; flex-direction: column; gap: 12px; }
    .callout strong { color: var(--text); font-size: 14px; }
    .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .compare div { padding: 12px; border-radius: 10px; background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 13px; }
    .q { display: block; font: 600 10.5px var(--font-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--brand); margin-bottom: 4px; }
    .continue { display: flex; justify-content: flex-end; margin-top: 18px; }
    .error { color: var(--fail); }
    @media (max-width: 1000px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class LivenessCheckComponent {
  private readonly api = inject(ApiService);
  private readonly camera = inject(CameraService);

  readonly sessionId = input.required<string>();
  readonly completed = output<LivenessResult>();

  protected readonly challenges = CHALLENGES;
  protected readonly index = signal(-1);
  protected readonly running = signal(false);
  protected readonly analysing = signal(false);
  protected readonly result = signal<LivenessResult | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly pose = computed<HeadPose>(() => CHALLENGES[this.index()]?.pose ?? 'center');
  protected readonly tone = computed(() => (this.result() ? statusTone(this.result()!.signal.status) : 'brand'));
  protected readonly frameTone = computed(() => this.tone());

  protected frameLabel() {
    if (this.analysing()) return 'Analysing depth, texture and injection…';
    if (this.running()) return CHALLENGES[this.index()]?.label ?? '';
    if (this.result()) return `Liveness ${this.result()!.confidence}% · ${this.result()!.signal.status}`;
    return 'Ready';
  }

  protected resultFor(id: LivenessChallengeId) {
    return this.result()?.challenges.find((c) => c.id === id);
  }

  protected rowClass(id: LivenessChallengeId, i: number) {
    const r = this.resultFor(id);
    if (r) return r.status === 'FAIL' ? 'failed' : r.status === 'WARNING' ? 'warned' : 'done';
    if (i === this.index() && this.running()) return 'active';
    return i < this.index() ? 'done' : '';
  }

  protected rowIcon(id: LivenessChallengeId, i: number) {
    const r = this.resultFor(id);
    if (r) return r.status === 'FAIL' ? '✕' : r.status === 'WARNING' ? '!' : '✓';
    if (i < this.index()) return '✓';
    return i === this.index() && this.running() ? '→' : '○';
  }

  async start() {
    this.error.set(null);
    this.running.set(true);
    for (let i = 0; i < CHALLENGES.length; i++) {
      this.index.set(i);
      await pause(1300);
    }
    this.index.set(CHALLENGES.length);
    this.running.set(false);
    this.analysing.set(true);
    try {
      const [res] = await Promise.all([
        this.api.checkLiveness({
          sessionId: this.sessionId(),
          completedChallenges: CHALLENGES.map((c) => c.id),
          media: { source: this.camera.stream() ? 'CAMERA' : 'DEMO', frameCount: 96 },
        }),
        pause(900),
      ]);
      this.result.set(res);
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Liveness check failed');
    } finally {
      this.analysing.set(false);
    }
  }
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
