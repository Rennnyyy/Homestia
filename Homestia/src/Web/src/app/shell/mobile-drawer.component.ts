import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LayoutService, NAV_ITEMS } from '../core/layout';

@Component({
    selector: 'app-mobile-drawer',
    imports: [RouterLink, RouterLinkActive, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    @if (layout.drawerOpen()) {
      <div
        class="fixed inset-0 z-50 bg-black/50 transition-opacity lg:hidden"
        (click)="layout.closeDrawer()"
      ></div>
    }

    <div
      class="fixed inset-y-0 left-0 z-50 w-64 transform bg-surface-50 shadow-lg transition-transform duration-200 ease-in-out dark:bg-surface-950 lg:hidden"
      [class.translate-x-0]="layout.drawerOpen()"
      [class.-translate-x-full]="!layout.drawerOpen()"
    >
      <div class="flex h-[var(--header-height)] items-center justify-between border-b border-surface-200 px-4">
        <span class="font-semibold text-surface-900 dark:text-surface-50">{{ 'SIDEBAR.NAVIGATION' | translate }}</span>
        <button
          (click)="layout.closeDrawer()"
          class="rounded-md p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
          [attr.aria-label]="'HEADER.CLOSE_MENU' | translate"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <nav class="overflow-y-auto py-2 scrollbar-thin">
        <ul class="space-y-1 px-2">
          @for (item of navItems; track item.route) {
            <li>
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                class="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-50"
                (click)="layout.closeDrawer()"
              >
                <svg
                  class="h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                >
                  <path [attr.d]="item.icon" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{{ item.labelKey | translate }}</span>
              </a>
            </li>
          }
        </ul>
      </nav>
    </div>
  `
})
export class MobileDrawerComponent {
  readonly layout = inject(LayoutService);
  readonly navItems = NAV_ITEMS;
}
