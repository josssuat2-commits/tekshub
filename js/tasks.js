(function (H) {
  'use strict';
  function find(s, id) { const t = s.tasks.find(x => x.id === id); if (!t) throw new Error('Tugas tidak ditemukan.'); return t; }
  H.tasks = {
    save(store, values, id) {
      if (store.remote) return store.execute('task.save', { values, id });
      const record = { title: H.text(values.title, 'Judul tugas'), description: H.text(values.description, 'Deskripsi', 5000, false), assignee: values.assignee, projectId: values.projectId || '', priority: values.priority, status: values.status, deadline: values.deadline || '', submission: H.url(values.submission) };
      if (!H.statuses.includes(record.status) || !H.priorities.includes(record.priority)) throw new Error('Status atau prioritas tidak valid.');
      if (record.deadline && !H.validDate(record.deadline)) throw new Error('Deadline tidak valid.');
      const lines = String(values.checklist || '').split('\n').map(x => x.trim()).filter(Boolean);
      if (lines.length > 50 || lines.some(x => x.length > 300)) throw new Error('Checklist maksimal 50 item, masing-masing 300 karakter.');
      return store.transact(s => {
        const old = id ? find(s, id) : null;
        const used = new Set();
        const checklist = lines.map(line => {
          const previous = old?.checklist.find(c => c.text === line && !used.has(c.id));
          if (previous) { used.add(previous.id); return previous; }
          return { id: H.uid(), text: line, done: false };
        });
        const now = new Date().toISOString();
        if (old) Object.assign(old, record, { checklist, updatedAt: now });
        else s.tasks.push({ id: H.uid(), ...record, checklist, comments: [], createdAt: now, updatedAt: now });
      }, `${id ? 'Mengedit' : 'Membuat'} tugas “${record.title}”.`);
    },
    status(store, id, status) {
      if (store.remote) return store.execute('task.status', { id, status });
      if (!H.statuses.includes(status)) throw new Error('Status tidak valid.');
      return store.transact(s => { const t = find(s, id); t.status = status; t.updatedAt = new Date().toISOString(); }, `Mengubah status tugas menjadi ${status}.`);
    },
    check(store, id, item, done) { if (store.remote) return store.execute('task.check', { id, item, done }); return store.transact(s => { const t = find(s, id); const c = t.checklist.find(x => x.id === item); if (!c) throw new Error('Item checklist tidak ditemukan.'); c.done = !!done; t.updatedAt = new Date().toISOString(); }, 'Memperbarui checklist tugas.'); },
    comment(store, id, value) { if (store.remote) return store.execute('task.comment', { id, text: value }); const content = H.text(value, 'Komentar', 2000); return store.transact(s => { const t = find(s, id); t.comments.push({ id: H.uid(), author: s.settings.currentMember, text: content, createdAt: new Date().toISOString() }); t.updatedAt = new Date().toISOString(); }, 'Menambahkan komentar pada tugas.'); },
    remove(store, id) { if (store.remote) return store.execute('task.remove', { id }); return store.transact(s => { find(s, id); s.tasks = s.tasks.filter(t => t.id !== id); }, 'Menghapus tugas.'); },
    filter(state, filters = {}) {
      const query = (filters.query || '').toLocaleLowerCase();
      return state.tasks.filter(t => (!filters.member || t.assignee === filters.member) && (!filters.priority || t.priority === filters.priority) && (!filters.project || t.projectId === filters.project) && (!filters.status || t.status === filters.status) && `${t.title} ${t.description}`.toLocaleLowerCase().includes(query));
    },
    stats(state) { return { total: state.tasks.length, done: state.tasks.filter(t => t.status === 'Done').length, active: state.tasks.filter(t => t.status === 'In Progress').length, todo: state.tasks.filter(t => t.status === 'To Do').length, review: state.tasks.filter(t => t.status === 'Review').length }; }
  };
})(TaskHub);
