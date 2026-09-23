import { buildSignal } from '../../domain/signal-factory.js';
import type { ContextInput, DeviceRiskService } from '../provider-contracts.js';
import { check, profileFor, simulateLatency } from './mock-utils.js';

export class MockDeviceRiskService implements DeviceRiskService {
  readonly name = 'mock-device-intel@1.0';

  async assess(input: ContextInput) {
    await simulateLatency(0.8);
    const profile = profileFor(input);
    const p = profile.device;
    const score = profile.flowOverrides?.[input.flow]?.deviceScore ?? p.score;
    const { timezone, language } = input.clientContext;

    return {
      checks: [
        check('device_reputation', 'Device reputation', p.checks.deviceReputation),
        check('ip_reputation', 'IP reputation', p.checks.ipReputation),
        check('vpn_proxy', 'VPN / Proxy detection', p.checks.vpnProxy),
        check('impossible_travel', 'Impossible travel', p.checks.impossibleTravel),
      ],
      signal: buildSignal('device', {
        score,
        confidence: p.confidence,
        explanation: p.explanation,
        // Real client telemetry is echoed as evidence to show what the model sees.
        evidence: [...p.evidence, `Client timezone ${timezone}, language ${language}`],
        provider: this.name,
      }),
    };
  }
}
