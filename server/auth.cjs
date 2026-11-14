const { randomBytes, createHmac } = require('node:crypto');
const { HttpError } = require('./errors.cjs');
const COOKIE = 'taskhub_session';
const MEMBER_IDS = ['member-1', 'member-2', 'member-3'];
function cookieToken(req) {
  const match = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`));
  const token = match?.slice(COOKIE.length + 1) || '';
  return /^[a-f0-9]{64}$/.test(token) ? token : '';
}
function sessionCookie(token, config, clear = false) { return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 28800}${config.production ? '; Secure' : ''}`; }
function credentialVersion(config, id) { return createHmac('sha256', config.secret).update(`profile-selection-v1:${id}`).digest('hex'); }
async function requireSession(req, config, repo) {
  const token = cookieToken(req);
  const session = token ? await repo.session(token) : null;
  if (!session || !MEMBER_IDS.includes(session.member_id) || session.credential_version !== credentialVersion(config, session.member_id)) throw new HttpError(401, 'Silakan pilih anggota untuk masuk ke workspace.', 'UNAUTHORIZED');
  return { memberId: session.member_id, token };
}
function checkOrigin(req, config) {
  if (req.headers.origin !== config.origin || req.headers['x-taskhub-client'] !== '1') throw new HttpError(403, 'Permintaan harus berasal dari situs TaskHub yang sama.', 'ORIGIN_REJECTED');
}
async function login(req, config, repo, values) {
  const id = values.memberId;
  const valid = MEMBER_IDS.includes(id);
  const ip = process.env.VERCEL === '1' ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : (req.socket?.remoteAddress || 'unknown');
  const bucket = createHmac('sha256', config.secret).update(`${ip}:${valid ? id : 'unknown'}`).digest('hex');
  await repo.attemptLogin(bucket);
  if (!valid) throw new HttpError(400, 'Pilih salah satu dari tiga anggota yang tersedia.', 'INVALID_MEMBER');
  const previous = cookieToken(req); if (previous) await repo.revoke(previous);
  const token = randomBytes(32).toString('hex');
  await repo.createSession(token, id, credentialVersion(config, id), Date.now() + 28800000);
  return { token, memberId: id };
}
module.exports = { requireSession, checkOrigin, login, sessionCookie, cookieToken };

