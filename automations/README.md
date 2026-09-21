# Automations

Appointment reminders and the WhatsApp bot are driven by two n8n workflows that
talk to the app over a small HTTP API. The decisions (what a reply means, which
appointment it applies to) live in the app; n8n only moves messages around, so
the rules stay versioned in this repository.

```
n8n (every 5 min) ──GET /api/automation/reminders/due───────────► HealthAI
                  ◄─────────── reminders to send ───────────────
                  ──send via WhatsApp (Twilio) ──► patient
                  ──POST /api/automation/reminders/complete ────► HealthAI

patient ──reply on WhatsApp──► Twilio ──webhook──► n8n
                  ──POST /api/automation/whatsapp/inbound ──────► HealthAI
                  ◄─────────── reply text + intent ─────────────
                  ──send reply ──► patient
```

## Endpoints

All three require the header `x-api-key: $AUTOMATION_API_KEY`. They use the
Supabase service role, which bypasses row level security, so **the key is the
only thing protecting every user's data** — treat it like a password, keep it
out of the repository, and rotate it if it leaks.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/automation/reminders/due?limit=20` | Reminders whose time has come, with the message already written in the patient's language |
| `POST` | `/api/automation/reminders/complete` | Report delivery: `{ jobId, status: "sent" \| "failed", providerMessageId?, error? }` |
| `POST` | `/api/automation/whatsapp/inbound` | An inbound message: `{ from, text, providerMessageId? }`. Returns `{ matched, intent, reply }` |

Inbound replies are understood in English, Spanish and Portuguese: *yes / sí /
sim* confirms, *no / não* cancels, and *change / cambiar / remarcar*
reschedules. Confirmations and cancellations update the appointment
immediately; a reschedule is flagged for a human, because picking a new time
needs the clinic's calendar.

## Setup

1. **Import the workflows.** In n8n: *Workflows → Import from file* for both
   files in `n8n/`.
2. **Set the environment variables** available to n8n:
   - `HEALTHAI_BASE_URL` — e.g. `https://your-app.vercel.app`
   - `HEALTHAI_AUTOMATION_KEY` — the same value as `AUTOMATION_API_KEY`
   - `TWILIO_ACCOUNT_SID`, `TWILIO_WHATSAPP_FROM` (e.g. `whatsapp:+14155238886`)
3. **Add an HTTP Basic Auth credential** in n8n with your Twilio Account SID as
   the user and the Auth Token as the password, and select it on both HTTP
   nodes that call Twilio.
4. **Point Twilio at n8n.** In the Twilio console, set the WhatsApp sandbox
   inbound webhook to the production URL of the `WhatsApp webhook` node.
5. **Activate both workflows.**

The Twilio WhatsApp sandbox is enough for a demo: each tester joins the sandbox
once from their phone. A real WhatsApp Business sender needs Meta verification,
which takes days and changes nothing about this setup.

## Testing without n8n

```bash
# What is due right now
curl -s -H "x-api-key: $AUTOMATION_API_KEY" \
  "$BASE_URL/api/automation/reminders/due" | python -m json.tool

# Simulate a patient confirming
curl -s -X POST -H "x-api-key: $AUTOMATION_API_KEY" -H "content-type: application/json" \
  -d '{"from":"+5511999999999","text":"sim"}' \
  "$BASE_URL/api/automation/whatsapp/inbound" | python -m json.tool
```

The number must match a phone saved on an app user's profile or on a clinic's
patient record, otherwise the route answers `{ "matched": false }` — it never
reveals whether a number is known.

## Zapier and Make

Both can replace n8n without touching the app: poll `reminders/due` on a
schedule, send the message with their WhatsApp or Twilio action, then call
`reminders/complete`. For inbound, point the provider's webhook at a Zap or
Scenario that posts to `whatsapp/inbound` and sends back `reply`.

## Known limits

- A reminder is counted as attempted when it is handed out, and gives up after
  three attempts. Two schedulers polling at once could send one message twice —
  run a single scheduler.
- Delivery receipts are not tracked beyond sent or failed.
- Rescheduling notifies a human rather than offering free slots; that needs the
  clinic calendar work.
