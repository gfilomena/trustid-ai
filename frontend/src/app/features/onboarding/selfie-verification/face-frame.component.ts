import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import { CameraService } from '../../../core/services/camera.service';

export type HeadPose = 'center' | 'left' | 'right' | 'blink';

/**
 * Camera viewport with a face oval. Shows the live webcam feed when the user
 * enables it; otherwise an animated demo avatar (demo/mock mode).
 */
@Component({
  selector: 'app-face-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="frame" [class.scanning]="scanning()" [class]="'frame tone-' + tone()">
      @if (camera.stream()) {
        <video #video autoplay playsinline muted></video>
      } @else {
        <svg class="avatar" [class]="'avatar pose-' + pose()" viewBox="0 0 200 240" aria-hidden="true">
          <defs>
            <radialGradient id="skin" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#3a4a6e"/><stop offset="1" stop-color="#1c2640"/></radialGradient>
          </defs>
          <path d="M20 240c6-44 40-66 80-66s74 22 80 66" fill="#18223a" />
          <g class="head">
            <ellipse cx="100" cy="104" rx="52" ry="64" fill="url(#skin)" stroke="rgba(160,180,230,.25)" />
            <g class="face">
              <ellipse class="eye" cx="80" cy="98" rx="7" ry="4.5" fill="#c8d3ee" />
              <ellipse class="eye" cx="120" cy="98" rx="7" ry="4.5" fill="#c8d3ee" />
              <path d="M100 104v18l-6 4" stroke="rgba(200,211,238,.4)" fill="none" stroke-width="2" stroke-linecap="round" />
              <path d="M86 140q14 8 28 0" stroke="rgba(200,211,238,.5)" fill="none" stroke-width="2.5" stroke-linecap="round" />
            </g>
          </g>
          <g class="mesh" stroke="rgba(109,139,255,.5)" stroke-width=".8" fill="none">
            <path d="M60 80 80 98 100 88 120 98 140 80M80 98 100 122 120 98M86 140 100 122 114 140M60 80 70 130 86 140M140 80 130 130 114 140" />
          </g>
        </svg>
      }
      <div class="oval"></div>
      @if (scanning()) { <div class="sweep"></div> }
      @if (label()) { <div class="label mono">{{ label() }}</div> }
    </div>
  `,
  styles: `
    .frame { position: relative; aspect-ratio: 4/3.4; border-radius: 18px; overflow: hidden; background: radial-gradient(circle at 50% 40%, #121b30, #070a14); }
    video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
    .avatar { position: absolute; inset: 8% 0 0; margin: auto; height: 92%; width: 100%; }
    .head, .face { transition: transform .6s var(--ease); transform-origin: 100px 110px; }
    .pose-left .face { transform: translateX(-16px); } .pose-left .head { transform: rotate(-4deg); }
    .pose-right .face { transform: translateX(16px); } .pose-right .head { transform: rotate(4deg); }
    .eye { transform-box: fill-box; transform-origin: center; transition: transform .12s; }
    .pose-blink .eye { transform: scaleY(.1); }
    .mesh { opacity: 0; transition: opacity .4s; }
    .scanning .mesh { opacity: 1; }
    .oval { position: absolute; left: 50%; top: 47%; width: 52%; height: 78%; transform: translate(-50%, -50%); border-radius: 50%;
      border: 2.5px solid var(--tone); box-shadow: 0 0 0 999px rgba(4, 6, 12, .45), 0 0 30px var(--tone-soft); transition: border-color .3s; }
    .sweep { position: absolute; left: 24%; right: 24%; height: 3px; top: 10%; background: var(--tone); box-shadow: 0 0 20px var(--tone);
      animation: sweep 1.6s ease-in-out infinite alternate; }
    @keyframes sweep { to { top: 86%; } }
    .label { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); padding: 6px 12px; border-radius: 99px;
      background: rgba(6, 9, 19, .8); border: 1px solid var(--border-strong); font-size: 12px; white-space: nowrap; }
  `,
})
export class FaceFrameComponent {
  protected readonly camera = inject(CameraService);
  readonly pose = input<HeadPose>('center');
  readonly scanning = input(false);
  readonly label = input<string>();
  readonly tone = input<'brand' | 'pass' | 'warn' | 'fail'>('brand');
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  constructor() {
    effect(() => {
      const v = this.video()?.nativeElement;
      const s = this.camera.stream();
      if (v && s && v.srcObject !== s) v.srcObject = s;
    });
  }
}
