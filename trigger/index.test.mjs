import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { test } from 'node:test';
import { appJwt, dispatch } from './index.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString());

test('signs a GitHub App JWT that verifies with the public key', async () => {
  const jwt = await appJwt('Iv23test', pem, 1_000_000);
  const [header, claims, signature] = jwt.split('.');
  assert.deepEqual(decode(header), { alg: 'RS256', typ: 'JWT' });
  assert.deepEqual(decode(claims), { iat: 999_940, exp: 1_000_540, iss: 'Iv23test' });
  assert.ok(createVerify('RSA-SHA256').update(`${header}.${claims}`).verify(publicKey, Buffer.from(signature, 'base64url')));
});

test('refuses a PKCS#1 key instead of failing obscurely', async () => {
  const pkcs1 = privateKey.export({ type: 'pkcs1', format: 'pem' });
  await assert.rejects(appJwt('Iv23test', pkcs1), /PKCS#8/);
});

test('mints a narrow installation token, then dispatches uptime.yml on main', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/access_tokens')) return new Response(JSON.stringify({ token: 'ghs_x' }), { status: 201 });
    return new Response(null, { status: 204 });
  };
  await dispatch({ GH_APP_CLIENT_ID: 'Iv23test', GH_APP_PRIVATE_KEY: pem, GH_APP_INSTALLATION_ID: '42' }, fetchImpl);
  assert.equal(calls[0].url, 'https://api.github.com/app/installations/42/access_tokens');
  assert.deepEqual(JSON.parse(calls[0].init.body), { repositories: ['status'], permissions: { actions: 'write' } });
  assert.equal(calls[1].url, 'https://api.github.com/repos/distari-ai/status/actions/workflows/uptime.yml/dispatches');
  assert.equal(calls[1].init.headers.authorization, 'Bearer ghs_x');
  assert.deepEqual(JSON.parse(calls[1].init.body), { ref: 'main' });
});

test('surfaces a failed dispatch', async () => {
  const fetchImpl = async (url) => url.endsWith('/access_tokens')
    ? new Response(JSON.stringify({ token: 'ghs_x' }), { status: 201 })
    : new Response('nope', { status: 403 });
  await assert.rejects(dispatch({ GH_APP_CLIENT_ID: 'a', GH_APP_PRIVATE_KEY: pem, GH_APP_INSTALLATION_ID: '1' }, fetchImpl), /HTTP 403/);
});
