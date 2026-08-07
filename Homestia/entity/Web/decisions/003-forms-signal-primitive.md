# Form Architecture: Custom signalForm() Primitive

**Status**: accepted
**Type**: decision
**Supersedes**: none

## Statement
Forms use a thin custom `signalForm()` primitive that wraps Angular's `FormGroup` and exposes form state as reactive signals. Components bind to signals for value, errors, touched, and dirty state. Validation uses Angular's built-in `Validators` composed declaratively at form creation time. No third-party form library is introduced. ^statement

## Rationale
Angular 18's signal-based reactivity and Spartan's headless primitives create a gap: Spartan provides UI atoms (input, select, checkbox) but no form wiring. Template-driven forms scatter validation; reactive forms require `toSignal()` bridges that feel bolted-on. A thin `signalForm()` helper — roughly 50 lines — wraps `FormGroup` and exposes `value`, `errors`, `touched`, `dirty` as `computed()` signals. This preserves Angular's mature validation engine (sync + async validators, cross-field rules) while delivering the ergonomics of signal-based templates. It mirrors Spartan's philosophy: a minimal, composable abstraction over platform primitives. ^rationale

## Consequences
- The `signalForm()` helper lives in `src/app/core/forms/signal-form.ts`.
- Every form component uses `signalForm()` — no mixing with template-driven or raw reactive forms.
- Validation logic is centralized in the form model, not scattered across templates.
- Custom validators are plain functions returning `ValidatorFn` — fully reusable.
- If Angular ships an official signal-form API, migration is a find-and-replace of the helper import. ^consequences
