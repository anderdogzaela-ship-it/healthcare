/**
 * Sends email through Resend's HTTP API.
 *
 * Optional: without RESEND_API_KEY the app simply does not send email, and
 * the screens that could send say so. EMAIL_FROM must be an address on a
 * domain verified in Resend; Resend's shared test sender
 * (onboarding@resend.dev) only delivers to the Resend account's own address.
 */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function sender(): string {
  return process.env.EMAIL_FROM || 'HealthAI <onboarding@resend.dev>';
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(email: OutgoingEmail): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'not_configured' };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: sender(), to: [email.to], subject: email.subject, html: email.html, text: email.text }),
    });

    if (!response.ok) {
      // Resend explains the problem in the body, for example an unverified
      // domain; log it so the cause is visible in the deployment logs.
      const detail = await response.text().catch(() => '');
      console.error(`email: Resend answered ${response.status}`, detail.slice(0, 500));
      return { ok: false, error: `status_${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    console.error('email: request failed', error);
    return { ok: false, error: 'network' };
  }
}
