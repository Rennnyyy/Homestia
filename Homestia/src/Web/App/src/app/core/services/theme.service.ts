import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeName = 'neutral' | 'blue' | 'rose' | 'green' | 'violet' | 'amber';

export const THEMES: { id: ThemeName; color: string }[] = [
  { id: 'neutral', color: '#52525b' },
  { id: 'blue',    color: '#3b82f6' },
  { id: 'rose',    color: '#f43f5e' },
  { id: 'green',   color: '#22c55e' },
  { id: 'violet',  color: '#8b5cf6' },
  { id: 'amber',   color: '#f59e0b' },
];

const THEME_KEY = 'spartan-theme';
const DARK_KEY = 'spartan-dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly theme = signal<ThemeName>(this.loadTheme());
  readonly isDark = signal<boolean>(this.loadDark());

  readonly themes = THEMES;

  constructor() {
    if (this.isBrowser) {
      // Apply theme changes to <html>
      effect(() => {
        const html = document.documentElement;
        html.setAttribute('data-theme', this.theme());
        if (this.isDark()) {
          html.classList.add('dark');
        } else {
          html.classList.remove('dark');
        }
        this.persistTheme();
        this.persistDark();
      });
    }
  }

  setTheme(name: ThemeName): void {
    this.theme.set(name);
  }

  toggleDark(): void {
    this.isDark.update((v) => !v);
  }

  setDark(value: boolean): void {
    this.isDark.set(value);
  }

  cycleTheme(): void {
    const idx = this.themes.findIndex((t) => t.id === this.theme());
    const next = (idx + 1) % this.themes.length;
    this.theme.set(this.themes[next].id);
  }

  private loadTheme(): ThemeName {
    if (!this.isBrowser) return 'neutral';
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored && THEMES.some((t) => t.id === stored)) {
        return stored as ThemeName;
      }
    } catch {
      // localStorage unavailable
    }
    return 'neutral';
  }

  private loadDark(): boolean {
    if (!this.isBrowser) return false;
    try {
      const stored = localStorage.getItem(DARK_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {
      // localStorage unavailable
    }
    // Default: respect OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private persistTheme(): void {
    try {
      localStorage.setItem(THEME_KEY, this.theme());
    } catch {
      // ignore
    }
  }

  private persistDark(): void {
    try {
      localStorage.setItem(DARK_KEY, String(this.isDark()));
    } catch {
      // ignore
    }
  }
}
