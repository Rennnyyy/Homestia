/**
 * The aspect contract, enforced across the app's own templates and calls.
 *
 * Every rendering of an entity — a form, a table — is one of three things at
 * once: a **view** (which fields it shows and how a value is judged), a **read**
 * (which aspect gates and enriches what comes back) and a **write** (which aspect
 * decides which fields may be set). A usage that names only some of them is the
 * dangerous kind: it looks right, and the missing leg fails silently — a write
 * without an operation aspect is unrestricted, a form without a view judges
 * nothing, a read without its query aspect loses the aspect's derived fields.
 *
 * These tests read the page sources as text. They are an architecture check, not
 * a behaviour check: the pages' specs assert what the calls carry, and this file
 * asserts that no usage is *missing* one of the three legs — including usages
 * added later, which is the whole point.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PAGES = ['features/properties/properties.ts', 'features/rentals/rentals.ts'] as const;

const source = (page: string): string =>
  readFileSync(new URL(page, import.meta.url).pathname, 'utf8');

/** Every `<aletheia-entity-form … />` / `<aletheia-entity-table … />` block. */
function usageBlocks(src: string, tag: 'form' | 'table'): string[] {
  return src.match(new RegExp(`<aletheia-entity-${tag}\\b[\\s\\S]*?/>`, 'g')) ?? [];
}

const countOf = (src: string, pattern: RegExp): number => (src.match(pattern) ?? []).length;

/**
 * The entities that have a query aspect registered in the Program
 * (`QueryAspects`) — the only reads that must select one. A query aspect is a
 * gate and an enricher, never a projection (measured), so an entity without one
 * has nothing to select and no leg to miss.
 */
const QUERY_ASPECT_BY_ROUTE: Record<string, string> = {
  rentals: 'RENTAL_STATE_QUERY_ASPECT_IRI',
};

describe('the aspect contract', () => {
  for (const page of PAGES) {
    it(`${page}: every form renders under a view`, () => {
      const src = source(page);
      const forms = usageBlocks(src, 'form');

      expect(forms.length).toBeGreaterThan(0);
      for (const form of forms) {
        expect(form, `a form without a [shapeKey] judges nothing:\n${form}`).toContain('[shapeKey]');
      }
    });

    it(`${page}: every form and table binds the entity it renders`, () => {
      const src = source(page);
      for (const tag of ['form', 'table'] as const) {
        for (const block of usageBlocks(src, tag)) {
          expect(block, `an ${tag} without [entity] renders nothing`).toContain('[entity]');
        }
      }
    });

    it(`${page}: every write selects an operation aspect`, () => {
      const src = source(page);

      // Each typed verb, and each aggregate save, is a write that must name the
      // aspect governing it. Counting is deliberate: a site-by-site sweep would
      // pass a call site it failed to match.
      const writeSites =
        countOf(src, /this\.aletheia\.(create|update|delete)\(/g) +
        countOf(src, /this\.sync\.(saveWithChildren|deleteWithChildren)\(/g);

      const aspectSelections =
        countOf(src, /operationAspectHeaders\(/g) + countOf(src, /operationAspectIri:/g);

      expect(writeSites, 'the page performs writes').toBeGreaterThan(0);
      expect(
        aspectSelections,
        `${writeSites} write call(s) but ${aspectSelections} operation aspect selection(s): ` +
          'a write without one is unrestricted',
      ).toBe(writeSites);
    });

    it(`${page}: every read of an aspect-bearing entity selects its query aspect`, () => {
      const src = source(page);

      for (const [route, iri] of Object.entries(QUERY_ASPECT_BY_ROUTE)) {
        // Only a page that actually reads the entity has this obligation.
        if (!src.includes(`'${route}'`)) continue;

        const reads = countOf(src, new RegExp(`this\\.aletheia\\.query<[^>]*>\\('${route}'`, 'g'));
        if (reads === 0) continue;

        expect(
          countOf(src, new RegExp(`${iri}`, 'g')),
          `reading '${route}' without its query aspect loses what the aspect derives`,
        ).toBeGreaterThanOrEqual(reads);
      }
    });
  }

  it('names every aspect the pages select', () => {
    // A selection must be one of the IRIs the Program registers — a typo would
    // otherwise reach the wire as an unknown aspect and behave as the no-op.
    const registered = [
      'PROPERTY_OPERATION_IRI',
      'TENANT_OPERATION_IRI',
      'RENTAL_OPERATION_IRI',
      'RENTAL_STATE_QUERY_ASPECT_IRI',
    ];

    for (const page of PAGES) {
      const src = source(page);
      for (const name of src.match(/[A-Z_]*OPERATION_IRI|[A-Z_]*QUERY_ASPECT_IRI/g) ?? []) {
        expect(registered, `${name} is not a registered aspect IRI`).toContain(name);
      }
    }
  });
});
