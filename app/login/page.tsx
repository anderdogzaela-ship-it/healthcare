'use client';

import { Suspense, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Heart, Mail, Lock, Eye, EyeOff, Activity, ArrowLeft, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { resendConfirmation, signIn, type AuthMessageKey } from '@/app/actions/auth';

function LoginForm() {
  const { m, fmt, formatNumber } = useI18n();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorKey, setErrorKey] = useState<AuthMessageKey | null>(null);
  const [resent, setResent] = useState(false);
  const [resending, startResending] = useTransition();
  const [pending, startTransition] = useTransition();

  // Offered when sign-in fails because the email was never confirmed, so a
  // user whose first link did not work is not stuck.
  const handleResend = () => {
    const formData = new FormData();
    formData.set('email', email);
    startResending(async () => {
      await resendConfirmation(formData);
      setResent(true);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorKey(null);

    const formData = new FormData();
    formData.set('email', email);
    formData.set('password', password);
    const next = searchParams.get('next');
    if (next) formData.set('next', next);

    startTransition(async () => {
      // On success the action redirects, so nothing comes back here.
      const result = await signIn(formData);
      if (result?.status === 'error') setErrorKey(result.messageKey);
    });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full bg-emerald-600 opacity-20 animate-blob" />
        <div className="absolute bottom-[-120px] left-[-60px] w-[500px] h-[500px] rounded-full bg-emerald-500 opacity-10 animate-blob" style={{ animationDelay: '5s' }} />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-amber-400 opacity-5" />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 group w-fit">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
              <Heart className="w-7 h-7 text-white fill-white" />
            </div>
            <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI</span>
          </Link>
          <p className="mt-4 text-emerald-200 text-lg font-medium">{m.common.tagline}</p>
        </div>

        {/* Metric preview cards */}
        <div className="relative z-10 space-y-4">
          <p className="text-emerald-300 text-sm font-semibold uppercase tracking-wider mb-6">{m.login.liveOverview}</p>

          <div className="rounded-2xl p-4 border border-white/25 animate-float" style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-300" />
                </div>
                <div>
                  <p className="text-white/60 text-xs font-medium">{m.login.heartRate}</p>
                  <p className="text-white font-bold text-lg" style={{ fontFamily: 'Nunito, sans-serif' }}>72 <span className="text-sm font-normal text-white/60">{m.common.bpm}</span></p>
                </div>
              </div>
              <span className="text-emerald-200 text-xs bg-emerald-500/30 border border-emerald-400/30 px-2.5 py-1 rounded-full font-medium">{m.login.normal}</span>
            </div>
          </div>

          <div className="rounded-2xl p-4 border border-white/25 animate-float-slow" style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)', animationDelay: '1.5s' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <p className="text-white/60 text-xs font-medium">{m.login.sleep}</p>
                  <p className="text-white font-bold text-lg" style={{ fontFamily: 'Nunito, sans-serif' }}>{fmt(m.common.duration, { hours: 7, minutes: 20 })}</p>
                </div>
              </div>
              <span className="text-emerald-200 text-xs bg-emerald-500/30 border border-emerald-400/30 px-2.5 py-1 rounded-full font-medium">{m.login.good}</span>
            </div>
          </div>

          <div className="rounded-2xl p-4 border border-white/25 animate-float" style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)', animationDelay: '3s' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <p className="text-white/60 text-xs font-medium">{m.login.stepsToday}</p>
                  <p className="text-white font-bold text-lg" style={{ fontFamily: 'Nunito, sans-serif' }}>{formatNumber(6840)}</p>
                </div>
              </div>
              <span className="text-amber-200 text-xs bg-amber-400/30 border border-amber-400/30 px-2.5 py-1 rounded-full font-medium">{fmt(m.login.goalPercent, { percent: 91 })}</span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-emerald-400 text-sm">{m.common.trustedBy}</p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="relative w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-emerald-50">
        <Link
          href="/"
          className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          HealthAI
        </Link>
        <LanguageSwitcher className="absolute top-4 right-4" />

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-2xl font-bold text-emerald-800" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI</span>
          </div>

          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.login.title}</h1>
            <p className="text-gray-500 mb-8">{m.login.subtitle}</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error from the server action */}
              {errorKey && (
                <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-100 animate-fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{m.auth[errorKey]}</p>
                  </div>
                  {errorKey === 'emailNotConfirmed' && (
                    resent ? (
                      <p className="mt-2 ml-7 text-sm text-emerald-700">{m.auth.confirmationResent}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending || !email}
                        className="mt-2 ml-7 text-sm font-semibold text-emerald-700 hover:text-emerald-800 underline disabled:opacity-60"
                      >
                        {m.auth.resendConfirmation}
                      </button>
                    )
                  )}
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 mb-2">{m.login.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={m.login.emailPlaceholder}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 mb-2">{m.login.password}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={m.login.password}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  {m.login.forgotPassword}
                </Link>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={pending}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {pending ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {m.login.submitting}
                  </>
                ) : (
                  m.login.submit
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-500 text-sm">
              {m.login.newHere}{' '}
              <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                {m.login.createAccount}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// useSearchParams needs a Suspense boundary above it.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
