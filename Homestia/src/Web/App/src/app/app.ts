import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { LucideHouse, LucideMenu, LucideBuilding, LucideFileSignature } from '@lucide/angular';
import { ThemePicker } from './shared/components/theme-picker';
import { Sidebar } from './shared/components/sidebar/sidebar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe, HlmButton, LucideHouse, LucideMenu, LucideBuilding, LucideFileSignature, ThemePicker, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly transloco = inject(TranslocoService);
  // Reactive signal from Transloco itself — stays in sync with the actual
  // active language (including fallback after a failed load).
  readonly currentLang = this.transloco.activeLang;
  readonly sidebarOpen = signal(false);

  toggleLang(): void {
    const next = this.currentLang() === 'en' ? 'de' : 'en';
    this.transloco.setActiveLang(next);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }
}
