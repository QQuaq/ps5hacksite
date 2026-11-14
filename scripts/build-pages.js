'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'public');
const out = path.join(root, 'docs');

function rm(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((name) => {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) rm(p);
    else fs.unlinkSync(p);
  });
  fs.rmdirSync(dir);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((name) => {
    const a = path.join(from, name);
    const b = path.join(to, name);
    if (fs.statSync(a).isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  });
}

const pagesBase = (process.env.PAGES_BASE || 'https://qquaq.github.io/ps5hacksite/').replace(/\/?$/, '/');
const baked = {
  IP: '—',
  ORIGIN: pagesBase,
  HTTP_PORT: '443',
  DNS_PORT: 'statik',
  HIJACK: 'manuals.playstation.net',
  UPSTREAM: '1.1.1.1',
  PORT_NOTE: ''
};

function bakeHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  Object.keys(baked).forEach((key) => {
    html = html.split('{{' + key + '}}').join(baked[key]);
  });
  fs.writeFileSync(filePath, html);
}

rm(out);
copyDir(src, out);
['panel.html', '404.html'].forEach((name) => {
  const filePath = path.join(out, name);
  if (fs.existsSync(filePath)) bakeHtml(filePath);
});
fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(
  path.join(out, '404.html'),
  fs.readFileSync(path.join(out, 'index.html'), 'utf8')
);

console.log('GitHub Pages hazir: docs/');
console.log('Repoda Settings > Pages > Branch: main, Folder: /docs');