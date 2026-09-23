import type { DashboardCase, DashboardMetrics, Decision, VerificationSession } from '@trustid/contracts';

/**
 * Fraud-analyst metrics. DEMO: a deterministic historical baseline plus every
 * assessment produced live during the session, so the demo ends on a
 * dashboard that reflects what the audience just watched.
 * Production: read from the decision audit log / analytics warehouse.
 */
const BASELINE = {
  attempts: 1248,
  approved: 1021,
  additionalVerification: 143,
  manualReview: 62,
  rejected: 22,
  riskSum: 1248 * 21.4,
  deepfakes: 47,
  suspiciousDevices: 120,
};

const SEEDED_CASES: DashboardCase[] = [
  { id: 'c-4821', time: '14:32', user: 'User #4821', flow: 'ONBOARDING', risk: 82, riskLevel: 'HIGH', mainSignal: 'Deepfake', decision: 'MANUAL_REVIEW', live: false },
  { id: 'c-4817', time: '14:18', user: 'User #4817', flow: 'RECOVERY', risk: 86, riskLevel: 'HIGH', mainSignal: 'Impossible travel', decision: 'ADDITIONAL_VERIFICATION', live: false },
  { id: 'c-4809', time: '13:57', user: 'User #4809', flow: 'ONBOARDING', risk: 75, riskLevel: 'HIGH', mainSignal: 'Face mismatch', decision: 'REJECT', live: false },
  { id: 'c-4796', time: '13:41', user: 'User #4796', flow: 'ONBOARDING', risk: 64, riskLevel: 'MEDIUM', mainSignal: 'VPN / shared device', decision: 'ADDITIONAL_VERIFICATION', live: false },
  { id: 'c-4788', time: '13:22', user: 'User #4788', flow: 'RECOVERY', risk: 91, riskLevel: 'HIGH', mainSignal: 'Velocity', decision: 'REJECT', live: false },
  { id: 'c-4775', time: '12:58', user: 'User #4775', flow: 'ONBOARDING', risk: 79, riskLevel: 'HIGH', mainSignal: 'Virtual camera', decision: 'MANUAL_REVIEW', live: false },
  { id: 'c-4770', time: '12:40', user: 'User #4770', flow: 'ONBOARDING', risk: 11, riskLevel: 'LOW', mainSignal: 'None', decision: 'APPROVE', live: false },
  { id: 'c-4766', time: '12:31', user: 'User #4766', flow: 'RECOVERY', risk: 18, riskLevel: 'LOW', mainSignal: 'None', decision: 'APPROVE', live: false },
];

const HOURLY = [
  ['08:00', 64, 5], ['09:00', 98, 9], ['10:00', 131, 12], ['11:00', 142, 17], ['12:00', 121, 11],
  ['13:00', 118, 14], ['14:00', 139, 19], ['15:00', 127, 10], ['16:00', 112, 9], ['17:00', 96, 7],
] as const;

export class DashboardService {
  private readonly live = new Map<string, DashboardCase & { deepfake: boolean; device: boolean }>();

  /** Records (or updates, after a step-up) the outcome of a live session. */
  record(session: VerificationSession) {
    const a = session.assessment;
    if (!a) return;
    const flagged = a.signals.filter((s) => s.status !== 'PASS').sort((x, y) => y.riskContribution - x.riskContribution);
    const existing = this.live.get(session.id);
    this.live.set(session.id, {
      id: session.id,
      time: existing?.time ?? new Date().toTimeString().slice(0, 5),
      user: existing?.user ?? `User #${5000 + this.live.size + 1}`,
      flow: session.flow,
      risk: a.overallScore,
      riskLevel: a.riskLevel,
      mainSignal: flagged[0]?.name ?? 'None',
      decision: a.decision,
      live: true,
      deepfake: a.signals.some((s) => s.id === 'deepfake' && s.status === 'FAIL'),
      device: a.signals.some((s) => s.id === 'device' && s.status !== 'PASS'),
    });
  }

  metrics(): DashboardMetrics {
    const live = [...this.live.values()];
    const count = (d: Decision) => live.filter((c) => c.decision === d).length;
    const totals = {
      attempts: BASELINE.attempts + live.length,
      approved: BASELINE.approved + count('APPROVE'),
      additionalVerification: BASELINE.additionalVerification + count('ADDITIONAL_VERIFICATION'),
      manualReview: BASELINE.manualReview + count('MANUAL_REVIEW'),
      rejected: BASELINE.rejected + count('REJECT'),
    };
    const pct = (n: number) => Math.round((1000 * n) / totals.attempts) / 10;
    const riskSum = BASELINE.riskSum + live.reduce((a, c) => a + c.risk, 0);
    const allCases = [...live.reverse().map(({ deepfake: _d, device: _v, ...c }) => c), ...SEEDED_CASES];

    return {
      totals,
      averageRiskScore: Math.round((10 * riskSum) / totals.attempts) / 10,
      deepfakeDetectionRate: pct(BASELINE.deepfakes + live.filter((c) => c.deepfake).length),
      suspiciousDeviceRate: pct(BASELINE.suspiciousDevices + live.filter((c) => c.device).length),
      verificationSuccessRate: pct(totals.approved),
      riskDistribution: [
        { bucket: '0–10', count: 612, level: 'LOW' },
        { bucket: '11–20', count: 287, level: 'LOW' },
        { bucket: '21–30', count: 131, level: 'LOW' },
        { bucket: '31–50', count: 104, level: 'MEDIUM' },
        { bucket: '51–70', count: 58, level: 'MEDIUM' },
        { bucket: '71–85', count: 36, level: 'HIGH' },
        { bucket: '86–100', count: 20, level: 'HIGH' },
      ],
      hourlyAttempts: HOURLY.map(([hour, attempts, flagged]) => ({ hour, attempts, flagged })),
      topSignals: [
        { signal: 'Device Risk', count: 120 },
        { signal: 'Behavioural Anomaly', count: 88 },
        { signal: 'Deepfake Detection', count: 47 },
        { signal: 'Liveness Detection', count: 41 },
        { signal: 'Face Match', count: 23 },
        { signal: 'Velocity Check', count: 19 },
      ],
      recentHighRiskCases: allCases.filter((c) => c.riskLevel !== 'LOW').slice(0, 6),
      recentCases: allCases.slice(0, 12),
      generatedAt: new Date().toISOString(),
    };
  }
}
