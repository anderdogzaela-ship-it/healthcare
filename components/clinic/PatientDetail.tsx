'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, Mail, Cake, CalendarPlus, NotebookPen, AlertCircle, Clock
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { addPatientNote, createClinicAppointment, updatePatientStatus } from '@/app/actions/clinic';
import type { Messages } from '@/lib/i18n/messages';

type PatientStatus = keyof Messages['clinic']['statuses'];
type AppointmentStatus = keyof Messages['appointments']['status'];

export interface PatientDetailData {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  status: PatientStatus;
}

export interface PatientNote {
  id: string;
  body: string;
  createdAt: string;
}

export interface PatientAppointment {
  id: string;
  startsAt: string;
  professional: string;
  status: AppointmentStatus;
}

export default function PatientDetail({
  patient,
  notes,
  appointments,
}: {
  patient: PatientDetailData;
  notes: PatientNote[];
  appointments: PatientAppointment[];
}) {
  const { m, formatDate } = useI18n();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (work: () => Promise<{ status: string }>) => {
    setFailed(false);
    startTransition(async () => {
      const result = await work();
      if (result.status === 'ok') router.refresh();
      else setFailed(true);
    });
  };

  const changeStatus = (status: PatientStatus) => {
    const formData = new FormData();
    formData.set('id', patient.id);
    formData.set('status', status);
    run(() => updatePatientStatus(formData));
  };

  const submitNote = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('patientId', patient.id);
    run(async () => {
      const result = await addPatientNote(formData);
      if (result.status === 'ok') form.reset();
      return result;
    });
  };

  const submitBooking = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('patientId', patient.id);
    formData.set('timezoneOffset', String(new Date().getTimezoneOffset()));
    run(async () => {
      const result = await createClinicAppointment(formData);
      if (result.status === 'ok') setShowBooking(false);
      return result;
    });
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all';

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <Link href="/clinic" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {m.clinic.backToPatients}
      </Link>

      <div className="mt-4 max-w-3xl space-y-6">
        {failed && (
          <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{m.clinic.saveError}</p>
          </div>
        )}

        {/* Patient card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                <span className="text-white text-lg font-bold">
                  {patient.fullName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{patient.fullName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  {patient.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{patient.phone}</span>}
                  {patient.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{patient.email}</span>}
                  {patient.dateOfBirth && (
                    <span className="flex items-center gap-1">
                      <Cake className="w-3 h-3" />
                      {formatDate(new Date(`${patient.dateOfBirth}T00:00:00`), { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="patient-status" className="sr-only">{m.clinic.status}</label>
              <select
                id="patient-status"
                value={patient.status}
                disabled={pending}
                onChange={(event) => changeStatus(event.target.value as PatientStatus)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {(['lead', 'active', 'inactive', 'archived'] as PatientStatus[]).map((status) => (
                  <option key={status} value={status}>{m.clinic.statuses[status]}</option>
                ))}
              </select>
              <button
                onClick={() => setShowBooking(!showBooking)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all"
              >
                <CalendarPlus className="w-4 h-4" />
                {m.clinic.bookFor}
              </button>
            </div>
          </div>

          {showBooking && (
            <form onSubmit={submitBooking} className="mt-6 pt-6 border-t border-gray-50 grid sm:grid-cols-3 gap-4 animate-slide-up">
              <div>
                <label htmlFor="a-date" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.appointments.date}</label>
                <input id="a-date" name="date" type="date" required className={inputClass} />
              </div>
              <div>
                <label htmlFor="a-time" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.appointments.time}</label>
                <input id="a-time" name="time" type="time" required className={inputClass} />
              </div>
              <div>
                <label htmlFor="a-duration" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.appointments.duration}</label>
                <input id="a-duration" name="durationMin" type="number" min={5} max={480} step={5} defaultValue={30} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="a-professional" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.appointments.professional}</label>
                <input id="a-professional" name="professional" type="text" placeholder={m.appointments.professionalPlaceholder} className={inputClass} />
              </div>
              <div>
                <label htmlFor="a-location" className="block text-xs font-semibold text-gray-600 mb-1.5">{m.appointments.location}</label>
                <input id="a-location" name="location" type="text" className={inputClass} />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg shadow-emerald-200 transition-all disabled:opacity-70"
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                >
                  {pending ? m.appointments.saving : m.appointments.save}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.clinic.appointmentsTitle}</h2>
          {appointments.length === 0 ? (
            <p className="text-sm text-gray-400">{m.clinic.noAppointments}</p>
          ) : (
            <ul className="space-y-3">
              {appointments.map((appointment) => (
                <li key={appointment.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(new Date(appointment.startsAt), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {appointment.professional && <p className="text-xs text-gray-400">{appointment.professional}</p>}
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{m.appointments.status[appointment.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
            <NotebookPen className="w-4 h-4 text-gray-400" />
            {m.clinic.notesTitle}
          </h2>

          <form onSubmit={submitNote} className="space-y-3">
            <textarea
              name="body"
              required
              rows={3}
              placeholder={m.clinic.notePlaceholder}
              aria-label={m.clinic.addNote}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
            />
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all disabled:opacity-70"
            >
              {m.clinic.addNote}
            </button>
          </form>

          {notes.length === 0 ? (
            <p className="mt-5 text-sm text-gray-400">{m.clinic.noNotes}</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {notes.map((note) => (
                <li key={note.id} className="relative pl-5 border-l-2 border-emerald-100">
                  <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                  <p className="text-xs text-gray-400">
                    {formatDate(new Date(note.createdAt), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{note.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
