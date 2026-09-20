'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Heart, MessageCircle, Moon, TrendingUp, TrendingDown, ChevronRight,
  Bell, Zap, Footprints, Sparkles
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { DashboardData } from '@/lib/data/health';

function weekdayIndex(isoDate: string): number {
  // Monday = 0, matching the weekdayShort helper.
  return (new Date(`${isoDate}T00:00:00`).getDay() + 6) % 7;
}

export default function DashboardView({ data, firstName }: { data: DashboardData; firstName: string }) {
  const { m, fmt, formatNumber, formatDate, weekdayShort } = useI18n();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const hour = now?.getHours() ?? 0;
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const today = now ? formatDate(now, { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  const stepsPct = data.stepsGoal > 0 ? Math.round((data.stepsToday / data.stepsGoal) * 100) : 0;
  const maxSteps = Math.max(...data.weeklySteps.map((day) => day.steps), 1);

  // Insights are derived from the user's own numbers, reusing the same
  // wording as the health log analysis.
  const insights: { key: string; body: string; border: string }[] = [];
  if (data.heartRate) {
    const hr = data.heartRate.value;
    const body =
      hr < 60 ? fmt(m.health.analysis.heartRateLow, { heartRate: hr })
      : hr <= 100 ? fmt(m.health.analysis.heartRateNormal, { heartRate: hr })
      : fmt(m.health.analysis.heartRateHigh, { heartRate: hr });
    insights.push({ key: 'hr', body, border: 'border-blue-500' });
  }
  if (data.stepsToday > 0) {
    insights.push({
      key: 'steps',
      body: fmt(m.health.analysis.steps, { steps: data.stepsToday, percent: stepsPct, goal: data.stepsGoal }),
      border: 'border-amber-500',
    });
  }
  if (data.sleep) {
    const hours = data.sleep.value;
    const body =
      hours >= 7 && hours <= 9 ? fmt(m.health.analysis.sleepGood, { hours })
      : hours < 7 ? fmt(m.health.analysis.sleepShort, { hours })
      : fmt(m.health.analysis.sleepLong, { hours });
    insights.push({ key: 'sleep', body, border: 'border-emerald-500' });
  }

  const trendBadge = (changePct: number | null) => {
    if (changePct === null) return null;
    const positive = changePct >= 0;
    const Icon = positive ? TrendingUp : TrendingDown;
    return (
      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${positive ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
        <Icon className="w-3 h-3" />
        {positive ? '+' : ''}{formatNumber(changePct)}%
      </span>
    );
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      {/* Welcome banner */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {fmt(m.dashboard.greeting[greeting], { name: firstName })}
          </h1>
          <p className="text-gray-500 mt-1">{fmt(m.dashboard.overview, { date: today })}</p>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <button aria-label={m.common.notifications} className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all relative">
            <Bell className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Empty state for brand new accounts */}
      {!data.hasAnyData && (
        <div className="mb-8 bg-white rounded-2xl p-8 border border-emerald-100 shadow-sm text-center animate-slide-up">
          <div className="w-14 h-14 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.dashboard.empty.title}</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">{m.dashboard.empty.description}</p>
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

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            {data.heartRate && trendBadge(data.heartRate.changePct)}
          </div>
          <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {data.heartRate ? <>{formatNumber(data.heartRate.value)} <span className="text-base font-normal text-gray-400">{m.common.bpm}</span></> : <span className="text-base font-normal text-gray-300">—</span>}
          </p>
          <p className="text-xs text-gray-500 mt-1">{m.dashboard.heartRate}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Footprints className="w-5 h-5 text-amber-500" />
            </div>
            {data.stepsToday > 0 && (
              <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">
                {formatNumber(stepsPct / 100, { style: 'percent' })}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {data.stepsToday > 0 ? formatNumber(data.stepsToday) : <span className="text-base font-normal text-gray-300">—</span>}
          </p>
          <p className="text-xs text-gray-500 mt-1">{m.dashboard.stepsToday}</p>
          <p className="text-xs text-gray-400 mt-1">{fmt(m.dashboard.ofDailyGoal, { percent: stepsPct })}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Moon className="w-5 h-5 text-purple-500" />
            </div>
            {data.sleep && trendBadge(data.sleep.changePct)}
          </div>
          <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {data.sleep
              ? fmt(m.common.duration, { hours: Math.floor(data.sleep.value), minutes: Math.round((data.sleep.value % 1) * 60) })
              : <span className="text-base font-normal text-gray-300">—</span>}
          </p>
          <p className="text-xs text-gray-500 mt-1">{m.dashboard.sleep}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            {data.bloodPressure && data.bloodPressure.systolic < 130 && data.bloodPressure.diastolic < 85 && (
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">{m.dashboard.optimal}</span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {data.bloodPressure
              ? `${formatNumber(data.bloodPressure.systolic)}/${formatNumber(data.bloodPressure.diastolic)}`
              : <span className="text-base font-normal text-gray-300">—</span>}
          </p>
          <p className="text-xs text-gray-500 mt-1">{m.dashboard.bloodPressure}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Insights from the user's own data */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.dashboard.insightsTitle}</h2>
          <div className="space-y-3">
            {insights.length > 0 ? (
              insights.map((insight) => (
                <div key={insight.key} className={`bg-white rounded-2xl p-4 border-l-4 ${insight.border} shadow-sm hover:shadow-md transition-all`}>
                  <p className="text-sm text-gray-600">{insight.body}</p>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <p className="text-sm text-gray-400">{m.health.analysis.keepLogging}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.dashboard.quickActions}</h2>
          <div className="space-y-3">
            <Link
              href="/health"
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl p-4 flex items-center gap-3 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-200 hover:shadow-lg transform hover:scale-[1.02]"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.dashboard.logHealth.title}</p>
                <p className="text-xs text-emerald-100">{m.dashboard.logHealth.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Link>

            <Link
              href="/chat"
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-2xl p-4 flex items-center gap-3 hover:from-amber-500 hover:to-amber-600 transition-all shadow-md shadow-amber-200 hover:shadow-lg transform hover:scale-[1.02]"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-bold text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.dashboard.askAssistant.title}</p>
                <p className="text-xs text-amber-100">{m.dashboard.askAssistant.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Link>
          </div>
        </div>
      </div>

      {/* Weekly steps */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-6" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.dashboard.weeklyActivity}</h2>
        <div className="flex items-end gap-3" style={{ height: '120px' }}>
          {data.weeklySteps.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                title={formatNumber(day.steps)}
                className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-300 hover:from-emerald-600 hover:to-emerald-500"
                style={{ height: `${Math.max(Math.round((day.steps / maxSteps) * 96), 4)}px` }}
              />
              <span className="text-xs text-gray-400 font-medium">{weekdayShort(weekdayIndex(day.date))}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
