const fs = require('node:fs');
const path = require('node:path');
const { readDatabaseConfig } = require('../server/config.cjs');
const { connectDatabase } = require('../server/database.cjs');
async function main() {
  const envPath = path.resolve(__dirname, '../.env'); if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
  const config = readDatabaseConfig();
  const repo = await connectDatabase(config);
  try {
    const result = await repo.client.execute('SELECT 1 AS connected');
    if (Number(result.rows[0]?.connected) !== 1) throw new Error('Unexpected database response');
    console.log(`Koneksi database berhasil (${config.driver}). URL dan token tidak ditampilkan. Tidak ada data yang diubah.`);
  } finally { repo.close(); }
}
main().catch(error => {
  console.error(error.status ? error.message : 'Koneksi database gagal. Periksa URL, engine/driver, token database, dan koneksi internet.');
  process.exitCode = 1;
});
