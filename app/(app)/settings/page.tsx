'use client';

import { useState } from 'react';
import { Bell, Shield, User, Smartphone, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { locales, localeNames, type Locale } from '@/lib/i18n/config';

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${on ? 'bg-emerald-500' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

const notificationKeys = ['reminders', 'insights', 'weeklyReport', 'achievements'] as const;
const privacyKeys = ['shareData', 'analytics'] as const;

const devices = [
  { name: 'Apple Health', icon: '🍎', connected: true },
  { name: 'Fitbit', icon: '⌚', connected: false },
  { name: 'Google Fit', icon: '🏃', connected: false },
];

export default function SettingsPage() {
  const { m, fmt, formatDate, locale, setLocale } = useI18n();
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({ name: 'Sarah Johnson', email: 'sarah@example.com', dob: '1990-03-15', unit: 'metric' });
  const [notifs, setNotifs] = useState({ reminders: true, insights: true, weeklyReport: true, achievements: false });
  const [privacy, setPrivacy] = useState({ shareData: false, analytics: true });

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all';
  const selectClass = `${inputClass} bg-white appearance-none`;

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.settings.title}</h1>
          <p className="text-gray-500 mt-1">{m.settings.subtitle}</p>
        </div>
        <button
          onClick={handleSave}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
            saved
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200'
          }`}
        >
          {saved ? <><Check className="w-4 h-4" /> {m.settings.saved}</> : m.settings.save}
        </button>
      </div>

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
              <span className="text-white font-bold text-xl">SJ</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Sarah Johnson</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {fmt(m.settings.membership, {
                  plan: m.common.premiumMember,
                  date: formatDate(new Date(2026, 0, 1), { month: 'short', year: 'numeric' }),
                })}
              </p>
              <button className="text-xs text-emerald-600 font-medium mt-1 hover:text-emerald-700 transition-colors">{m.settings.changePhoto}</button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.fullName}</label>
              <input
                type="text"
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.email}</label>
              <input
                type="email"
                value={profile.email}
                onChange={e => setProfile({ ...profile, email: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.dateOfBirth}</label>
              <input
                type="date"
                value={profile.dob}
                onChange={e => setProfile({ ...profile, dob: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.units}</label>
              <div className="relative">
                <select
                  value={profile.unit}
                  onChange={e => setProfile({ ...profile, unit: e.target.value })}
                  className={selectClass}
                >
                  <option value="metric">{m.settings.metric}</option>
                  <option value="imperial">{m.settings.imperial}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{m.settings.language}</label>
              <div className="relative">
                {/* Applies immediately; not part of "Save Changes". */}
                <select
                  value={locale}
                  onChange={e => setLocale(e.target.value as Locale)}
                  className={selectClass}
                >
                  {locales.map((l) => (
                    <option key={l} value={l}>{localeNames[l]}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
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
            {notificationKeys.map(key => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.settings.notificationItems[key].label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.settings.notificationItems[key].description}</p>
                </div>
                <Toggle
                  on={notifs[key]}
                  onChange={() => setNotifs(prev => ({ ...prev, [key]: !prev[key] }))}
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
            {privacyKeys.map(key => (
              <div key={key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.settings.privacyItems[key].label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.settings.privacyItems[key].description}</p>
                </div>
                <Toggle
                  on={privacy[key]}
                  onChange={() => setPrivacy(prev => ({ ...prev, [key]: !prev[key] }))}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-xs text-purple-700 leading-relaxed">{m.settings.privacyNote}</p>
          </div>
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
            {devices.map(device => (
              <div key={device.name} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{device.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{device.name}</p>
                    <p className={`text-xs mt-0.5 ${device.connected ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {device.connected ? m.settings.connected : m.settings.notConnected}
                    </p>
                  </div>
                </div>
                <button className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  device.connected
                    ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-100'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                }`}>
                  {device.connected ? m.settings.disconnect : m.settings.connect}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
