'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Copy, Check, AlertCircle, Trash2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { inviteStaff, removeMember, revokeInvitation } from '@/app/actions/team';
import type { Messages } from '@/lib/i18n/messages';

type Role = keyof Messages['clinic']['roles'];

export interface MemberRow {
  userId: string;
  name: string;
  role: Role;
  isSelf: boolean;
}

export interface InvitationRow {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
}

export default function TeamView({
  members,
  invitations,
  isOwner,
}: {
  members: MemberRow[];
  invitations: InvitationRow[];
  isOwner: boolean;
}) {
  const { m, fmt, formatDate } = useI18n();
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await inviteStaff(formData);
      if (result.status === 'invited') {
        setLink(result.link);
        form.reset();
        router.refresh();
      } else if (result.status === 'error') {
        setError(
          result.reason === 'limitFree' ? m.team.seatLimitFree
          : result.reason === 'limit' ? m.team.seatLimit
          : m.team.error
        );
      }
    });
  };

  const act = (action: typeof revokeInvitation, field: string, value: string) => {
    const formData = new FormData();
    formData.set(field, value);
    startTransition(async () => {
      await action(formData);
      router.refresh();
    });
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the link stays selectable on screen.
    }
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all';

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <Link href="/clinic" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {m.clinic.backToPatients}
      </Link>

      <div className="mt-4 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.team.title}</h1>
          <p className="text-gray-500 mt-1">{m.team.subtitle}</p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Members */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.team.members}</h2>
          <ul className="divide-y divide-gray-50">
            {members.map((member) => (
              <li key={member.userId} className="py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {member.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {member.name}
                    {member.isSelf && <span className="ml-2 text-xs text-gray-400">({m.team.you})</span>}
                  </p>
                  <p className="text-xs text-gray-400">{m.clinic.roles[member.role]}</p>
                </div>
                {isOwner && !member.isSelf && (
                  <button
                    onClick={() => act(removeMember, 'userId', member.userId)}
                    disabled={pending}
                    aria-label={m.team.remove}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Invite */}
        {isOwner ? (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
              <UserPlus className="w-4 h-4 text-gray-400" />
              {m.team.inviteTitle}
            </h2>

            {link && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 animate-slide-up">
                <p className="text-sm text-emerald-800">{m.team.inviteCreated}</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-white border border-emerald-100 text-xs text-gray-700 break-all">{link}</code>
                  <button
                    onClick={() => copy(link)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? m.team.copied : m.team.copy}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
              <input name="email" type="email" required placeholder={m.team.email} aria-label={m.team.email} className={inputClass} />
              <select name="role" defaultValue="professional" aria-label={m.team.role} className={`${inputClass} bg-white`}>
                {(['professional', 'receptionist', 'owner'] as Role[]).map((role) => (
                  <option key={role} value={role}>{m.clinic.roles[role]}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all disabled:opacity-60"
              >
                {pending ? m.team.sending : m.team.send}
              </button>
            </form>
          </section>
        ) : (
          <p className="text-sm text-gray-400">{m.team.ownerOnly}</p>
        )}

        {/* Pending invitations */}
        {isOwner && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.team.pending}</h2>
            {invitations.length === 0 ? (
              <p className="text-sm text-gray-400">{m.team.noPending}</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {invitations.map((invitation) => (
                  <li key={invitation.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{invitation.email}</p>
                      <p className="text-xs text-gray-400">
                        {m.clinic.roles[invitation.role]} ·{' '}
                        {fmt(m.team.expires, {
                          date: formatDate(new Date(invitation.expiresAt), { day: 'numeric', month: 'short' }),
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => act(revokeInvitation, 'id', invitation.id)}
                      disabled={pending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-60"
                    >
                      {m.team.revoke}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
