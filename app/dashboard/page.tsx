'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Heart, MessageCircle, Activity, Settings,
  Moon, TrendingUp, TrendingDown, Droplets, ChevronRight,
  Bell, Menu, X, Zap, Footprints
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Health Log', icon: Heart, path: '/health' },
  { label: 'AI Assistant', icon: MessageCircle, path: '/chat' },
  { label: 'Activity', icon: Activity, path: '/activity' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const activityBars = [
  { day: 'Mon', height: 60 },
  { day: 'Tue', height: 80 },
  { day: 'Wed', height: 45 },
  { day: 'Thu', height: 90 },
  { day: 'Fri', height: 70 },
  { day: 'Sat', height: 55 },
  { day: 'Sun', height: 75 },
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');
  const [today, setToday] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
    setToday(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:static lg:translate-x-0 lg:h-full flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI</span>
          </div>
        </div>

        {/* Nav */}
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

        {/* User area */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">SJ</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Sarah Johnson</p>
              <p className="text-xs text-gray-400 truncate">Premium member</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile top nav */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>HealthAI</span>
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
          {/* Welcome banner */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {greeting}, Sarah
              </h1>
              <p className="text-gray-500 mt-1">{today} — Here is your health overview</p>
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <button className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all relative">
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center cursor-pointer">
                <span className="text-white font-bold text-sm">SJ</span>
              </div>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Heart Rate */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3" /> +2%
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>72 <span className="text-base font-normal text-gray-400">bpm</span></p>
              <p className="text-xs text-gray-500 mt-1">Heart Rate</p>
              <p className="text-xs text-gray-400 mt-1">+2% from yesterday</p>
            </div>

            {/* Steps */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Footprints className="w-5 h-5 text-amber-500" />
                </div>
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">
                  91%
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>6,840</p>
              <p className="text-xs text-gray-500 mt-1">Steps Today</p>
              <p className="text-xs text-gray-400 mt-1">91% of daily goal</p>
            </div>

            {/* Sleep */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Moon className="w-5 h-5 text-purple-500" />
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3" /> +12%
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>7h 20m</p>
              <p className="text-xs text-gray-500 mt-1">Sleep</p>
              <p className="text-xs text-gray-400 mt-1">+12% this week</p>
            </div>

            {/* Blood Pressure */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-500" />
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                  Optimal
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>118/76</p>
              <p className="text-xs text-gray-500 mt-1">Blood Pressure</p>
              <p className="text-xs text-gray-400 mt-1">Optimal range</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* AI Insights */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>AI Health Insights</h2>
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-4 border-l-4 border-emerald-500 shadow-sm hover:shadow-md transition-all">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Sleep improvement detected</p>
                  <p className="text-xs text-gray-500">Your sleep quality has improved by 12% this week. Consistent bedtime routines are showing positive results.</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border-l-4 border-amber-500 shadow-sm hover:shadow-md transition-all">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Hydration goal needs attention</p>
                  <p className="text-xs text-gray-500">Your hydration logs have been below target for 3 consecutive days. Aim for 8 glasses of water daily.</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-all">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Cardiovascular health is excellent</p>
                  <p className="text-xs text-gray-500">Your resting heart rate of 72 bpm and blood pressure 118/76 are both in the optimal range.</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => { window.location.href = '/health'; }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl p-4 flex items-center gap-3 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-200 transform hover:scale-[1.02]"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>Log Health Data</p>
                    <p className="text-xs text-emerald-100">Record vitals & symptoms</p>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>

                <button
                  onClick={() => { window.location.href = '/chat'; }}
                  className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-2xl p-4 flex items-center gap-3 hover:from-amber-500 hover:to-amber-600 transition-all shadow-md shadow-amber-200 hover:shadow-lg hover:shadow-amber-200 transform hover:scale-[1.02]"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>Ask AI Assistant</p>
                    <p className="text-xs text-amber-100">Get health insights</p>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            </div>
          </div>

          {/* Activity chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-6" style={{ fontFamily: 'Nunito, sans-serif' }}>7-Day Activity</h2>
            <div className="flex items-end gap-3" style={{ height: '120px' }}>
              {activityBars.map((bar) => (
                <div key={bar.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-300 hover:from-emerald-600 hover:to-emerald-500 cursor-pointer"
                    style={{ height: `${bar.height}px` }}
                  />
                  <span className="text-xs text-gray-400 font-medium">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
