const fs = require('node:fs');
const path = require('node:path');
const { readDatabaseConfig } = require('../server/config.cjs');
const { connectDatabase } = require('../server/database.cjs');
async function main() {
  const envPath = path.resolve(__dirname, '../.env'); if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
  const config = readDatabaseConfig();
  const repo = await connectDatabase(config);
  try {
    await repo.initialize();
    const snapshot = await repo.read();
    const expected = ['schema_migrations', 'workspaces', 'sessions', 'login_attempts'];
    const tables = await repo.client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('schema_migrations', 'workspaces', 'sessions', 'login_attempts')");
    if (expected.some(name => !tables.rows.some(row => row.name === name)) || snapshot.state.members.length !== 3) throw new Error('Database initialization verification failed');
    console.log('Skema database dan workspace tiga anggota siap. Data lama tidak ditimpa.');
    console.log(`Verifikasi baca berhasil: ${expected.join(', ')}. Anggota: ${snapshot.state.members.length}. Revision: ${snapshot.revision}.`);
    console.log(`Profil: ${snapshot.state.members.map(m => m.name).join(' | ')}. Foto profil versi ${snapshot.state.memberPhotosVersion || 0}.`);
  } finally { repo.close(); }
}
main().catch(error => { console.error(error.status ? error.message : 'Inisialisasi database gagal. Periksa konfigurasi/koneksi Turso.'); process.exitCode = 1; });
