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

rm(out);
copyDir(src, out);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(
  path.join(out, '404.html'),
  fs.readFileSync(path.join(out, 'index.html'), 'utf8')
);

console.log('GitHub Pages hazir: docs/');
console.log('Repoda Settings > Pages > Branch: main, Folder: /docs');