// ================= Firebase: one way to reach the database, signed in when an API key is set =================
// With "api_key" in data/telemetry.json, each device signs in anonymously (Firebase Authentication, plain REST)
// and every request carries its token, so the database rules can let a device write only its own entries.
// The player id is then the Firebase user id. Without a key, requests go out unsigned as before.
const FB = (() => {
  const cfg = BUILD.data.telemetry || {}, base = String(cfg.database_url || '').replace(/\/+$/, ''), key = cfg.api_key || '';
  const K = 'ls-fb-auth';
  let saved = null; try { saved = JSON.parse(localStorage.getItem(K) || 'null'); } catch (_) {}
  const A = { uid: saved && saved.uid || null, refresh: saved && saved.refresh || null, token: null, exp: 0 };
  let pending = null;
  const keep = () => { try { localStorage.setItem(K, JSON.stringify({ uid: A.uid, refresh: A.refresh })); } catch (_) {} };
  const post = (url, body, form) => fetch(url, { method: 'POST', headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' }, body }).then(r => r.ok ? r.json() : null).catch(() => null);
  async function signIn() {
    if (A.refresh) {
      const r = await post(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(key)}`, 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(A.refresh), true);
      if (r && r.id_token) { A.token = r.id_token; A.refresh = r.refresh_token || A.refresh; A.uid = r.user_id || A.uid; A.exp = Date.now() + (+r.expires_in || 3600) * 1000; keep(); return A.token; }
    }
    const r = await post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(key)}`, JSON.stringify({ returnSecureToken: true }));
    if (r && r.idToken) { A.token = r.idToken; A.refresh = r.refreshToken; A.uid = r.localId; A.exp = Date.now() + (+r.expiresIn || 3600) * 1000; keep(); return A.token; }
    return null;
  }
  // a valid token, signing in or refreshing when needed (one attempt at a time)
  const token = () => !key ? Promise.resolve(null) : A.token && Date.now() < A.exp - 120000 ? Promise.resolve(A.token) : (pending = pending || signIn().finally(() => { pending = null; }));
  const ready = key ? token() : Promise.resolve(null);
  return {
    base, signed: !!key, ready,
    uid: () => A.uid,
    // a request to <base>/<path>.json; resolves to the Response, or null when offline
    async fetch(method, path, body, query = '', keepalive = false) {
      if (!base) return null;
      let tok = null;
      if (key) tok = keepalive ? (A.token && Date.now() < A.exp ? A.token : null) : await token();
      if (key && !tok) return null;
      const q = (query ? query + '&' : '?') + (tok ? 'auth=' + encodeURIComponent(tok) : '');
      return fetch(`${base}/${path}.json${q.replace(/[?&]$/, '')}`, { method, keepalive, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null);
    }
  };
})();

// ================= telemetry: anonymous play stats for the monitoring page =================
// Off until data/telemetry.json has a Firebase Realtime Database URL, and never inside the Claude artifact.
// Sends only a random device id, the game version and play numbers: no names, no Telegram account details.
// Uses the database's plain REST API, so there is no SDK to load and nothing holds a connection open.
const TELE = (() => {
  const cfg = BUILD.data.telemetry || {}, base = String(cfg.database_url || '').replace(/\/+$/, '');
  const on = () => !!base && !window.claude && SET.stats !== false;
  const day = () => new Date().toISOString().slice(0, 10);   // UTC day
  let id = null;
  try { id = localStorage.getItem('ls-device-id'); } catch (_) {}
  if (!id) { id = 'd' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); try { localStorage.setItem('ls-device-id', id); } catch (_) {} }
  if (FB.signed && FB.uid()) id = FB.uid();
  // when signed in, the player id is the Firebase user id (the rules only let a device write under its own id)
  const ready = FB.ready.then(() => { if (FB.uid()) id = FB.uid(); });
  const req = (method, path, body, keepalive, force) => {
    if (!base || (!force && !on())) return Promise.resolve(null);
    return FB.fetch(method, typeof path === 'function' ? path() : path, body, '', !!keepalive);
  };
  const inc = (k, n = 1) => req('PATCH', `stats/${day()}`, { [k]: { '.sv': { increment: n } } });
  let beatT = 0, errorsSent = 0;
  function beat() {
    if (!on() || document.hidden) return;
    const playing = typeof state !== 'undefined' && ['play', 'pause', 'level', 'editor', 'discovery', 'sector', 'opcall', 'trade', 'intro'].includes(state);
    ready.then(() => req('PUT', `presence/${id}`, { t: { '.sv': 'timestamp' }, s: playing ? 'play' : 'menu', m: typeof G !== 'undefined' && G ? G.mode : null, v: BUILD.version, tg: !!TG }));
  }
  function leave() { if (on()) req('DELETE', `presence/${id}`, undefined, true); }
  function start() {
    if (!on()) return;
    inc('opens'); ready.then(() => req('PUT', `stats/${day()}/devices/${id}`, true)); if (TG) inc('telegram');
    beat(); clearInterval(beatT); beatT = setInterval(beat, Math.max(15, cfg.heartbeat_seconds || 30) * 1000);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) leave(); else beat(); });
  addEventListener('pagehide', leave);
  // what was going on when it broke: Telegram or not, which screen, how far into a run
  const ctxNote = () => { let c = TG ? 'tg' : 'web'; try { c += ' · ' + state; if (G && (state === 'play' || state === 'pause' || state === 'level')) c += ' ' + Math.floor(G.t / 60) + ':' + String(Math.floor(G.t % 60)).padStart(2, '0'); } catch (_) {} return c; };
  const report = (m, where) => {
    if (!on() || errorsSent >= 3) return; errorsSent++;
    inc('errors');
    m = `${m}${where ? ' ' + where : ''} [${ctxNote()}]`.slice(0, 250);
    req('POST', `errors/${day()}`, { m, u: FB.signed ? FB.uid() || undefined : undefined, v: BUILD.version, t: { '.sv': 'timestamp' }, ua: /iPhone|iPad/.test(navigator.userAgent) ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'desktop' });
  };
  addEventListener('error', e => {
    const m = String((e && e.message) || 'error').slice(0, 160);
    // browsers hide errors from scripts on other sites (here: Telegram's telegram-web-app.js) as "Script error."
    if (!e || !e.lineno) return report(m, '(outside script: Telegram SDK or browser)');
    const frame = e.error && e.error.stack ? String(e.error.stack).split('\n').find(l => /:\d+:\d+/.test(l)) : '';
    const fn = frame ? (frame.trim().match(/^at (\S+) \(/) || frame.trim().match(/^(\w+)@/) || [])[1] : '';
    report(m, `@${e.lineno}:${e.colno}${fn ? ' in ' + fn : ''}`);
  });
  addEventListener('unhandledrejection', e => { const r = e && e.reason; report('Promise: ' + String((r && r.message) || r || 'rejected').slice(0, 140), ''); });
  return {
    get id() { return id; },
    ready,
    start,
    run() { inc('runs'); beat(); },
    end(won, secs) { inc('finished'); if (won) inc('wins'); if (secs > 0) inc('secs', Math.min(1200, Math.round(secs))); beat(); },
    toggle(v) { if (!v) { clearInterval(beatT); req('DELETE', `presence/${id}`, undefined, true, true); } else start(); }
  };
})();
