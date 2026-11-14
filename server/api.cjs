const { readConfig } = require('./config.cjs');
const { connectDatabase } = require('./database.cjs');
const { executeCommand } = require('./domain.cjs');
const { HttpError } = require('./errors.cjs');
const auth = require('./auth.cjs');
const MAX_BODY = 64 * 1024;
async function readBody(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw new HttpError(415, 'Gunakan Content-Type application/json.');
  if (Number(req.headers['content-length'] || 0) > MAX_BODY) throw new HttpError(413, 'Permintaan terlalu besar.');
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BODY) throw new HttpError(413, 'Permintaan terlalu besar.');
    try { return checkBody(JSON.parse(raw)); } catch { throw new HttpError(400, 'JSON tidak valid.'); }
  }
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += Buffer.byteLength(chunk); if (size > MAX_BODY) throw new HttpError(413, 'Permintaan terlalu besar.'); chunks.push(Buffer.from(chunk)); }
  try { return checkBody(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { throw new HttpError(400, 'JSON tidak valid.'); }
}
function checkBody(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
function send(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Cookie' }); res.end(JSON.stringify(data)); }
function createApi(options = {}) {
  let repository;
  async function getRepository(config) { if (options.repository) return options.repository; if (!repository) repository = connectDatabase(config).catch(error => { repository = undefined; throw error; }); return repository; }
  return async function handleApi(req, res) {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const routes = { '/api/config': ['GET'], '/api/session': ['GET'], '/api/login': ['POST'], '/api/logout': ['POST'], '/api/workspace': ['GET'], '/api/command': ['POST'] };
      if (!Object.hasOwn(routes, pathname)) throw new HttpError(404, 'Endpoint tidak ditemukan.');
      if (!routes[pathname].includes(req.method)) { res.setHeader('Allow', routes[pathname].join(', ')); throw new HttpError(405, 'Metode tidak diizinkan.'); }
      const config = options.config || readConfig();
      if (pathname === '/api/config') return send(res, 200, { mode: config.mode });
      if (config.mode !== 'turso') throw new HttpError(503, 'API database dinonaktifkan pada demo lokal.');
      if (req.method === 'POST') auth.checkOrigin(req, config);
      const repo = await getRepository(config);
      if (pathname === '/api/login') {
        const session = await auth.login(req, config, repo, await readBody(req));
        res.setHeader('Set-Cookie', auth.sessionCookie(session.token, config));
        return send(res, 200, { memberId: session.memberId, ...(await repo.read()) });
      }
      if (pathname === '/api/session') {
        try { const session = await auth.requireSession(req, config, repo); return send(res, 200, { authenticated: true, memberId: session.memberId }); }
        catch (error) { if (error.status !== 401) throw error; return send(res, 200, { authenticated: false }); }
      }
      const session = await auth.requireSession(req, config, repo);
      if (pathname === '/api/logout') { await repo.revoke(session.token); res.setHeader('Set-Cookie', auth.sessionCookie('', config, true)); return send(res, 200, { ok: true }); }
      if (pathname === '/api/workspace') return send(res, 200, { ...(await repo.read()), memberId: session.memberId });
      const values = await readBody(req);
      if (values.memberId && values.memberId !== session.memberId) throw new HttpError(409, 'Akun pada browser ini telah berubah. Periksa profil aktif sebelum menyimpan kembali.', 'ACCOUNT_CHANGED');
      if (!Number.isSafeInteger(values.revision) || values.revision < 0) throw new HttpError(400, 'Versi data tidak valid.');
      const snapshot = await repo.read();
      if (snapshot.revision !== values.revision) throw new HttpError(409, 'Ada perubahan dari anggota lain. Muat data terbaru, periksa isian, lalu simpan kembali.', 'REVISION_CONFLICT');
      const next = executeCommand(snapshot.state, session.memberId, values.command, values.payload);
      return send(res, 200, { ...(await repo.commit(values.revision, next)), memberId: session.memberId });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 503;
      if (status === 429) res.setHeader('Retry-After', '900');
      if (!(error instanceof HttpError)) console.error('TaskHub database operation failed:', error.code || error.name);
      send(res, status, { error: error instanceof HttpError ? error.message : 'Database belum dapat dihubungi. Coba lagi; perubahan belum dikonfirmasi tersimpan.', code: error instanceof HttpError ? error.code : 'DATABASE_UNAVAILABLE' });
    }
  };
}
module.exports = { createApi };

