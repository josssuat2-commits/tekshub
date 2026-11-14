const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup(handler, theme = 'light') {
  const calls = [];
  const context = vm.createContext({ URL, AbortSignal, fetch: async (url, options) => { calls.push({ url, options }); return handler(url, options); } });
  for (const file of ['storage', 'tasks', 'projects', 'notes', 'links', 'members', 'api']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), context);
  const H = context.TaskHub;
  const preference = new Map([['taskhub.theme', theme]]);
  const store = H.createRemoteStore({ getItem: k => preference.get(k), setItem: (k, v) => preference.set(k, v) });
  return { H, store, calls, preference };
}
const reply = (value, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => value });
test('remote load uses server identity and device theme without persisting workspace or credentials locally', async () => {
  let envelope;
  const s = setup(() => reply(envelope), 'dark'); envelope = { state: s.H.initialState(), revision: 0, memberId: 'member-2' };
  const state = await s.store.load();
  assert.equal(state.settings.currentMember, 'member-2'); assert.equal(state.settings.theme, 'dark');
  s.store.transact(next => { next.settings.theme = 'light'; });
  assert.equal(s.preference.size, 1); assert.equal(s.calls.length, 1);
  assert.throws(() => s.store.transact(next => { next.settings.currentMember = 'member-1'; }));
});
test('failed remote saves never mutate shared state or notify a false success', async () => {
  let envelope;
  const s = setup((url) => url === '/api/workspace' ? reply(envelope) : reply({ error: 'Database unavailable' }, 503));
  envelope = { state: s.H.initialState(), revision: 0, memberId: 'member-1' }; await s.store.load(); let events = 0; s.store.subscribe(() => events++);
  const old = JSON.stringify(s.store.get());
  await assert.rejects(s.H.tasks.status(s.store, 'task-1', 'To Do'), e => e.status === 503);
  assert.equal(JSON.stringify(s.store.get()), old); assert.equal(events, 0);
});
test('conflict loads current server data and rejects the stale command for explicit review', async () => {
  let envelope, reads = 0;
  const s = setup(url => { if (url !== '/api/workspace') return reply({ error: 'Conflict', code: 'REVISION_CONFLICT' }, 409); reads++; return reply({ ...envelope, revision: reads === 1 ? 0 : 1 }); });
  envelope = { state: s.H.initialState(), revision: 0, memberId: 'member-1' }; await s.store.load();
  await assert.rejects(s.H.notes.pin(s.store, 'note-1'), e => e.status === 409);
  assert.equal(s.store.revision, 1); assert.equal(reads, 2);
});
test('in-flight writes reject duplicate commands and emit only after server confirmation', async () => {
  let envelope, release;
  const s = setup(url => url === '/api/workspace' ? reply(envelope) : new Promise(resolve => { release = () => resolve(reply({ ...envelope, revision: 1 })); }));
  envelope = { state: s.H.initialState(), revision: 0, memberId: 'member-1' }; await s.store.load();
  const first = s.store.execute('task.status', { id: 'task-1', status: 'Done' });
  await assert.rejects(s.store.execute('task.status', {})); assert.equal(s.store.revision, 0); assert.equal(s.store.busy, true);
  release(); await first; assert.equal(s.store.revision, 1); assert.equal(s.store.busy, false);
  const sent = JSON.parse(s.calls.at(-1).options.body); assert.equal(sent.memberId, 'member-1'); assert.equal(sent.revision, 0);
});
test('transport failure states that commit status is uncertain and never retries a write', async () => {
  let envelope;
  const s = setup(url => { if (url === '/api/workspace') return reply(envelope); throw new Error('offline'); });
  envelope = { state: s.H.initialState(), revision: 0, memberId: 'member-1' }; await s.store.load();
  await assert.rejects(s.store.execute('task.remove', { id: 'task-1' }), /belum dapat dipastikan/);
  assert.equal(s.calls.filter(c => c.options.method === 'POST').length, 1); assert.equal(s.store.revision, 0);
});
test('refresh updates identity when another tab changes the browser session even at the same revision', async () => {
  let envelope;
  const s = setup(() => reply(envelope)); envelope = { state: s.H.initialState(), revision: 0, memberId: 'member-1' };
  await s.store.load(); envelope.memberId = 'member-2';
  assert.equal(await s.store.refresh(), true); assert.equal(s.store.get().settings.currentMember, 'member-2');
});
