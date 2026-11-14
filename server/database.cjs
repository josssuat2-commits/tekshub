const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { H, emptyWorkspace } = require('./domain.cjs');
const { HttpError } = require('./errors.cjs');
const WORKSPACE_ID = 'taskhub-team';
async function connectDatabase(config) {
  // Turso's newer engine and libSQL use different official transports.
  const useServerless = (config.driver || (config.url.startsWith('turso:') ? 'serverless' : 'libsql')) === 'serverless';
  const driver = useServerless ? await import('@tursodatabase/serverless/compat') : config.url.startsWith('file:') ? await import('@libsql/client') : await import('@libsql/client/web');
  const client = driver.createClient({ url: config.url, authToken: config.authToken });
  return createRepository(client);
}
function createRepository(client) {
  let ready;
  async function initialize() {
    if (!ready) ready = (async () => {
      const statements = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8').split(';').map(s => s.trim()).filter(Boolean);
      await client.batch(statements, 'write');
      const data = emptyWorkspace();
      await client.execute({ sql: 'INSERT OR IGNORE INTO workspaces (id, revision, data, updated_at) VALUES (?, 0, ?, ?)', args: [WORKSPACE_ID, JSON.stringify(data), new Date().toISOString()] });
      for (let attempt = 0; attempt < 3; attempt++) {
        const existing = await client.execute({ sql: 'SELECT revision, data FROM workspaces WHERE id = ?', args: [WORKSPACE_ID] });
        const row = existing.rows[0];
        if (!row) throw new HttpError(503, 'Workspace tidak tersedia.', 'DATABASE_UNAVAILABLE');
        const current = H.validate(JSON.parse(row.data));
        if (!H.applyMemberPhotos(current)) break;
        const changed = await client.execute({ sql: 'UPDATE workspaces SET data = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? RETURNING revision', args: [JSON.stringify(current), new Date().toISOString(), WORKSPACE_ID, Number(row.revision)] });
        if (changed.rows.length) break;
        if (attempt === 2) throw new HttpError(409, 'Profil sedang diperbarui. Coba muat ulang.', 'REVISION_CONFLICT');
      }
    })().catch(error => { ready = undefined; throw error; });
    await ready;
  }
  const readRow = row => ({ revision: Number(row.revision), state: H.validate(JSON.parse(row.data)) });
  return {
    client, initialize,
    async read() {
      await initialize();
      const result = await client.execute({ sql: 'SELECT revision, data FROM workspaces WHERE id = ?', args: [WORKSPACE_ID] });
      if (!result.rows[0]) throw new HttpError(503, 'Workspace tidak tersedia.', 'DATABASE_UNAVAILABLE');
      return readRow(result.rows[0]);
    },
    async commit(revision, state) {
      await initialize();
      // A single conditional write is atomic across independent Vercel instances.
      const result = await client.execute({ sql: 'UPDATE workspaces SET data = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? RETURNING revision, data', args: [JSON.stringify(state), new Date().toISOString(), WORKSPACE_ID, revision] });
      if (!result.rows.length) throw new HttpError(409, 'Data telah berubah oleh anggota lain. Muat data terbaru lalu periksa dan simpan kembali.', 'REVISION_CONFLICT');
      return readRow(result.rows[0]);
    },
    async attemptLogin(bucket, now = Date.now()) {
      await initialize();
      const result = await client.execute({ sql: 'INSERT INTO login_attempts (bucket, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET attempts = CASE WHEN expires_at <= ? THEN 1 ELSE attempts + 1 END, expires_at = CASE WHEN expires_at <= ? THEN ? ELSE expires_at END RETURNING attempts', args: [bucket, now + 900000, now, now, now + 900000] });
      if (Number(result.rows[0].attempts) > 8) throw new HttpError(429, 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.', 'RATE_LIMITED');
    },
    async createSession(token, memberId, credentialVersion, expires) {
      await initialize();
      await client.batch([
        { sql: 'DELETE FROM sessions WHERE expires_at <= ?', args: [Date.now()] },
        { sql: 'DELETE FROM login_attempts WHERE expires_at <= ?', args: [Date.now()] },
        { sql: 'INSERT INTO sessions (token_hash, member_id, credential_version, expires_at) VALUES (?, ?, ?, ?)', args: [hashToken(token), memberId, credentialVersion, expires] }
      ], 'write');
    },
    async session(token) {
      await initialize();
      const r = await client.execute({ sql: 'SELECT member_id, credential_version, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?', args: [hashToken(token), Date.now()] });
      return r.rows[0];
    },
    async revoke(token) { await initialize(); await client.execute({ sql: 'DELETE FROM sessions WHERE token_hash = ?', args: [hashToken(token)] }); },
    close() { client.close(); }
  };
}
function hashToken(token) { return createHash('sha256').update(token).digest('hex'); }
module.exports = { connectDatabase, createRepository, hashToken };

