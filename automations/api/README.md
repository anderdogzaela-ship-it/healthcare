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

Each key has an access level, chosen when it is created:

- **Read only** — every `GET` endpoint. `POST`, `PATCH` and `DELETE` answer
  `403 {"error": "insufficient_scope"}`. Use it for dashboards, reports and
  anything that only copies data out.
- **Read and write** — everything. Keys created before access levels existed
  are read and write.

`GET /me` reports the key's `access` and its `scopes`.

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

### Retries

A failed delivery is retried up to five times with growing gaps (1, 4, 9 and
16 minutes) by a scheduled job. On Vercel this runs from `vercel.json` every
ten minutes; anywhere else, call it yourself:

```bash
curl -H "x-api-key: $AUTOMATION_API_KEY" "$BASE/api/cron/webhook-retries"
```

Your endpoint should answer 2xx quickly and do the real work afterwards, and
must tolerate the same event arriving twice — a retry after a timeout cannot
know whether the first attempt was processed.

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

## Rate limit

120 requests per minute per key. Over the limit the API answers `429` with a
`Retry-After` header.

## Updating and removing

```bash
# Change a patient's status
curl -X PATCH -H "Authorization: Bearer $KEY" -H "content-type: application/json" \
  -d '{"status":"active"}' "$BASE/api/v1/patients/<id>"

# Move an appointment: reminders are re-queued for the new time
curl -X PATCH -H "Authorization: Bearer $KEY" -H "content-type: application/json" \
  -d '{"starts_at":"2026-09-26T09:00:00-03:00"}' "$BASE/api/v1/appointments/<id>"

# Cancel it: pending reminders stop and a webhook fires
curl -X DELETE -H "Authorization: Bearer $KEY" "$BASE/api/v1/appointments/<id>"
```

`DELETE /patients/{id}` archives by default, keeping history; add `?hard=true`
to delete the record outright, which is what an erasure request needs.

## Limits

- No pagination cursors: `limit` and `offset` only.
