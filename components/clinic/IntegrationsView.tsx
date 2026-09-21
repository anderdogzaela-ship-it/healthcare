'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, KeyRound, Webhook, Copy, Check, Trash2, AlertCircle, Plus
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { createApiKey, createWebhook, deleteWebhook, revokeApiKey } from '@/app/actions/integrations';
import type { Messages } from '@/lib/i18n/messages';

type DeliveryStatus = keyof Messages['integrations']['deliveryStatus'];

const EVENTS = [
  'patient.created',
  'appointment.created',
  'appointment.confirmed',
  'appointment.cancelled',
  'reminder.sent',
] as const;

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scope: 'read' | 'write';
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

export interface DeliveryRow {
  id: string;
  eventType: string;
  status: DeliveryStatus;
  responseCode: number | null;
  createdAt: string;
}

export default function IntegrationsView({
  baseUrl,
  keys,
  webhooks,
  deliveries,
  isOwner,
}: {
  baseUrl: string;
  keys: ApiKeyRow[];
  webhooks: WebhookRow[];
  deliveries: DeliveryRow[];
  isOwner: boolean;
}) {
  const { m, formatDate } = useI18n();
  const router = useRouter();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard can be blocked; the value stays selectable on screen.
    }
  };

  const submitKey = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailed(false);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createApiKey(formData);
      if (result.status === 'created') {
        setNewKey(result.key);
        form.reset();
        router.refresh();
      } else if (result.status === 'error') {
        setFailed(true);
      }
    });
  };

  const submitWebhook = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFailed(false);
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createWebhook(formData);
      if (result.status === 'createdWebhook') {
        setNewSecret(result.secret);
        form.reset();
        router.refresh();
      } else if (result.status === 'error') {
        setFailed(true);
      }
    });
  };

  const act = (action: typeof revokeApiKey, id: string) => {
    const formData = new FormData();
    formData.set('id', id);
    startTransition(async () => {
      await action(formData);
      router.refresh();
    });
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all';

  return (
    <main className="flex-1 overflow-y-auto p-4 lg:p-8 animate-fade-in">
      <Link href="/clinic" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-emerald-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {m.clinic.backToPatients}
      </Link>

      <div className="mt-4 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.integrations.title}</h1>
          <p className="text-gray-500 mt-1">{m.integrations.subtitle}</p>
          <p className="mt-3 text-xs text-gray-400">
            {m.integrations.baseUrl}: <code className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600">{baseUrl}/api/v1</code>
          </p>
        </div>

        {failed && (
          <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{m.integrations.error}</p>
          </div>
        )}

        {!isOwner && <p className="text-sm text-gray-400">{m.integrations.ownerOnly}</p>}

        {/* API keys */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>
            <KeyRound className="w-4 h-4 text-gray-400" />
            {m.integrations.keysTitle}
          </h2>

          {newKey && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 animate-slide-up">
              <p className="text-sm text-emerald-800">{m.integrations.keyCreated}</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-white border border-emerald-100 text-xs text-gray-700 break-all">{newKey}</code>
                <button
                  onClick={() => copy(newKey)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                >
                  {copied === newKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === newKey ? m.integrations.copied : m.integrations.copy}
                </button>
              </div>
            </div>
          )}

          {isOwner && (
            <form onSubmit={submitKey} className="flex flex-col sm:flex-row gap-2 mb-5">
              <input name="name" type="text" placeholder={m.integrations.keyNamePlaceholder} aria-label={m.integrations.keyName} className={inputClass} />
              <select name="scope" defaultValue="write" aria-label={m.integrations.scope} className={`${inputClass} sm:w-auto`}>
                <option value="write">{m.integrations.scopes.write}</option>
                <option value="read">{m.integrations.scopes.read}</option>
              </select>
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all disabled:opacity-60 flex-shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {pending ? m.integrations.creating : m.integrations.create}
              </button>
            </form>
          )}

          {keys.length === 0 ? (
            <p className="text-sm text-gray-400">{m.integrations.noKeys}</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {keys.map((key) => (
                <li key={key.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {key.name}
                      <span
                        className={`ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                          key.scope === 'read' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {m.integrations.scopes[key.scope]}
                      </span>
                      {key.revokedAt && <span className="ml-2 text-xs text-gray-400">({m.integrations.revoked})</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      <code>{key.prefix}…</code> · {m.integrations.lastUsed}:{' '}
                      {key.lastUsedAt ? formatDate(new Date(key.lastUsedAt), { day: 'numeric', month: 'short' }) : m.integrations.never}
                    </p>
                  </div>
                  {isOwner && !key.revokedAt && (
                    <button
                      onClick={() => act(revokeApiKey, key.id)}
                      disabled={pending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-60"
                    >
                      {m.integrations.revoke}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Webhooks */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>
            <Webhook className="w-4 h-4 text-gray-400" />
            {m.integrations.webhooksTitle}
          </h2>

          {newSecret && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 animate-slide-up">
              <p className="text-sm text-emerald-800">{m.integrations.secretCreated}</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-white border border-emerald-100 text-xs text-gray-700 break-all">{newSecret}</code>
                <button
                  onClick={() => copy(newSecret)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                >
                  {copied === newSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === newSecret ? m.integrations.copied : m.integrations.copy}
                </button>
              </div>
            </div>
          )}

          {isOwner && (
            <form onSubmit={submitWebhook} className="space-y-3 mb-5">
              <input name="url" type="url" required placeholder="https://hooks.example.com/healthai" aria-label={m.integrations.url} className={inputClass} />
              <fieldset>
                <legend className="text-xs font-semibold text-gray-600 mb-2">{m.integrations.events}</legend>
                <div className="flex flex-wrap gap-3">
                  {EVENTS.map((event) => (
                    <label key={event} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        name="events"
                        value={event}
                        defaultChecked={event !== 'reminder.sent'}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <code>{event}</code>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all disabled:opacity-60"
              >
                {m.integrations.addWebhook}
              </button>
            </form>
          )}

          {webhooks.length === 0 ? (
            <p className="text-sm text-gray-400">{m.integrations.noWebhooks}</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {webhooks.map((webhook) => (
                <li key={webhook.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{webhook.url}</p>
                    <p className="text-xs text-gray-400 truncate">{webhook.events.join(', ')}</p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => act(deleteWebhook, webhook.id)}
                      disabled={pending}
                      aria-label={m.integrations.remove}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-60"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Deliveries */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>{m.integrations.deliveriesTitle}</h2>
          {deliveries.length === 0 ? (
            <p className="text-sm text-gray-400">{m.integrations.noDeliveries}</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {deliveries.map((delivery) => (
                <li key={delivery.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <code className="text-xs text-gray-600">{delivery.eventType}</code>
                  <span className="text-xs text-gray-400">
                    {formatDate(new Date(delivery.createdAt), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span
                    className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      delivery.status === 'delivered'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : delivery.status === 'failed'
                          ? 'bg-red-50 text-red-600 border-red-100'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}
                  >
                    {m.integrations.deliveryStatus[delivery.status]}
                    {delivery.responseCode ? ` · ${delivery.responseCode}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
