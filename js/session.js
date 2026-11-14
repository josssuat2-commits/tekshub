(function (H) {
  'use strict';
  const PREVIEW_KEY = 'taskhub.preview.member';
  const members = ['member-1', 'member-2', 'member-3'];
  function createPreviewSession(adapter) {
    let memoryMember = null;
    return {
      read() {
        try { const id = adapter ? adapter.getItem(PREVIEW_KEY) : memoryMember; return members.includes(id) ? id : null; }
        catch { return memoryMember; }
      },
      enter(id) {
        if (!members.includes(id)) throw new Error('Profil preview tidak valid.');
        memoryMember = id;
        try { adapter?.setItem(PREVIEW_KEY, id); } catch {}
      },
      clear() {
        memoryMember = null;
        try { adapter?.removeItem(PREVIEW_KEY); } catch {}
      }
    };
  }
  // This routes the UI only; Turso authorization is always checked by the API.
  function accessRoute(signedIn, requested) { return signedIn ? requested === 'login' ? 'dashboard' : requested : 'login'; }
  H.createPreviewSession = createPreviewSession;
  H.accessRoute = accessRoute;
})(TaskHub);
