'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Heart, Activity, Moon, AlertCircle, FileText, Star,
  CheckCircle, LayoutDashboard, MessageCircle, Settings,
  ChevronRight, Menu, Save, Sparkles
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Health Log', icon: Heart, path: '/health' },
  { label: 'AI Assistant', icon: MessageCircle, path: '/chat' },
  { label: 'Activity', icon: Activity, path: '/activity' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const symptomOptions = [
  'Headache', 'Fatigue', 'Stress', 'Nausea',
  'Back Pain', 'Shortness of Breath', 'Dizziness', 'None'
];

const exerciseOptions = ['None', 'Running', 'Walking', 'Cycling', 'Swimming', 'Yoga', 'Weightlifting'];

export default function HealthPage() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vitals, setVitals] = useState({ heartRate: '', systolic: '', diastolic: '', weight: '' });
  const [activityData, setActivityData] = useState({ steps: '', exerciseType: 'None', duration: '' });
  const [sleep, setSleep] = useState({ hours: '', quality: 0 });
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }));
  }, []);

  const toggleSymptom = (symptom: string) => {
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 1200);
  };

  const getHeartRateAnalysis = () => {
    const hr = parseInt(vitals.heartRate);
    if (!vitals.heartRate) return '';
    if (hr < 60) return `Your heart rate of ${hr} bpm is below the typical range — this can be normal for athletes.`;
    if (hr <= 100) return `Your heart rate of ${hr} bpm looks healthy and is within the normal range.`;
    return `Your heart rate of ${hr} bpm is slightly elevated. Consider rest and hydration.`;
  };

  const getStepsAnalysis = () => {
    const steps = parseInt(activityData.steps);
    if (!activityData.steps) return '';
    const pct = Math.round((steps / 10000) * 100);
    return `With ${steps.toLocaleString()} steps logged, you're at ${pct}% of the 10,000 step goal.`;
  };

  const getSleepAnalysis = () => {
    const hrs = parseFloat(sleep.hours);
    if (!sleep.hours) return '';
    if (hrs >= 7 && hrs <= 9) return `Your ${hrs} hours of sleep meets the recommended 7–9 hours. Great job!`;
    if (hrs < 7) return `Your ${hrs} hours of sleep falls short of the recommended 7–9 hours. Try going to bed a bit earlier tonight.`;
    return `Your ${hrs} hours of sleep is above average. Make sure the quality is restful.`;
  };

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

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile top nav */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Health Log</span>
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Health Log</h1>
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
                  <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Vitals</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      value={vitals.heartRate}
                      onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                      placeholder="72"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-gray-900 placeholder-gray-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Systolic BP (mmHg)</label>
                    <input
                      type="number"
                      value={vitals.systolic}
                      onChange={(e) => setVitals({ ...vitals, systolic: e.target.value })}
                      placeholder="118"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-gray-900 placeholder-gray-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Diastolic BP (mmHg)</label>
                    <input
                      type="number"
                      value={vitals.diastolic}
                      onChange={(e) => setVitals({ ...vitals, diastolic: e.target.value })}
                      placeholder="76"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm text-gray-900 placeholder-gray-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Weight (kg)</label>
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
                  <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Activity</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Steps</label>
                    <input
                      type="number"
                      value={activityData.steps}
                      onChange={(e) => setActivityData({ ...activityData, steps: e.target.value })}
                      placeholder="6840"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 placeholder-gray-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Exercise Type</label>
                    <select
                      value={activityData.exerciseType}
                      onChange={(e) => setActivityData({ ...activityData, exerciseType: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm text-gray-900 bg-white transition-all"
                    >
                      {exerciseOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Duration (min)</label>
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
                  <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Sleep</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-600">Hours of Sleep</label>
                      <span className="text-sm font-bold text-purple-600">{sleep.hours || '0'}h</span>
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
                      <span>0h</span>
                      <span>6h</span>
                      <span>12h</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">Sleep Quality</label>
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
                        {sleep.quality === 0 ? 'Not rated' : ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][sleep.quality]}
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
                  <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Symptoms</h2>
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
                      {symptom}
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
                  <h2 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>Notes</h2>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about how you're feeling today..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-gray-700 placeholder-gray-400 resize-none transition-all"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-2xl hover:from-emerald-700 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Health Log
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
                    <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>AI Analysis Preview</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    After saving your health log, our AI will analyze your data and provide personalized insights including:
                  </p>
                  <ul className="space-y-2">
                    {[
                      'Vital signs assessment',
                      'Activity goal progress',
                      'Sleep quality feedback',
                      'Symptom pattern detection',
                      'Personalized recommendations',
                    ].map((item) => (
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
                      <h3 className="font-bold text-emerald-800" style={{ fontFamily: 'Nunito, sans-serif' }}>Log Saved!</h3>
                    </div>
                    <p className="text-sm text-emerald-700">Health log saved for {today}.</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-emerald-500" />
                      </div>
                      <h3 className="font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>AI Analysis</h3>
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
                      {symptoms.length > 0 && symptoms[0] !== 'None' && (
                        <p className="p-3 bg-amber-50 rounded-xl text-amber-800">
                          You reported: {symptoms.join(', ')}. Keep an eye on these and stay hydrated.
                        </p>
                      )}
                      {!vitals.heartRate && !activityData.steps && !sleep.hours && (
                        <p className="p-3 bg-gray-50 rounded-xl text-gray-500">
                          Keep logging daily to see trend insights and personalized recommendations from your AI health companion.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold">Health log saved!</span>
          </div>
        </div>
      )}
    </div>
  );
}
