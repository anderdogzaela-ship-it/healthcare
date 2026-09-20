import { redirect } from 'next/navigation';
import { createClient, requireUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClinicContext } from '@/lib/data/clinic';
import TeamView, { type InvitationRow, type MemberRow } from '@/components/clinic/TeamView';

export default async function TeamPage() {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic) redirect('/clinic');

  const supabase = createClient();

  const [{ data: memberRows }, { data: invitationRows }] = await Promise.all([
    supabase.from('clinic_members').select('user_id, role').eq('clinic_id', clinic.id),
    supabase
      .from('clinic_invitations')
      .select('id, email, role, expires_at')
      .eq('clinic_id', clinic.id)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ]);

  // Profiles of colleagues are not readable under the per-user policy, so the
  // names come through the service role, limited to this clinic's roster.
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('id', (memberRows ?? []).map((row) => row.user_id));

  const nameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

  const members: MemberRow[] = (memberRows ?? []).map((row) => ({
    userId: row.user_id,
    name: nameById.get(row.user_id)?.trim() || '—',
    role: row.role,
    isSelf: row.user_id === user.id,
  }));

  const invitations: InvitationRow[] = (invitationRows ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    expiresAt: row.expires_at,
  }));

  return <TeamView members={members} invitations={invitations} isOwner={clinic.role === 'owner'} />;
}
