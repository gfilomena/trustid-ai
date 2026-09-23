import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { ApiError, ApiService } from '../../../core/services/api.service';
import { VerificationService } from '../../../core/services/verification.service';
import type { DocumentAnalysisResult, DocumentType, MediaMetadata } from '../../../models/verification.models';
import { CheckListComponent } from '../../../shared/components/check-list/check-list.component';
import { ConfidenceIndicatorComponent } from '../../../shared/components/confidence-indicator/confidence-indicator.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

const TYPES: { id: DocumentType; label: string; icon: string }[] = [
  { id: 'PASSPORT', label: 'Passport', icon: '▣' },
  { id: 'ID_CARD', label: 'ID card', icon: '▭' },
  { id: 'DRIVERS_LICENSE', label: "Driver's licence", icon: '▬' },
];

@Component({
  selector: 'app-document-verification',
  imports: [CheckListComponent, ConfidenceIndicatorComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './document-verification.component.html',
  styleUrl: './document-verification.component.scss',
})
export class DocumentVerificationComponent {
  private readonly api = inject(ApiService);
  private readonly flow = inject(VerificationService);
  readonly completed = output<DocumentAnalysisResult>();

  protected readonly types = TYPES;
  protected readonly type = signal<DocumentType>('PASSPORT');
  protected readonly media = signal<MediaMetadata | null>(null);
  protected readonly preview = signal<string | null>(null);
  protected readonly dragging = signal(false);
  protected readonly analysing = signal(false);
  protected readonly result = signal<DocumentAnalysisResult | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revoke());
  }

  protected typeLabel = () => TYPES.find((t) => t.id === this.type())!.label;

  onFile(file: File | undefined) {
    if (!file) return;
    this.revoke();
    // The file never leaves the browser in demo mode: only metadata is sent.
    this.media.set({ fileName: file.name, mimeType: file.type, sizeBytes: file.size, source: 'UPLOAD' });
    if (file.type.startsWith('image/')) this.preview.set(URL.createObjectURL(file));
    this.result.set(null);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(false);
    this.onFile(e.dataTransfer?.files?.[0]);
  }

  useDemo() {
    this.revoke();
    this.media.set({ fileName: 'demo-document.jpg', source: 'DEMO' });
    this.result.set(null);
  }

  async analyse() {
    const media = this.media();
    if (!media) return;
    this.analysing.set(true);
    this.error.set(null);
    try {
      const [res] = await Promise.all([
        this.api.analyzeDocument({ sessionId: this.flow.sessionId(), documentType: this.type(), media }),
        new Promise((r) => setTimeout(r, 1200)),
      ]);
      this.result.set(res);
    } catch (e) {
      this.error.set(e instanceof ApiError ? e.message : 'Document analysis failed');
    } finally {
      this.analysing.set(false);
    }
  }

  private revoke() {
    const p = this.preview();
    if (p) URL.revokeObjectURL(p);
    this.preview.set(null);
  }
}
