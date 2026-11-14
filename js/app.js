(function (H) {
  'use strict';
  const root = document.getElementById('app');
  let store, previewSession, state = H.initialState();
  let mode = 'loading', signedIn = false;
  let filters = { query: '', member: '', priority: '', project: '', status: '' };
  let notesQuery = '', linksQuery = '', globalQuery = '', dashboardTab = 'all';
  let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
  let selectedProfile;
  let toastTimer, searchTimer;
  const defaultRoute = document.body.dataset.page || 'dashboard';
  const route = () => { try { return decodeURIComponent(location.hash.slice(1) || defaultRoute); } catch { return 'not-found'; } };
  const member = id => state.members.find(m => m.id === id) || state.members[0];
  const current = () => member(state.settings.currentMember);
  const project = id => state.projects.find(p => p.id === id);
  const fmt = (date, options = { day: 'numeric', month: 'short', year: 'numeric' }) => date ? new Intl.DateTimeFormat('id-ID', options).format(new Date(date.length === 10 ? `${date}T12:00:00` : date)) : 'Tanpa deadline';
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key === 'checked') node.checked = !!value;
      else if (key === 'value') node.value = value;
      else node.setAttribute(key, value === true ? '' : String(value));
    });
    children.flat(Infinity).forEach(child => { if (child !== null && child !== undefined && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child))); });
    return node;
  }
  const iconPaths = {
    check: 'M5 12l4 4L19 6', logo: 'M8 12l3 3 5-6 M4 3h16v18H4z', dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', board: 'M3 4h18v16H3z M8 8v6 M12 8v9 M16 8v4', tasks: 'M9 6h12 M9 12h12 M9 18h12 M3 5l1 1 2-2 M3 11l1 1 2-2 M3 17l1 1 2-2', notes: 'M4 5h16 M4 10h16 M4 15h10 M4 20h7', link: 'M10 8H7a4 4 0 000 8h3 M14 8h3a4 4 0 010 8h-3 M8 12h8', settings: 'M12 8a4 4 0 100 8 4 4 0 000-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z', calendar: 'M3 5h18v16H3z M7 3v4 M17 3v4 M3 10h18 M7 14h2 M13 14h2', team: 'M8 12a4 4 0 100-8 4 4 0 000 8 M2 21v-2a6 6 0 0112 0v2 M17 4a4 4 0 010 8 M18 15a5 5 0 014 6', plus: 'M12 5v14 M5 12h14', search: 'M10.5 3a7.5 7.5 0 100 15 7.5 7.5 0 000-15 M16 16l5 5', close: 'M5 5l14 14 M5 19L19 5', edit: 'M4 16l12-12 4 4L8 20H4z M14 6l4 4', trash: 'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7', copy: 'M8 8h13v13H8z M4 16H2V2h14v2', external: 'M14 3h7v7 M21 3L10 14 M10 3H3v18h18v-7', pin: 'M8 3h8l-1 6 4 4v2H5v-2l4-4z M12 15v6', clock: 'M12 2a10 10 0 100 20 10 10 0 000-20 M12 6v6l4 3', folder: 'M3 5h7l2 3h9v12H3z', sun: 'M12 8a4 4 0 100 8 4 4 0 000-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1', moon: 'M20 14a9 9 0 01-10-11 9 9 0 1010 11', arrow: 'M5 12h14 M13 6l6 6-6 6', left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', menu: 'M3 6h18 M3 12h18 M3 18h18', activity: 'M2 12h4l3-8 6 16 3-8h4', code: 'M8 6l-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18', document: 'M5 2h10l4 4v16H5z M14 2v5h5 M8 11h8 M8 15h8 M8 19h5', info: 'M12 2a10 10 0 100 20 10 10 0 000-20 M12 11v6 M12 7h.01', comment: 'M3 3h18v14H8l-5 4z M7 8h10 M7 12h7', palette: 'M12 3a9 9 0 100 18h1a2 2 0 001-4 1 1 0 011-2h2a4 4 0 004-4c0-5-4-8-9-8 M7 8h.01 M12 6h.01 M17 9h.01 M7 14h.01', cloud: 'M6 18a5 5 0 010-10 6 6 0 0111-2 6 6 0 012 12z', logout: 'M9 3H3v18h6 M12 12h10 M17 7l5 5-5 5'
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', iconPaths[name] || iconPaths.document); svg.append(path); return svg;
  }
  function button(label, action, name, className = '', data = {}) {
    return el('button', { type: 'button', class: `btn ${className}`, dataset: { action, ...data }, ...(label ? {} : { 'aria-label': data.label || action, title: data.label || action }) }, name && icon(name), label);
  }
  const iconButton = (label, action, name, data = {}) => button('', action, name, 'ghost icon-btn', { ...data, label });
  function avatar(id, large = false, override) {
    const m = member(id); const choice = override || m.avatar;
    const initials = m.name.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
    const node = el('span', { class: `avatar ${choice} ${large ? 'large' : ''}`, role: 'img', 'aria-label': m.name, title: m.name }, initials);
    if (choice === 'photo' && H.memberPhoto(id)) {
      const img = el('img', { src: H.memberPhoto(id), alt: '', decoding: 'async' });
      img.addEventListener('error', () => img.remove()); node.append(img);
    }
    return node;
  }
  const avatars = () => el('div', { class: 'avatar-group' }, state.members.map(m => avatar(m.id)));
  const badge = (text, cls = '') => el('span', { class: `badge ${cls}` }, text);
  const statusBadge = value => badge(value, { 'Done': 'done', 'In Progress': 'progress', 'Review': 'review' }[value] || '');
  const priorityBadge = value => badge(value, value.toLowerCase());
  function external(url, text, cls = '') { return el('a', { href: H.url(url, false), target: '_blank', rel: 'noopener noreferrer', class: cls }, text, icon('external')); }
  function progress(percent) { return el('div', { class: 'progress-track', role: 'progressbar', 'aria-valuenow': percent, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': 'Progres selesai' }, el('div', { class: 'progress-fill', style: `width:${Math.max(0, Math.min(100, percent))}%` })); }
  function empty(text, action, label) { return el('div', { class: 'empty' }, icon('folder'), el('p', {}, text), action && button(label, action, 'plus', 'soft sm')); }
  const brand = () => el('div', { class: 'row brand' }, el('span', { class: 'logo-mark' }, icon('logo')), el('span', { class: 'logo' }, 'TaskHub'));
  const panel = (title, name, content, action, id) => el('section', { class: 'panel', id }, el('div', { class: 'panel-heading' }, el('h2', {}, icon(name), title), action), content);
  const heading = (title, description, actions) => el('div', { class: 'page-intro' }, el('div', { class: 'intro-text' }, el('h1', {}, title), description && el('p', { class: 'muted' }, description)), actions && el('div', { class: 'button-row' }, actions));
  function toast(message, error = false) {
    document.getElementById('toast')?.remove(); clearTimeout(toastTimer);
    const node = el('div', { id: 'toast', class: `toast ${error ? 'error' : ''}`, role: error ? 'alert' : 'status' }, message);
    document.body.append(node); toastTimer = setTimeout(() => node.remove(), 5500);
  }
  function handleSessionError(error) { if (mode === 'turso' && error.status === 401) { signedIn = false; state = H.initialState(); if (dialog.open) closeDialog(); render(); } }
  async function attempt(fn, message) { try { await fn(); if (message) toast(message); return true; } catch (error) { handleSessionError(error); toast(error.message, true); return false; } }
  function field(label, name, value = '', type = 'text', options = {}) {
    const id = `field-${name}`;
    let input;
    if (type === 'textarea') input = el('textarea', { id, name, rows: options.rows || 3, maxlength: options.maxlength || 5000, ...options }, value);
    else if (type === 'select') {
      input = el('select', { id, name, ...options }, options.choices.map(choice => { const [v, text] = Array.isArray(choice) ? choice : [choice, choice]; return el('option', { value: v }, text); }));
      input.value = value;
    } else input = el('input', { id, name, type, value, maxlength: type === 'date' ? undefined : (options.maxlength || 200), ...options });
    input.removeAttribute('choices'); input.removeAttribute('help'); input.removeAttribute('full');
    const helpId = `${id}-help`;
    if (options.help) input.setAttribute('aria-describedby', helpId);
    return el('div', { class: `field ${options.full ? 'full' : ''}` }, el('label', { for: id }, label), input, options.help && el('small', { class: 'field-help', id: helpId }, options.help));
  }
  function checkField(label, name, checked) { return el('label', { class: 'checkbox-row' }, el('input', { type: 'checkbox', name, checked }), el('span', {}, label)); }
  const dialog = el('dialog', { 'aria-labelledby': 'dialog-title' });
  document.body.append(dialog);
  function closeDialog() { dialog.close(); if (!document.activeElement || document.activeElement === document.body) document.querySelector('main')?.focus({ preventScroll: true }); }
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(); });
  function showDialog(title, body) {
    dialog.replaceChildren(el('div', { class: 'dialog-header' }, el('h2', { id: 'dialog-title' }, title), iconButton('Tutup dialog', 'close-dialog', 'close')), el('div', { class: 'dialog-body' }, body));
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => { (dialog.querySelector('input:not([type=checkbox]),textarea,select') || dialog.querySelector('button'))?.focus(); });
  }
  function formDialog(title, fields, submit, label = 'Simpan') {
    const errorNode = el('p', { class: 'form-error', role: 'alert' });
    const form = el('form', {}, errorNode, fields, el('div', { class: 'dialog-footer' }, button('Batal', 'close-dialog', null), el('button', { class: 'btn primary', type: 'submit' }, icon('check'), label)));
    form.addEventListener('submit', async event => {
      event.preventDefault(); errorNode.textContent = '';
      const values = Object.fromEntries(new FormData(form).entries());
      for (const input of form.querySelectorAll('input[type=checkbox]')) values[input.name] = input.checked;
      const saveButton = form.querySelector('button[type=submit]'); saveButton.disabled = true;
      try { await submit(values); closeDialog(); toast(mode === 'turso' ? 'Perubahan tersimpan di database tim.' : 'Perubahan tersimpan di browser ini.'); }
      catch (error) { handleSessionError(error); errorNode.textContent = error.message; errorNode.setAttribute('tabindex', '-1'); errorNode.focus(); }
      finally { saveButton.disabled = false; }
    });
    showDialog(title, form);
  }
  function confirmDelete(kind, id) {
    const records = { task: state.tasks, project: state.projects, note: state.notes, link: state.links };
    const labels = { task: 'tugas', project: 'proyek', note: 'catatan', link: 'link' };
    const item = records[kind]?.find(x => x.id === id); if (!item) return;
    showDialog(`Hapus ${labels[kind]}?`, el('div', { class: 'stack' }, el('p', { class: 'preline' }, `“${item.title}” akan dihapus ${mode === 'turso' ? 'dari database untuk seluruh tim' : 'dari browser ini'}.`), el('p', { class: 'muted small' }, kind === 'project' ? 'Tugas di dalam proyek tetap tersimpan dan dipindahkan ke Tanpa proyek. Tindakan ini tidak dapat dibatalkan.' : 'Tindakan ini tidak dapat dibatalkan.'), el('div', { class: 'dialog-footer' }, button('Batal', 'close-dialog'), button('Hapus', 'confirm-delete', 'trash', 'danger', { kind, id }))));
  }
  function taskForm(id, preset = {}) {
    const t = state.tasks.find(x => x.id === id) || { title: '', description: '', assignee: current().id, projectId: '', status: 'To Do', priority: 'Medium', deadline: '', submission: '', checklist: [], ...preset };
    formDialog(id ? 'Edit Task' : 'Create New Task', el('div', { class: 'form-grid' },
      field('Task Title', 'title', t.title, 'text', { required: true, full: true }),
      field('Deskripsi', 'description', t.description, 'textarea', { full: true }),
      field('Penanggung jawab', 'assignee', t.assignee, 'select', { choices: state.members.map(m => [m.id, m.name]) }),
      field('Proyek', 'projectId', t.projectId, 'select', { choices: [['', 'Tanpa proyek'], ...state.projects.map(p => [p.id, p.title])] }),
      field('Status', 'status', t.status, 'select', { choices: H.statuses }),
      field('Priority', 'priority', t.priority, 'select', { choices: H.priorities }),
      field('Deadline', 'deadline', t.deadline, 'date'),
      field('Submission Link (opsional)', 'submission', t.submission, 'url', { maxlength: 2000, placeholder: 'https://…', help: 'URL hasil pekerjaan, tanpa upload file.' }),
      field('Checklist', 'checklist', t.checklist.map(c => c.text).join('\n'), 'textarea', { full: true, maxlength: 16000, help: 'Satu item per baris. Centang item melalui detail tugas.' })
    ), values => H.tasks.save(store, values, id));
  }
  function projectForm(id) {
    const p = project(id) || { title: '', description: '', deadline: '' };
    formDialog(id ? 'Edit Project' : 'Create Project', [field('Nama proyek', 'title', p.title, 'text', { required: true }), field('Deskripsi', 'description', p.description, 'textarea'), field('Deadline proyek (opsional)', 'deadline', p.deadline, 'date')], values => H.projects.save(store, values, id));
  }
  function noteForm(id) {
    const n = state.notes.find(x => x.id === id) || { title: '', description: '', url: '', pinned: false };
    formDialog(id ? 'Edit Team Note' : 'Create Team Note', [field('Note Title', 'title', n.title, 'text', { required: true }), field('Deskripsi & instruksi', 'description', n.description, 'textarea', { rows: 5, required: true, maxlength: 10000 }), field('Reference URL (opsional)', 'url', n.url, 'url', { maxlength: 2000, placeholder: 'https://…' }), checkField('Sematkan catatan di atas dashboard', 'pinned', n.pinned)], values => H.notes.save(store, values, id));
  }
  function linkForm(id) {
    const l = state.links.find(x => x.id === id) || { title: '', description: '', url: '', category: 'Link Pengumpulan Tugas' };
    formDialog(id ? 'Edit Quick Link' : 'Add Quick Link', [field('Link Title', 'title', l.title, 'text', { required: true }), field('Deskripsi singkat', 'description', l.description, 'textarea', { maxlength: 2000 }), field('External URL', 'url', l.url, 'url', { required: true, maxlength: 2000, placeholder: 'https://…', help: 'Hanya alamat http:// atau https:// yang valid.' }), field('Kategori', 'category', l.category, 'select', { choices: ['Link Pengumpulan Tugas', 'Google Drive', 'GitHub Repository', 'Figma Design', 'Google Docs', 'Lainnya'] })], values => H.links.save(store, values, id));
  }
  function memberForm(id) {
    const m = member(id);
    formDialog('Edit profil anggota', [field('Nama anggota', 'name', m.name, 'text', { required: true, maxlength: 100 }), field('Peran', 'role', m.role, 'text', { required: true, maxlength: 100 }), field('Jobdesk', 'jobdesk', m.jobdesk, 'textarea', { maxlength: 2000 }), field('Avatar bawaan', 'avatar', m.avatar, 'select', { choices: [['photo', 'Foto profil anggota'], ['indigo', 'Inisial · Indigo'], ['emerald', 'Inisial · Emerald'], ['amber', 'Inisial · Amber']] })], values => H.members.save(store, values, id));
  }
  function deadlineLabel(t) {
    const today = H.localDate(); const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const cls = t.deadline && t.status !== 'Done' ? t.deadline < today ? 'overdue' : t.deadline <= H.localDate(tomorrow) ? 'soon' : '' : '';
    const label = t.deadline ? `${t.deadline < today && t.status !== 'Done' ? 'Terlambat · ' : ''}${fmt(t.deadline, { day: 'numeric', month: 'short' })}` : 'Tanpa deadline';
    return el('span', { class: `row gap-sm deadline ${cls}` }, icon('calendar'), label);
  }
  function statusSelect(t) {
    const select = el('select', { class: 'inline-status', 'aria-label': `Status ${t.title}`, dataset: { change: 'task-status', id: t.id } }, H.statuses.map(s => el('option', { value: s }, s)));
    select.value = t.status; return select;
  }
  function taskCard(t, board = false) {
    const m = member(t.assignee);
    return el('article', { class: 'task-card', ...(board ? { draggable: 'true', dataset: { taskId: t.id }, 'aria-label': `${t.title}, ${t.status}. Gunakan dropdown untuk mengubah status.` } : {}) },
      el('div', { class: 'task-top' }, avatar(m.id), el('div', { class: 'grow' }, el('h3', {}, el('button', { type: 'button', dataset: { action: 'task-detail', id: t.id } }, t.title)), el('p', { class: 'muted small' }, m.name)), el('div', { class: 'task-tags' }, statusBadge(t.status), priorityBadge(t.priority))),
      el('p', { class: 'task-description clamp' }, t.description || 'Belum ada deskripsi.'),
      el('div', { class: 'task-meta' }, deadlineLabel(t), el('span', { class: 'row gap-sm' }, icon('tasks'), `${t.checklist.filter(c => c.done).length}/${t.checklist.length}`), statusSelect(t)),
      t.submission && el('div', { class: 'task-meta' }, external(t.submission, el('span', { class: 'truncate' }, new URL(t.submission).hostname), 'submission-chip'))
    );
  }
  function showTask(id) {
    const t = state.tasks.find(x => x.id === id); if (!t) { toast('Tugas tidak ditemukan.', true); return; }
    const commentForm = el('form', {}, field('Tulis komentar', 'comment', '', 'textarea', { required: true, maxlength: 2000, rows: 2 }), el('button', { type: 'submit', class: 'btn soft sm' }, icon('comment'), 'Kirim komentar'));
    const commentError = el('p', { class: 'form-error', role: 'alert' }); commentForm.prepend(commentError);
    commentForm.addEventListener('submit', async event => { event.preventDefault(); const submit = commentForm.querySelector('button[type=submit]'); submit.disabled = true; try { await H.tasks.comment(store, id, new FormData(commentForm).get('comment')); showTask(id); toast('Komentar tersimpan.'); } catch (error) { handleSessionError(error); commentError.textContent = error.message; } finally { submit.disabled = false; } });
    const checklist = el('div', { class: 'checklist' }, t.checklist.length ? t.checklist.map(c => el('label', { class: 'checkbox-row' }, el('input', { type: 'checkbox', checked: c.done, dataset: { change: 'checklist', id, item: c.id } }), el('span', { class: 'preline' }, c.text))) : el('p', { class: 'muted small' }, 'Tambahkan checklist melalui Edit Task.'));
    showDialog(t.title, el('div', {},
      el('div', { class: 'row wrap' }, statusBadge(t.status), priorityBadge(t.priority), button('Edit Task', 'edit-task', 'edit', 'soft sm', { id })),
      el('div', { class: 'detail-meta' }, el('div', {}, el('span', { class: 'eyebrow' }, 'Penanggung jawab'), el('div', { class: 'row' }, avatar(t.assignee), el('div', {}, el('strong', {}, member(t.assignee).name), el('p', { class: 'muted small' }, member(t.assignee).role)))), el('div', {}, el('span', { class: 'eyebrow' }, 'Deadline'), deadlineLabel(t)), el('div', {}, el('span', { class: 'eyebrow' }, 'Proyek'), project(t.projectId)?.title || 'Tanpa proyek'), el('div', {}, el('span', { class: 'eyebrow' }, 'Status'), statusSelect(t))),
      el('p', { class: 'detail-description' }, t.description || 'Belum ada deskripsi.'),
      el('section', { class: 'detail-section' }, el('h3', {}, `Deliverable Checklist (${t.checklist.filter(c => c.done).length}/${t.checklist.length})`), checklist),
      el('section', { class: 'detail-section' }, el('h3', {}, 'Submission Link'), t.submission ? el('div', { class: 'detail-link stack' }, external(t.submission, el('span', { class: 'preline grow' }, t.submission), 'row'), button('Salin link', 'copy', 'copy', 'soft sm', { url: t.submission })) : el('p', { class: 'muted small' }, 'Belum ada link hasil pekerjaan. Tambahkan melalui Edit Task.')),
      el('section', { class: 'detail-section' }, el('h3', {}, 'Team Discussion'), el('p', { class: 'muted small' }, mode === 'turso' ? 'Komentar tersimpan bersama untuk tim.' : 'Komentar tersimpan di browser ini.'), t.comments.map(c => el('article', { class: 'comment' }, avatar(c.author), el('div', { class: 'grow' }, el('strong', {}, member(c.author).name), el('time', { datetime: c.createdAt }, ` · ${fmt(c.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}`), el('p', {}, c.text)))), commentForm),
      el('div', { class: 'detail-section dialog-footer' }, button('Hapus tugas', 'delete', 'trash', 'danger', { kind: 'task', id }), button('Tutup', 'close-dialog'))
    ));
    dialog.dataset.taskId = id;
  }
  function noteCard(n) {
    return el('article', { class: `note-card ${n.pinned ? 'pinned' : ''}` },
      el('div', { class: 'row between' }, n.pinned ? badge('Pinned', 'medium') : badge('Team Note'), el('div', { class: 'row gap-sm' }, iconButton(n.pinned ? 'Lepas sematan' : 'Sematkan catatan', 'pin-note', 'pin', { id: n.id }), iconButton('Edit catatan', 'edit-note', 'edit', { id: n.id }), iconButton('Hapus catatan', 'delete', 'trash', { kind: 'note', id: n.id }))),
      el('h3', { class: 'preline' }, n.title), el('p', { class: 'note-body' }, n.description), n.url && el('div', { class: 'note-url row' }, external(n.url, el('span', { class: 'truncate' }, n.url), 'submission-chip grow'), iconButton('Salin URL catatan', 'copy', 'copy', { url: n.url })),
      el('footer', { class: 'note-footer' }, el('span', { class: 'row gap-sm' }, avatar(n.author), member(n.author).name), el('div', {}, el('p', {}, `Dibuat ${fmt(n.createdAt)}`), el('p', {}, `Diperbarui ${fmt(n.updatedAt, { dateStyle: 'medium', timeStyle: 'short' })}`)))
    );
  }
  function linkCard(l, full = false) {
    const symbol = l.category.includes('Drive') ? 'cloud' : l.category.includes('GitHub') ? 'code' : l.category.includes('Figma') ? 'palette' : 'document';
    return el('article', { class: 'link-card' }, el('span', { class: 'link-icon' }, icon(symbol)), el('div', { class: 'grow' }, el('h3', { class: full ? 'preline' : 'truncate', title: l.title }, l.title), el('p', { class: full ? 'preline' : 'truncate', title: l.description }, l.description || l.category), full && el('p', { class: 'url-line mono' }, l.url)), el('div', { class: 'link-actions' }, iconButton(`Salin ${l.title}`, 'copy', 'copy', { url: l.url }), external(l.url, el('span', { class: 'sr-only' }, `Buka ${l.title}`), 'btn ghost icon-btn'), full && iconButton('Edit link', 'edit-link', 'edit', { id: l.id }), full && iconButton('Hapus link', 'delete', 'trash', { kind: 'link', id: l.id })));
  }
  function upcoming() {
    return state.tasks.filter(t => t.deadline && t.status !== 'Done').sort((a, b) => a.deadline.localeCompare(b.deadline));
  }
  function deadlineList() {
    return upcoming().length ? el('div', {}, upcoming().slice(0, 5).map(t => el('div', { class: 'deadline-item' }, el('div', { class: 'date-tile' }, fmt(t.deadline, { month: 'short' }).toUpperCase(), el('strong', {}, new Date(`${t.deadline}T12:00:00`).getDate())), el('div', { class: 'grow' }, el('button', { class: 'plain-title', type: 'button', dataset: { action: 'task-detail', id: t.id } }, t.title), el('p', { class: 'muted small' }, `${member(t.assignee).name} · ${t.status}`), t.deadline < H.localDate() && el('span', { class: 'badge high' }, 'Terlambat'))))) : empty('Belum ada deadline tugas aktif.');
  }
  function projectPreview(p) {
    const stats = H.projects.progress(state, p.id);
    return el('div', { class: 'project-preview' }, el('div', { class: 'row between' }, el('a', { href: `#project/${encodeURIComponent(p.id)}` }, p.title), el('strong', { class: 'small' }, `${stats.percent}%`)), progress(stats.percent), el('div', { class: 'row between small muted', style: 'margin-top:9px' }, `${stats.done}/${stats.total} tugas selesai`, avatars()));
  }
  function dashboard() {
    const s = H.tasks.stats(state); const percent = s.total ? Math.round(s.done / s.total * 100) : 0;
    const hour = new Date().getHours(); const greeting = hour < 11 ? 'Good morning' : hour < 15 ? 'Good afternoon' : 'Good evening';
    const tasks = state.tasks.filter(t => dashboardTab !== 'mine' || t.assignee === current().id).filter(t => dashboardTab !== 'high' || t.priority === 'High');
    const pinned = H.notes.sorted(state).filter(n => n.pinned);
    const tabs = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Filter tugas dashboard' }, [['all', 'All Tasks'], ['mine', 'Assigned to Me'], ['high', 'High Priority']].map(([id, label]) => button(label, 'dashboard-tab', null, dashboardTab === id ? 'selected' : '', { tab: id })));
    const metrics = [['TOTAL TASKS', s.total, 'tasks', `${state.projects.length} proyek · ${state.members.length} anggota`], ['IN PROGRESS', s.active, 'activity', `${s.review} tugas dalam Review`], ['TO DO', s.todo, 'clock', 'Tugas yang belum dimulai'], ['COMPLETED', s.done, 'check', `${percent}% tugas selesai`]];
    return el('div', {},
      el('div', { class: 'page-intro' }, el('div', { class: 'intro-text' }, el('h1', {}, `${greeting},`, el('br'), `${current().name.split(' ')[0]} 👋`), el('p', { class: 'muted' }, fmt(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), el('span', {}, ' · '), el('a', { href: '#projects' }, `${state.projects.length} proyek kelompok`))), el('div', { class: 'intro-actions' }, el('div', { class: 'team-summary' }, avatars(), el('div', {}, el('strong', {}, '3 anggota tim'), el('p', { class: 'muted' }, mode === 'turso' ? 'Workspace tim · Turso' : 'Workspace lokal · PBL Project'))), el('div', { class: 'button-row' }, button('Add Quick Link', 'new-link', 'link'), button('Add Note', 'new-note', 'notes'), button('New Task', 'new-task', 'plus', 'primary')))),
      el('div', { class: 'stats' }, metrics.map(([label, value, name, detail], index) => el('section', { class: 'stat', 'aria-label': `${label}: ${value}` }, el('div', { class: 'row between' }, el('h2', { class: 'eyebrow' }, label), el('span', { class: 'stat-icon' }, icon(name))), el('div', { class: 'number' }, value), el('p', {}, detail), index === 3 && progress(percent)))),
      el('div', { class: 'dashboard-grid' }, el('div', { class: 'stack' },
        panel('Tasks & Deliverables', 'board', [tabs, el('div', { class: 'filtered-count', style: 'margin-top:10px' }, `${tasks.length} tugas`), tasks.length ? el('div', { class: 'task-list' }, tasks.slice(0, 4).map(t => taskCard(t))) : empty('Belum ada tugas yang sesuai.', 'new-task', 'New Task'), el('a', { href: '#tasks', class: 'btn ghost sm', style: 'margin-top:12px' }, 'Lihat semua tugas', icon('arrow'))], null, 'dashboard-tasks'),
        panel('Team Notes & Instructions', 'notes', [el('p', { class: 'panel-description' }, `${pinned.length} pinned · Catatan penting kelompok`), el('div', { class: 'stack' }, pinned.length ? pinned.map(noteCard) : empty('Belum ada catatan yang disematkan.', 'new-note', 'Create Note')), el('a', { href: '#notes', class: 'btn ghost sm', style: 'margin-top:12px' }, 'Semua catatan', icon('arrow'))], button('Create Note', 'new-note', 'plus', 'soft sm'), 'dashboard-notes'),
        panel('Project Progress', 'folder', state.projects.length ? state.projects.map(projectPreview) : empty('Belum ada proyek.', 'new-project', 'Create Project'), el('a', { href: '#projects', class: 'btn soft sm' }, 'Projects'), 'dashboard-projects')
      ), el('div', { class: 'stack' },
        panel('Quick Links', 'link', [el('p', { class: 'panel-description' }, 'Tautan referensi dan hasil pekerjaan kelompok.'), el('div', { class: 'stack gap-sm' }, state.links.length ? state.links.slice(0, 5).map(l => linkCard(l)) : empty('Belum ada quick link.', 'new-link', 'Add Link')), el('a', { href: '#links', class: 'btn ghost sm', style: 'margin-top:10px' }, 'Kelola semua link', icon('arrow'))], button('Add Link', 'new-link', 'plus', 'soft sm'), 'dashboard-links'),
        panel('Upcoming Deadlines', 'clock', deadlineList(), el('a', { href: '#calendar', class: 'btn ghost sm' }, 'Calendar'), 'dashboard-deadlines'),
        panel('Recent Activity', 'activity', state.activity.length ? state.activity.slice(0, 7).map(a => el('div', { class: 'activity-item' }, avatar(a.member), el('div', { class: 'grow' }, el('strong', {}, member(a.member).name), el('p', { class: 'preline' }, a.text), el('time', { datetime: a.createdAt }, fmt(a.createdAt, { dateStyle: 'medium', timeStyle: 'short' }))))) : empty('Belum ada aktivitas.'), badge(mode === 'turso' ? 'Tim' : 'Lokal'), 'dashboard-activity')
      ))
    );
  }
  function filterBar(my = false, projectId = '') {
    const search = el('input', { type: 'search', id: 'task-search', value: filters.query, placeholder: 'Cari judul atau deskripsi tugas…', 'aria-label': 'Cari tugas', dataset: { search: 'tasks' } });
    function choice(label, name, choices, value) {
      const select = el('select', { dataset: { filter: name }, 'aria-label': label }, choices.map(([v, text]) => el('option', { value: v }, text))); select.value = value;
      return el('label', {}, label, select);
    }
    return el('div', { class: 'filters' }, el('div', { class: 'search-box' }, icon('search'), search),
      !my && choice('Anggota', 'member', [['', 'Semua anggota'], ...state.members.map(m => [m.id, m.name])], filters.member),
      choice('Prioritas', 'priority', [['', 'Semua prioritas'], ...H.priorities.map(x => [x, x])], filters.priority),
      !projectId && choice('Proyek', 'project', [['', 'Semua proyek'], ...state.projects.map(p => [p.id, p.title])], filters.project),
      button('Reset', 'reset-filters', null, 'ghost sm'));
  }
  function tasksPage(board = false, my = false, projectId = '') {
    const selected = { ...filters, ...(my ? { member: current().id } : {}), ...(projectId ? { project: projectId } : {}) };
    const tasks = H.tasks.filter(state, selected);
    const title = projectId ? project(projectId)?.title || 'Proyek tidak ditemukan' : my ? 'My Tasks' : 'Tasks & Board';
    const display = board ? el('div', { class: 'board' }, H.statuses.map(status => el('section', { class: 'board-column', dataset: { dropStatus: status }, 'aria-label': `Kolom ${status}` }, el('div', { class: 'board-heading' }, el('h2', {}, statusBadge(status)), badge(String(tasks.filter(t => t.status === status).length)), iconButton(`Tambah tugas ${status}`, 'new-task', 'plus', { status, project: projectId })), tasks.filter(t => t.status === status).length ? tasks.filter(t => t.status === status).map(t => taskCard(t, true)) : el('p', { class: 'board-empty' }, 'Belum ada tugas. Drop kartu di sini.')))) : tasks.length ? el('div', { class: 'task-grid' }, tasks.map(t => taskCard(t))) : empty('Belum ada tugas yang sesuai filter.', 'new-task', 'New Task');
    return el('div', {}, heading(title, my ? `Tugas untuk ${current().name}.` : 'Kelola tugas, penanggung jawab, dan hasil pekerjaan tim.', [button('New Task', 'new-task', 'plus', 'primary', { project: projectId })]),
      projectId && project(projectId) && el('section', { class: 'panel', style: 'margin-bottom:22px' }, el('p', { class: 'preline muted' }, project(projectId).description || 'Belum ada deskripsi proyek.'), el('div', { class: 'row between wrap', style: 'margin-top:15px' }, el('span', { class: 'small muted' }, `Deadline proyek: ${fmt(project(projectId).deadline)}`), avatars(), button('Edit Project', 'edit-project', 'edit', 'soft sm', { id: projectId }), button('Hapus', 'delete', 'trash', 'danger sm', { kind: 'project', id: projectId })), projectPreview(project(projectId))),
      !projectId && el('div', { class: 'row between wrap', style: 'margin-bottom:20px' }, el('div', { class: 'segmented' }, el('a', { href: '#tasks', class: `btn ${!board && !my ? 'selected' : ''}` }, 'All Tasks'), el('a', { href: '#my-tasks', class: `btn ${my ? 'selected' : ''}` }, 'My Tasks'), el('a', { href: '#board', class: `btn ${board ? 'selected' : ''}` }, 'Kanban Board')), board && el('span', { class: 'muted small' }, 'Drag kartu atau gunakan dropdown status.')),
      filterBar(my, projectId), el('p', { class: 'filtered-count' }, `${tasks.length} tugas ditampilkan`), display
    );
  }
  function projectsPage() {
    return el('div', {}, heading('Projects', 'Progres dihitung dari tugas berstatus Done.', button('Create Project', 'new-project', 'plus', 'primary')), state.projects.length ? el('div', { class: 'project-grid' }, state.projects.map(p => {
      const stats = H.projects.progress(state, p.id);
      return el('article', { class: 'panel project-card' }, el('div', { class: 'row between' }, el('span', { class: 'link-icon' }, icon('folder')), badge(`${stats.percent}%`, stats.percent === 100 ? 'done' : 'progress')), el('h2', { class: 'project-title preline', style: 'margin-top:17px' }, el('a', { href: `#project/${encodeURIComponent(p.id)}` }, p.title)), el('p', { class: 'preline muted small' }, p.description || 'Belum ada deskripsi.'), el('div', { class: 'row between small muted' }, `${stats.done}/${stats.total} tugas selesai`, `${stats.percent}%`), progress(stats.percent), el('p', { class: 'muted small', style: 'margin:12px 0' }, `Deadline: ${fmt(p.deadline)}`), el('div', { class: 'row between' }, avatars(), el('div', { class: 'row gap-sm' }, iconButton('Edit proyek', 'edit-project', 'edit', { id: p.id }), iconButton('Hapus proyek', 'delete', 'trash', { kind: 'project', id: p.id }))), el('a', { class: 'btn soft sm', href: `#project/${encodeURIComponent(p.id)}`, style: 'margin-top:16px' }, 'Lihat proyek', icon('arrow')));
    })) : empty('Belum ada proyek.', 'new-project', 'Create Project'));
  }
  function notesPage() {
    const notes = H.notes.sorted(state, notesQuery);
    return el('div', {}, heading('Team Notes', 'Instruksi, rangkuman meeting, dan referensi kelompok.', button('Create Note', 'new-note', 'plus', 'primary')), el('div', { class: 'filters' }, el('div', { class: 'search-box' }, icon('search'), el('input', { id: 'notes-search', type: 'search', value: notesQuery, placeholder: 'Cari catatan…', 'aria-label': 'Cari catatan', dataset: { search: 'notes' } }))), el('p', { class: 'filtered-count' }, `${notes.length} catatan · ${notes.filter(n => n.pinned).length} pinned`), notes.length ? el('div', { class: 'note-grid' }, notes.map(noteCard)) : empty('Belum ada catatan yang sesuai.', 'new-note', 'Create Note'));
  }
  function linksPage() {
    const links = state.links.filter(l => `${l.title} ${l.description} ${l.category} ${l.url}`.toLocaleLowerCase().includes(linksQuery.toLocaleLowerCase()));
    return el('div', {}, heading('Quick Links', 'Simpan link pengumpulan, repositori, dan referensi kelompok.', button('Add Quick Link', 'new-link', 'plus', 'primary')), el('div', { class: 'filters' }, el('div', { class: 'search-box' }, icon('search'), el('input', { id: 'links-search', type: 'search', value: linksQuery, placeholder: 'Cari judul, URL, atau kategori…', 'aria-label': 'Cari quick links', dataset: { search: 'links' } }))), el('p', { class: 'filtered-count' }, `${links.length} quick links`), links.length ? el('div', { class: 'wide-links' }, links.map(l => linkCard(l, true))) : empty('Belum ada link yang sesuai.', 'new-link', 'Add Quick Link'));
  }
  function calendarPage() {
    const start = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    const offset = (start.getDay() + 6) % 7; start.setDate(start.getDate() - offset);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells = Math.ceil((daysInMonth + offset) / 7) * 7;
    return el('div', {}, heading('Calendar', 'Deadline tugas dalam zona waktu perangkat Anda.'), el('section', { class: 'panel calendar-panel' }, el('div', { class: 'calendar-toolbar' }, el('h2', {}, fmt(H.localDate(month), { month: 'long', year: 'numeric' })), el('div', { class: 'row' }, button('Today', 'calendar-today', null, 'soft sm'), iconButton('Bulan sebelumnya', 'calendar-prev', 'left'), iconButton('Bulan berikutnya', 'calendar-next', 'right'))), el('div', { class: 'calendar-week' }, ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => el('div', {}, day))), el('div', { class: 'calendar-grid' }, Array.from({ length: cells }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); const iso = H.localDate(d); const tasks = state.tasks.filter(t => t.deadline === iso);
      return el('div', { class: `calendar-day ${d.getMonth() !== month.getMonth() ? 'outside' : ''} ${iso === H.localDate() ? 'today' : ''}`, 'aria-label': fmt(iso) }, el('time', { class: 'day-number', datetime: iso }, d.getDate()), tasks.map(t => el('button', { type: 'button', class: 'calendar-task', dataset: { action: 'task-detail', id: t.id }, title: `${t.title} · ${t.status}` }, el('span', {}, t.title), el('br'), statusBadge(t.status))));
    })), el('p', { class: 'calendar-note' }, 'Pilih tugas untuk melihat detail. Deadline disimpan sebagai tanggal lokal, tanpa konversi UTC.')));
  }
  function teamPage(settings = false) {
    return el('div', {}, heading(settings ? 'Settings' : 'Team Members', 'Tiga anggota tetap. Nama, peran, jobdesk, dan avatar dapat diperbarui.'), el('div', { class: 'notice' }, icon('info'), mode === 'turso' ? ' Data tersimpan bersama di database tim. Perubahan anggota lain dimuat setiap 15 detik saat halaman aktif dan tidak sedang mengisi form. Semua anggota dapat mengelola pekerjaan tim.' : ' Data hanya tersimpan di browser ini. Profil terpilih menentukan My Tasks dan penulis catatan atau komentar. Tidak ada autentikasi atau sinkronisasi antarpengguna.'),
      el('div', { class: 'settings-grid' }, state.members.map(m => el('section', { class: 'panel member-card' }, avatar(m.id, true), el('h2', { class: 'preline' }, m.name), el('p', { class: 'role' }, m.role), el('p', { class: 'small muted preline' }, m.jobdesk || 'Belum ada jobdesk.'), el('div', { class: 'button-row' }, button('Edit profil', 'edit-member', 'edit', 'soft sm', { id: m.id }), m.id === current().id ? badge('Profil aktif', 'done') : button('Gunakan profil', 'switch-member', null, 'ghost sm', { id: m.id }))))),
      settings && el('section', { class: 'panel settings-section' }, el('h2', {}, 'Appearance'), el('p', { class: 'muted small', style: 'margin-top:6px' }, 'Tema tersimpan setelah halaman dimuat ulang.'), el('div', { class: 'theme-options' }, button('Light Mode', 'set-theme', 'sun', state.settings.theme === 'light' ? 'selected' : '', { theme: 'light' }), button('Dark Mode', 'set-theme', 'moon', state.settings.theme === 'dark' ? 'selected' : '', { theme: 'dark' }))),
      settings && el('section', { class: 'panel settings-section' }, el('h2', {}, mode === 'turso' ? 'Workspace tim' : 'Workspace lokal'), el('p', { class: 'muted small', style: 'margin-top:8px' }, mode === 'turso' ? 'Data pekerjaan berada di Turso. Tema disimpan pada perangkat ini. Ganti akun melalui halaman profil. Jika terjadi konflik perubahan, periksa data terbaru lalu simpan kembali.' : 'LocalStorage menyimpan proyek, tugas, catatan, link, profil, dan tema pada origin browser yang sama. Data dapat hilang jika data situs dibersihkan.'), el('a', { href: '#profile', class: 'btn soft sm', style: 'margin-top:14px' }, icon('team'), 'Pilih profil workspace'))
    );
  }
  function profilePage() {
    if (mode === 'turso') return el('main', { class: 'login-page', id: 'main', tabindex: '-1' }, brand(), el('section', { class: 'panel login-panel stack' }, avatar(current().id, true), el('h1', {}, current().name), el('p', { class: 'muted' }, 'Untuk menggunakan profil lain, keluar lalu pilih anggota yang ingin digunakan.'), button('Keluar / ganti anggota', 'logout', 'logout', 'soft'), el('a', { href: '#dashboard', class: 'btn primary' }, 'Buka Dashboard')));
    const selected = member(selectedProfile || current().id);
    const errorNode = el('p', { class: 'form-error', role: 'alert' });
    const form = el('form', {}, errorNode, el('button', { class: 'btn primary login-submit', type: 'submit' }, 'Buka Dashboard', icon('arrow')));
    form.addEventListener('submit', event => { event.preventDefault(); try { store.transact(s => { s.settings.currentMember = selected.id; }, 'Memilih profil workspace lokal.'); previewSession.enter(selected.id); signedIn = true; location.hash = 'dashboard'; render(); } catch (error) { errorNode.textContent = error.message; } });
    return el('main', { class: 'login-page', id: 'main', tabindex: '-1' }, brand(), el('section', { class: 'panel login-panel' }, el('div', { class: 'row between' }, badge('PBL Workspace · 3 anggota', 'progress'), badge('Local Mode', 'done')), el('h1', {}, 'Masuk ke Workspace'), el('p', { class: 'muted' }, 'Pilih profil anggota untuk membuka workspace lokal di browser ini.'), el('div', { class: 'login-members', role: 'group', 'aria-label': 'Pilih salah satu dari tiga profil' }, state.members.map(m => el('button', { type: 'button', class: `login-member ${m.id === selected.id ? 'selected' : ''}`, 'aria-pressed': m.id === selected.id ? 'true' : 'false', dataset: { action: 'select-profile', id: m.id } }, avatar(m.id), el('strong', {}, m.name), el('small', {}, m.role)))), form, el('div', { class: 'notice', style: 'margin-top:22px;margin-bottom:0' }, 'Pemilihan profil bukan autentikasi. Data belum tersinkronisasi antaranggota. Tidak diperlukan email, password, atau upload file.')), el('footer', {}, 'TaskHub · Workspace tugas untuk tim beranggotakan tiga orang.'));
  }
  function searchPage() {
    const q = globalQuery.trim().toLocaleLowerCase();
    const matches = (title, description) => `${title} ${description}`.toLocaleLowerCase().includes(q);
    const tasks = q ? state.tasks.filter(t => matches(t.title, t.description)) : [];
    const notes = q ? state.notes.filter(n => matches(n.title, n.description)) : [];
    const links = q ? state.links.filter(l => matches(l.title, `${l.description} ${l.url}`)) : [];
    const projects = q ? state.projects.filter(p => matches(p.title, p.description)) : [];
    return el('div', {}, heading('Search workspace', 'Cari tugas, proyek, catatan, dan quick links.'), searchForm(false), el('p', { class: 'filtered-count', style: 'margin-top:20px' }, `${tasks.length + notes.length + links.length + projects.length} hasil`), el('div', { class: 'global-results' }, tasks.map(t => el('article', { class: 'result-item' }, el('p', { class: 'eyebrow' }, 'Task'), el('button', { type: 'button', class: 'plain-title', dataset: { action: 'task-detail', id: t.id } }, t.title), el('p', { class: 'clamp' }, t.description))), notes.map(n => noteCard(n)), links.map(l => linkCard(l, true)), projects.map(p => el('article', { class: 'result-item' }, el('p', { class: 'eyebrow' }, 'Project'), el('a', { href: `#project/${encodeURIComponent(p.id)}` }, p.title))), !tasks.length && !notes.length && !links.length && !projects.length && empty(q ? 'Tidak ada hasil yang cocok.' : 'Masukkan kata kunci untuk mencari.')));
  }
  function searchForm(top = true) {
    const form = el('form', { class: 'search-box', role: 'search' }, icon('search'), el('input', { type: 'search', name: 'q', value: globalQuery, placeholder: 'Search tasks, links, notes…', 'aria-label': 'Cari seluruh workspace', required: true }), el('button', { type: 'submit', class: 'sr-only' }, 'Cari'));
    if (!top) { form.style.maxWidth = '100%'; form.style.border = '1px solid var(--border)'; }
    form.addEventListener('submit', event => { event.preventDefault(); globalQuery = String(new FormData(form).get('q') || '').trim(); if (route() === 'search') render(); else location.hash = 'search'; }); return form;
  }
  const navItems = [['dashboard', 'Dashboard', 'dashboard'], ['tasks', 'Tasks & Board', 'board'], ['my-tasks', 'My Tasks', 'tasks'], ['projects', 'Projects', 'folder'], ['calendar', 'Calendar', 'calendar'], ['notes', 'Team Notes', 'notes'], ['links', 'Quick Links', 'link'], ['team', 'Team Members', 'team'], ['settings', 'Settings', 'settings']];
  function activeRoute(value) { return route() === value || (value === 'tasks' && route() === 'board') || (value === 'projects' && route().startsWith('project/')); }
  function render() {
    if (mode === 'loading' || mode === 'error') return;
    const allowedRoute = H.accessRoute(signedIn, route());
    if (allowedRoute !== route()) history.replaceState(null, '', `${location.pathname}${location.search}#${allowedRoute}`);
    document.documentElement.dataset.theme = state.settings.theme;
    if (!signedIn) { document.title = 'TaskHub · Login'; root.replaceChildren(mode === 'turso' ? authPage() : profilePage()); return; }
    if (filters.project && !state.projects.some(p => p.id === filters.project)) filters.project = '';
    document.documentElement.dataset.theme = state.settings.theme;
    const currentRoute = route();
    document.title = `TaskHub · ${navItems.find(([id]) => activeRoute(id))?.[1] || (currentRoute === 'profile' ? 'Pilih Profil' : 'Workspace')}`;
    root.replaceChildren();
    if (currentRoute === 'profile') { root.append(profilePage()); return; }
    let page;
    switch (currentRoute) {
      case 'dashboard': page = dashboard(); break;
      case 'tasks': page = tasksPage(); break;
      case 'my-tasks': page = tasksPage(false, true); break;
      case 'board': page = tasksPage(true); break;
      case 'projects': page = projectsPage(); break;
      case 'notes': page = notesPage(); break;
      case 'links': page = linksPage(); break;
      case 'calendar': page = calendarPage(); break;
      case 'team': page = teamPage(); break;
      case 'settings': page = teamPage(true); break;
      case 'search': page = searchPage(); break;
      default: page = currentRoute.startsWith('project/') && project(currentRoute.slice(8)) ? tasksPage(false, false, currentRoute.slice(8)) : el('div', {}, heading('Halaman tidak ditemukan'), el('a', { href: '#dashboard', class: 'btn primary' }, 'Buka Dashboard'));
    }
    const sidebar = el('aside', { class: 'sidebar', id: 'sidebar', 'aria-label': 'Navigasi utama' }, brand(), el('div', { class: 'workspace-label' }, el('span', { class: 'eyebrow' }, 'Workspace'), el('p', { class: 'row between' }, 'PBL Project', icon('folder'))), el('nav', {}, navItems.map(([id, label, name]) => el('a', { href: `#${id}`, class: `nav-link ${activeRoute(id) ? 'active' : ''}`, 'aria-current': activeRoute(id) ? 'page' : null }, icon(name), label))), el('div', { class: 'sidebar-bottom' }, el('button', { type: 'button', class: 'profile-button row', dataset: { action: 'choose-profile' } }, avatar(current().id), el('span', { class: 'grow' }, el('strong', { class: 'small' }, current().name), el('span', { class: 'muted small', style: 'display:block' }, current().role)), icon('right')), el('p', { class: 'local-caption' }, el('span', { class: 'local-dot' }), mode === 'turso' ? 'Shared team workspace' : 'Local browser workspace', el('br'), mode === 'turso' ? 'Pembaruan data berkala · 15 detik' : 'Data belum tersinkronisasi antaranggota.')));
    root.append(el('a', { href: '#main', class: 'skip-link', dataset: { action: 'skip-main' } }, 'Lewati ke konten'), button('', 'close-menu', null, 'sidebar-backdrop', { label: 'Tutup navigasi' }), sidebar, el('div', { class: 'shell' }, el('header', { class: 'topbar' }, el('div', { class: 'row' }, button('', 'toggle-menu', 'menu', 'ghost icon-btn menu-toggle', { label: 'Buka navigasi' }), el('div', { class: 'mobile-brand' }, brand()), el('div', { class: 'crumb' }, 'TaskHub Workspace', el('b', {}, '/ PBL Project'))), searchForm(), el('div', { class: 'row' }, el('span', { class: 'badge done local-badge' }, mode === 'turso' ? '3 Members · Team' : '3 Members · Local'), el('span', { class: 'theme-toggle' }, iconButton('Ganti tema', 'toggle-theme', state.settings.theme === 'light' ? 'moon' : 'sun')), el('div', { class: 'top-profile' }, el('strong', {}, current().name), el('span', { class: 'muted' }, current().role)), mode === 'turso' && iconButton('Muat data terbaru', 'refresh-workspace', 'activity'), iconButton('Cari workspace', 'search-page', 'search'), el('a', { href: '#settings', 'aria-label': 'Pengaturan profil' }, avatar(current().id)))), el('main', { class: 'content', id: 'main', tabindex: '-1' }, page)), el('nav', { class: 'bottom-nav', 'aria-label': 'Navigasi mobile' }, [['dashboard', 'Dashboard', 'dashboard'], ['tasks', 'Tasks', 'tasks'], ['notes', 'Notes', 'notes'], ['links', 'Links', 'link'], ['calendar', 'Calendar', 'calendar']].map(([id, label, name]) => el('a', { href: `#${id}`, class: activeRoute(id) ? 'active' : '', 'aria-current': activeRoute(id) ? 'page' : null }, icon(name), label))));
    const sidebarFooter = sidebar.querySelector('.sidebar-bottom');
    sidebarFooter.insertBefore(button('Keluar', 'logout', 'logout', 'ghost sm'), sidebarFooter.querySelector('.local-caption'));
    document.querySelector('.menu-toggle')?.setAttribute('aria-controls', 'sidebar');
    document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
  }
  function toggleMenu(open) {
    const aside = document.getElementById('sidebar'); const backdrop = document.querySelector('.sidebar-backdrop');
    const value = open ?? !aside.classList.contains('open'); aside?.classList.toggle('open', value); backdrop?.classList.toggle('open', value); document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', String(value));
    if (value) aside?.querySelector('a')?.focus(); else document.querySelector('.menu-toggle')?.focus();
  }
  async function copy(value) {
    const safe = H.url(value, false);
    try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(safe); toast('Link disalin.'); }
    catch { showDialog('Salin link', el('div', {}, el('p', { class: 'muted small', style: 'margin-bottom:15px' }, 'Clipboard tidak tersedia. Pilih URL lalu gunakan Ctrl+C atau menu Salin pada perangkat.'), field('URL', 'copy-url', safe, 'text', { readonly: true, maxlength: 2000 }), el('div', { class: 'dialog-footer' }, button('Tutup', 'close-dialog')))); requestAnimationFrame(() => { const input = dialog.querySelector('input'); input?.focus(); input?.select(); }); }
  }
  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-action]'); if (!target) return;
    const { action, id, kind } = target.dataset;
    try {
      switch (action) {
        case 'skip-main': event.preventDefault(); document.getElementById('main')?.focus(); break;
        case 'new-task': taskForm(null, { status: target.dataset.status || 'To Do', projectId: target.dataset.project || '' }); break;
        case 'edit-task': taskForm(id); break;
        case 'task-detail': showTask(id); break;
        case 'new-project': projectForm(); break;
        case 'edit-project': projectForm(id); break;
        case 'new-note': noteForm(); break;
        case 'edit-note': noteForm(id); break;
        case 'pin-note': attempt(() => H.notes.pin(store, id), 'Sematan catatan diperbarui.'); break;
        case 'new-link': linkForm(); break;
        case 'edit-link': linkForm(id); break;
        case 'edit-member': memberForm(id); break;
        case 'delete': confirmDelete(kind, id); break;
        case 'confirm-delete': target.disabled = true; if (await attempt(() => H[`${kind}s`].remove(store, id), 'Data dihapus.')) { closeDialog(); if (kind === 'project' && route() === `project/${id}`) location.hash = 'projects'; } target.disabled = false; break;
        case 'close-dialog': closeDialog(); break;
        case 'copy': copy(target.dataset.url); break;
        case 'dashboard-tab': dashboardTab = target.dataset.tab; render(); break;
        case 'reset-filters': filters = { query: '', member: '', priority: '', project: '', status: '' }; render(); break;
        case 'calendar-prev': month = new Date(month.getFullYear(), month.getMonth() - 1, 1, 12); render(); break;
        case 'calendar-next': month = new Date(month.getFullYear(), month.getMonth() + 1, 1, 12); render(); break;
        case 'calendar-today': month = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12); render(); break;
        case 'toggle-theme': attempt(() => store.transact(s => { s.settings.theme = s.settings.theme === 'light' ? 'dark' : 'light'; })); break;
        case 'set-theme': attempt(() => store.transact(s => { s.settings.theme = target.dataset.theme; })); break;
        case 'switch-member': if (mode === 'turso') { location.hash = 'profile'; } else if (await attempt(() => store.transact(s => { s.settings.currentMember = id; }), 'Profil lokal dipilih.')) previewSession.enter(id); break;
        case 'logout':
          if (mode === 'local') { previewSession.clear(); signedIn = false; selectedProfile = current().id; if (dialog.open) closeDialog(); location.hash = 'login'; render(); }
          else if (await attempt(() => H.request('/api/logout', { method: 'POST', body: '{}' }))) { signedIn = false; state = H.initialState(); selectedProfile = 'member-1'; location.hash = 'login'; render(); }
          break;
        case 'refresh-workspace': await attempt(() => store.refresh(), 'Data terbaru dimuat.'); break;
        case 'choose-profile': selectedProfile = current().id; location.hash = 'profile'; break;
        case 'select-profile': selectedProfile = id; render(); break;
        case 'toggle-menu': toggleMenu(); break;
        case 'close-menu': toggleMenu(false); break;
        case 'search-page': location.hash = 'search'; break;
      }
    } catch (error) { toast(error.message, true); }
  });
  document.addEventListener('change', async event => {
    const target = event.target;
    if (target.dataset.filter) { filters[target.dataset.filter] = target.value; render(); return; }
    if (target.dataset.change === 'task-status') {
      const inDialog = dialog.contains(target); const id = target.dataset.id;
      target.disabled = true;
      if (await attempt(() => H.tasks.status(store, id, target.value), 'Status tugas diperbarui.')) { if (inDialog) showTask(id); }
      else target.value = state.tasks.find(t => t.id === id)?.status;
      target.disabled = false;
    }
    if (target.dataset.change === 'checklist') {
      target.disabled = true;
      if (await attempt(() => H.tasks.check(store, target.dataset.id, target.dataset.item, target.checked))) showTask(target.dataset.id);
      else target.checked = !target.checked;
      target.disabled = false;
    }
  });
  document.addEventListener('input', event => {
    const target = event.target; const type = target.dataset.search; if (!type) return;
    const value = target.value;
    if (type === 'tasks') filters.query = value;
    if (type === 'notes') notesQuery = value;
    if (type === 'links') linksQuery = value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { const id = target.id; const start = target.selectionStart; const end = target.selectionEnd; render(); const replacement = document.getElementById(id); replacement?.focus({ preventScroll: true }); try { replacement?.setSelectionRange(start, end); } catch {} }, 220);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !dialog.open && document.querySelector('.sidebar.open')) toggleMenu(false);
    const sidebar = document.querySelector('.sidebar.open');
    if (event.key === 'Tab' && sidebar) {
      const controls = [document.querySelector('.menu-toggle'), ...sidebar.querySelectorAll('a,button')].filter(Boolean); const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('dragstart', event => { const card = event.target.closest('[data-task-id]'); if (!card) return; event.dataTransfer.setData('text/plain', card.dataset.taskId); event.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); });
  document.addEventListener('dragend', () => { document.querySelectorAll('.dragging,.drag-over').forEach(n => n.classList.remove('dragging', 'drag-over')); });
  document.addEventListener('dragover', event => { const column = event.target.closest('[data-drop-status]'); if (!column) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; column.classList.add('drag-over'); });
  document.addEventListener('dragleave', event => { const column = event.target.closest('[data-drop-status]'); if (column && !column.contains(event.relatedTarget)) column.classList.remove('drag-over'); });
  document.addEventListener('drop', event => { const column = event.target.closest('[data-drop-status]'); if (!column) return; event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); column.classList.remove('drag-over'); if (state.tasks.some(t => t.id === id)) attempt(() => H.tasks.status(store, id, column.dataset.dropStatus), `Tugas dipindahkan ke ${column.dataset.dropStatus}.`); });
  window.addEventListener('hashchange', () => { clearTimeout(searchTimer); if (dialog.open) closeDialog(); delete dialog.dataset.taskId; render(); window.scrollTo({ top: 0 }); document.getElementById('main')?.focus({ preventScroll: true }); });
  window.addEventListener('storage', event => { if (mode !== 'local' || (event.key !== H.KEY && event.key !== null)) return; try { if (dialog.open) closeDialog(); store.refresh(); toast('Data dari tab browser lain dimuat.'); } catch (error) { fatal(error); } });
  function fatal(error) {
    mode = 'error';
    root.replaceChildren(el('main', { class: 'panel fatal' }, brand(), el('h1', { style: 'margin-top:24px' }, 'Workspace belum dapat dibuka'), el('p', {}, 'Data lama tidak ditimpa dan aplikasi tidak beralih ke penyimpanan lokal secara otomatis.'), el('p', { class: 'notice error', role: 'alert' }, error.message), el('p', { class: 'muted small' }, 'Gunakan server lokal atau deployment Vercel. Periksa konfigurasi dan koneksi API sesuai README, lalu muat ulang.'), el('a', { class: 'btn primary', href: location.pathname }, 'Muat ulang')));
  }
  function authPage() {
    document.title = 'TaskHub · Masuk';
    const errorNode = el('p', { class: 'form-error', role: 'alert' });
    const profiles = el('div', { class: 'login-members', role: 'group', 'aria-label': 'Pilih anggota tim' }, state.members.map(m => el('button', { type: 'button', class: `login-member ${m.id === (selectedProfile || 'member-1') ? 'selected' : ''}`, 'aria-pressed': m.id === (selectedProfile || 'member-1') ? 'true' : 'false', dataset: { action: 'select-profile', id: m.id } }, avatar(m.id), el('strong', {}, m.name), el('small', {}, m.role))));
    const form = el('form', {}, errorNode, el('button', { type: 'submit', class: 'btn primary login-submit' }, 'Buka Dashboard', icon('arrow')));
    form.addEventListener('submit', async event => {
      event.preventDefault(); const submit = form.querySelector('button[type=submit]'); submit.disabled = true; errorNode.textContent = '';
      const values = { memberId: selectedProfile || 'member-1' };
      try {
        const data = await H.request('/api/login', { method: 'POST', body: JSON.stringify(values) });
        form.reset(); state = store.accept(data); signedIn = true; selectedProfile = data.memberId;
        location.hash = 'dashboard';
        render();
      } catch (error) { errorNode.textContent = error.message; }
      finally { submit.disabled = false; }
    });
    return el('main', { class: 'login-page', id: 'main', tabindex: '-1' }, brand(), el('section', { class: 'panel login-panel' }, badge('PBL Workspace · 3 anggota', 'progress'), el('h1', {}, 'Masuk ke Workspace'), el('p', { class: 'muted', style: 'margin-bottom:24px' }, 'Pilih anggota, lalu buka dashboard untuk mulai bekerja bersama.'), profiles, form, el('p', { class: 'muted small', style: 'margin-top:20px' }, 'Tanpa password. Siapa pun yang membuka situs dapat memilih salah satu anggota. Data pekerjaan tersimpan bersama.')));
  }
  (async function start() {
    try {
      const config = await H.request('/api/config'); mode = config.mode;
      if (!['local', 'turso'].includes(mode)) throw new Error('Mode penyimpanan server tidak dikenal.');
      if (mode === 'local') {
        store = H.createStore(window.localStorage); store.load(); state = H.preparePreview(store);
        let tabStorage; try { tabStorage = window.sessionStorage; } catch {}
        previewSession = H.createPreviewSession(tabStorage);
        const savedMember = previewSession.read(); signedIn = !!savedMember;
        if (savedMember && state.settings.currentMember !== savedMember) state = store.transact(s => { s.settings.currentMember = savedMember; });
      }
      else {
        let preferences; try { preferences = window.localStorage; } catch {}
        store = H.createRemoteStore(preferences);
        try { state = await store.load(); signedIn = true; } catch (error) { if (error.status !== 401) throw error; signedIn = false; }
      }
      selectedProfile = state.settings.currentMember;
      store.subscribe(next => { state = next; render(); });
      render();
      if (mode === 'turso') setInterval(async () => {
        if (!signedIn || document.hidden || store.busy || dialog.open || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        try { await store.refresh(); } catch (error) { handleSessionError(error); }
      }, 15000);
    } catch (error) { fatal(error); }
  })();
})(TaskHub);
