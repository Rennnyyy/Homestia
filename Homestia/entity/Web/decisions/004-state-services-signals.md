# State Management: Services with Signals

**Status**: accepted
**Type**: decision
**Supersedes**: none

## Statement
Shared application state lives in plain Angular `@Injectable()` services that expose `signal()`, `computed()`, and `effect()` primitives. No external state management library (NgRx, Akita, Elf) is introduced. Server state (API data) will be modeled through the same service-signal pattern, with the door open to adopt NgRx SignalStore or TanStack Query when complexity demands it. ^statement

## Rationale
Angular 18's built-in signal primitives cover the current needs: mutable state (`signal`), derived state (`computed`), and side effects (`effect`). A library would add conceptual overhead (actions, reducers, selectors, entities) before the application's complexity justifies it. Starting with plain services keeps the codebase approachable, reduces onboarding friction, and defers the architectural commitment. The pattern is trivially upgradeable: a signal-based service already looks like a SignalStore — migrating means adding decorators, not rewriting logic. ^rationale

## Consequences
- State services live in `src/app/core/state/` or co-located with feature slices.
- Services are provided at the appropriate level: `root` for global state, feature route for scoped state.
- HTTP calls are not embedded in services — a separate `ApiService` layer handles networking and returns raw data; state services call it and update signals.
- If a feature requires normalized entity caching, optimistic updates, or request deduplication, NgRx SignalStore is the first library to evaluate. ^consequences
