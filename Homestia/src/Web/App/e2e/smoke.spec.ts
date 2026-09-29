import { expect, test, type Page } from '@playwright/test';

/**
 * Homestia smoke + visual baseline.
 *
 * One test per route. Each waits until the page has actually settled (route
 * component mounted, dictionary and model loaded, fonts ready) and then compares
 * the viewport against a committed baseline. The baselines are the visual half of
 * "the migration changed the code, not the look".
 *
 * Prerequisite (the host serves both the facade and the API):
 *   dotnet run --project src/Program --no-launch-profile --urls http://localhost:5080
 *
 * First run has no baselines yet — create them with:
 *   npm run test:e2e:update
 */
async function settle(page: Page, ready: string): Promise<void> {
  await expect(page.locator(ready)).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Rows come from the (in-memory) backend and therefore differ per host start —
 * masking the table body keeps the baseline about the LOOK (chrome, typography,
 * spacing, colours) instead of about today's data.
 */
const VOLATILE_ROWS = 'aletheia-entity-table tbody';

test.describe('Homestia routes', () => {
  test('home renders', async ({ page }) => {
    await page.goto('/');
    await settle(page, 'app-root');
    await expect(page).toHaveScreenshot('home.png');
  });

  test('properties render', async ({ page }) => {
    await page.goto('/properties');
    await settle(page, 'app-properties');
    await expect(page).toHaveScreenshot('properties.png', {
      mask: [page.locator(VOLATILE_ROWS)],
    });
  });

  test('rentals render', async ({ page }) => {
    await page.goto('/rentals');
    await settle(page, 'app-rentals');
    await expect(page).toHaveScreenshot('rentals.png', {
      mask: [page.locator(VOLATILE_ROWS)],
    });
  });
});
