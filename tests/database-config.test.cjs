const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readConfig, readDatabaseConfig } = require('../server/config.cjs');
test('profile selection needs a session secret but does not require any password hashes', () => {
  const env = { TURSO_DATABASE_URL: 'libsql://example.turso.io', TURSO_AUTH_TOKEN: 'test-token' };
  assert.equal(readDatabaseConfig(env).driver, 'libsql');
  assert.throws(() => readConfig(env), /SESSION_SECRET/);
  const config = readConfig({ ...env, SESSION_SECRET: 'a-session-secret-at-least-32-characters' });
  assert.equal(config.mode, 'turso'); assert.equal(config.hashes, undefined);
  assert.throws(() => readConfig({ ...env, SESSION_SECRET: 'short' }), /minimal 32/);
  assert.equal(readConfig({ ...env, SESSION_SECRET: 'a-session-secret-at-least-32-characters', NODE_ENV: 'production', APP_ORIGIN: 'https://taskhub.example' }).origin, 'https://taskhub.example');
  assert.equal(readDatabaseConfig({ TURSO_DATABASE_URL: 'turso://example.turso.io', TURSO_AUTH_TOKEN: 'test-token' }).driver, 'serverless');
});
test('database config rejects missing tokens, incompatible drivers and local production storage', () => {
  assert.throws(() => readDatabaseConfig({}), /TURSO_DATABASE_URL/);
  assert.throws(() => readDatabaseConfig({ TURSO_DATABASE_URL: 'libsql://example.turso.io' }), /TURSO_AUTH_TOKEN/);
  assert.throws(() => readDatabaseConfig({ TURSO_DATABASE_URL: 'turso://example.turso.io', TURSO_AUTH_TOKEN: 'test', TURSO_DRIVER: 'libsql' }));
  assert.throws(() => readDatabaseConfig({ TURSO_DATABASE_URL: 'file:local.db', NODE_ENV: 'production' }));
  assert.equal(readDatabaseConfig({ TURSO_DATABASE_URL: 'file:local.db' }).driver, 'libsql');
});
