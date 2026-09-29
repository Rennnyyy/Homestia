import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeName = 'neutral' | 'blue' | 'rose' | 'green' | 'violet' | 'amber';

export const THEMES: { id: ThemeName; color: string }[] = [
  { id: 'neutral', color: '#52525b' },
  { id: 'blue', color: '#3b82f6' },
  { id: 'rose', color: '#f43f5e' },
  { id: 'green', color: '#22c55e' },
  { id: 'violet', color: '#8b5cf6' },
  { id: 'amber', color: '#f59e0b' },
];

const ACCENT_KEY = 'spartan-theme';

/**
 * Homestia's accent axis — the `data-theme` attribute, and nothing else.
 *
 * The other two axes belong to the SDK's `ThemeService`
 * (`@rennnyyy/aletheia-ui`): `data-skin` for the skin, `.dark` for the mode.
 * One owner per axis is what keeps the two services from fighting over
 * `<html>` — this service deliberately no longer touches `.dark`.
 *
 * The accent values live in src/styles/homestia-skin.css, scoped to
 * `[data-skin='homestia'][data-theme='…']` so they only apply to that skin.
 */
@Injectable({ providedIn: 'root' })
export class AccentService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly accents = THEMES;
  readonly accent = signal<ThemeName>(this.loadAccent());

  constructor() {
    if (this.isBrowser) {
      effect(() => {
        document.documentElement.setAttribute('data-theme', this.accent());
        this.persistAccent();
      });
    }
  }

  setAccent(name: ThemeName): void {
    this.accent.set(name);
  }

  /** Moves to the next (`1`) or previous (`-1`) accent, wrapping around. */
  cycleAccent(delta: 1 | -1): void {
    const index = this.accents.findIndex((t) => t.id === this.accent());
    const next = (index + delta + this.accents.length) % this.accents.length;
    this.accent.set(this.accents[next].id);
  }

  private loadAccent(): ThemeName {
    if (!this.isBrowser) return 'neutral';
    try {
      const stored = localStorage.getItem(ACCENT_KEY);
      if (stored && THEMES.some((t) => t.id === stored)) {
        return stored as ThemeName;
      }
    } catch {
      // localStorage unavailable
    }
    return 'neutral';
  }

  private persistAccent(): void {
    try {
      localStorage.setItem(ACCENT_KEY, this.accent());
    } catch {
      // ignore
    }
  }
}
