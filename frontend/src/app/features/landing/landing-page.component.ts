import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  protected readonly pillars = [
    { n: '01', title: 'Verify identity', text: 'Document forensics, OCR and face matching confirm who the person claims to be.', icon: '▤' },
    { n: '02', title: 'Detect deepfakes', text: 'Active liveness plus a 6-detector forensic ensemble catches injected and synthetic media.', icon: '◐' },
    { n: '03', title: 'Assess risk', text: 'Device, network and behavioural signals are fused into one explainable risk score.', icon: '◎' },
    { n: '04', title: 'Protect legitimate users', text: 'Low risk sails through. Friction is added only when the evidence asks for it.', icon: '✓' },
  ];

  protected readonly signals = [
    { name: 'Document verification', score: 96, status: 'PASS' },
    { name: 'Face match', score: 94, status: 'PASS' },
    { name: 'Liveness', score: 91, status: 'PASS' },
    { name: 'Deepfake probability', score: 8, status: 'PASS' },
    { name: 'Device risk', score: 72, status: 'WARNING' },
    { name: 'Behavioural anomaly', score: 34, status: 'PASS' },
    { name: 'Identity consistency', score: 97, status: 'PASS' },
  ];

  protected readonly outcomes = [
    { level: 'LOW', range: '0–30', decision: 'Approve', text: 'Continue with no extra steps.', tone: 'pass' },
    { level: 'MEDIUM', range: '31–70', decision: 'Step-up', text: 'One proportionate check: OTP, selfie, app confirmation.', tone: 'warn' },
    { level: 'HIGH', range: '71–100', decision: 'Review / reject', text: 'Human analyst, or block clearly invalid attempts.', tone: 'fail' },
  ];
}
