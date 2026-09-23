import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { DashboardMetrics } from '../../../models/verification.models';
import { levelTone } from '../../../models/risk.models';

/** Charts: risk distribution, hourly volume vs flagged, and top triggering signals. */
@Component({
  selector: 'app-risk-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="grid">
      <article class="card">
        <header><span class="eyebrow">Risk score distribution</span><h3>Most users are low risk, and sail through</h3></header>
        <div class="hist">
          @for (b of metrics().riskDistribution; track b.bucket) {
            <div class="col" [class]="'col tone-' + tone(b.level)">
              <span class="n mono">{{ b.count }}</span>
              <span class="bar" [style.height.%]="(b.count / maxBucket()) * 100"></span>
              <span class="lbl mono">{{ b.bucket }}</span>
            </div>
          }
        </div>
      </article>

      <article class="card">
        <header><span class="eyebrow">Hourly volume</span><h3>Attempts vs flagged</h3></header>
        <svg class="line" viewBox="0 0 400 170" preserveAspectRatio="none" role="img" aria-label="Hourly attempts and flagged attempts">
          @for (g of [0, 1, 2, 3]; track g) { <line x1="0" x2="400" [attr.y1]="20 + g * 40" [attr.y2]="20 + g * 40" class="grid-line" /> }
          <path [attr.d]="area()" class="area" />
          <path [attr.d]="path('attempts')" class="l-att" />
          <path [attr.d]="path('flagged')" class="l-flag" />
        </svg>
        <div class="xaxis mono">
          @for (h of metrics().hourlyAttempts; track h.hour; let i = $index) { @if (i % 2 === 0) { <span>{{ h.hour }}</span> } }
        </div>
        <div class="legend"><span class="att">Attempts</span><span class="flag">Flagged</span></div>
      </article>

      <article class="card">
        <header><span class="eyebrow">Top triggering signals</span><h3>What catches fraud</h3></header>
        <ul class="top">
          @for (s of metrics().topSignals; track s.signal) {
            <li>
              <span class="name">{{ s.signal }}</span>
              <span class="track"><span [style.width.%]="(s.count / maxSignal()) * 100"></span></span>
              <span class="mono c">{{ s.count }}</span>
            </li>
          }
        </ul>
      </article>
    </section>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: 1.1fr 1.2fr 1fr; gap: 14px; }
    header h3 { font-size: 16px; margin: 4px 0 18px; }
    .hist { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; height: 180px; align-items: end; }
    .col { display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end; }
    .bar { width: 100%; border-radius: 6px 6px 2px 2px; background: linear-gradient(180deg, var(--tone), color-mix(in srgb, var(--tone) 30%, transparent));
      min-height: 3px; transition: height .8s var(--ease); }
    .n { font-size: 11px; color: var(--text-2); }
    .lbl { font-size: 10px; color: var(--muted); white-space: nowrap; }
    .line { width: 100%; height: 170px; display: block; }
    .grid-line { stroke: var(--border); stroke-dasharray: 3 4; }
    .area { fill: rgba(109, 139, 255, .12); }
    .l-att { fill: none; stroke: var(--brand); stroke-width: 2.5; vector-effect: non-scaling-stroke; }
    .l-flag { fill: none; stroke: var(--fail); stroke-width: 2.5; vector-effect: non-scaling-stroke; }
    .xaxis { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--muted); margin-top: 6px; }
    .legend { display: flex; gap: 16px; font-size: 12px; margin-top: 10px; color: var(--text-2); }
    .legend span::before { content: ''; display: inline-block; width: 10px; height: 3px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
    .att::before { background: var(--brand); } .flag::before { background: var(--fail); }
    .top { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
    .top li { display: grid; grid-template-columns: 130px 1fr 34px; gap: 10px; align-items: center; font-size: 13px; }
    .name { color: var(--text-2); }
    .track { height: 7px; border-radius: 6px; background: rgba(255,255,255,.05); overflow: hidden; }
    .track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--brand), var(--brand-2)); }
    .c { text-align: right; font-size: 12px; }
    @media (max-width: 1100px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class RiskOverviewComponent {
  readonly metrics = input.required<DashboardMetrics>();
  protected readonly tone = levelTone;
  protected readonly maxBucket = computed(() => Math.max(...this.metrics().riskDistribution.map((b) => b.count)));
  protected readonly maxSignal = computed(() => Math.max(...this.metrics().topSignals.map((s) => s.count)));

  private points(key: 'attempts' | 'flagged') {
    const data = this.metrics().hourlyAttempts;
    const max = Math.max(...data.map((d) => d.attempts)) * 1.1;
    return data.map((d, i) => [(i / (data.length - 1)) * 400, 160 - (d[key] / max) * 140] as const);
  }

  protected path(key: 'attempts' | 'flagged') {
    return this.points(key).map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  }

  protected area() {
    return `${this.path('attempts')} L400,160 L0,160 Z`;
  }
}
