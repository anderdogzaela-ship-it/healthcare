import { test, expect } from '@playwright/test';

/**
 * Everything here works without a database: the marketing page, the language
 * switching, route protection and the shape of the API's refusals.
 */

test.describe('landing page', () => {
  test('renders the hero, pricing and footer', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('autopilot');
    await expect(page.getByRole('link', { name: 'Get started' }).first()).toBeVisible();
    // Demo labelling must not disappear by accident.
    await expect(page.getByText('Demo · synthetic data').first()).toBeVisible();
    await expect(page.getByText(/all data, names and testimonials are fictitious/i)).toBeVisible();
  });

  test('pricing toggle switches to yearly prices', async ({ page }) => {
    await page.goto('/#pricing');

    const monthly = page.getByText('$29/month', { exact: false }).first();
    await expect(monthly).toBeVisible();

    await page.getByRole('switch').first().click();
    // 20% off 29 is 23.
    await expect(page.getByText('$23', { exact: false }).first()).toBeVisible();
  });

  test('FAQ answers open on click', async ({ page }) => {
    await page.goto('/#faq');

    const question = page.getByRole('button', { name: /Do patients need to install an app/i });
    await question.click();
    await expect(page.getByText(/Patients use WhatsApp for reminders/i)).toBeVisible();
  });
});

test.describe('languages', () => {
  test('cookie selects Portuguese', async ({ page, context }) => {
    await context.addCookies([
      { name: 'locale', value: 'pt', url: 'http://localhost' },
    ]);
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('piloto automático');
  });

  test('cookie selects Spanish', async ({ page, context }) => {
    await context.addCookies([
      { name: 'locale', value: 'es', url: 'http://localhost' },
    ]);
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Lleva tu clínica en');
  });

  test('switching language from the login page persists', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    await page.getByRole('combobox').first().selectOption('pt');

    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('heading', { name: /Que bom ter você de volta/ })).toBeVisible();
  });
});

test.describe('authentication gates', () => {
  const protectedRoutes = ['/dashboard', '/health', '/appointments', '/clinic', '/chat', '/activity', '/settings'];

  for (const route of protectedRoutes) {
    test(`${route} redirects a signed-out visitor to login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(route)}`));
    });
  }

  test('an invitation link sends you to sign in first', async ({ page }) => {
    await page.goto('/invite/not-a-real-token');
    await expect(page).toHaveURL(/\/login\?next=%2Finvite%2Fnot-a-real-token/);
  });

  test('signup requires matching passwords', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel('Full name').fill('Ana Souza');
    await page.getByLabel('Email address').fill('ana@example.com');
    await page.getByLabel('Password', { exact: true }).fill('supersecret1');
    await page.getByLabel('Confirm password').fill('different1');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page.getByText('Passwords do not match.')).toBeVisible();
  });
});

test.describe('API refuses unauthenticated calls', () => {
  const cases: [string, number][] = [
    ['/api/v1/me', 401],
    ['/api/v1/patients', 401],
    ['/api/automation/reminders/due', 401],
    ['/api/cron/webhook-retries', 401],
    ['/api/account/export', 401],
  ];

  for (const [path, status] of cases) {
    test(`GET ${path} answers ${status}`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(status);
    });
  }

  test('POST /api/chat without a session answers 401', async ({ request }) => {
    const response = await request.post('/api/chat', { data: { message: 'hello' } });
    expect(response.status()).toBe(401);
  });

  // Checking an unknown key needs a database lookup, so that case lives in
  // account.spec.ts, which runs against a real project.
});
