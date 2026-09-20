import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/**
 * Two suites:
 *   tests/e2e/public.spec.ts  — runs anywhere, needs no database
 *   tests/e2e/account.spec.ts — needs a real Supabase project, skips itself
 *                                when the environment is not configured
 */
export default defineConfig({
  testDir: './tests/e2e',
  // One worker: parallel workers crash the headless shell on this Windows
  // setup, and the suite is short enough that serial costs little.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Placeholders keep the public suite runnable without a project; real
      // values in .env.local take precedence and enable the account suite.
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
});
