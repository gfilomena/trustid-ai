import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ApiError, ApiService } from '../../../core/services/api.service';
import type { DashboardMetrics } from '../../../models/verification.models';
import { RiskOverviewComponent } from '../risk-overview/risk-overview.component';
import { VerificationHistoryComponent } from '../verification-history/verification-history.component';

@Component({
  selector: 'app-fraud-dashboard',
  imports: [RiskOverviewComponent, VerificationHistoryComponent, DecimalPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div>
        <span class="eyebrow">Fraud operations · last 24 hours</span>
        <h1>Analyst dashboard</h1>
      </div>
      <div class="refresh">
        @if (metrics(); as m) { <span class="muted mono">Updated {{ m.generatedAt | date: 'HH:mm:ss' }} · auto-refresh 10 s</span> }
        <button class="btn btn--sm" type="button" (click)="load()">↻ Refresh</button>
      </div>
    </header>

    @if (metrics(); as m) {
      <section class="kpis">
        @for (k of kpis(); track k.label) {
          <article class="card kpi enter" [class]="'card kpi enter tone-' + k.tone">
            <span class="eyebrow">{{ k.label }}</span>
            <span class="val mono">{{ k.value | number }}</span>
            @if (k.share !== undefined) {
              <div class="share"><span [style.width.%]="k.share"></span></div>
              <span class="pct mono">{{ k.share | number: '1.1-1' }}% of attempts</span>
            }
          </article>
        }
      </section>

      <section class="rates">
        @for (r of rates(); track r.label) {
          <div class="card rate">
            <span class="muted">{{ r.label }}</span>
            <span class="rv mono" [class]="'rv mono tone-' + r.tone">{{ r.value }}</span>
            <small class="muted">{{ r.hint }}</small>
          </div>
        }
      </section>

      <app-risk-overview [metrics]="m" />
      <app-verification-history [highRisk]="m.recentHighRiskCases" [recent]="m.recentCases" />
    } @else if (error()) {
      <div class="card"><p class="error">{{ error() }}</p></div>
    } @else {
      <div class="card loading"><span class="spinner"></span> Loading metrics…</div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 20px; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
    h1 { font-size: 34px; margin-top: 6px; }
    .refresh { display: flex; align-items: center; gap: 12px; font-size: 12px; }
    .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
    .kpi { padding: 18px; display: flex; flex-direction: column; gap: 8px; border-top: 2px solid var(--tone); }
    .val { font-size: 34px; font-weight: 600; letter-spacing: -.03em; line-height: 1; }
    .share { height: 4px; border-radius: 4px; background: rgba(255,255,255,.06); overflow: hidden; }
    .share span { display: block; height: 100%; background: var(--tone); }
    .pct { font-size: 11.5px; color: var(--muted); }
    .rates { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .rate { padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    .rv { font-size: 26px; font-weight: 600; color: var(--tone); }
    .loading { display: flex; gap: 10px; align-items: center; }
    .error { color: var(--fail); }
    @media (max-width: 1100px) { .kpis { grid-template-columns: repeat(2, 1fr); } .rates { grid-template-columns: repeat(2, 1fr); } }
  `,
})
export class FraudDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly metrics = signal<DashboardMetrics | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly kpis = computed(() => {
    const t = this.metrics()!.totals;
    const share = (n: number) => (100 * n) / t.attempts;
    return [
      { label: 'Verification attempts', value: t.attempts, tone: 'brand' },
      { label: 'Approved', value: t.approved, tone: 'pass', share: share(t.approved) },
      { label: 'Additional verification', value: t.additionalVerification, tone: 'warn', share: share(t.additionalVerification) },
      { label: 'Manual review', value: t.manualReview, tone: 'fail', share: share(t.manualReview) },
      { label: 'Rejected', value: t.rejected, tone: 'fail', share: share(t.rejected) },
    ];
  });

  protected readonly rates = computed(() => {
    const m = this.metrics()!;
    return [
      { label: 'Average risk score', value: `${m.averageRiskScore}`, tone: 'pass', hint: 'across all attempts' },
      { label: 'Deepfake detection rate', value: `${m.deepfakeDetectionRate}%`, tone: 'fail', hint: 'attempts with synthetic media' },
      { label: 'Suspicious device rate', value: `${m.suspiciousDeviceRate}%`, tone: 'warn', hint: 'device / network flagged' },
      { label: 'Verification success rate', value: `${m.verificationSuccessRate}%`, tone: 'pass', hint: 'approved without human touch' },
    ];
  });

  ngOnInit() {
    this.load();
    const t = setInterval(() => this.load(), 10_000);
    this.destroyRef.onDestroy(() => clearInterval(t));
  }

  async load() {
    try {
      this.metrics.set(await this.api.dashboard());
      this.error.set(null);
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Could not load metrics');
    }
  }
}
