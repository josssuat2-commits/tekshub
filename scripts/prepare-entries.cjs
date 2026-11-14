const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const [folder, page] of [['taskhub_login_screen', 'profile'], ['taskhub_mobile_dashboard', 'dashboard'], ['taskhub_team_dashboard_quick_links', 'dashboard']]) {
  const html = template.replace('<body>', `<body data-page="${page}">`).replace(/(href|src)="(css|js)\//g, '$1="../$2/');
  fs.writeFileSync(path.join(root, folder, 'code.html'), html);
}
