import { Injectable } from '@angular/core';
import type { ClientContext } from '../../models/verification.models';

/**
 * Collects coarse, non-identifying device & behaviour telemetry for the risk
 * models. Production would use a consented device-intelligence SDK; no
 * keystroke contents are ever captured, only counts and timings.
 */
@Injectable({ providedIn: 'root' })
export class ClientContextService {
  private formStartedAt?: number;
  private keystrokes = 0;
  private pastes = 0;

  startForm() {
    this.formStartedAt ??= performance.now();
  }

  keystroke() {
    this.startForm();
    this.keystrokes++;
  }

  paste() {
    this.pastes++;
  }

  snapshot(): ClientContext {
    return {
      userAgent: navigator.userAgent.slice(0, 400),
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}`,
      formFillSeconds: this.formStartedAt ? Math.round((performance.now() - this.formStartedAt) / 1000) : undefined,
      keystrokes: this.keystrokes,
      pasteEvents: this.pastes,
    };
  }

  reset() {
    this.formStartedAt = undefined;
    this.keystrokes = 0;
    this.pastes = 0;
  }
}
