/**
 * Supabase connection details.
 *
 * Read when a client is created, never at import: a module-level check fails
 * the whole build ("failed to collect page data") instead of the one route
 * that actually needs the value.
 *
 * Two spellings are accepted. `NEXT_PUBLIC_*` is what .env.example uses and
 * what the browser would need; `SUPABASE_*` is what the Vercel–Supabase
 * integration injects on its own.
 */
function read(names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }

  throw new Error(
    `Missing environment variable ${names[0]}. Copy .env.example to .env.local and fill it in, ` +
      `or set ${names.join(' / ')} in your hosting provider.`
  );
}

export function supabaseUrl(): string {
  return read(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']);
}

export function supabaseAnonKey(): string {
  return read(['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY']);
}

/** True when Supabase is configured, for callers that prefer to degrade. */
export function supabaseConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY)
  );
}

/**
 * Absolute base URL for links that leave the app: email confirmation, password
 * reset, invitations, and the API base shown to integrators.
 *
 * Order matters. VERCEL_URL is unique to each deployment, changes on every
 * push, and usually sits behind Vercel's deployment protection — a link built
 * from it breaks for anyone who is not signed in to Vercel. So it is the last
 * resort, after the project's production domain and the branch's stable URL.
 */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

  // Vercel system variables, most stable first.
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_BRANCH_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return 'http://localhost:3000';
}
