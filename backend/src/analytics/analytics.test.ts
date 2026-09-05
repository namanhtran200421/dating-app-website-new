import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { analyticsInput, analyticsRouter, DailyMetric } from './analytics.js';

const event = { event: 'signup_success', path: '/blog/dating-without-swiping', landing: '/blog/dating-without-swiping', source: 'google', placement: 'article' };

test('analytics rejects identifiers, arbitrary paths, source text and events', () => {
  assert.equal(analyticsInput.safeParse(event).success, true);
  for (const extra of [ { email: 'reader@example.com' }, { source: 'reader@example.com' }, { path: '/users/alice' }, { event: 'purchase' } ]) {
    assert.equal(analyticsInput.safeParse({ ...event, ...extra }).success, false);
  }
});

test('HTTP collection validates origin and payload and writes only a daily aggregate', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api/analytics', analyticsRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/analytics`;
  const writes: unknown[][] = [];
  t.mock.method(DailyMetric, 'updateOne', (...args: unknown[]) => { writes.push(args); return Promise.resolve({ acknowledged: true }); });
  const post = (payload: unknown, origin = 'https://www.rosemarry.app') => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(payload) });
  assert.equal((await post(event, 'https://unrelated.example')).status, 403);
  assert.equal((await post({ ...event, email: 'private@example.com' })).status, 400);
  assert.equal(writes.length, 0);
  assert.equal((await post(event)).status, 204);
  assert.equal(writes.length, 1);
  const update = writes[0]?.[1] as { $inc: { count: number }; $setOnInsert: Record<string, unknown> };
  assert.equal(update.$inc.count, 1);
  assert.equal(update.$setOnInsert['source'], 'google');
  assert.equal(update.$setOnInsert['event'], 'signup_success');
  assert.equal(update.$setOnInsert['email'], undefined);
  assert.equal(update.$setOnInsert['ip'], undefined);
  assert.ok(update.$setOnInsert['expiresAt'] instanceof Date);
});
