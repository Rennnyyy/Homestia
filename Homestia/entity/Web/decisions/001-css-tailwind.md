# CSS Strategy: Tailwind CSS

**Status**: accepted
**Type**: decision
**Supersedes**: none

## Statement
Tailwind CSS v3 is the single CSS framework for the Homestia Web frontend. All component styles are expressed as Tailwind utility classes. Custom CSS is reserved exclusively for design tokens (CSS custom properties on `:root`) and Tailwind plugin configuration. ^statement

## Rationale
Spartan UI primitives are designed for Tailwind — their official examples, documentation, and CLI-generated components assume Tailwind's utility-first approach. Using Tailwind eliminates the need to write and maintain a parallel utility class library. The `tailwind-merge` + `clsx` combination (required by Spartan) provides conflict-free class composition. CSS custom properties bridge the gap between Tailwind's design tokens and runtime theming (light/dark mode toggle). ^rationale

## Consequences
- All components use Tailwind classes; no SCSS, no CSS Modules, no styled-components.
- `tailwind.config.js` is the source of truth for theme extensions (colors, spacing, fonts).
- `styles.css` holds only `@tailwind` directives and `:root` / `.dark` custom property blocks.
- New team members must be comfortable with utility-first CSS. ^consequences
