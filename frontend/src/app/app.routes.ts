import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'TrustID AI', loadComponent: () => import('./features/landing/landing-page.component').then((m) => m.LandingPageComponent) },
  {
    path: 'onboarding',
    title: 'Digital onboarding · TrustID AI',
    loadComponent: () => import('./features/onboarding/onboarding-page/onboarding-page.component').then((m) => m.OnboardingPageComponent),
  },
  {
    path: 'recovery',
    title: 'Account recovery · TrustID AI',
    loadComponent: () => import('./features/recovery/recovery-page/recovery-page.component').then((m) => m.RecoveryPageComponent),
  },
  {
    path: 'simulator',
    title: 'Fraud Scenario Simulator · TrustID AI',
    loadComponent: () => import('./features/simulator/scenario-simulator.component').then((m) => m.ScenarioSimulatorComponent),
  },
  {
    path: 'dashboard',
    title: 'Fraud analyst dashboard · TrustID AI',
    loadComponent: () => import('./features/dashboard/fraud-dashboard/fraud-dashboard.component').then((m) => m.FraudDashboardComponent),
  },
  { path: '**', redirectTo: '' },
];
