import AppShell from '@/components/AppShell';
import { createClient, requireUser } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The real check. Middleware only does the convenience redirect.
  const user = await requireUser();

  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, plan')
    .eq('id', user.id)
    .single();

  const userName = profile?.full_name?.trim() || user.email?.split('@')[0] || '';

  return (
    <AppShell userName={userName} plan={profile?.plan ?? 'starter'}>
      {children}
    </AppShell>
  );
}
