import { Component, inject } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  LucideSun,
  LucideMoon,
  LucideChevronLeft,
  LucideChevronRight,
} from '@lucide/angular';
import { ThemeService, THEMES } from '../../core/services/theme.service';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [
    HlmButton,
    LucideSun,
    LucideMoon,
    LucideChevronLeft,
    LucideChevronRight,
  ],
  template: `
    <div class="flex items-center gap-1">
      <!-- Color palette cycling with dot indicators -->
      <div class="flex items-center gap-0.5">
        <button
          hlmBtn
          variant="ghost"
          size="icon-xs"
          (click)="prevTheme()"
          class="text-muted-foreground hover:text-foreground"
        >
          <svg lucideChevronLeft class="size-3.5"></svg>
        </button>

        <!-- Colored dots for all 6 palettes, current one is larger + ring -->
        <div class="flex items-center gap-1 px-1">
          @for (theme of themes; track theme.id) {
            <span
              class="rounded-full transition-all duration-200"
              [class.size-2.5]="theme.id !== themeService.theme()"
              [class.size-3]="theme.id === themeService.theme()"
              [class.ring-2]="theme.id === themeService.theme()"
              [class.ring-foreground]="theme.id === themeService.theme()"
              [class.ring-offset-1]="theme.id === themeService.theme()"
              [class.ring-offset-background]="theme.id === themeService.theme()"
              [style.background-color]="theme.color"
            ></span>
          }
        </div>

        <button
          hlmBtn
          variant="ghost"
          size="icon-xs"
          (click)="nextTheme()"
          class="text-muted-foreground hover:text-foreground"
        >
          <svg lucideChevronRight class="size-3.5"></svg>
        </button>
      </div>

      <!-- Dark / Light toggle -->
      <button
        hlmBtn
        variant="ghost"
        size="icon-xs"
        (click)="themeService.toggleDark()"
        class="text-muted-foreground hover:text-foreground ml-1"
      >
        @if (themeService.isDark()) {
          <svg lucideMoon class="size-4"></svg>
        } @else {
          <svg lucideSun class="size-4"></svg>
        }
      </button>
    </div>
  `,
})
export class ThemePicker {
  readonly themeService = inject(ThemeService);
  readonly themes = THEMES;

  private get currentIndex(): number {
    return this.themes.findIndex((t) => t.id === this.themeService.theme());
  }

  nextTheme(): void {
    const next = (this.currentIndex + 1) % this.themes.length;
    this.themeService.setTheme(this.themes[next].id);
  }

  prevTheme(): void {
    const prev =
      (this.currentIndex - 1 + this.themes.length) % this.themes.length;
    this.themeService.setTheme(this.themes[prev].id);
  }
}
