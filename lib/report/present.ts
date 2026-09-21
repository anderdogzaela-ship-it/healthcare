import { localeTags, type Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/messages/en';
import type { WeeklyReport } from '@/lib/data/weekly-report';

/**
 * Turns a weekly report into labelled rows.
 *
 * Shared by the report page and the email, so both always say the same thing
 * in the same words. Pure: no React, no request context.
 */

export interface ReportRow {
  label: string;
  value: string;
  /** Last week's value, already formatted, when there is one to compare. */
  previous: string | null;
}

export interface ReportSection {
  key: 'sleep' | 'activity' | 'vitals';
  title: string;
  rows: ReportRow[];
}

export interface PresentedReport {
  period: string;
  from: string;
  to: string;
  logged: string;
  sections: ReportSection[];
  symptoms: string[];
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export function presentReport(report: WeeklyReport, m: Messages, locale: Locale): PresentedReport {
  const tag = localeTags[locale];
  const number = (value: number, digits = 0) =>
    new Intl.NumberFormat(tag, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  const date = (iso: string) =>
    new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

  const r = m.report;
  const { current: now, previous: before } = report;

  const hours = (value: number | null) => (value === null ? null : `${number(value, 1)} h`);
  const perFive = (value: number | null) => (value === null ? null : `${number(value, 1)}/5`);
  const steps = (value: number | null) => (value === null ? null : number(value));
  const bpm = (value: number | null) => (value === null ? null : `${number(value)} bpm`);
  const pressure = (value: WeekStatsPressure) => (value === null ? null : `${value.systolic}/${value.diastolic} mmHg`);
  const kg = (value: number | null) => (value === null ? null : `${number(value, 1)} kg`);

  // A row only appears when this week has a value; last week is shown beside
  // it when it has one too.
  const row = (label: string, value: string | null, previous: string | null): ReportRow[] =>
    value === null ? [] : [{ label, value, previous: previous === null ? null : fill(r.lastWeek, { value: previous }) }];

  const outOf = (count: number, total: number) => fill(r.outOf, { count, total });

  const sections: ReportSection[] = [
    {
      key: 'sleep' as const,
      title: r.sleep,
      rows: [
        ...row(r.avgSleep, hours(now.sleepAvg), hours(before.sleepAvg)),
        ...row(r.sleepQuality, perFive(now.sleepQualityAvg), perFive(before.sleepQualityAvg)),
        ...row(
          fill(r.sleepGoal, { goal: number(report.goals.sleepHours, Number.isInteger(report.goals.sleepHours) ? 0 : 1) }),
          now.sleepNights > 0 ? outOf(now.sleepGoalNights, now.sleepNights) : null,
          before.sleepNights > 0 ? outOf(before.sleepGoalNights, before.sleepNights) : null
        ),
      ],
    },
    {
      key: 'activity' as const,
      title: r.activity,
      rows: [
        ...row(r.avgSteps, steps(now.stepsAvg), steps(before.stepsAvg)),
        ...row(
          fill(r.stepsGoal, { goal: number(report.goals.steps) }),
          now.stepsAvg !== null ? outOf(now.stepsGoalDays, 7) : null,
          before.stepsAvg !== null ? outOf(before.stepsGoalDays, 7) : null
        ),
        ...row(r.workouts, number(now.workouts), before.daysLogged > 0 ? number(before.workouts) : null),
        ...row(r.activeMinutes, number(now.activeMinutes), before.daysLogged > 0 ? number(before.activeMinutes) : null),
      ],
    },
    {
      key: 'vitals' as const,
      title: r.vitals,
      rows: [
        ...row(r.heartRate, bpm(now.heartRateAvg), bpm(before.heartRateAvg)),
        ...row(r.bloodPressure, pressure(now.bloodPressureAvg), pressure(before.bloodPressureAvg)),
        ...row(r.weight, kg(now.weightLatest), kg(before.weightLatest)),
      ],
    },
  ].filter((section) => section.rows.length > 0);

  const symptomNames = m.health.symptoms as Record<string, string>;

  return {
    period: `${date(report.from)} – ${date(report.to)}`,
    from: date(report.from),
    to: date(report.to),
    logged: fill(r.logged, { days: now.daysLogged }),
    sections,
    symptoms: report.symptoms.map(({ symptom, days }) =>
      fill(r.symptomLine, { symptom: symptomNames[symptom] ?? symptom, days })
    ),
  };
}

type WeekStatsPressure = WeeklyReport['current']['bloodPressureAvg'];
