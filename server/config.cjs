const { HttpError } = require('./errors.cjs');
function readDatabaseConfig(env = process.env) {
  const production = env.NODE_ENV === 'production' || env.VERCEL === '1';
  if (!env.TURSO_DATABASE_URL?.trim()) throw new HttpError(503, 'Isi TURSO_DATABASE_URL di .env terlebih dahulu.', 'CONFIG_REQUIRED');
  const url = env.TURSO_DATABASE_URL;
  if (!/^(libsql|https|turso|file):/.test(url)) throw new HttpError(503, 'Skema URL database tidak didukung.', 'CONFIG_REQUIRED');
  const driver = env.TURSO_DRIVER || (url.startsWith('turso:') ? 'serverless' : 'libsql');
  if (!['libsql', 'serverless'].includes(driver) || (url.startsWith('file:') && driver !== 'libsql') || (url.startsWith('turso:') && driver !== 'serverless')) throw new HttpError(503, 'TURSO_DRIVER tidak sesuai dengan URL database.', 'CONFIG_REQUIRED');
  if (url.startsWith('file:') && production) throw new HttpError(503, 'Production memerlukan database Turso remote.', 'CONFIG_REQUIRED');
  if (!url.startsWith('file:') && !env.TURSO_AUTH_TOKEN) throw new HttpError(503, 'TURSO_AUTH_TOKEN belum diisi.', 'CONFIG_REQUIRED');
  return { mode: 'turso', driver, production, url, authToken: env.TURSO_AUTH_TOKEN };
}
function readConfig(env = process.env) {
  const production = env.NODE_ENV === 'production' || env.VERCEL === '1';
  if (env.TASKHUB_STORAGE === 'local') {
    if (production) throw new HttpError(503, 'Mode LocalStorage hanya diizinkan saat development.', 'CONFIG_REQUIRED');
    return { mode: 'local', production };
  }
  const database = readDatabaseConfig(env);
  if (!env.SESSION_SECRET) throw new HttpError(503, 'SESSION_SECRET belum diisi. Jalankan npm run auth:setup.', 'CONFIG_REQUIRED');
  if (env.SESSION_SECRET.length < 32) throw new HttpError(503, 'SESSION_SECRET minimal 32 karakter.', 'CONFIG_REQUIRED');
  const origin = env.APP_ORIGIN || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : 'http://127.0.0.1:4173');
  let parsed;
  try { parsed = new URL(origin); } catch { throw new HttpError(503, 'APP_ORIGIN tidak valid.', 'CONFIG_REQUIRED'); }
  if (parsed.origin !== origin || (production && parsed.protocol !== 'https:') || !['http:', 'https:'].includes(parsed.protocol)) throw new HttpError(503, 'APP_ORIGIN harus berupa origin tepat; gunakan HTTPS di production.', 'CONFIG_REQUIRED');
  return { ...database, origin, secret: env.SESSION_SECRET };
}
module.exports = { readConfig, readDatabaseConfig };

