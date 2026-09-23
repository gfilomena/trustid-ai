import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Tone } from '../../../models/risk.models';

/** Horizontal meter for a 0–100 value (confidence, authenticity, probability…). */
@Component({
  selector: 'app-confidence-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="meter" [class]="'meter tone-' + resolvedTone()">
      @if (label()) {
        <div class="row"><span class="label">{{ label() }}</span><span class="value mono">{{ value() }}%</span></div>
      }
      <div class="track" role="meter" [attr.aria-valuenow]="value()" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="label()">
        <div class="fill" [style.width.%]="value()"></div>
      </div>
    </div>
  `,
  styles: `
    .meter { display: flex; flex-direction: column; gap: 6px; }
    .row { display: flex; justify-content: space-between; font-size: 12.5px; }
    .label { color: var(--text-2); }
    .value { color: var(--text); font-weight: 600; }
    .track { height: 6px; border-radius: 99px; background: rgba(255,255,255,.06); overflow: hidden; }
    .fill { height: 100%; border-radius: inherit; background: var(--tone); box-shadow: 0 0 12px var(--tone-soft);
      transition: width .9s var(--ease); }
  `,
})
export class ConfidenceIndicatorComponent {
  readonly value = input.required<number>();
  readonly label = input<string>();
  readonly tone = input<Tone>();
  /** When true, high values are bad (e.g. deepfake probability). */
  readonly inverse = input(false);

  protected readonly resolvedTone = computed<Tone>(() => {
    if (this.tone()) return this.tone()!;
    const v = this.inverse() ? 100 - this.value() : this.value();
    return v >= 80 ? 'pass' : v >= 55 ? 'warn' : 'fail';
  });
}
