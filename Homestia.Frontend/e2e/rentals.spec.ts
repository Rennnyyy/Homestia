import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * The rental lifecycle: a stage wizard whose stages unlock one at a time.
 *
 * The gating is the interesting part and it is deterministic, unlike anything that needs an AI
 * endpoint: the create flow opens the Application stage and holds the other seven locked with a
 * sentence, and a stage only opens once the one before it conforms. Both halves are asserted — the
 * locks on screen, and the fields the save actually kept in the record.
 */

const PROPERTY_TYPE = 'https://homestia.katharsis.digital/property-types/apartment';

/** A name no earlier run can own — the store is shared by the whole suite. */
function unique(base: string): string {
  return `${base} ${Date.now().toString(36)}`;
}

async function settle(page: Page, ready: string): Promise<void> {
  await expect(page.locator(ready)).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

async function aProperty(request: APIRequestContext, name: string): Promise<string> {
  const response = await request.post('/api/entities/properties', {
    data: { name, address: 'Mietweg 1', isCommonArea: false, propertyType: PROPERTY_TYPE },
  });
  expect(response.ok(), 'the property fixture was created').toBeTruthy();
  return ((await response.json()) as { iri: string }).iri;
}

async function aTenant(request: APIRequestContext, name: string): Promise<string> {
  // `tenants` is the OPERATION route, and it is what the app reads. A POST to `agents` — the type
  // path this entity's IRIs live under — succeeds and creates an Agent that no tenant-shaped read
  // ever lists: the URL is the contract, and the two are not interchangeable.
  const response = await request.post('/api/entities/tenants', {
    data: { displayName: name, email: 'e2e@test.local' },
  });
  expect(response.ok(), 'the tenant fixture was created').toBeTruthy();
  const iri = ((await response.json()) as { iri: string }).iri;

  // A fixture that the page cannot see is worse than no fixture: prove it is readable where the
  // page reads, or the test fails later for a reason that looks nothing like the cause.
  const listed = await request.post('/api/entities/tenants/query', { data: { count: 'none' } });
  const names = ((await listed.json()) as { items: Record<string, unknown>[] }).items.map(
    (row) => row['iri'],
  );
  expect(names, 'the tenant fixture is on the route the page reads').toContain(iri);
  return iri;
}

async function readRental(
  request: APIRequestContext,
  tenantIri: string,
): Promise<Record<string, unknown> | undefined> {
  const response = await request.post('/api/entities/rentals/query', { data: { count: 'none' } });
  const rows = ((await response.json()) as { items: Record<string, unknown>[] }).items;
  return rows.find((row) => row['tenant'] === tenantIri);
}

test.describe('creating a rental', () => {
  test('the application stage takes what the shape asks for, and unlocks the next', async ({
    page,
    request,
  }) => {
    const propertyName = unique('Rental Property');
    const propertyIri = await aProperty(request, propertyName);
    const tenantName = unique('Rental Tenant');
    const tenantIri = await aTenant(request, tenantName);

    await page.goto('/rentals');
    await settle(page, 'app-rentals');
    await page.getByRole('button', { name: 'Add Rental' }).first().click();

    // Every stage but the first is locked, and says so in words a reader can act on.
    await expect(page.getByRole('button', { name: /Application \(Current\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Contract \(Locked\)/ })).toBeVisible();
    await expect(page.getByText('Complete the previous stage to unlock this one.').first()).toBeVisible();

    await page.selectOption('select#rental-property', propertyIri);
    // The reference dropdowns load their options from their own entity route, so the option a test
    // needs may not exist yet — selecting waits for it to.
    const tenantSelect = page.locator('select#rental-tenant');
    await expect(tenantSelect.locator(`option[value="${tenantIri}"]`)).toHaveCount(1);
    await tenantSelect.selectOption(tenantIri);
    await page.fill('input#rental-viewingDate', '2026-10-01');

    await page.getByRole('button', { name: 'Save & Continue' }).click();

    // The next stage opened: the gate is the flow's own contract, and it moved.
    await expect(page.getByRole('button', { name: /Contract \(Current\)/ })).toBeVisible();

    // And the record kept every field the stage form showed.
    const rental = await readRental(request, tenantIri);
    expect(rental, 'the rental was persisted').toBeTruthy();
    expect(rental!['property']).toBe(propertyIri);
    expect(rental!['tenant']).toBe(tenantIri);
    expect(rental!['viewingDate']).toBe('2026-10-01');
  });

  test('the list names each rental\'s parties and the stage it stands on', async ({ page, request }) => {
    // The fixture is built through the API: this test is about the LIST, and driving the wizard again
    // would only repeat the test above.
    const propertyName = unique('List Property');
    const propertyIri = await aProperty(request, propertyName);
    const tenantName = unique('List Tenant');
    const tenantIri = await aTenant(request, tenantName);

    const created = await request.post('/api/entities/rentals', {
      data: {
        property: propertyIri,
        tenant: tenantIri,
        viewingDate: '2026-10-04',
        currentStage: 'https://homestia.katharsis.digital/rental-stages/contract',
      },
    });
    expect(created.ok(), 'the rental fixture was created').toBeTruthy();

    await page.goto('/rentals');
    await settle(page, 'app-rentals');

    // Every rental the store holds is on screen, grouped by the state the record implies.
    const stored = await request.post('/api/entities/rentals/query', { data: { count: 'none' } });
    const total = ((await stored.json()) as { items: unknown[] }).items.length;
    const group = page.locator('tr', { hasText: /\(\d+\)/ }).first();
    await expect(group).toContainText(`(${total})`);

    // A row NAMES its tenant, its property and its stage. The table shows a reference it cannot
    // resolve as its last path segment — a bare identifier, and a list of them identifies nothing —
    // so the row type names them.
    const row = page.locator('tr', { hasText: tenantName }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(propertyName);
    await expect(row).toContainText('Contract');
  });
});
