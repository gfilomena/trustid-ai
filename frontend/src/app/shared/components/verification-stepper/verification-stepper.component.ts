import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Horizontal progress stepper: tells the user where they are and what's next. */
@Component({
  selector: 'app-verification-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="stepper" [style.--count]="steps().length">
      @for (s of steps(); track s; let i = $index) {
        <li class="step" [class.done]="i < current()" [class.active]="i === current()" [attr.aria-current]="i === current() ? 'step' : null">
          <span class="marker mono">
            @if (i < current()) { ✓ } @else { {{ i + 1 }} }
          </span>
          <span class="label">{{ s }}</span>
        </li>
      }
    </ol>
  `,
  styles: `
    .stepper { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(var(--count), 1fr); gap: 8px; }
    .step { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; padding-top: 2px; }
    .step::before { content: ''; position: absolute; top: 15px; left: 38px; right: -4px; height: 2px;
      background: var(--border); border-radius: 2px; }
    .step:last-child::before { display: none; }
    .step.done::before { background: linear-gradient(90deg, var(--brand), var(--brand-2)); }
    .marker { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 600;
      background: var(--surface-2); border: 1px solid var(--border-strong); color: var(--muted); transition: all .3s var(--ease); z-index: 1; }
    .done .marker { background: var(--brand-soft); border-color: var(--brand); color: var(--brand); }
    .active .marker { background: linear-gradient(135deg, var(--brand), var(--brand-2)); border-color: transparent; color: #fff;
      animation: pulse-ring 1.8s infinite; }
    .label { font-size: 12.5px; color: var(--muted); font-weight: 500; }
    .active .label { color: var(--text); }
    .done .label { color: var(--text-2); }
    @media (max-width: 760px) { .label { display: none; } }
  `,
})
export class VerificationStepperComponent {
  readonly steps = input.required<string[]>();
  readonly current = input.required<number>();
}
