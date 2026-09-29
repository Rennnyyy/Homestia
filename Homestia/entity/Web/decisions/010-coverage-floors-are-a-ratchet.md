# Coverage Floors Are an App-Level Ratchet

**Status**: accepted
**Type**: decision
**Supersedes**: none

## Statement
The Homestia frontend enforces coverage thresholds of **statements 75 / branches 72 / functions 65 / lines 80** over `src/app/**/*.ts`, excluding test files and the generated `src/app/entities/**`. The thresholds are configured in `angular.json` (`coverageThresholds`) and enforced by `npm run test:coverage`. They deviate from the SDK wing's 80/65/80/80 deliberately: branch coverage starts higher because the pages' state machines branch heavily, while statements and functions start lower because the two bespoke pages and the AI panel carry template-heavy code that unit tests measure only partially. ^statement

## Rationale
A threshold that the current tree cannot meet is a gate that gets disabled rather than satisfied. The measured baseline is the honest starting point, and the numbers are a ratchet: every future change must keep the suite green at these floors, and the floors move up as the pages gain interaction specs. Statements and functions are the axes with the most room to grow, which is why they sit below the SDK's numbers — the SDK's components are covered by real-template interaction specs in jsdom, a pattern the pages have only just begun to adopt. ^rationale

## Consequences
- `angular.json` `coverageInclude` is `src/app/**/*.ts`; `coverageExclude` covers `*.spec.ts` and `src/app/entities/**` (generated code is never counted).
- `Test-Coverage.md` records the per-file test counts and the last measured percentages; the measured column is only valid for the tree it was measured on and must be refreshed whenever the suite changes.
- Raising a floor is a normal pull request; lowering one requires a new decision record.
- The floors are enforced locally and, once the CI gate is wired, in the `test` job. ^consequences
