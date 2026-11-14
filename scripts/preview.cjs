if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
  console.error('Preview lokal tidak boleh dijalankan pada production.'); process.exit(1);
}
const { createServer } = require('../server.cjs');
const port = Number(process.env.PREVIEW_PORT || 4173);
const server = createServer({ config: { mode: 'local', production: false } });
server.on('error', error => { console.error(error.code || error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`TaskHub preview: http://127.0.0.1:${port}/#login`));
