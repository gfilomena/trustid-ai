import type { SignalStatus, SubCheck } from '@trustid/contracts';
import { env } from '../../config/env.js';
import { getScenario, type ScenarioProfile } from '../../domain/scenario-catalog.js';
import type { AnalysisContext } from '../provider-contracts.js';

/** Simulated inference latency so the demo feels like a real model call. */
export const simulateLatency = (factor = 1) =>
  new Promise<void>((resolve) => setTimeout(resolve, env.mockLatencyMs * factor));

export const profileFor = (ctx: AnalysisContext): ScenarioProfile => getScenario(ctx.demoScenario ?? 'LEGITIMATE');

export const check = (id: string, label: string, c: { status: SignalStatus; score?: number; detail: string }): SubCheck => ({
  id,
  label,
  ...c,
});
