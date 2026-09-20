'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Heart, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { requestPasswordReset, type AuthMessageKey } from '@/app/actions/auth';

export default function ForgotPasswordPage() {
  const { m } = useI18n();
  const [email, setEmail] = useState('');
  const [messageKey, setMessageKey] = useState<AuthMessageKey | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set('email', email);

    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      setMessageKey(result.messageKey);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-emerald-50/60 to-slate-50 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-200/40 blur-3xl animate-blob" />
      <LanguageSwitcher className="absolute top-4 right-4" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI</span>
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.forgot.title}</h1>
          <p className="mt-2 text-sm text-gray-500">{m.forgot.subtitle}</p>

          {messageKey ? (
            <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 animate-slide-up">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">{m.auth[messageKey]}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700 mb-2">{m.login.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={m.login.emailPlaceholder}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-emerald-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {pending ? m.forgot.sending : m.forgot.submit}
              </button>
            </form>
          )}

          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {m.forgot.back}
          </Link>
        </div>
      </div>
    </div>
  );
}
