import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

/**
 * The weekly report: the last seven days next to the seven before them.
 *
 * It takes the Supabase client as a parameter because it runs in two places:
 * on the report page, under the user's own session, and in the Monday job,
 * which uses the admin client and therefore always filters by user id.
 */

export interface WeekStats {
  daysLogged: number;
  sleepAvg: number | null;
  sleepQualityAvg: number | null;
  sleepGoalNights: number;
  sleepNights: number;
  stepsAvg: number | null;
  stepsGoalDays: number;
  workouts: number;
  activeMinutes: number;
  heartRateAvg: number | null;
  bloodPressureAvg: { systolic: number; diastolic: number } | null;
  weightLatest: number | null;
}

export interface WeeklyReport {
  from: string;
  to: string;
  current: WeekStats;
  previous: WeekStats;
  goals: { steps: number; sleepHours: number };
  symptoms: { symptom: string; days: number }[];
  hasData: boolean;
}

function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function average(values: number[], decimals = 1): number | null {
  if (values.length === 0) return null;
  const factor = 10 ** decimals;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * factor) / factor;
}

const inRange = (day: string, from: string, to: string) => day >= from && day <= to;

type Client = SupabaseClient<Database>;

export async function getWeeklyReport(supabase: Client, userId: string, today: string): Promise<WeeklyReport> {
  const to = today;
  const from = shiftDate(today, -6);
  const previousTo = shiftDate(from, -1);
  const previousFrom = shiftDate(previousTo, -6);

  const [logs, sleep, activity, measurements, goals] = await Promise.all([
    supabase.from('daily_logs').select('id, log_date').eq('user_id', userId).gte('log_date', previousFrom).lte('log_date', to),
    supabase.from('sleep_sessions').select('recorded_on, hours, quality').eq('user_id', userId).gte('recorded_on', previousFrom).lte('recorded_on', to),
    supabase
      .from('activity_sessions')
      .select('recorded_on, exercise_type, duration_min, steps')
      .eq('user_id', userId)
      .gte('recorded_on', previousFrom)
      .lte('recorded_on', to),
    supabase
      .from('measurements')
      .select('metric, value, value_secondary, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', `${previousFrom}T00:00:00Z`)
      .lte('recorded_at', `${to}T23:59:59Z`)
      .order('recorded_at', { ascending: true }),
    supabase
      .from('goals')
      .select('metric, target, effective_from')
      .eq('user_id', userId)
      .lte('effective_from', to)
      .order('effective_from', { ascending: false }),
  ]);

  // The newest goal per metric that was already in force.
  const goalFor = (metric: 'steps' | 'sleep_hours', fallback: number) =>
    Number((goals.data ?? []).find((goal) => goal.metric === metric)?.target ?? fallback);
  const stepsGoal = goalFor('steps', 10000);
  const sleepGoal = goalFor('sleep_hours', 8);

  const stats = (start: string, end: string): WeekStats => {
    const days = new Set((logs.data ?? []).filter((log) => inRange(log.log_date, start, end)).map((log) => log.log_date));

    const nights = (sleep.data ?? []).filter((row) => inRange(row.recorded_on, start, end));
    const hours = nights.map((row) => Number(row.hours));
    const qualities = nights.map((row) => row.quality).filter((quality): quality is number => quality !== null);

    // Steps are summed per day first: a day can hold more than one session.
    const stepsByDay = new Map<string, number>();
    let workouts = 0;
    let activeMinutes = 0;
    for (const row of (activity.data ?? []).filter((item) => inRange(item.recorded_on, start, end))) {
      if (row.steps !== null) stepsByDay.set(row.recorded_on, (stepsByDay.get(row.recorded_on) ?? 0) + row.steps);
      if (row.exercise_type !== 'none') {
        workouts += 1;
        activeMinutes += row.duration_min ?? 0;
      }
    }
    const steps = Array.from(stepsByDay.values());

    const vitals = (measurements.data ?? []).filter((row) => inRange(row.recorded_at.slice(0, 10), start, end));
    const heartRates = vitals.filter((row) => row.metric === 'heart_rate').map((row) => Number(row.value));
    const pressures = vitals.filter((row) => row.metric === 'blood_pressure' && row.value_secondary !== null);
    const weights = vitals.filter((row) => row.metric === 'weight');
    const systolic = average(pressures.map((row) => Number(row.value)), 0);
    const diastolic = average(pressures.map((row) => Number(row.value_secondary)), 0);

    return {
      daysLogged: days.size,
      sleepAvg: average(hours),
      sleepQualityAvg: average(qualities),
      sleepGoalNights: hours.filter((value) => value >= sleepGoal).length,
      sleepNights: hours.length,
      stepsAvg: average(steps, 0),
      stepsGoalDays: steps.filter((value) => value >= stepsGoal).length,
      workouts,
      activeMinutes,
      heartRateAvg: average(heartRates, 0),
      bloodPressureAvg: systolic !== null && diastolic !== null ? { systolic, diastolic } : null,
      weightLatest: weights.length > 0 ? Number(weights[weights.length - 1].value) : null,
    };
  };

  const current = stats(from, to);
  const previous = stats(previousFrom, previousTo);

  // Symptoms of this week, counted in days.
  const weekLogIds = (logs.data ?? []).filter((log) => inRange(log.log_date, from, to)).map((log) => log.id);
  const symptomCounts = new Map<string, number>();
  if (weekLogIds.length > 0) {
    const { data: symptomRows } = await supabase
      .from('symptom_entries')
      .select('symptom')
      .eq('user_id', userId)
      .in('daily_log_id', weekLogIds);
    for (const row of symptomRows ?? []) symptomCounts.set(row.symptom, (symptomCounts.get(row.symptom) ?? 0) + 1);
  }

  return {
    from,
    to,
    current,
    previous,
    goals: { steps: stepsGoal, sleepHours: sleepGoal },
    symptoms: Array.from(symptomCounts, ([symptom, days]) => ({ symptom, days })).sort((a, b) => b.days - a.days),
    hasData: current.daysLogged > 0,
  };
}
