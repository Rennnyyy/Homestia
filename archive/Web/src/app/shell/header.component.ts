import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LayoutService, ThemeService, LanguageService } from '../core/layout';

@Component({
    selector: 'app-header',
    imports: [RouterLink, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <header class="fixed left-0 right-0 top-0 z-50 flex h-[var(--header-height)] items-center gap-3 border-b border-surface-200 bg-surface-50 px-4 dark:bg-surface-950">
      <!-- Mobile: hamburger -->
      <button
        (click)="layout.openDrawer()"
        class="rounded-md p-2 text-surface-500 transition-colors hover:bg-surface-100 lg:hidden"
        [attr.aria-label]="'HEADER.TOGGLE_MENU' | translate"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <!-- Brand -->
      <a routerLink="/" class="flex items-center gap-2 font-semibold text-surface-900 dark:text-surface-50">
        <svg class="h-6 w-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span class="hidden sm:inline">{{ 'APP.TITLE' | translate }}</span>
      </a>

      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Language switcher -->
      <button
        (click)="lang.toggle()"
        class="rounded-md px-2 py-1 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-100"
        [attr.aria-label]="'LANG.SWITCH' | translate"
      >
        {{ lang.current() === 'de' ? 'EN' : 'DE' }}
      </button>

      <!-- Theme toggle -->
      <button
        (click)="theme.toggle()"
        class="rounded-md p-2 text-surface-500 transition-colors hover:bg-surface-100"
        [attr.aria-label]="'HEADER.TOGGLE_THEME' | translate"
      >
        @if (theme.isDark()) {
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        } @else {
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
      </button>

      <!-- User avatar placeholder -->
      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
        LD
      </div>
    </header>
  `
})
export class HeaderComponent {
  readonly layout = inject(LayoutService);
  readonly theme = inject(ThemeService);
  readonly lang = inject(LanguageService);
}
