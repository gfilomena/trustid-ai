import { ChangeDetectionStrategy, Component, effect, inject, output, signal } from '@angular/core';
import { ApiError } from '../../../core/services/api.service';
import { ClientContextService } from '../../../core/services/client-context.service';
import { DemoScenarioService } from '../../../core/services/demo-scenario.service';
import { VerificationService } from '../../../core/services/verification.service';
import type { ApplicantInfo } from '../../../models/verification.models';
import { DEMO_PERSONAS } from '../../../models/risk.models';

@Component({
  selector: 'app-personal-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="card form enter" (submit)="$event.preventDefault(); submit()" (keydown)="client.keystroke()" (paste)="client.paste()">
      <div class="grid">
        <div class="field span-2">
          <label for="fullName">Full legal name</label>
          <input id="fullName" autocomplete="name" [value]="model().fullName" (input)="set('fullName', $event)" required />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" autocomplete="email" [value]="model().email" (input)="set('email', $event)" required />
        </div>
        <div class="field">
          <label for="phone">Mobile phone</label>
          <input id="phone" type="tel" autocomplete="tel" [value]="model().phone ?? ''" (input)="set('phone', $event)" />
        </div>
        <div class="field">
          <label for="dob">Date of birth</label>
          <input id="dob" type="date" [value]="model().dateOfBirth" (input)="set('dateOfBirth', $event)" required />
        </div>
        <div class="field">
          <label for="country">Country of residence</label>
          <select id="country" [value]="model().country" (change)="set('country', $event)">
            @for (c of countries; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </div>
      </div>

      <aside class="privacy">
        <strong>🔒 Privacy by design</strong>
        <p>Only what's needed for verification is processed. Images are analysed and discarded, never stored. We collect coarse, anonymous interaction timing (not what you type) to spot bots.</p>
      </aside>

      <div class="actions">
        @if (error()) { <span class="error" role="alert">{{ error() }}</span> }
        <button class="btn btn--primary btn--lg" type="submit" [disabled]="busy() || !valid()">
          @if (busy()) { <span class="spinner"></span> } Continue →
        </button>
      </div>
    </form>
  `,
  styles: `
    .form { display: grid; grid-template-columns: 1fr 300px; gap: 28px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .span-2 { grid-column: span 2; }
    .privacy { padding: 18px; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--border); font-size: 13px; color: var(--text-2);
      display: flex; flex-direction: column; gap: 8px; align-self: start; }
    .privacy strong { color: var(--text); }
    .actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; align-items: center; gap: 16px; }
    .error { color: var(--fail); font-size: 13px; }
    @media (max-width: 900px) { .form { grid-template-columns: 1fr; } .grid { grid-template-columns: 1fr; } .span-2 { grid-column: auto; } }
  `,
})
export class PersonalInfoComponent {
  protected readonly client = inject(ClientContextService);
  private readonly demo = inject(DemoScenarioService);
  private readonly flow = inject(VerificationService);
  readonly completed = output<void>();

  protected readonly countries = ['Italy', 'France', 'Germany', 'Spain', 'United Kingdom', 'Netherlands'];
  protected readonly model = signal<ApplicantInfo>({ ...DEMO_PERSONAS.LEGITIMATE });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Demo convenience: pre-fill the persona matching the selected scenario.
    effect(() => this.model.set({ ...DEMO_PERSONAS[this.demo.scenario()] }));
    this.client.startForm();
  }

  protected valid() {
    const m = this.model();
    return m.fullName.trim().length > 1 && /^\S+@\S+\.\S+$/.test(m.email) && /^\d{4}-\d{2}-\d{2}$/.test(m.dateOfBirth);
  }

  protected set(key: keyof ApplicantInfo, e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.model.update((m) => ({ ...m, [key]: value }));
  }

  async submit() {
    if (!this.valid()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.flow.start(this.model());
      this.completed.emit();
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Could not start verification');
    } finally {
      this.busy.set(false);
    }
  }
}
