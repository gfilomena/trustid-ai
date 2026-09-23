import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { SignalStatus } from '../../../models/verification.models';
import { statusTone, type Tone } from '../../../models/risk.models';

const ICON: Record<SignalStatus, string> = { PASS: '✓', WARNING: '⚠', FAIL: '✕' };

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge tone-' + tone()" [class.badge--lg]="size() === 'lg'">
    <span class="icon" aria-hidden="true">{{ icon() }}</span>{{ text() }}
  </span>`,
  styles: `
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      height: 24px; padding: 0 10px; border-radius: 999px;
      font: 600 11px/1 var(--font-mono); letter-spacing: .08em; text-transform: uppercase;
      color: var(--tone); background: var(--tone-soft);
      border: 1px solid color-mix(in srgb, var(--tone) 30%, transparent);
      white-space: nowrap;
    }
    .badge--lg { height: 30px; padding: 0 14px; font-size: 12px; }
    .icon { font-size: 11px; }
  `,
})
export class StatusBadgeComponent {
  readonly status = input<SignalStatus>();
  readonly label = input<string>();
  readonly toneOverride = input<Tone>(undefined, { alias: 'tone' });
  readonly size = input<'md' | 'lg'>('md');
  readonly iconOverride = input<string>(undefined, { alias: 'icon' });

  protected readonly tone = computed(() => this.toneOverride() ?? statusTone(this.status() ?? 'PASS'));
  protected readonly icon = computed(() => (this.iconOverride() ?? (this.status() ? ICON[this.status()!] : '●')));
  protected readonly text = computed(() => this.label() ?? this.status() ?? '');
}
