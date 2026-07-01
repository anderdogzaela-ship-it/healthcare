'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Heart, LayoutDashboard, MessageCircle, Activity, Settings,
  ChevronRight, Menu, Footprints, Flame, Timer, TrendingUp, LogOut
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Health Log', icon: Heart, path: '/health' },
  { label: 'AI Assistant', icon: MessageCircle, path: '/chat' },
  { label: 'Activity', icon: Activity, path: '/activity' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const weekData = [
  { day: 'Mon', steps: 7200, calories: 320, mins: 42 },
  { day: 'Tue', steps: 8500, calories: 410, mins: 55 },
  { day: 'Wed', steps: 5100, calories: 240, mins: 30 },
  { day: 'Thu', steps: 9800, calories: 490, mins: 68 },
  { day: 'Fri', steps: 6840, calories: 350, mins: 48 },
  { day: 'Sat', steps: 4300, calories: 210, mins: 25 },
  { day: 'Sun', steps: 7600, calories: 380, mins: 50 },
];

const maxSteps = Math.max(...weekData.map(d => d.steps));

const activities = [
  { type: 'Running', duration: '28 min', distance: '4.2 km', calories: 310, icon: '🏃', color: 'emerald', day: 'Today' },
  { type: 'Walking', duration: '20 min', distance: '1.8 km', calories: 90, icon: '🚶', color: 'blue', day: 'Today' },
  { type: 'Cycling', duration: '45 min', distance: '12 km', calories: 380, icon: '🚴', color: 'amber', day: 'Yesterday' },
  { type: 'Yoga', duration: '30 min', distance: '—', calories: 110, icon: '🧘', color: 'purple', day: 'Yesterday' },
];

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
};

export default function ActivityPage() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <span className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Activity</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Activity</h1>
            <p className="text-gray-500 mt-1">Your weekly movement overview</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Steps Today', value: '6,840', sub: '91% of goal', icon: Footprints, color: 'bg-amber-50', iconColor: 'text-amber-500' },
              { label: 'Calories Burned', value: '350', sub: 'kcal today', icon: Flame, color: 'bg-red-50', iconColor: 'text-red-500' },
              { label: 'Active Minutes', value: '48', sub: 'min today', icon: Timer, color: 'bg-blue-50', iconColor: 'text-blue-500' },
              { label: 'Weekly Trend', value: '+14%', sub: 'vs last week', icon: TrendingUp, color: 'bg-emerald-50', iconColor: 'text-emerald-500' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mb-3`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{card.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Weekly bar chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6" style={{ fontFamily: 'Nunito, sans-serif' }}>Steps This Week</h2>
            <div className="flex items-end gap-3 mb-2" style={{ height: '120px' }}>
              {weekData.map((d) => {
                const h = Math.round((d.steps / maxSteps) * 96);
                const isToday = d.day === 'Fri';
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 cursor-pointer ${isToday ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-emerald-400 to-emerald-300 hover:from-emerald-500 hover:to-emerald-400'}`}
                      style={{ height: `${h}px` }}
                    />
                    <span className={`text-xs font-medium ${isToday ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>{d.day}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-3 border-t border-gray-50 pt-3">
              {weekData.map(d => (
                <span key={d.day} className="flex-1 text-center">{(d.steps / 1000).toFixed(1)}k</span>
              ))}
            </div>
          </div>

          {/* Recent activities */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: 'Nunito, sans-serif' }}>Recent Activities</h2>
            <div className="space-y-3">
              {activities.map((act, i) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${colorMap[act.color]} hover:shadow-sm transition-all`}>
                  <span className="text-2xl">{act.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{act.type}</p>
                      <span className="text-xs text-gray-400">{act.day}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{act.duration} · {act.distance}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{act.calories}</p>
                    <p className="text-xs text-gray-400">kcal</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
