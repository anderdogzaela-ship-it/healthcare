/**
 * Shared-secret authentication for the automation endpoints (n8n, Zapier,
 * Make). These routes use the service role, so the secret is the only thing
 * standing between the internet and every user's data: keep it long, keep it
 * out of the repo, and rotate it if it leaks.
 */
export function isAuthorizedAutomation(request: Request): boolean {
  const configured = process.env.AUTOMATION_API_KEY;
  if (!configured || configured.length < 24) return false;

  const provided = request.headers.get('x-api-key') ?? '';
  if (provided.length !== configured.length) return false;

  // Constant-time comparison: a length check already leaked the length, but
  // this avoids leaking the contents through timing.
  let mismatch = 0;
  for (let i = 0; i < configured.length; i++) {
    mismatch |= configured.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}

export function unauthorized() {
  return Response.json({ error: 'unauthorized' }, { status: 401 });
}
