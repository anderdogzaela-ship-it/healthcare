'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users, CalendarCheck, CalendarX2, UserPlus, Search,
  ChevronRight, AlertCircle, Phone, Mail
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { createPatient } from '@/app/actions/clinic';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';
import type { ClinicContext, ClinicStats, ClinicSummary, PatientRow } from '@/lib/data/clinic';
import type { Messages } from '@/lib/i18n/messages';

type PatientStatus = keyof Messages['clinic']['statuses'];

const statusStyles: Record<PatientStatus, string> = {
  lead: 'bg-amber-50 text-amber-700 border-amber-100',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  archived: 'bg-gray-100 text-gray-400 border-gray-200',
};

export default function ClinicDashboard({
  clinic,
  clinics,
  stats,
  patients,
  search,
}: {
  clinic: ClinicContext;
  clinics: ClinicSummary[];
  stats: ClinicStats;
  patients: PatientRow[];
  search: string;
}) {
  const { m, formatNumber, formatDate, locale } = useI18n();
  const router = useRouter();
  const [term, setTerm] = useState(search);
  const [showForm, setShowForm] = useState(false);
  const [failed, setFailed] = useState<'generic' | 'limit' | null>(null);
  const [pending, startTransition] = useTransition();

  const runSearch = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(term.trim() ? `/clinic?q=${encodeURIComponent(term.trim())}` : '/clinic');
  };

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailed(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createPatient(formData);
      if (result.status === 'ok') {
        setShowForm(false);
        router.refresh();
      } else {
        setFailed(result.reason === 'limit' ? 'limit' : 'generic');
      }
    });
  };

  const cards = [
    { label: m.clinic.stats.patients, value: formatNumber(stats.total), icon: Users, color: 'bg-blue-50', iconColor: 'text-blue-500' },
    { label: m.clinic.stats.upcoming, value: formatNumber(stats.upcoming), icon: CalendarCheck, color: 'bg-emerald-50', iconColor: 'text-emerald-500' },
    {
      label: m.clinic.stats.confirmed,
      value: stats.confirmedRate === null ? '—' : `${formatNumber(stats.confirmedRate)}%`,
      icon: CalendarCheck, color: 'bg-amber-50', iconColor: 'text-amber-500',
    },
    {
      label: m.clinic.stats.noShows,
      value: stats.noShowRate === null ? '—' : `${formatNumber(stats.noShowRate)}%`,
      icon: CalendarX2, color: 'bg-red-50', iconColor: 'text-red-500',
    },
  ];

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all';

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{clinic.name}</h1>
          {clinics.length > 1 && (
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-500">
              {m.clinic.switchClinic}
              <select
                value={clinic.id}
                // A full navigation through the switch route, which is the
                // only place allowed to remember the choice.
                onChange={(event) => {
                  window.location.href = `/api/clinic/switch?id=${event.target.value}&next=/clinic`;
                }}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {clinics.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} · {m.clinic.roles[option.role]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-gray-500 mt-1">
            {m.clinic.subtitle} · <span className="text-gray-400">{m.clinic.roles[clinic.role]}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-4">
            <Link href="/clinic/billing" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              {m.clinic.billingLink} →
            </Link>
            <Link href="/clinic/team" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              {m.clinic.teamLink} →
            </Link>
            <Link href="/clinic/integrations" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              {m.clinic.integrationsLink} →
            </Link>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all flex-shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          {m.clinic.addPatient}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 animate-slide-up max-w-3xl">
          <h2 className="font-bold text-gray-900 mb-5" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.clinic.newPatient}</h2>

          {failed && (
            <div role="alert" className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                {failed === 'limit' ? m.billing.limitReached : m.clinic.saveError}
              </p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="p-name" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.clinic.fullName}</label>
              <input id="p-name" name="fullName" type="text" required minLength={2} className={inputClass} />
            </div>
            <div>
              <label htmlFor="p-phone" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.clinic.phone}</label>
              <input id="p-phone" name="phone" type="tel" placeholder="+55 11 99999-9999" className={inputClass} />
            </div>
            <div>
              <label htmlFor="p-email" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.clinic.email}</label>
              <input id="p-email" name="email" type="email" className={inputClass} />
            </div>
            <div>
              <label htmlFor="p-dob" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.clinic.dateOfBirth}</label>
              <input id="p-dob" name="dateOfBirth" type="date" className={inputClass} />
            </div>
            <div>
              <label htmlFor="p-locale" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.clinic.language}</label>
              <select id="p-locale" name="locale" defaultValue={locale} className={`${inputClass} bg-white`}>
                {locales.map((l: Locale) => (
                  <option key={l} value={l}>{localeNames[l]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="p-status" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.clinic.status}</label>
              <select id="p-status" name="status" defaultValue="lead" className={`${inputClass} bg-white`}>
                {(['lead', 'active', 'inactive'] as PatientStatus[]).map((status) => (
                  <option key={status} value={status}>{m.clinic.statuses[status]}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-5 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-200 transition-all disabled:opacity-70"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {pending ? m.clinic.saving : m.clinic.save}
          </button>
        </form>
      )}

      {/* Patients */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.clinic.patients}</h2>
          <form onSubmit={runSearch} className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={m.clinic.search}
              aria-label={m.clinic.search}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </form>
        </div>

        {patients.length === 0 ? (
          <p className="p-6 text-sm text-gray-400">{m.clinic.none}</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {patients.map((patient) => (
              <li key={patient.id}>
                <Link href={`/clinic/patients/${patient.id}`} className="flex items-center gap-4 p-4 hover:bg-emerald-50/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">
                      {patient.fullName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{patient.fullName}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusStyles[patient.status]}`}>
                        {m.clinic.statuses[patient.status]}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
                      {patient.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{patient.phone}</span>}
                      {patient.email && <span className="hidden sm:flex items-center gap-1"><Mail className="w-3 h-3" />{patient.email}</span>}
                    </div>
                  </div>
                  <div className="hidden sm:block text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{m.clinic.nextVisit}</p>
                    <p className="text-sm font-medium text-gray-700">
                      {patient.nextAppointmentAt
                        ? formatDate(new Date(patient.nextAppointmentAt), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : m.clinic.never}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
