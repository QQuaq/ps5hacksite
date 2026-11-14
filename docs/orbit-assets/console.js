(function () {
  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function tick() {
    var el = document.getElementById('clock');
    if (!el) return;
    var d = new Date();
    el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function mark() {
    var id = (location.hash || '#giris').replace('#', '');
    if (!id) id = 'giris';
    var links = document.querySelectorAll('.nav a');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') === '#' + id) links[i].className = 'on';
      else links[i].className = '';
    }
  }

  function guessFw(ua) {
    if (!ua) return 'Bilinmiyor';
    var m = /PlayStation[^;]*\/\s*([0-9.]+)/i.exec(ua);
    if (m) return m[1];
    if (/PlayStation|PS5/i.test(ua)) return 'PS5';
    if (/Windows|Macintosh|Linux/i.test(ua)) return 'Bilgisayar';
    return 'Bilinmiyor';
  }

  function shortUa(ua) {
    if (!ua) return '—';
    if (/PlayStation/i.test(ua)) return 'PlayStation tarayıcısı';
    if (/Chrome/i.test(ua)) return 'Chrome';
    return ua.slice(0, 48) + (ua.length > 48 ? '…' : '');
  }

  function boot() {
    var ua = navigator.userAgent || '';
    var fw = document.getElementById('fw');
    var uaShort = document.getElementById('ua-short');
    var ping = document.getElementById('ping');
    var link = document.getElementById('link-state');
    if (fw) fw.textContent = guessFw(ua);
    if (uaShort) uaShort.textContent = shortUa(ua);
    if (/PlayStation|PS5/i.test(ua) && link) link.textContent = 'PS5 bağlı';

    fetch('api/me', { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!ping) return;
        ping.textContent = data.playstation
          ? 'Konsol isteği doğrulandı · ' + (data.ip || '')
          : 'Sunucu yanıt veriyor · ' + (data.ip || 'yerel');
      })
      .catch(function () {
        if (ping) ping.textContent = 'Sunucu bağlantısı alınamadı';
      });
  }

  tick();
  setInterval(tick, 10000);
  window.addEventListener('hashchange', mark);
  mark();
  boot();
})();