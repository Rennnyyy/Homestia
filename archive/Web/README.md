# Homestia Web — Frontend Handbook

Welcome to the Homestia Web frontend. This is the property management dashboard for landlords — built with Angular 18, Spartan UI, and Tailwind CSS.

## Architecture at a Glance

| Layer | Technology | Purpose |
|---|---|---|
| **Shell** | `AppShellComponent` | Layout: header + sidebar (desktop) / drawer (mobile) |
| **Routing** | Angular Router | Lazy-loaded feature modules per domain slice |
| **UI Primitives** | Spartan UI | Headless accessible components (buttons, dialogs, selects) |
| **Styling** | Tailwind CSS v3 | Utility-first; themed via CSS custom properties |
| **Forms** | `signalForm()` helper | Thin wrapper over Angular `FormGroup`, exposes signals |
| **State** | Services + `signal()` | Plain Angular services; no external state lib |
| **API** | `ApiService` layer | Future: typed HTTP client for Aletheia backend |

## Project Structure

```
src/
├── app/
│   ├── core/                  # Singleton services, guards, interceptors
│   │   ├── forms/             # signalForm() primitive & validators
│   │   ├── layout/            # LayoutService, ThemeService
│   │   └── state/             # Global state services
│   ├── features/              # Lazy-loaded feature slices
│   │   ├── dashboard/         # Home / overview
│   │   ├── properties/        # Property CRUD
│   │   ├── tenants/           # Tenant management
│   │   ├── leases/            # Lease agreements
│   │   ├── inventory/         # Inventory tracking
│   │   └── maintenance/       # Maintenance requests
│   ├── shared/                # Reusable components, pipes, directives
│   │   ├── components/        # UI components shared across features
│   │   └── pipes/             # Shared pipes
│   ├── shell/                 # AppShell, Header, Sidebar, Drawer
│   ├── app.component.ts       # Root component (delegates to shell)
│   ├── app.config.ts          # Application bootstrap config
│   └── app.routes.ts          # Top-level route definitions
├── index.html
├── styles.css                 # Tailwind directives + design tokens
└── main.ts
```

## Key Decisions

All architectural decisions are documented in `entity/Web/decisions/`:

| # | Decision |
|---|---|
| 001 | Tailwind CSS as the single CSS framework |
| 002 | CSS custom properties for theming (Spartan native pattern) |
| 003 | Custom `signalForm()` primitive for forms |
| 004 | Services with Angular signals for state management |
| 005 | Hybrid sidebar+header / drawer navigation |

## Dependencies

| Package | Purpose |
|---|---|
| `@spartan-ng/ui-core` | Headless UI primitives |
| `@angular/cdk` | Component Dev Kit (overlays, a11y, layout) |
| `tailwindcss` | Utility-first CSS framework |
| `tailwindcss-animate` | Animation utilities for Tailwind |
| `tailwind-merge` + `clsx` | Conflict-free class composition |

## Getting Started

```bash
cd src/Web
npm install
npm start          # Dev server on http://localhost:4200
npm run build      # Production build → ../Program/wwwroot
npm test           # Run unit tests
```

## Design Tokens

All colors are defined as CSS custom properties in `src/styles.css`. The palette uses three semantic color scales:

- **Surface** — backgrounds, cards, inputs (zinc-based)
- **Primary** — brand, actions, focus rings (indigo-based)
- **Accent** — highlights, badges, attention states (amber-based)
- **Destructive** — errors, deletions, warnings (red-based)

Light and dark themes are both defined in `styles.css`. Toggle via `.dark` class on `<html>`.

## Conventions

1. **No hardcoded colors** — use Tailwind semantic classes: `bg-primary-500`, `text-surface-900`.
2. **No inline styles** — everything is a Tailwind utility class or a CSS custom property.
3. **Standalone components only** — no `NgModule` except for test modules.
4. **Signal-based reactivity** — avoid `BehaviorSubject`, prefer `signal()` and `computed()`.
5. **Mobile-first** — every component must function at <1024px viewport width.
