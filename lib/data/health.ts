import { createClient } from '@/lib/supabase/server';

export interface Trend {
  value: number;
  /** Percentage change against the previous reading, or null when there isn't one. */
  changePct: number | null;
}

export interface DashboardData {
  heartRate: Trend | null;
  bloodPressure: { systolic: number; diastolic: number } | null;
  weightKg: number | null;
  stepsToday: number;
  stepsGoal: number;
  sleep: Trend | null;
  /** Last 7 days, oldest first. */
  weeklySteps: { date: string; steps: number }[];
  hasAnyData: boolean;
}

export interface ActivityData {
  stepsToday: number;
  caloriesToday: number;
  activeMinutesToday: number;
  stepsGoal: number;
  weeklyChangePct: number | null;
  week: { date: string; steps: number; calories: number; minutes: number }[];
  recent: {
    id: string;
    exerciseType: string;
    durationMin: number | null;
    distanceM: number | null;
    calories: number | null;
    recordedOn: string;
  }[];
  hasAnyData: boolean;
}

/** Today's date (YYYY-MM-DD) in the user's own timezone. */
export function localDate(timezone: string, date = new Date()): string {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(date);
  }
}

function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

async function stepsGoalFor(userId: string, today: string): Promise<number> {
  const supabase = createClient();
  const { data } = await supabase
    .from('goals')
    .select('target, effective_from')
    .eq('user_id', userId)
    .eq('metric', 'steps')
    .lte('effective_from', today)
    .order('effective_from', { ascending: false })
    .limit(1);

  return data?.[0]?.target ?? 7500;
}

export async function getDashboardData(userId: string, today: string): Promise<DashboardData> {
  const supabase = createClient();
  const weekStart = shiftDate(today, -6);
  const monthStart = shiftDate(today, -30);

  const [measurementsResult, sleepResult, activityResult, stepsGoal] = await Promise.all([
    supabase
      .from('measurements')
      .select('metric, value, value_secondary, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', `${monthStart}T00:00:00Z`)
      .order('recorded_at', { ascending: false }),
    supabase
      .from('sleep_sessions')
      .select('recorded_on, hours')
      .eq('user_id', userId)
      .gte('recorded_on', monthStart)
      .order('recorded_on', { ascending: false }),
    supabase
      .from('activity_sessions')
      .select('recorded_on, steps')
      .eq('user_id', userId)
      .gte('recorded_on', weekStart),
    stepsGoalFor(userId, today),
  ]);

  const measurements = measurementsResult.data ?? [];
  const sleepRows = sleepResult.data ?? [];
  const activityRows = activityResult.data ?? [];

  const byMetric = (metric: string) => measurements.filter((row) => row.metric === metric);

  const heartRates = byMetric('heart_rate');
  const heartRate = heartRates[0]
    ? { value: Number(heartRates[0].value), changePct: heartRates[1] ? pctChange(Number(heartRates[0].value), Number(heartRates[1].value)) : null }
    : null;

  const bpRow = byMetric('blood_pressure')[0];
  const bloodPressure = bpRow && bpRow.value_secondary !== null
    ? { systolic: Number(bpRow.value), diastolic: Number(bpRow.value_secondary) }
    : null;

  const weightRow = byMetric('weight')[0];
  const weightKg = weightRow ? Number(weightRow.value) : null;

  const sleep = sleepRows[0]
    ? { value: Number(sleepRows[0].hours), changePct: sleepRows[1] ? pctChange(Number(sleepRows[0].hours), Number(sleepRows[1].hours)) : null }
    : null;

  // Sum steps per day, then fill the missing days with zero.
  const stepsByDate = new Map<string, number>();
  for (const row of activityRows) {
    if (row.steps === null) continue;
    stepsByDate.set(row.recorded_on, (stepsByDate.get(row.recorded_on) ?? 0) + row.steps);
  }

  const weeklySteps = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(today, i - 6);
    return { date, steps: stepsByDate.get(date) ?? 0 };
  });

  return {
    heartRate,
    bloodPressure,
    weightKg,
    stepsToday: stepsByDate.get(today) ?? 0,
    stepsGoal: Number(stepsGoal),
    sleep,
    weeklySteps,
    hasAnyData: measurements.length > 0 || sleepRows.length > 0 || activityRows.length > 0,
  };
}

export async function getActivityData(userId: string, today: string): Promise<ActivityData> {
  const supabase = createClient();
  const twoWeeksStart = shiftDate(today, -13);

  const [sessionsResult, stepsGoal] = await Promise.all([
    supabase
      .from('activity_sessions')
      .select('id, recorded_on, exercise_type, duration_min, steps, calories_kcal, distance_m')
      .eq('user_id', userId)
      .gte('recorded_on', twoWeeksStart)
      .order('recorded_on', { ascending: false }),
    stepsGoalFor(userId, today),
  ]);

  const sessions = sessionsResult.data ?? [];
  const weekStart = shiftDate(today, -6);

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(today, i - 6);
    const rows = sessions.filter((session) => session.recorded_on === date);
    return {
      date,
      steps: rows.reduce((total, row) => total + (row.steps ?? 0), 0),
      calories: rows.reduce((total, row) => total + (row.calories_kcal ?? 0), 0),
      minutes: rows.reduce((total, row) => total + (row.duration_min ?? 0), 0),
    };
  });

  const thisWeekSteps = week.reduce((total, day) => total + day.steps, 0);
  const previousWeekSteps = sessions
    .filter((session) => session.recorded_on < weekStart)
    .reduce((total, row) => total + (row.steps ?? 0), 0);

  const todayTotals = week[week.length - 1];

  return {
    stepsToday: todayTotals.steps,
    caloriesToday: todayTotals.calories,
    activeMinutesToday: todayTotals.minutes,
    stepsGoal: Number(stepsGoal),
    weeklyChangePct: previousWeekSteps ? pctChange(thisWeekSteps, previousWeekSteps) : null,
    week,
    recent: sessions
      .filter((session) => session.exercise_type !== 'none')
      .slice(0, 6)
      .map((session) => ({
        id: session.id,
        exerciseType: session.exercise_type,
        durationMin: session.duration_min,
        distanceM: session.distance_m,
        calories: session.calories_kcal,
        recordedOn: session.recorded_on,
      })),
    hasAnyData: sessions.length > 0,
  };
}
