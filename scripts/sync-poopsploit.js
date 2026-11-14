'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const vendor = path.join(root, 'vendor', 'poopsploit');
const pub = path.join(root, 'public');
const orbit = path.join(root, 'orbit');

if (!fs.existsSync(vendor)) {
  console.error('vendor/poopsploit yok. Once: git clone https://github.com/soniciso1/poopsploit.git vendor/poopsploit');
  process.exit(1);
}

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

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

rm(pub);
copyDir(vendor, pub);

const gbGuide = path.join(pub, 'document', 'gb', 'ps5', 'index.html');
const enGuide = path.join(pub, 'document', 'en', 'ps5', 'index.html');
if (fs.existsSync(enGuide)) {
  fs.mkdirSync(path.dirname(gbGuide), { recursive: true });
  fs.copyFileSync(enGuide, gbGuide);
}

if (fs.existsSync(path.join(orbit, 'panel.html'))) {
  copyFile(path.join(orbit, 'panel.html'), path.join(pub, 'panel.html'));
  copyDir(path.join(orbit, 'assets'), path.join(pub, 'orbit-assets'));
}

const panelPath = path.join(pub, 'panel.html');
if (fs.existsSync(panelPath)) {
  let html = fs.readFileSync(panelPath, 'utf8');
  html = html
    .replaceAll('href="assets/', 'href="orbit-assets/')
  .replaceAll('src="assets/', 'src="orbit-assets/');
  fs.writeFileSync(panelPath, html);
}

console.log('poopsploit -> public senkronlandi');
console.log('ORBIT paneli: /panel.html (orbit-assets/)');