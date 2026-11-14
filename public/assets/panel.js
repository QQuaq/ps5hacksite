(function () {
  var ipEl = document.getElementById('ip');
  var copyBtn = document.getElementById('copy');
  var banner = document.getElementById('banner');
  var ipsEl = document.getElementById('ips');
  var upstreamEl = document.getElementById('upstream');
  var originText = document.getElementById('origin-text');
  var openSite = document.getElementById('open-site');
  var hostName = document.getElementById('host-name');
  var stHttp = document.getElementById('st-http');
  var stDns = document.getElementById('st-dns');
  var stPs = document.getElementById('st-ps');
  var stHijack = document.getElementById('st-hijack');
  var logList = document.getElementById('log-list');
  var logHint = document.getElementById('log-hint');

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function ago(ts) {
    var s = Math.round((Date.now() - ts) / 1000);
    if (s < 5) return 'şimdi';
    if (s < 60) return s + ' sn';
    var m = Math.round(s / 60);
    if (m < 60) return m + ' dk';
    return Math.round(m / 60) + ' sa';
  }

  function paint(data) {
    var origin = (data.origin || '') + '/';
    ipEl.textContent = data.primaryIp || '—';
    upstreamEl.textContent = data.upstream || '1.1.1.1';
    originText.textContent = origin;
    openSite.setAttribute('href', origin || '/');
    hostName.textContent = data.hostname || 'yerel ağ';
    stHttp.textContent = data.httpOk ? 'açık · ' + data.httpPort : 'kapalı';
    stDns.textContent = data.dnsOk ? 'açık · ' + data.dnsPort : 'kapalı';
    stPs.textContent = String(data.psHits || 0);
    stHijack.textContent = (data.hijack || []).join(', ') || '—';

    var notes = [];
    if (!data.dnsOk) notes.push(data.dnsError || 'DNS kapalı. start.bat dosyasını yönetici olarak çalıştır.');
    if (data.httpError) notes.push(data.httpError);
    if ((data.dnsOk && data.dnsPort !== 53) || (data.httpPort && data.httpPort !== 80)) {
      notes.push('Bu pencere önizleme. PS5 için start.bat dosyasını yönetici olarak çalıştır; DNS 53, site 80 portunda açılır.');
    }
    banner.textContent = notes.join(' ');
    banner.className = notes.length ? 'fine warn' : 'fine';

    var others = (data.ips || []).filter(function (item) { return !item.primary; });
    ipsEl.innerHTML = others.map(function (item) {
      return '<li>' + esc(item.name) + ' · ' + esc(item.address) + '</li>';
    }).join('');

    var events = data.events || [];
    if (!events.length) {
      logList.innerHTML = '<p class="empty">Henüz istek yok. PS5 DNS’i yazıp siteyi açınca burada görünür.</p>';
      logHint.textContent = 'PS5 bu ağa sorunca satır burada belirir.';
      return;
    }
    var lastPs = null;
    events.forEach(function (event) {
      if (event.playstation && !lastPs) lastPs = event;
    });
    logHint.textContent = lastPs
      ? 'Son PS5 isteği ' + ago(lastPs.t) + ' önce.'
      : 'İstek var, henüz PlayStation tarayıcısı değil.';
    logList.innerHTML = events.slice(0, 12).map(function (event) {
      var ps = event.playstation ? ' ps' : '';
      var kind = event.kind === 'dns' ? 'DNS' : 'HTTP';
      var what = event.kind === 'dns'
        ? esc(event.name || '')
        : esc(event.path || '/');
      var who = event.playstation ? 'PlayStation' : (event.kind === 'dns' ? 'DNS sorgusu' : 'Bilgisayar');
      return '<article class="hit' + ps + '"><span class="kind">' + kind + '</span><span class="who">' +
        esc(who) + '</span><span class="what">' + what +
        '<span class="ua">' + esc(event.ip || '') + ' · ' + esc(ago(event.t)) + '</span></span></article>';
    }).join('');
  }

  function paintStatic() {
    var vars = window.ORBIT_HOST && window.ORBIT_HOST.readVars
      ? window.ORBIT_HOST.readVars()
      : { IP: '—', ORIGIN: location.origin + '/', UPSTREAM: '1.1.1.1', hijack: ['manuals.playstation.net'] };
    paint({
      primaryIp: vars.IP,
      origin: vars.ORIGIN.replace(/\/$/, ''),
      upstream: vars.UPSTREAM,
      hijack: [vars.HIJACK || 'manuals.playstation.net'],
      httpOk: false,
      dnsOk: false,
      httpPort: vars.HTTP_PORT,
      dnsPort: 0,
      psHits: 0,
      events: [],
      hostname: 'GitHub Pages',
      httpError: '',
      dnsError: ''
    });
    banner.textContent = 'Statik site (github.io). DNS, port 53/80 ve canlı günlük için bilgisayarda start.bat çalıştır. DNS IP: ?dns=192.168.x.x veya panelden kopyala.';
    banner.className = 'fine warn';
    stHttp.textContent = 'statik';
    stDns.textContent = 'statik';
    logHint.textContent = 'Yerel sunucu yok.';
  }

  function poll() {
    if (window.ORBIT_HOST && window.ORBIT_HOST.isStatic && window.ORBIT_HOST.isStatic()) {
      paintStatic();
      return;
    }
    fetch('api/status', { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(paint)
      .catch(function () {
        paintStatic();
      });
  }

function legacyCopy(text) {
  return new Promise(function (resolve, reject) {
    var input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(input);
    if (ok) resolve();
    else reject();
  });
}

copyBtn.addEventListener('click', function () {
  var text = ipEl.textContent || '';
  if (text === '—') {
    banner.textContent = 'Yerel IP yok. ?dns=192.168.x.x ekle veya start.bat ile yerel paneli aç.';
    banner.className = 'fine warn';
    return;
  }
  try { localStorage.setItem('orbit_dns', text); } catch (e) { /* ignore */ }
  var write = navigator.clipboard && navigator.clipboard.writeText
    ? navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); })
    : legacyCopy(text);
  write.then(function () {
    copyBtn.textContent = 'Kopyalandı';
    setTimeout(function () { copyBtn.textContent = 'Adresi kopyala'; }, 1400);
  }).catch(function () {
    copyBtn.textContent = 'Kopyalanamadı';
    setTimeout(function () { copyBtn.textContent = 'Adresi kopyala'; }, 1400);
  });
});

  poll();
  setInterval(poll, 2000);
})();
