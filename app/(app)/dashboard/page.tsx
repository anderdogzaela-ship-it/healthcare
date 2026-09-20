'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart, MessageCircle, Moon, TrendingUp, ChevronRight, Bell, Zap, Footprints
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';

// Bar heights in px, Monday first.
const activityBars = [60, 80, 45, 90, 70, 55, 75];

const insights = [
  { key: 'sleep', border: 'border-emerald-500' },
  { key: 'hydration', border: 'border-amber-500' },
  { key: 'cardio', border: 'border-blue-500' },
] as const;

export default function DashboardPage() {
  const { m, fmt, formatNumber, formatDate, weekdayShort } = useI18n();
  // Set after mount so server and client render the same markup.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const hour = now?.getHours() ?? 0;
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const today = now ? formatDate(now, { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      {/* Welcome banner */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {fmt(m.dashboard.greeting[greeting], { name: 'Sarah' })}
          </h1>
          <p className="text-gray-500 mt-1">{fmt(m.dashboard.overview, { date: today })}</p>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <button aria-label={m.common.notifications} className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all relative">
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
          <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>72 <span className="text-base font-normal text-gray-400">{m.common.bpm}</span></p>
          <p className="text-xs text-gray-500 mt-1">{m.dashboard.heartRate}</p>
          <p className="text-xs text-gray-400 mt-1">{fmt(m.dashboard.fromYesterday, { change: '+2%' })}</p>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Footprints className="w-5 h-5 text-amber-500" />
            </div>
            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">
              {formatNumber(0.91, { style: 'percent' })}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{formatNumber(6840)}</p>
          <p className="text-xs text-gray-500 mt-1">{m.dashboard.stepsToday}</p>
          <p className="text-xs text-gray-400 mt-1">{fmt(m.dashboard.ofDailyGoal, { percent: 91 })}</p>
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
          <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{fmt(m.common.duration, { hours: 7, minutes: 20 })}</p>
          <p className="text-xs text-gray-500 mt-1">{m.dashboard.sleep}</p>
          <p className="text-xs text-gray-400 mt-1">{fmt(m.dashboard.thisWeek, { change: '+12%' })}</p>
        </div>

        {/* Blood Pressure */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
              {m.dashboard.optimal}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>118/76</p>
          <p className="text-xs text-gray-500 mt-1">{m.dashboard.bloodPressure}</p>
          <p className="text-xs text-gray-400 mt-1">{m.dashboard.optimalRange}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* AI Insights */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.dashboard.insightsTitle}</h2>
          <div className="space-y-3">
            {insights.map((insight) => (
              <div key={insight.key} className={`bg-white rounded-2xl p-4 border-l-4 ${insight.border} shadow-sm hover:shadow-md transition-all`}>
                <p className="text-sm font-semibold text-gray-900 mb-1">{m.dashboard.insights[insight.key].title}</p>
                <p className="text-xs text-gray-500">{m.dashboard.insights[insight.key].body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.dashboard.quickActions}</h2>
          <div className="space-y-3">
            <Link
              href="/health"
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl p-4 flex items-center gap-3 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-200 transform hover:scale-[1.02]"
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
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-2xl p-4 flex items-center gap-3 hover:from-amber-500 hover:to-amber-600 transition-all shadow-md shadow-amber-200 hover:shadow-lg hover:shadow-amber-200 transform hover:scale-[1.02]"
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

      {/* Activity chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-6" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.dashboard.weeklyActivity}</h2>
        <div className="flex items-end gap-3" style={{ height: '120px' }}>
          {activityBars.map((height, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all duration-300 hover:from-emerald-600 hover:to-emerald-500 cursor-pointer"
                style={{ height: `${height}px` }}
              />
              <span className="text-xs text-gray-400 font-medium">{weekdayShort(i)}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
