const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { HttpError } = require('./errors.cjs');
const context = vm.createContext({ URL, crypto: webcrypto });
for (const name of ['storage', 'projects', 'tasks', 'notes', 'links', 'members']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', `${name}.js`), 'utf8'), context);
}
const H = context.TaskHub;
const MEMBER_IDS = ['member-1', 'member-2', 'member-3'];
function emptyWorkspace() {
  const state = H.initialState();
  for (const key of ['projects', 'tasks', 'notes', 'links', 'activity']) state[key] = [];
  return state;
}
function executeCommand(state, actor, command, payload = {}) {
  if (!MEMBER_IDS.includes(actor)) throw new HttpError(401, 'Silakan masuk kembali.', 'UNAUTHORIZED');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new HttpError(400, 'Payload tidak valid.');
  let raw = JSON.stringify(state);
  const store = H.createStore({ getItem: () => raw, setItem: (_, value) => { raw = value; } });
  store.load();
  store.transact(s => { s.settings.currentMember = actor; s.settings.theme = 'light'; });
  const commands = {
    'task.save': () => H.tasks.save(store, payload.values || {}, payload.id),
    'task.status': () => H.tasks.status(store, payload.id, payload.status),
    'task.check': () => { if (typeof payload.done !== 'boolean') throw new Error('Nilai checklist tidak valid.'); return H.tasks.check(store, payload.id, payload.item, payload.done); },
    'task.comment': () => H.tasks.comment(store, payload.id, payload.text),
    'task.remove': () => H.tasks.remove(store, payload.id),
    'project.save': () => H.projects.save(store, payload.values || {}, payload.id),
    'project.remove': () => H.projects.remove(store, payload.id),
    'note.save': () => H.notes.save(store, payload.values || {}, payload.id),
    'note.pin': () => H.notes.pin(store, payload.id),
    'note.remove': () => H.notes.remove(store, payload.id),
    'link.save': () => H.links.save(store, payload.values || {}, payload.id),
    'link.remove': () => H.links.remove(store, payload.id),
    'member.save': () => H.members.save(store, payload.values || {}, payload.id)
  };
  if (!Object.hasOwn(commands, command)) throw new HttpError(400, 'Perintah tidak dikenal.', 'INVALID_COMMAND');
  try {
    commands[command]();
    const next = store.get();
    if (next.members.some((m, i) => m.id !== MEMBER_IDS[i])) throw new Error('Identitas tiga anggota tidak boleh diubah.');
    // Identity and appearance are session/device concerns, never shared preferences.
    next.settings = { theme: 'light', currentMember: 'member-1' };
    if (Buffer.byteLength(JSON.stringify(next)) > 512 * 1024) throw new Error('Workspace melebihi batas 512 KB. Ringkas catatan atau tugas lama.');
    return next;
  } catch (error) { throw new HttpError(400, error.message, 'VALIDATION_FAILED'); }
}
module.exports = { H, MEMBER_IDS, emptyWorkspace, executeCommand };

