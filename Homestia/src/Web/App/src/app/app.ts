import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { LucideHouse, LucideMenu, LucideBuilding, LucideUsers } from '@lucide/angular';
import { ThemePicker } from './shared/components/theme-picker';
import { Sidebar } from './shared/components/sidebar/sidebar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe, HlmButton, LucideHouse, LucideMenu, LucideBuilding, LucideUsers, ThemePicker, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly transloco = inject(TranslocoService);
  readonly currentLang = signal(this.transloco.getActiveLang());
  readonly sidebarOpen = signal(false);

  toggleLang(): void {
    const next = this.currentLang() === 'en' ? 'de' : 'en';
    this.transloco.setActiveLang(next);
    this.currentLang.set(next);
  }
}
