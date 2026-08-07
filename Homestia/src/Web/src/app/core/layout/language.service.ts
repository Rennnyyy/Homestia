import { Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Language = 'de' | 'en';

const STORAGE_KEY = 'homestia-lang';
const SUPPORTED: Language[] = ['de', 'en'];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly _current = signal<Language>(this.loadLanguage());

  readonly current = this._current.asReadonly();
  readonly supported = SUPPORTED;

  constructor(private translate: TranslateService) {
    translate.use(this._current());
  }

  switch(lang: Language): void {
    this._current.set(lang);
    this.translate.use(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  toggle(): void {
    const next = this._current() === 'de' ? 'en' : 'de';
    this.switch(next);
  }

  private loadLanguage(): Language {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'de' || stored === 'en') return stored;
    const browserLang = navigator.language?.split('-')[0];
    return browserLang === 'en' ? 'en' : 'de';
  }
}
