import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import type { RiskLevel } from '../../../models/verification.models';
import { levelTone } from '../../../models/risk.models';

/** Large circular 0–100 risk gauge with a count-up animation. */
@Component({
  selector: 'app-risk-score',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gauge" [class]="'gauge tone-' + tone()" [style.--size.px]="size()">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <linearGradient [attr.id]="gradId" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="var(--tone)" stop-opacity=".55" />
            <stop offset="100%" stop-color="var(--tone)" />
          </linearGradient>
        </defs>
        @for (t of ticks; track t) {
          <line x1="100" y1="10" x2="100" y2="16" [attr.transform]="'rotate(' + t + ' 100 100)'" class="tick" />
        }
        <circle cx="100" cy="100" r="80" class="track" />
        <circle cx="100" cy="100" r="80" class="arc" [attr.stroke]="'url(#' + gradId + ')'"
          [attr.stroke-dasharray]="circumference" [attr.stroke-dashoffset]="offset()" />
      </svg>
      <div class="center" role="img" [attr.aria-label]="'Risk score ' + score() + ' out of 100, ' + level() + ' risk'">
        <div class="value mono">{{ display() }}<span class="of">/100</span></div>
        <div class="level">{{ level() }} RISK</div>
      </div>
    </div>
  `,
  styles: `
    :host { display: inline-block; }
    .gauge { position: relative; width: var(--size); height: var(--size); }
    svg { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
    .tick { stroke: rgba(255,255,255,.12); stroke-width: 1.5; }
    .track { fill: none; stroke: rgba(255,255,255,.06); stroke-width: 12; }
    .arc { fill: none; stroke-width: 12; stroke-linecap: round;
      filter: drop-shadow(0 0 10px var(--tone-soft)); }
    .center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
    .value { font-size: calc(var(--size) * .24); font-weight: 600; letter-spacing: -.04em; line-height: 1; }
    .of { font-size: .32em; color: var(--muted); margin-left: 2px; letter-spacing: 0; }
    .level { margin-top: 8px; font: 600 12px var(--font-mono); letter-spacing: .16em; color: var(--tone); }
  `,
})
export class RiskScoreComponent {
  readonly score = input.required<number>();
  readonly level = input.required<RiskLevel>();
  readonly size = input(220);

  protected readonly circumference = 2 * Math.PI * 80;
  protected readonly gradId = `rg-${Math.random().toString(36).slice(2, 8)}`;
  protected readonly ticks = Array.from({ length: 40 }, (_, i) => i * 9);
  protected readonly tone = computed(() => levelTone(this.level()));
  protected readonly display = signal(0);
  protected readonly offset = computed(() => this.circumference * (1 - this.display() / 100));

  constructor() {
    let frame = 0;
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(frame));
    effect(() => {
      const target = this.score();
      const from = this.display();
      const start = performance.now();
      cancelAnimationFrame(frame);
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 1200);
        const eased = 1 - Math.pow(1 - t, 3);
        this.display.set(Math.round(from + (target - from) * eased));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    });
  }
}
