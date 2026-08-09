import { Component, signal, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  LucideHouse, LucideBuilding, LucideUsers,
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
    RouterLink, RouterLinkActive, TranslocoPipe, HlmButton,
    LucideHouse, LucideBuilding, LucideUsers,
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

  readonly navItems: NavItem[] = [
    { label: 'nav.home', route: '/' },
    { label: 'nav.properties', route: '/properties' },
    { label: 'nav.tenants', route: '/tenants' },
  ];

  closeMobile(): void {
    this.mobileOpenChange.emit(false);
  }

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
  }
}
