import { expect, test, type Page } from '@playwright/test';

/**
 * The German dictionary reaches the PAGES, not only the chrome.
 *
 * The SDK's components ship no translations: they ask for keys in this app's bundle and carry an
 * English fallback. So a key nobody added does not blank the page and does not throw — it quietly
 * reads English in the middle of a German screen. Nothing else in the suite would notice: the page
 * paints, the console stays quiet, and the change that caused it is a key absent from both bundles,
 * which is a thing no diff shows.
 *
 * The lists are therefore asserted by the words a reader sees. The column headers are the sharp
 * edge: they come from a reference column the SDK holds no label for, which is exactly where they
 * were English while everything around them was German.
 */

async function settle(page: Page, ready: string): Promise<void> {
  await expect(page.locator(ready)).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

/** A translation key printed as itself: a namespace, a dot, and the rest of the key. */
const RAW_KEY =
  /(?:nav|table|common|mode|entity|entities|entityForm|entityRefSelect|objectUpload|fields|shape|rentals)\.[a-zA-Z]/;

test.describe('the German dictionary', () => {
  test('names the rentals table in German — columns and furniture alike', async ({ page }) => {
    await page.goto('/rentals');
    await settle(page, 'app-rentals');
    await page.getByRole('button', { name: /^(EN|DE)$/ }).click();

    const table = page.locator('aletheia-entity-table');
    for (const column of ['Mieter', 'Mietdokumente', 'Objekt', 'Aktuelle Phase']) {
      await expect(table.getByRole('columnheader', { name: column })).toBeVisible();
    }
    await expect(table.getByRole('button', { name: 'Aktualisieren' })).toBeVisible();

    await expect(page.locator('main')).not.toContainText(RAW_KEY);

    // Leave the language as the rest of the suite expects it.
    await page.getByRole('button', { name: /^(EN|DE)$/ }).click();
  });

  test('names the properties table in German', async ({ page }) => {
    await page.goto('/properties');
    await settle(page, 'app-properties');
    await page.getByRole('button', { name: /^(EN|DE)$/ }).click();

    const table = page.locator('aletheia-entity-table');
    await expect(table.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Adresse' })).toBeVisible();

    await expect(page.locator('main')).not.toContainText(RAW_KEY);

    await page.getByRole('button', { name: /^(EN|DE)$/ }).click();
  });
});
