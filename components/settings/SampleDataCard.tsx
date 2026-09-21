'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { loadSampleData, removeSampleData } from '@/app/actions/sample-data';

type Notice = { kind: 'ok' | 'error'; text: string } | null;

export default function SampleDataCard() {
  const { m, fmt } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<'load' | 'remove' | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const load = () => {
    setNotice(null);
    setAction('load');
    startTransition(async () => {
      const result = await loadSampleData();
      setNotice(
        result.status === 'ok'
          ? { kind: 'ok', text: fmt(m.settings.sampleLoaded, { days: result.days, patients: result.patients }) }
          : { kind: 'error', text: m.settings.sampleFailed }
      );
      router.refresh();
    });
  };

  const remove = () => {
    if (!window.confirm(m.settings.sampleRemoveConfirm)) return;
    setNotice(null);
    setAction('remove');
    startTransition(async () => {
      const result = await removeSampleData();
      setNotice(
        result.status === 'ok'
          ? { kind: 'ok', text: m.settings.sampleRemoved }
          : { kind: 'error', text: m.settings.sampleFailed }
      );
      router.refresh();
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
          <Database className="w-5 h-5 text-violet-500" />
        </div>
        <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.settings.sampleTitle}</h2>
      </div>
      <p className="text-sm text-gray-500">{m.settings.sampleHint}</p>

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`mt-4 flex items-start gap-2.5 p-3.5 rounded-xl border ${
            notice.kind === 'ok' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
          }`}
        >
          {notice.kind === 'ok'
            ? <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
          <p className={`text-sm ${notice.kind === 'ok' ? 'text-emerald-700' : 'text-red-700'}`}>{notice.text}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={load}
          disabled={pending}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending && action === 'load' ? m.settings.sampleLoading : m.settings.sampleLoad}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending && action === 'remove' ? m.settings.sampleRemoving : m.settings.sampleRemove}
        </button>
      </div>
    </div>
  );
}
