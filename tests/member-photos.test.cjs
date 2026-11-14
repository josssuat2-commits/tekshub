const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ URL });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8'), context);
const H = context.TaskHub;
test('three profiles use the exact photo filenames and locally served image URLs', () => {
  const state = H.initialState(); assert.equal(state.members.length, 3);
  for (const m of state.members) {
    const file = H.memberPhotoFiles[m.id]; assert.equal(m.name, path.basename(file, '.jpg')); assert.equal(m.avatar, 'photo');
    assert.equal(decodeURIComponent(H.memberPhoto(m.id)), '/foto profil/' + file);
    const bytes = fs.readFileSync(path.join(__dirname, '../foto profil', file)); assert.equal(bytes.readUInt16BE(0), 0xffd8);
  }
  assert.equal(H.memberPhoto('member-4'), ''); assert.equal(H.memberPhoto('__proto__'), '');
});
test('legacy profile migration changes names and photos once while preserving tasks, IDs, roles and notes', () => {
  const old = H.initialState(); delete old.memberPhotosVersion;
  const now = new Date().toISOString();
  old.tasks.push({ id: 'existing-task', title: 'Pekerjaan tersimpan', description: '', projectId: '', assignee: 'member-1', status: 'To Do', priority: 'Medium', deadline: '', submission: '', checklist: [], comments: [], createdAt: now, updatedAt: now });
  old.notes.push({ id: 'existing-note', title: 'Catatan tersimpan', description: 'Isi', url: '', author: 'member-2', pinned: false, createdAt: now, updatedAt: now });
  old.members[1].name = 'Member 2'; old.members[1].avatar = 'indigo'; old.members[1].role = 'Peran khusus';
  old.members[2].name = 'Member 3'; old.members[2].avatar = 'amber';
  const tasks = JSON.stringify(old.tasks); const notes = JSON.stringify(old.notes);
  let raw = JSON.stringify(old); const store = H.createStore({ getItem: () => raw, setItem: (_, next) => { raw = next; } });
  const migrated = store.load(); assert.equal(migrated.memberPhotosVersion, 1);
  assert.equal(migrated.members[1].name, 'Kaesie Silvila Fitri'); assert.equal(migrated.members[2].name, 'Naura afifah');
  assert.equal(migrated.members[1].role, 'Peran khusus'); assert.equal(JSON.stringify(migrated.tasks), tasks); assert.equal(JSON.stringify(migrated.notes), notes);
  assert.equal(JSON.parse(raw).memberPhotosVersion, 1);
});
test('a later profile edit and empty task list are not overwritten when the photo migration is already applied', () => {
  const state = H.initialState(); state.members[1].name = 'Nama pilihan anggota'; state.members[1].avatar = 'emerald'; state.tasks = [];
  const before = JSON.stringify(state); assert.equal(H.applyMemberPhotos(state), false); assert.equal(JSON.stringify(state), before);
  const raw = JSON.stringify(state); const store = H.createStore({ getItem: () => raw, setItem: () => { throw new Error('Unexpected reseed'); } });
  assert.equal(store.load().members[1].name, 'Nama pilihan anggota'); assert.equal(store.get().tasks.length, 0);
});
