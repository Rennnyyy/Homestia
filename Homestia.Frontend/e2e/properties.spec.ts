import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

/**
 * The property lifecycle through the UI: edit, delete, and the links that open a record directly.
 *
 * Records are created through the API so each test owns its fixture and the driving stays about the
 * behaviour under test. The assertions read the RECORD back — the page can only say a row appeared,
 * and a write that the server's aspect filter drops still answers 200.
 */

const PROPERTY_TYPE = 'https://homestia.katharsis.digital/property-types/apartment';

/**
 * A name no earlier run can own. The store is one per host and the whole suite shares it, so a
 * fixed name makes a test pass or fail depending on what ran before it — the second run would find
 * the first run's record and assert against that.
 */
function unique(base: string): string {
  return `${base} ${Date.now().toString(36)}`;
}

async function settle(page: Page, ready: string): Promise<void> {
  await expect(page.locator(ready)).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

async function createProperty(
  request: APIRequestContext,
  name: string,
  address: string,
): Promise<string> {
  const response = await request.post('/api/entities/properties', {
    data: { name, address, isCommonArea: false, propertyType: PROPERTY_TYPE },
  });
  expect(response.ok(), `creating ${name}`).toBeTruthy();
  return ((await response.json()) as { iri: string }).iri;
}

async function readProperty(
  request: APIRequestContext,
  name: string,
): Promise<Record<string, unknown> | undefined> {
  const response = await request.post('/api/entities/properties/query', {
    data: { count: 'none' },
  });
  const rows = ((await response.json()) as { items: Record<string, unknown>[] }).items;
  return rows.find((row) => row['name'] === name);
}

test.describe('editing a property', () => {
  test('a change made in the form is what the record keeps', async ({ page, request }) => {
    const before = unique('Edit Me');
    const after = unique('Edited Once');
    await createProperty(request, before, 'Alte Straße 1');

    await page.goto('/properties');
    await settle(page, 'app-properties');
    await page.locator('tr', { hasText: before }).click();

    const propertyForm = page.locator('aletheia-entity-form:visible').first();
    const address = propertyForm.locator('[data-field="address"] input');
    await expect(address).toHaveValue('Alte Straße 1');

    await address.fill('Neue Straße 2');
    await propertyForm.locator('[data-field="name"] input').fill(after);
    await page.getByRole('button', { name: 'Save Property' }).click();
    await expect(page.locator('aletheia-entity-table tbody')).toContainText(after);

    // The record, not the row: the row only proves the list refreshed.
    const edited = await readProperty(request, after);
    expect(edited, 'the rename reached the record').toBeTruthy();
    expect(edited!['address']).toBe('Neue Straße 2');
    expect(await readProperty(request, before), 'the old name is gone').toBeUndefined();
  });

  test('a reference the form shows is the reference the record keeps', async ({ page, request }) => {
    // The select is a controlled input whose options arrive asynchronously — a value it holds but
    // cannot display is the defect this covers, so the assertion is on the record AND on the view.
    const name = unique('Ref Property');
    const iri = await createProperty(request, name, 'Refweg 3');

    await page.goto(`/properties?mode=edit&iri=${encodeURIComponent(iri)}`);
    await settle(page, 'app-properties');

    const select = page.locator('[data-field="propertyType"] select:visible').first();
    await expect(select).toHaveValue(PROPERTY_TYPE);
    await expect(select.locator('option:checked')).toHaveText('Apartment');

    const record = await readProperty(request, name);
    expect(record!['propertyType']).toBe(PROPERTY_TYPE);
  });
});

test.describe('the personal assistent in edit mode', () => {
  /**
   * The AI fill itself needs a model endpoint this suite does not run, so what is reachable is the
   * mechanism: the assistant is offered on an EXISTING property too, and opens on THAT property (the
   * wizard is handed the open record as its draft). The scenario contract is proven server-side.
   */
  test('an existing property offers the assistant when it is open', async ({ page, request }) => {
    const name = unique('Assistant Property');
    const iri = await createProperty(request, name, 'Assistweg 6');

    await page.goto('/properties');
    await settle(page, 'app-properties');
    // List mode offers it as well — this is the same button, one screen later.
    await expect(page.getByRole('button', { name: 'Personal Assistent' }).first()).toBeVisible();

    await page.locator('tr', { hasText: name }).first().click();
    await expect(page.locator('aletheia-entity-form:visible').first()).toBeVisible();

    await page.getByRole('button', { name: 'Personal Assistent' }).first().click();
    const card = page.locator('app-ai-assistant-wizard .ai-card');
    await expect(card).toBeVisible();
    await expect(card.locator('textarea.ai-composer-input')).toHaveAttribute(
      'placeholder',
      /Describe the property/,
    );
    await card.getByRole('button', { name: 'Close' }).first().click();
    await expect(page.locator('app-ai-assistant-wizard')).toHaveCount(0);

    // Opening it did not disturb the record being edited.
    const record = await readProperty(request, name);
    expect(record!['address']).toBe('Assistweg 6');
    expect(iri).toBeTruthy();
  });
});

test.describe('deleting a property', () => {
  test('the row disappears and so does the record', async ({ page, request }) => {
    const name = unique('Delete Me');
    await createProperty(request, name, 'Wegwerfweg 4');

    await page.goto('/properties');
    await settle(page, 'app-properties');
    // A row's action cell carries the verb more than once (a labelled control and its icon form),
    // so the first is named; the dialog's own button is a separate, scoped locator below.
    await page
      .locator('tr', { hasText: name })
      .getByRole('button', { name: 'Delete' })
      .first()
      .click();

    // The dialog's host element is `display: inline` and its only child is `position: fixed`, so
    // the HOST has a zero-sized box and `:visible` never matches it. The overlay the reader sees is
    // that fixed child — assert on it, and confirm through it.
    const overlay = page.locator('aletheia-confirm-dialog div.fixed.inset-0').first();
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Delete Property');
    await overlay.getByRole('button', { name: 'Delete' }).click();

    await expect(page.locator('aletheia-entity-table tbody')).not.toContainText(name);
    expect(await readProperty(request, name), 'the record is gone').toBeUndefined();
  });
});

test.describe('links into a record', () => {
  test('mode=edit&iri opens that record, and a create link opens the empty form', async ({
    page,
    request,
  }) => {
    const name = unique('Linked Property');
    const iri = await createProperty(request, name, 'Linkweg 5');

    await page.goto(`/properties?mode=edit&iri=${encodeURIComponent(iri)}`);
    await settle(page, 'app-properties');
    await expect(page.locator('[data-field="name"] input:visible')).toHaveValue(name);
    await expect(page.locator('[data-field="address"] input:visible')).toHaveValue('Linkweg 5');

    await page.goto('/properties?mode=create');
    await settle(page, 'app-properties');
    const nameField = page.locator('[data-field="name"] input:visible');
    await expect(nameField).toBeVisible();
    await expect(nameField).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Save Property' })).toBeVisible();
  });
});

test.describe('rooms of a property', () => {
  test('a room removed in the form no longer belongs to the property', async ({ page, request }) => {
    const name = unique('Room Host');
    const roomName = unique('Flur');
    const iri = await createProperty(request, name, 'Zimmerweg 6');
    const room = await request.post('/api/entities/rooms', {
      data: { name: roomName, location: 'EG', roomSize: 8, isPartOf: iri },
    });
    expect(room.ok(), 'the room was created').toBeTruthy();

    const roomsOf = async () => {
      const response = await request.post('/api/entities/rooms/query', {
        data: { where: { pred: 'isPartOf', op: 'eq', value: iri }, count: 'none' },
      });
      return ((await response.json()) as { items: Record<string, unknown>[] }).items;
    };
    expect((await roomsOf()).map((row) => row['name'])).toEqual([roomName]);

    await page.goto(`/properties?mode=edit&iri=${encodeURIComponent(iri)}`);
    await settle(page, 'app-properties');
    // The room's form is the last visible one — the property's occupies first place — and its name
    // lives in an input VALUE, which is text a `hasText` filter cannot see.
    const roomField = page.locator('[data-field="name"] input:visible').last();
    await expect(roomField).toHaveValue(roomName);

    await page.getByRole('button', { name: 'Remove room' }).click();
    await page.getByRole('button', { name: 'Save Property' }).click();
    await expect(page.locator('aletheia-entity-table tbody')).toContainText(name);

    // The room is no longer one of the property's rooms — whether the write deletes the record or
    // detaches it is the sync service's contract, and the property is what this page owns.
    expect(await roomsOf(), 'the room left the property').toEqual([]);
  });
});
