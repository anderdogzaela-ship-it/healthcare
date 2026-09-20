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

/** Absolute base URL, used for email confirmation and reset links. */
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  // Vercel sets this automatically for preview and production deployments.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
