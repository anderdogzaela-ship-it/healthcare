'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type DeleteResult = {
  status: 'error';
  reason: 'mismatch' | 'soleOwner' | 'failed';
};

/**
 * Permanently deletes the account and everything attached to it.
 *
 * The user types their email to confirm, because this cannot be undone: every
 * health record, appointment and conversation goes with it, through the
 * cascades on auth.users.
 */
export async function deleteAccount(formData: FormData): Promise<DeleteResult> {
  const user = await requireUser();

  const typed = String(formData.get('confirmEmail') ?? '').trim().toLowerCase();
  if (!typed || typed !== (user.email ?? '').toLowerCase()) {
    return { status: 'error', reason: 'mismatch' };
  }

  const supabase = createClient();
  const admin = createAdminClient();

  // Clinics the user owns need handling first: the creator reference blocks
  // deletion, and a clinic must never be left without an owner.
  const { data: ownerships } = await supabase
    .from('clinic_members')
    .select('clinic_id, role')
    .eq('user_id', user.id)
    .eq('role', 'owner');

  for (const ownership of ownerships ?? []) {
    const { data: owners } = await admin
      .from('clinic_members')
      .select('user_id')
      .eq('clinic_id', ownership.clinic_id)
      .eq('role', 'owner');

    const otherOwners = (owners ?? []).filter((owner) => owner.user_id !== user.id);
    if (otherOwners.length > 0) continue; // Someone else can keep the clinic.

    const { count } = await admin
      .from('clinic_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('clinic_id', ownership.clinic_id);

    // Other staff would lose access with no owner left: ask the user to hand
    // the clinic over first rather than deleting other people's workspace.
    if ((count ?? 0) > 1) return { status: 'error', reason: 'soleOwner' };

    const { error } = await admin.from('clinics').delete().eq('id', ownership.clinic_id);
    if (error) return { status: 'error', reason: 'failed' };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { status: 'error', reason: 'failed' };

  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/?deleted=1');
}
