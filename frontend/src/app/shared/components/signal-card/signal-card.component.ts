import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { RiskSignal, SignalCategory } from '../../../models/verification.models';
import { statusTone } from '../../../models/risk.models';
import { ConfidenceIndicatorComponent } from '../confidence-indicator/confidence-indicator.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

const CATEGORY_ICON: Record<SignalCategory, string> = {
  DOCUMENT: '▤',
  BIOMETRIC: '◉',
  LIVENESS: '◎',
  SYNTHETIC_MEDIA: '◐',
  DEVICE: '⌬',
  BEHAVIOUR: '∿',
  IDENTITY: '⚇',
};

/** One risk signal: score, status, confidence, explanation and evidence. */
@Component({
  selector: 'app-signal-card',
  imports: [StatusBadgeComponent, ConfidenceIndicatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="signal" [class]="'signal tone-' + tone()">
      <header>
        <span class="icon" aria-hidden="true">{{ icon() }}</span>
        <h4>{{ signal().name }}</h4>
        <app-status-badge [status]="signal().status" />
      </header>
      <div class="metric">
        <span class="value mono">{{ signal().score }}<small>%</small></span>
        <span class="caption">{{ caption() }}</span>
      </div>
      <app-confidence-indicator [value]="signal().confidence" label="Model confidence" tone="brand" />
      <p class="explanation">{{ signal().explanation }}</p>
      @if (signal().evidence?.length) {
        <button class="toggle" type="button" (click)="open.set(!open())" [attr.aria-expanded]="open()">
          {{ open() ? 'Hide' : 'Show' }} evidence ({{ signal().evidence!.length }})
        </button>
        @if (open()) {
          <ul class="evidence enter">
            @for (e of signal().evidence; track e) { <li>{{ e }}</li> }
          </ul>
          <div class="provider mono">{{ signal().provider }}</div>
        }
      }
    </article>
  `,
  styles: `
    :host { display: block; }
    .signal { height: 100%; display: flex; flex-direction: column; gap: 14px; padding: 18px; border-radius: var(--radius);
      background: linear-gradient(180deg, color-mix(in srgb, var(--tone) 5%, transparent), transparent 55%), var(--surface);
      border: 1px solid var(--border); position: relative; overflow: hidden; transition: border-color .2s, transform .2s var(--ease); }
    .signal::before { content: ''; position: absolute; inset: 0 0 auto; height: 2px; background: var(--tone); opacity: .7; }
    .signal:hover { border-color: var(--border-strong); transform: translateY(-2px); }
    header { display: flex; align-items: center; gap: 10px; }
    .icon { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px;
      background: var(--tone-soft); color: var(--tone); font-size: 15px; flex: none; }
    h4 { font-size: 14.5px; flex: 1; }
    .metric { display: flex; align-items: baseline; gap: 10px; }
    .value { font-size: 34px; font-weight: 600; letter-spacing: -.03em; line-height: 1; }
    .value small { font-size: 16px; color: var(--muted); margin-left: 1px; }
    .caption { font-size: 12px; color: var(--muted); }
    .explanation { font-size: 13px; color: var(--text-2); flex: 1; }
    .toggle { align-self: flex-start; background: none; border: 0; padding: 0; color: var(--brand); font-size: 12.5px; cursor: pointer; }
    .evidence { margin: 0; padding-left: 16px; font-size: 12.5px; color: var(--text-2); display: flex; flex-direction: column; gap: 4px; }
    .provider { font-size: 10.5px; color: var(--muted); }
  `,
})
export class SignalCardComponent {
  readonly signal = input.required<RiskSignal>();
  protected readonly open = signal(false);
  protected readonly tone = computed(() => statusTone(this.signal().status));
  protected readonly icon = computed(() => CATEGORY_ICON[this.signal().category]);
  protected readonly caption = computed(() => {
    const s = this.signal();
    if (s.id === 'deepfake') return 'synthetic-media probability';
    return s.polarity === 'RISK' ? 'risk score · lower is better' : 'trust score · higher is better';
  });
}
