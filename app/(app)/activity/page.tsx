'use client';

import { Footprints, Flame, Timer, TrendingUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { Messages } from '@/lib/i18n/messages';

// Monday first; index 4 (Friday) is shown as today in the demo.
const weekData = [
  { steps: 7200, calories: 320, mins: 42 },
  { steps: 8500, calories: 410, mins: 55 },
  { steps: 5100, calories: 240, mins: 30 },
  { steps: 9800, calories: 490, mins: 68 },
  { steps: 6840, calories: 350, mins: 48 },
  { steps: 4300, calories: 210, mins: 25 },
  { steps: 7600, calories: 380, mins: 50 },
];
const todayIndex = 4;

const maxSteps = Math.max(...weekData.map(d => d.steps));

const activities: {
  type: keyof Messages['exercise'];
  durationMin: number;
  distanceKm: number | null;
  calories: number;
  icon: string;
  color: string;
  daysAgo: 0 | 1;
}[] = [
  { type: 'running', durationMin: 28, distanceKm: 4.2, calories: 310, icon: '🏃', color: 'emerald', daysAgo: 0 },
  { type: 'walking', durationMin: 20, distanceKm: 1.8, calories: 90, icon: '🚶', color: 'blue', daysAgo: 0 },
  { type: 'cycling', durationMin: 45, distanceKm: 12, calories: 380, icon: '🚴', color: 'amber', daysAgo: 1 },
  { type: 'yoga', durationMin: 30, distanceKm: null, calories: 110, icon: '🧘', color: 'purple', daysAgo: 1 },
];

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100',
};

export default function ActivityPage() {
  const { m, fmt, formatNumber, weekdayShort } = useI18n();

  const summaryCards = [
    { label: m.activity.stepsToday, value: formatNumber(6840), sub: fmt(m.activity.ofGoal, { percent: 91 }), icon: Footprints, color: 'bg-amber-50', iconColor: 'text-amber-500' },
    { label: m.activity.caloriesBurned, value: formatNumber(350), sub: m.activity.kcalToday, icon: Flame, color: 'bg-red-50', iconColor: 'text-red-500' },
    { label: m.activity.activeMinutes, value: formatNumber(48), sub: m.activity.minToday, icon: Timer, color: 'bg-blue-50', iconColor: 'text-blue-500' },
    { label: m.activity.weeklyTrend, value: '+14%', sub: m.activity.vsLastWeek, icon: TrendingUp, color: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  ];

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.activity.title}</h1>
        <p className="text-gray-500 mt-1">{m.activity.subtitle}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map(card => (
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
        <h2 className="text-lg font-bold text-gray-900 mb-6" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.activity.stepsThisWeek}</h2>
        <div className="flex items-end gap-3 mb-2" style={{ height: '120px' }}>
          {weekData.map((d, i) => {
            const h = Math.round((d.steps / maxSteps) * 96);
            const isToday = i === todayIndex;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-full rounded-t-lg transition-all duration-300 cursor-pointer ${isToday ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-emerald-400 to-emerald-300 hover:from-emerald-500 hover:to-emerald-400'}`}
                  style={{ height: `${h}px` }}
                />
                <span className={`text-xs font-medium ${isToday ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>{weekdayShort(i)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-3 border-t border-gray-50 pt-3">
          {weekData.map((d, i) => (
            <span key={i} className="flex-1 text-center">
              {formatNumber(d.steps, { notation: 'compact', maximumFractionDigits: 1 })}
            </span>
          ))}
        </div>
      </div>

      {/* Recent activities */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.activity.recentActivities}</h2>
        <div className="space-y-3">
          {activities.map((act, i) => (
            <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${colorMap[act.color]} hover:shadow-sm transition-all`}>
              <span className="text-2xl">{act.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{m.exercise[act.type]}</p>
                  <span className="text-xs text-gray-400">{act.daysAgo === 0 ? m.common.today : m.common.yesterday}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fmt(m.common.minutes, { minutes: act.durationMin })} · {act.distanceKm === null ? '—' : fmt(m.common.km, { km: act.distanceKm })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900">{formatNumber(act.calories)}</p>
                <p className="text-xs text-gray-400">kcal</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
