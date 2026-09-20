'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarPlus, Calendar, Clock, MapPin, User, Check, X,
  AlertCircle, MessageCircle, BellRing
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { createAppointment, cancelAppointment, confirmAppointment } from '@/app/actions/appointments';
import type { Messages } from '@/lib/i18n/messages';

type Status = keyof Messages['appointments']['status'];
type ReminderKind = keyof Messages['appointments']['reminderKinds'];
type ReminderState = keyof Messages['appointments']['reminderStatus'];

export interface AppointmentReminder {
  id: string;
  kind: ReminderKind;
  status: ReminderState;
  sendAt: string;
}

export interface AppointmentItem {
  id: string;
  startsAt: string;
  durationMin: number;
  professional: string;
  location: string | null;
  reason: string | null;
  status: Status;
  reminders: AppointmentReminder[];
}

const statusStyles: Record<Status, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  completed: 'bg-gray-50 text-gray-600 border-gray-200',
  no_show: 'bg-amber-50 text-amber-700 border-amber-100',
};

const reminderStyles: Record<ReminderState, string> = {
  pending: 'text-gray-500 bg-gray-50 border-gray-200',
  sent: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  failed: 'text-red-600 bg-red-50 border-red-100',
  skipped: 'text-gray-400 bg-gray-50 border-gray-200',
};

export default function AppointmentsView({
  upcoming,
  past,
  hasPhone,
}: {
  upcoming: AppointmentItem[];
  past: AppointmentItem[];
  hasPhone: boolean;
}) {
  const { m, fmt, formatDate } = useI18n();
  const router = useRouter();
  const [showForm, setShowForm] = useState(upcoming.length === 0);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailed(false);
    const formData = new FormData(event.currentTarget);
    // The browser knows the user's real offset; the server stores UTC.
    formData.set('timezoneOffset', String(new Date().getTimezoneOffset()));

    startTransition(async () => {
      const result = await createAppointment(formData);
      if (result.status === 'ok') {
        setShowForm(false);
        router.refresh();
      } else {
        setFailed(true);
      }
    });
  };

  const act = (action: typeof confirmAppointment, id: string) => {
    const formData = new FormData();
    formData.set('id', id);
    startTransition(async () => {
      await action(formData);
      router.refresh();
    });
  };

  const dateTime = (iso: string) =>
    formatDate(new Date(iso), {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });

  const renderCard = (appointment: AppointmentItem, isPast: boolean) => (
    <div key={appointment.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {dateTime(appointment.startsAt)}
            </p>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyles[appointment.status]}`}>
              {m.appointments.status[appointment.status]}
            </span>
          </div>
          <div className="mt-2 space-y-1 text-sm text-gray-500">
            {appointment.professional && (
              <p className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-400" />{appointment.professional}</p>
            )}
            {appointment.location && (
              <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400" />{appointment.location}</p>
            )}
            <p className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {fmt(m.common.minutes, { minutes: appointment.durationMin })}
            </p>
            {appointment.reason && <p className="text-gray-400">{appointment.reason}</p>}
          </div>
        </div>

        {!isPast && appointment.status !== 'cancelled' && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            {appointment.status !== 'confirmed' && (
              <button
                onClick={() => act(confirmAppointment, appointment.id)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                {m.appointments.confirm}
              </button>
            )}
            <button
              onClick={() => act(cancelAppointment, appointment.id)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors disabled:opacity-60"
            >
              <X className="w-3.5 h-3.5" />
              {m.appointments.cancel}
            </button>
          </div>
        )}
      </div>

      {appointment.reminders.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5" />
            {m.appointments.remindersTitle}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {appointment.reminders.map((reminder) => (
              <span
                key={reminder.id}
                className={`text-xs px-2.5 py-1 rounded-full border ${reminderStyles[reminder.status]}`}
                title={formatDate(new Date(reminder.sendAt), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              >
                {m.appointments.reminderKinds[reminder.kind]} · {m.appointments.reminderStatus[reminder.status]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all';

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.appointments.title}</h1>
          <p className="text-gray-500 mt-1">{m.appointments.subtitle}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all flex-shrink-0"
        >
          <CalendarPlus className="w-4 h-4" />
          {m.appointments.book}
        </button>
      </div>

      {!hasPhone && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100 max-w-3xl">
          <MessageCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            {m.appointments.whatsappNeeded}{' '}
            <Link href="/settings" className="font-semibold underline hover:no-underline">{m.nav.settings}</Link>
          </p>
        </div>
      )}

      <div className="max-w-3xl space-y-6">
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-slide-up">
            <h2 className="font-bold text-gray-900 mb-5" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.appointments.bookTitle}</h2>

            {failed && (
              <div role="alert" className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{m.appointments.saveError}</p>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.appointments.date}</label>
                <input id="date" name="date" type="date" required className={inputClass} />
              </div>
              <div>
                <label htmlFor="time" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.appointments.time}</label>
                <input id="time" name="time" type="time" required className={inputClass} />
              </div>
              <div>
                <label htmlFor="durationMin" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.appointments.duration}</label>
                <input id="durationMin" name="durationMin" type="number" min={5} max={480} step={5} defaultValue={30} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="professional" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.appointments.professional}</label>
                <input id="professional" name="professional" type="text" placeholder={m.appointments.professionalPlaceholder} className={inputClass} />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="location" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.appointments.location}</label>
                <input id="location" name="location" type="text" placeholder={m.appointments.locationPlaceholder} className={inputClass} />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="reason" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.appointments.reason}</label>
                <input id="reason" name="reason" type="text" placeholder={m.appointments.reasonPlaceholder} className={inputClass} />
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-5 w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              {pending ? m.appointments.saving : m.appointments.save}
            </button>
          </form>
        )}

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">{m.appointments.upcoming}</h2>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-300" />
              <p className="text-sm text-gray-400">{m.appointments.none}</p>
            </div>
          ) : (
            <div className="space-y-3">{upcoming.map((appointment) => renderCard(appointment, false))}</div>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">{m.appointments.past}</h2>
            <div className="space-y-3">{past.map((appointment) => renderCard(appointment, true))}</div>
          </section>
        )}
      </div>
    </main>
  );
}
