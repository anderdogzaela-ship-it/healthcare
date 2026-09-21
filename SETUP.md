# HealthAI — setup guide

A Next.js 14 (App Router) health platform with Supabase for authentication and
data, Tailwind for styling, and English, Spanish and Portuguese built in.

## Requirements

- Node.js 20 or newer
- A Supabase project (free tier is enough)
- Optional: the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
  to apply migrations from the command line

## 1. Install

```bash
npm install
cp .env.example .env.local
```

## 2. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy the **Project URL** and the **anon public**
   key into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ANTHROPIC_API_KEY=sk-ant-...
   SUPABASE_SERVICE_ROLE_KEY=<service role key>
   AUTOMATION_API_KEY=<random 32+ character secret>
   ```

   The last two are only needed for the appointment automations. The service
   role key bypasses row level security and is used exclusively by the
   `/api/automation` routes; `AUTOMATION_API_KEY` is the shared secret the
   scheduler must send. See [automations/README.md](automations/README.md).

   `ANTHROPIC_API_KEY` (from [console.anthropic.com](https://console.anthropic.com))
   powers the AI assistant and is read only on the server. It must never be
   given a `NEXT_PUBLIC_` prefix, which would ship it to the browser.

   The anon key is safe in the browser: every table is protected by row level
   security, so it only ever returns the signed-in user's own rows. Never put
   the `service_role` key in this file.

## 3. Create the database schema

Either with the CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

Or by hand: open **SQL Editor** in the Supabase dashboard, paste the contents of
`supabase/migrations/20260919000000_init.sql`, and run it.

This creates the tables (profiles, settings, consents, goals, daily logs,
measurements, sleep, activity, symptoms, conversations, messages), enables row
level security on all of them, and adds the trigger that creates a profile,
default settings and starting goals whenever someone signs up.

## 4. Configure authentication

In the Supabase dashboard, under **Authentication**:

- **Providers → Email**: keep "Confirm email" on for production. Turn it off
  while developing if you don't want to open a link for every test account.
- **URL Configuration → Site URL**: `http://localhost:3000` for development,
  and your real domain in production.
- **URL Configuration → Redirect URLs**: add `http://localhost:3000/auth/callback`
  and `https://<your-domain>/auth/callback`.
- **Emails**: the built-in sender is rate-limited and meant for testing. For
  production, configure your own SMTP (for example Resend) under
  **Project Settings → Authentication → SMTP Settings**.

## 5. Run

```bash
npm run dev        # http://localhost:3000
npm run typecheck  # TypeScript, no build
npm run build      # production build
npm run test:e2e   # Playwright (starts its own dev server on port 3100)
```

## Tests

`tests/e2e/` holds two Playwright suites:

- **`public.spec.ts`** needs no database. It covers the landing page, the
  pricing toggle and FAQ, the three languages, the redirect on every protected
  route, and the API answering 401 without credentials. Run it anywhere:
  `npx playwright install chromium && npm run test:e2e`.
- **`account.spec.ts`** runs the real flow — sign up, log health data, see it
  on the dashboard, save settings, create a clinic and add a patient. It skips
  itself unless `NEXT_PUBLIC_SUPABASE_URL` points at a real project, and it
  needs email confirmation switched off in Supabase, otherwise sign-up stops at
  "check your inbox".

The suite runs with a single worker: parallel workers crash the headless shell
on Windows.

## Deploying to Vercel

Add the same variables under **Settings → Environment Variables**, with
`NEXT_PUBLIC_SITE_URL` set to the deployed URL. Add that domain to the Supabase
Site URL and Redirect URLs as well, otherwise confirmation links will point at
localhost.

If you use the **Vercel–Supabase integration**, it injects `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` by itself; the app reads
either those or the `NEXT_PUBLIC_` spellings, so there is nothing to rename.

The build never requires any of them: a missing variable surfaces at request
time on the route that needs it, not as a failed deployment. So a deployment
without `ANTHROPIC_API_KEY` works fine, with the assistant answering 503.

## Project layout

```
app/
  page.tsx              landing page (public)
  login, signup, forgot-password
  auth/callback         exchanges the emailed code for a session
  (app)/                signed-in area, guarded by the layout
    dashboard, health, appointments, clinic, activity, settings, chat
  api/automation/       endpoints n8n calls (shared-secret auth)
  actions/              server actions: auth, health, appointments, settings
automations/            n8n workflows and integration docs
components/             landing, app shell, dashboard, activity, settings
lib/
  i18n/                 messages (en, es, pt) and the provider
  supabase/             browser, server and middleware clients, types
  data/                 database queries
  validation.ts         Zod schemas shared by forms and server
supabase/migrations/    SQL schema
```

## What works today

- Sign-up with explicit consent, email confirmation, sign-in, sign-out and
  password reset
- Health log saved per day, with validation of physiological ranges
- Dashboard and activity pages built from the signed-in user's own data
- Settings, preferences and goals persisted
- AI assistant answering from the user's own logged data
- Appointments, with 24h and 2h reminders queued automatically and a WhatsApp
  bot that confirms, cancels or flags a reschedule from the patient's reply
- Clinics with staff roles, a patient CRM (pipeline, notes, bookings) and
  per-clinic data isolation enforced in the database
- Team management: invite colleagues with a single-use link, assign roles,
  remove members
- Subscriptions with plan limits that are actually enforced, including seats
- A public API with per-clinic keys and signed webhooks, documented in
  [automations/api/](automations/api/)
- Data export and account deletion, as the LGPD and GDPR require
- Full interface in English, Spanish and Portuguese

## The AI assistant

`app/api/chat/route.ts` streams answers from Claude (`claude-opus-5`). It does
not receive a dump of the user's records: it calls read-only tools
(`get_measurements`, `get_sleep`, `get_activity`, `get_goals`) that query
Supabase server-side, scoped to the signed-in user, so the model cannot widen
the search. Conversations and messages are stored per user.

Three safeguards:

- **Emergency escalation.** Messages mentioning possible emergencies (chest
  pain, stroke signs, self-harm, in any of the three languages) never reach the
  model; the user is told to seek urgent care.
- **Clinical limits in the system prompt.** No diagnosis, no medication advice,
  no reassurance about symptoms, and abnormal readings are never softened.
- **Rate limit.** 40 messages per user per hour, checked before any spend.

Server-side fallbacks are enabled, so if the model declines a request it is
retried on a fallback model instead of failing. Cost scales with use: each
answer is one or more Claude calls, so watch usage in the Anthropic console.

## Billing (optional)

Leave the Stripe variables empty and the app still runs: every clinic stays on
the starter plan and the billing page says so. To turn subscriptions on:

1. Create two recurring prices in the Stripe dashboard and put their ids in
   `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_CLINIC`.
2. Add `STRIPE_SECRET_KEY`.
3. Point a webhook endpoint at `https://<your-domain>/api/stripe/webhook` for
   `checkout.session.completed`, `customer.subscription.*` and
   `invoice.payment_failed`, then put its signing secret in
   `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Stripe owns the billing state; the `subscriptions` table mirrors it so the app
can check a plan without calling Stripe on every request. With Stripe
configured, **plan limits are enforced**, not just displayed: adding a patient
or inviting a colleague beyond the plan's limit is refused with an upgrade
prompt.

Without Stripe, limits are **not** enforced. Nobody could upgrade in that case,
so enforcing them would only lock people out of features — a dead end in a
public demo. The billing page says so, and shows usage as unlimited.

## Not built yet

- **Device sync**: Apple Health, Fitbit and Google Fit are shown as disabled.
- **Sending invitation emails**: the invitation link is generated and shown to
  the owner to share; no email is sent yet.
- **Per-scope API permissions**: a key can do everything its clinic can.
- **Clinic-level export**: owners cannot yet download the whole patient list.

## Working with health data

Health data is sensitive personal data under the LGPD (art. 11) and the GDPR.
Before using this with real people: record consent (the sign-up form already
does), publish a real privacy policy, add data export and deletion, and confirm
the compliance terms of every vendor in the stack. The demo content in this
repository is synthetic.
