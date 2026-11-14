(function (H) {
  'use strict';
  H.projects = {
    progress(state, id) {
      const tasks = state.tasks.filter(t => t.projectId === id);
      return { total: tasks.length, done: tasks.filter(t => t.status === 'Done').length, percent: tasks.length ? Math.round(tasks.filter(t => t.status === 'Done').length / tasks.length * 100) : 0 };
    },
    save(store, values, id) {
      if (store.remote) return store.execute('project.save', { values, id });
      const record = { title: H.text(values.title, 'Nama proyek'), description: H.text(values.description, 'Deskripsi', 5000, false), deadline: values.deadline || '' };
      if (record.deadline && !H.validDate(record.deadline)) throw new Error('Tanggal proyek tidak valid.');
      return store.transact(s => {
        const now = new Date().toISOString();
        if (id) { const p = s.projects.find(x => x.id === id); if (!p) throw new Error('Proyek tidak ditemukan.'); Object.assign(p, record, { updatedAt: now }); }
        else s.projects.push({ id: H.uid(), ...record, createdAt: now, updatedAt: now });
      }, `${id ? 'Mengedit' : 'Membuat'} proyek “${record.title}”.`);
    },
    remove(store, id) {
      if (store.remote) return store.execute('project.remove', { id });
      return store.transact(s => { if (!s.projects.some(p => p.id === id)) throw new Error('Proyek tidak ditemukan.'); s.projects = s.projects.filter(p => p.id !== id); s.tasks.forEach(t => { if (t.projectId === id) { t.projectId = ''; t.updatedAt = new Date().toISOString(); } }); }, 'Menghapus proyek; tugas tetap tersimpan tanpa proyek.');
    }
  };
})(TaskHub);
