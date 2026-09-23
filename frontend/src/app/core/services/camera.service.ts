import { Injectable, signal } from '@angular/core';

/**
 * Optional webcam access. Frames stay in the browser: in the MVP nothing is
 * uploaded (only a frame count is reported). A real integration would stream
 * frames to a certified biometric SDK over an encrypted, short-lived channel.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  readonly stream = signal<MediaStream | null>(null);
  readonly error = signal<string | null>(null);
  readonly supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  async start(): Promise<boolean> {
    if (this.stream()) return true;
    this.error.set(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
      this.stream.set(stream);
      return true;
    } catch {
      this.error.set('Camera unavailable or permission denied. Continuing in demo mode.');
      return false;
    }
  }

  stop() {
    this.stream()?.getTracks().forEach((t) => t.stop());
    this.stream.set(null);
  }
}
