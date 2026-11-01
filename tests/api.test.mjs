import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBaseUrl, request, fetchSnapshot } from '../src/services/api.js';
const base = 'https://example.mokky.dev';

test('Mokky address validation rejects unrelated hosts, credentials, paths and HTTP', () => {
  assert.equal(validateBaseUrl(`${base}/`), base);
  for (const url of ['http://example.mokky.dev', 'https://mokky.dev.evil.test', 'https://example.mokky.dev/employees', 'https://user:password@example.mokky.dev', 'https://example.mokky.dev?token=secret']) assert.throws(() => validateBaseUrl(url));
});
test('failed REST writes throw instead of reporting a saved event', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{"error":"denied"}', { status: 403 }));
  await assert.rejects(request(base, '/access_events', { method: 'POST', body: { employeeId: 1 } }), /Требуется вход/);
});
test('an authentication failure is distinct from a missing collection', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 404 }));
  await assert.rejects(request(base, '/auth', { method: 'POST', body: { email: 'test@example.com', password: 'example-password' } }), /Неверный email или пароль/);
});
test('snapshot fails if a collection unexpectedly returns pagination instead of an array', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{"items":[]}', { status: 200 }));
  await assert.rejects(fetchSnapshot({ mode: 'mokky', baseUrl: base }, 'example-token'), /ожидается массив JSON/);
});
test('REST requests carry the session token and never put it in the URL', async t => {
  let sent;
  t.mock.method(globalThis, 'fetch', async (url, options) => { sent = { url, options }; return new Response('{"id":1}', { status: 200 }); });
  const response = await request(base, '/employees', { method: 'POST', token: 'example-token', body: { fullName: 'Тест' } });
  assert.equal(response.id, 1);
  assert.equal(sent.url, `${base}/employees`);
  assert.equal(sent.options.headers.Authorization, 'Bearer example-token');
  assert.equal(JSON.parse(sent.options.body).fullName, 'Тест');
});
