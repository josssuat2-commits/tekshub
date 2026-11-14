const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = vm.createContext({ TaskHub: {} });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/session.js'), 'utf8'), context);
const H = context.TaskHub;
function adapter() { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; }
test('a fresh preview requires login even when a dashboard or task URL is opened directly', () => {
  const session = H.createPreviewSession(adapter()); assert.equal(session.read(), null);
  for (const target of ['dashboard', 'board', 'tasks', 'project/example', 'settings', 'profile']) assert.equal(H.accessRoute(false, target), 'login');
});
test('a selected preview profile survives refresh in the same tab and login routes to dashboard', () => {
  const storage = adapter(); const session = H.createPreviewSession(storage); session.enter('member-2');
  assert.equal(H.createPreviewSession(storage).read(), 'member-2');
  assert.equal(H.accessRoute(true, 'login'), 'dashboard'); assert.equal(H.accessRoute(true, 'board'), 'board');
});
test('logout clears the preview session while preserving workspace data', () => {
  const storage = adapter(); storage.values.set('taskhub.workspace.v1', 'existing-workspace');
  const session = H.createPreviewSession(storage); session.enter('member-1'); session.clear();
  assert.equal(session.read(), null); assert.equal(H.createPreviewSession(storage).read(), null);
  assert.equal(storage.getItem('taskhub.workspace.v1'), 'existing-workspace');
});
test('unknown preview identities are rejected without creating a session', () => {
  const storage = adapter(); const session = H.createPreviewSession(storage);
  assert.throws(() => session.enter('member-4')); assert.equal(session.read(), null);
  storage.values.set('taskhub.preview.member', 'member-4'); assert.equal(session.read(), null);
});
test('preview session works in memory when sessionStorage is unavailable', () => {
  const session = H.createPreviewSession({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } });
  assert.equal(session.read(), null); session.enter('member-3'); assert.equal(session.read(), 'member-3');
  session.clear(); assert.equal(session.read(), null);
});
