import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { DeepfakeAnalysisResult } from '../../../models/verification.models';
import { statusTone } from '../../../models/risk.models';
import { CheckListComponent } from '../check-list/check-list.component';
import { ConfidenceIndicatorComponent } from '../confidence-indicator/confidence-indicator.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

/** AI Deepfake Analysis panel: probability, confidence, verdict and the 6 forensic detectors. */
@Component({
  selector: 'app-deepfake-analysis',
  imports: [CheckListComponent, ConfidenceIndicatorComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card panel" [class]="'card panel tone-' + tone()" [class.alert]="result()?.verdict === 'SYNTHETIC'">
      <header class="head">
        <div>
          <span class="eyebrow">Synthetic media forensics</span>
          <h3>AI Deepfake Analysis</h3>
        </div>
        @if (result(); as r) {
          <app-status-badge [status]="r.signal.status" [label]="r.verdict" size="lg" />
        }
      </header>

      @if (result(); as r) {
        <div class="body enter">
          <div class="summary">
            <div class="prob">
              <span class="eyebrow">Deepfake probability</span>
              <span class="big mono">{{ r.probability }}<small>%</small></span>
            </div>
            <app-confidence-indicator [value]="r.probability" label="Synthetic likelihood" [inverse]="true" />
            <app-confidence-indicator [value]="r.confidence" label="Model confidence" tone="brand" />
            @if (r.verdict === 'SYNTHETIC') {
              <div class="warning">
                <strong>⚠ WARNING: Potential synthetic media detected.</strong>
                <span>{{ r.signal.explanation }}</span>
              </div>
            } @else {
              <p class="note">{{ r.signal.explanation }}</p>
            }
          </div>
          <app-check-list [checks]="r.checks" />
        </div>
      } @else {
        <div class="scanning" aria-live="polite">
          <div class="frames">
            @for (f of frames; track f) { <span class="frame" [style.animation-delay.ms]="f * 90"></span> }
          </div>
          <div class="scan-label"><span class="spinner"></span> Analysing 48 frames across 6 forensic detectors…</div>
        </div>
      }
    </section>
  `,
  styles: `
    .panel { position: relative; transition: box-shadow .4s, border-color .4s; }
    .panel.alert { border-color: color-mix(in srgb, var(--fail) 45%, transparent);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--fail) 20%, transparent), 0 30px 80px -30px rgba(255, 93, 125, .45); }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
    h3 { font-size: 20px; margin-top: 4px; }
    .body { display: grid; grid-template-columns: minmax(220px, 300px) 1fr; gap: 28px; }
    .summary { display: flex; flex-direction: column; gap: 16px; }
    .prob { display: flex; flex-direction: column; gap: 4px; }
    .big { font-size: 60px; line-height: 1; font-weight: 600; letter-spacing: -.04em; color: var(--tone); }
    .big small { font-size: 24px; color: var(--muted); }
    .warning { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 12px; font-size: 13px;
      background: var(--fail-soft); border: 1px solid color-mix(in srgb, var(--fail) 35%, transparent); color: var(--text); }
    .warning strong { color: var(--fail); font-size: 13px; }
    .note { font-size: 13px; color: var(--text-2); }
    .scanning { display: flex; flex-direction: column; gap: 16px; padding: 12px 0; }
    .frames { display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; }
    .frame { aspect-ratio: 3/4; border-radius: 6px; background: linear-gradient(180deg, var(--surface-3), var(--surface-2));
      border: 1px solid var(--border); animation: frame-scan 1.6s infinite; }
    @keyframes frame-scan { 0%, 100% { opacity: .35; } 50% { opacity: 1; border-color: var(--brand); box-shadow: 0 0 12px var(--brand-soft); } }
    .scan-label { display: flex; gap: 10px; align-items: center; font-size: 13px; color: var(--text-2); }
    @media (max-width: 900px) { .body { grid-template-columns: 1fr; } }
  `,
})
export class DeepfakeAnalysisComponent {
  readonly result = input<DeepfakeAnalysisResult | null>(null);
  protected readonly frames = Array.from({ length: 12 }, (_, i) => i);
  protected readonly tone = computed(() => (this.result() ? statusTone(this.result()!.signal.status) : 'brand'));
}
