(function (H) {
  'use strict';
  H.notes = {
    save(store, values, id) {
      if (store.remote) return store.execute('note.save', { values, id });
      const record = { title: H.text(values.title, 'Judul catatan'), description: H.text(values.description, 'Deskripsi', 10000), url: H.url(values.url), pinned: !!values.pinned };
      return store.transact(s => { const now = new Date().toISOString(); if (id) { const n = s.notes.find(x => x.id === id); if (!n) throw new Error('Catatan tidak ditemukan.'); Object.assign(n, record, { updatedAt: now }); } else s.notes.push({ id: H.uid(), ...record, author: s.settings.currentMember, createdAt: now, updatedAt: now }); }, `${id ? 'Mengedit' : 'Menambahkan'} catatan “${record.title}”.`);
    },
    pin(store, id) { if (store.remote) return store.execute('note.pin', { id }); return store.transact(s => { const n = s.notes.find(x => x.id === id); if (!n) throw new Error('Catatan tidak ditemukan.'); n.pinned = !n.pinned; n.updatedAt = new Date().toISOString(); }, 'Mengubah sematan catatan.'); },
    remove(store, id) { if (store.remote) return store.execute('note.remove', { id }); return store.transact(s => { if (!s.notes.some(n => n.id === id)) throw new Error('Catatan tidak ditemukan.'); s.notes = s.notes.filter(n => n.id !== id); }, 'Menghapus catatan.'); },
    sorted(state, query = '') { return state.notes.filter(n => `${n.title} ${n.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)); }
  };
})(TaskHub);
