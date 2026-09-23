import type { DocumentAnalysisResult, DocumentType } from '@trustid/contracts';
import { buildSignal } from '../../domain/signal-factory.js';
import type { DocumentInput, DocumentVerificationService } from '../provider-contracts.js';
import { check, profileFor, simulateLatency } from './mock-utils.js';

const DOC_LABEL: Record<DocumentType, string> = {
  PASSPORT: 'Passport',
  ID_CARD: 'National ID card',
  DRIVERS_LICENSE: "Driver's licence",
};

export class MockDocumentVerificationService implements DocumentVerificationService {
  readonly name = 'mock-document-ai@1.2';

  async analyze(input: DocumentInput): Promise<DocumentAnalysisResult> {
    await simulateLatency(1.4);
    const p = profileFor(input).document;
    const label = DOC_LABEL[input.documentType];

    return {
      detected: true,
      documentType: input.documentType,
      issuingCountry: 'ITA',
      ocrStatus: p.ocr,
      authenticity: p.score,
      dataConsistency: p.dataConsistency,
      // Masked on purpose: the API never returns full document numbers.
      extractedFields: [
        { label: 'Document type', value: label },
        { label: 'Document number', value: 'YA••••••82' },
        { label: 'Issuing country', value: 'Italy (ITA)' },
        { label: 'Expiry', value: p.expiry.detail.replace('Valid until ', '') },
      ],
      checks: [
        check('ocr', 'OCR extraction', { status: p.ocr, detail: 'All mandatory fields extracted' }),
        check('mrz', 'MRZ / barcode integrity', p.mrz),
        check('hologram', 'Security features', p.hologram),
        check('tamper', 'Digital tampering', p.tamper),
        check('expiry', 'Expiry date', p.expiry),
        check('consistency', 'Data consistency', {
          status: p.dataConsistency >= 85 ? 'PASS' : 'WARNING',
          score: p.dataConsistency,
          detail: 'Visual zone vs machine-readable zone',
        }),
      ],
      signal: buildSignal('document', {
        score: p.score,
        confidence: p.confidence,
        explanation: p.explanation,
        evidence: [`${label} detected`, ...p.evidence],
        provider: this.name,
      }),
    };
  }
}
