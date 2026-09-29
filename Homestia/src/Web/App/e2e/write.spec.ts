import { expect, test, type Page } from '@playwright/test';

/**
 * The write path, end to end — through the UI, and then through the API.
 *
 * A save selects the operation aspect that governs it, and the server keeps only
 * the fields that aspect names. A field the shape does not mention is dropped
 * **silently**: the save answers 200, the page navigates back to the list, and
 * nothing says a room lost its size. So the UI assertion (the row appears) is not
 * the proof — the proof is reading the record back and finding every field the
 * form showed.
 *
 * The test needs a host with an EMPTY in-memory store, like the baselines: it
 * writes its own records, and a second run of the same name would leave two.
 *
 * Run last: `smoke.spec.ts` compares pixel baselines and comes first
 * alphabetically, so the rows this creates are never in a baseline.
 */

async function settle(page: Page, ready: string): Promise<void> {
  await expect(page.locator(ready)).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

test.describe('creating a property with a room', () => {
  /**
   * Opens the create flow and returns the property's own form.
   *
   * Two things make the driving deliberate rather than incidental. The create flow is a desktop
   * accordion that is already open on arrival in some runs and shut in others, so the button is
   * only clicked when it is needed. And `address` exists on the property form alone — the room's
   * form reuses the same `data-field` names — so waiting for it anchors every later locator to the
   * right form instead of to whichever one change detection rendered last.
   */
  async function openCreateForm(page: Page) {
    await page.goto('/properties');
    await settle(page, 'app-properties');

    const address = page.locator('aletheia-entity-form:visible [data-field="address"] input').first();
    if ((await address.count()) === 0) {
      await page.getByRole('button', { name: 'Add Property' }).click();
    }
    await expect(address).toBeVisible();
    return page.locator('aletheia-entity-form:visible').first();
  }

  /** Adds a room and returns ITS form — the property's is the one before it. */
  async function addRoom(page: Page, name: string, location: string, size: string) {
    await page.getByRole('button', { name: 'Add Room' }).click();
    const roomForm = page.locator('aletheia-entity-form:visible').last();
    await expect(roomForm.locator('[data-field="roomSize"] input')).toBeVisible();
    await roomForm.locator('[data-field="name"] input').fill(name);
    await roomForm.locator('[data-field="location"] input').fill(location);
    await roomForm.locator('[data-field="roomSize"] input').fill(size);
    return roomForm;
  }

  test('persists every field the form showed, on both sides of the aggregate', async ({
    page,
    request,
  }) => {
    const propertyForm = await openCreateForm(page);
    await propertyForm.locator('[data-field="name"] input').fill('Villa E2E');
    await propertyForm.locator('[data-field="address"] input').fill('Main Straße 1');
    // The view requires a property type (an IRI reference), so one must be chosen
    // for the save to be allowed at all. Option 0 is the empty "-- Select --".
    await propertyForm.locator('[data-field="propertyType"] select').selectOption({ index: 1 });

    // A room is written by the SAME save, under the same aspect — the aggregate
    // the shape has to admit in both halves.
    await addRoom(page, 'Küche', 'Nord', '42');

    await page.getByRole('button', { name: 'Save Property' }).click();

    // The page returns to the list with the new property in it.
    await expect(page.locator('aletheia-entity-table tbody')).toContainText('Villa E2E');

    // ── The real assertion: read back what the server kept ──────────────────
    const properties = await request.post('/api/entities/properties/query', {
      data: { count: 'none' },
    });
    expect(properties.ok()).toBeTruthy();
    const propertyRows = (await properties.json()).items as Record<string, unknown>[];
    const property = propertyRows.find((row) => row['name'] === 'Villa E2E');
    expect(property, 'the property was persisted').toBeTruthy();
    expect(property!['address']).toBe('Main Straße 1');

    const rooms = await request.post('/api/entities/rooms/query', { data: { count: 'none' } });
    const roomRows = (await rooms.json()).items as Record<string, unknown>[];
    const room = roomRows.find((row) => row['name'] === 'Küche');
    expect(room, 'the room was persisted').toBeTruthy();

    // Every one of these is a field the write filter could have dropped without
    // saying a word: the room's `location` is a data property, and `isPartOf` is
    // the link the save injects.
    expect(room!['location']).toBe('Nord');
    expect(room!['isPartOf']).toBe(property!['iri']);
  });

  /**
   * The size a reader types for a room survives the round trip.
   *
   * It did not, and the loss was invisible from the outside: the save succeeded, the room appeared,
   * and only its size was missing. A room size is `Nullable<Decimal>` in C#, which the form did not
   * recognise as a number — the field fell through to a text control, and a string where the shape
   * declares a decimal made the room's whole write fail. Read from the record, not from the form:
   * the form is the thing that was wrong.
   */
  test('keeps the room size the user typed', async ({ page, request }) => {
    const propertyForm = await openCreateForm(page);
    await propertyForm.locator('[data-field="name"] input').fill('Villa Size');
    await propertyForm.locator('[data-field="address"] input').fill('Main 2');
    await propertyForm.locator('[data-field="propertyType"] select').selectOption({ index: 1 });

    // Typed, not set: the field must accept keystrokes as a number input does.
    await addRoom(page, 'Bad', 'Nord', '42');

    await page.getByRole('button', { name: 'Save Property' }).click();
    await expect(page.locator('aletheia-entity-table tbody')).toContainText('Villa Size');

    const rooms = await request.post('/api/entities/rooms/query', { data: { count: 'none' } });
    const room = ((await rooms.json()).items as Record<string, unknown>[]).find(
      (row) => row['name'] === 'Bad',
    );
    expect(room, 'the room was persisted').toBeTruthy();
    expect(room!['roomSize']).toBe(42);
  });
});
