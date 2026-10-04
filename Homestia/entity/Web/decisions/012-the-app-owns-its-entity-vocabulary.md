# The App Owns Its Entity Vocabulary

**Status**: accepted
**Type**: decision
**Supersedes**: none

## Statement
Every entity word a page shows — a definition's label, a property's label, an enumeration value's
label — is carried by this app's own bundles (`src/assets/i18n/{en,de}.json`) under
`entities.<path>.properties.<property>.label` (and `entities.<path>.label` /
`entities.<path>.values.<key>.label`), which is the vocabulary the SDK's `EntitySemanticsService`
asks for and the backend's own labels then fall back to. The vocabulary is **derived** from the
committed `model.json` by `scripts/entity-labels.mjs` and gated: `npm run codegen:check` fails when
the model names a label the bundles do not carry. ^statement

## Rationale
**A missing key is silent, and silence is the defect.** The SDK's components ship no entity words —
they cannot know that a `Property` is an `Objekt` — so they look the word up in this bundle and keep
the backend's label as the fallback. A key nobody wrote therefore paints the right word anyway: no
page blanks, no test fails, and the only witness is Transloco's warning, one line per lookup per
render. Hundreds of those per page drown the warnings that do matter, which is how this was found.

**The backend already answers, in both languages.** `model.json` carries `labels.en` and `labels.de`
for every entity, property, owning/incoming relation and enumeration value — English mandatory,
translations optional. Hand-writing 184 words beside an answer the model already holds invites the
two to drift, so the words are read from the model instead.

**Add-only, so a chosen word survives.** The script adds what is missing and never rewrites or
deletes: a label this app wants to phrase differently is written by hand and stays written. The gate
in `codegen:check` reports what the model names and the bundle does not.

**One root, many definitions.** A `Property`, a `Room`, a `Studio` and a `CommonArea` are all
`segmentations`, and the SDK keys a property by its path, not by its type — so the four share one
property vocabulary (their property labels agree) while the shared root carries no `.label`, because
those four names differ and one key cannot say four words. ^rationale

## Consequences
- `scripts/entity-labels.mjs` (also `npm run i18n:entities`) writes `src/assets/i18n/{en,de}.json`
  from `model.json`, and `npm run codegen:check` now runs it with `--check` beside the
  `aletheia-cli check` of `src/app/entities/**` — the two halves of the same model, both gated.
- The bundles gained the vocabulary of all eleven entity paths: 92 keys each, in the flat
  `entities.*` form the admin's own bundles use (decision 006 keeps them in `src/assets/i18n/`).
- A table's `loadingMessage` is an **i18n key** (the SDK runs it through Transloco, unlike
  `emptyMessage`, which it renders as a message), so the two tables pass `'table.loading'`; without
  it the component's default literal `'Loading…'` is looked up as a key and warns on every render.
- `e2e/i18n.spec.ts` already proves the outcome a reader sees — the German column words
  (`Mieter`, `Mietdokumente`, `Objekt`, `Aktuelle Phase`, `Adresse`) and that no raw key survives on
  the page — which is the proof this vocabulary exists at all, since the same screen is correct with
  it and without it. ^consequences
