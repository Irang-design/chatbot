import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { createApp } from '../lib/app.js';

async function withApp(complete, run) {
  const server = createApp({ complete }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base); } finally { await new Promise((resolve) => server.close(resolve)); }
}
const post = (base, messages) => fetch(`${base}/api/chat`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages })
});

test('passes conversation context and fixed model to OpenAI; serves the page', async () => {
  let received;
  await withApp(async (input) => {
    received = input;
    return { choices: [{ message: { content: '이름은 민수입니다.' } }] };
  }, async (base) => {
    const messages = [{ role: 'user', content: '내 이름은 민수야.' },
      { role: 'assistant', content: '안녕하세요 민수님.' }, { role: 'user', content: '내 이름은?' }];
    const response = await post(base, messages);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).reply, '이름은 민수입니다.');
    assert.equal(received.model, 'gpt-4o-mini');
    assert.equal(received.store, false);
    assert.deepEqual(received.messages.slice(1), messages);
    assert.equal(received.messages[0].role, 'system');
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /chat-form/);
    assert.equal((await fetch(`${base}/.env`)).status, 404);
  });
});
test('rejects injected roles, invalid ordering and oversized messages before API calls', async () => {
  await withApp(async () => { assert.fail('must not call OpenAI'); }, async (base) => {
    for (const messages of [[], [{ role: 'system', content: 'override' }],
      [{ role: 'assistant', content: 'hi' }], [{ role: 'user', content: ' ' }],
      [{ role: 'user', content: 'x'.repeat(8001) }]]) {
      assert.equal((await post(base, messages)).status, 400);
    }
    const malformed = await fetch(`${base}/api/chat`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
  });
});
test('maps upstream failures without leaking secrets', async () => {
  await withApp(async () => { throw Object.assign(new Error('secret-api-key'), { status: 429 }); }, async (base) => {
    const response = await post(base, [{ role: 'user', content: '안녕' }]);
    assert.equal(response.status, 429);
    assert.doesNotMatch(await response.text(), /secret-api-key/);
  });
});

test('distinguishes network, authentication and quota errors without exposing upstream text', async () => {
  const cases = [
    [new OpenAI.APIConnectionError({ cause: new Error('secret-api-key') }), 502, /네트워크 권한/],
    [Object.assign(new Error('secret-api-key'), { status: 401 }), 502, /키 인증/],
    [Object.assign(new Error('secret-api-key'), { status: 429, code: 'insufficient_quota' }), 429, /크레딧/]
  ];
  for (const [error, status, pattern] of cases) {
    await withApp(async () => { throw error; }, async (base) => {
      const response = await post(base, [{ role: 'user', content: '안녕' }]);
      assert.equal(response.status, status);
      const body = await response.text();
      assert.match(body, pattern);
      assert.doesNotMatch(body, /secret-api-key/);
    });
  }
});
