import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { DemoScenarioService } from '../../../core/services/demo-scenario.service';
import type { ScenarioId } from '../../../models/verification.models';
import { SCENARIO_ICONS } from '../../../models/risk.models';

/** Presenter control: choose which deterministic fraud scenario the mocks play. */
@Component({
  selector: 'app-scenario-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="switcher">
      <button type="button" class="trigger" [class.attack]="demo.scenario() !== 'LEGITIMATE'" (click)="open.set(!open())"
        [attr.aria-expanded]="open()" aria-haspopup="listbox">
        <span class="dot"></span>
        <span class="lbl">Demo:</span>
        <strong>{{ demo.current()?.label ?? 'Legitimate onboarding' }}</strong>
        <span aria-hidden="true">▾</span>
      </button>
      @if (open()) {
        <ul class="menu enter" role="listbox">
          @for (s of demo.scenarios(); track s.id) {
            <li role="option" [attr.aria-selected]="s.id === demo.scenario()">
              <button type="button" (click)="pick(s.id)" [class.selected]="s.id === demo.scenario()">
                <span class="icon">{{ icons[s.id] }}</span>
                <span><strong>{{ s.label }}</strong><small>{{ s.attackVector }}</small></span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .switcher { position: relative; }
    .trigger { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; border-radius: 10px; cursor: pointer;
      border: 1px solid var(--border-strong); background: var(--surface-2); font-size: 13px; }
    .trigger .lbl { color: var(--muted); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pass); box-shadow: 0 0 0 3px var(--pass-soft); }
    .attack { border-color: color-mix(in srgb, var(--fail) 50%, transparent); }
    .attack .dot { background: var(--fail); box-shadow: 0 0 0 3px var(--fail-soft); }
    .menu { position: absolute; right: 0; top: calc(100% + 8px); width: 320px; list-style: none; margin: 0; padding: 6px; z-index: 50;
      background: var(--surface-2); border: 1px solid var(--border-strong); border-radius: 14px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.8); }
    .menu button { width: 100%; display: flex; gap: 12px; align-items: center; text-align: left; padding: 10px; border-radius: 10px;
      border: 0; background: none; cursor: pointer; }
    .menu button:hover, .menu button.selected { background: var(--surface-3); }
    .menu .icon { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand); flex: none; }
    .menu strong { display: block; font-size: 13.5px; }
    .trigger strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
    @media (max-width: 560px) { .trigger .lbl { display: none; } .trigger strong { max-width: 150px; } .menu { width: min(320px, calc(100vw - 32px)); } }
    .menu small { color: var(--muted); font-size: 12px; }
  `,
})
export class ScenarioSwitcherComponent {
  protected readonly demo = inject(DemoScenarioService);
  private readonly host = inject(ElementRef);
  protected readonly open = signal(false);
  protected readonly icons = SCENARIO_ICONS;

  pick(id: ScenarioId) {
    this.demo.select(id);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!this.host.nativeElement.contains(e.target)) this.open.set(false);
  }
}
