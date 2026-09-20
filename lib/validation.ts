import { z } from 'zod';

export const localeSchema = z.enum(['en', 'es', 'pt']);

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  locale: localeSchema.default('en'),
  consent: z.literal(true),
});

export const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const emailSchema = z.object({ email: z.string().trim().email() });

/**
 * Health log input. The ranges are physiological limits: anything outside is a
 * typo, and letting it into the database would poison later trend analysis.
 */
export const healthLogSchema = z.object({
  heartRate: z.coerce.number().int().min(20).max(250).optional(),
  systolic: z.coerce.number().int().min(50).max(260).optional(),
  diastolic: z.coerce.number().int().min(30).max(200).optional(),
  weight: z.coerce.number().min(20).max(400).optional(),
  steps: z.coerce.number().int().min(0).max(200000).optional(),
  exerciseType: z.string().max(40).default('none'),
  durationMin: z.coerce.number().int().min(0).max(1440).optional(),
  sleepHours: z.coerce.number().min(0).max(24).optional(),
  sleepQuality: z.coerce.number().int().min(1).max(5).optional(),
  symptoms: z.array(z.string().max(40)).max(20).default([]),
  notes: z.string().max(2000).optional(),
});

export type HealthLogInput = z.infer<typeof healthLogSchema>;

export const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  // Digits, spaces and the usual separators; normalized to +digits on save.
  phone: z.string().trim().max(30).regex(/^[+\d][\d\s().-]*$/).optional().or(z.literal('')),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  unitSystem: z.enum(['metric', 'imperial']),
  locale: localeSchema,
  timezone: z.string().max(60).default('UTC'),
});

export const settingsSchema = z.object({
  reminders: z.boolean(),
  insights: z.boolean(),
  weeklyReport: z.boolean(),
  achievements: z.boolean(),
  shareData: z.boolean(),
  analytics: z.boolean(),
});

export const goalsSchema = z.object({
  steps: z.coerce.number().int().min(1000).max(50000),
  sleepHours: z.coerce.number().min(4).max(12),
});

/** Empty strings from HTML forms should be treated as "not provided". */
export function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? undefined : text;
}
