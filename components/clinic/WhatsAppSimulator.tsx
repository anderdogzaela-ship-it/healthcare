'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Info, CalendarClock, AlertCircle, Check, CheckCheck, BellRing } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { localeTags } from '@/lib/i18n/config';
import { simulateReminder, simulateReply } from '@/app/actions/whatsapp-simulator';

export interface SimPatient {
  id: string;
  name: string;
  phone: string | null;
  locale: string;
  nextAt: string | null;
}

export interface SimAppointment {
  id: string;
  startsAt: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  professional: string;
  location: string | null;
}

export interface SimMessage {
  id: string;
  from: 'clinic' | 'patient';
  /** Null for a reminder the live integration sent: its text is not stored. */
  text: string | null;
  kind: string;
  at: string;
  simulated: boolean;
}

// The words the bot understands, in the patient's own language.
const QUICK_REPLIES: Record<string, string[]> = {
  en: ['YES', 'NO', 'CHANGE'],
  es: ['SÍ', 'NO', 'CAMBIAR'],
  pt: ['SIM', 'NÃO', 'REMARCAR'],
};

const STATUS_STYLE: Record<SimAppointment['status'], string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-600',
  completed: 'bg-gray-100 text-gray-600',
  no_show: 'bg-amber-50 text-amber-700',
};

const heading = { fontFamily: 'Nunito, sans-serif' };

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

export default function WhatsAppSimulator({
  clinicName,
  timezone,
  patients,
  selectedId,
  appointments,
  messages,
}: {
  clinicName: string;
  timezone: string;
  patients: SimPatient[];
  selectedId: string | null;
  appointments: SimAppointment[];
  messages: SimMessage[];
}) {
  const { m, fmt, formatDate, locale } = useI18n();
  const s = m.simulator;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const patient = patients.find((item) => item.id === selectedId) ?? null;
  const upcoming = appointments.find(
    (item) => (item.status === 'scheduled' || item.status === 'confirmed') && item.startsAt > new Date().toISOString()
  );
  const quickReplies = QUICK_REPLIES[patient?.locale ?? 'en'] ?? QUICK_REPLIES.en;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const when = (iso: string) =>
    formatDate(new Date(iso), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: timezone });
  // Not formatDate: toLocaleDateString adds the date back when given only a time.
  const clock = (iso: string) =>
    new Intl.DateTimeFormat(localeTags[locale], { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(iso));

  const run = (action: (data: FormData) => Promise<{ status: string }>, data: FormData, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action(data);
      if (result.status !== 'ok') {
        setError(s.error);
        return;
      }
      after?.();
      router.refresh();
    });
  };

  const sendReminder = (kind: '24h' | '2h') => {
    if (!upcoming) return;
    const data = new FormData();
    data.set('appointmentId', upcoming.id);
    data.set('kind', kind);
    run(simulateReminder, data);
  };

  const sendReply = (value: string) => {
    const reply = value.trim();
    if (!patient || !reply || pending) return;
    const data = new FormData();
    data.set('patientId', patient.id);
    data.set('text', reply);
    run(simulateReply, data, () => setText(''));
  };

  const choose = (id: string) => router.push(`/clinic/whatsapp?p=${id}`);

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <Link href="/clinic" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {s.back}
      </Link>
      <h1 className="mt-3 text-2xl lg:text-3xl font-bold text-gray-900" style={heading}>{s.title}</h1>
      <p className="text-gray-500 mt-1">{s.subtitle}</p>

      <div role="note" className="mt-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-100 max-w-3xl">
        <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">{s.notice}</p>
      </div>

      {patients.length === 0 ? (
        <div className="mt-6 bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-xl text-center">
          <p className="text-gray-600">{s.noPatients}</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/clinic" className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600">{m.clinic.addPatient}</Link>
            <Link href="/settings" className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:border-emerald-300">{m.nav.settings}</Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid lg:grid-cols-[18rem_1fr] gap-6 items-start">
          {/* Patients: a list on large screens, a picker on phones */}
          <div className="lg:hidden">
            <label htmlFor="sim-patient" className="block text-xs font-semibold text-gray-500 mb-1.5">{s.patients}</label>
            <select
              id="sim-patient"
              value={selectedId ?? ''}
              onChange={(event) => choose(event.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm"
            >
              {patients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.nextAt ? ` · ${when(item.nextAt)}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-50">{s.patients}</p>
            <ul className="max-h-[36rem] overflow-y-auto divide-y divide-gray-50">
              {patients.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => choose(item.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${item.id === selectedId ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                  >
                    <span className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {initials(item.name)}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm truncate ${item.id === selectedId ? 'font-semibold text-emerald-800' : 'font-medium text-gray-800'}`}>{item.name}</span>
                      <span className="block text-xs text-gray-400 truncate">{item.nextAt ? when(item.nextAt) : s.noUpcomingShort}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* The patient's phone */}
          {patient && (
            <div className="w-full max-w-xl mx-auto lg:mx-0 rounded-[2rem] border-[10px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden">
              <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {initials(clinicName) || 'H'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{clinicName}</p>
                  <p className="text-[11px] text-emerald-100 truncate">
                    {s.phoneOf} {patient.name}{patient.phone ? ` · ${patient.phone}` : ''}
                  </p>
                </div>
              </div>

              {/* The appointment the conversation is about */}
              <div className="bg-white px-4 py-3 border-b border-gray-100">
                {appointments.length === 0 ? (
                  <p className="text-xs text-gray-500">{s.noUpcoming}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {appointments.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-xs">
                        <CalendarClock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700 truncate">
                          {when(item.startsAt)}{item.professional ? ` · ${item.professional}` : ''}
                        </span>
                        <span className={`ml-auto px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_STYLE[item.status]}`}>
                          {m.appointments.status[item.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {upcoming && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(['24h', '2h'] as const).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => sendReminder(kind)}
                        disabled={pending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#075E54] bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors disabled:opacity-60"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        {kind === '24h' ? s.send24h : s.send2h}
                      </button>
                    ))}
                  </div>
                )}
                {!patient.phone && <p className="mt-2 text-[11px] text-amber-700">{s.noPhone}</p>}
              </div>

              {/* Conversation */}
              <div
                className="h-[26rem] overflow-y-auto px-3 py-4 space-y-2"
                style={{ backgroundColor: '#ECE5DD', backgroundImage: 'radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
              >
                {messages.length === 0 && (
                  <p className="mx-auto max-w-xs text-center text-xs text-gray-600 bg-white/80 rounded-lg px-3 py-2">{s.empty}</p>
                )}
                {messages.map((message) => {
                  const mine = message.from === 'patient';
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm text-sm leading-snug ${
                          mine ? 'bg-[#DCF8C6] rounded-tr-none' : 'bg-white rounded-tl-none'
                        }`}
                      >
                        <p className={`whitespace-pre-wrap text-gray-800 ${message.text === null ? 'italic text-gray-500' : ''}`}>
                          {message.text ?? fmt(s.liveReminder, { kind: message.kind.replace(/^reminder_|_sent$|_failed$/g, '') })}
                        </p>
                        <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-400">
                          {message.simulated && <span className="uppercase tracking-wide">{s.simulated} ·</span>}
                          {clock(message.at)}
                          {mine && <CheckCheck className="w-3.5 h-3.5 text-sky-500" />}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* Replying as the patient */}
              <div className="bg-[#F0F0F0] px-3 py-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => sendReply(reply)}
                      disabled={pending}
                      className="px-3 py-1 rounded-full text-xs font-semibold text-[#075E54] bg-white border border-gray-200 hover:border-emerald-300 transition-colors disabled:opacity-60"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendReply(text);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={s.placeholder}
                    aria-label={s.placeholder}
                    maxLength={1000}
                    className="flex-1 min-w-0 px-4 py-2.5 rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={pending || !text.trim()}
                    aria-label={s.send}
                    className="w-10 h-10 rounded-full bg-[#075E54] text-white flex items-center justify-center hover:bg-[#064c45] transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {pending ? <Check className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
                {error && (
                  <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
