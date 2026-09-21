import { redirect } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { getUser } from '@/lib/supabase/server';
import { getLocale } from '@/lib/i18n/get-locale';
import { messages } from '@/lib/i18n/messages';
import { acceptInvitation } from '@/app/actions/team';

/**
 * Invitation link. Accepting needs an account, so a signed-out visitor is sent
 * to sign in first and comes straight back here.
 */
export default async function InvitePage({ params }: { params: { token: string } }) {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${params.token}`)}`);

  const { result, clinicId } = await acceptInvitation(params.token);
  const m = messages[getLocale()];
  const accepted = result === 'accepted' || result === 'already';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-emerald-50/60 to-slate-50">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center animate-fade-in">
        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${accepted ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {accepted ? <CheckCircle2 className="w-7 h-7 text-emerald-500" /> : <XCircle className="w-7 h-7 text-red-500" />}
        </div>

        <p className="mt-5 text-gray-700">{m.team.accept[result]}</p>

        {/* Through the switch route, so the clinic they just joined is the one
            that opens even if they already run a clinic of their own. A plain
            link, not next/link: prefetching would select the clinic on hover. */}
        {accepted && (
          <a
            href={clinicId ? `/api/clinic/switch?id=${clinicId}&next=/clinic` : '/clinic'}
            className="mt-6 inline-block px-6 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-200 hover:shadow-xl transition-all"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {m.team.accept.open}
          </a>
        )}
      </div>
    </div>
  );
}
