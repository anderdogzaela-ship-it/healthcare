import { redirect } from 'next/navigation';
import { createClient, requireUser } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/supabase/env';
import { getClinicContext } from '@/lib/data/clinic';
import IntegrationsView, {
  type ApiKeyRow,
  type DeliveryRow,
  type WebhookRow,
} from '@/components/clinic/IntegrationsView';

export default async function IntegrationsPage() {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic) redirect('/clinic');

  const supabase = createClient();

  // Row level security already restricts keys and endpoints to owners; staff
  // simply see empty lists plus the delivery log.
  const [{ data: keyRows }, { data: webhookRows }, { data: deliveryRows }] = await Promise.all([
    supabase
      .from('api_keys')
      // All columns: keys created before the scopes migration have no scope.
      .select('*')
      .eq('clinic_id', clinic.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('webhook_endpoints')
      .select('id, url, events, active')
      .eq('clinic_id', clinic.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('webhook_deliveries')
      .select('id, event_type, status, response_code, created_at')
      .eq('clinic_id', clinic.id)
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  const keys: ApiKeyRow[] = (keyRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    scope: row.scope === 'read' ? 'read' : 'write',
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  }));

  const webhooks: WebhookRow[] = (webhookRows ?? []).map((row) => ({
    id: row.id,
    url: row.url,
    events: row.events,
    active: row.active,
  }));

  const deliveries: DeliveryRow[] = (deliveryRows ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    status: row.status,
    responseCode: row.response_code,
    createdAt: row.created_at,
  }));

  return (
    <IntegrationsView
      baseUrl={siteUrl()}
      keys={keys}
      webhooks={webhooks}
      deliveries={deliveries}
      isOwner={clinic.role === 'owner'}
    />
  );
}
