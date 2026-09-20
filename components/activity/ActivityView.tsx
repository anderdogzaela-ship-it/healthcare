'use client';

import Link from 'next/link';
import { Footprints, Flame, Timer, TrendingUp, ChevronRight, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { ActivityData } from '@/lib/data/health';
import type { Messages } from '@/lib/i18n/messages';

const exerciseIcons: Record<string, string> = {
  running: '🏃', walking: '🚶', cycling: '🚴', swimming: '🏊', yoga: '🧘', weightlifting: '🏋️', none: '⭐',
};

function weekdayIndex(isoDate: string): number {
  return (new Date(`${isoDate}T00:00:00`).getDay() + 6) % 7;
}

export default function ActivityView({ data, today }: { data: ActivityData; today: string }) {
  const { m, fmt, formatNumber, weekdayShort } = useI18n();
  const maxSteps = Math.max(...data.week.map((day) => day.steps), 1);
  const stepsPct = data.stepsGoal > 0 ? Math.round((data.stepsToday / data.stepsGoal) * 100) : 0;

  const cards = [
    { label: m.activity.stepsToday, value: formatNumber(data.stepsToday), sub: fmt(m.activity.ofGoal, { percent: stepsPct }), icon: Footprints, color: 'bg-amber-50', iconColor: 'text-amber-500' },
    { label: m.activity.caloriesBurned, value: formatNumber(data.caloriesToday), sub: m.activity.kcalToday, icon: Flame, color: 'bg-red-50', iconColor: 'text-red-500' },
    { label: m.activity.activeMinutes, value: formatNumber(data.activeMinutesToday), sub: m.activity.minToday, icon: Timer, color: 'bg-blue-50', iconColor: 'text-blue-500' },
    {
      label: m.activity.weeklyTrend,
      value: data.weeklyChangePct === null ? '—' : `${data.weeklyChangePct >= 0 ? '+' : ''}${formatNumber(data.weeklyChangePct)}%`,
      sub: m.activity.vsLastWeek,
      icon: TrendingUp, color: 'bg-emerald-50', iconColor: 'text-emerald-500',
    },
  ];

  const exerciseLabel = (type: string) => {
    const key = type as keyof Messages['exercise'];
    return m.exercise[key] ?? type;
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.activity.title}</h1>
        <p className="text-gray-500 mt-1">{m.activity.subtitle}</p>
      </div>

      {!data.hasAnyData && (
        <div className="mb-8 bg-white rounded-2xl p-8 border border-emerald-100 shadow-sm text-center animate-slide-up">
          <div className="w-14 h-14 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.activity.empty.title}</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">{m.activity.empty.description}</p>
          <Link
            href="/health"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-200 hover:shadow-xl transition-all transform hover:scale-[1.03]"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            {m.dashboard.logHealth.title}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
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
          {data.week.map((day) => {
            const isToday = day.date === today;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  title={formatNumber(day.steps)}
                  className={`w-full rounded-t-lg transition-all duration-300 ${isToday ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-gradient-to-t from-emerald-400 to-emerald-300 hover:from-emerald-500 hover:to-emerald-400'}`}
                  style={{ height: `${Math.max(Math.round((day.steps / maxSteps) * 96), 4)}px` }}
                />
                <span className={`text-xs font-medium ${isToday ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                  {weekdayShort(weekdayIndex(day.date))}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-3 border-t border-gray-50 pt-3">
          {data.week.map((day) => (
            <span key={day.date} className="flex-1 text-center">
              {day.steps > 0 ? formatNumber(day.steps, { notation: 'compact', maximumFractionDigits: 1 }) : '—'}
            </span>
          ))}
        </div>
      </div>

      {/* Recent activities */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-5" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.activity.recentActivities}</h2>
        {data.recent.length === 0 ? (
          <p className="text-sm text-gray-400">{m.activity.noActivities}</p>
        ) : (
          <div className="space-y-3">
            {data.recent.map((session) => (
              <div key={session.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:shadow-sm transition-all">
                <span className="text-2xl">{exerciseIcons[session.exerciseType] ?? '⭐'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{exerciseLabel(session.exerciseType)}</p>
                    <span className="text-xs text-gray-400">
                      {session.recordedOn === today ? m.common.today : session.recordedOn}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {session.durationMin !== null ? fmt(m.common.minutes, { minutes: session.durationMin }) : '—'}
                    {session.distanceM !== null && ` · ${fmt(m.common.km, { km: session.distanceM / 1000 })}`}
                  </p>
                </div>
                {session.calories !== null && (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{formatNumber(session.calories)}</p>
                    <p className="text-xs text-gray-400">kcal</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
