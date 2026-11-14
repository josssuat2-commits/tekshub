const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { collectSourceFiles, assertCleanSources } = require('./source-files.cjs');
const root = path.resolve(__dirname, '..');
const parent = path.resolve(root, 'release');
const target = path.resolve(parent, 'taskhub-github');
try {
  const filename = path.join(root, '.env');
  const env = { ...process.env, ...(fs.existsSync(filename) ? parseEnv(fs.readFileSync(filename, 'utf8')) : {}) };
  const files = collectSourceFiles(root); assertCleanSources(root, files, env);
  if (!target.startsWith(root + path.sep) || path.dirname(target) !== parent || path.basename(target) !== 'taskhub-github') throw new Error('Target paket tidak valid.');
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  for (const name of files) {
    const destination = path.join(target, name); fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, name), destination);
  }
  assertCleanSources(target, files, env);
  console.log(`Paket ${files.length} file siap pada release/taskhub-github/.`);
  console.log('Unggah isi folder tersebut ke GitHub. .env, node_modules, dist, dan database lokal tidak disertakan.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
