'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Heart, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { updatePassword, type AuthMessageKey } from '@/app/actions/auth';

export default function ResetPasswordForm() {
  const { m } = useI18n();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthMessageKey | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorKey(null);

    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);

    const formData = new FormData();
    formData.set('password', password);

    startTransition(async () => {
      const result = await updatePassword(formData);
      if (result.status === 'success') setDone(true);
      else setErrorKey(result.messageKey);
    });
  };

  const inputClass =
    'w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-emerald-50/60 to-slate-50">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI</span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.resetPassword.title}</h1>
          <p className="mt-2 text-sm text-gray-500">{m.resetPassword.subtitle}</p>

          {done ? (
            <div className="mt-6 space-y-5 animate-slide-up">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800">{m.auth.passwordUpdated}</p>
              </div>
              <Link
                href="/dashboard"
                className="block w-full py-3 text-center bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:from-emerald-700 hover:to-emerald-600 transition-all"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {m.resetPassword.goToDashboard}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {(errorKey || mismatch) && (
                <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{mismatch ? m.signup.passwordMismatch : errorKey ? m.auth[errorKey] : ''}</p>
                </div>
              )}

              <div>
                <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 mb-2">{m.resetPassword.newPassword}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{m.signup.passwordHint}</p>
              </div>

              <div>
                <label htmlFor="confirm-new-password" className="block text-sm font-semibold text-gray-700 mb-2">{m.resetPassword.confirmPassword}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="confirm-new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-emerald-200"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {pending ? m.resetPassword.saving : m.resetPassword.submit}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
