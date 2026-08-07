# Internationalization: ngx-translate with Runtime Language Switching

**Status**: accepted
**Type**: decision
**Supersedes**: none

## Statement
The application uses `@ngx-translate/core` for internationalization with runtime language switching. Translation files are JSON key-value pairs loaded at bootstrap from `src/assets/i18n/{lang}.json`. German (`de`) is the primary language; English (`en`) is the secondary. The active language is persisted to `localStorage` and managed by a `LanguageService`. ^statement

## Rationale
Angular's built-in `@angular/localize` compiles translations at build time — requiring separate builds per locale. This conflicts with the requirement for a single build artifact deployed to `wwwroot`. `ngx-translate` loads translations at runtime via HTTP, supports language switching without a page reload, and has a mature pipe (`| translate`) and service API. The library is widely adopted (3M+ weekly downloads) and actively maintained for Angular 18+. ^rationale

## Consequences
- Translation files live in `src/assets/i18n/de.json` and `src/assets/i18n/en.json`.
- Every user-facing string in templates uses the `translate` pipe: `{{ 'KEY' | translate }}`.
- Every user-facing string in TypeScript uses `TranslateService.instant('KEY')` or `get('KEY')`.
- The `LanguageService` wraps `TranslateService`, persists the choice to `localStorage`, and exposes a reactive `currentLang` signal.
- The initial language defaults to `de`. The language switcher is placed in the header next to the theme toggle.
- Adding a new language requires: (1) a new JSON file, (2) registering it in `app.config.ts` providers, (3) no code changes. ^consequences
