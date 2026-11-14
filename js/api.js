(function (H) {
  'use strict';
  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(path, { ...options, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json', 'X-TaskHub-Client': '1', ...(options.headers || {}) } });
    } catch {
      const error = new Error(options.method === 'POST' ? 'Koneksi terputus. Status penyimpanan belum dapat dipastikan. Muat data terbaru sebelum mencoba lagi.' : 'Server tidak dapat dihubungi. Periksa koneksi lalu coba lagi.');
      error.code = 'NETWORK_ERROR'; throw error;
    }
    let data;
    try { data = await response.json(); } catch { throw new Error('Respons server bukan JSON. Pastikan API Vercel sudah terpasang.'); }
    if (!response.ok) { const error = new Error(data.error || 'Permintaan gagal.'); error.status = response.status; error.code = data.code; throw error; }
    return data;
  }
  function createRemoteStore(preferenceAdapter) {
    let state, revision = -1, pending = false, refreshing;
    const listeners = new Set();
    let theme = 'light';
    try { if (preferenceAdapter?.getItem('taskhub.theme') === 'dark') theme = 'dark'; } catch {}
    const emit = () => listeners.forEach(fn => fn(H.clone(state)));
    function accept(envelope) {
      if (!Number.isSafeInteger(envelope.revision) || envelope.revision < 0 || !['member-1', 'member-2', 'member-3'].includes(envelope.memberId)) throw new Error('Respons workspace tidak valid.');
      const next = H.validate(envelope.state);
      if (envelope.revision < revision) return;
      state = H.clone(next); state.settings = { currentMember: envelope.memberId, theme }; revision = envelope.revision;
    }
    const store = {
      remote: true,
      get busy() { return pending; },
      get revision() { return revision; },
      get() { if (!state) throw new Error('Workspace belum dimuat.'); return H.clone(state); },
      async load() { accept(await request('/api/workspace')); return store.get(); },
      accept(envelope) { accept(envelope); return store.get(); },
      async refresh() {
        if (pending) return false;
        if (!refreshing) refreshing = (async () => { const data = await request('/api/workspace'); if (!pending && (data.revision > revision || data.memberId !== state?.settings.currentMember)) { accept(data); emit(); return true; } return false; })().finally(() => { refreshing = undefined; });
        return refreshing;
      },
      async execute(command, payload) {
        if (pending) throw new Error('Tunggu perubahan sebelumnya selesai disimpan.');
        pending = true;
        try {
          const response = await request('/api/command', { method: 'POST', body: JSON.stringify({ revision, memberId: state.settings.currentMember, command, payload }) });
          accept(response); emit(); return store.get();
        } catch (error) {
          if (error.status === 409) {
            // Refresh shared data while leaving the user's open form intact.
            try { accept(await request('/api/workspace')); emit(); } catch {}
          }
          throw error;
        } finally { pending = false; }
      },
      transact(mutator) {
        const next = store.get(); mutator(next);
        if (next.settings.currentMember !== state.settings.currentMember || JSON.stringify({ ...next, settings: null }) !== JSON.stringify({ ...state, settings: null })) throw new Error('Perubahan data bersama harus melalui API.');
        if (!['light', 'dark'].includes(next.settings.theme)) throw new Error('Tema tidak valid.');
        try { preferenceAdapter?.setItem('taskhub.theme', next.settings.theme); } catch { throw new Error('Preferensi tema tidak dapat disimpan pada perangkat ini.'); }
        theme = next.settings.theme;
        state.settings.theme = theme; emit(); return store.get();
      },
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
    };
    return store;
  }
  H.request = request;
  H.createRemoteStore = createRemoteStore;
})(TaskHub);
