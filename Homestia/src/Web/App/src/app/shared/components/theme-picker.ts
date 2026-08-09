import { Component, inject, computed } from '@angular/core';
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

        <span
          class="rounded-full size-3 ring-2 ring-foreground ring-offset-1 ring-offset-background transition-colors duration-200"
          [style.background-color]="currentColor()"
        ></span>

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

  readonly currentColor = computed(() => {
    const current = this.themes.find((t) => t.id === this.themeService.theme());
    return current?.color ?? '#52525b';
  });

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
