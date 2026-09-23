import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { RiskAssessment } from '../../../models/verification.models';
import { levelTone } from '../../../models/risk.models';

/**
 * Explainable-AI panel: renders the main reasons behind a decision so that
 * users and analysts understand WHY, not just the score.
 */
@Component({
  selector: 'app-risk-explanation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="xai" [class]="'xai tone-' + tone()">
      <header>
        <span class="eyebrow">Explainable AI</span>
        <h3>Why is this {{ subject() }} considered <em>{{ assessment().riskLevel.toLowerCase() }} risk</em>?</h3>
      </header>

      @if (increases().length) {
        <div class="group">
          <div class="group-title">Raising the risk</div>
          <ul>
            @for (f of increases(); track f.signalId; let i = $index) {
              <li class="factor up enter" [style.animation-delay.ms]="i * 90">
                <span class="arrow" aria-hidden="true">▲</span>
                <span class="text">{{ f.label }}</span>
                <span class="share mono" title="Share of the risk explained by this factor">{{ f.weight }}%</span>
                <span class="bar" [style.--w.%]="f.weight"></span>
              </li>
            }
          </ul>
        </div>
      }

      <div class="group">
        <div class="group-title">Reducing the risk</div>
        <ul>
          @for (f of decreases(); track f.signalId; let i = $index) {
            <li class="factor down enter" [style.animation-delay.ms]="(increases().length + i) * 90">
              <span class="arrow" aria-hidden="true">✓</span>
              <span class="text">{{ f.label }}</span>
            </li>
          }
        </ul>
      </div>

      <footer>
        <span class="mono rule">{{ assessment().decisionRule }}</span>
        <span class="mono">{{ assessment().modelVersion }} · confidence {{ assessment().confidence }}%</span>
      </footer>
    </section>
  `,
  styles: `
    .xai { display: flex; flex-direction: column; gap: 18px; }
    h3 { font-size: 20px; margin-top: 6px; }
    em { font-style: normal; color: var(--tone); }
    .group-title { font-size: 12px; color: var(--muted); margin-bottom: 8px; font-weight: 500; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .factor { position: relative; display: grid; grid-template-columns: 22px 1fr auto; gap: 10px; align-items: center;
      padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,.02); border: 1px solid var(--border); overflow: hidden; font-size: 13.5px; }
    .up .arrow { color: var(--warn); font-size: 10px; }
    .up .share { color: var(--text-2); font-size: 12px; }
    .bar { position: absolute; left: 0; bottom: 0; height: 2px; width: var(--w); background: var(--warn); opacity: .8; }
    .down .arrow { color: var(--pass); }
    .down { color: var(--text-2); }
    footer { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--muted); padding-top: 4px; border-top: 1px dashed var(--border); }
    .rule { color: var(--text-2); }
  `,
})
export class RiskExplanationComponent {
  readonly assessment = input.required<RiskAssessment>();
  readonly subject = input('user');

  protected readonly tone = computed(() => levelTone(this.assessment().riskLevel));
  protected readonly increases = computed(() => this.assessment().factors.filter((f) => f.impact === 'INCREASES_RISK'));
  protected readonly decreases = computed(() =>
    this.assessment().factors.filter((f) => f.impact === 'REDUCES_RISK').slice(0, this.increases().length ? 3 : 5),
  );
}
