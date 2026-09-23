import type { DeepfakeAnalysisResult } from '@trustid/contracts';
import type { AnalysisContext, DeepfakeDetectionService } from '../provider-contracts.js';

/**
 * Integration skeleton for a real deepfake-detection vendor. Not wired in demo
 * mode; it shows where the production adapter goes.
 *
 * Security controls required before enabling it:
 *  - API key read from a server-side secret manager (never shipped to Angular).
 *  - mTLS / signed requests to the vendor and a DPA covering biometric data.
 *  - Media passed as a short-lived pre-signed URL to encrypted storage, deleted
 *    right after inference (GDPR Art. 9: special-category data).
 *  - Timeouts, circuit breaker and a fail-closed fallback (route to MANUAL_REVIEW).
 */
export class HttpDeepfakeDetectionService implements DeepfakeDetectionService {
  readonly name = 'http-deepfake-vendor';

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async analyze(_input: AnalysisContext): Promise<DeepfakeAnalysisResult> {
    void this.baseUrl;
    void this.apiKey;
    throw new Error('HttpDeepfakeDetectionService is not implemented in the MVP. Map the vendor response to DeepfakeAnalysisResult here.');
  }
}
