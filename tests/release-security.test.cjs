const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { parseEnv } = require('node:util');
const { updateEnv } = require('../scripts/env-utils.cjs');
const { collectSourceFiles, isPrivateFile, findSensitiveContent, assertCleanSources } = require('../scripts/source-files.cjs');
test('session setup preserves database credentials and environment values containing dollar signs', () => {
  const original = '# keep comment\nTURSO_AUTH_TOKEN="existing-token"\nAPP_ORIGIN=http://127.0.0.1:4173\nSESSION_SECRET=\n';
  const secret = ['generated', 'session', 'secret', 'with-dollar-signs'].join('$');
  const updated = updateEnv(original, { SESSION_SECRET: secret });
  const result = parseEnv(updated);
  assert.equal(result.TURSO_AUTH_TOKEN, 'existing-token'); assert.equal(result.APP_ORIGIN, 'http://127.0.0.1:4173');
  assert.equal(result.SESSION_SECRET, secret); assert.ok(updated.startsWith('# keep comment'));
  assert.throws(() => updateEnv(original, { SESSION_SECRET: 'injected\nKEY=value' }));
});
test('environment updates replace duplicate and export-prefixed definitions without retaining stale values', () => {
  const result = updateEnv('export SESSION_SECRET=old\n  SESSION_SECRET = stale\nOTHER=keep\n', { SESSION_SECRET: 'fresh' });
  assert.ok(!result.includes('old') && !result.includes('stale'));
  assert.equal(parseEnv(result).SESSION_SECRET, 'fresh'); assert.equal(parseEnv(result).OTHER, 'keep');
});
test('release excludes credentials, database files and private keys while retaining the blank environment template', () => {
  for (const name of ['.env', '.env.production', '.env.backup', 'secrets.pem', 'db.sqlite', 'db.sqlite3-wal', 'db.db-shm', 'node_modules', 'release']) assert.equal(isPrivateFile(name), true, name);
  assert.equal(isPrivateFile('.env.example'), false);
  const files = collectSourceFiles(path.resolve(__dirname, '..'));
  assert.ok(files.includes('.env.example')); assert.ok(files.includes(path.join('server', 'config.cjs'))); assert.ok(files.includes('vercel.json'));
  assert.ok(files.every(name => !isPrivateFile(name)));
});
test('scanner detects token-shaped content and private keys without including their contents in diagnostics', () => {
  const jwt = [Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ id: 'example-database-id' })).toString('base64url'), Buffer.alloc(64, 1).toString('base64url')].join('.');
  assert.ok(findSensitiveContent(jwt).includes('token JWT'));
  assert.ok(findSensitiveContent(['-----BEGIN', 'PRIVATE KEY-----'].join(' ')).includes('private key'));
  assert.ok(findSensitiveContent('prefix-do-not-publish-this-value-suffix', ['do-not-publish-this-value']).includes('nilai rahasia dari environment'));
  assert.equal(findSensitiveContent('ordinary public source').length, 0);
});
test('source packaging blocks a known secret and reports only the affected filename and type', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhub-source-test-'));
  try {
    const secret = 'pretend-sensitive-test-value'; fs.writeFileSync(path.join(dir, 'public.js'), `const secret = '${secret}';`);
    assert.throws(() => assertCleanSources(dir, ['public.js'], { TURSO_AUTH_TOKEN: secret }), error => error.message.includes('public.js') && !error.message.includes(secret));
  } finally {
    const target = path.resolve(dir);
    if (!target.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(target).startsWith('taskhub-source-test-')) throw new Error('Unexpected cleanup target');
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
});
