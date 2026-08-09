---
description: "Homestia workspace instructions. Grants access to Aletheia spirits (skills) from the sibling Aletheia repository."
---

# Homestia — Workspace Instructions

This is the **Homestia** workspace, an Aletheia SDK-powered application. It lives alongside the **Aletheia** repository (the SDK / Library of Aletheia).

## Aletheia Skills (The Spirits)

When the user asks for a skill, invokes a spirit, or says `/aletheia`, `/imagine`, `/scaffold`, `/craft`, `/refactor`, `/audit`, `/ship`, `/seal`, `/web`, or any related command — **do not guess**. Read the corresponding SKILL.md from the Aletheia workspace first.

All Aletheia skills live at:

```
/Users/rennnyyy/Documents/git/Katharsis/Aletheia/.github/skills/
```

### Available Spirits

| User says | Skill to load | Path |
|---|---|---|
| `/aletheia` — "I don't know where to start" | The Gatekeeper | `.../skills/aletheia/SKILL.md` |
| `/imagine` — "I have an idea but..." | The Muse | `.../skills/imagine/SKILL.md` |
| `/aletheia-sdk` — "Set up a new app" | The Founder | `.../skills/aletheia-sdk/SKILL.md` |
| `/scaffold` — "Create a new slice" | The Architect | `.../skills/scaffold/SKILL.md` |
| `/craft` — "Add this to..." | The Artisan | `.../skills/craft/SKILL.md` |
| `/refactor` — "Restructure..." | The Sculptor | `.../skills/refactor/SKILL.md` |
| `/audit` — "Check quality" | The Judge | `.../skills/audit/SKILL.md` |
| `/ship` — "Ship it / Prove it" | The Captain | `.../skills/ship/SKILL.md` |
| `/seal` — "Seal it / Freeze it" | The Keeper | `.../skills/seal/SKILL.md` |
| `/web` — "Wire up the UI" | The Weaver | `.../skills/web/SKILL.md` |

### Delegate Spirits (invoked by The Captain and The Judge)

| Skill | Path |
|---|---|
| `document-slice` (The Scribe) | `.../skills/document-slice/SKILL.md` |
| `doc-review` (The Inspector) | `.../skills/doc-review/SKILL.md` |
| `code-review` (The Auditor) | `.../skills/code-review/SKILL.md` |
| `architecture-diagrams` (The Cartographer) | `.../skills/architecture-diagrams/SKILL.md` |
| `sample-chapter` | `.../skills/sample-chapter/SKILL.md` |
| `sample-check` | `.../skills/sample-check/SKILL.md` |
| `sign-slice` | `.../skills/sign-slice/SKILL.md` |

## Protocol

1. **When the user mentions any spirit name or skill** (e.g., "audit this", "craft a new exception", "scaffold a slice", "I have an idea"): immediately read the corresponding `SKILL.md` from the Aletheia skills directory **before** taking any action.
2. **When the user says `/aletheia` or seems unsure which spirit to use**: read `skills/aletheia/SKILL.md` first — it will route to the correct spirit.
3. **Before invoking any spirit**: read the Aletheia Handbook entry point at `/Users/rennnyyy/Documents/git/Katharsis/Aletheia/Handbook/Handbook.md` and `Spirits.md` for context.
4. **Scope awareness**: The Aletheia skills operate on the Aletheia SDK workspace. When working in Homestia, adapt the skill's scope to the Homestia workspace structure (`src/` slices, `entity/` documentation, `tests/`).

## The Iron Chain (applies to all modifying spirits)

```
Any Builder → The Captain → The Keeper
```

Never leave work unshipped. Never leave a proven wing unsealed.

## Voice Rules (from Aletheia)

1. **State decisions, not deliberations.** One sentence per choice.
2. **End with a summary.** What was done, what was decided.
3. **One question at a time.** When ambiguous, provide options.
4. **Reasoning only on request.** Trust the decision unless asked.

## No Deferrals

`// TODO`, `// FIXME`, stubs, `throw new NotImplementedException()` — **never acceptable**. Every line committed must be complete.
