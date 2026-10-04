import {
  AgentSimulationSwitcherComponent,
  HlmButton,
  LanguageSwitcherComponent,
  SidebarComponent,
  ThemeService,
  type SidebarSection,
} from '@rennnyyy/aletheia-ui';

import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  LucideHouse, LucideMenu, LucideMoon, LucideSun,
  LucideBuilding, LucideFileSignature,
} from '@lucide/angular';
import { ThemePicker } from './shared/components/theme-picker';

/**
 * App — the frame every page renders inside.
 *
 * The rail is the SDK's `aletheia-sidebar`, which owns the desktop collapse and
 * the mobile drawer (backdrop, off-canvas transform, close button). Homestia
 * contributes only what is Homestia's: the brand, the navigation model, and the
 * accent cycler.
 *
 * Chrome is one control per axis, and all of it sits in the header — accent,
 * mode, language — so a control is never hidden by a panel's own state: the rail
 * collapses to a 64px icon strip, which cannot hold three controls, and a bar on
 * bar on a phone is exactly the place a user looks for chrome anyway. The agent
 * switch joins them in a development build only: it names the identity the
 * request declares, which a deployed page can never do.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, TranslocoPipe, HlmButton, SidebarComponent, LanguageSwitcherComponent,
    AgentSimulationSwitcherComponent,
    LucideHouse, LucideMenu, LucideMoon, LucideSun, ThemePicker,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly theme = inject(ThemeService);

  /** Mobile drawer state — the SDK rail's `mobileOpen`. */
  readonly sidebarOpen = signal(false);

  /**
   * The rail collapsed to its 64px icon strip. Only the rail's own layout
   * depends on this: the accent cycler lives in the header with the rest of the
   * chrome, so collapsing the rail never hides a control.
   */
  readonly railCollapsed = signal(false);

  /**
   * Navigation model for the SDK rail. One unlabelled section renders the three
   * destinations flat: no group header, nothing to collapse, always visible.
   */
  readonly sections: SidebarSection[] = [
    {
      items: [
        { label: 'nav.home', route: '/', icon: LucideHouse },
        { label: 'nav.properties', route: '/properties', icon: LucideBuilding },
        { label: 'nav.rentals', route: '/rentals', icon: LucideFileSignature },
      ],
    },
  ];
}
