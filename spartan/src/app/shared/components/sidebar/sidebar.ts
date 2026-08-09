import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { HlmButton } from '@spartan-ng/helm/button';
import { LucideHouse, LucideBuilding, LucideUsers, LucidePanelLeftClose, LucidePanelLeft } from '@lucide/angular';

interface NavItem {
  icon: any;
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslocoPipe, HlmButton, LucideHouse, LucideBuilding, LucideUsers, LucidePanelLeftClose, LucidePanelLeft],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly collapsed = signal(false);

  readonly navItems: NavItem[] = [
    { icon: LucideHouse, label: 'nav.home', route: '/' },
    { icon: LucideBuilding, label: 'nav.properties', route: '/properties' },
    { icon: LucideUsers, label: 'nav.tenants', route: '/tenants' },
  ];

  toggle(): void {
    this.collapsed.update(v => !v);
  }
}
