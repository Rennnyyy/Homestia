import { Injectable, signal } from '@angular/core';

const COLLAPSED_KEY = 'homestia-sidebar-collapsed';
const MOBILE_BREAKPOINT = 1024;

@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly isMobile = signal(window.innerWidth < MOBILE_BREAKPOINT);
  readonly sidebarCollapsed = signal(this.loadCollapsed());
  readonly drawerOpen = signal(false);

  constructor() {
    window.addEventListener('resize', () => {
      this.isMobile.set(window.innerWidth < MOBILE_BREAKPOINT);
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => {
      const next = !v;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }

  openDrawer(): void {
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  toggleDrawer(): void {
    this.drawerOpen.update(v => !v);
  }

  private loadCollapsed(): boolean {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  }
}
