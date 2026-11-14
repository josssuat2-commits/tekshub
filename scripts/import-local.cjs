const fs = require('node:fs');
const path = require('node:path');
const { readDatabaseConfig } = require('../server/config.cjs');
const { H, MEMBER_IDS } = require('../server/domain.cjs');
const { connectDatabase } = require('../server/database.cjs');
async function main() {
  const input = process.argv[2]; if (!input) throw new Error('Gunakan: node scripts/import-local.cjs <path-ke-salinan-localstorage.json>');
  const data = H.validate(JSON.parse(fs.readFileSync(path.resolve(input), 'utf8')));
  if (data.members.some((m, i) => m.id !== MEMBER_IDS[i])) throw new Error('ID anggota tidak cocok.');
  if (Buffer.byteLength(JSON.stringify(data)) > 512 * 1024) throw new Error('Workspace maksimal 512 KB.');
  data.settings = { theme: 'light', currentMember: 'member-1' };
  const envPath = path.resolve(__dirname, '../.env'); if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
  const config = readDatabaseConfig();
  const repo = await connectDatabase(config);
  try {
    const current = await repo.read();
    if (current.revision !== 0 || ['projects', 'tasks', 'notes', 'links', 'activity'].some(key => current.state[key].length)) throw new Error('Import hanya diizinkan ke workspace baru yang masih kosong. Data tim tidak ditimpa.');
    await repo.commit(0, data); console.log('Salinan data lokal berhasil diimpor. Data pada browser asal tetap utuh.');
  } finally { repo.close(); }
}
main().catch(error => { console.error(error.code && !error.status ? 'Import gagal. Periksa konfigurasi, file input, dan koneksi database.' : error.message); process.exitCode = 1; });
