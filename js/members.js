(function (H) {
  'use strict';
  H.members = {
    save(store, values, id) {
      if (store.remote) return store.execute('member.save', { values, id });
      return store.transact(s => {
        const target = s.members.find(m => m.id === id);
        if (!target) throw new Error('Anggota tidak ditemukan.');
        if (!['photo', 'indigo', 'emerald', 'amber'].includes(values.avatar)) throw new Error('Avatar tidak valid.');
        Object.assign(target, { name: H.text(values.name, 'Nama', 100), role: H.text(values.role, 'Peran', 100), jobdesk: H.text(values.jobdesk, 'Jobdesk', 2000, false), avatar: values.avatar });
      }, 'Memperbarui profil anggota.');
    }
  };
})(TaskHub);
