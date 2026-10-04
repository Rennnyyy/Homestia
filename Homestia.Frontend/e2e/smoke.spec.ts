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
 *   dotnet run --project ../Homestia/src/Program --no-launch-profile --urls http://localhost:5080
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
 * The band a list page's baseline compares: the chrome, the page heading and the table's header.
 *
 * A full-viewport baseline cannot be independent of the data, however it is masked. Rows come from
 * the (in-memory) backend and differ per host start, and a longer table changes more than its own
 * pixels: the mask box itself grows, everything below it moves, and the page gains a scrollbar. A
 * baseline taken on an empty store then fails against a populated one, which is why this suite once
 * passed only in one order. Clipping to the band that does NOT depend on the data removes the
 * coupling; the table's own look is asserted where the table is built.
 */
/**
 * The band a list page's baseline compares: the CHROME, measured from the header itself.
 *
 * A fixed height is a promise about a layout this suite does not own. 300px covers chrome, page
 * heading and table header on a desktop — but a 390px phone has a taller bar, so the same band
 * reached into the first table ROW, and that row's name carries a random suffix. The baseline then
 * passed or failed by which run had created the record. Measuring the header keeps the comparison on
 * what these screenshots are about: the bar and the controls in it. The page heading, the table header
 * and the table's own look are asserted where they are built (the i18n suite names the columns, the
 * table spec renders them).
 */
async function chromeBand(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
  const header = await page.locator('header').boundingBox();
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  return { x: 0, y: 0, width: size.width, height: Math.ceil(header?.height ?? 64) };
}

test.describe('Homestia routes', () => {
  test('home renders', async ({ page }) => {
    await page.goto('/');
    await settle(page, 'app-root');
    await expect(page).toHaveScreenshot('home.png');
  });

  test('properties render', async ({ page }) => {
    await page.goto('/properties');
    await settle(page, 'app-properties');
    await expect(page).toHaveScreenshot('properties.png', { clip: await chromeBand(page) });
  });

  test('rentals render', async ({ page }) => {
    await page.goto('/rentals');
    await settle(page, 'app-rentals');
    await expect(page).toHaveScreenshot('rentals.png', { clip: await chromeBand(page) });
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

    await expect(page).toHaveScreenshot('mobile-properties.png', { clip: await chromeBand(page) });
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

    await expect(page).toHaveScreenshot('mobile-drawer-open.png', { clip: await chromeBand(page) });
  });
});
