import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ContextRiskResult } from '../../../models/verification.models';
import { CheckListComponent } from '../check-list/check-list.component';
import { ConfidenceIndicatorComponent } from '../confidence-indicator/confidence-indicator.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

/** Device & Behavioural Risk: network, device and interaction signals. */
@Component({
  selector: 'app-context-risk-panel',
  imports: [CheckListComponent, ConfidenceIndicatorComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <header class="head">
        <div>
          <span class="eyebrow">Passive signals · zero user friction</span>
          <h3>Device & Behavioural Risk</h3>
        </div>
      </header>
      @if (result(); as r) {
        <div class="body enter">
          <app-check-list [checks]="r.checks" [showScores]="false" />
          <div class="signals">
            @for (s of r.signals; track s.id) {
              <div class="sig">
                <div class="row"><span>{{ s.name }}</span><app-status-badge [status]="s.status" /></div>
                <app-confidence-indicator [value]="s.score" label="Risk" [inverse]="true" />
                <p>{{ s.explanation }}</p>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="loading"><span class="spinner"></span> Evaluating device reputation, network and interaction patterns…</div>
      }
    </section>
  `,
  styles: `
    .head { margin-bottom: 16px; }
    h3 { font-size: 20px; margin-top: 4px; }
    .body { display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; }
    .signals { display: flex; flex-direction: column; gap: 12px; }
    .sig { padding: 14px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
    .row { display: flex; justify-content: space-between; align-items: center; font-weight: 550; font-size: 14px; }
    .sig p { font-size: 12.5px; color: var(--muted); }
    .loading { display: flex; align-items: center; gap: 10px; color: var(--text-2); font-size: 13px; padding: 12px 0; }
    @media (max-width: 900px) { .body { grid-template-columns: 1fr; } }
  `,
})
export class ContextRiskPanelComponent {
  readonly result = input<ContextRiskResult | null>(null);
}
