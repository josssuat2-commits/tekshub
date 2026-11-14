const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createClient } = require('@libsql/client');
const { createRepository } = require('../server/database.cjs');
const { createServer } = require('../server.cjs');
const { sessionCookie } = require('../server/auth.cjs');
const { readConfig } = require('../server/config.cjs');
const { executeCommand } = require('../server/domain.cjs');
let server, repo, directory, base, config, cookie1, cookie2;
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'taskhub-test-'));
  repo = createRepository(createClient({ url: 'file:' + path.join(directory, 'test.db') }));
  config = { mode: 'turso', production: false, secret: 'test-session-secret-at-least-32-characters' };
  server = createServer({ config, repository: repo });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`; config.origin = base;
});
after(async () => {
  await new Promise(resolve => server.close(resolve)); repo.close();
  const target = path.resolve(directory);
  if (!target.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(target).startsWith('taskhub-test-')) throw new Error('Unexpected cleanup target');
  await fs.rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
async function api(route, { method = 'GET', body, cookie, origin = base, client = '1' } = {}) {
  const response = await fetch(base + route, { method, headers: { 'content-type': 'application/json', 'x-taskhub-client': client, origin, ...(cookie ? { cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json(); return { response, data };
}
async function command(name, payload = {}, cookie = cookie1, revision) {
  if (revision === undefined) revision = (await api('/api/workspace', { cookie })).data.revision;
  return api('/api/command', { method: 'POST', cookie, body: { revision, command: name, payload } });
}
test('server rejects incomplete configuration and local production storage', () => {
  assert.throws(() => readConfig({ NODE_ENV: 'production', TASKHUB_STORAGE: 'local' }));
  assert.throws(() => readConfig({}));
});
test('profile selection rejects missing or unknown members without creating sessions', async () => {
  await repo.read();
  const before = (await repo.client.execute('SELECT COUNT(*) AS count FROM sessions')).rows[0].count;
  for (const memberId of [undefined, '', 'member-4', '__proto__', 1, ['member-1']]) {
    const result = await api('/api/login', { method: 'POST', body: { memberId } });
    assert.equal(result.response.status, 400); assert.equal(result.data.code, 'INVALID_MEMBER');
    assert.equal(result.response.headers.get('set-cookie'), null);
  }
  assert.equal((await repo.client.execute('SELECT COUNT(*) AS count FROM sessions')).rows[0].count, before);
  assert.match(sessionCookie('token', { production: true }), /; Secure/);
});
test('protected workspace rejects unauthenticated access; config never reveals credentials', async () => {
  assert.equal((await api('/api/workspace')).response.status, 401);
  assert.equal((await api('/api/command', { method: 'POST', body: {} })).response.status, 401);
  const settings = await api('/api/config'); assert.deepEqual(settings.data, { mode: 'turso' });
  assert.deepEqual((await api('/api/session')).data, { authenticated: false });
});
test('selecting a member without a password creates a session and shares an empty workspace', async () => {
  const one = await api('/api/login', { method: 'POST', body: { memberId: 'member-1' } });
  assert.equal(one.response.status, 200); cookie1 = one.response.headers.get('set-cookie').split(';')[0];
  assert.match(one.response.headers.get('set-cookie'), /HttpOnly/); assert.match(one.response.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal(one.data.state.members.length, 3); assert.equal(one.data.state.tasks.length, 0);
  const two = await api('/api/login', { method: 'POST', body: { memberId: 'member-2' } });
  cookie2 = two.response.headers.get('set-cookie').split(';')[0];
  assert.equal(two.data.memberId, 'member-2');
  const sessions = await repo.client.execute('SELECT token_hash FROM sessions');
  assert.ok(sessions.rows.every(row => !cookie1.includes(row.token_hash) && !cookie2.includes(row.token_hash)));
});

test('all three profiles support refresh and changing profiles revokes the previous session', async () => {
  const three = await api('/api/login', { method: 'POST', body: { memberId: 'member-3' } });
  assert.equal(three.response.status, 200); assert.equal(three.data.memberId, 'member-3');
  const previousCookie = three.response.headers.get('set-cookie').split(';')[0];
  assert.deepEqual((await api('/api/session', { cookie: previousCookie })).data, { authenticated: true, memberId: 'member-3' });
  assert.equal((await api('/api/workspace', { cookie: previousCookie })).data.memberId, 'member-3');
  const switched = await api('/api/login', { method: 'POST', cookie: previousCookie, body: { memberId: 'member-1' } });
  assert.equal(switched.response.status, 200);
  assert.equal((await api('/api/workspace', { cookie: previousCookie })).response.status, 401);
  const nextCookie = switched.response.headers.get('set-cookie').split(';')[0];
  assert.deepEqual((await api('/api/session', { cookie: nextCookie })).data, { authenticated: true, memberId: 'member-1' });
});
test('server commands persist project/task CRUD and calculate progress with session-derived authors', async () => {
  let r = await command('project.save', { values: { title: 'Proyek online', description: 'Tim', deadline: '' } }); assert.equal(r.response.status, 200);
  const p = r.data.state.projects[0].id;
  r = await command('task.save', { values: { title: 'Tugas bersama', description: 'Isi', projectId: p, assignee: 'member-2', status: 'To Do', priority: 'High', deadline: '2026-11-30', submission: 'https://example.com', checklist: 'Review' } });
  assert.equal(r.response.status, 200); const t = r.data.state.tasks[0];
  r = await command('task.check', { id: t.id, item: t.checklist[0].id, done: true }); assert.equal(r.data.state.tasks[0].checklist[0].done, true);
  r = await command('task.status', { id: t.id, status: 'Done' }); assert.equal(r.data.state.tasks[0].status, 'Done');
  r = await command('task.comment', { id: t.id, text: 'Komentar anggota kedua', author: 'member-1' }, cookie2);
  assert.equal(r.data.state.tasks[0].comments[0].author, 'member-2');
  const other = await api('/api/workspace', { cookie: cookie2 }); assert.equal(other.data.state.tasks[0].title, 'Tugas bersama');
  r = await command('project.remove', { id: p }); assert.equal(r.data.state.tasks[0].projectId, '');
  r = await command('task.remove', { id: t.id }); assert.equal(r.data.state.tasks.length, 0);
});
test('notes, quick links and member updates persist through the authenticated API', async () => {
  let r = await command('note.save', { values: { title: 'Catatan', description: 'Isi', url: '', pinned: false, author: 'member-1' } }, cookie2);
  assert.equal(r.response.status, 200); const n = r.data.state.notes[0].id; assert.equal(r.data.state.notes[0].author, 'member-2');
  r = await command('note.pin', { id: n }); assert.equal(r.data.state.notes[0].pinned, true);
  r = await command('note.save', { id: n, values: { title: 'Diubah', description: 'Edit', url: '', pinned: true } }); assert.equal(r.data.state.notes[0].title, 'Diubah');
  await command('note.remove', { id: n });
  r = await command('link.save', { values: { title: 'Link', description: '', url: 'https://example.com', category: 'Lainnya' } });
  const l = r.data.state.links[0].id;
  r = await command('link.save', { id: l, values: { title: 'Link edit', description: 'Edit', url: 'https://example.com/edit', category: 'Lainnya' } }); assert.equal(r.data.state.links[0].title, 'Link edit');
  await command('link.remove', { id: l });
  r = await command('member.save', { id: 'member-2', values: { name: 'Teman Kedua', role: 'Desainer', avatar: 'emerald', jobdesk: 'UI' } }); assert.equal(r.data.state.members[1].name, 'Teman Kedua');
});
test('concurrent writers with the same revision allow exactly one atomic commit', async () => {
  const snapshot = (await api('/api/workspace', { cookie: cookie1 })).data;
  const results = await Promise.all([
    command('project.save', { values: { title: 'Writer A', description: '', deadline: '' } }, cookie1, snapshot.revision),
    command('project.save', { values: { title: 'Writer B', description: '', deadline: '' } }, cookie2, snapshot.revision)
  ]);
  assert.deepEqual(results.map(r => r.response.status).sort(), [200, 409]);
  const after = (await api('/api/workspace', { cookie: cookie1 })).data;
  assert.equal(after.revision, snapshot.revision + 1); assert.equal(after.state.projects.length, snapshot.state.projects.length + 1);
});
test('CSRF, unsafe URLs, forged snapshots and invalid commands never write data', async () => {
  const before = await repo.read();
  const crossOrigin = await api('/api/command', { method: 'POST', cookie: cookie1, origin: 'https://evil.example', body: {} }); assert.equal(crossOrigin.response.status, 403);
  const noHeader = await api('/api/command', { method: 'POST', cookie: cookie1, client: '', body: {} }); assert.equal(noHeader.response.status, 403);
  for (const headers of [{ origin: 'https://evil.example' }, { client: '' }]) {
    const result = await api('/api/login', { method: 'POST', body: { memberId: 'member-1' }, ...headers });
    assert.equal(result.response.status, 403); assert.equal(result.response.headers.get('set-cookie'), null);
  }
  assert.equal((await command('link.save', { values: { title: 'X', description: '', url: 'javascript:alert(1)', category: 'X' } })).response.status, 400);
  assert.equal((await command('workspace.replace', { state: {} })).response.status, 400);
  assert.equal((await command('member.save', { id: 'member-4', values: { name: 'X', role: 'X', avatar: 'indigo' } })).response.status, 400);
  const changedAccount = await api('/api/command', { method: 'POST', cookie: cookie2, body: { revision: before.revision, memberId: 'member-1', command: 'project.remove', payload: { id: 'anything' } } }); assert.equal(changedAccount.response.status, 409);
  assert.equal((await repo.read()).revision, before.revision);
});
test('database initialization is idempotent and persistence survives a new repository instance', async () => {
  const before = await repo.read();
  const fresh = createRepository(createClient({ url: 'file:' + path.join(directory, 'test.db') }));
  try { const next = await fresh.read(); assert.equal(next.revision, before.revision); assert.equal(next.state.projects.length, before.state.projects.length); } finally { fresh.close(); }
});
test('rate limiter is persisted in SQL and malformed request bodies are rejected', async () => {
  for (let i = 0; i < 8; i++) await repo.attemptLogin('test-rate-bucket');
  await assert.rejects(repo.attemptLogin('test-rate-bucket'), e => e.status === 429);
  const invalid = await fetch(base + '/api/command', { method: 'POST', headers: { origin: base, 'x-taskhub-client': '1', cookie: cookie1, 'content-type': 'application/json' }, body: '{invalid' }); assert.equal(invalid.status, 400);
  const huge = await api('/api/command', { method: 'POST', cookie: cookie1, body: { text: 'x'.repeat(70000) } }); assert.equal(huge.response.status, 413);
  assert.equal((await api('/api/workspace', { method: 'POST', cookie: cookie1, body: {} })).response.status, 405);
});
test('server only exposes public assets and never returns environment, SQL or server source', async () => {
  for (const name of ['/.env', '/.env.example', '/server/auth.cjs', '/database/schema.sql', '/package.json', '/references/login.original.html']) assert.equal((await fetch(base + name)).status, 404, name);
  for (const name of ['/', '/js/api.js', '/taskhub_login_screen/code.html']) assert.equal((await fetch(base + name)).status, 200, name);
  for (const filename of ['Joshua Timothy.jpg', 'Kaesie Silvila Fitri.jpg', 'Naura afifah.jpg']) {
    const response = await fetch(base + '/foto%20profil/' + encodeURIComponent(filename));
    assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/jpeg');
    assert.ok(Buffer.from(await response.arrayBuffer()).length > 0);
  }
  assert.equal((await fetch(base + '/foto%20profil/unknown.jpg')).status, 404);
});
test('expired and tampered sessions do not grant workspace access, and SQL rejects unknown members', async () => {
  await assert.rejects(repo.createSession('b'.repeat(64), 'member-4', 'invalid-session-version', Date.now() + 60000));
  for (const [token, memberId, expiry] of [['a'.repeat(64), 'member-1', Date.now() - 1000], ['c'.repeat(64), 'member-1', Date.now() + 60000]]) {
    await repo.createSession(token, memberId, 'invalid-session-version', expiry);
    assert.equal((await api('/api/workspace', { cookie: `taskhub_session=${token}` })).response.status, 401);
  }
  assert.equal((await api('/api/workspace', { cookie: 'taskhub_session=invalid' })).response.status, 401);
});

test('logout revokes server-side sessions and secret rotation invalidates existing sessions', async () => {
  const out = await api('/api/logout', { method: 'POST', cookie: cookie1, body: {} }); assert.equal(out.response.status, 200);
  assert.equal((await api('/api/workspace', { cookie: cookie1 })).response.status, 401);
  assert.deepEqual((await api('/api/session', { cookie: cookie1 })).data, { authenticated: false });
  config.secret = 'a-new-session-secret-at-least-32-characters';
  assert.equal((await api('/api/workspace', { cookie: cookie2 })).response.status, 401);
});
test('SQL profile migration uses a revision check, preserves workspace records, and applies only once', async () => {
  const before = await repo.read(); const legacy = JSON.parse(JSON.stringify(before.state)); delete legacy.memberPhotosVersion;
  legacy.members[1].name = 'Member 2'; legacy.members[1].avatar = 'indigo'; legacy.members[1].role = 'Peran tetap';
  legacy.members[2].name = 'Member 3'; legacy.members[2].avatar = 'amber';
  await repo.commit(before.revision, legacy);
  const fresh = createRepository(createClient({ url: 'file:' + path.join(directory, 'test.db') }));
  try {
    const migrated = await fresh.read(); assert.equal(migrated.revision, before.revision + 2);
    assert.equal(migrated.state.members[1].name, 'Kaesie Silvila Fitri'); assert.equal(migrated.state.members[2].name, 'Naura afifah');
    assert.equal(migrated.state.members[1].role, 'Peran tetap'); assert.equal(migrated.state.memberPhotosVersion, 1);
    assert.equal(JSON.stringify(migrated.state.projects), JSON.stringify(legacy.projects)); assert.equal(JSON.stringify(migrated.state.tasks), JSON.stringify(legacy.tasks));
    assert.equal((await fresh.read()).revision, migrated.revision);
  } finally { fresh.close(); }
});
