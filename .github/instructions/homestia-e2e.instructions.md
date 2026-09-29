---
description: "Use when: adding, changing, or reviewing any user-visible behaviour in the Homestia app (Homestia.Frontend) — a page, a control, a wizard step, a stage, a route, a theme or language affordance, or a form field. Defines the end-to-end test duty that every feature carries in this repository."
applyTo: "Homestia.Frontend/**"
---

# Every Feature Carries Its End-To-End Path

Homestia has three layers of proof and they answer three different questions. A feature is not done
until all three that apply to it exist.

| Layer | Question it answers | Where |
|---|---|---|
| Unit (`*.spec.ts` beside the code) | Does the page's logic do what it claims? | `Homestia.Frontend/src/**` |
| End-to-end (`e2e/*.spec.ts`) | Does a reader get the outcome through the real app and the real API? | `Homestia.Frontend/e2e` |
| Visual (`e2e/smoke.spec.ts-snapshots/*.png`) | Did the code change, or did the look change? | committed baselines |

## The duty

1. **A new user-visible capability ships with an e2e test in the same change.** A route, a wizard
   step, a stage, a dialog, a form flow, a filter, a toggle — if a reader can reach it, an e2e test
   reaches it. "It has unit tests" is not the same answer: unit tests mock the API, and the defects
   that hurt were the ones where the API refused what the page sent.
2. **Assert the RECORD, not the page.** `200` proves nothing: the write filter binds only the
   predicates an aspect names, so a field can be dropped while the save reports success. Read the
   entity back (`POST /api/entities/<path>/query` or `?iri=`) and assert the fields the form showed.
   The page assertion (the row appeared) is the *setup*, not the proof.
3. **No `test.fixme`, no `test.skip` without a reason in the file.** A parked test is a claim that a
   defect exists; when the defect is fixed, the test is written. Both parked tests in
   `write.spec.ts` were exactly this — a room's size and a field the save dropped.
4. **Geometry, not pixel ratio, pins a control's place.** The visual comparison allows a 1% pixel
   difference, and a small control moving between chrome regions is well under it — the baselines
   tolerated the accent cycler's move from the rail to the header. If a test's point is *where* or
   *whether* something is, measure it (`boundingBox`, `count()`), don't photograph it.
5. **Regenerate baselines only deliberately**, with `npm run test:e2e:update`, and say in the commit
   what changed the look and why. Then review the diff — a baseline is a claim about intent.
6. **The suite expects the host as the config documents it**: a fresh in-memory store (`:5080`),
   because a populated store changes row counts and any baseline taken on it is about today's data.
   `write.spec.ts` creates records, so it runs after the pixel comparisons.

## When a feature is genuinely out of reach

Say so in the same breath as the feature, in the test file, with the reason a reader can act on —
"needs an AI endpoint the suite does not have", "needs a second tenant model" — and cover the part
that *is* reachable (the panel opens, the empty state renders, the route redirects). A missing test
with a stated reason is honest; a missing test nobody notices is not.

## Two traps that cost real time

1. **A fixture's route is the OPERATION route, not the entity's type path.** A `Tenant` is created by
   `POST /api/entities/tenants`, and its IRI then lives under `/agents/…`. Posting to `/agents`
   answers `200` and creates an *Agent* — which no tenant-shaped read ever lists, so the page shows an
   empty dropdown and the test fails somewhere else entirely. Read the routes from
   `POST /api/entities/aletheia/entity-operations/query`, and have a fixture assert that the page's
   own read can see it before the test proceeds.
2. **A snapshot read after a click races the render.** `await html.getAttribute(...)` immediately
   after `click()` sees the old DOM and fails intermittently; `await expect(locator).toHaveAttribute(...)`
   retries and is what these specs should use. The same goes for reading a value out of the DOM
   instead of asserting on it.
