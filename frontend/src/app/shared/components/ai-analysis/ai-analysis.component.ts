import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { ApiError } from '../../../core/services/api.service';
import { RiskService, type AnalysisStage } from '../../../core/services/risk.service';
import type { ContextRiskResult, DeepfakeAnalysisResult, RiskAssessment } from '../../../models/verification.models';
import { ContextRiskPanelComponent } from '../context-risk-panel/context-risk-panel.component';
import { DeepfakeAnalysisComponent } from '../deepfake-analysis/deepfake-analysis.component';

type StageState = 'pending' | 'running' | 'done';

/**
 * AI Risk Assessment step: runs deepfake forensics, passive device/behaviour
 * signals and multi-signal fusion in sequence, visualising each stage.
 */
@Component({
  selector: 'app-ai-analysis',
  imports: [DeepfakeAnalysisComponent, ContextRiskPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pipeline card card--tight">
      @for (s of stages; track s.id; let i = $index) {
        <div class="stage" [class]="'stage ' + state()[s.id]">
          <span class="marker">
            @switch (state()[s.id]) {
              @case ('done') { ✓ }
              @case ('running') { <span class="spinner"></span> }
              @default { {{ i + 1 }} }
            }
          </span>
          <span>{{ s.label }}</span>
        </div>
        @if (i < stages.length - 1) { <span class="connector" [class.lit]="state()[s.id] === 'done'"></span> }
      }
    </div>

    @if (state().deepfake !== 'pending') { <app-deepfake-analysis [result]="deepfake()" /> }
    @if (state().context !== 'pending') { <app-context-risk-panel [result]="context()" /> }

    @if (state().fusion === 'running') {
      <div class="card fusion enter">
        <div class="orbit"><span></span><span></span><span></span></div>
        <div>
          <h3>Fusing {{ signalCount() }} identity signals</h3>
          <p class="muted">Correlated evidence is grouped so no single signal is double counted, then scored against the decision policy.</p>
        </div>
      </div>
    }

    @if (error()) {
      <div class="card error" role="alert">
        <strong>Analysis failed</strong><p>{{ error() }}</p>
        <button class="btn btn--sm" (click)="run()">Retry</button>
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 20px; }
    .pipeline { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .stage { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--muted); }
    .stage.running { color: var(--text); }
    .stage.done { color: var(--text-2); }
    .marker { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 12px;
      background: var(--surface-2); border: 1px solid var(--border-strong); }
    .running .marker { border-color: var(--brand); color: var(--brand); }
    .done .marker { background: var(--pass-soft); border-color: var(--pass); color: var(--pass); }
    .connector { flex: 1; min-width: 24px; height: 2px; background: var(--border); border-radius: 2px; }
    .connector.lit { background: var(--pass); }
    .fusion { display: flex; gap: 24px; align-items: center; }
    .fusion h3 { font-size: 18px; margin-bottom: 4px; }
    .orbit { position: relative; width: 56px; height: 56px; flex: none; }
    .orbit span { position: absolute; inset: 0; border-radius: 50%; border: 2px solid transparent; border-top-color: var(--brand); animation: spin 1.2s linear infinite; }
    .orbit span:nth-child(2) { inset: 8px; border-top-color: var(--brand-2); animation-duration: .9s; animation-direction: reverse; }
    .orbit span:nth-child(3) { inset: 16px; border-top-color: var(--pass); animation-duration: .7s; }
    .error { border-color: var(--fail); display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
  `,
})
export class AiAnalysisComponent implements OnInit {
  private readonly risk = inject(RiskService);

  readonly sessionId = input.required<string>();
  readonly completed = output<{ assessment: RiskAssessment; deepfake: DeepfakeAnalysisResult; context: ContextRiskResult }>();

  protected readonly stages: AnalysisStage[] = this.risk.stages;
  protected readonly state = signal<Record<AnalysisStage['id'], StageState>>({ deepfake: 'pending', context: 'pending', fusion: 'pending' });
  protected readonly deepfake = signal<DeepfakeAnalysisResult | null>(null);
  protected readonly context = signal<ContextRiskResult | null>(null);
  protected readonly signalCount = signal(0);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    this.run();
  }

  async run() {
    this.error.set(null);
    const id = this.sessionId();
    try {
      this.mark('deepfake', 'running');
      this.deepfake.set(await this.risk.runDeepfake(id));
      this.mark('deepfake', 'done');
      await pause(900);

      this.mark('context', 'running');
      this.context.set(await this.risk.runContext(id));
      this.mark('context', 'done');
      await pause(900);

      this.mark('fusion', 'running');
      const [assessment] = await Promise.all([this.risk.assess(id), pause(1400)]);
      this.signalCount.set(assessment.signals.length);
      this.mark('fusion', 'done');
      this.completed.emit({ assessment, deepfake: this.deepfake()!, context: this.context()! });
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Unexpected error');
    }
  }

  private mark(id: AnalysisStage['id'], s: StageState) {
    this.state.update((st) => ({ ...st, [id]: s }));
  }
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
