import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

/**
 * Read-only tools the assistant can call. Every query is scoped to the
 * signed-in user on the server, so the model can never widen the search: the
 * user id comes from the session, never from the model's arguments.
 */

const dateRange = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const measurementsInput = dateRange.extend({
  metric: z.enum(['heart_rate', 'blood_pressure', 'weight']),
});

const emptyInput = z.object({});

export const toolSchemas = {
  get_measurements: measurementsInput,
  get_sleep: dateRange,
  get_activity: dateRange,
  get_goals: emptyInput,
} as const;

export type ToolName = keyof typeof toolSchemas;

const rangeProperties = {
  from: { type: 'string' as const, description: 'Start date, YYYY-MM-DD (inclusive).' },
  to: { type: 'string' as const, description: 'End date, YYYY-MM-DD (inclusive).' },
};

export const tools: Anthropic.Tool[] = [
  {
    name: 'get_measurements',
    description:
      'Vitals the user logged: resting heart rate, blood pressure or weight, for a date range. Returns the readings in chronological order.',
    input_schema: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          enum: ['heart_rate', 'blood_pressure', 'weight'],
          description: 'Which vital to read.',
        },
        ...rangeProperties,
      },
      required: ['metric', 'from', 'to'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: 'get_sleep',
    description: 'Sleep the user logged for a date range: hours slept and a 1-5 quality rating.',
    input_schema: {
      type: 'object',
      properties: rangeProperties,
      required: ['from', 'to'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: 'get_activity',
    description: 'Activity the user logged for a date range: steps, exercise type, duration and calories.',
    input_schema: {
      type: 'object',
      properties: rangeProperties,
      required: ['from', 'to'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: 'get_goals',
    description: 'The health goals the user currently has set, such as their daily step and sleep targets.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
    strict: true,
  },
];

/** Runs one tool call and returns JSON for the tool_result block. */
export async function runTool(name: string, rawInput: unknown, userId: string): Promise<string> {
  const schema = toolSchemas[name as ToolName];
  if (!schema) return JSON.stringify({ error: `Unknown tool: ${name}` });

  // Inputs stream in eagerly, so they can arrive truncated: validate before use.
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) {
    return JSON.stringify({ error: 'INVALID_INPUT', detail: parsed.error.issues[0]?.message });
  }

  const supabase = createClient();

  if (name === 'get_measurements') {
    const { metric, from, to } = parsed.data as z.infer<typeof measurementsInput>;
    const { data } = await supabase
      .from('measurements')
      .select('metric, value, value_secondary, unit, recorded_at')
      .eq('user_id', userId)
      .eq('metric', metric)
      .gte('recorded_at', `${from}T00:00:00Z`)
      .lte('recorded_at', `${to}T23:59:59Z`)
      .order('recorded_at', { ascending: true })
      .limit(200);

    return JSON.stringify({ metric, readings: data ?? [] });
  }

  if (name === 'get_sleep') {
    const { from, to } = parsed.data as z.infer<typeof dateRange>;
    const { data } = await supabase
      .from('sleep_sessions')
      .select('recorded_on, hours, quality')
      .eq('user_id', userId)
      .gte('recorded_on', from)
      .lte('recorded_on', to)
      .order('recorded_on', { ascending: true })
      .limit(200);

    return JSON.stringify({ sessions: data ?? [] });
  }

  if (name === 'get_activity') {
    const { from, to } = parsed.data as z.infer<typeof dateRange>;
    const { data } = await supabase
      .from('activity_sessions')
      .select('recorded_on, exercise_type, duration_min, steps, calories_kcal, distance_m')
      .eq('user_id', userId)
      .gte('recorded_on', from)
      .lte('recorded_on', to)
      .order('recorded_on', { ascending: true })
      .limit(200);

    return JSON.stringify({ sessions: data ?? [] });
  }

  // get_goals
  const { data } = await supabase
    .from('goals')
    .select('metric, target, effective_from')
    .eq('user_id', userId)
    .order('effective_from', { ascending: false });

  // Keep only the newest goal per metric.
  const latest = new Map<string, { metric: string; target: number }>();
  for (const goal of data ?? []) {
    if (!latest.has(goal.metric)) latest.set(goal.metric, { metric: goal.metric, target: Number(goal.target) });
  }

  return JSON.stringify({ goals: Array.from(latest.values()) });
}
