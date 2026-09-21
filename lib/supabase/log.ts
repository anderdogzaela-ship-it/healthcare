import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Logs why a write failed.
 *
 * Without this the user sees "we could not save" and the server keeps the
 * reason to itself, which makes a deployed failure impossible to diagnose.
 * The Postgres code is the useful part: 42501 is a row-level-security denial,
 * 42P01 a missing table, 23505 a unique violation.
 */
export function logDbError(where: string, error: PostgrestError | null | undefined) {
  if (!error) return;
  console.error(
    `[db] ${where} failed: ${error.message}` +
      (error.code ? ` (code ${error.code})` : '') +
      (error.details ? ` details: ${error.details}` : '') +
      (error.hint ? ` hint: ${error.hint}` : '')
  );
}
