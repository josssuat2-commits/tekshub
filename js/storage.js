(function (global) {
  'use strict';
  const KEY = 'taskhub.workspace.v1';
  const statuses = ['To Do', 'In Progress', 'Review', 'Done'];
  const priorities = ['Low', 'Medium', 'High'];
  const memberPhotoFiles = Object.freeze({
    'member-1': 'Joshua Timothy.jpg',
    'member-2': 'Kaesie Silvila Fitri.jpg',
    'member-3': 'Naura afifah.jpg'
  });
  function memberPhoto(id) { return Object.hasOwn(memberPhotoFiles, id) ? `/foto%20profil/${encodeURIComponent(memberPhotoFiles[id])}` : ''; }
  function applyMemberPhotos(state) {
    if (state.memberPhotosVersion === 1) return false;
    for (const m of state.members) {
      if (!Object.hasOwn(memberPhotoFiles, m.id)) continue;
      m.name = memberPhotoFiles[m.id].replace(/\.jpg$/i, ''); m.avatar = 'photo';
    }
    state.memberPhotosVersion = 1;
    return true;
  }
  const uid = () => global.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const clone = value => JSON.parse(JSON.stringify(value));
  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T12:00:00`);
    return !Number.isNaN(d.getTime()) && localDate(d) === value;
  }
  function url(value, optional = true) {
    const text = String(value || '').trim();
    if (!text && optional) return '';
    try {
      const parsed = new URL(text);
      if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw new Error();
      return parsed.href;
    } catch { throw new Error('Gunakan URL lengkap dengan https:// atau http://, tanpa kredensial.'); }
  }
  function text(value, label, maximum = 200, required = true) {
    const result = String(value ?? '').trim();
    if (required && !result) throw new Error(`${label} wajib diisi.`);
    if (result.length > maximum) throw new Error(`${label} maksimal ${maximum} karakter.`);
    return result;
  }
  function initialState() {
    return {
      version: 1,
      memberPhotosVersion: 1,
      previewResetVersion: 1,
      members: [
        { id: 'member-1', name: 'Joshua Timothy', role: 'Project Manager', avatar: 'photo', jobdesk: 'Mengatur backlog dan timeline proyek.' },
        { id: 'member-2', name: 'Kaesie Silvila Fitri', role: 'UI/UX Designer', avatar: 'photo', jobdesk: 'Menyusun desain dan prototype.' },
        { id: 'member-3', name: 'Naura afifah', role: 'Developer', avatar: 'photo', jobdesk: 'Mengimplementasikan aplikasi.' }
      ],
      settings: { theme: 'light', currentMember: 'member-1' },
      projects: [],
      tasks: [],
      notes: [],
      links: [],
      activity: []
    };
  }
  function validate(state) {
    const fail = () => { throw new Error('Format data tersimpan tidak valid. Data asli tetap dipertahankan.'); };
    if (!state || state.version !== 1 || !state.settings || !['light', 'dark'].includes(state.settings.theme)) fail();
    for (const key of ['members', 'projects', 'tasks', 'notes', 'links', 'activity']) {
      if (!Array.isArray(state[key]) || new Set(state[key].map(x => x?.id)).size !== state[key].length || state[key].some(x => !x || typeof x.id !== 'string')) fail();
    }
    if (state.members.length !== 3 || !state.members.some(m => m.id === state.settings.currentMember)) fail();
    const memberExists = id => state.members.some(m => m.id === id);
    const isString = v => typeof v === 'string';
    const timestamps = item => isString(item.createdAt) && !Number.isNaN(Date.parse(item.createdAt)) && isString(item.updatedAt) && !Number.isNaN(Date.parse(item.updatedAt));
    if (state.members.some(m => !isString(m.name) || !m.name.trim() || !isString(m.role) || !m.role.trim() || !['photo', 'indigo', 'emerald', 'amber'].includes(m.avatar) || !isString(m.jobdesk))) fail();
    if (state.projects.some(p => !isString(p.title) || !p.title.trim() || !isString(p.description) || (p.deadline !== '' && !validDate(p.deadline)) || !timestamps(p))) fail();
    if (state.tasks.some(t => !isString(t.title) || !t.title.trim() || !isString(t.description) || !statuses.includes(t.status) || !priorities.includes(t.priority) || !memberExists(t.assignee) || (t.projectId !== '' && !state.projects.some(p => p.id === t.projectId)) || (t.deadline !== '' && !validDate(t.deadline)) || !isString(t.submission) || !Array.isArray(t.checklist) || t.checklist.some(c => !isString(c.id) || !isString(c.text) || typeof c.done !== 'boolean') || new Set(t.checklist.map(c => c.id)).size !== t.checklist.length || !Array.isArray(t.comments) || t.comments.some(c => !isString(c.id) || !isString(c.text) || !memberExists(c.author) || Number.isNaN(Date.parse(c.createdAt))) || !timestamps(t))) fail();
    if (state.notes.some(n => !isString(n.title) || !n.title.trim() || !isString(n.description) || !isString(n.url) || !memberExists(n.author) || typeof n.pinned !== 'boolean' || !timestamps(n))) fail();
    if (state.links.some(l => !isString(l.title) || !l.title.trim() || !isString(l.description) || !isString(l.category) || !isString(l.url) || !l.url || !timestamps(l))) fail();
    if (state.activity.some(a => !memberExists(a.member) || !isString(a.text) || Number.isNaN(Date.parse(a.createdAt)))) fail();
    for (const value of [...state.tasks.map(t => t.submission), ...state.notes.map(n => n.url), ...state.links.map(l => l.url)]) url(value);
    return state;
  }
  function createStore(adapter) {
    let state;
    let loaded = false;
    const subscribers = new Set();
    return {
      load() {
        if (!loaded) {
          const raw = adapter.getItem(KEY);
          state = raw === null ? initialState() : validate(JSON.parse(raw));
          const migrated = applyMemberPhotos(state);
          if (raw === null || migrated) adapter.setItem(KEY, JSON.stringify(state));
          loaded = true;
        }
        return clone(state);
      },
      get() { if (!loaded) this.load(); return clone(state); },
      transact(mutator, message) {
        const next = this.get();
        mutator(next);
        if (message) next.activity.unshift({ id: uid(), member: next.settings.currentMember, text: message, createdAt: new Date().toISOString() });
        next.activity = next.activity.slice(0, 100);
        validate(next);
        // Commit only after persistence succeeds, so storage failures never show a false success.
        adapter.setItem(KEY, JSON.stringify(next));
        state = next;
        subscribers.forEach(fn => fn(this.get()));
        return this.get();
      },
      refresh() { const raw = adapter.getItem(KEY); if (raw === null) throw new Error('Data workspace dihapus dari tab lain. Muat ulang halaman.'); state = validate(JSON.parse(raw)); loaded = true; subscribers.forEach(fn => fn(this.get())); },
      subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }
    };
  }
  function preparePreview(store) {
    const state = store.get();
    if (state.previewResetVersion === 1) return state;
    // One-time cleanup requested for existing test previews. Never run for the remote store.
    if (store.remote) throw new Error('Pembersihan preview hanya untuk penyimpanan lokal.');
    return store.transact(next => {
      for (const key of ['projects', 'tasks', 'notes', 'links', 'activity']) next[key] = [];
      next.previewResetVersion = 1;
    });
  }
  global.TaskHub = { KEY, statuses, priorities, memberPhotoFiles, memberPhoto, applyMemberPhotos, uid, clone, localDate, validDate, url, text, initialState, validate, createStore, preparePreview };
})(globalThis);
