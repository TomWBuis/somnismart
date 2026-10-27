/* SomniSmart share helper: encodes quiz answers in the URL so a shared link reopens the same results. */
(function () {
  'use strict';
  var SITE = 'https://somnismart.com/';
  function enc(s) { return encodeURIComponent(s); }

  function buttons(url, text, subject) {
    var b = 'inline-flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-lg border border-slate-300 bg-white hover:border-indigo-500 hover:text-indigo-600';
    var h = '<button type="button" data-share="copy" class="' + b + '">Copy link</button>';
    if (navigator.share) h += '<button type="button" data-share="native" class="' + b + '">Share…</button>';
    h += '<a class="' + b + '" target="_blank" rel="noopener" href="https://x.com/intent/post?text=' + enc(text) + '&url=' + enc(url) + '">Post on X</a>';
    h += '<a class="' + b + '" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + enc(url) + '">Facebook</a>';
    h += '<a class="' + b + '" href="mailto:?subject=' + enc(subject) + '&body=' + enc(text + '\n\n' + url) + '">Email</a>';
    return h;
  }

  function wire(box, url, text, subject) {
    var c = box.querySelector('[data-share="copy"]');
    if (c) c.addEventListener('click', function () {
      var done = function () { c.textContent = 'Link copied ✓'; setTimeout(function () { c.textContent = 'Copy link'; }, 2000); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, function () { fallback(url); done(); });
      else { fallback(url); done(); }
    });
    var n = box.querySelector('[data-share="native"]');
    if (n) n.addEventListener('click', function () { navigator.share({ title: subject, text: text, url: url }).catch(function () {}); });
  }

  function fallback(url) {
    var t = document.createElement('textarea'); t.value = url; t.setAttribute('readonly', '');
    t.style.position = 'absolute'; t.style.left = '-9999px'; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(t);
  }

  function serialize(form) {
    var p = new URLSearchParams(), lists = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name && !el.id) return;
      if (/^(submit|button|reset|file|password)$/.test(el.type) || el.tagName === 'BUTTON') return;
      if (el.type === 'radio') { if (el.checked) p.set(el.name, el.value); return; }
      if (el.type === 'checkbox') {
        if (el.name) { lists[el.name] = lists[el.name] || []; if (el.checked) lists[el.name].push(el.value); }
        else if (el.checked) p.set(el.id, '1');
        return;
      }
      var k = el.id || el.name;
      if (el.value !== '') p.set(k, el.value);
    });
    Object.keys(lists).forEach(function (k) { if (lists[k].length) p.set(k, lists[k].join(',')); });
    return p;
  }

  function restore(form, p) {
    var touched = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.type === 'radio') { if (p.has(el.name)) { el.checked = p.get(el.name) === el.value; touched.push(el); } return; }
      if (el.type === 'checkbox') {
        if (el.name) el.checked = p.has(el.name) && p.get(el.name).split(',').indexOf(el.value) > -1;
        else if (el.id) el.checked = p.get(el.id) === '1';
        touched.push(el); return;
      }
      var k = el.id || el.name;
      if (k && p.has(k)) {
        if (el.tagName === 'SELECT' && !Array.prototype.some.call(el.options, function (o) { return o.value === p.get(k); })) return;
        el.value = p.get(k); touched.push(el);
      }
    });
    touched.forEach(function (el) { el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('input', { bubbles: true })); });
  }

  /* Quiz pages: cfg = { form, results, page, subject, text: function () { return 'My ideal …'; } } */
  function init(cfg) {
    var form = document.getElementById(cfg.form);
    if (!form) return;
    form.addEventListener('submit', function () {
      setTimeout(function () {
        var res = document.getElementById(cfg.results || 'results');
        if (!res || res.classList.contains('hidden')) return;
        var qs = serialize(form).toString();
        var url = SITE + cfg.page + (qs ? '?' + qs : '');
        try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) {}
        var text = '';
        try { text = cfg.text() || ''; } catch (e) {}
        if (!text) text = cfg.subject;
        var box = document.getElementById('shareResults');
        if (!box) { box = document.createElement('div'); box.id = 'shareResults'; res.appendChild(box); }
        box.className = 'mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5';
        box.innerHTML = '<h4 class="font-semibold mb-1">Share my results</h4>' +
          '<p class="text-xs text-slate-500 mb-3">The link reopens these exact results. It contains your quiz answers (such as weight or pain points), so share it only with people you are comfortable with.</p>' +
          '<div class="flex flex-wrap gap-2">' + buttons(url, text, cfg.subject) + '</div>';
        wire(box, url, text, cfg.subject);
      }, 0);
    });
    var p = new URLSearchParams(location.search);
    if (Array.from(p.keys()).length) {
      restore(form, p);
      setTimeout(function () {
        if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }, 50);
    }
  }

  /* Article pages: share this page. el = container id */
  function page(cfg) {
    var box = document.getElementById(cfg.el);
    if (!box) return;
    var url = SITE + cfg.page;
    box.innerHTML = '<p class="font-semibold mb-2">Share this guide</p><div class="flex flex-wrap gap-2">' + buttons(url, cfg.text, cfg.subject) + '</div>';
    wire(box, url, cfg.text, cfg.subject);
  }

  window.SomniShare = { init: init, page: page };
})();
