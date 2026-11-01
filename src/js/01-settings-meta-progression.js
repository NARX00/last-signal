// ================= settings & meta progression =================
const SET = Object.assign({ sound: true, glow: true, clarity: 'auto', music: true, cb: false, quality: 'auto', side: 'right', stick: 'float' }, load('last-signal-settings', {}));
if (!['auto', 'on', 'off'].includes(SET.clarity)) SET.clarity = 'auto';
const META = load('last-signal-meta', { frag: 0, ranks: {}, protoMax: 0, totalKills: 0, rootKills: 0, op: 'signal', proto: 0, xown: { blink: true }, load: ['blink', null] });
META.ranks = META.ranks || {}; META.xown = Object.assign({ blink: true }, META.xown || {}); if (!Array.isArray(META.load)) META.load = ['blink', null];
// Telegram: window.Telegram.WebApp exists only when telegram-web-app.js is loaded; initData is non-empty only inside Telegram
const TG = (() => { try { const w = window.Telegram && window.Telegram.WebApp; return w && w.initData ? w : null; } catch (_) { return null; } })();
const tgAt = v => { try { return TG && TG.isVersionAtLeast(v); } catch (_) { return false; } };
if (TG) {
  try { TG.ready(); TG.expand(); } catch (_) {}
  try { if (tgAt('7.7')) TG.disableVerticalSwipes(); } catch (_) {}   // dragging is the joystick: a downward drag must not close the game
  try { if (tgAt('6.1')) { TG.setHeaderColor('#030b12'); TG.setBackgroundColor('#030b12'); } } catch (_) {}
  document.documentElement.classList.add('tg');
}
let tgLast = '';
function tgTick() {
  // back button pauses / resumes / closes the editor; closing asks for confirmation while a run is live
  const live = !!G && ['play', 'pause', 'level', 'editor', 'discovery', 'sector', 'opcall', 'trade'].includes(state);
  const key = state + (live ? 1 : 0); if (key === tgLast) return; tgLast = key;
  try { if (tgAt('6.1')) { if (['play', 'pause', 'editor'].includes(state)) TG.BackButton.show(); else TG.BackButton.hide(); } } catch (_) {}
  try { if (tgAt('6.2')) { if (live) TG.enableClosingConfirmation(); else TG.disableClosingConfirmation(); } } catch (_) {}
}
function tgBack() { if (state === 'play') pauseGame(); else if (state === 'pause') resume(); else if (state === 'editor') closeEditor(); }
const tgHapT = {};
function haptic(kind, style, ms = 120) {
  if (!TG || SET.haptics === false || !tgAt('6.1')) return;
  const n = performance.now(); if (n - (tgHapT[kind + style] || 0) < ms) return; tgHapT[kind + style] = n;
  try { if (kind === 'impact') TG.HapticFeedback.impactOccurred(style); else TG.HapticFeedback.notificationOccurred(style); } catch (_) {}
}
// Telegram cloud storage keeps values up to 4096 characters, so the save is split into chunks
const TGC = { ok: !!TG && tgAt('6.9'), timer: 0 };
const tgGet = keys => new Promise(res => { try { TG.CloudStorage.getItems(keys, (err, v) => res(err ? null : v)); } catch (_) { res(null); } });
const tgSet = (k, v) => new Promise(res => { try { TG.CloudStorage.setItem(k, v, err => res(!err)); } catch (_) { res(false); } });
async function tgSyncLoad() {
  const head = await tgGet(['meta_n', 'meta_at']); if (!head) { NET.sync = false; syncLabel(); return; }
  const n = +head.meta_n || 0;
  if (n > 0) {
    const parts = await tgGet(Array.from({ length: n }, (_, i) => 'meta_' + i));
    try {
      const cm = JSON.parse(Array.from({ length: n }, (_, i) => parts['meta_' + i] || '').join(''));
      if (cm && typeof cm === 'object' && cm.ranks) {
        const merged = (+head.meta_at || 0) > (META.savedAt || 0) ? mergeMeta(META, cm) : mergeMeta(cm, META);
        for (const k of Object.keys(META)) delete META[k]; Object.assign(META, merged);
        save('last-signal-meta', META); applyStyle(); metaAch(); if (state === 'title') renderTitle();
      }
    } catch (_) {}
  }
  NET.sync = true; NET.tg = true; syncLabel(); tgPush();
}
function tgPush() {
  if (!NET.tg) return;
  clearTimeout(TGC.timer);
  TGC.timer = setTimeout(async () => {
    const txt = JSON.stringify(META), size = 4000, n = Math.ceil(txt.length / size);
    for (let i = 0; i < n; i++) await tgSet('meta_' + i, txt.slice(i * size, (i + 1) * size));
    await tgSet('meta_at', String(META.savedAt || 0)); await tgSet('meta_n', String(n));
  }, 2000);
}
// Export / import: move progress between the Claude and Telegram versions, or keep a backup
function exportCode() { const t = JSON.stringify(META); return 'LS1.' + btoa(unescape(encodeURIComponent(t))); }
function importCode(code) {
  try {
    code = String(code || '').trim(); if (!code.startsWith('LS1.')) return 'That is not a Last Signal progress code.';
    const imp = JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))));
    if (!imp || typeof imp !== 'object' || !imp.ranks || typeof imp.frag !== 'number') return 'That code is damaged or incomplete.';
    const m = mergeMeta(META, imp); m.frag = Math.max(META.frag || 0, imp.frag || 0);
    for (const k of Object.keys(META)) delete META[k]; Object.assign(META, m);
    saveMeta(); applyStyle(); metaAch(); renderTitle();
    return `Progress imported: ◆ ${META.frag}, ${META.totalKills.toLocaleString()} purged in total. Nothing you already had was lost.`;
  } catch (_) { return 'That code could not be read. Copy the whole code and try again.'; }
}
const saveMeta = () => { META.savedAt = Date.now(); save('last-signal-meta', META); if (typeof syncPush === 'function') syncPush(); if (typeof tgPush === 'function') tgPush(); };

