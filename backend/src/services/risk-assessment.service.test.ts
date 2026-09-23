import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FlowType, ScenarioId } from '@trustid/contracts';

process.env.MOCK_LATENCY_MS = '0';
const { createContainer } = await import('../container.js');
const { DEMO_OTP } = await import('./step-up.service.js');

const c = createContainer();
const run = (scenario: ScenarioId, flow: FlowType) => c.verification.simulate(scenario, flow);

const EXPECTED: [ScenarioId, FlowType, string, string][] = [
  ['LEGITIMATE', 'ONBOARDING', 'LOW', 'APPROVE'],
  ['LEGITIMATE', 'RECOVERY', 'LOW', 'APPROVE'],
  ['DEEPFAKE_ATTACK', 'ONBOARDING', 'HIGH', 'MANUAL_REVIEW'],
  ['STOLEN_IDENTITY', 'ONBOARDING', 'HIGH', 'REJECT'],
  ['SUSPICIOUS_DEVICE', 'ONBOARDING', 'MEDIUM', 'ADDITIONAL_VERIFICATION'],
  ['SUSPICIOUS_DEVICE', 'RECOVERY', 'MEDIUM', 'ADDITIONAL_VERIFICATION'],
  ['ACCOUNT_TAKEOVER', 'RECOVERY', 'HIGH', 'ADDITIONAL_VERIFICATION'],
];

for (const [scenario, flow, level, decision] of EXPECTED) {
  test(`${scenario} / ${flow} → ${level} / ${decision}`, async () => {
    const s = await run(scenario, flow);
    console.log(`  ${scenario.padEnd(18)} ${flow.padEnd(10)} score=${s.assessment!.overallScore}`);
    assert.equal(s.assessment!.riskLevel, level);
    assert.equal(s.assessment!.decision, decision);
    assert.ok(s.assessment!.reasons.length > 0);
  });
}

test('scenarios are deterministic', async () => {
  const [a, b] = await Promise.all([run('DEEPFAKE_ATTACK', 'ONBOARDING'), run('DEEPFAKE_ATTACK', 'ONBOARDING')]);
  assert.equal(a.assessment!.overallScore, b.assessment!.overallScore);
});

test('step-up approves a genuine user on a suspicious device', async () => {
  const s = await run('SUSPICIOUS_DEVICE', 'ONBOARDING');
  const before = s.assessment!.overallScore;
  assert.throws(() => c.stepUp.run({ sessionId: s.id, method: 'OTP_REGISTERED_PHONE', code: '000000' }));
  const r = c.stepUp.run({ sessionId: s.id, method: 'OTP_REGISTERED_PHONE', code: DEMO_OTP });
  assert.equal(r.success, true);
  assert.equal(r.assessment.decision, 'APPROVE');
  console.log(`  step-up: ${before} → ${r.assessment.overallScore}`);
  assert.ok(r.assessment.overallScore < before);
});

test('step-up blocks an account takeover', async () => {
  const s = await run('ACCOUNT_TAKEOVER', 'RECOVERY');
  const r = c.stepUp.run({ sessionId: s.id, method: 'BANK_APP_CONFIRMATION' });
  assert.equal(r.success, false);
  assert.equal(r.assessment.decision, 'REJECT');
});
