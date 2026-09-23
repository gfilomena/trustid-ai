import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DemoScenarioService } from './core/services/demo-scenario.service';
import { ScenarioSwitcherComponent } from './shared/components/scenario-switcher/scenario-switcher.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ScenarioSwitcherComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly demo = inject(DemoScenarioService);
  protected readonly nav = [
    { path: '/onboarding', label: 'Onboarding' },
    { path: '/recovery', label: 'Recovery' },
    { path: '/simulator', label: 'Scenario simulator' },
    { path: '/dashboard', label: 'Analyst dashboard' },
  ];
}
