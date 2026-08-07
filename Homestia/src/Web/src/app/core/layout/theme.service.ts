import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'homestia-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.loadTheme());

  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme() === 'dark');

  constructor() {
    effect(() => {
      const html = document.documentElement;
      if (this._theme() === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      localStorage.setItem(STORAGE_KEY, this._theme());
    });
  }

  toggle(): void {
    this._theme.update(t => (t === 'light' ? 'dark' : 'light'));
  }

  set(theme: Theme): void {
    this._theme.set(theme);
  }

  private loadTheme(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
