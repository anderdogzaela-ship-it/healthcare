'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Heart, Activity, Moon, AlertCircle, FileText, Star,
  CheckCircle, Save, Sparkles
} from 'lucide-react';
import { saveHealthLog } from '@/app/actions/health';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { Messages } from '@/lib/i18n/messages';

type SymptomKey = keyof Messages['health']['symptoms'];
type ExerciseKey = keyof Messages['exercise'];

const symptomOptions: SymptomKey[] = [
  'headache', 'fatigue', 'stress', 'nausea',
  'backPain', 'shortnessOfBreath', 'dizziness', 'none'
];

const exerciseOptions: ExerciseKey[] = ['none', 'running', 'walking', 'cycling', 'swimming', 'yoga', 'weightlifting'];

const STEP_GOAL = 10000;

export default function HealthPage() {
  const { m, fmt, formatDate } = useI18n();
  const [vitals, setVitals] = useState({ heartRate: '', systolic: '', diastolic: '', weight: '' });
  const [activityData, setActivityData] = useState<{ steps: string; exerciseType: ExerciseKey; duration: string }>({ steps: '', exerciseType: 'none', duration: '' });
  const [sleep, setSleep] = useState({ hours: '', quality: 0 });
  const [symptoms, setSymptoms] = useState<SymptomKey[]>([]);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [showToast, setShowToast] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const today = now
    ? formatDate(now, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const toggleSymptom = (symptom: SymptomKey) => {
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFailed(false);

    const formData = new FormData();
    // The log day is the user's local date, not the server's.
    const today = now ?? new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    formData.set('logDate', localDate);
    formData.set('heartRate', vitals.heartRate);
    formData.set('systolic', vitals.systolic);
    formData.set('diastolic', vitals.diastolic);
    formData.set('weight', vitals.weight);
    formData.set('steps', activityData.steps);
    formData.set('exerciseType', activityData.exerciseType);
    formData.set('durationMin', activityData.duration);
    formData.set('sleepHours', sleep.hours);
    if (sleep.quality > 0) formData.set('sleepQuality', String(sleep.quality));
    symptoms.forEach((symptom) => formData.append('symptoms', symptom));
    formData.set('notes', notes);

    startTransition(async () => {
      const result = await saveHealthLog(formData);
      if (result.status === 'ok') {
        setSubmitted(true);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        setSaveFailed(true);
      }
    });
  };

  const getHeartRateAnalysis = () => {
    const hr = parseInt(vitals.heartRate);
    if (!vitals.heartRate) return '';
    if (hr < 60) return fmt(m.health.analysis.heartRateLow, { heartRate: hr });
    if (hr <= 100) return fmt(m.health.analysis.heartRateNormal, { heartRate: hr });
    return fmt(m.health.analysis.heartRateHigh, { heartRate: hr });
  };

  const getStepsAnalysis = () => {
    const steps = parseInt(activityData.steps);
    if (!activityData.steps) return '';
    const pct = Math.round((steps / STEP_GOAL) * 100);
    return fmt(m.health.analysis.steps, { steps, percent: pct, goal: STEP_GOAL });
  };

  const getSleepAnalysis = () => {
    const hrs = parseFloat(sleep.hours);
    if (!sleep.hours) return '';
    if (hrs >= 7 && hrs <= 9) return fmt(m.health.analysis.sleepGood, { hours: hrs });
    if (hrs < 7) return fmt(m.health.analysis.sleepShort, { hours: hrs });
    return fmt(m.health.analysis.sleepLong, { hours: hrs });
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.health.title}</h1>
          <p className="text-gray-500 mt-1">{today}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-5">
            {/* Vitals */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Heart className="w-5 h-5 text-emerald-500" />
                </div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.health.vitals}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{m.health.heartRate}</label>
                  <input
                    type="number"
                    value={vitals.heartRate}
                    onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                    placeholder="72"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-gray-900 placeholder-gray-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{m.health.systolic}</label>
                  <input
                    type="number"
                    value={vitals.systolic}
                    onChange={(e) => setVitals({ ...vitals, systolic: e.target.value })}
                    placeholder="118"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-gray-900 placeholder-gray-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{m.health.diastolic}</label>
                  <input
                    type="number"
                    value={vitals.diastolic}
                    onChange={(e) => setVitals({ ...vitals, diastolic: e.target.value })}
                    placeholder="76"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-gray-900 placeholder-gray-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{m.health.weight}</label>
                  <input
                    type="number"
                    value={vitals.weight}
                    onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                    placeholder="68"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-gray-900 placeholder-gray-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Activity */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-amber-500" />
                </div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.health.activity}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{m.health.steps}</label>
                  <input
                    type="number"
                    value={activityData.steps}
                    onChange={(e) => setActivityData({ ...activityData, steps: e.target.value })}
                    placeholder="6840"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 placeholder-gray-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{m.health.exerciseType}</label>
                  <select
                    value={activityData.exerciseType}
                    onChange={(e) => setActivityData({ ...activityData, exerciseType: e.target.value as ExerciseKey })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 bg-white transition-all"
                  >
                    {exerciseOptions.map((opt) => (
                      <option key={opt} value={opt}>{m.exercise[opt]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{m.health.duration}</label>
                  <input
                    type="number"
                    value={activityData.duration}
                    onChange={(e) => setActivityData({ ...activityData, duration: e.target.value })}
                    placeholder="30"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 placeholder-gray-400 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Sleep */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Moon className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.health.sleep}</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-600">{m.health.hoursOfSleep}</label>
                    <span className="text-sm font-bold text-purple-600">{fmt(m.common.hoursShort, { hours: parseFloat(sleep.hours || '0') })}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={sleep.hours || '0'}
                    onChange={(e) => setSleep({ ...sleep, hours: e.target.value })}
                    className="w-full h-2 bg-purple-100 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{fmt(m.common.hoursShort, { hours: 0 })}</span>
                    <span>{fmt(m.common.hoursShort, { hours: 6 })}</span>
                    <span>{fmt(m.common.hoursShort, { hours: 12 })}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">{m.health.sleepQuality}</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSleep({ ...sleep, quality: star })}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            star <= sleep.quality ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-500 self-center">
                      {sleep.quality === 0 ? m.health.notRated : m.health.qualityLevels[sleep.quality - 1]}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Symptoms */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.health.symptomsTitle}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {symptomOptions.map((symptom) => (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => toggleSymptom(symptom)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      symptoms.includes(symptom)
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    {m.health.symptoms[symptom]}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.health.notes}</h2>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={m.health.notesPlaceholder}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-gray-700 placeholder-gray-400 resize-none transition-all"
              />
            </div>

            {/* Save failure */}
            {saveFailed && (
              <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-100 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{m.health.saveError}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={pending}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-2xl hover:from-emerald-700 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              {pending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {m.health.saving}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {m.health.save}
                </>
              )}
            </button>
          </form>

          {/* Right panel */}
          <div className="lg:w-80 lg:sticky lg:top-8 lg:self-start space-y-4">
            {!submitted ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.health.preview.title}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">{m.health.preview.intro}</p>
                <ul className="space-y-2">
                  {m.health.preview.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="space-y-4 animate-slide-up">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                    <h3 className="font-bold text-emerald-800" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.health.saved.title}</h3>
                  </div>
                  <p className="text-sm text-emerald-700">{fmt(m.health.saved.body, { date: today })}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-emerald-500" />
                    </div>
                    <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.health.analysisTitle}</h3>
                  </div>
                  <div className="space-y-3 text-sm text-gray-700">
                    {vitals.heartRate && (
                      <p className="p-3 bg-gray-50 rounded-xl">{getHeartRateAnalysis()}</p>
                    )}
                    {activityData.steps && (
                      <p className="p-3 bg-gray-50 rounded-xl">{getStepsAnalysis()}</p>
                    )}
                    {sleep.hours && (
                      <p className="p-3 bg-gray-50 rounded-xl">{getSleepAnalysis()}</p>
                    )}
                    {symptoms.length > 0 && symptoms[0] !== 'none' && (
                      <p className="p-3 bg-amber-50 rounded-xl text-amber-800">
                        {fmt(m.health.analysis.symptoms, { symptoms: symptoms.map((s) => m.health.symptoms[s]).join(', ') })}
                      </p>
                    )}
                    {!vitals.heartRate && !activityData.steps && !sleep.hours && (
                      <p className="p-3 bg-gray-50 rounded-xl text-gray-500">{m.health.analysis.keepLogging}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold">{m.health.toast}</span>
          </div>
        </div>
      )}
    </>
  );
}
