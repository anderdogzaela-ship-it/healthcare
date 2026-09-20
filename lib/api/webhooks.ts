import { createHmac, randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type WebhookEvent =
  | 'patient.created'
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.cancelled'
  | 'reminder.sent';

/** Attempts, including the first. Backoff below. */
export const MAX_ATTEMPTS = 5;

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`;
}

/**
 * Signature the receiver verifies: HMAC-SHA256 over `<timestamp>.<body>`.
 * Including the timestamp is what stops an old, valid delivery from being
 * replayed later.
 */
export function signPayload(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/** 1, 4, 9, 16 minutes: quick retry first, then give the receiver room. */
function nextAttemptAt(attempts: number): string {
  return new Date(Date.now() + attempts * attempts * 60 * 1000).toISOString();
}

interface SendResult {
  ok: boolean;
  responseCode: number | null;
  error: string | null;
}

async function send(url: string, secret: string, body: string): Promise<SendResult> {
  const timestamp = Math.floor(Date.now() / 1000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-healthai-signature': `t=${timestamp},v1=${signPayload(secret, timestamp, body)}`,
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    return { ok: response.ok, responseCode: response.status, error: response.ok ? null : `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, responseCode: null, error: String(error).slice(0, 400) };
  }
}

/**
 * Sends an event to every active endpoint of a clinic and records the result.
 *
 * A failure is stored with a time to try again, and never breaks the action
 * that triggered it.
 */
export async function dispatchWebhook(
  clinicId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: endpoints } = await admin
      .from('webhook_endpoints')
      .select('id, url, secret, events')
      .eq('clinic_id', clinicId)
      .eq('active', true);

    const targets = (endpoints ?? []).filter((endpoint) => endpoint.events.includes(event));
    if (targets.length === 0) return;

    const payload = { event, created_at: new Date().toISOString(), data };
    const body = JSON.stringify(payload);

    await Promise.all(
      targets.map(async (endpoint) => {
        const { data: delivery } = await admin
          .from('webhook_deliveries')
          .insert({
            endpoint_id: endpoint.id,
            clinic_id: clinicId,
            event_type: event,
            payload,
            attempts: 1,
          })
          .select('id')
          .single();

        const result = await send(endpoint.url, endpoint.secret, body);
        if (!delivery) return;

        await admin
          .from('webhook_deliveries')
          .update({
            status: result.ok ? 'delivered' : 'failed',
            response_code: result.responseCode,
            error: result.error,
            delivered_at: result.ok ? new Date().toISOString() : null,
            next_attempt_at: result.ok ? null : nextAttemptAt(1),
          })
          .eq('id', delivery.id);
      })
    );
  } catch (error) {
    // Webhook problems must never surface as a failure of the user's action.
    console.error('webhook dispatch failed', error);
  }
}

export interface RetrySummary {
  attempted: number;
  delivered: number;
  failed: number;
  exhausted: number;
}

/** Retries failed deliveries that are due. Called by the cron route. */
export async function retryFailedDeliveries(limit = 25): Promise<RetrySummary> {
  const admin = createAdminClient();
  const summary: RetrySummary = { attempted: 0, delivered: 0, failed: 0, exhausted: 0 };

  const { data: deliveries } = await admin
    .from('webhook_deliveries')
    .select('id, endpoint_id, payload, attempts')
    .eq('status', 'failed')
    .lt('attempts', MAX_ATTEMPTS)
    .lte('next_attempt_at', new Date().toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(limit);

  if (!deliveries || deliveries.length === 0) return summary;

  const { data: endpoints } = await admin
    .from('webhook_endpoints')
    .select('id, url, secret, active')
    .in('id', Array.from(new Set(deliveries.map((delivery) => delivery.endpoint_id))));

  const endpointById = new Map((endpoints ?? []).map((endpoint) => [endpoint.id, endpoint]));

  for (const delivery of deliveries) {
    const endpoint = endpointById.get(delivery.endpoint_id);

    // Endpoint removed or switched off: stop trying.
    if (!endpoint || !endpoint.active) {
      await admin.from('webhook_deliveries').update({ next_attempt_at: null, attempts: MAX_ATTEMPTS }).eq('id', delivery.id);
      summary.exhausted += 1;
      continue;
    }

    summary.attempted += 1;
    const attempts = delivery.attempts + 1;
    const result = await send(endpoint.url, endpoint.secret, JSON.stringify(delivery.payload));

    if (result.ok) {
      summary.delivered += 1;
      await admin
        .from('webhook_deliveries')
        .update({
          status: 'delivered',
          attempts,
          response_code: result.responseCode,
          error: null,
          delivered_at: new Date().toISOString(),
          next_attempt_at: null,
        })
        .eq('id', delivery.id);
      continue;
    }

    const giveUp = attempts >= MAX_ATTEMPTS;
    if (giveUp) summary.exhausted += 1;
    else summary.failed += 1;

    await admin
      .from('webhook_deliveries')
      .update({
        attempts,
        response_code: result.responseCode,
        error: result.error,
        next_attempt_at: giveUp ? null : nextAttemptAt(attempts),
      })
      .eq('id', delivery.id);
  }

  return summary;
}
