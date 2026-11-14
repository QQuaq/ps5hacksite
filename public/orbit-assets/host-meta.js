(function () {
  var DEFAULT_UPSTREAM = '1.1.1.1';
  var DEFAULT_HIJACK = 'manuals.playstation.net';

  function pageOrigin() {
    var p = location.pathname.replace(/[^/]+$/, '');
    if (p && !p.endsWith('/')) p += '/';
    return location.origin + (p || '/');
  }

  function readVars() {
    var params = new URLSearchParams(location.search);
    var saved = '';
    try { saved = localStorage.getItem('orbit_dns') || ''; } catch (e) { saved = ''; }
    var ip = params.get('dns') || saved || '';
    var port = location.port;
    var portNote = port && port !== '80' && port !== '443' ? ':' + port : '';
    return {
      IP: ip || '—',
      ORIGIN: pageOrigin(),
      HTTP_PORT: port || (location.protocol === 'https:' ? '443' : '80'),
      DNS_PORT: 'statik',
      HIJACK: DEFAULT_HIJACK,
      UPSTREAM: DEFAULT_UPSTREAM,
      PORT_NOTE: portNote
    };
  }

  function replaceTokens(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    var v = readVars();
    while ((node = walker.nextNode())) {
      var text = node.nodeValue;
      if (!text || text.indexOf('{{') === -1) continue;
      Object.keys(v).forEach(function (key) {
        text = text.split('{{' + key + '}}').join(v[key]);
      });
      node.nodeValue = text;
    }
    var links = root.querySelectorAll('[href*="{{"], [src*="{{"]');
    for (var i = 0; i < links.length; i++) {
      var el = links[i];
      ['href', 'src'].forEach(function (attr) {
        var val = el.getAttribute(attr);
        if (!val || val.indexOf('{{') === -1) return;
        Object.keys(v).forEach(function (key) {
          val = val.split('{{' + key + '}}').join(v[key]);
        });
        el.setAttribute(attr, val);
      });
    }
  }

  function isGitHubPages() {
    return /\.github\.io$/i.test(location.hostname);
  }

  window.ORBIT_HOST = {
    isStatic: isGitHubPages,
    readVars: readVars,
    pageOrigin: pageOrigin
  };

  if (document.body && document.body.innerHTML.indexOf('{{IP}}') !== -1) {
    replaceTokens(document.body);
  }

  if (isGitHubPages()) {
    document.documentElement.classList.add('static-host');
  }
})();