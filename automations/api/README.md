# Public API and webhooks

Every clinic can create API keys and webhook endpoints under **Clinic → API and
webhooks**. The full reference is in [openapi.yaml](openapi.yaml), which can be
pasted into Swagger Editor, Postman or Insomnia.

## Authentication

```bash
curl -H "Authorization: Bearer hai_your_key" \
  https://your-app.vercel.app/api/v1/me
```

A key belongs to one clinic, is stored only as a SHA-256 hash, and is shown in
full exactly once. If you lose it, create another and revoke the old one.

## Typical calls

```bash
# Patients added most recently
curl -H "Authorization: Bearer $KEY" \
  "$BASE/api/v1/patients?limit=20"

# Create a patient
curl -X POST -H "Authorization: Bearer $KEY" -H "content-type: application/json" \
  -d '{"full_name":"Ana Souza","phone":"+5511999999999","locale":"pt"}' \
  "$BASE/api/v1/patients"

# Book a visit; reminders are queued automatically
curl -X POST -H "Authorization: Bearer $KEY" -H "content-type: application/json" \
  -d '{"patient_id":"<uuid>","starts_at":"2026-09-25T14:30:00-03:00","professional":"Dr. Lima"}' \
  "$BASE/api/v1/appointments"
```

## Webhooks

Add an endpoint, pick the events, and each one arrives as a POST:

```json
{
  "event": "appointment.confirmed",
  "created_at": "2026-09-20T12:00:00.000Z",
  "data": { "id": "…", "starts_at": "…", "patient_id": "…", "source": "whatsapp" }
}
```

Events: `patient.created`, `appointment.created`, `appointment.confirmed`,
`appointment.cancelled`, `reminder.sent`.

### Verifying a delivery

Each request carries `X-HealthAI-Signature: t=<unix seconds>,v1=<hex>`, where
the hex is `HMAC-SHA256(secret, "<t>.<raw body>")`. Compare it against the raw
body before parsing, and reject anything older than a few minutes — that is
what stops an old, genuine delivery from being replayed at you.

```js
const [t, v1] = header.split(',').map((part) => part.split('=')[1]);
const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  && Math.abs(Date.now() / 1000 - Number(t)) < 300;
```

Deliveries are attempted once and the result is logged on the integrations
page; there is no automatic retry yet.

## Zapier

There is no published Zapier app, so use the built-in generic steps:

- **Trigger — new patient or booking:** *Webhooks by Zapier → Catch Hook*.
  Copy the hook URL into HealthAI as a webhook endpoint and pick the events.
- **Action — create a patient:** *Webhooks by Zapier → Custom Request*, POST to
  `$BASE/api/v1/patients`, header `Authorization: Bearer <key>`, JSON body.
- **Polling alternative:** *Schedule by Zapier* plus a GET on
  `/api/v1/appointments?from=…` when you would rather pull than receive.

## Make (Integromat)

- **Trigger:** *Webhooks → Custom webhook*, then register that URL in HealthAI.
  Run "Determine data structure" once and send a test event from the app.
- **Action:** *HTTP → Make a request*, POST to `/api/v1/patients` or
  `/api/v1/appointments`, with the `Authorization` header.
- Parse the signature with the *Crypto* module if you want verification inside
  the scenario rather than trusting the URL's secrecy.

## Limits

- No pagination cursors: `limit` and `offset` only.
- No rate limiting on the public API yet, so keep keys private.
- Updating or deleting patients and appointments is not exposed yet; only
  create and read.
