'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, requireUser } from '@/lib/supabase/server';
import { getClinicContext } from '@/lib/data/clinic';
import { generateApiKey } from '@/lib/api/keys';
import { generateWebhookSecret } from '@/lib/api/webhooks';

export type IntegrationResult =
  | { status: 'ok' }
  // The plaintext key is returned once and never stored.
  | { status: 'created'; key: string }
  | { status: 'createdWebhook'; secret: string }
  | { status: 'error'; reason: 'forbidden' | 'invalid' | 'failed' };

async function requireOwner() {
  const user = await requireUser();
  const clinic = await getClinicContext(user.id);
  if (!clinic || clinic.role !== 'owner') return null;
  return { user, clinic };
}

export async function createApiKey(formData: FormData): Promise<IntegrationResult> {
  const context = await requireOwner();
  if (!context) return { status: 'error', reason: 'forbidden' };

  const name = String(formData.get('name') ?? '').trim().slice(0, 60);
  const key = generateApiKey();

  const supabase = createClient();
  const { error } = await supabase.from('api_keys').insert({
    clinic_id: context.clinic.id,
    name: name || 'API key',
    prefix: key.prefix,
    key_hash: key.hash,
    created_by: context.user.id,
  });

  if (error) return { status: 'error', reason: 'failed' };

  revalidatePath('/clinic/integrations');
  return { status: 'created', key: key.plaintext };
}

export async function revokeApiKey(formData: FormData): Promise<IntegrationResult> {
  const context = await requireOwner();
  if (!context) return { status: 'error', reason: 'forbidden' };

  const id = formData.get('id');
  if (typeof id !== 'string') return { status: 'error', reason: 'invalid' };

  const supabase = createClient();
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('clinic_id', context.clinic.id);

  if (error) return { status: 'error', reason: 'failed' };

  revalidatePath('/clinic/integrations');
  return { status: 'ok' };
}

const webhookSchema = z.object({
  url: z.string().trim().url().max(500).refine((value) => value.startsWith('https://') || value.startsWith('http://localhost'), {
    message: 'Use https, or http only for localhost.',
  }),
  events: z.array(z.string().max(60)).min(1).max(10),
});

export async function createWebhook(formData: FormData): Promise<IntegrationResult> {
  const context = await requireOwner();
  if (!context) return { status: 'error', reason: 'forbidden' };

  const parsed = webhookSchema.safeParse({
    url: formData.get('url'),
    events: formData.getAll('events').filter((value): value is string => typeof value === 'string'),
  });
  if (!parsed.success) return { status: 'error', reason: 'invalid' };

  const secret = generateWebhookSecret();
  const supabase = createClient();
  const { error } = await supabase.from('webhook_endpoints').insert({
    clinic_id: context.clinic.id,
    url: parsed.data.url,
    secret,
    events: parsed.data.events,
  });

  if (error) return { status: 'error', reason: 'failed' };

  revalidatePath('/clinic/integrations');
  return { status: 'createdWebhook', secret };
}

export async function deleteWebhook(formData: FormData): Promise<IntegrationResult> {
  const context = await requireOwner();
  if (!context) return { status: 'error', reason: 'forbidden' };

  const id = formData.get('id');
  if (typeof id !== 'string') return { status: 'error', reason: 'invalid' };

  const supabase = createClient();
  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('clinic_id', context.clinic.id);

  if (error) return { status: 'error', reason: 'failed' };

  revalidatePath('/clinic/integrations');
  return { status: 'ok' };
}
