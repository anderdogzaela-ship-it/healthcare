'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Moon, Footprints, HeartPulse, Stethoscope, Mail, Check, AlertCircle, Info, ClipboardList } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { WeeklyReport } from '@/lib/data/weekly-report';
import { presentReport } from '@/lib/report/present';
import { sendMyWeeklyReport } from '@/app/actions/report';

const heading = { fontFamily: 'Nunito, sans-serif' };

const sectionStyle = {
  sleep: { icon: Moon, tone: 'bg-indigo-50 text-indigo-500' },
  activity: { icon: Footprints, tone: 'bg-amber-50 text-amber-500' },
  vitals: { icon: HeartPulse, tone: 'bg-rose-50 text-rose-500' },
} as const;

export default function ReportView({ report, canEmail }: { report: WeeklyReport; canEmail: boolean }) {
  const { m, fmt, locale } = useI18n();
  const r = m.report;
  const view = presentReport(report, m, locale);

  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const send = () => {
    setNotice(null);
    startTransition(async () => {
      const result = await sendMyWeeklyReport();
      setNotice(
        result.status === 'sent'
          ? { kind: 'ok', text: fmt(r.sent, { email: result.email }) }
          : { kind: 'error', text: result.reason === 'not_configured' ? r.notConfigured : r.sendFailed }
      );
    });
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={heading}>{r.title}</h1>
          <p className="text-gray-500 mt-1">
            <span className="font-semibold text-gray-700">{view.period}</span> · {r.intro}
          </p>
        </div>
        {report.hasData && canEmail && (
          <button
            type="button"
            onClick={send}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-200 hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-60 flex-shrink-0"
          >
            <Mail className="w-4 h-4" />
            {pending ? r.sending : r.send}
          </button>
        )}
      </div>

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`mb-6 flex items-start gap-2.5 p-3.5 rounded-xl border max-w-xl ${
            notice.kind === 'ok' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
          }`}
        >
          {notice.kind === 'ok'
            ? <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
          <p className={`text-sm ${notice.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>{notice.text}</p>
        </div>
      )}

      {!report.hasData ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center max-w-xl">
          <div className="w-12 h-12 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="mt-4 text-gray-600">{r.noData}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/health" className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors">
              {m.nav.health}
            </Link>
            <Link href="/settings" className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:border-emerald-300 transition-colors">
              {m.nav.settings}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-gray-500">{view.logged}</p>

          <div className="grid lg:grid-cols-3 gap-6">
            {view.sections.map((section) => {
              const style = sectionStyle[section.key];
              return (
                <section key={section.key} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${style.tone}`}>
                      <style.icon className="w-5 h-5" />
                    </div>
                    <h2 className="font-bold text-gray-900" style={heading}>{section.title}</h2>
                  </div>
                  <dl className="divide-y divide-gray-50">
                    {section.rows.map((row) => (
                      <div key={row.label} className="py-3 flex items-start justify-between gap-4">
                        <dt className="text-sm text-gray-500">{row.label}</dt>
                        <dd className="text-right">
                          <span className="block text-base font-bold text-gray-900" style={heading}>{row.value}</span>
                          {row.previous && <span className="block text-xs text-gray-400 mt-0.5">{row.previous}</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>

          <section className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-50 text-teal-500">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h2 className="font-bold text-gray-900" style={heading}>{r.symptomsTitle}</h2>
            </div>
            {view.symptoms.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {view.symptoms.map((line) => (
                  <li key={line} className="px-3 py-1.5 rounded-full text-sm text-gray-700 bg-gray-50 border border-gray-100">{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">{r.noSymptoms}</p>
            )}
          </section>
        </>
      )}

      <div className="mt-8 flex items-start gap-2.5 max-w-3xl">
        <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400">
          {r.disclaimer}
          {!canEmail && report.hasData ? ` ${r.notConfigured}` : ''}
        </p>
      </div>
    </main>
  );
}
