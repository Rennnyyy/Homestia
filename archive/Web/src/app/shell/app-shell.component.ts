import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from '../core/layout';
import { HeaderComponent } from './header.component';
import { SidebarComponent } from './sidebar.component';
import { MobileDrawerComponent } from './mobile-drawer.component';

@Component({
    selector: 'app-shell',
    imports: [RouterOutlet, HeaderComponent, SidebarComponent, MobileDrawerComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <app-header />

    <!-- Desktop: sidebar is always visible -->
    <div class="hidden lg:block">
      <app-sidebar />
    </div>

    <!-- Mobile: drawer overlay -->
    <app-mobile-drawer />

    <!-- Main content area -->
    <main
      class="min-h-screen pt-[var(--header-height)] transition-all duration-200 ease-in-out"
      [style.margin-left]="mainMargin()"
    >
      <div class="p-4 sm:p-6 lg:p-8">
        <router-outlet />
      </div>
    </main>
  `
})
export class AppShellComponent {
  readonly layout = inject(LayoutService);

  mainMargin(): string {
    if (this.layout.isMobile()) return '0';
    return this.layout.sidebarCollapsed()
      ? 'var(--sidebar-collapsed-width)'
      : 'var(--sidebar-width)';
  }
}
