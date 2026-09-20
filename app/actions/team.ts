'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, requireUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { siteUrl } from '@/lib/supabase/env';
import { getClinicContext } from '@/lib/data/clinic';
import { getClinicUsage } from '@/lib/billing/limits';

export type TeamResult =
  | { status: 'ok' }
  // The link is shown once; there is no email sender configured yet.
  | { status: 'invited'; link: string }
  | { status: 'error'; reason: 'forbidden' | 'invalid' | 'failed' | 'limit' | 'alreadyMember' };

export type AcceptResult = 'accepted' | 'already' | 'expired' | 'invalid' | 'wrongAccount';

const inviteSchema = z.object({
  email: z.string().trim().email().max(200),
  role: z.enum(['owner', 'professional', 'receptionist']),
});

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function requireOwner() {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic || clinic.role !== 'owner') return null;
  return { user, clinic };
}

export async function inviteStaff(formData: FormData): Promise<TeamResult> {
  const context = await requireOwner();
  if (!context) return { status: 'error', reason: 'forbidden' };

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role') ?? 'professional',
  });
  if (!parsed.success) return { status: 'error', reason: 'invalid' };

  // Seats are part of the plan, so an invitation counts against the limit.
  const usage = await getClinicUsage(context.clinic.id);
  const seats = usage.plan.limits.teamMembers;
  if (seats !== null && usage.teamMembers >= seats) return { status: 'error', reason: 'limit' };

  const token = randomBytes(24).toString('base64url');
  const supabase = createClient();

  const { error } = await supabase.from('clinic_invitations').insert({
    clinic_id: context.clinic.id,
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role,
    token_hash: hashToken(token),
    invited_by: context.user.id,
  });

  if (error) return { status: 'error', reason: 'failed' };

  revalidatePath('/clinic/team');
  return { status: 'invited', link: `${siteUrl()}/invite/${token}` };
}

export async function revokeInvitation(formData: FormData): Promise<TeamResult> {
  const context = await requireOwner();
  if (!context) return { status: 'error', reason: 'forbidden' };

  const id = formData.get('id');
  if (typeof id !== 'string') return { status: 'error', reason: 'invalid' };

  const supabase = createClient();
  const { error } = await supabase
    .from('clinic_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', context.clinic.id);

  if (error) return { status: 'error', reason: 'failed' };

  revalidatePath('/clinic/team');
  return { status: 'ok' };
}

export async function removeMember(formData: FormData): Promise<TeamResult> {
  const context = await requireOwner();
  if (!context) return { status: 'error', reason: 'forbidden' };

  const userId = formData.get('userId');
  if (typeof userId !== 'string') return { status: 'error', reason: 'invalid' };
  // Removing yourself would leave the clinic without an owner.
  if (userId === context.user.id) return { status: 'error', reason: 'invalid' };

  const supabase = createClient();
  const { error } = await supabase
    .from('clinic_members')
    .delete()
    .eq('clinic_id', context.clinic.id)
    .eq('user_id', userId);

  if (error) return { status: 'error', reason: 'failed' };

  revalidatePath('/clinic/team');
  return { status: 'ok' };
}

/**
 * Accepts an invitation for the signed-in user.
 *
 * Runs with the service role because the person accepting is, by definition,
 * not yet a member and so cannot write to the roster themselves. Every check
 * happens here: the token hash, the expiry, and that the invitation was
 * addressed to this account's email.
 */
export async function acceptInvitation(token: string): Promise<AcceptResult> {
  const user = await requireUser();
  if (!token || token.length < 16) return 'invalid';

  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from('clinic_invitations')
    .select('id, clinic_id, email, role, expires_at, accepted_at, revoked_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (!invitation || invitation.revoked_at) return 'invalid';
  if (invitation.accepted_at) return 'already';
  if (new Date(invitation.expires_at).getTime() < Date.now()) return 'expired';

  if ((user.email ?? '').toLowerCase() !== invitation.email.toLowerCase()) return 'wrongAccount';

  const { error } = await admin
    .from('clinic_members')
    .upsert(
      { clinic_id: invitation.clinic_id, user_id: user.id, role: invitation.role },
      { onConflict: 'clinic_id,user_id' }
    );

  if (error) return 'invalid';

  await admin
    .from('clinic_invitations')
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq('id', invitation.id);

  revalidatePath('/clinic');
  return 'accepted';
}
