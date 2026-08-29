import { Component, signal, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { ThemePicker } from '../theme-picker';
import {
  LucideHouse, LucideBuilding, LucideFileSignature,
  LucideX, LucidePanelLeft, LucidePanelLeftClose,
} from '@lucide/angular';

interface NavItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink, RouterLinkActive, TranslocoPipe, HlmButton, ThemePicker,
    LucideHouse, LucideBuilding, LucideFileSignature,
    LucideX, LucidePanelLeft, LucidePanelLeftClose,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  // Mobile overlay (controlled by parent)
  readonly mobileOpen = input(false);
  readonly mobileOpenChange = output<boolean>();

  // Desktop collapse (internal)
  readonly collapsed = signal(false);

  // Language (passed from parent)
  readonly currentLang = input('en');
  readonly toggleLang = output<void>();

  readonly navItems: NavItem[] = [
    { label: 'nav.home', route: '/' },
    { label: 'nav.properties', route: '/properties' },
    { label: 'nav.rentals', route: '/rentals' },
  ];

  closeMobile(): void {
    this.mobileOpenChange.emit(false);
  }

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
  }
}
