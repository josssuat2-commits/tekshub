const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createApi } = require('./server/api.cjs');
const root = __dirname;
const profileImages = ['Joshua Timothy.jpg', 'Kaesie Silvila Fitri.jpg', 'Naura afifah.jpg'];
function createServer(options = {}) {
const api = createApi(options);
const assets = new Set(['/', '/index.html', ...['taskhub_login_screen', 'taskhub_mobile_dashboard', 'taskhub_team_dashboard_quick_links'].map(n => `/${n}/code.html`), '/css/style.css', ...fs.readdirSync(path.join(root, 'js')).filter(n => n.endsWith('.js')).map(n => `/js/${n}`)]);
for (const filename of profileImages) assets.add(`/foto profil/${filename}`);
return http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  if (pathname.startsWith('/api/')) { api(req, res); return; }
  if (!assets.has(pathname)) { res.writeHead(404).end('Not found'); return; }
  const filename = path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1));
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end('Method not allowed'); return; }
  fs.readFile(filename, (error, content) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg' };
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
});
}
if (require.main === module) {
const envPath = path.join(root, '.env'); if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
const port = Number(process.env.PORT || 4173);
const server = createServer();
server.listen(port, '127.0.0.1', () => console.log(`TaskHub: http://127.0.0.1:${port}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { createServer };
