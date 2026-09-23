import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { ApiError, ApiService } from '../../../core/services/api.service';
import type { AccountIdentityResult, VerificationSession } from '../../../models/verification.models';
import { CheckListComponent } from '../../../shared/components/check-list/check-list.component';
import { ConfidenceIndicatorComponent } from '../../../shared/components/confidence-indicator/confidence-indicator.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

/** Recovery step 2: consistency of the request with the account's history. */
@Component({
  selector: 'app-identity-check',
  imports: [CheckListComponent, ConfidenceIndicatorComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="layout">
      <section class="card account enter">
        <span class="eyebrow">Account found</span>
        @if (session().account; as acc) {
          <dl>
            <div><dt>Email</dt><dd class="mono">{{ acc.maskedEmail }}</dd></div>
            <div><dt>Registered phone</dt><dd class="mono">{{ acc.maskedPhone }}</dd></div>
            <div><dt>Customer since</dt><dd>{{ acc.customerSince }}</dd></div>
            <div><dt>Known devices</dt><dd>{{ acc.knownDevices }}</dd></div>
            <div><dt>Last login</dt><dd>{{ acc.lastLoginLocation }}</dd></div>
          </dl>
        }
        <p class="note">Only masked data is shown. In production this lookup gives the same response for unknown emails (anti-enumeration).</p>
      </section>

      <section class="card enter">
        <div class="head">
          <div><span class="eyebrow">Account ownership signals</span><h3>Identity verification</h3></div>
          @if (result(); as r) { <app-status-badge [status]="r.signal.status" size="lg" /> }
        </div>
        @if (result(); as r) {
          <app-confidence-indicator [value]="r.signal.score" label="Ownership consistency" />
          <p class="expl">{{ r.signal.explanation }}</p>
          <app-check-list [checks]="r.checks" [showScores]="false" />
          <div class="continue">
            <button class="btn btn--primary btn--lg" type="button" (click)="completed.emit(r)">Continue to face & liveness →</button>
          </div>
        } @else if (error()) {
          <p class="error">{{ error() }}</p>
        } @else {
          <div class="loading"><span class="spinner"></span> Checking device history, SIM swap and login locations…</div>
        }
      </section>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }
    dl { margin: 14px 0; display: flex; flex-direction: column; gap: 12px; }
    dl div { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
    dt { color: var(--muted); font-size: 13px; } dd { margin: 0; font-weight: 550; font-size: 13.5px; }
    .note { font-size: 12px; color: var(--muted); }
    .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    h3 { font-size: 22px; margin-top: 4px; }
    .expl { font-size: 13.5px; color: var(--text-2); margin: 12px 0 6px; }
    .loading { display: flex; gap: 10px; align-items: center; color: var(--text-2); font-size: 13.5px; }
    .continue { display: flex; justify-content: flex-end; margin-top: 18px; }
    .error { color: var(--fail); }
    @media (max-width: 1000px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class IdentityCheckComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly session = input.required<VerificationSession>();
  readonly completed = output<AccountIdentityResult>();
  protected readonly result = signal<AccountIdentityResult | null>(null);
  protected readonly error = signal<string | null>(null);

  async ngOnInit() {
    try {
      const [r] = await Promise.all([this.api.verifyRecovery(this.session().id), new Promise((res) => setTimeout(res, 900))]);
      this.result.set(r);
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Identity check failed');
    }
  }
}
