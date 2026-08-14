# Frontend Validation: The ShapeMirror (SHACL in the Browser)

**Status**: accepted
**Type**: decision
**Supersedes**: none

## Statement
Form values are validated in the browser with the same SHACL language the backend uses, through a dedicated set of frontend-purpose shapes served by the Program at runtime. Each `sh:property` is a JSON key: keys absent from the shape are not rendered, `sh:order` defines field and column order, and violations map back onto form controls via the JSON path. Nested entities (rooms inside a property) validate as one RDF graph through `sh:node` recursion. The backend's operation aspects remain the authoritative protection. ^statement

## Rationale
Backend Aspects validate on actual operation — too late for user feedback. The frontend needs to mirror that judgment before a request is sent. SHACL was chosen over hand-written Angular validators for three reasons: one language spans both concerns; the shape doubles as view configuration (form fields, table columns); and nested validation (`sh:node`) expresses "an entity view within an entity view" natively. A full SHACL engine (`rdf-validate-shacl` + `n3`) is used rather than a validator-subset compiler, because no constraint vocabulary is off-limits. ^rationale

## Consequences
- **Two shape sets, two jobs:** backend Aspects protect; frontend shapes mirror and configure. They are deliberately separate — frontend shapes are authored for UX (required fields, ranges, messages) without weakening or duplicating backend enforcement.
- **Shape storage:** frontend shapes are registered into the SDK's `IAspectStore` as the non-enforcing **view family** (`IViewAspect`, `InlineTtlViewAspect`) and defined in `src/Program/ViewAspects.cs`; the SDK validates their Turtle syntax at registration — malformed views fail fast.
- **Transport:** the SDK's exploration endpoint serves the full TTL at `GET /api/entities/aspect-definitions/{iri}/view` (text/turtle, SHA-256 ETag, `If-None-Match` → 304). No Homestia-specific endpoint exists.
- **Engine:** `ShaclValidatorService` in `src/app/core/shapes/` fetches shapes, parses them, converts form JSON into RDF (predicate namespace = `https://www.aletheia.arkenforge.de/predicates/homestia/`, local name = JSON key), and maps violation reports back to JSON paths (`rooms[0].roomSize`).
- **Forms:** `DynamicEntityFormComponent` accepts a `shapeKey`, validates on save, and renders per-field errors; invalid values are never emitted.
- **Composite validation:** the properties flow validates property + rooms as one graph before `saveWithChildren`; violations surface in a summary with full JSON paths.
- **Tables:** `DynamicEntityTableComponent` derives available columns from the shape's `sh:property` order.
- **Caching:** in-memory with ETag revalidation — sufficient because shapes change only on deployment.
- **i18n:** `sh:message` values are translation keys of the form `shape.<entity>.<key>` (e.g. `shape.room.roomSize`); the frontend resolves them through Transloco against `assets/i18n/{lang}.json`. An untranslated key renders as the key itself.
- **Contract:** shape keys must stay in sync with entity property names (the generated entity definitions) and with `fields.<predicatePath>.<key>` i18n keys. ^consequences
