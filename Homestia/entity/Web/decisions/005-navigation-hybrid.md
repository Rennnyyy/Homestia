# Navigation Architecture: Hybrid Sidebar + Header, Drawer on Mobile

**Status**: accepted
**Type**: decision
**Supersedes**: none

## Statement
The application shell uses a hybrid layout: a collapsible sidebar paired with a slim top header on desktop (≥1024px), collapsing to a top header bar with a swipeable drawer on mobile/tablet (<1024px). The sidebar and drawer share the same navigation component; only the container and toggle behavior change at the breakpoint. ^statement

## Rationale
A landlord's workflow involves comparing properties, scanning tenant lists, and reviewing financial summaries — tasks that benefit from persistent navigation context on larger screens. The sidebar provides this without consuming excessive horizontal space (collapsible to icon-only at 3.5rem). On mobile — used during on-site visits and quick checks — a bottom tab bar limits visible sections to ~4; the drawer pattern scales to 7+ navigation sections without cramping. A single breakpoint keeps the implementation simple: one component, two containers, CSS-driven adaptation. ^rationale

## Consequences
- The shell component (`AppShellComponent`) owns the layout. It renders `SidebarComponent` and `HeaderComponent` as siblings.
- Navigation items are defined in a single configuration array; both sidebar and mobile drawer consume it.
- The sidebar collapse state is managed by a `LayoutService` and persisted to `localStorage`.
- Mobile drawer opens via hamburger button in the header; closes on backdrop click, Escape key, or route navigation.
- The `1024px` breakpoint is defined as a Tailwind `lg:` prefix and a programmatic constant in `LayoutService`. ^consequences
