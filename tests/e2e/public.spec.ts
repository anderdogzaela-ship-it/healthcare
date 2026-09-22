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

test.describe('case study', () => {
  test('is linked from the landing page and renders every section', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Case study' }).first().click();
    await expect(page).toHaveURL(/\/case-study$/);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('A healthcare SaaS with AI');
    for (const title of ['What was built', 'Architecture', 'Security and privacy', 'Technology']) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'WhatsApp chatbot' })).toBeVisible();
    await expect(page).toHaveTitle(/Case study/);
  });

  test('is translated into Portuguese', async ({ page, context }) => {
    await context.addCookies([{ name: 'locale', value: 'pt', url: 'http://localhost' }]);
    await page.goto('/case-study');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Um SaaS de saúde');
    await expect(page).toHaveTitle(/Estudo de caso/);
  });
});

test.describe('legal pages', () => {
  test('the footer leads to the privacy policy and the terms', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /The AI assistant/ })).toBeVisible();

    await page.getByRole('contentinfo').getByRole('link', { name: 'Terms' }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Terms of use' })).toBeVisible();
  });

  test('no footer link is a placeholder', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.getByRole('contentinfo').getByRole('link').evaluateAll(
      (links) => links.map((link) => link.getAttribute('href'))
    );
    expect(hrefs.length).toBeGreaterThan(5);
    expect(hrefs.filter((href) => !href || href === '#')).toEqual([]);
  });

  test('the sign-up consent links to the real documents', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
  });

  test('the privacy policy is translated into Spanish', async ({ page, context }) => {
    await context.addCookies([{ name: 'locale', value: 'es', url: 'http://localhost' }]);
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeVisible();
    await expect(page).toHaveTitle(/Política de privacidad/);
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

  test('a language chosen on the landing page carries over to sign-in', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('combobox').first().selectOption('pt');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');

    // The sign-in page has no switcher of its own; it follows the saved choice.
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Que bom ter você de volta/ })).toBeVisible();
    await expect(page.getByRole('combobox')).toHaveCount(0);
  });
});

test.describe('authentication gates', () => {
  const protectedRoutes = ['/dashboard', '/health', '/appointments', '/clinic', '/chat', '/activity', '/settings', '/report', '/clinic/whatsapp'];

  for (const route of protectedRoutes) {
    test(`${route} redirects a signed-out visitor to login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(route)}`));
    });
  }

  test('an email link that landed on the home page is forwarded to the code handler', async ({ request }) => {
    // Supabase falls back to the Site URL when a redirect is not allow-listed.
    const response = await request.get('/?code=abc123', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/auth/callback?code=abc123');
  });

  test('a token-hash email link on the home page is forwarded to the confirm handler', async ({ request }) => {
    const response = await request.get('/?token_hash=xyz&type=email', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/auth/confirm?token_hash=xyz&type=email');
  });

  test('switching clinic without a session sends you to sign in', async ({ request }) => {
    const response = await request.get('/api/clinic/switch?id=some-clinic&next=/clinic', { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/login?next=%2Fclinic');
    // Nothing is remembered for a visitor who is not signed in.
    expect(response.headers()['set-cookie'] ?? '').not.toContain('active_clinic');
  });

  test('the reset-password page requires the session a reset link creates', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page).toHaveURL(/\/login\?next=%2Freset-password/);
  });

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
    ['/api/cron/weekly-report', 401],
    ['/api/account/export', 401],
    ['/api/clinic/patients/export', 401],
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
