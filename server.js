'use strict';

const http = require('http');
const dgram = require('dgram');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dev = process.argv.includes('--dev');
const root = __dirname;
const pub = path.join(root, 'public');
const configPath = path.join(root, 'config.json');

const config = Object.assign(
  { upstream: '1.1.1.1', ip: '', hijack: ['manuals.playstation.net'] },
  readConfig()
);

const HIJACK = (Array.isArray(config.hijack) ? config.hijack : [])
  .map((name) => String(name).trim().toLowerCase())
  .filter(Boolean);

const state = {
  startedAt: Date.now(),
  httpPort: null,
  dnsPort: null,
  dnsOk: false,
  httpOk: false,
  wantHttp: dev ? 8080 : 80,
  wantDns: dev ? 15353 : 53,
  primaryIp: null,
  ips: [],
  hijack: HIJACK,
  upstream: config.upstream || '1.1.1.1',
  origin: '',
  events: [],
  httpHits: 0,
  dnsHits: 0,
  psHits: 0,
  dnsError: '',
  httpError: ''
};

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    return {};
  }
}

function rankIp(address, name) {
  let score = 0;
  if (address.startsWith('192.168.')) score += 100;
  else if (address.startsWith('10.')) score += 80;
  else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) score += 60;
  else score += 10;
  if (/virtual|vethernet|vmware|vbox|hyper-v|wsl|bluetooth|loopback|tap|tunnel/i.test(name)) {
    score -= 40;
  }
  if (/wi-?fi|wlan|ethernet|eth/i.test(name)) score += 8;
  return score;
}

function refreshIps() {
  const found = [];
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((name) => {
    (nets[name] || []).forEach((net) => {
      const family = net.family === 4 || net.family === 'IPv4';
      if (!family || net.internal) return;
      found.push({ name, address: net.address, score: rankIp(net.address, name) });
    });
  });
  found.sort((a, b) => b.score - a.score);
  const pinned = String(config.ip || '').trim();
  const primary = pinned || (found[0] && found[0].address) || '127.0.0.1';
  state.ips = found.map((item) => ({
    name: item.name,
    address: item.address,
    primary: item.address === primary
  }));
  if (pinned && !state.ips.some((item) => item.address === pinned)) {
    state.ips.unshift({ name: 'config', address: pinned, primary: true });
  }
  state.primaryIp = primary;
  const port = state.httpPort;
  state.origin = port && port !== 80 ? 'http://' + primary + ':' + port : 'http://' + primary;
}

function pushEvent(event) {
  state.events.unshift(Object.assign({ t: Date.now() }, event));
  if (state.events.length > 80) state.events.length = 80;
}

function clientIp(address) {
  return String(address || '').replace(/^::ffff:/, '');
}

function isPlayStation(ua) {
  return /PlayStation|PS5/i.test(ua || '');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[ch]));
}

function renderHtml(fileName) {
  const raw = fs.readFileSync(path.join(pub, fileName), 'utf8');
  const portNote = state.httpPort && state.httpPort !== 80 ? ':' + state.httpPort : '';
  return raw
    .replaceAll('{{IP}}', escapeHtml(state.primaryIp || ''))
    .replaceAll('{{ORIGIN}}', escapeHtml((state.origin || '') + '/'))
    .replaceAll('{{HTTP_PORT}}', escapeHtml(state.httpPort || state.wantHttp))
    .replaceAll('{{DNS_PORT}}', escapeHtml(state.dnsPort || 'kapali'))
    .replaceAll('{{HIJACK}}', escapeHtml(HIJACK.join(', ') || '—'))
    .replaceAll('{{UPSTREAM}}', escapeHtml(state.upstream))
    .replaceAll('{{PORT_NOTE}}', escapeHtml(portNote));
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.wasm': 'application/wasm',
    '.bin': 'application/octet-stream',
    '.elf': 'application/octet-stream',
    '.jar': 'application/java-archive'
  };
  return types[ext] || 'application/octet-stream';
}

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function statusBody() {
  return JSON.stringify({
    startedAt: state.startedAt,
    httpPort: state.httpPort,
    dnsPort: state.dnsPort,
    dnsOk: state.dnsOk,
    httpOk: state.httpOk,
    primaryIp: state.primaryIp,
    ips: state.ips,
    hijack: state.hijack,
    upstream: state.upstream,
    origin: state.origin,
    events: state.events,
    httpHits: state.httpHits,
    dnsHits: state.dnsHits,
    psHits: state.psHits,
    dnsError: state.dnsError,
    httpError: state.httpError,
    hostname: os.hostname()
  });
}

function safePublicPath(urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
  const filePath = path.resolve(pub, rel);
  if (filePath !== pub && !filePath.startsWith(pub + path.sep)) return null;
  return filePath;
}

function statFile(filePath) {
  try {
    return fs.statSync(filePath);
  } catch (err) {
    return null;
  }
}

function resolveStaticTarget(pathname) {
  const direct = safePublicPath(pathname);
  if (!direct) return null;
  let st = statFile(direct);
  if (st && st.isDirectory()) {
    const indexPath = path.join(direct, 'index.html');
    st = statFile(indexPath);
    if (st && st.isFile()) return indexPath;
    return null;
  }
  if (st && st.isFile()) return direct;
  return null;
}

function isTemplateRoute(pathname) {
  return pathname === '/' || pathname === '/index.html' || pathname === '/panel';
}

function serveFile(res, filePath, method) {
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      send(res, 404, 'Yok', 'text/plain; charset=utf-8');
      return;
    }
    send(res, 200, method === 'HEAD' ? '' : buf, contentType(filePath));
  });
}

function serveStatic(res, pathname, method) {
  if (isTemplateRoute(pathname)) return false;
  const filePath = resolveStaticTarget(pathname);
  if (!filePath) return false;
  serveFile(res, filePath, method);
  return true;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = url.pathname;
  const ua = req.headers['user-agent'] || '';
  const ip = clientIp(req.socket.remoteAddress);
  const playstation = isPlayStation(ua);

  const quiet = pathname === '/api/status'
    || pathname === '/health'
    || pathname === '/favicon.ico'
    || pathname.startsWith('/assets/');
  if (!quiet) {
    state.httpHits += 1;
    if (playstation) state.psHits += 1;
    pushEvent({
      kind: 'http',
      ip,
      path: pathname,
      ua,
      playstation
    });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Yontem yok', 'text/plain; charset=utf-8');
    return;
  }

  if (pathname === '/api/status' || pathname === '/api/me') {
    const body = pathname === '/api/me'
      ? JSON.stringify({ ip, ua, playstation, path: pathname })
      : statusBody();
    send(res, 200, req.method === 'HEAD' ? '' : body, 'application/json; charset=utf-8');
    return;
  }

  if (pathname === '/health') {
    send(res, 200, 'ok', 'text/plain; charset=utf-8');
    return;
  }

  if (serveStatic(res, pathname, req.method)) {
    return;
  }

  if (pathname === '/panel' || pathname === '/panel.html') {
    send(res, 200, req.method === 'HEAD' ? '' : renderHtml('panel.html'), 'text/html; charset=utf-8');
    return;
  }

  if (pathname === '/index.html') {
    send(res, 200, req.method === 'HEAD' ? '' : renderHtml('index.html'), 'text/html; charset=utf-8');
    return;
  }

  if (pathname === '/document/gb/ps5/index.html' || pathname === '/document/en/ps5/index.html') {
    send(res, 200, req.method === 'HEAD' ? '' : renderHtml('index.html'), 'text/html; charset=utf-8');
    return;
  }

  send(res, 200, req.method === 'HEAD' ? '' : renderHtml('index.html'), 'text/html; charset=utf-8');
});

function readName(buf, offset) {
  const labels = [];
  let o = offset;
  let jumped = false;
  let end = offset;
  let guard = 0;
  while (o < buf.length && guard < 40) {
    guard += 1;
    const len = buf[o];
    if (len === 0) {
      if (!jumped) end = o + 1;
      break;
    }
    if ((len & 0xc0) === 0xc0) {
      if (o + 1 >= buf.length) break;
      if (!jumped) end = o + 2;
      jumped = true;
      o = ((len & 0x3f) << 8) | buf[o + 1];
      continue;
    }
    if (o + 1 + len > buf.length) break;
    labels.push(buf.slice(o + 1, o + 1 + len).toString('utf8'));
    o += len + 1;
    if (!jumped) end = o;
  }
  return { name: labels.join('.').toLowerCase(), end };
}

function hijacked(name) {
  return HIJACK.some((host) => name === host || name.endsWith('.' + host));
}

function responseFlags(msg) {
  const reqFlags = msg.readUInt16BE(2);
  return 0x8000 | 0x0400 | 0x0080 | (reqFlags & 0x0100);
}

function answerQuery(msg, ancount, extra) {
  const parsed = readName(msg, 12);
  const qEnd = parsed.end + 4;
  const header = Buffer.alloc(12);
  msg.copy(header, 0, 0, 2);
  header.writeUInt16BE(responseFlags(msg), 2);
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(ancount, 6);
  header.writeUInt16BE(0, 8);
  header.writeUInt16BE(0, 10);
  const parts = [header, msg.slice(12, qEnd)];
  if (extra) parts.push(extra);
  return Buffer.concat(parts);
}

function answerA(msg, ip) {
  const body = Buffer.alloc(16);
  body.writeUInt16BE(0xc00c, 0);
  body.writeUInt16BE(1, 2);
  body.writeUInt16BE(1, 4);
  body.writeUInt32BE(30, 6);
  body.writeUInt16BE(4, 10);
  String(ip).split('.').forEach((part, index) => {
    body.writeUInt8(Number(part), 12 + index);
  });
  return answerQuery(msg, 1, body);
}

function answerEmpty(msg) {
  return answerQuery(msg, 0);
}

function isPrivateIp(address) {
  const ip = clientIp(address);
  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
  const match = /^172\.(\d+)\./.exec(ip);
  if (!match) return false;
  const block = Number(match[1]);
  return block >= 16 && block <= 31;
}

function forwardQuery(msg, rinfo, socket) {
  const upstream = dgram.createSocket('udp4');
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    upstream.close();
  };
  const timer = setTimeout(finish, 2500);
  upstream.on('error', finish);
  upstream.on('message', (response) => {
    clearTimeout(timer);
    try {
      socket.send(response, rinfo.port, rinfo.address);
    } catch (err) {
      /* client gone */
    }
    finish();
  });
  upstream.send(msg, 53, state.upstream, (err) => {
    if (err) {
      clearTimeout(timer);
      finish();
    }
  });
}

function startDns() {
  const socket = dgram.createSocket('udp4');
  socket.on('error', (err) => {
    state.dnsOk = false;
    if (err.code === 'EACCES') {
      state.dnsError = 'Port ' + state.wantDns + ' icin yonetici izni gerekiyor. start.bat calistir.';
    } else if (err.code === 'EADDRINUSE') {
      state.dnsError = 'Port ' + state.wantDns + ' baska bir programda acik.';
    } else {
      state.dnsError = err.message;
    }
    printBanner();
  });
  socket.on('message', (msg, rinfo) => {
    if (!isPrivateIp(rinfo.address)) return;
    if (!msg || msg.length < 12) return;
    const qd = msg.readUInt16BE(4);
    if (qd < 1) {
      forwardQuery(msg, rinfo, socket);
      return;
    }
    const parsed = readName(msg, 12);
    const qEnd = parsed.end + 4;
    if (qEnd > msg.length) {
      forwardQuery(msg, rinfo, socket);
      return;
    }
    const qtype = msg.readUInt16BE(qEnd - 4);
    if (!hijacked(parsed.name)) {
      forwardQuery(msg, rinfo, socket);
      return;
    }
    state.dnsHits += 1;
    pushEvent({
      kind: 'dns',
      ip: clientIp(rinfo.address),
      name: parsed.name,
      qtype
    });
    const packet = qtype === 1 ? answerA(msg, state.primaryIp) : answerEmpty(msg);
    socket.send(packet, rinfo.port, rinfo.address);
  });
  socket.bind(state.wantDns, '0.0.0.0', () => {
    state.dnsOk = true;
    state.dnsPort = state.wantDns;
    state.dnsError = '';
    printBanner();
  });
}

let bannerTimer = null;
function printBanner() {
  if (!state.httpOk) return;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(printBannerNow, 200);
}

function printBannerNow() {
  const dnsLine = state.dnsOk
    ? 'DNS      ' + state.primaryIp + (state.dnsPort === 53 ? '' : ' (port ' + state.dnsPort + ', PS5 kullanamaz)')
    : 'DNS      kapali. ' + (state.dnsError || '');
  console.log('');
  console.log('ORBIT ayakta');
  console.log('  Site     ' + state.origin + '/');
  console.log('  Panel    ' + state.origin + '/panel');
  console.log('  ' + dnsLine);
  console.log('  Rehber   ' + (HIJACK.join(', ') || '—') + ' -> bu bilgisayar');
  console.log('');
  console.log('PS5: Ag ayarlarinda birincil DNS olarak ' + state.primaryIp + ' yaz.');
  console.log('Sonra tarayiciya ' + state.origin + '/ adresini gir');
  console.log('veya Ayarlar altindaki Kullanim Kilavuzu nu ac.');
  console.log('');
}

function startHttp(port, fallback) {
  server.once('error', (err) => {
    if (fallback && (err.code === 'EACCES' || err.code === 'EADDRINUSE')) {
      state.httpError = 'Port ' + port + ' acilamadi, 8080 denenecek.';
      startHttp(8080, false);
      return;
    }
    state.httpOk = false;
    state.httpError = err.message;
    console.error('HTTP acilamadi: ' + err.message);
  });
  server.listen(port, '0.0.0.0', () => {
    state.httpOk = true;
    state.httpPort = server.address().port;
    state.httpError = port === state.wantHttp ? '' : 'Port ' + state.wantHttp + ' dolu veya yasak. Su an ' + state.httpPort + ' kullaniliyor.';
    refreshIps();
    printBanner();
  });
}

refreshIps();
startHttp(state.wantHttp, !dev);
startDns();
