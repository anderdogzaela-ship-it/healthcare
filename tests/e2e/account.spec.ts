import { test, expect } from '@playwright/test';

/**
 * The end-to-end flow against a real Supabase project.
 *
 * Skipped unless the environment points at one, so `npm run test:e2e` still
 * passes on a machine that only has the code. Email confirmation must be off
 * in Supabase (Authentication → Providers → Email) for sign-up to return a
 * session immediately; with it on, the flow stops at "check your email", which
 * the first test asserts instead.
 */
const configured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL!.includes('placeholder');

test.skip(!configured, 'Set NEXT_PUBLIC_SUPABASE_URL to a real project to run these.');

const password = 'Str0ng-Passw0rd!';
const email = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

test('an unknown API key is rejected', async ({ request }) => {
  const response = await request.get('/api/v1/patients', {
    headers: { Authorization: 'Bearer hai_definitely_not_a_real_key' },
  });
  expect(response.status()).toBe(401);
});

test('sign up, log health data, and see it on the dashboard', async ({ page }) => {
  const address = email();

  // --- sign up -------------------------------------------------------------
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Ana Souza');
  await page.getByLabel('Email address').fill(address);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create Account' }).click();

  const confirmationRequired = page.getByText(/we sent a confirmation link/i);
  if (await confirmationRequired.isVisible({ timeout: 10_000 }).catch(() => false)) {
    test.info().annotations.push({
      type: 'note',
      description: 'Email confirmation is on; the rest of the flow needs a confirmed account.',
    });
    return;
  }

  // --- empty dashboard -----------------------------------------------------
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page.getByText(/waiting for its first entry/i)).toBeVisible();
  // The sidebar shows the real profile, created by the database trigger.
  await expect(page.getByText('Ana Souza').first()).toBeVisible();

  // --- log health data -----------------------------------------------------
  await page.goto('/health');
  await page.getByLabel('Heart Rate (bpm)').fill('68');
  await page.getByLabel('Systolic BP (mmHg)').fill('118');
  await page.getByLabel('Diastolic BP (mmHg)').fill('76');
  await page.getByLabel('Steps').fill('8200');
  await page.getByRole('button', { name: 'Headache' }).click();
  await page.getByRole('button', { name: /Save Health Log/ }).click();

  await expect(page.getByText('Log Saved!')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/68 bpm looks healthy/)).toBeVisible();

  // --- the dashboard now shows it -----------------------------------------
  await page.goto('/dashboard');
  await expect(page.getByText(/waiting for its first entry/i)).toHaveCount(0);
  await expect(page.getByText('68')).toBeVisible();
  await expect(page.getByText('118/76')).toBeVisible();
});

test('settings persist and the language choice follows the account', async ({ page }) => {
  const address = email();

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Team Tester');
  await page.getByLabel('Email address').fill(address);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create Account' }).click();

  if (await page.getByText(/we sent a confirmation link/i).isVisible({ timeout: 10_000 }).catch(() => false)) {
    test.skip(true, 'Email confirmation is on.');
  }

  await page.goto('/settings');
  await page.getByLabel('Full Name').fill('Renamed Tester');
  await page.getByLabel('WhatsApp number').fill('+55 11 98888-7777');
  await page.getByLabel('Daily step goal').fill('9000');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('button', { name: /Saved!/ })).toBeVisible({ timeout: 20_000 });

  // Reload to prove it came back from the database rather than from state.
  await page.reload();
  await expect(page.getByLabel('Full Name')).toHaveValue('Renamed Tester');
  await expect(page.getByLabel('Daily step goal')).toHaveValue('9000');
});

test('a clinic can be created and a patient added', async ({ page }) => {
  const address = email();

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Clinic Owner');
  await page.getByLabel('Email address').fill(address);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create Account' }).click();

  if (await page.getByText(/we sent a confirmation link/i).isVisible({ timeout: 10_000 }).catch(() => false)) {
    test.skip(true, 'Email confirmation is on.');
  }

  await page.goto('/clinic');
  await page.getByLabel('Clinic name').fill('Clínica Teste');
  await page.getByRole('button', { name: 'Create clinic' }).click();

  await expect(page.getByRole('heading', { name: 'Clínica Teste' })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Add patient' }).click();
  await page.getByLabel('Full name').fill('Paciente Um');
  await page.getByLabel('WhatsApp number').fill('+55 11 97777-6666');
  await page.getByRole('button', { name: 'Save patient' }).click();

  await expect(page.getByText('Paciente Um')).toBeVisible({ timeout: 20_000 });
});
