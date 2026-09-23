import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SubCheck } from '../../../models/verification.models';
import { statusTone } from '../../../models/risk.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

/** Row list of granular checks (e.g. the 6 deepfake detectors). */
@Component({
  selector: 'app-check-list',
  imports: [StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="list">
      @for (c of checks(); track c.id; let i = $index) {
        <li class="row enter" [class]="'row enter tone-' + tone(c)" [style.animation-delay.ms]="stagger() ? i * 120 : 0">
          <span class="dot" aria-hidden="true"></span>
          <div class="text">
            <div class="label">{{ c.label }}</div>
            <div class="detail">{{ c.detail }}</div>
          </div>
          @if (c.score !== undefined && showScores()) {
            <span class="score mono">{{ c.score }}</span>
          }
          <app-status-badge [status]="c.status" />
        </li>
      }
    </ul>
  `,
  styles: `
    .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    .row { display: grid; grid-template-columns: 10px 1fr auto auto; align-items: center; gap: 14px;
      padding: 11px 12px; border-radius: 10px; transition: background .2s; }
    .row:hover { background: rgba(255,255,255,.025); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--tone); box-shadow: 0 0 0 4px var(--tone-soft); }
    .label { font-weight: 550; font-size: 14px; }
    .detail { font-size: 12.5px; color: var(--muted); }
    .score { font-size: 12px; color: var(--text-2); }
  `,
})
export class CheckListComponent {
  readonly checks = input.required<SubCheck[]>();
  readonly showScores = input(true);
  readonly stagger = input(true);
  protected readonly tone = (c: SubCheck) => statusTone(c.status);
}
