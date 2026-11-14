(function (H) {
  'use strict';
  H.links = {
    save(store, values, id) {
      if (store.remote) return store.execute('link.save', { values, id });
      const record = { title: H.text(values.title, 'Judul link'), description: H.text(values.description, 'Deskripsi', 2000, false), url: H.url(values.url, false), category: H.text(values.category, 'Kategori', 100) };
      return store.transact(s => { const now = new Date().toISOString(); if (id) { const l = s.links.find(x => x.id === id); if (!l) throw new Error('Link tidak ditemukan.'); Object.assign(l, record, { updatedAt: now }); } else s.links.push({ id: H.uid(), ...record, createdAt: now, updatedAt: now }); }, `${id ? 'Mengedit' : 'Menambahkan'} quick link “${record.title}”.`);
    },
    remove(store, id) { if (store.remote) return store.execute('link.remove', { id }); return store.transact(s => { if (!s.links.some(l => l.id === id)) throw new Error('Link tidak ditemukan.'); s.links = s.links.filter(l => l.id !== id); }, 'Menghapus quick link.'); }
  };
})(TaskHub);
