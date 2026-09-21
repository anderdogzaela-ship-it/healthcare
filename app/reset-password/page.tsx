import { requireUser } from '@/lib/supabase/server';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

/**
 * Where a password reset link ends up. The link signs the user in through
 * /auth/callback first, so by the time they are here there is a session and
 * updateUser can set the new password.
 */
export default async function ResetPasswordPage() {
  await requireUser();
  return <ResetPasswordForm />;
}
