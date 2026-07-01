'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Heart, LayoutDashboard, MessageCircle, Activity, Settings,
  ChevronRight, Menu, Bell, Shield, User, Smartphone, ChevronDown, Check, LogOut
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Health Log', icon: Heart, path: '/health' },
  { label: 'AI Assistant', icon: MessageCircle, path: '/chat' },
  { label: 'Activity', icon: Activity, path: '/activity' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

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

export default function SettingsPage() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({ name: 'Sarah Johnson', email: 'sarah@example.com', dob: '1990-03-15', unit: 'metric' });
  const [notifs, setNotifs] = useState({ reminders: true, insights: true, weeklyReport: true, achievements: false });
  const [privacy, setPrivacy] = useState({ shareData: false, analytics: true });

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const sections = [
    { id: 'profile', label: 'Profile', icon: User, color: 'bg-blue-50 text-blue-500' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'bg-amber-50 text-amber-500' },
    { id: 'privacy', label: 'Privacy', icon: Shield, color: 'bg-purple-50 text-purple-500' },
    { id: 'devices', label: 'Connected Devices', icon: Smartphone, color: 'bg-emerald-50 text-emerald-500' },
  ];

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:static lg:translate-x-0 lg:h-full flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { window.location.href = item.path; }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                    : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">SJ</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Sarah Johnson</p>
              <p className="text-xs text-gray-400 truncate">Premium member</p>
            </div>
          </div>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Settings</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Settings</h1>
              <p className="text-gray-500 mt-1">Manage your account and preferences</p>
            </div>
            <button
              onClick={handleSave}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                saved
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200'
              }`}
            >
              {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
            </button>
          </div>

          <div className="max-w-2xl space-y-5">

            {/* Profile */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Profile</h2>
              </div>

              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xl">SJ</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Sarah Johnson</p>
                  <p className="text-xs text-gray-400 mt-0.5">Premium member · Joined Jan 2026</p>
                  <button className="text-xs text-emerald-600 font-medium mt-1 hover:text-emerald-700 transition-colors">Change photo</button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Date of Birth</label>
                  <input
                    type="date"
                    value={profile.dob}
                    onChange={e => setProfile({ ...profile, dob: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Units</label>
                  <div className="relative">
                    <select
                      value={profile.unit}
                      onChange={e => setProfile({ ...profile, unit: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white appearance-none transition-all"
                    >
                      <option value="metric">Metric (kg, km)</option>
                      <option value="imperial">Imperial (lb, mi)</option>
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
                <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Notifications</h2>
              </div>
              <div className="space-y-4">
                {[
                  { key: 'reminders', label: 'Daily health reminders', sub: 'Remind me to log vitals and activity' },
                  { key: 'insights', label: 'AI insights', sub: 'Get notified when new insights are ready' },
                  { key: 'weeklyReport', label: 'Weekly health report', sub: 'Receive a summary every Monday' },
                  { key: 'achievements', label: 'Achievements', sub: 'Celebrate health milestones' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                    </div>
                    <Toggle
                      on={notifs[item.key as keyof typeof notifs]}
                      onChange={() => setNotifs(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof notifs] }))}
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
                <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Privacy & Data</h2>
              </div>
              <div className="space-y-4">
                {[
                  { key: 'shareData', label: 'Share anonymised data', sub: 'Help improve HealthAI with anonymised usage data' },
                  { key: 'analytics', label: 'Usage analytics', sub: 'Allow performance and crash reporting' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                    </div>
                    <Toggle
                      on={privacy[item.key as keyof typeof privacy]}
                      onChange={() => setPrivacy(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof privacy] }))}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-xs text-purple-700 leading-relaxed">
                  Your health data is encrypted at rest and in transit. We never sell your personal information. See our full Privacy Policy for details.
                </p>
              </div>
            </div>

            {/* Connected devices */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-emerald-500" />
                </div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Connected Devices</h2>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Apple Health', status: 'Connected', icon: '🍎', connected: true },
                  { name: 'Fitbit', status: 'Not connected', icon: '⌚', connected: false },
                  { name: 'Google Fit', status: 'Not connected', icon: '🏃', connected: false },
                ].map(device => (
                  <div key={device.name} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{device.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{device.name}</p>
                        <p className={`text-xs mt-0.5 ${device.connected ? 'text-emerald-600' : 'text-gray-400'}`}>{device.status}</p>
                      </div>
                    </div>
                    <button className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      device.connected
                        ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                    }`}>
                      {device.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
