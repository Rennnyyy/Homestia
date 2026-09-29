/**
 * The view ↔ aspect claim, checked against the shapes that make it.
 *
 * A view may declare the aspects it is used with: `views:operationAspect` for the writes it
 * feeds, `views:queryAspect` for the reads that serve it. The claim is opt-in and the platform
 * never enforces it — which is exactly why it is worth a test. A page that carries an aspect
 * IRI the shape it binds does NOT declare is a misconfiguration that fails silently on the
 * write path (an aspect whose shape names foreign predicates binds nothing and returns 200),
 * and nothing else in the app can see it.
 *
 * The shapes are C# (`ViewAspects.cs`) and their IRIs are C# constants, so this spec reads BOTH
 * sides as text: the backend's declarations, and the constants the pages pass. It is a
 * conformance check, not a behaviour check — the pages' own specs assert what their calls
 * carry; this file asserts that what they carry is what their views say they may.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url).pathname, 'utf8');

const VIEW_ASPECTS = read('../../../../Program/ViewAspects.cs');
const OPERATION_ASPECTS = read('../../../../Program/OperationAspects.cs');
const QUERY_ASPECTS = read('../../../../Program/QueryAspects.cs');
const SHAPE_MODEL = read('./core/shapes/shape.model.ts');
const PAGES = ['./features/properties/properties.ts', './features/rentals/rentals.ts'] as const;

/** The IRIs declared as `public const string Name = "…";` in the aspect files. */
function constants(source: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of source.matchAll(/public const string (\w+) = "([^"]+)";/g)) {
    found.set(match[1], match[2]);
  }
  return found;
}

const IRIS = new Map([...constants(OPERATION_ASPECTS), ...constants(QUERY_ASPECTS)]);

/** One view shape as the backend declares it: its IRI, and the aspects it may be used with. */
interface DeclaredView {
  name: string;
  shapeIri: string;
  operations: string[];
  queries: string[];
}

/**
 * The views, read out of the C# raw strings. A binding line is always
 * `<{{Aspect.XAspectPredicate}}> <{{Group.Const}}> ;` — the platform predicate interpolated
 * from the SDK's own constant, the target from a constant in this project — so the reader
 * resolves both and reports what a client would receive.
 */
function declaredViews(): DeclaredView[] {
  const views: DeclaredView[] = [];
  const blocks = VIEW_ASPECTS.matchAll(/public const string (\w+Ttl) = \$\$"""([\s\S]*?)""";/g);

  for (const [, name, body] of blocks) {
    const shapeIri = body.match(/<(urn:[^>]+)>\s*\n\s*a sh:NodeShape/)?.[1] ?? '';
    const bindings = (predicate: string): string[] =>
      [...body.matchAll(new RegExp(`<\\{\\{Aspect\\.${predicate}\\}\\}> <\\{\\{(\\w+)\\.(\\w+)\\}\\}>`, 'g'))]
        .map(([, group, constant]) => IRIS.get(constant) ?? `UNRESOLVED ${group}.${constant}`)
        // The predicate the TTL carries has to be the platform's OWN constant, never a literal.
        .filter((iri, index, all) => iri.length > 0 && all.indexOf(iri) === index);

    views.push({
      name,
      shapeIri,
      operations: bindings('OperationAspectPredicate'),
      queries: bindings('QueryAspectPredicate'),
    });
  }
  return views;
}

const VIEWS = declaredViews();
const viewOf = (shapeIri: string): DeclaredView | undefined => VIEWS.find((v) => v.shapeIri === shapeIri);

/** The IRI of a constant the app's pages pass, read the way the pages import it. */
const appIri = (name: string): string => SHAPE_MODEL.match(new RegExp(`${name} = '([^']+)'`))?.[1] ?? '';

/**
 * Which shapes each page binds — a page is not one form. The rentals page carries the eight
 * stage forms AND the inline tenant form, so an aspect it passes has to be declared by ONE of
 * them; the assertion is membership in the union, never in a single view.
 */
const BOUND_SHAPES: Record<string, string[]> = {
  './features/properties/properties.ts': ['urn:aletheia:homestia:shapes:property', 'urn:aletheia:homestia:shapes:room'],
  './features/rentals/rentals.ts': [
    'urn:aletheia:homestia:shapes:rental:application',
    'urn:aletheia:homestia:shapes:rental:contract',
    'urn:aletheia:homestia:shapes:rental:deposit',
    'urn:aletheia:homestia:shapes:rental:handover',
    'urn:aletheia:homestia:shapes:rental:tenancy',
    'urn:aletheia:homestia:shapes:rental:noticed',
    'urn:aletheia:homestia:shapes:rental:handback',
    'urn:aletheia:homestia:shapes:rental:terminated',
    'urn:aletheia:homestia:shapes:tenant',
  ],
};

describe('view bindings (the shape declares what may use it)', () => {
  it('reads every view out of the backend source, each with its own shape IRI', () => {
    // 11 views: the property root, the room nested in it, the tenant form, and the eight
    // rental stages. A view that failed to parse would silently drop out of every check below.
    expect(VIEWS.map((view) => view.name).sort()).toEqual(
      [
        'PropertyTtl',
        'RoomTtl',
        'TenantTtl',
        'RentalApplicationTtl',
        'RentalContractTtl',
        'RentalDepositTtl',
        'RentalHandoverTtl',
        'RentalTenancyTtl',
        'RentalNoticedTtl',
        'RentalHandbackTtl',
        'RentalTerminatedTtl',
      ].sort(),
    );
    for (const view of VIEWS) expect(view.shapeIri, view.name).toMatch(/^urn:aletheia:homestia:shapes:/);
  });

  it('binds every view to a REGISTERED operation aspect, and never to a made-up one', () => {
    // A view names the write it feeds. The IRIs are resolved to the operation aspect's own
    // constants, so a claim that names something this backend does not register is a failure
    // here rather than a silent drop on the write path.
    for (const view of VIEWS) {
      expect(view.operations, view.name).toHaveLength(1);
      expect(IRIS.get('PropertyOperationIri'), 'the property operation aspect is not declared').toBeTruthy();
      expect([...IRIS.values()], view.name).toContain(view.operations[0]);
    }

    expect(viewOf('urn:aletheia:homestia:shapes:property')?.operations).toEqual([IRIS.get('PropertyOperationIri')]);
    expect(viewOf('urn:aletheia:homestia:shapes:room')?.operations).toEqual([IRIS.get('PropertyOperationIri')]);
    expect(viewOf('urn:aletheia:homestia:shapes:tenant')?.operations).toEqual([IRIS.get('TenantOperationIri')]);
  });

  it('binds the eight rental stages to the AGGREGATE rental write, and to the read that serves them', () => {
    // A rental is written whole by one aspect naming the union of every stage's fields, so each
    // stage view names that one write; and the rentals list is read through the state query
    // aspect, which is the read behind every stage view.
    const stages = VIEWS.filter((view) => view.name.startsWith('Rental') && view.name !== 'RentalStateQueryAspectIri');
    expect(stages).toHaveLength(8);
    for (const stage of stages) {
      expect(stage.operations, stage.name).toEqual([IRIS.get('RentalOperationIri')]);
      expect(stage.queries, stage.name).toEqual([IRIS.get('RentalStateQueryAspectIri')]);
    }
  });

  it('leaves a view that no query aspect serves unbound on the read side', () => {
    // The property, room and tenant lists are read without a query aspect, so claiming one
    // would be a lie the admin would then show — declaring is a claim about REUSE.
    for (const shapeIri of [
      'urn:aletheia:homestia:shapes:property',
      'urn:aletheia:homestia:shapes:room',
      'urn:aletheia:homestia:shapes:tenant',
    ]) {
      expect(viewOf(shapeIri)?.queries, shapeIri).toEqual([]);
    }
  });

  it('carries only aspect IRIs a page may actually send — every constant the pages pass is declared', () => {
    // The other direction of the same contract: an IRI a page passes must be one of the claims
    // its own views make. This is the check that would have caught a page writing through an
    // aspect no shape it binds ever mentions.
    for (const page of PAGES) {
      const source = read(page);
      const declared = (BOUND_SHAPES[page] ?? []).map((shapeIri) => viewOf(shapeIri));
      expect(declared.length, `${page} binds no shape this spec can read`).toBeGreaterThan(0);
      for (const view of declared) expect(view, `${page} binds a shape whose view could not be read`).toBeDefined();

      const passedOperations = [...source.matchAll(/([A-Z_]*OPERATION_IRI)/g)].map(([, name]) => name);
      const passedQueries = [...source.matchAll(/([A-Z_]*QUERY_ASPECT_IRI)/g)].map(([, name]) => name);

      for (const name of new Set(passedOperations)) {
        const iri = appIri(name);
        expect(iri, `${page} passes ${name}, which the shape model does not declare`).toBeTruthy();
        const declaredBy = declared.filter((view) => view?.operations.includes(iri)).map((view) => view?.name);
        expect(declaredBy, `${page} passes ${name}, which none of its views declare`).not.toEqual([]);
      }
      for (const name of new Set(passedQueries)) {
        const iri = appIri(name);
        expect(iri, `${page} passes ${name}, which the shape model does not declare`).toBeTruthy();
        // A read is bound by the views the page renders — a page whose views declare no query
        // aspect reads without one, and claims nothing.
        if (!declared.some((view) => (view?.queries.length ?? 0) > 0)) continue;
        const declaredBy = declared.filter((view) => view?.queries.includes(iri)).map((view) => view?.name);
        expect(declaredBy, `${page} passes ${name}, which none of its views declare`).not.toEqual([]);
      }
    }
  });

  it('resolves every binding it reads — an unresolved constant would pass the checks above silently', () => {
    // `UNRESOLVED` is what the reader returns for a constant it cannot find; a claim carrying it
    // must never satisfy a membership check by accident.
    for (const view of VIEWS) {
      for (const iri of [...view.operations, ...view.queries]) {
        expect(iri, view.name).toMatch(/^urn:aletheia:homestia:/);
      }
    }
  });
});
