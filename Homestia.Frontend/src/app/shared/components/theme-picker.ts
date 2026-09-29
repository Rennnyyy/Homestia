import { Component, inject, computed } from '@angular/core';
import { HlmButton } from '@rennnyyy/aletheia-ui';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { AccentService, THEMES } from '../../core/services/accent.service';

/**
 * Homestia's accent picker — the ‹ ● › palette cycler.
 *
 * Only the accent axis lives here. Skins and the dark/light mode are handled by
 * the SDK's `aletheia-theme-switcher` (which sits next to this control), so
 * there is exactly one owner per axis.
 */
@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [HlmButton, LucideChevronLeft, LucideChevronRight],
  template: `
    <div class="flex items-center gap-1">
      <div class="flex items-center gap-0.5">
        <button
          hlmBtn
          variant="ghost"
          size="icon-xs"
          (click)="accents.cycleAccent(-1)"
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
          (click)="accents.cycleAccent(1)"
          class="text-muted-foreground hover:text-foreground"
        >
          <svg lucideChevronRight class="size-3.5"></svg>
        </button>
      </div>
    </div>
  `,
})
export class ThemePicker {
  readonly accents = inject(AccentService);

  readonly currentColor = computed(() => {
    const current = THEMES.find((t) => t.id === this.accents.accent());
    return current?.color ?? '#52525b';
  });
}
