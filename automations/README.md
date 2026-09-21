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

The workflows need no environment variables, so they run on n8n Cloud as well
as on a self-hosted n8n. Plain settings live in a **Settings** node at the
start of each workflow; keys live in n8n credentials, which n8n encrypts.

1. **In the app (Vercel):** set `AUTOMATION_API_KEY` to a random value of at
   least 24 characters and redeploy. The same value goes into n8n in step 3.
2. **In Twilio:** create an account, open *Messaging → Try it out → Send a
   WhatsApp message*, and join the sandbox from your phone by sending the code
   shown there. Note the sandbox number (for example `+14155238886`), your
   **Account SID** and your **Auth Token**.
3. **In n8n, create two credentials** (*Credentials → Add credential*):
   - **Header Auth**, named `HealthAI automation key`: name `x-api-key`, value
     the `AUTOMATION_API_KEY` from step 1.
   - **Basic Auth**, named `Twilio`: user = Account SID, password = Auth Token.
4. **Import both workflows** (*Workflows → Import from file*, the two files in
   `n8n/`). In each one:
   - open **Settings** and fill in `baseUrl` (your site, no trailing slash),
     `twilioAccountSid` and `whatsappFrom` (`whatsapp:` + the sandbox number);
   - in the inbound workflow, also set `webhookToken` to a long random value;
   - on every HTTP node, pick the matching credential: `HealthAI automation
     key` on the ones that call the app, `Twilio` on the ones that call Twilio.
5. **Point Twilio at n8n.** In the sandbox settings, set *When a message comes
   in* to the **production** URL of the `WhatsApp webhook` node followed by
   `?token=` and your `webhookToken`, method `POST`.
6. **Activate both workflows.**

The token in step 5 matters: without it, anyone who found the webhook URL
could post a fake reply "from" a patient's number and confirm or cancel their
appointment. Requests without the right token get `403`. (Checking Twilio's
request signature would be stronger still; it needs a Code node with the
`crypto` module, which some n8n Cloud plans do not allow.)

### Trying it end to end

1. Put the phone that joined the sandbox on a record: your own profile
   (Settings → phone) for a personal appointment, or a clinic patient.
2. Book an appointment a little over two hours ahead, say 2 h 05 min. Its
   2-hour reminder becomes due five minutes later; the 24-hour one is skipped
   because its time has passed.
3. Within the next five-minute run of n8n the message arrives. Answer `sim`,
   `no` or `remarcar`, and the appointment changes status in the app.

The Twilio sandbox is enough for a demo: each tester joins it once from their
phone. Messaging any patient without that step needs a WhatsApp Business
sender approved by Meta, which takes days and changes nothing else here.

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
