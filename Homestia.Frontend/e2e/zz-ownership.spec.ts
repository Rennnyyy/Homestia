import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Ownership, end to end — the property a page creates belongs to the landlord that created it, and
 * to nobody else.
 *
 * The rule lives on the SERVER (the write and read gates), so the proof cannot be the page: the
 * page could stop binding a landlord and every screen would still look right, right up to the
 * moment a second agent could read the record. Everything here is therefore read back through the
 * API — including the record's own `landlord`, the field the gates resolve.
 *
 * Identity is the local-development source: `Authorization: Bearer <token>`, which the host
 * projects into an Agent on the first request. A deployment reaches the same state through
 * Authentik forward-auth; the gates never learn which door was used.
 *
 * The test needs a host with an EMPTY in-memory store, like the baselines: it writes its own
 * records, and a second run of the same name would leave two.
 *
 * `zz-` is not decoration: Playwright runs the files in name order, `smoke.spec.ts` photographs a
 * band that includes the property table's first rows, and this spec creates records. It therefore
 * runs with the other writers, AFTER the pixel comparisons — the same reason `write.spec.ts` sits
 * where it does.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5080';

const LANDLORD_QUERY_ASPECT = 'urn:aletheia:homestia:query:landlord';
const PROPERTY_QUERY_ASPECT = 'urn:aletheia:homestia:query:property';
const PROPERTY_OPERATION_ASPECT = 'urn:aletheia:homestia:operations:property';
const RENTAL_QUERY_ASPECT = 'urn:aletheia:homestia:query:rental-state';
const RENTAL_APPLICATION_OPERATION_ASPECT = 'urn:aletheia:homestia:operations:rental:application';
const TENANT_OPERATION_ASPECT = 'urn:aletheia:homestia:operations:tenant';

/** Two identities that no earlier run can own. */
const AGENT_A = 'e2e-owner-a';
const AGENT_B = 'e2e-stranger-b';

const asAgent = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

const queryAspect = (iri: string): Record<string, string> => ({ 'X-Aletheia-Query-AspectIri': iri });
const operationAspect = (iri: string): Record<string, string> => ({ 'X-Aletheia-Operation-AspectIri': iri });

const encode = (iri: string): string => encodeURIComponent(iri);

/** A name no earlier run can own — one store is shared by the whole suite. */
const unique = (base: string): string => `${base} ${Date.now().toString(36)}`;

async function settle(page: Page, ready: string): Promise<void> {
  await expect(page.locator(ready)).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

/** Creates a property through the real form, exactly as a user would. */
async function createProperty(page: Page, name: string): Promise<void> {
  await page.goto('/properties');
  await settle(page, 'app-properties');

  const address = page.locator('aletheia-entity-form:visible [data-field="address"] input').first();
  if ((await address.count()) === 0) {
    await page.getByRole('button', { name: 'Add Property' }).click();
  }
  await expect(address).toBeVisible();

  const form = page.locator('aletheia-entity-form:visible').first();
  await form.locator('[data-field="name"] input').fill(name);
  await form.locator('[data-field="address"] input').fill('Ownership Straße 1');
  // The view requires a property type, so the save is refused until one is chosen. Option 0 is the
  // empty "-- Select --".
  await form.locator('[data-field="propertyType"] select').selectOption({ index: 1 });

  await page.getByRole('button', { name: 'Save Property' }).click();
  await expect(page.locator('aletheia-entity-table tbody')).toContainText(name);
}

test.describe('a property belongs to the landlord that created it', () => {
  // Every request the page makes carries this identity — the same header a deployment's proxy
  // would supply, only without the proxy.
  test.use({ extraHTTPHeaders: asAgent(AGENT_A) });

  test('the record names the creator as its landlord, and the gates hold for another agent', async ({
    page,
    request,
    playwright,
  }) => {
    const propertyName = unique('Owned Property');
    await createProperty(page, propertyName);

    // ── The binding: the record itself carries the landlord ─────────────────
    const listed = await request.post('/api/entities/properties/query', {
      headers: queryAspect(PROPERTY_QUERY_ASPECT),
      data: { count: 'none' },
    });
    expect(listed.ok()).toBeTruthy();
    const property = ((await listed.json()).items as Record<string, unknown>[]).find(
      (row) => row['name'] === propertyName,
    );
    expect(property, 'the property was persisted').toBeTruthy();
    expect(property!['landlord'], 'a property saved without an owner is reachable by nobody').toBeTruthy();

    // …and that landlord names the creator. A property pointing at some other landlord would make
    // the rest of this test pass for the wrong reason.
    const landlordIri = property!['landlord'] as string;
    const landlord = await request.get(`/api/entities/landlords?iri=${encode(landlordIri)}`, {
      headers: queryAspect(LANDLORD_QUERY_ASPECT),
    });
    expect(landlord.ok()).toBeTruthy();
    expect((await landlord.json())['agent'] as string).toContain('/authorization-agents/');

    // ── The gate: another agent reaches neither the record nor a way to change it ──
    const stranger = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: asAgent(AGENT_B),
    });
    try {
      const strangerRow = await stranger.get(
        `/api/entities/properties?iri=${encode(property!['iri'] as string)}`,
        { headers: queryAspect(PROPERTY_QUERY_ASPECT) },
      );
      expect(strangerRow.status(), 'a property is not readable by a landlord it does not name').toBe(422);

      const strangerList = await stranger.post('/api/entities/properties/query', {
        headers: queryAspect(PROPERTY_QUERY_ASPECT),
        data: { count: 'none' },
      });
      const strangerNames = ((await strangerList.json()).items as Record<string, unknown>[]).map(
        (row) => row['name'],
      );
      expect(strangerNames).not.toContain(propertyName);

      // The landlord is gated by the same rule — and the other agent HAS one of its own, provisioned by
      // the host on this very request. One landlord per agent, and neither sees the other's.
      const strangerLandlord = await stranger.get(`/api/entities/landlords?iri=${encode(landlordIri)}`, {
        headers: queryAspect(LANDLORD_QUERY_ASPECT),
      });
      expect(strangerLandlord.status(), 'a landlord is visible only to the agent it names').toBe(422);

      const strangerLandlords = await stranger.post('/api/entities/landlords/query', {
        headers: queryAspect(LANDLORD_QUERY_ASPECT),
        data: { count: 'none' },
      });
      const strangerLandlordIris = ((await strangerLandlords.json()).items as Record<string, unknown>[]).map(
        (row) => row['iri'],
      );
      expect(strangerLandlordIris.length, 'the host provisions a landlord for every identified caller').toBe(1);
      expect(strangerLandlordIris).not.toContain(landlordIri);

      const strangerWrite = await stranger.put(
        `/api/entities/properties?iri=${encode(property!['iri'] as string)}`,
        {
          headers: operationAspect(PROPERTY_OPERATION_ASPECT),
          data: { name: 'Hijacked' },
        },
      );
      expect(strangerWrite.status(), 'a property is not writable by a landlord it does not name').toBe(422);
    } finally {
      await stranger.dispose();
    }

    // The record is untouched by the refused write — the gate rejected it before anything applied.
    const after = await request.get(
      `/api/entities/properties?iri=${encode(property!['iri'] as string)}`,
      { headers: queryAspect(PROPERTY_QUERY_ASPECT) },
    );
    expect((await after.json())['name']).toBe(propertyName);

    // ── The owner's own edit keeps the link it did not re-send ──────────────
    // The write binds only the fields its shape names and the rest of the record is loaded and
    // kept. A full replace would drop the landlord on the first rename, and the property would
    // become unreachable to the very agent that owns it — a silent loss of access.
    const renamed = `${propertyName} renamed`;
    const edit = await request.put(`/api/entities/properties?iri=${encode(property!['iri'] as string)}`, {
      headers: operationAspect(PROPERTY_OPERATION_ASPECT),
      data: { name: renamed },
    });
    expect(edit.ok()).toBeTruthy();

    const kept = await request.get(
      `/api/entities/properties?iri=${encode(property!['iri'] as string)}`,
      { headers: queryAspect(PROPERTY_QUERY_ASPECT) },
    );
    const keptRecord = await kept.json();
    expect(keptRecord['name']).toBe(renamed);
    expect(keptRecord['landlord'], 'a rename must not orphan the property').toBe(property!['landlord']);
  });

  test('a second property reuses the landlord the host provisioned', async ({ page, request }) => {
    await createProperty(page, unique('First Owned Property'));
    const first = (await (
      await request.post('/api/entities/landlords/query', {
        headers: queryAspect(LANDLORD_QUERY_ASPECT),
        data: { count: 'none' },
      })
    ).json()).items as Record<string, unknown>[];

    await createProperty(page, unique('Second Owned Property'));
    const second = (await (
      await request.post('/api/entities/landlords/query', {
        headers: queryAspect(LANDLORD_QUERY_ASPECT),
        data: { count: 'none' },
      })
    ).json()).items as Record<string, unknown>[];

    // The caller's landlord is provisioned once, by the host, and the page only ever BINDS the one it
    // finds: one agent owns every property it creates, and a fresh landlord per property would split
    // that ownership into strangers.
    expect(first.length).toBe(1);
    expect(second.length).toBe(1);
    expect(second[0]['iri']).toBe(first[0]['iri']);
  });
});

test.describe('an anonymous caller', () => {
  test('still creates properties — there is no identity to bind, and no gate to apply', async ({ page, request }) => {
    const propertyName = unique('Anonymous Property');
    await createProperty(page, propertyName);

    const listed = await request.post('/api/entities/properties/query', {
      headers: queryAspect(PROPERTY_QUERY_ASPECT),
      data: { count: 'none' },
    });
    const property = ((await listed.json()).items as Record<string, unknown>[]).find(
      (row) => row['name'] === propertyName,
    );

    expect(property, 'a store with no identities in it stays usable').toBeTruthy();
    expect(property!['landlord'] ?? null).toBeNull();
  });
});

/** The IRI of a property the caller owns, read back through the gated list. */
async function ownedPropertyIri(request: APIRequestContext, name: string): Promise<string> {
  const listed = await request.post('/api/entities/properties/query', {
    headers: queryAspect(PROPERTY_QUERY_ASPECT),
    data: { count: 'none' },
  });
  const row = ((await listed.json()).items as Record<string, unknown>[]).find((r) => r['name'] === name);
  expect(row, `the property '${name}' was persisted`).toBeTruthy();
  return row!['iri'] as string;
}

/** The stage catalogue IRI for a key — enum records are definition-backed, never stored. */
async function rentalStageIri(request: APIRequestContext, key: string): Promise<string> {
  const listed = await request.post('/api/entities/rental-stages/query', { data: { count: 'none' } });
  const row = ((await listed.json()).items as Record<string, unknown>[]).find((r) => r['key'] === key);
  expect(row, `the '${key}' rental stage is registered`).toBeTruthy();
  return row!['iri'] as string;
}

test.describe('a rental belongs to the landlord of the property it is for', () => {
  test.use({ extraHTTPHeaders: asAgent(AGENT_A) });

  test('the record is readable and writable by its owner, and refused to another agent', async ({
    page,
    request,
    playwright,
  }) => {
    // A rental is owned through the property it names, so the property has to belong to the caller.
    const propertyName = unique('Rental Property');
    await createProperty(page, propertyName);
    const property = await ownedPropertyIri(request, propertyName);

    // A tenant is a party, not an owner; the agreement only has to name one.
    const tenant = await request.post('/api/entities/tenants', {
      headers: operationAspect(TENANT_OPERATION_ASPECT),
      data: { displayName: unique('Rental Tenant') },
    });
    expect(tenant.ok()).toBeTruthy();
    const tenantIri = (await tenant.json())['iri'] as string;

    const created = await request.post('/api/entities/rentals', {
      headers: operationAspect(RENTAL_APPLICATION_OPERATION_ASPECT),
      data: {
        property,
        tenant: tenantIri,
        viewingDate: '2026-05-01',
        currentStage: await rentalStageIri(request, 'application'),
      },
    });
    expect(created.ok(), await created.text()).toBeTruthy();
    const rentalIri = (await created.json())['iri'] as string;

    // ── The binding: the rental names the owner's property ──────────────────
    const read = await request.get(`/api/entities/rentals?iri=${encode(rentalIri)}`, {
      headers: queryAspect(RENTAL_QUERY_ASPECT),
    });
    expect(read.ok()).toBeTruthy();
    expect(
      (await read.json())['property'],
      'a rental that names no owned property is reachable by nobody',
    ).toBe(property);

    // ── The gate: another agent reaches neither the record nor a way to change it ──
    const stranger = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: asAgent(AGENT_B),
    });
    try {
      const strangerRow = await stranger.get(`/api/entities/rentals?iri=${encode(rentalIri)}`, {
        headers: queryAspect(RENTAL_QUERY_ASPECT),
      });
      expect(strangerRow.status(), 'a rental is not readable by a landlord it does not name').toBe(422);

      const strangerList = await stranger.post('/api/entities/rentals/query', {
        headers: queryAspect(RENTAL_QUERY_ASPECT),
        data: { count: 'none' },
      });
      const strangerIris = ((await strangerList.json()).items as Record<string, unknown>[]).map(
        (row) => row['iri'],
      );
      expect(strangerIris, 'the list is gated by the same rule as the point read').not.toContain(rentalIri);

      const strangerWrite = await stranger.put(`/api/entities/rentals?iri=${encode(rentalIri)}`, {
        headers: operationAspect(RENTAL_APPLICATION_OPERATION_ASPECT),
        data: { viewingDate: '2026-06-01' },
      });
      expect(strangerWrite.status(), 'a rental is not writable by a landlord it does not name').toBe(422);
    } finally {
      await stranger.dispose();
    }

    // The refused write changed nothing — the gate rejected it before any stage applied.
    const after = await request.get(`/api/entities/rentals?iri=${encode(rentalIri)}`, {
      headers: queryAspect(RENTAL_QUERY_ASPECT),
    });
    expect((await after.json())['viewingDate']).toBe('2026-05-01');
  });
});

test.describe('the rental Application stage offers only the caller its own properties', () => {
  test.use({ extraHTTPHeaders: asAgent(AGENT_A) });

  test("a stranger's property is never offered in the property picker", async ({ page, browser }) => {
    const ownedName = unique('Offered Property');
    await createProperty(page, ownedName);

    // A property owned by ANOTHER landlord, created by that landlord in a browser of its own.
    const strangerName = unique('Unlisted Property');
    const strangerContext = await browser.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: asAgent(AGENT_B),
    });
    try {
      await createProperty(await strangerContext.newPage(), strangerName);
    } finally {
      await strangerContext.close();
    }

    await page.goto('/rentals');
    await settle(page, 'app-rentals');
    await page.getByRole('button', { name: 'Add Rental' }).first().click();

    // The option load carries the property query aspect, so the dropdown asks the GATED
    // collection: the caller's own property is offered, the stranger's never is.
    const select = page.locator('[data-field="property"] select');
    await expect(select).toBeVisible();
    await expect(select.locator('option', { hasText: ownedName })).toHaveCount(1);
    await expect(select.locator('option', { hasText: strangerName })).toHaveCount(0);
  });
});
