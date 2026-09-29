import { expect, test, type Page } from '@playwright/test';

/**
 * The chrome and the routes — the frame every page renders inside.
 *
 * Three of these behaviours have no other guard. The language switch and the accent cycler write to
 * `localStorage` and to the document element, which no unit test can vouch for end to end; the
 * unknown-route redirect is a router fact; and the header contract is where the accent cycler lives
 * now, so it is asserted as geometry rather than photographed (see the e2e instruction file).
 */

async function settle(page: Page, ready: string): Promise<void> {
  await expect(page.locator(ready)).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

test.describe('routes', () => {
  test('the rail reaches every page and nothing else', async ({ page }) => {
    await page.goto('/');
    await settle(page, 'app-home');

    await page.getByRole('link', { name: 'Properties' }).click();
    await expect(page).toHaveURL(/\/properties$/);
    await settle(page, 'app-properties');

    await page.getByRole('link', { name: 'Rentals' }).click();
    await expect(page).toHaveURL(/\/rentals$/);
    await settle(page, 'app-rentals');

    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL(/\/$/);
    await settle(page, 'app-home');
  });

  test('an unknown path lands on the home page', async ({ page }) => {
    await page.goto('/no/such/page');
    await settle(page, 'app-home');
    await expect(page).toHaveURL(/\/$/);
  });

  test('the home page shows its copy, not the keys behind it', async ({ page }) => {
    // A missing translation renders as its own key in the middle of the sentence, and nothing else
    // in the suite would say so: the page still paints, the console stays quiet.
    await page.goto('/');
    await settle(page, 'app-home');

    await expect(page.getByRole('heading', { level: 2, name: 'Home' })).toBeVisible();
    const main = page.locator('main');
    await expect(main).not.toContainText('app.description');
    await expect(main).not.toContainText('nav.home');
    await expect(main).toContainText(/platform/i);
  });
});

test.describe('chrome', () => {
  test('the language switch flips the dictionary, the document and the choice', async ({ page }) => {
    await page.goto('/');
    await settle(page, 'app-home');

    const switcher = page.getByRole('button', { name: /^(EN|DE)$/ });
    await expect(switcher).toHaveText('EN');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('link', { name: 'Properties' })).toBeVisible();

    await switcher.click();

    // The dictionary followed…
    await expect(switcher).toHaveText('DE');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByRole('link', { name: 'Immobilien' })).toBeVisible();

    // The choice survives navigation — it is a choice, not a page state.
    await page.getByRole('link', { name: 'Mietverhältnisse' }).click();
    await settle(page, 'app-rentals');
    await expect(page.getByRole('button', { name: /^(EN|DE)$/ })).toHaveText('DE');

    // Leave the language as the rest of the suite expects it.
    await page.getByRole('button', { name: /^(EN|DE)$/ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('the mode toggle flips the document class and survives a reload', async ({ page }) => {
    await page.goto('/properties');
    await settle(page, 'app-properties');

    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    const toggle = page.locator('header button[aria-pressed]');
    await toggle.click();
    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await settle(page, 'app-properties');
    await expect(html).toHaveClass(/dark/);

    // Back to where it started, so a baseline later in the run is not taken in a dark app.
    await page.locator('header button[aria-pressed]').click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test('the accent cycler moves the accent and the header holds it', async ({ page }) => {
    await page.goto('/properties');
    await settle(page, 'app-properties');

    const html = page.locator('html');
    const first = await html.getAttribute('data-theme');
    expect(first).toBeTruthy();

    await page.locator('app-theme-picker button').last().click();
    await expect(html).not.toHaveAttribute('data-theme', first!);

    // The cycler wraps both ways, so the other chevron returns to where it started.
    await page.locator('app-theme-picker button').first().click();
    await expect(html).toHaveAttribute('data-theme', first!);

    // The chrome lives in the header band, and the rail holds none of its own — geometry, because
    // the pixel comparison tolerates a control this small moving between the two.
    const picker = page.locator('app-theme-picker');
    const header = (await page.locator('header').boundingBox())!;
    const box = (await picker.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(header.y);
    expect(box.y + box.height).toBeLessThanOrEqual(header.y + header.height);
    expect(await page.locator('aside app-theme-picker').count()).toBe(0);
  });
});
