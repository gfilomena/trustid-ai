# TrustID AI

**AI-powered identity verification against deepfakes and fraud.**

Hackathon MVP for the challenge *"How can we outsmart deepfakes to make digital onboarding and account recovery both fraud-resistant and frictionless?"*

TrustID doesn't rely on a single deepfake detector. It fuses **8 independent identity signals** (document, face match, identity consistency, liveness, deepfake forensics, device, behaviour, velocity) into one **explainable** risk score. Then a separate **decision policy** adds friction only when the evidence calls for it.

## Run it

Requirements: Node 20+ (tested on Node 24).

```bash
npm run install:all
npm run dev          # API on :4000 + Angular on :4200
```

Or in two terminals: `npm run dev:api` and `npm run dev:web`. Then open http://localhost:4200.

Tests (risk engine, all scenarios, step-up): `npm test`. Typecheck: `npm run typecheck`.

## Demo script (2–3 min)

1. **Landing**: pick *Start Digital Onboarding* (header scenario = *Legitimate onboarding*).
2. Personal info → *Use demo document* → *Analyse* → selfie → liveness → AI analysis.
3. Result: **13/100 LOW · APPROVED**, with explanation and 8 signal cards.
4. Click **Replay as "Deepfake attack"** and run the same flow: liveness fails (2 challenges), deepfake probability 89%, **89/100 HIGH · MANUAL REVIEW**.
5. **Scenario simulator** → *Compare all scenarios*: 5 scenarios, 4 different decisions, side by side.
6. Optional: *Suspicious device* → **ADDITIONAL VERIFICATION** → OTP `246810` → **APPROVED** (friction only when needed). *Account takeover* (recovery) → step-up rejected by owner → **REJECTED**.
7. **Analyst dashboard**: KPIs, charts, case queue with the live cases from the demo.

| Scenario | Flow | Risk | Decision | Rule |
|---|---|---|---|---|
| Legitimate | onboarding | 13 LOW | APPROVE | R8 low risk |
| Deepfake attack | onboarding | 89 HIGH | MANUAL_REVIEW | R4 presentation attack |
| Stolen identity | onboarding | 75 HIGH | REJECT | R2 biometric mismatch |
| Suspicious device | onboarding | 62 MEDIUM | ADDITIONAL_VERIFICATION | R7 medium risk |
| Account takeover | recovery | 80 HIGH | ADDITIONAL_VERIFICATION | R5 context-only risk → step-up |

## Architecture

```
contracts/index.ts          Shared, type-only API contracts (imported by both apps via @trustid/contracts)
backend/src/
  providers/provider-contracts.ts   Ports: DocumentVerificationService, FaceMatchService, LivenessService,
                                    DeepfakeDetectionService, DeviceRiskService, BehaviourRiskService, AccountIdentityService
  providers/mock/*                  Deterministic Mock* implementations (driven by the scenario catalog)
  providers/real/*                  Skeleton for a real vendor adapter (where credentials & controls go)
  domain/signal-definitions.ts      Per-signal weight, polarity, thresholds, evidence family
  domain/scenario-catalog.ts        DEMO ONLY scenario data
  services/risk-assessment.service.ts  Multi-signal fusion → score, level, factors, reasons, confidence
  services/decision-policy.ts       Ordered, explainable rules → APPROVE / ADDITIONAL_VERIFICATION / MANUAL_REVIEW / REJECT
  services/verification|recovery|step-up|dashboard.service.ts   Orchestration
  container.ts                      Composition root (DI): swap Mock* for real adapters here
  api/                              REST routes + zod validation + error mapping
frontend/src/app/
  core/services      api, verification (flow state, Signals), risk, demo-scenario, camera, client-context
  shared/components  risk-score, signal-card, verification-stepper, confidence-indicator, status-badge,
                     risk-explanation (RiskExplanationComponent), deepfake-analysis, context-risk-panel,
                     risk-assessment-view, step-up-panel, ai-analysis, scenario-switcher
  features           landing, onboarding (6 steps), recovery (5 steps), simulator, dashboard
```

### Risk engine

1. Each signal contributes evidence `e = weight × (risk/100)^γ` (γ = 1.1 dampens weak noise).
2. Signals are grouped into correlated **evidence families** (media integrity, identity, context). Within a family: strongest + ½·(noisy-OR − strongest). A deepfake that degrades both liveness and deepfake scores is therefore not double counted.
3. Families combine by **noisy-OR**, so a single strong red flag is never averaged away.
4. Score → level (0–30 LOW, 31–70 MEDIUM, 71–100 HIGH). The **DecisionPolicy** is separate from scoring; its first matching rule decides the action, and the rule id is returned for explainability.

### API

`POST /api/verification/start|document|face|liveness|deepfake|step-up` · `GET /api/verification/:id` · `POST /api/risk/signals|assess` · `POST /api/recovery/start|verify` · `GET /api/dashboard/metrics` · `GET /api/scenarios` · `POST /api/simulator/run` · `GET /api/health`

## Security & privacy (MVP stance)

- **No raw biometrics leave the browser in demo mode.** Only file/frame metadata is sent, and the API body limit is 32 kB. Nothing is persisted: sessions are in-memory with a 30-minute TTL.
- Document numbers are masked in API responses. Recovery shows only masked account data.
- Provider credentials live server-side only (`config/env.ts`, `providers/real/*`). Angular never sees API keys.
- Demo vs production is explicit: `TRUSTID_MODE=production` refuses to start with mock providers, and the scenario selector and simulator are disabled outside demo mode.
- Comments marked *Production* flag where real controls are required: encrypted storage and audit log, rate limiting, OIDC/RBAC for analyst endpoints, anti-enumeration, OTP expiry, DPA / GDPR Art. 9 handling, and a fail-closed vendor fallback.
