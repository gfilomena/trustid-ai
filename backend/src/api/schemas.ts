import { z } from 'zod';

/** Request validation. Every body is parsed; unknown keys are stripped. */
const scenario = z.enum(['LEGITIMATE', 'DEEPFAKE_ATTACK', 'STOLEN_IDENTITY', 'SUSPICIOUS_DEVICE', 'ACCOUNT_TAKEOVER']);
const sessionId = z.string().regex(/^vrf_[a-f0-9]{16}$/, 'Invalid session id');
const text = (max = 120) => z.string().trim().min(1).max(max);

const media = z.object({
  fileName: z.string().max(200).optional(),
  mimeType: z.string().max(80).optional(),
  sizeBytes: z.number().int().nonnegative().max(25_000_000).optional(),
  source: z.enum(['UPLOAD', 'CAMERA', 'DEMO']),
  frameCount: z.number().int().nonnegative().max(1000).optional(),
});

const clientContext = z.object({
  userAgent: z.string().max(400),
  language: z.string().max(40),
  timezone: z.string().max(60),
  screen: z.string().max(40),
  formFillSeconds: z.number().nonnegative().max(86_400).optional(),
  pasteEvents: z.number().int().nonnegative().max(10_000).optional(),
  keystrokes: z.number().int().nonnegative().max(100_000).optional(),
});

export const schemas = {
  start: z.object({
    scenario,
    applicant: z.object({
      fullName: text(),
      email: z.email().max(160),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      country: text(60),
      phone: z.string().max(30).optional(),
    }),
    clientContext,
  }),
  document: z.object({ sessionId, documentType: z.enum(['PASSPORT', 'ID_CARD', 'DRIVERS_LICENSE']), media }),
  face: z.object({ sessionId, media }),
  liveness: z.object({
    sessionId,
    media,
    completedChallenges: z.array(z.enum(['LOOK', 'TURN_LEFT', 'TURN_RIGHT', 'BLINK'])).max(4),
  }),
  session: z.object({ sessionId }),
  context: z.object({ sessionId, clientContext }),
  stepUp: z.object({
    sessionId,
    method: z.enum(['OTP_REGISTERED_PHONE', 'ADDITIONAL_SELFIE', 'ADDITIONAL_DOCUMENT', 'BANK_APP_CONFIRMATION']),
    code: z.string().regex(/^\d{6}$/).optional(),
  }),
  recoveryStart: z.object({ email: z.email().max(160), scenario, clientContext }),
  recoveryVerify: z.object({ sessionId, lastKnownLocation: z.string().max(120).optional() }),
  simulate: z.object({ scenario, flow: z.enum(['ONBOARDING', 'RECOVERY']) }),
  id: sessionId,
};
