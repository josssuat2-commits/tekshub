const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { randomBytes } = require('node:crypto');
const { updateEnv } = require('./env-utils.cjs');
function main() {
  const filename = path.resolve(__dirname, '../.env');
  const exists = fs.existsSync(filename);
  const original = fs.readFileSync(exists ? filename : path.resolve(__dirname, '../.env.example'), 'utf8');
  const current = parseEnv(original);
  const changes = {};
  if (!current.SESSION_SECRET || current.SESSION_SECRET.length < 32) changes.SESSION_SECRET = randomBytes(32).toString('hex');
  if (exists && fs.readFileSync(filename, 'utf8') !== original) throw new Error('.env berubah selama pengaturan. Jalankan ulang agar perubahan lain tidak tertimpa.');
  if (!exists && fs.existsSync(filename)) throw new Error('.env dibuat proses lain. Jalankan ulang.');
  if (!exists || Object.keys(changes).length) fs.writeFileSync(filename, updateEnv(original, changes));
  console.log('Konfigurasi sesi siap pada .env. Login cukup memilih salah satu dari tiga anggota, tanpa password.');
  console.log('Token database dan session secret tidak dicetak.');
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
