'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Mail, Lock, Eye, EyeOff, User, Activity, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const features = [
  { key: 'tracking', icon: Activity, color: 'text-purple-300' },
  { key: 'insights', icon: Heart, color: 'text-red-300' },
  { key: 'privacy', icon: ShieldCheck, color: 'text-emerald-300' },
] as const;

export default function SignUpPage() {
  const { m, rich } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError(m.signup.passwordMismatch);
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1200);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute top-[-80px] right-[-80px] w-96 h-96 rounded-full bg-emerald-600 opacity-20" />
        <div className="absolute bottom-[-120px] left-[-60px] w-[500px] h-[500px] rounded-full bg-emerald-500 opacity-10" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-amber-400 opacity-5" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Heart className="w-7 h-7 text-white fill-white" />
            </div>
            <span className="text-3xl font-bold text-white" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI</span>
          </div>
          <p className="mt-4 text-emerald-200 text-lg font-medium">{m.common.tagline}</p>
        </div>

        <div className="relative z-10 space-y-4">
          <p className="text-emerald-300 text-sm font-semibold uppercase tracking-wider mb-6">{m.signup.whatYouGet}</p>

          {features.map((item) => (
            <div key={item.key} className="rounded-2xl p-4 border border-white/25" style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{m.signup.features[item.key].title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{m.signup.features[item.key].description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10">
          <p className="text-emerald-400 text-sm">{m.common.trustedBy}</p>
        </div>
      </div>

      {/* Right panel - Sign up form */}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.signup.title}</h1>
            <p className="text-gray-500 mb-8">{m.signup.subtitle}</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{m.signup.fullName}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={m.signup.namePlaceholder}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{m.signup.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={m.signup.emailPlaceholder}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{m.signup.password}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{m.signup.passwordHint}</p>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{m.signup.confirmPassword}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={(e) => { setForm({ ...form, confirm: e.target.value }); setError(''); }}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-12 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all ${error ? 'border-red-300 focus:ring-red-400' : 'border-gray-200'}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
              </div>

              {/* Terms */}
              <p className="text-xs text-gray-400 leading-relaxed">
                {rich(m.signup.terms, {
                  terms: <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">{m.signup.termsLink}</a>,
                  privacy: <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">{m.signup.privacyLink}</a>,
                })}
              </p>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {m.signup.submitting}
                  </>
                ) : (
                  m.signup.submit
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-500 text-sm">
              {m.signup.haveAccount}{' '}
              <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                {m.signup.signIn}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
