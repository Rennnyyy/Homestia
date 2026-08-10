import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LayoutService, NAV_ITEMS } from '../core/layout';

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive, NgClass, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <aside
      class="fixed left-0 top-[var(--header-height)] bottom-0 z-40 flex flex-col border-r border-surface-200 bg-surface-50 transition-all duration-200 ease-in-out dark:bg-surface-950"
      [ngClass]="{
        'w-[var(--sidebar-width)]': !layout.sidebarCollapsed(),
        'w-[var(--sidebar-collapsed-width)]': layout.sidebarCollapsed()
      }"
    >
      <nav class="flex-1 overflow-y-auto scrollbar-thin py-2">
        <ul class="space-y-1 px-2">
          @for (item of navItems; track item.route) {
            <li>
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300"
                class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-50"
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
                @if (!layout.sidebarCollapsed()) {
                  <span>{{ item.labelKey | translate }}</span>
                }
              </a>
            </li>
          }
        </ul>
      </nav>

      <div class="border-t border-surface-200 p-2">
        <button
          (click)="layout.toggleSidebar()"
          class="flex w-full items-center justify-center rounded-md p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800"
          [attr.aria-label]="(layout.sidebarCollapsed() ? 'SIDEBAR.EXPAND' : 'SIDEBAR.COLLAPSE') | translate"
        >
          <svg
            class="h-4 w-4 transition-transform"
            [class.rotate-180]="layout.sidebarCollapsed()"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  readonly layout = inject(LayoutService);
  readonly navItems = NAV_ITEMS;
}
