import type { RiskSignal, SignalId } from '@trustid/contracts';
import { SIGNAL_DEFINITIONS, riskContributionFor, statusFor } from './signal-definitions.js';

export interface SignalInput {
  score: number;
  confidence: number;
  explanation: string;
  evidence?: string[];
  provider: string;
}

/** Builds a normalised RiskSignal so every provider reports in the same shape. */
export function buildSignal(id: SignalId, input: SignalInput): RiskSignal {
  const def = SIGNAL_DEFINITIONS[id];
  const score = clamp(Math.round(input.score));
  return {
    id,
    name: def.name,
    category: def.category,
    polarity: def.polarity,
    score,
    confidence: clamp(Math.round(input.confidence)),
    status: statusFor(id, score),
    riskContribution: riskContributionFor(id, score),
    explanation: input.explanation,
    evidence: input.evidence,
    provider: input.provider,
  };
}

export const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
