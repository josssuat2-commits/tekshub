const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = vm.createContext({ URL, console });
for (const name of ['storage', 'projects', 'tasks', 'notes', 'links']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', name + '.js'), 'utf8'), context);
const H = context.TaskHub;
function storage() { const map = new Map(); return { map, fail: false, getItem(key) { return map.has(key) ? map.get(key) : null; }, setItem(key, value) { if (this.fail) throw new Error('quota exceeded'); map.set(key, value); } }; }
function setup() { const adapter = storage(); const store = H.createStore(adapter); store.load(); return { adapter, store }; }
const values = (store, extra = {}) => ({ title: 'Tugas uji', description: 'Deskripsi uji', assignee: store.get().members[0].id, projectId: '', status: 'To Do', priority: 'Medium', deadline: '2026-11-20', submission: 'https://example.com/result', checklist: 'Langkah 1\nLangkah 2', ...extra });
test('new workspaces start empty with three profiles, and empty collections persist after reload', () => {
  const { adapter, store } = setup(); assert.equal(store.get().members.length, 3);
  for (const key of ['tasks', 'projects', 'notes', 'links', 'activity']) assert.equal(store.get()[key].length, 0);
  store.transact(s => { s.tasks = []; s.projects = []; s.notes = []; s.links = []; });
  const fresh = H.createStore(adapter).load();
  for (const key of ['tasks', 'projects', 'notes', 'links']) assert.equal(fresh[key].length, 0);
});
test('task CRUD, checklist, comments and statistics stay consistent', () => {
  const { store } = setup(); const before = H.tasks.stats(store.get());
  H.tasks.save(store, values(store)); const t = store.get().tasks.at(-1);
  assert.equal(H.tasks.stats(store.get()).todo, before.todo + 1);
  H.tasks.status(store, t.id, 'Review'); assert.equal(H.tasks.stats(store.get()).review, before.review + 1);
  H.tasks.check(store, t.id, t.checklist[0].id, true);
  H.tasks.save(store, values(store, { title: 'Diubah', status: 'Review' }), t.id);
  assert.equal(store.get().tasks.at(-1).checklist[0].done, true);
  H.tasks.comment(store, t.id, 'Review selesai'); assert.equal(store.get().tasks.at(-1).comments.length, 1);
  H.tasks.status(store, t.id, 'Done'); assert.equal(H.tasks.stats(store.get()).done, before.done + 1);
  H.tasks.remove(store, t.id); assert.equal(store.get().tasks.length, before.total);
});

test('one-time preview cleanup removes old work records, preserves profiles and retains new entries after reload', () => {
  const { adapter, store } = setup();
  H.projects.save(store, { title: 'Proyek lama', description: '', deadline: '' });
  H.tasks.save(store, values(store, { projectId: store.get().projects[0].id }));
  H.notes.save(store, { title: 'Catatan lama', description: 'Isi', url: '', pinned: false });
  H.links.save(store, { title: 'Link lama', description: '', url: 'https://example.com', category: 'Lainnya' });
  store.transact(s => { delete s.previewResetVersion; s.members[1].jobdesk = 'Jobdesk pilihan'; s.settings.theme = 'dark'; s.settings.currentMember = 'member-2'; });
  const before = store.get();
  for (const key of ['tasks', 'projects', 'notes', 'links', 'activity']) assert.ok(before[key].length > 0);
  const cleared = H.preparePreview(store);
  for (const key of ['tasks', 'projects', 'notes', 'links', 'activity']) assert.equal(cleared[key].length, 0);
  assert.equal(JSON.stringify(cleared.members), JSON.stringify(before.members));
  assert.equal(JSON.stringify(cleared.settings), JSON.stringify(before.settings));
  H.tasks.save(store, values(store, { title: 'Tugas baru sesudah pembersihan' }));
  const saved = adapter.getItem(H.KEY);
  const fresh = H.createStore(adapter);
  assert.equal(H.preparePreview(fresh).tasks[0].title, 'Tugas baru sesudah pembersihan');
  assert.equal(adapter.getItem(H.KEY), saved);
  assert.throws(() => H.preparePreview({ remote: true, get: () => ({}) }), /hanya untuk penyimpanan lokal/);
});
test('project progress handles zero tasks, status transitions and orphan preservation', () => {
  const { store } = setup(); H.projects.save(store, { title: 'Proyek uji', description: '', deadline: '' });
  const p = store.get().projects.at(-1); assert.equal(H.projects.progress(store.get(), p.id).percent, 0);
  H.tasks.save(store, values(store, { projectId: p.id })); const id1 = store.get().tasks.at(-1).id;
  H.tasks.save(store, values(store, { projectId: p.id, title: 'Tugas kedua' }));
  H.tasks.status(store, id1, 'Done'); assert.equal(H.projects.progress(store.get(), p.id).percent, 50);
  H.projects.save(store, { title: 'Proyek diubah', description: 'Edit', deadline: '2026-11-30' }, p.id);
  assert.equal(store.get().projects.at(-1).title, 'Proyek diubah');
  H.projects.remove(store, p.id); assert.equal(store.get().tasks.find(t => t.id === id1).projectId, '');
});
test('notes CRUD, author, pinned sorting and links CRUD', () => {
  const { store } = setup(); H.notes.save(store, { title: 'Catatan uji', description: 'Isi', url: '', pinned: false });
  const note = store.get().notes.at(-1); assert.equal(note.author, store.get().settings.currentMember);
  H.notes.save(store, { title: 'Edit catatan', description: 'Isi diubah', url: 'https://example.com', pinned: false }, note.id);
  H.notes.pin(store, note.id); assert.ok(H.notes.sorted(store.get()).some(n => n.id === note.id && n.pinned));
  H.notes.remove(store, note.id); assert.ok(!store.get().notes.some(n => n.id === note.id));
  H.links.save(store, { title: 'Link uji', description: 'Isi', url: 'https://example.com', category: 'Lainnya' });
  const link = store.get().links.at(-1);
  H.links.save(store, { title: 'Edit link', description: 'Edit', url: 'https://example.com/updated', category: 'GitHub Repository' }, link.id);
  assert.equal(store.get().links.at(-1).url, 'https://example.com/updated');
  H.links.remove(store, link.id); assert.ok(!store.get().links.some(l => l.id === link.id));
});
test('unsafe URLs, invalid dates and invalid task references are rejected without mutations', () => {
  const { adapter, store } = setup(); const raw = adapter.getItem(H.KEY);
  for (const url of ['javascript:alert(1)', 'data:text/html,abc', 'ftp://example.com', '//example.com', 'https://user:password@example.com', 'not-a-url']) assert.throws(() => H.url(url, false));
  assert.equal(H.validDate('2026-02-30'), false); assert.equal(H.validDate('2028-02-29'), true);
  assert.throws(() => H.tasks.save(store, values(store, { deadline: '2026-02-30' })));
  assert.throws(() => H.tasks.save(store, values(store, { assignee: 'member-4' })));
  assert.throws(() => H.tasks.save(store, values(store, { title: '  ' })));
  assert.throws(() => H.tasks.save(store, values(store, { submission: 'javascript:alert(1)' })));
  assert.equal(adapter.getItem(H.KEY), raw);
});
test('storage failures roll back in-memory state and do not notify subscribers', () => {
  const { adapter, store } = setup(); const before = JSON.stringify(store.get()); let calls = 0;
  store.subscribe(() => calls++); adapter.fail = true;
  assert.throws(() => H.tasks.save(store, values(store)), /quota/);
  assert.equal(JSON.stringify(store.get()), before); assert.equal(calls, 0);
});
test('corrupt or unsupported data is preserved and never seeded over', () => {
  for (const raw of ['{invalid', '{}', JSON.stringify({ version: 2 }), 'null']) {
    const adapter = storage(); adapter.setItem(H.KEY, raw);
    assert.throws(() => H.createStore(adapter).load()); assert.equal(adapter.getItem(H.KEY), raw);
  }
});
test('filters combine title search, member, priority and project', () => {
  const { store } = setup();
  H.projects.save(store, { title: 'Proyek filter', description: '', deadline: '' });
  H.tasks.save(store, values(store, { title: 'Desain untuk filter', priority: 'High', projectId: store.get().projects[0].id }));
  H.tasks.save(store, values(store, { title: 'Tugas lain' }));
  const task = store.get().tasks[0];
  const found = H.tasks.filter(store.get(), { query: 'DESAIN', member: task.assignee, priority: 'High', project: task.projectId });
  assert.equal(found.length, 1); assert.equal(found[0].id, task.id);
  assert.equal(H.tasks.filter(store.get(), { member: 'member-4' }).length, 0);
});
test('theme and three editable member profiles survive a fresh store', () => {
  const { adapter, store } = setup(); store.transact(s => { s.settings.theme = 'dark'; s.settings.currentMember = s.members[1].id; s.members[1].name = 'Nama Baru'; s.members[1].role = 'Desainer'; });
  const fresh = H.createStore(adapter).load(); assert.equal(fresh.settings.theme, 'dark'); assert.equal(fresh.members[1].name, 'Nama Baru'); assert.equal(fresh.members.length, 3);
  assert.throws(() => store.transact(s => s.members.push({ ...s.members[0], id: 'member-4' })));
});
test('refresh sees same-origin changes without seeding over deleted data', () => {
  const { adapter, store } = setup(); const other = H.createStore(adapter); other.load();
  H.tasks.save(other, values(other)); store.refresh(); assert.equal(store.get().tasks.length, 1);
  adapter.map.delete(H.KEY); assert.throws(() => store.refresh());
});
test('HTML-like user content is retained as plain text for the DOM renderer', () => {
  const { store } = setup(); const title = '<img src=x onerror=alert(1)>';
  H.tasks.save(store, values(store, { title })); assert.equal(store.get().tasks.at(-1).title, title);
  const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8'); assert.ok(!app.includes('innerHTML')); assert.ok(!app.includes('eval('));
});
test('date-only deadlines preserve local date across time zones', () => {
  assert.equal(H.localDate(new Date(2026, 10, 14, 12)), '2026-11-14');
  const { store } = setup(); H.tasks.save(store, values(store, { deadline: '2026-11-14' })); assert.equal(store.get().tasks.at(-1).deadline, '2026-11-14');
});
