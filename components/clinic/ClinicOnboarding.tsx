'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { createClinic } from '@/app/actions/clinic';

export default function ClinicOnboarding({ defaultTimezone }: { defaultTimezone: string }) {
  const { m, locale } = useI18n();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailed(false);
    const formData = new FormData(event.currentTarget);
    formData.set('locale', locale);

    startTransition(async () => {
      const result = await createClinic(formData);
      if (result.status === 'ok') router.refresh();
      else setFailed(true);
    });
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all';

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <div className="max-w-xl mx-auto mt-6 lg:mt-16">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 animate-slide-up">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Building2 className="w-7 h-7 text-emerald-500" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {m.clinic.onboarding.title}
          </h1>
          <p className="mt-2 text-sm text-gray-500">{m.clinic.onboarding.description}</p>

          {failed && (
            <div role="alert" className="mt-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{m.clinic.saveError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="clinic-name" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.clinic.onboarding.name}</label>
              <input
                id="clinic-name"
                name="name"
                type="text"
                required
                minLength={2}
                placeholder={m.clinic.onboarding.namePlaceholder}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="clinic-tz" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.clinic.onboarding.timezone}</label>
              <input
                id="clinic-tz"
                name="timezone"
                type="text"
                defaultValue={defaultTimezone}
                placeholder="America/Sao_Paulo"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              {pending ? m.clinic.onboarding.creating : m.clinic.onboarding.create}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
