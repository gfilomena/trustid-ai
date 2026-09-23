import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { FlowType, RiskAssessment } from '../../../models/verification.models';
import { DECISION_META, levelTone } from '../../../models/risk.models';
import { RiskExplanationComponent } from '../risk-explanation/risk-explanation.component';
import { RiskScoreComponent } from '../risk-score/risk-score.component';
import { SignalCardComponent } from '../signal-card/signal-card.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

/** The "AI Identity Risk Assessment" screen: score, decision, explanation and every signal. */
@Component({
  selector: 'app-risk-assessment-view',
  imports: [RiskScoreComponent, SignalCardComponent, RiskExplanationComponent, StatusBadgeComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let a = assessment();
    <section class="hero card enter" [class]="'hero card enter tone-' + tone()">
      <div class="gauge">
        <app-risk-score [score]="a.overallScore" [level]="a.riskLevel" [size]="230" />
      </div>
      <div class="verdict">
        <span class="eyebrow">AI Identity Risk Assessment · {{ flow() === 'RECOVERY' ? 'Account recovery' : 'Digital onboarding' }}</span>
        <div class="decision">
          <app-status-badge [label]="decision().label" [icon]="decision().icon" [tone]="decision().tone" size="lg" />
        </div>
        <h2>{{ a.headline }}</h2>
        <ul class="highlights">
          @for (h of highlights(); track h.text) {
            <li [class]="h.good ? 'good' : 'bad'"><span aria-hidden="true">{{ h.good ? '✓' : '⚠' }}</span>{{ h.text }}</li>
          }
        </ul>
        <div class="next">
          <span class="eyebrow">What happens next</span>
          <p>{{ a.nextStep }}</p>
        </div>
      </div>
      <dl class="meta">
        <div><dt>Signals fused</dt><dd class="mono">{{ a.signals.length }}</dd></div>
        <div><dt>Flagged</dt><dd class="mono">{{ flagged() }}</dd></div>
        <div><dt>Confidence</dt><dd class="mono">{{ a.confidence }}%</dd></div>
        <div><dt>Assessed</dt><dd class="mono">{{ a.timestamp | date: 'HH:mm:ss' }}</dd></div>
      </dl>
    </section>

    <ng-content />

    <div class="grid">
      <div class="signals">
        <div class="section-head">
          <h3>Identity signals</h3>
          <span class="muted">Each signal is scored independently, then fused by the risk engine.</span>
        </div>
        <div class="cards">
          @for (s of a.signals; track s.id; let i = $index) {
            <app-signal-card class="enter" [style.animation-delay.ms]="120 + i * 70" [signal]="s" />
          }
        </div>
      </div>
      <aside class="card explain enter">
        <app-risk-explanation [assessment]="a" [subject]="flow() === 'RECOVERY' ? 'request' : 'user'" />
      </aside>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 24px; }
    .hero { display: grid; grid-template-columns: auto 1fr auto; gap: 36px; align-items: center; padding: 32px;
      background: radial-gradient(600px 300px at 0% 50%, color-mix(in srgb, var(--tone) 12%, transparent), transparent 70%), var(--surface);
      border-color: color-mix(in srgb, var(--tone) 28%, var(--border)); }
    .verdict { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    h2 { font-size: 30px; }
    .highlights { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; font-size: 13.5px; }
    .highlights li { display: flex; gap: 8px; color: var(--text-2); }
    .good span { color: var(--pass); }
    .bad span { color: var(--warn); }
    .next { padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,.025); border: 1px solid var(--border); }
    .next p { font-size: 14px; margin-top: 4px; }
    .meta { margin: 0; display: grid; gap: 14px; padding-left: 28px; border-left: 1px solid var(--border); }
    dt { font-size: 11.5px; color: var(--muted); }
    dd { margin: 2px 0 0; font-size: 20px; font-weight: 600; }
    .grid { display: grid; grid-template-columns: 1fr 380px; gap: 24px; align-items: start; }
    .section-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
    .section-head h3 { font-size: 18px; }
    .section-head span { font-size: 13px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
    .explain { position: sticky; top: 88px; }
    @media (max-width: 1180px) { .grid { grid-template-columns: 1fr; } .explain { position: static; } }
    @media (max-width: 900px) { .hero { grid-template-columns: 1fr; justify-items: center; } .meta { border: 0; padding: 0; grid-template-columns: repeat(4, 1fr); }
      .highlights { grid-template-columns: 1fr; } }
  `,
})
export class RiskAssessmentViewComponent {
  readonly assessment = input.required<RiskAssessment>();
  readonly flow = input<FlowType>('ONBOARDING');

  protected readonly tone = computed(() => levelTone(this.assessment().riskLevel));
  protected readonly decision = computed(() => DECISION_META[this.assessment().decision]);
  protected readonly flagged = computed(() => this.assessment().signals.filter((s) => s.status !== 'PASS').length);
  protected readonly highlights = computed(() => {
    const f = this.assessment().factors;
    const bad = f.filter((x) => x.impact === 'INCREASES_RISK').slice(0, 3).map((x) => ({ text: shorten(x.label), good: false }));
    const good = f.filter((x) => x.impact === 'REDUCES_RISK').slice(0, bad.length ? 2 : 4).map((x) => ({ text: shorten(x.label), good: true }));
    return [...bad, ...good];
  });
}

const shorten = (s: string) => s.split(/[:;]/)[0].replace(/\.$/, '');
