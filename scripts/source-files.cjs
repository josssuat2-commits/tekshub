const fs = require('node:fs');
const path = require('node:path');
const ROOT_FILES = ['index.html', 'server.cjs', 'package.json', 'package-lock.json', 'vercel.json', '.gitignore', '.vercelignore', '.env.example', 'README.md', 'TESTING.md', 'SECURITY-REVIEW.md', 'UPLOAD-GUIDE.md'];
const DIRECTORIES = ['api', 'css', 'js', 'foto profil', 'server', 'scripts', 'database', 'tests', 'references', 'taskhub_precision_workspace', 'taskhub_login_screen', 'taskhub_mobile_dashboard', 'taskhub_team_dashboard_quick_links'];
function isPrivateFile(name) {
  const base = path.basename(name);
  return (base.startsWith('.env') && base !== '.env.example') || /\.(?:db|sqlite|sqlite3)(?:-(?:wal|shm|journal))?$/i.test(base) || /\.(?:pem|key|p12|pfx)$/i.test(base) || ['node_modules', '.git', '.data', '.vercel', 'coverage', 'dist', 'release'].includes(base);
}
function collectSourceFiles(root) {
  const files = [];
  function add(relative) {
    if (isPrivateFile(relative)) return;
    const full = path.join(root, relative); if (!fs.existsSync(full)) return;
    const info = fs.lstatSync(full);
    if (info.isSymbolicLink()) throw new Error(`Symlink tidak boleh masuk paket source: ${relative}`);
    if (info.isDirectory()) for (const name of fs.readdirSync(full)) add(path.join(relative, name));
    else if (info.isFile()) files.push(relative);
  }
  for (const name of [...ROOT_FILES, ...DIRECTORIES]) add(name);
  return files;
}
function findSensitiveContent(text, knownSecrets = []) {
  const findings = [];
  if (knownSecrets.some(value => value && text.includes(value))) findings.push('nilai rahasia dari environment');
  if (/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/.test(text)) findings.push('token JWT');
  if (/-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/.test(text)) findings.push('private key');
  return findings;
}
function assertCleanSources(root, files, env = {}) {
  const keys = ['TURSO_AUTH_TOKEN', 'SESSION_SECRET', 'TASKHUB_MEMBER_1_PASSWORD_HASH', 'TASKHUB_MEMBER_2_PASSWORD_HASH', 'TASKHUB_MEMBER_3_PASSWORD_HASH'];
  const known = keys.map(key => env[key]).filter(Boolean);
  const findings = [];
  for (const name of files) {
    if (isPrivateFile(name)) { findings.push(`${name}: file privat`); continue; }
    const buffer = fs.readFileSync(path.join(root, name));
    const text = buffer.toString('utf8');
    const sensitive = findSensitiveContent(text, known);
    if (sensitive.length) findings.push(`${name}: ${sensitive.join(', ')}`);
  }
  if (findings.length) throw new Error(`Paket source diblokir. Hapus rahasia dari file berikut (nilainya tidak ditampilkan):\n${findings.join('\n')}`);
}
module.exports = { collectSourceFiles, isPrivateFile, findSensitiveContent, assertCleanSources };
