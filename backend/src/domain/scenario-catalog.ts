import type { Decision, FlowType, LivenessChallengeId, ScenarioId, ScenarioSummary, SignalStatus } from '@trustid/contracts';

/**
 * DEMO ONLY. Deterministic fraud scenarios that drive the mock AI providers,
 * so a live presentation always produces the same results without real
 * deepfake footage or stolen documents.
 *
 * Real providers never read this file. In production mode the scenario
 * selector is ignored (see config/env.ts).
 */

interface Scored {
  score: number;
  confidence: number;
  explanation: string;
  evidence: string[];
}

interface Check {
  status: SignalStatus;
  score?: number;
  detail: string;
}

export interface ScenarioProfile extends ScenarioSummary {
  document: Scored & { dataConsistency: number; ocr: SignalStatus; mrz: Check; hologram: Check; tamper: Check; expiry: Check };
  face: Scored & { quality: Check; reference: Check };
  identityConsistency: Scored;
  accountIdentity: Scored & { checks: Record<'email' | 'history' | 'device' | 'simSwap' | 'location', Check> };
  liveness: Scored & { failedChallenges: LivenessChallengeId[]; depth: Check; texture: Check; replay: Check };
  deepfake: Scored & {
    checks: Record<'face' | 'frame' | 'lighting' | 'texture' | 'motion' | 'artifacts', Check>;
  };
  device: Scored & { checks: Record<'deviceReputation' | 'ipReputation' | 'vpnProxy' | 'impossibleTravel', Check> };
  behaviour: Scored;
  velocity: Scored;
  stepUp: { succeeds: boolean; message: string };
  /** Override for flows that need different numbers (e.g. recovery). */
  flowOverrides?: Partial<Record<FlowType, { deviceScore?: number; livenessScore?: number; behaviourScore?: number }>>;
}

const pass = (detail: string, score?: number): Check => ({ status: 'PASS', detail, score });
const warn = (detail: string, score?: number): Check => ({ status: 'WARNING', detail, score });
const fail = (detail: string, score?: number): Check => ({ status: 'FAIL', detail, score });

const CLEAN_DEEPFAKE_CHECKS: ScenarioProfile['deepfake']['checks'] = {
  face: pass('Facial landmarks stable across 48 frames', 96),
  frame: pass('No frame interpolation or splicing detected', 97),
  lighting: pass('Specular highlights consistent with a single light source', 94),
  texture: pass('Natural skin micro-texture and pore distribution', 95),
  motion: pass('Head motion follows natural biomechanics', 93),
  artifacts: pass('No GAN/diffusion spectral fingerprints', 96),
};

export const SCENARIOS: Record<ScenarioId, ScenarioProfile> = {
  LEGITIMATE: {
    id: 'LEGITIMATE',
    label: 'Legitimate onboarding',
    description: 'A genuine customer with a valid passport on their usual phone.',
    attackVector: 'None: baseline genuine user',
    expectedDecision: 'APPROVE',
    recommendedFlow: 'ONBOARDING',
    document: {
      score: 97, confidence: 96, dataConsistency: 98, ocr: 'PASS',
      explanation: 'Passport is authentic and all security features validated.',
      evidence: ['MRZ checksum valid', 'Hologram and microprint detected', 'No digital tampering', 'Document not expired'],
      mrz: pass('MRZ parsed, all 4 check digits valid', 99),
      hologram: pass('Optically variable features detected', 95),
      tamper: pass('No font, cloning or splicing anomalies', 97),
      expiry: pass('Valid until 2031-04-17'),
    },
    face: {
      score: 96, confidence: 95,
      explanation: 'Selfie strongly matches the passport portrait.',
      evidence: ['Cosine similarity 0.91 (threshold 0.72)', 'Single face detected', 'Frontal pose, good illumination'],
      quality: pass('Image quality 92/100', 92),
      reference: pass('Matched against passport chip portrait', 96),
    },
    identityConsistency: {
      score: 97, confidence: 94,
      explanation: 'Name, date of birth and nationality agree across all sources.',
      evidence: ['Form data = OCR data', 'Email domain age > 6 years', 'Phone number registered to applicant'],
    },
    accountIdentity: {
      score: 96, confidence: 94,
      explanation: 'Recovery request matches the known account history.',
      evidence: ['Email verified on file', 'Request from a previously seen device', 'No recent SIM swap'],
      checks: {
        email: pass('Email matches account on file'),
        history: pass('No recovery attempts in the last 12 months'),
        device: pass('Device seen 43 times on this account'),
        simSwap: pass('No SIM swap in the last 90 days'),
        location: pass('Milan, IT: matches usual login region'),
      },
    },
    liveness: {
      score: 94, confidence: 93, failedChallenges: [],
      explanation: 'All active challenges completed naturally; 3D depth confirmed.',
      evidence: ['4/4 challenges passed', 'Depth map consistent with a real face', 'Natural blink duration 180 ms'],
      depth: pass('Parallax consistent with a 3D face', 95),
      texture: pass('No screen moiré or paper texture', 94),
      replay: pass('No replay or virtual-camera signature', 96),
    },
    deepfake: {
      score: 5, confidence: 95,
      explanation: 'No indicators of synthetic or manipulated media.',
      evidence: ['All 6 forensic detectors below threshold', 'Physical camera sensor noise present'],
      checks: CLEAN_DEEPFAKE_CHECKS,
    },
    device: {
      score: 8, confidence: 92,
      explanation: 'Trusted device on a residential network.',
      evidence: ['Device age 14 months', 'Residential ISP, Milan', 'No emulator or root indicators'],
      checks: {
        deviceReputation: pass('Clean device history, not linked to other accounts'),
        ipReputation: pass('Residential IP, no abuse reports'),
        vpnProxy: pass('No VPN, proxy or Tor detected'),
        impossibleTravel: pass('Location consistent with previous sessions'),
      },
    },
    behaviour: {
      score: 6, confidence: 88,
      explanation: 'Typing cadence and navigation consistent with a human user.',
      evidence: ['Form completed in natural time', 'No clipboard paste in identity fields'],
    },
    velocity: {
      score: 4, confidence: 95,
      explanation: 'First onboarding attempt for this identity.',
      evidence: ['1 attempt / 24h for this identity', '1 attempt / 24h from this device'],
    },
    stepUp: { succeeds: true, message: 'Verification confirmed.' },
  },

  DEEPFAKE_ATTACK: {
    id: 'DEEPFAKE_ATTACK',
    label: 'Deepfake attack',
    description: 'An attacker injects a face-swapped video stream through a virtual camera.',
    attackVector: 'Face-swap deepfake + virtual camera injection',
    expectedDecision: 'MANUAL_REVIEW',
    recommendedFlow: 'ONBOARDING',
    document: {
      score: 94, confidence: 92, dataConsistency: 95, ocr: 'PASS',
      explanation: 'Document itself appears genuine.',
      evidence: ['MRZ checksum valid', 'Security features detected'],
      mrz: pass('MRZ parsed, check digits valid', 97),
      hologram: pass('Optically variable features detected', 91),
      tamper: pass('No tampering anomalies', 94),
      expiry: pass('Valid until 2029-11-02'),
    },
    face: {
      score: 91, confidence: 70,
      explanation: 'Face matches the document (expected: the deepfake is built from the victim\'s photo).',
      evidence: ['High similarity, unusually low frame-to-frame variance', 'Face match alone cannot detect this attack'],
      quality: pass('Image quality 97/100 (unusually perfect)', 97),
      reference: pass('Matched against document portrait', 91),
    },
    identityConsistency: {
      score: 81, confidence: 80,
      explanation: 'Contact details were created recently and are weakly linked to the identity.',
      evidence: ['Email created 3 days ago', 'Phone is a VoIP number'],
    },
    accountIdentity: {
      score: 84, confidence: 78,
      explanation: 'Account exists, but the request comes from an unknown context.',
      evidence: ['Email matches account', 'Device never seen before'],
      checks: {
        email: pass('Email matches account on file'),
        history: pass('No previous recovery attempts'),
        device: warn('Device never seen on this account'),
        simSwap: pass('No SIM swap detected'),
        location: warn('Amsterdam, NL: different from usual region'),
      },
    },
    liveness: {
      score: 38, confidence: 86, failedChallenges: ['TURN_LEFT', 'BLINK'],
      explanation: 'Liveness failed: head-turn and blink responses were not physically plausible.',
      evidence: ['Head turn: face boundary warped at 34° yaw', 'Blink duration 40 ms (human 100–400 ms)', 'Virtual camera driver detected'],
      depth: fail('No parallax: flat depth profile during head turn', 31),
      texture: warn('Over-smoothed skin texture', 55),
      replay: fail('Virtual camera "OBS Virtual Camera" in media pipeline', 12),
    },
    deepfake: {
      score: 89, confidence: 92,
      explanation: 'Potential synthetic media detected: face-swap artifacts across multiple detectors.',
      evidence: ['Blending boundary around jawline', 'Lighting direction inconsistent between face and background', 'GAN spectral fingerprint in 71% of frames'],
      checks: {
        face: warn('Landmark jitter at the face boundary during motion', 58),
        frame: fail('Temporal flicker between frames 18–31', 24),
        lighting: fail('Face lit from left, background from right', 19),
        texture: fail('Skin texture lacks natural sensor noise', 22),
        motion: warn('Head rotation lags behind neck motion by 3 frames', 47),
        artifacts: fail('GAN upsampling fingerprint detected', 11),
      },
    },
    device: {
      score: 61, confidence: 84,
      explanation: 'Virtual camera software and a data-centre IP detected.',
      evidence: ['Virtual camera driver present', 'Hosting-provider ASN', 'Browser fingerprint seen on 3 other applications'],
      checks: {
        deviceReputation: warn('Fingerprint linked to 3 other applications this week'),
        ipReputation: warn('Data-centre IP (hosting ASN)'),
        vpnProxy: warn('Commercial VPN exit node'),
        impossibleTravel: pass('No previous sessions to compare'),
      },
    },
    behaviour: {
      score: 72, confidence: 81,
      explanation: 'Form was filled with scripted, copy-pasted input.',
      evidence: ['Personal data pasted in 4 fields', 'Form completed in 6 s', 'No mouse micro-movements'],
    },
    velocity: {
      score: 38, confidence: 88,
      explanation: 'Several attempts from the same device fingerprint this week.',
      evidence: ['3 onboarding attempts / 7 days from this fingerprint'],
    },
    stepUp: { succeeds: false, message: 'Case routed to a fraud analyst; step-up is not offered for synthetic media.' },
  },

  STOLEN_IDENTITY: {
    id: 'STOLEN_IDENTITY',
    label: 'Stolen identity',
    description: 'A real person presents a genuine, stolen ID card that is not theirs.',
    attackVector: 'Genuine stolen document + impostor face',
    expectedDecision: 'REJECT',
    recommendedFlow: 'ONBOARDING',
    document: {
      score: 92, confidence: 93, dataConsistency: 90, ocr: 'PASS',
      explanation: 'Document is genuine, but reported lost 11 days ago.',
      evidence: ['Security features valid', 'Document number appears on a lost/stolen watchlist (mock)'],
      mrz: pass('MRZ parsed, check digits valid', 96),
      hologram: pass('Optically variable features detected', 93),
      tamper: pass('No tampering anomalies', 92),
      expiry: pass('Valid until 2030-06-30'),
    },
    face: {
      score: 28, confidence: 94,
      explanation: 'Face does not match the document holder.',
      evidence: ['Cosine similarity 0.31 (threshold 0.72)', 'Estimated age gap ~14 years', 'Different inter-ocular geometry'],
      quality: pass('Image quality 90/100', 90),
      reference: fail('Selfie does not match the document portrait', 28),
    },
    identityConsistency: {
      score: 41, confidence: 88,
      explanation: 'Contact details are not associated with the document holder.',
      evidence: ['Email and phone never linked to this identity', 'Address differs from credit-bureau record'],
    },
    accountIdentity: {
      score: 45, confidence: 85,
      explanation: 'Recovery details are inconsistent with the account owner.',
      evidence: ['Email matches, but phone differs from record'],
      checks: {
        email: pass('Email matches account on file'),
        history: warn('2 failed recovery attempts in 30 days'),
        device: warn('Device never seen on this account'),
        simSwap: warn('SIM change 5 days ago'),
        location: warn('Location differs from usual region'),
      },
    },
    liveness: {
      score: 90, confidence: 91, failedChallenges: [],
      explanation: 'A real person is present (the impostor is live, not synthetic).',
      evidence: ['4/4 challenges passed', 'Depth consistent with a real face'],
      depth: pass('3D parallax confirmed', 91),
      texture: pass('Natural skin texture', 92),
      replay: pass('Physical camera', 94),
    },
    deepfake: {
      score: 9, confidence: 93,
      explanation: 'Media is authentic: this is a real, but different, person.',
      evidence: ['No synthetic media indicators'],
      checks: CLEAN_DEEPFAKE_CHECKS,
    },
    device: {
      score: 44, confidence: 83,
      explanation: 'Device is new and recently linked to other identities.',
      evidence: ['Device first seen 2 days ago', 'Linked to 2 other identities'],
      checks: {
        deviceReputation: warn('Device linked to 2 other identities'),
        ipReputation: pass('Residential IP'),
        vpnProxy: pass('No VPN or proxy'),
        impossibleTravel: pass('No travel anomaly'),
      },
    },
    behaviour: {
      score: 38, confidence: 79,
      explanation: 'Hesitation when entering the date of birth.',
      evidence: ['DOB field edited 3 times', 'Long pause before entering document number'],
    },
    velocity: {
      score: 22, confidence: 90,
      explanation: 'Low attempt velocity.',
      evidence: ['1 attempt / 24h'],
    },
    stepUp: { succeeds: false, message: 'Biometric mismatch cannot be resolved with step-up.' },
  },

  SUSPICIOUS_DEVICE: {
    id: 'SUSPICIOUS_DEVICE',
    label: 'Suspicious device',
    description: 'Likely genuine user on a VPN, with a device shared across accounts.',
    attackVector: 'Ambiguous: shared device + VPN + weak liveness',
    expectedDecision: 'ADDITIONAL_VERIFICATION',
    recommendedFlow: 'ONBOARDING',
    document: {
      score: 95, confidence: 94, dataConsistency: 97, ocr: 'PASS',
      explanation: 'Identity document is valid.',
      evidence: ['MRZ checksum valid', 'Security features detected'],
      mrz: pass('MRZ parsed, check digits valid', 98),
      hologram: pass('Optically variable features detected', 93),
      tamper: pass('No tampering anomalies', 95),
      expiry: pass('Valid until 2032-01-09'),
    },
    face: {
      score: 93, confidence: 91,
      explanation: 'Face match is strong.',
      evidence: ['Cosine similarity 0.87 (threshold 0.72)'],
      quality: warn('Low light: quality 71/100', 71),
      reference: pass('Matched against document portrait', 93),
    },
    identityConsistency: {
      score: 94, confidence: 90,
      explanation: 'Applicant data is consistent.',
      evidence: ['Form data = OCR data', 'Phone registered to applicant'],
    },
    accountIdentity: {
      score: 88, confidence: 86,
      explanation: 'Account details match, but the device is unfamiliar.',
      evidence: ['Email and phone match', 'Device never seen on this account'],
      checks: {
        email: pass('Email matches account on file'),
        history: pass('No previous recovery attempts'),
        device: warn('Device is unfamiliar for this account'),
        simSwap: pass('No SIM swap detected'),
        location: pass('Rome, IT: same country as usual'),
      },
    },
    liveness: {
      score: 79, confidence: 76, failedChallenges: [],
      explanation: 'Liveness confidence is lower than normal (poor lighting).',
      evidence: ['4/4 challenges passed', 'Low light reduced depth-estimation confidence'],
      depth: warn('Depth estimation confidence reduced by low light', 72),
      texture: pass('Natural skin texture', 86),
      replay: pass('Physical camera', 92),
    },
    deepfake: {
      score: 12, confidence: 88,
      explanation: 'No significant deepfake indicators.',
      evidence: ['All detectors below threshold'],
      checks: { ...CLEAN_DEEPFAKE_CHECKS, lighting: warn('Low light limits lighting analysis', 74) },
    },
    device: {
      score: 72, confidence: 85,
      explanation: 'Device has been associated with multiple accounts and a VPN was detected.',
      evidence: ['Device linked to 4 accounts in 30 days', 'Commercial VPN exit node', 'Emulator: not detected'],
      checks: {
        deviceReputation: warn('Device associated with 4 accounts'),
        ipReputation: pass('No abuse reports on IP'),
        vpnProxy: warn('Commercial VPN detected'),
        impossibleTravel: pass('No travel anomaly'),
      },
    },
    behaviour: {
      score: 58, confidence: 74,
      explanation: 'Some interaction patterns differ from typical users.',
      evidence: ['Unusual navigation order', 'Form fill time in the 8th percentile'],
    },
    velocity: {
      score: 18, confidence: 92,
      explanation: 'Normal attempt velocity.',
      evidence: ['1 attempt / 24h'],
    },
    stepUp: { succeeds: true, message: 'One-time code confirmed on the phone number linked to this identity.' },
    flowOverrides: { RECOVERY: { livenessScore: 74, behaviourScore: 52 } },
  },

  ACCOUNT_TAKEOVER: {
    id: 'ACCOUNT_TAKEOVER',
    label: 'Account takeover',
    description: 'A fraudster with phished credentials tries to recover a victim\'s account from a new device.',
    attackVector: 'Phished credentials + new device + scripted session',
    expectedDecision: 'ADDITIONAL_VERIFICATION',
    recommendedFlow: 'RECOVERY',
    document: {
      score: 90, confidence: 88, dataConsistency: 91, ocr: 'PASS',
      explanation: 'Document appears valid.',
      evidence: ['Security features detected'],
      mrz: pass('MRZ parsed', 94),
      hologram: pass('Security features detected', 89),
      tamper: pass('No tampering anomalies', 90),
      expiry: pass('Valid until 2028-03-21'),
    },
    face: {
      score: 86, confidence: 82,
      explanation: 'Face match is acceptable.',
      evidence: ['Cosine similarity 0.79 (threshold 0.72)'],
      quality: pass('Image quality 84/100', 84),
      reference: pass('Matched against enrolled reference', 86),
    },
    identityConsistency: {
      score: 70, confidence: 80,
      explanation: 'Contact details were changed recently.',
      evidence: ['Phone number changed 2 days ago'],
    },
    accountIdentity: {
      score: 72, confidence: 84,
      explanation: 'Credentials are correct, but the recovery context does not fit the account owner.',
      evidence: ['Correct email and password', 'Recovery requested 40 min after a password-reset email from an unknown IP'],
      checks: {
        email: pass('Email matches account on file'),
        history: warn('Password reset requested 40 min ago from an unknown IP'),
        device: fail('Device never seen on this account'),
        simSwap: warn('SIM change 2 days ago'),
        location: fail('Lagos, NG: 4,700 km from last login 2 h ago'),
      },
    },
    liveness: {
      score: 82, confidence: 80, failedChallenges: [],
      explanation: 'Liveness passed.',
      evidence: ['4/4 challenges passed'],
      depth: pass('3D parallax confirmed', 84),
      texture: pass('Natural skin texture', 83),
      replay: pass('Physical camera', 88),
    },
    deepfake: {
      score: 14, confidence: 87,
      explanation: 'No significant deepfake indicators.',
      evidence: ['All detectors below threshold'],
      checks: CLEAN_DEEPFAKE_CHECKS,
    },
    device: {
      score: 93, confidence: 91,
      explanation: 'Unknown device, anonymising proxy and impossible travel.',
      evidence: ['Device never seen on account', 'Residential proxy network', 'Last login Milan 2 h ago; now Lagos'],
      checks: {
        deviceReputation: fail('New device, fingerprint linked to 11 accounts'),
        ipReputation: fail('IP on credential-stuffing blocklist'),
        vpnProxy: warn('Residential proxy detected'),
        impossibleTravel: fail('Milan → Lagos in 2 h (4,700 km)'),
      },
    },
    behaviour: {
      score: 91, confidence: 86,
      explanation: 'Session behaviour differs sharply from the account owner\'s profile.',
      evidence: ['Typing cadence 3.2σ from owner profile', 'Direct navigation to recovery without browsing'],
    },
    velocity: {
      score: 87, confidence: 90,
      explanation: 'Burst of recovery attempts across multiple accounts from this IP.',
      evidence: ['14 recovery attempts / 1h from this IP', '3 attempts on this account'],
    },
    stepUp: { succeeds: false, message: 'The account owner rejected the request on their registered device. Account locked and owner notified.' },
  },
};

export const listScenarios = (): ScenarioSummary[] =>
  Object.values(SCENARIOS).map(({ id, label, description, attackVector, expectedDecision, recommendedFlow }) => ({
    id, label, description, attackVector, expectedDecision: expectedDecision as Decision, recommendedFlow,
  }));

export const getScenario = (id: ScenarioId): ScenarioProfile => SCENARIOS[id] ?? SCENARIOS.LEGITIMATE;
