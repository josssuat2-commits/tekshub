const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { spawnSync } = require('node:child_process');
const { collectSourceFiles, assertCleanSources, isPrivateFile } = require('./source-files.cjs');
const root = path.resolve(__dirname, '..');
try {
  const filename = path.join(root, '.env');
  const env = { ...process.env, ...(fs.existsSync(filename) ? parseEnv(fs.readFileSync(filename, 'utf8')) : {}) };
  const example = parseEnv(fs.readFileSync(path.join(root, '.env.example'), 'utf8'));
  for (const key of ['TURSO_AUTH_TOKEN', 'SESSION_SECRET', 'TASKHUB_MEMBER_1_PASSWORD_HASH', 'TASKHUB_MEMBER_2_PASSWORD_HASH', 'TASKHUB_MEMBER_3_PASSWORD_HASH']) if (example[key]) throw new Error(`.env.example harus kosong untuk ${key}.`);
  const files = collectSourceFiles(root); assertCleanSources(root, files, env);
  const tracked = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (tracked.status === 0) {
    const privateFiles = tracked.stdout.split('\0').filter(Boolean).filter(name => name.split(/[\\/]/).some(isPrivateFile));
    if (privateFiles.length) throw new Error(`File privat sudah dilacak Git; .gitignore tidak menghapusnya dari index:\n${privateFiles.join('\n')}`);
    console.log('Index Git: tidak ada file privat yang terdeteksi. Histori commit belum dipindai.');
  } else console.log('Index/histori Git belum diverifikasi; gunakan folder hasil package:source untuk upload manual.');
  console.log(`Pemeriksaan source lulus: ${files.length} file; tidak ditemukan token JWT, private key, atau nilai rahasia environment yang diperiksa.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
