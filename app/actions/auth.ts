'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, requireUser } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/supabase/env';
import { emailSchema, newPasswordSchema, signInSchema, signUpSchema } from '@/lib/validation';
import type { Messages } from '@/lib/i18n/messages';

/** Keys into messages.auth, so the client renders the text in its own language. */
export type AuthMessageKey = keyof Messages['auth'];

export type AuthResult =
  | { status: 'error'; messageKey: AuthMessageKey }
  | { status: 'success'; messageKey: AuthMessageKey; email?: string };

/** The consent text version accepted at sign-up; bump when the terms change. */
const CONSENT_VERSION = '2026-09-01';

/** Turn Supabase's English error text into one of our translated keys. */
function mapAuthError(message: string, status?: number): AuthMessageKey {
  const text = message.toLowerCase();
  if (status === 429 || text.includes('rate limit')) return 'rateLimited';
  if (text.includes('invalid login credentials')) return 'invalidCredentials';
  if (text.includes('email not confirmed')) return 'emailNotConfirmed';
  if (text.includes('already registered') || text.includes('already exists')) return 'emailInUse';
  if (text.includes('password')) return 'weakPassword';
  return 'generic';
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { status: 'error', messageKey: 'invalidCredentials' };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { status: 'error', messageKey: mapAuthError(error.message, error.status) };

  const next = formData.get('next');
  revalidatePath('/', 'layout');
  redirect(typeof next === 'string' && next.startsWith('/') ? next : '/dashboard');
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    locale: formData.get('locale') ?? 'en',
    consent: formData.get('consent') === 'true',
  });

  if (!parsed.success) {
    const failed = parsed.error.issues[0]?.path[0];
    if (failed === 'consent') return { status: 'error', messageKey: 'consentRequired' };
    if (failed === 'password') return { status: 'error', messageKey: 'weakPassword' };
    return { status: 'error', messageKey: 'generic' };
  }

  const { fullName, email, password, locale } = parsed.data;
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback`,
      // Read by the handle_new_user trigger to fill the profile and record
      // the consent given on this form.
      data: {
        full_name: fullName,
        locale,
        consent_version: CONSENT_VERSION,
      },
    },
  });

  if (error) return { status: 'error', messageKey: mapAuthError(error.message, error.status) };

  // With email confirmation enabled there is no session yet.
  if (!data.session) return { status: 'success', messageKey: 'checkEmail', email };

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function requestPasswordReset(formData: FormData): Promise<AuthResult> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });
  // Always answer the same way, so the form cannot be used to discover which
  // email addresses have accounts.
  if (!parsed.success) return { status: 'success', messageKey: 'resetSent' };

  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    // Lands on the page where the new password is actually chosen.
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });

  return { status: 'success', messageKey: 'resetSent' };
}

/**
 * Sets a new password for the signed-in user. Used after a reset link, which
 * signs the user in through /auth/callback before sending them here.
 */
export async function updatePassword(formData: FormData): Promise<AuthResult> {
  await requireUser();

  const parsed = newPasswordSchema.safeParse({ password: formData.get('password') });
  if (!parsed.success) return { status: 'error', messageKey: 'weakPassword' };

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: 'error', messageKey: mapAuthError(error.message, error.status) };

  return { status: 'success', messageKey: 'passwordUpdated' };
}

/**
 * Sends the sign-up confirmation email again. For someone whose first link
 * expired, was opened on the wrong device, or pointed somewhere it should not
 * have: without this there was no way to get a new one.
 */
export async function resendConfirmation(formData: FormData): Promise<AuthResult> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });
  // Same answer either way, so the form does not reveal which addresses exist.
  if (!parsed.success) return { status: 'success', messageKey: 'confirmationResent' };

  const supabase = createClient();
  await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });

  return { status: 'success', messageKey: 'confirmationResent' };
}
