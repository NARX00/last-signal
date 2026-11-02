// ================= language =================
// English is written in the code and data. For another language, tools/build.py embeds i18n/<lang>/:
// data texts are swapped in here, before the tables are read, and everything shown on screen
// (page text, messages, canvas labels) goes through tr(), using exact texts, patterns with values,
// then known phrases inside longer texts. Code-line syntax like on_kill → split() stays as it is.
const LANG = (() => {
  let pref = null;
  try { pref = (JSON.parse(localStorage.getItem('last-signal-settings') || '{}') || {}).lang || null; } catch (_) {}
  if (!pref) { try { const u = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user; if (u && u.language_code) pref = u.language_code; } catch (_) {} }
  if (!pref) pref = navigator.language || 'en';
  pref = String(pref).slice(0, 2).toLowerCase();
  return BUILD.i18n && BUILD.i18n[pref] ? pref : 'en';
})();
document.documentElement.lang = LANG;
if (LANG !== 'en') {
  const merge = (dst, t) => {
    for (const k in t) {
      const v = t[k];
      if (v && typeof v === 'object' && 'en' in v) { if (v[LANG] && dst[k] === v.en) dst[k] = v[LANG]; }
      else if (v && typeof v === 'object' && dst && typeof dst[k] === 'object') merge(dst[k], v);
    }
  };
  for (const f in BUILD.i18n[LANG].data) if (BUILD.data[f]) merge(BUILD.data[f], BUILD.i18n[LANG].data[f]);
}
const tr = (() => {
  if (LANG === 'en') return s => s;
  const UI = BUILD.i18n[LANG].ui, norm = s => s.replace(/\s+/g, ' ').trim();
  const TXT = new Map(Object.entries(UI.text || {}).filter(([, v]) => v));
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const PAT = Object.entries(UI.patterns || {}).filter(([, v]) => v).map(([k, v]) => { k = norm(k); v = v.trim();
    // {0} is any text; {#0} only a number (for short patterns like "Level {#0}")
    const order = [], src = k.replace(/\{(#?)(\d+)\}|[^{]+|\{/g, (m, num, n) => { if (n !== undefined) { order.push(+n); return num ? '([-+−]?[\\d.,:/]+[kKmM%]?)' : '([\\s\\S]+?)'; } return esc(m); });
    // which values may hold several sentences: only one that ends the pattern ("… {2}.")
    return { re: new RegExp('^' + src + '$'), order, out: v, fixed: k.replace(/\{#?\d+\}/g, '').length, tail: /\{#?\d+\}\.?$/.test(k) };
  }).sort((a, b) => b.fixed - a.fixed);
  const FRAG = Object.entries(UI.fragments || {}).filter(([, v]) => v).sort((a, b) => b[0].length - a[0].length);
  const plural = (n, f) => { n = Math.abs(parseInt(String(n).replace(/[^\d-]/g, ''), 10) || 0); const [one, few, many] = f; return n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many; };
  const cache = new Map();
  function core(t) {
    const hit = TXT.get(t); if (hit) return hit;
    for (const p of PAT) {
      const m = p.re.exec(t); if (!m) continue;
      // a value in the middle of a pattern never spans a sentence break: that's two messages glued together
      if (m.slice(1, p.tail ? -1 : undefined).some(c => /\. /.test(c))) continue;
      const vals = []; p.order.forEach((n, i) => { vals[n] = m[i + 1]; });
      return p.out.replace(/\{(\d+)(?:\|([^}]*))?\}/g, (_, n, forms) => forms ? plural(vals[n], forms.split('|')) : (vals[n] === undefined ? '' : core(vals[n].trim()) === vals[n].trim() ? vals[n] : vals[n].replace(vals[n].trim(), core(vals[n].trim()))));
    }
    // a sentence that starts a longer message: "Saved on this device. The leaderboard …" stays one entry
    const seps = [...t.matchAll(/(\.|:)? (?=\S)| · | — /g)].filter(m => m[0] !== ' ');
    for (let i = seps.length - 1; i >= 0; i--) {
      const m = seps[i], cut = m.index + (m[1] ? 1 : 0), a = t.slice(0, cut), rest = t.slice(m.index + m[0].length);
      const hit = TXT.get(a); if (hit && rest) return hit + m[0].slice(m[1] ? 1 : 0) + core(rest);
    }
    // a symbol in front: "★ Partner of …", "➤ Signal"
    const sym = /^([^\p{L}\p{N}\s(+−-]+ )([\s\S]+)$/u.exec(t); if (sym) { const s = core(sym[2]); if (s !== sym[2]) return sym[1] + s; }
    // "Leave a pool" where the list has "leave a pool"
    if (/^[A-Z][a-z]/.test(t)) { const lo = t[0].toLowerCase() + t.slice(1), s = core(lo); if (s !== lo) return s[0].toUpperCase() + s.slice(1); }
    // the same text with or without its final full stop
    if (/[.:]$/.test(t)) { const s = core(t.slice(0, -1)); if (s !== t.slice(0, -1)) return s + t.slice(-1); }
    else if (!t.endsWith('.')) { const s = TXT.get(t + '.'); if (s) return s.replace(/\.$/, ''); }
    // known pieces inside a longer text
    let r = t; for (const [a, b] of FRAG) if (r.includes(a)) r = r.split(a).join(b);
    // still English: translate both sides of the first break ("Next run: …", "Name · Optional: …")
    if (/[A-Za-z]{2}/.test(r)) {
      const m = /: |\. |; | · | — |★ /.exec(r);
      if (m) { const a = r.slice(0, m.index), b = r.slice(m.index + m[0].length); return (a ? core(a) : '') + m[0] + (b ? core(b) : ''); }
    }
    return r;
  }
  return s => {
    if (typeof s !== 'string' || !/[A-Za-z]{2}/.test(s)) return s;
    const c = cache.get(s); if (c !== undefined) return c;
    const t = norm(s), lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0];
    const r = t ? lead + core(t) + tail : s;
    if (cache.size > 4000) cache.clear(); cache.set(s, r); return r;
  };
})();
if (LANG !== 'en') {
  // canvas labels
  const ft = ctx.fillText.bind(ctx); ctx.fillText = (t, x, y, w) => w === undefined ? ft(tr(t), x, y) : ft(tr(t), x, y, w);
  // page text: whole paragraphs first (they keep their inline tags), then single texts and a few attributes
  const HTML = new Map(Object.entries(BUILD.i18n[LANG].ui.html || {}).filter(([, v]) => v));
  const SKIP = el => el.closest && el.closest('script,style,canvas,[data-noi18n]');
  const ATTRS = ['title', 'aria-label', 'placeholder'];
  const doEl = el => {
    if (!(el.closest && el.closest('[data-noi18n]'))) for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const r = tr(v); if (r !== v) el.setAttribute(a, r); } }
    if (SKIP(el)) return;
    const h = HTML.get(el.innerHTML.replace(/\s+/g, ' ').trim()); if (h) { el.innerHTML = h; return; }
    for (const k of el.childNodes) k.nodeType === 1 ? doEl(k) : k.nodeType === 3 && doText(k);
  };
  const doText = n => { if (n.parentElement && (SKIP(n.parentElement) || n.parentElement.closest('textarea'))) return; const v = n.nodeValue, r = tr(v); if (r !== v) n.nodeValue = r; };
  doEl(document.body);
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') { const v = m.target.getAttribute(m.attributeName); if (v && !m.target.closest('[data-noi18n]')) { const r = tr(v); if (r !== v) m.target.setAttribute(m.attributeName, r); } }
      else for (const n of m.addedNodes) n.nodeType === 1 ? doEl(n) : n.nodeType === 3 && doText(n);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
