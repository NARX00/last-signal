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
  const req = (method, path, body, keepalive, force) => {
    if (!base || (!force && !on())) return Promise.resolve(null);
    return fetch(`${base}/${path}.json`, { method, keepalive: !!keepalive, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(() => null);
  };
  const inc = (k, n = 1) => req('PATCH', `stats/${day()}`, { [k]: { '.sv': { increment: n } } });
  let beatT = 0, errorsSent = 0;
  function beat() {
    if (!on() || document.hidden) return;
    const playing = typeof state !== 'undefined' && ['play', 'pause', 'level', 'editor', 'discovery', 'sector', 'opcall', 'trade', 'intro'].includes(state);
    req('PUT', `presence/${id}`, { t: { '.sv': 'timestamp' }, s: playing ? 'play' : 'menu', m: typeof G !== 'undefined' && G ? G.mode : null, v: BUILD.version, tg: !!TG });
  }
  function leave() { if (on()) req('DELETE', `presence/${id}`, undefined, true); }
  function start() {
    if (!on()) return;
    inc('opens'); req('PUT', `stats/${day()}/devices/${id}`, true); if (TG) inc('telegram');
    beat(); clearInterval(beatT); beatT = setInterval(beat, Math.max(15, cfg.heartbeat_seconds || 30) * 1000);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) leave(); else beat(); });
  addEventListener('pagehide', leave);
  addEventListener('error', e => {
    if (!on() || errorsSent >= 3) return; errorsSent++;
    inc('errors');
    const m = String((e && e.message) || 'error').slice(0, 200), where = e && e.lineno ? ` @${e.lineno}:${e.colno}` : '';
    req('POST', `errors/${day()}`, { m: m + where, v: BUILD.version, t: { '.sv': 'timestamp' }, ua: /iPhone|iPad/.test(navigator.userAgent) ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'desktop' });
  });
  return {
    id,
    start,
    run() { inc('runs'); beat(); },
    end(won, secs) { inc('finished'); if (won) inc('wins'); if (secs > 0) inc('secs', Math.min(1200, Math.round(secs))); beat(); },
    toggle(v) { if (!v) { clearInterval(beatT); req('DELETE', `presence/${id}`, undefined, true, true); } else start(); }
  };
})();
