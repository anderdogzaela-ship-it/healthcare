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
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type ReminderKind = '24h' | '2h' | 'follow_up';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'skipped';
export type AutomationChannel = 'whatsapp' | 'email' | 'sms';
export type AutomationDirection = 'outbound' | 'inbound';
export type ClinicRole = 'owner' | 'professional' | 'receptionist';
export type PatientStatus = 'lead' | 'active' | 'inactive' | 'archived';
export type WebhookStatus = 'pending' | 'delivered' | 'failed';
export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid';

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
          phone: string | null;
          phone_verified: boolean;
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
          phone?: string | null;
        };
        Update: {
          full_name?: string;
          date_of_birth?: string | null;
          unit_system?: UnitSystem;
          locale?: AppLocale;
          timezone?: string;
          plan?: string;
          phone?: string | null;
          phone_verified?: boolean;
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
      clinics: {
        Row: {
          id: string;
          name: string;
          timezone: string;
          locale: AppLocale;
          plan: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; timezone?: string; locale?: AppLocale; created_by: string };
        Update: { name?: string; timezone?: string; locale?: AppLocale; plan?: string };
        Relationships: [];
      };
      clinic_members: {
        Row: { clinic_id: string; user_id: string; role: ClinicRole; created_at: string };
        Insert: { clinic_id: string; user_id: string; role?: ClinicRole };
        Update: { role?: ClinicRole };
        Relationships: [];
      };
      clinic_invitations: {
        Row: {
          id: string;
          clinic_id: string;
          email: string;
          role: ClinicRole;
          token_hash: string;
          invited_by: string | null;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          clinic_id: string;
          email: string;
          token_hash: string;
          role?: ClinicRole;
          invited_by?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      patients: {
        Row: {
          id: string;
          clinic_id: string;
          user_id: string | null;
          full_name: string;
          email: string | null;
          phone: string | null;
          date_of_birth: string | null;
          locale: AppLocale;
          status: PatientStatus;
          notes: string | null;
          last_visit_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          clinic_id: string;
          full_name: string;
          user_id?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          locale?: AppLocale;
          status?: PatientStatus;
          notes?: string | null;
          last_visit_at?: string | null;
        };
        Update: {
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          locale?: AppLocale;
          status?: PatientStatus;
          notes?: string | null;
          last_visit_at?: string | null;
        };
        Relationships: [];
      };
      api_keys: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          prefix: string;
          key_hash: string;
          created_by: string | null;
          last_used_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          clinic_id: string;
          prefix: string;
          key_hash: string;
          name?: string;
          created_by?: string | null;
        };
        Update: { name?: string; last_used_at?: string | null; revoked_at?: string | null };
        Relationships: [];
      };
      webhook_endpoints: {
        Row: {
          id: string;
          clinic_id: string;
          url: string;
          secret: string;
          events: string[];
          active: boolean;
          created_at: string;
        };
        Insert: { clinic_id: string; url: string; secret: string; events?: string[]; active?: boolean };
        Update: { url?: string; events?: string[]; active?: boolean };
        Relationships: [];
      };
      webhook_deliveries: {
        Row: {
          id: string;
          endpoint_id: string;
          clinic_id: string;
          event_type: string;
          status: WebhookStatus;
          response_code: number | null;
          error: string | null;
          payload: Record<string, unknown>;
          attempts: number;
          next_attempt_at: string | null;
          created_at: string;
          delivered_at: string | null;
        };
        Insert: {
          endpoint_id: string;
          clinic_id: string;
          event_type: string;
          status?: WebhookStatus;
          payload?: Record<string, unknown>;
          attempts?: number;
        };
        Update: {
          status?: WebhookStatus;
          response_code?: number | null;
          error?: string | null;
          delivered_at?: string | null;
          attempts?: number;
          next_attempt_at?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          clinic_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: string;
          status: SubscriptionStatus;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          clinic_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: string;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
        Update: {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: string;
          status?: SubscriptionStatus;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
        Relationships: [];
      };
      patient_notes: {
        Row: {
          id: string;
          clinic_id: string;
          patient_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: { clinic_id: string; patient_id: string; author_id?: string | null; body: string };
        Update: { body?: string };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          user_id: string | null;
          clinic_id: string | null;
          patient_id: string | null;
          starts_at: string;
          duration_min: number;
          professional: string;
          location: string | null;
          reason: string | null;
          status: AppointmentStatus;
          confirmed_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string | null;
          clinic_id?: string | null;
          patient_id?: string | null;
          starts_at: string;
          duration_min?: number;
          professional?: string;
          location?: string | null;
          reason?: string | null;
          status?: AppointmentStatus;
        };
        Update: {
          starts_at?: string;
          duration_min?: number;
          professional?: string;
          location?: string | null;
          reason?: string | null;
          status?: AppointmentStatus;
          confirmed_at?: string | null;
          cancelled_at?: string | null;
        };
        Relationships: [];
      };
      reminder_jobs: {
        Row: {
          id: string;
          appointment_id: string;
          user_id: string | null;
          patient_id: string | null;
          kind: ReminderKind;
          channel: AutomationChannel;
          send_at: string;
          status: ReminderStatus;
          attempts: number;
          sent_at: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          appointment_id: string;
          user_id?: string | null;
          patient_id?: string | null;
          kind: ReminderKind;
          channel?: AutomationChannel;
          send_at: string;
          status?: ReminderStatus;
        };
        Update: {
          send_at?: string;
          status?: ReminderStatus;
          channel?: AutomationChannel;
          attempts?: number;
          sent_at?: string | null;
          error?: string | null;
        };
        Relationships: [];
      };
      automation_events: {
        Row: {
          id: string;
          user_id: string | null;
          appointment_id: string | null;
          patient_id: string | null;
          direction: AutomationDirection;
          channel: AutomationChannel;
          event_type: string;
          payload: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          user_id?: string | null;
          appointment_id?: string | null;
          patient_id?: string | null;
          direction: AutomationDirection;
          channel?: AutomationChannel;
          event_type: string;
          payload?: Record<string, unknown>;
        };
        Update: { payload?: Record<string, unknown> };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_rate_limit: {
        Args: { p_key_id: string; p_window_seconds: number; p_max: number };
        Returns: boolean;
      };
      is_clinic_member: { Args: { target_clinic: string }; Returns: boolean };
      clinic_role_of: { Args: { target_clinic: string }; Returns: ClinicRole };
    };
    Enums: {
      unit_system: UnitSystem;
      app_locale: AppLocale;
      measurement_metric: MeasurementMetric;
      goal_metric: GoalMetric;
      data_source: DataSource;
      message_role: MessageRole;
      appointment_status: AppointmentStatus;
      reminder_kind: ReminderKind;
      reminder_status: ReminderStatus;
      automation_channel: AutomationChannel;
      automation_direction: AutomationDirection;
      clinic_role: ClinicRole;
      patient_status: PatientStatus;
      subscription_status: SubscriptionStatus;
      webhook_status: WebhookStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
