/**
 * Types for the schema in supabase/migrations.
 *
 * Written by hand to match the migration. Once the Supabase CLI is linked to
 * the project, regenerate with `npm run db:types` and this file is replaced by
 * the generated version.
 */

export type UnitSystem = 'metric' | 'imperial';
export type AppLocale = 'en' | 'es' | 'pt';
export type MeasurementMetric = 'heart_rate' | 'blood_pressure' | 'weight';
export type GoalMetric = 'steps' | 'sleep_hours' | 'water_glasses';
export type DataSource = 'manual' | 'fitbit' | 'apple_health' | 'health_connect';
export type MessageRole = 'user' | 'ai';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          date_of_birth: string | null;
          unit_system: UnitSystem;
          locale: AppLocale;
          timezone: string;
          plan: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          date_of_birth?: string | null;
          unit_system?: UnitSystem;
          locale?: AppLocale;
          timezone?: string;
          plan?: string;
        };
        Update: {
          full_name?: string;
          date_of_birth?: string | null;
          unit_system?: UnitSystem;
          locale?: AppLocale;
          timezone?: string;
          plan?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          reminders: boolean;
          insights: boolean;
          weekly_report: boolean;
          achievements: boolean;
          share_data: boolean;
          analytics: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          reminders?: boolean;
          insights?: boolean;
          weekly_report?: boolean;
          achievements?: boolean;
          share_data?: boolean;
          analytics?: boolean;
        };
        Update: {
          reminders?: boolean;
          insights?: boolean;
          weekly_report?: boolean;
          achievements?: boolean;
          share_data?: boolean;
          analytics?: boolean;
        };
        Relationships: [];
      };
      consents: {
        Row: {
          id: string;
          user_id: string;
          consent_type: string;
          version: string;
          granted_at: string;
          revoked_at: string | null;
        };
        Insert: {
          user_id: string;
          consent_type: string;
          version: string;
          granted_at?: string;
          revoked_at?: string | null;
        };
        Update: { revoked_at?: string | null };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          metric: GoalMetric;
          target: number;
          effective_from: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          metric: GoalMetric;
          target: number;
          effective_from?: string;
        };
        Update: { target?: number; effective_from?: string };
        Relationships: [];
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          notes: string | null;
          no_symptoms: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          log_date?: string;
          notes?: string | null;
          no_symptoms?: boolean;
        };
        Update: { notes?: string | null; no_symptoms?: boolean };
        Relationships: [];
      };
      measurements: {
        Row: {
          id: string;
          user_id: string;
          daily_log_id: string | null;
          metric: MeasurementMetric;
          value: number;
          value_secondary: number | null;
          unit: string;
          recorded_at: string;
          source: DataSource;
          external_id: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          daily_log_id?: string | null;
          metric: MeasurementMetric;
          value: number;
          value_secondary?: number | null;
          unit: string;
          recorded_at?: string;
          source?: DataSource;
          external_id?: string | null;
        };
        Update: { value?: number; value_secondary?: number | null };
        Relationships: [];
      };
      sleep_sessions: {
        Row: {
          id: string;
          user_id: string;
          daily_log_id: string | null;
          recorded_on: string;
          hours: number;
          quality: number | null;
          source: DataSource;
          created_at: string;
        };
        Insert: {
          user_id: string;
          daily_log_id?: string | null;
          recorded_on?: string;
          hours: number;
          quality?: number | null;
          source?: DataSource;
        };
        Update: { hours?: number; quality?: number | null };
        Relationships: [];
      };
      activity_sessions: {
        Row: {
          id: string;
          user_id: string;
          daily_log_id: string | null;
          recorded_on: string;
          exercise_type: string;
          duration_min: number | null;
          steps: number | null;
          calories_kcal: number | null;
          distance_m: number | null;
          source: DataSource;
          created_at: string;
        };
        Insert: {
          user_id: string;
          daily_log_id?: string | null;
          recorded_on?: string;
          exercise_type?: string;
          duration_min?: number | null;
          steps?: number | null;
          calories_kcal?: number | null;
          distance_m?: number | null;
          source?: DataSource;
        };
        Update: {
          exercise_type?: string;
          duration_min?: number | null;
          steps?: number | null;
        };
        Relationships: [];
      };
      symptom_entries: {
        Row: {
          id: string;
          user_id: string;
          daily_log_id: string;
          symptom: string;
          created_at: string;
        };
        Insert: { user_id: string; daily_log_id: string; symptom: string };
        Update: { symptom?: string };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; title?: string };
        Update: { title?: string };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: MessageRole;
          content: string;
          model: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          role: MessageRole;
          content: string;
          model?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
        };
        Update: { content?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      unit_system: UnitSystem;
      app_locale: AppLocale;
      measurement_metric: MeasurementMetric;
      goal_metric: GoalMetric;
      data_source: DataSource;
      message_role: MessageRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
