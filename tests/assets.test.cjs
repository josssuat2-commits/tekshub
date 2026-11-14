const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
test('all application entry points reference existing shared assets in dependency order', () => {
  for (const name of ['index.html', 'taskhub_login_screen/code.html', 'taskhub_mobile_dashboard/code.html', 'taskhub_team_dashboard_quick_links/code.html']) {
    const file = path.join(root, name); const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) assert.ok(fs.existsSync(path.resolve(path.dirname(file), match[1])), `${name}: ${match[1]}`);
    assert.ok(html.indexOf('js/storage.js') < html.indexOf('js/tasks.js'));
    assert.ok(html.indexOf('js/tasks.js') < html.indexOf('js/app.js'));
    assert.ok(!/on(?:click|submit)=|type="(?:file|password)"/i.test(html));
    assert.ok(html.includes('name="viewport"'));
  }
});
test('all runtime JavaScript files parse', () => {
  const files = ['server.cjs', ...['js', 'server', 'scripts', 'api'].flatMap(dir => fs.readdirSync(path.join(root, dir)).filter(n => /\.(cjs|js)$/.test(n)).map(n => path.join(dir, n)))];
  for (const filename of files) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, filename)], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});
test('production build exposes only the application assets and excludes private source', () => {
  const result = spawnSync(process.execPath, ['scripts/build-public.cjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const out = path.join(root, 'dist');
  for (const name of ['.env', '.env.example', 'server.cjs', 'server', 'database', 'tests', 'references', 'package.json', 'node_modules']) assert.ok(!fs.existsSync(path.join(out, name)), name);
  for (const name of ['index.html', 'js/api.js', 'js/app.js', 'css/style.css', 'taskhub_login_screen/code.html']) assert.ok(fs.existsSync(path.join(out, name)), name);
  for (const filename of ['Joshua Timothy.jpg', 'Kaesie Silvila Fitri.jpg', 'Naura afifah.jpg']) {
    const relative = path.join('foto profil', filename);
    assert.ok(fs.readFileSync(path.join(root, relative)).equals(fs.readFileSync(path.join(out, relative))), filename);
  }
});
test('original designs and screenshots remain available', () => {
  for (const filename of ['references/login.original.html', 'references/mobile.original.html', 'references/dashboard.original.html', 'taskhub_login_screen/screen.png', 'taskhub_mobile_dashboard/screen.png', 'taskhub_team_dashboard_quick_links/screen.png', 'taskhub_precision_workspace/DESIGN.md']) assert.ok(fs.statSync(path.join(root, filename)).size > 0);
});
