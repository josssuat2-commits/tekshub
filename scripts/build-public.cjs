const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
// Only application assets become public; no server code, credentials or database files.
if (path.resolve(out) !== path.resolve(root, 'dist') || !path.resolve(out).startsWith(root + path.sep)) throw new Error('Invalid build output path');
fs.rmSync(out, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
fs.mkdirSync(out, { recursive: true });
for (const dir of ['css', 'js', 'foto profil']) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
for (const dir of ['taskhub_login_screen', 'taskhub_mobile_dashboard', 'taskhub_team_dashboard_quick_links']) {
  fs.mkdirSync(path.join(out, dir), { recursive: true });
  fs.copyFileSync(path.join(root, dir, 'code.html'), path.join(out, dir, 'code.html'));
}
console.log('Public assets prepared in dist/.');
