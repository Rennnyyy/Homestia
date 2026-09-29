import { defineConfig, devices } from '@playwright/test';

/**
 * Homestia end-to-end / visual-regression config.
 *
 * The app AND its API are served by the .NET host (src/Program) — there is no
 * separate dev server to boot, so this suite expects a host that is already
 * running:
 *
 *   dotnet run --project src/Program --no-launch-profile --urls http://localhost:5080
 *
 * Point it somewhere else with E2E_BASE_URL.
 *
 * Screenshot baselines live next to the specs (`e2e/*.spec.ts-snapshots/`) and
 * are COMMITTED — they are the guard that the migration onto the Aletheia
 * frontend packages did not change how Homestia looks. Regenerate them
 * deliberately with `npm run test:e2e:update` after an intentional visual
 * change, and review the diff before committing.
 */
export default defineConfig({
  testDir: './e2e',
  // The app talks to one shared backend; parallel workers would interleave data.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      // Theme changes and font loading settle asynchronously; a small ratio
      // keeps the baseline honest without turning antialiasing into a failure.
      // It must stay tight enough to catch a layout change: at 2% a whole
      // header control could move and a 32px-wider rail slide past unnoticed.
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
