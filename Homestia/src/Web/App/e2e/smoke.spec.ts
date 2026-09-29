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

  /**
   * Chrome lives in the header, and a screenshot cannot say so: the accent cycler is three small
   * controls, so moving it between the header and the rail footer changes well under the 1% pixel
   * ratio the visual comparison allows — the baselines accepted that move. Geometry does not have a
   * tolerance: the control is in the header band, and the rail holds no chrome of its own.
   */
  test('the header carries the chrome, not the rail', async ({ page }) => {
    await page.goto('/properties');
    await settle(page, 'app-properties');

    const picker = page.locator('app-theme-picker');
    await expect(picker).toBeVisible();

    const header = (await page.locator('header').boundingBox())!;
    const box = (await picker.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(header.y);
    expect(box.y + box.height).toBeLessThanOrEqual(header.y + header.height);

    expect(await page.locator('aside app-theme-picker').count()).toBe(0);
  });
});

/**
 * The phone chrome. The rail is off-canvas there, so its chrome must stay
 * inside the panel: content that overflows the drawer's own box is visible even
 * while the drawer is shut, because the panel sits exactly one width off the
 * left edge. These assertions are geometry, not pixels — the screenshots only
 * record what the bar and the drawer look like at 390px.
 */
test.describe('Homestia mobile chrome', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the closed drawer is fully off-canvas and nothing spills into the page', async ({ page }) => {
    await page.goto('/properties');
    await settle(page, 'app-properties');

    const spill = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(spill).toBeLessThanOrEqual(1);

    const rail = await page.locator('aside').boundingBox();
    expect(rail).toBeTruthy();
    expect(rail!.x + rail!.width).toBeLessThanOrEqual(0);

    await expect(page).toHaveScreenshot('mobile-properties.png', {
      mask: [page.locator(VOLATILE_ROWS)],
    });
  });

  test('the opened drawer keeps its chrome inside its own box', async ({ page }) => {
    await page.goto('/properties');
    await settle(page, 'app-properties');

    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.locator('aside')).toBeInViewport();

    const fit = await page.evaluate(() => {
      const rail = document.querySelector('aside')!;
      return { scrollWidth: rail.scrollWidth, clientWidth: rail.clientWidth };
    });
    expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth + 1);

    await expect(page).toHaveScreenshot('mobile-drawer-open.png', {
      mask: [page.locator(VOLATILE_ROWS)],
    });
  });
});
