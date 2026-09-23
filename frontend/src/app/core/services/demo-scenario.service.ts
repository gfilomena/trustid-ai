import { Injectable, computed, inject, signal } from '@angular/core';
import type { RuntimeMode, ScenarioId, ScenarioSummary } from '../../models/verification.models';
import { ApiService } from './api.service';

const STORAGE_KEY = 'trustid.demoScenario';

/**
 * DEMO ONLY: the presenter-selected fraud scenario that the backend mock
 * providers use. In production mode the backend ignores it.
 */
@Injectable({ providedIn: 'root' })
export class DemoScenarioService {
  private readonly api = inject(ApiService);

  readonly scenario = signal<ScenarioId>(this.restore());
  readonly scenarios = signal<ScenarioSummary[]>([]);
  readonly mode = signal<RuntimeMode | 'offline'>('demo');
  readonly current = computed(() => this.scenarios().find((s) => s.id === this.scenario()));

  constructor() {
    this.api.scenarios().then((s) => this.scenarios.set(s)).catch(() => this.mode.set('offline'));
    this.api.health().then((h) => this.mode.set(h.mode)).catch(() => this.mode.set('offline'));
  }

  select(id: ScenarioId) {
    this.scenario.set(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage unavailable: keep in memory */
    }
  }

  private restore(): ScenarioId {
    try {
      return (localStorage.getItem(STORAGE_KEY) as ScenarioId) || 'LEGITIMATE';
    } catch {
      return 'LEGITIMATE';
    }
  }
}
