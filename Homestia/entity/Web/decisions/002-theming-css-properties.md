# Theming Architecture: CSS Custom Properties (Spartan Native)

**Status**: accepted
**Type**: decision
**Supersedes**: none

## Statement
Theming is implemented via CSS custom properties on `:root` and `.dark` selectors. No Angular injection token, no theming library, no CSS-in-JS runtime. The `:root` block defines light-theme design tokens; the `.dark` class (toggled on `<html>`) swaps them. All Spartan primitives and custom components consume these tokens through Tailwind's `theme.extend.colors` bridge. ^statement

## Rationale
This is Spartan UI's native approach. The library's primitives reference Tailwind color classes (e.g., `bg-primary-500`), which resolve to CSS custom properties. By defining custom properties at `:root`, we get zero-cost theming — no JavaScript overhead, no recalculation on toggle, and instant browser-native transitions. A DI-token approach would duplicate what the platform already provides and add indirection without benefit at this stage. ^rationale

## Consequences
- Theme tokens are co-located in `src/styles.css` — a single file to scan for the design palette.
- Dark mode is a class toggle — `<html class="dark">`. A `ThemeService` manages the toggle and persists preference to `localStorage`.
- Adding a third theme (high contrast, brand variant) requires a new class block (e.g., `.high-contrast`) with the same custom property names.
- Components never reference hardcoded color hex values; they use Tailwind semantic classes exclusively. ^consequences
