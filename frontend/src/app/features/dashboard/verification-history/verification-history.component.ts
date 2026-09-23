import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import type { DashboardCase } from '../../../models/verification.models';
import { DECISION_META, levelTone } from '../../../models/risk.models';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

/** Case table for analysts: recent high-risk cases and the full recent feed. */
@Component({
  selector: 'app-verification-history',
  imports: [StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <header>
        <div><span class="eyebrow">Case queue</span><h3>{{ tab() === 'high' ? 'Recent high-risk cases' : 'All recent verifications' }}</h3></div>
        <div class="tabs" role="tablist">
          <button role="tab" type="button" [class.on]="tab() === 'high'" [attr.aria-selected]="tab() === 'high'" (click)="tab.set('high')">High risk</button>
          <button role="tab" type="button" [class.on]="tab() === 'all'" [attr.aria-selected]="tab() === 'all'" (click)="tab.set('all')">All</button>
        </div>
      </header>
      <div class="wrap">
        <table>
          <thead><tr><th>Time</th><th>User</th><th>Flow</th><th>Risk</th><th>Main signal</th><th>Decision</th></tr></thead>
          <tbody>
            @for (c of tab() === 'high' ? highRisk() : recent(); track c.id) {
              <tr [class.live]="c.live">
                <td class="mono">{{ c.time }}</td>
                <td>{{ c.user }} @if (c.live) { <span class="live-tag mono">LIVE</span> }</td>
                <td class="muted">{{ c.flow === 'ONBOARDING' ? 'Onboarding' : 'Recovery' }}</td>
                <td><span class="risk mono" [class]="'risk mono tone-' + levelTone(c.riskLevel)">{{ c.risk }}</span></td>
                <td>{{ c.mainSignal }}</td>
                <td><app-status-badge [label]="meta[c.decision].label" [tone]="meta[c.decision].tone" /></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; }
    h3 { font-size: 18px; margin-top: 4px; }
    .tabs { display: flex; padding: 3px; border-radius: 10px; background: var(--bg); border: 1px solid var(--border); }
    .tabs button { border: 0; background: none; padding: 6px 12px; border-radius: 7px; font-size: 12.5px; cursor: pointer; color: var(--muted); }
    .tabs .on { background: var(--surface-3); color: var(--text); }
    .wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    th { text-align: left; font-size: 11.5px; font-weight: 500; color: var(--muted); padding: 10px 12px; border-bottom: 1px solid var(--border-strong); text-transform: uppercase; letter-spacing: .06em; }
    td { padding: 12px; border-bottom: 1px solid var(--border); }
    tr:hover td { background: rgba(255,255,255,.015); }
    tr.live td { background: rgba(109, 139, 255, .05); }
    .live-tag { font-size: 9.5px; letter-spacing: .1em; color: var(--brand); border: 1px solid var(--brand); border-radius: 4px; padding: 1px 4px; margin-left: 6px; }
    .risk { display: inline-block; min-width: 38px; text-align: center; padding: 3px 8px; border-radius: 6px; color: var(--tone); background: var(--tone-soft); font-weight: 600; }
  `,
})
export class VerificationHistoryComponent {
  readonly highRisk = input.required<DashboardCase[]>();
  readonly recent = input.required<DashboardCase[]>();
  protected readonly tab = signal<'high' | 'all'>('high');
  protected readonly meta = DECISION_META;
  protected readonly levelTone = levelTone;
}
