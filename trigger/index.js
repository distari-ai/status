// Starts the Uptime CI workflow every five minutes from Cloudflare, because GitHub's own
// cron schedules for this repository did not fire (4 November 2026, #1183). It signs in as
// the org-owned GitHub App "Distari status trigger", installed on this repository only with
// Actions: write, and dispatches .github/workflows/uptime.yml. No Distari service is involved.
const API = 'https://api.github.com';
const HEADERS = {
  accept: 'application/vnd.github+json',
  'user-agent': 'distari-status-trigger',
  'x-github-api-version': '2022-11-28',
};

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const encode = (value) => b64url(new TextEncoder().encode(JSON.stringify(value)));

/** An RS256 GitHub App JWT from a PKCS#8 PEM key, valid for nine minutes. */
export async function appJwt(clientId, pem, now = Math.floor(Date.now() / 1000)) {
  if (!pem.includes('BEGIN PRIVATE KEY')) throw new Error('GH_APP_PRIVATE_KEY must be PKCS#8');
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const body = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iat: now - 60, exp: now + 540, iss: clientId })}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(body));
  return `${body}.${b64url(signature)}`;
}

export async function dispatch(env, fetchImpl = fetch) {
  const jwt = await appJwt(env.GH_APP_CLIENT_ID, env.GH_APP_PRIVATE_KEY);
  const minted = await fetchImpl(`${API}/app/installations/${env.GH_APP_INSTALLATION_ID}/access_tokens`, {
    method: 'POST',
    headers: { ...HEADERS, authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ repositories: ['status'], permissions: { actions: 'write' } }),
  });
  if (!minted.ok) throw new Error(`installation token request failed: HTTP ${minted.status}`);
  const { token } = await minted.json();
  const started = await fetchImpl(`${API}/repos/distari-ai/status/actions/workflows/uptime.yml/dispatches`, {
    method: 'POST',
    headers: { ...HEADERS, authorization: `Bearer ${token}` },
    body: JSON.stringify({ ref: 'main' }),
  });
  if (started.status !== 204) throw new Error(`workflow dispatch failed: HTTP ${started.status}`);
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(dispatch(env));
  },
};
