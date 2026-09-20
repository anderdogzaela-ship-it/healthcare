'use client';

import { useState, useTransition } from 'react';
import {
  Bell, Shield, User, Smartphone, ChevronDown, Check, Target, AlertCircle,
  Download, Trash2
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';
import { updateSettings } from '@/app/actions/settings';
import { deleteAccount } from '@/app/actions/account';

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 ${on ? 'bg-emerald-500' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

const notificationKeys = ['reminders', 'insights', 'weeklyReport', 'achievements'] as const;
const privacyKeys = ['shareData', 'analytics'] as const;

const devices = [
  { name: 'Apple Health', icon: '🍎', connected: false },
  { name: 'Fitbit', icon: '⌚', connected: false },
  { name: 'Google Fit', icon: '🏃', connected: false },
];

export interface SettingsFormData {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  unitSystem: 'metric' | 'imperial';
  timezone: string;
  plan: string;
  memberSince: string;
  notifications: Record<(typeof notificationKeys)[number], boolean>;
  privacy: Record<(typeof privacyKeys)[number], boolean>;
  stepsGoal: number;
  sleepGoal: number;
}

export default function SettingsForm({ initial }: { initial: SettingsFormData }) {
  const { m, fmt, formatDate, locale, setLocale } = useI18n();
  const [profile, setProfile] = useState({
    fullName: initial.fullName,
    phone: initial.phone,
    dateOfBirth: initial.dateOfBirth,
    unitSystem: initial.unitSystem,
    timezone: initial.timezone,
  });
  const [goals, setGoals] = useState({ steps: String(initial.stepsGoal), sleep: String(initial.sleepGoal) });
  const [notifs, setNotifs] = useState(initial.notifications);
  const [privacy, setPrivacy] = useState(initial.privacy);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();

  const handleDelete = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeleteError(null);
    const formData = new FormData(event.currentTarget);

    startDeleting(async () => {
      // On success the action signs the user out and redirects.
      const result = await deleteAccount(formData);
      if (result?.status === 'error') {
        setDeleteError(
          result.reason === 'mismatch' ? m.settings.deleteMismatch
          : result.reason === 'soleOwner' ? m.settings.deleteSoleOwner
          : m.settings.deleteFailed
        );
      }
    });
  };

  const handleSave = () => {
    setFailed(false);

    const formData = new FormData();
    formData.set('fullName', profile.fullName);
    formData.set('phone', profile.phone);
    formData.set('dateOfBirth', profile.dateOfBirth);
    formData.set('unitSystem', profile.unitSystem);
    formData.set('timezone', profile.timezone);
    formData.set('locale', locale);
    formData.set('stepsGoal', goals.steps);
    formData.set('sleepGoal', goals.sleep);
    notificationKeys.forEach((key) => formData.set(key, String(notifs[key])));
    privacyKeys.forEach((key) => formData.set(key, String(privacy[key])));

    startTransition(async () => {
      const result = await updateSettings(formData);
      if (result.status === 'ok') {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setFailed(true);
      }
    });
  };

  const initials = profile.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all';
  const selectClass = `${inputClass} bg-white appearance-none`;

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.settings.title}</h1>
          <p className="text-gray-500 mt-1">{m.settings.subtitle}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={pending}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-70 ${
            saved
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200'
          }`}
        >
          {saved ? <><Check className="w-4 h-4" /> {m.settings.saved}</> : m.settings.save}
        </button>
      </div>

      {failed && (
        <div role="alert" className="max-w-2xl mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{m.settings.saveError}</p>
        </div>
      )}

      <div className="max-w-2xl space-y-5">
        {/* Profile */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.settings.profile}</h2>
          </div>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-xl">{initials}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{profile.fullName || initial.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fmt(m.settings.membership, {
                  plan: initial.plan,
                  date: formatDate(new Date(initial.memberSince), { month: 'short', year: 'numeric' }),
                })}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="full-name" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.fullName}</label>
              <input
                id="full-name"
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.email}</label>
              {/* Changing the sign-in email needs its own verification flow. */}
              <input id="email" type="email" value={initial.email} readOnly className={`${inputClass} bg-gray-50 text-gray-500`} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="phone" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.phone}</label>
              <input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+55 11 99999-9999"
                className={inputClass}
              />
              <p className="text-xs text-gray-400 mt-1.5">{m.settings.phoneHint}</p>
            </div>
            <div>
              <label htmlFor="dob" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.dateOfBirth}</label>
              <input
                id="dob"
                type="date"
                value={profile.dateOfBirth}
                onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="units" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.units}</label>
              <div className="relative">
                <select
                  id="units"
                  value={profile.unitSystem}
                  onChange={(e) => setProfile({ ...profile, unitSystem: e.target.value as 'metric' | 'imperial' })}
                  className={selectClass}
                >
                  <option value="metric">{m.settings.metric}</option>
                  <option value="imperial">{m.settings.imperial}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label htmlFor="language" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.language}</label>
              <div className="relative">
                <select
                  id="language"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                  className={selectClass}
                >
                  {locales.map((l) => (
                    <option key={l} value={l}>{localeNames[l]}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label htmlFor="timezone" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.timezone}</label>
              <input
                id="timezone"
                type="text"
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                placeholder="America/Sao_Paulo"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.settings.goalsTitle}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="steps-goal" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.stepsGoal}</label>
              <input
                id="steps-goal"
                type="number"
                min={1000}
                max={50000}
                step={500}
                value={goals.steps}
                onChange={(e) => setGoals({ ...goals, steps: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="sleep-goal" className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.sleepGoal}</label>
              <input
                id="sleep-goal"
                type="number"
                min={4}
                max={12}
                step={0.5}
                value={goals.sleep}
                onChange={(e) => setGoals({ ...goals, sleep: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.settings.notificationsTitle}</h2>
          </div>
          <div className="space-y-4">
            {notificationKeys.map((key) => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.settings.notificationItems[key].label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.settings.notificationItems[key].description}</p>
                </div>
                <Toggle
                  on={notifs[key]}
                  label={m.settings.notificationItems[key].label}
                  onChange={() => setNotifs((prev) => ({ ...prev, [key]: !prev[key] }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-500" />
            </div>
            <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.settings.privacyTitle}</h2>
          </div>
          <div className="space-y-4">
            {privacyKeys.map((key) => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.settings.privacyItems[key].label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.settings.privacyItems[key].description}</p>
                </div>
                <Toggle
                  on={privacy[key]}
                  label={m.settings.privacyItems[key].label}
                  onChange={() => setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-xs text-purple-700 leading-relaxed">{m.settings.privacyNote}</p>
          </div>
        </div>

        {/* Your data */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.settings.dataTitle}</h2>
          </div>
          <p className="text-sm text-gray-500">{m.settings.exportHint}</p>
          <a
            href="/api/account/export"
            download
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition-all"
          >
            <Download className="w-4 h-4" />
            {m.settings.exportButton}
          </a>
        </div>

        {/* Delete account */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.settings.dangerTitle}</h2>
          </div>
          <p className="text-sm text-gray-500">{m.settings.dangerHint}</p>

          {deleteError && (
            <div role="alert" className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{deleteError}</p>
            </div>
          )}

          <form onSubmit={handleDelete} className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label htmlFor="confirm-email" className="block text-xs font-semibold text-gray-500 mb-1.5">
                {fmt(m.settings.deleteConfirmLabel, { email: initial.email })}
              </label>
              <input
                id="confirm-email"
                name="confirmEmail"
                type="email"
                required
                value={confirmEmail}
                onChange={(event) => setConfirmEmail(event.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={deleting || confirmEmail.trim().toLowerCase() !== initial.email.toLowerCase()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {deleting ? m.settings.deleting : m.settings.deleteButton}
            </button>
          </form>
        </div>

        {/* Connected devices */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.settings.devicesTitle}</h2>
          </div>
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.name} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{device.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{device.name}</p>
                    <p className="text-xs mt-0.5 text-gray-400">{m.settings.notConnected}</p>
                  </div>
                </div>
                {/* Device sync is not built yet, so this stays disabled rather
                    than pretending to connect. */}
                <button
                  disabled
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                >
                  {m.settings.connect}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
