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

  test('a tenant created from the application stage is the one the rental keeps', async ({
    page,
    request,
  }) => {
    // The stage's tenant field offers an inline "New Tenant": the reader creates the tenant from the
    // very view that assigns it, through the tenant operation, and the new record becomes the pick.
    const propertyIri = await aProperty(request, unique('Quick Property'));
    const tenantName = unique('Quick Tenant');

    await page.goto('/rentals');
    await settle(page, 'app-rentals');
    await page.getByRole('button', { name: 'Add Rental' }).first().click();

    // The create affordance BESIDE the selection is geometry, not a screenshot: it shares the tenant
    // field's row — the control a reader reaches while choosing the tenant, not somewhere else.
    const tenantSelect = page.locator('select#rental-tenant');
    const newTenant = page.getByRole('button', { name: 'New Tenant' });
    await expect(newTenant).toBeVisible();
    const selectBox = (await tenantSelect.boundingBox())!;
    const buttonBox = (await newTenant.boundingBox())!;
    expect(Math.abs(buttonBox.y - selectBox.y)).toBeLessThan(selectBox.height);

    await page.selectOption('select#rental-property', propertyIri);
    await newTenant.click();

    // The inline form is the SAME entity form every stage uses, validating against the tenant view
    // before anything is written.
    await page.fill('input#tenant-displayName', tenantName);
    await page.fill('input#tenant-email', 'quick@test.local');
    await page.getByRole('button', { name: 'Create Tenant' }).click();

    // The tenant was created through the operation route. The write is async, so poll the route the
    // page reads rather than racing the click — the IRI is discovered where the record lives.
    let tenantIri = '';
    await expect
      .poll(async () => {
        const listed = await request.post('/api/entities/tenants/query', { data: { count: 'none' } });
        const rows = ((await listed.json()) as { items: Record<string, unknown>[] }).items;
        tenantIri = (rows.find((row) => row['displayName'] === tenantName)?.['iri'] as string) ?? '';
        return tenantIri;
      })
      .not.toBe('');

    // The created tenant is now the SELECTION — the reader sees which tenant the rental will use.
    await expect(tenantSelect).toHaveValue(tenantIri);

    await page.fill('input#rental-viewingDate', '2026-10-01');
    await page.getByRole('button', { name: 'Save & Continue' }).click();

    // The stage advanced, so the write round-tripped — the save is async, read the record after it.
    await expect(page.getByRole('button', { name: /Contract \(Current\)/ })).toBeVisible();

    // The RECORD is the proof: the rental carries the tenant the reader created here, not a fixture.
    const rental = await readRental(request, tenantIri);
    expect(rental, 'the rental was persisted with the inline-created tenant').toBeTruthy();
    expect(rental!['tenant']).toBe(tenantIri);
    expect(rental!['property']).toBe(propertyIri);
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

test.describe('a stage after the first', () => {
  test('the values typed into the open stage are the ones the record keeps', async ({
    page,
    request,
  }) => {
    // Every unlocked stage renders its own form, and the page reads the draft back from ONE of
    // them before it writes. Reading the wrong one is invisible on screen — the input keeps the
    // value the reader picked — and surfaces only as a shape complaint about a field the reader
    // can see filled (`sh:minLength 1` on an empty string, while `sh:minCount 1` passes).
    const propertyName = unique('Stage Property');
    const propertyIri = await aProperty(request, propertyName);
    const tenantName = unique('Stage Tenant');
    const tenantIri = await aTenant(request, tenantName);

    // The fixture stands AT the deposit stage: the page replays its progress from `currentStage`,
    // so application and contract are already done and the deposit form is the open one.
    const created = await request.post('/api/entities/rentals', {
      data: {
        property: propertyIri,
        tenant: tenantIri,
        viewingDate: '2026-10-01',
        currentStage: 'https://homestia.katharsis.digital/rental-stages/deposit',
      },
    });
    expect(created.ok(), 'the rental fixture was created').toBeTruthy();

    await page.goto('/rentals');
    await settle(page, 'app-rentals');
    await page.locator('tr', { hasText: tenantName }).first().getByRole('button', { name: 'Edit' }).click();

    const deposit = page.locator('hlm-accordion-item', {
      has: page.locator('[data-field="depositPaymentDate"]'),
    });
    const date = deposit.locator('[data-field="depositPaymentDate"] input');
    await expect(date).toBeVisible();
    await deposit.locator('[data-field="depositAmount"] input').fill('500');
    await date.fill('2026-10-02');

    await deposit.getByRole('button', { name: 'Save & Continue' }).click();

    // The page agrees the stage passed...
    await expect(page.getByRole('button', { name: /Deposit \(Done\)/ })).toBeVisible();

    // ...and the RECORD is the proof: the stage cannot be persisted without its date, so a record
    // that stands past it must carry the date the reader chose.
    const rental = await readRental(request, tenantIri);
    expect(rental!['depositPaymentDate']).toBe('2026-10-02');
    expect(rental!['depositAmount']).toBe(500);
  });
});

test.describe('the personal assistent', () => {
  /**
   * The AI fill itself needs a model endpoint (`AI:ModelRoles:*:ApiKey` plus the model host) that
   * this suite does not run, so what is reachable here is the mechanism around it: ONE reused wizard,
   * offered on the rentals main page and inside the stepper, worded for the domain AND the stage.
   * The scenario-per-stage contract is proven by `AiScenariosTests` (server side) and the panel's own
   * spec (client side).
   */
  test('the assistant starts a rental from the list, then follows the open stage', async ({ page }) => {
    await page.goto('/rentals');
    await settle(page, 'app-rentals');

    // It stands on the main page, beside "Add Rental".
    await expect(page.getByRole('button', { name: 'Personal Assistent' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Personal Assistent' }).first().click();

    // The wizard is a fixed-position overlay, so its HOST element has no box of
    // its own — visibility is asserted on the card it renders.
    const wizard = page.locator('app-ai-assistant-wizard');
    const card = wizard.locator('.ai-card');
    const composer = card.locator('textarea.ai-composer-input');
    await expect(card).toBeVisible();
    // No stage is open yet, so it starts one and invites THAT stage's fact — not a generic sentence.
    await expect(composer).toHaveAttribute('placeholder', /Describe the application/);

    await card.getByRole('button', { name: 'Close' }).first().click();
    await expect(wizard).toHaveCount(0);

    // Closing leaves the reader in the stepper, where the same button now fills the open stage.
    await expect(page.getByRole('button', { name: /Application \(Current\)/ })).toBeVisible();
    await page.getByRole('button', { name: 'Personal Assistent' }).first().click();
    await expect(card).toBeVisible();
    await expect(composer).toHaveAttribute('placeholder', /Describe the application/);
  });

  test('the assistant is offered on every stage, including the upload-only one', async ({
    page,
    request,
  }) => {
    const propertyIri = await aProperty(request, unique('Assistant Property'));
    const tenantName = unique('Assistant Tenant');
    const tenantIri = await aTenant(request, tenantName);

    // A rental standing AT the contract stage: the page replays progress from `currentStage`, so
    // contract is the open one.
    const created = await request.post('/api/entities/rentals', {
      data: {
        property: propertyIri,
        tenant: tenantIri,
        viewingDate: '2026-10-01',
        currentStage: 'https://homestia.katharsis.digital/rental-stages/contract',
      },
    });
    expect(created.ok(), 'the rental fixture was created').toBeTruthy();

    await page.goto('/rentals');
    await settle(page, 'app-rentals');
    await page.locator('tr', { hasText: tenantName }).first().getByRole('button', { name: 'Edit' }).click();

    await expect(page.getByRole('button', { name: /Contract \(Current\)/ })).toBeVisible();

    // Offered even here — the assistant is also a place to ASK. It has no field to fill on this
    // stage (its only field is the uploaded document), and the stage's own wording says so.
    await page.getByRole('button', { name: 'Personal Assistent' }).first().click();
    const card = page.locator('app-ai-assistant-wizard .ai-card');
    await expect(card).toBeVisible();
    await expect(card.locator('textarea.ai-composer-input')).toHaveAttribute(
      'placeholder',
      /Ask me anything about this stage/,
    );
  });
});
