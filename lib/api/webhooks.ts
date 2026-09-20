import { createHmac, randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type WebhookEvent =
  | 'patient.created'
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.cancelled'
  | 'reminder.sent';

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

/**
 * Sends an event to every active endpoint of a clinic and records the result.
 *
 * Deliveries are attempted once, in the background of the request that caused
 * them; a failure is logged rather than retried, and never breaks the action
 * the user performed.
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

    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ event, created_at: new Date().toISOString(), data });

    await Promise.all(
      targets.map(async (endpoint) => {
        const { data: delivery } = await admin
          .from('webhook_deliveries')
          .insert({ endpoint_id: endpoint.id, clinic_id: clinicId, event_type: event })
          .select('id')
          .single();

        try {
          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-healthai-event': event,
              'x-healthai-signature': `t=${timestamp},v1=${signPayload(endpoint.secret, timestamp, body)}`,
            },
            body,
            signal: AbortSignal.timeout(8000),
          });

          if (delivery) {
            await admin
              .from('webhook_deliveries')
              .update({
                status: response.ok ? 'delivered' : 'failed',
                response_code: response.status,
                delivered_at: new Date().toISOString(),
              })
              .eq('id', delivery.id);
          }
        } catch (error) {
          if (delivery) {
            await admin
              .from('webhook_deliveries')
              .update({ status: 'failed', error: String(error).slice(0, 400) })
              .eq('id', delivery.id);
          }
        }
      })
    );
  } catch (error) {
    // Webhook problems must never surface as a failure of the user's action.
    console.error('webhook dispatch failed', error);
  }
}
