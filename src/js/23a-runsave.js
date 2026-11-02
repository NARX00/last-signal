// ================= run save: resume an unfinished run =================
// The run is saved every few seconds and whenever the app is hidden (closing Telegram, switching apps), on this device
// and, in Telegram, in the player's cloud storage. The title screen then offers to resume it. A resumed run keeps the
// whole build, time, level, code, quests and route; the field starts clear and any boss that was alive comes back.
const RUNSAVE = { key: 'ls-run-v1', V: 1, data: null, lastLocal: 0, lastCloud: 0 };
// live objects that only make sense on the screen they were on: they're rebuilt, not saved
const RUN_DROP = new Set(['boss', 'marks', 'erings', 'pools', 'cpools', 'mines', 'slashes', 'clones', 'trail', 'tblocks', 'decoy', 'arena', 'bulwark', 'exit', 'evt', 'rescue', 'trader', 'anoms', 'CH', 'discovery', 'sectorBoss']);
const RUN_LIVE = ['play', 'pause', 'level', 'editor', 'discovery', 'sector', 'opcall', 'trade'];
const runReviver = (k, v) => v && typeof v === 'object' && Array.isArray(v.__set) ? new Set(v.__set) : v;
function runSnapshot() {
  const enemyLike = v => v && typeof v === 'object' && typeof v.hp === 'number' && typeof v.type === 'string' && EDEF[v.type];
  const rep = (k, v) => v instanceof Set ? { __set: [...v] } : enemyLike(v) ? undefined : v;
  const g = {};
  for (const k of Object.keys(G)) if (!RUN_DROP.has(k)) g[k] = G[k];
  if (g.hunt) g.hunt = Object.assign({}, g.hunt, { node: null, overloaded: false, ambushAt: 0, n: 0 });
  if (g.rival) g.rival = Object.assign({}, g.rival, { active: null, warned: false });
  // a choice that was open on screen goes back in its queue
  if (state === 'level') g.pending = (G.pending || 0) + 1;
  if (state === 'discovery' && G.discovery) g.discoveryQueue = [G.discovery, ...(G.discoveryQueue || [])];
  if (state === 'sector' && G.sectorBoss) g.sectorQueue = [G.sectorBoss, ...(G.sectorQueue || [])];
  const bosses = enemies.filter(e => !e.dead && isB(e) && !(e.ally > G.t)).map(e => e.type);
  return JSON.stringify({ V: RUNSAVE.V, at: Date.now(), ver: BUILD.version, G: g, P, bosses }, rep);
}
function runSave(force) {
  if (!G || G.training || G.ending || !RUN_LIVE.includes(state)) return;
  const now = Date.now();
  if (!force && now - RUNSAVE.lastLocal < 5000) return;
  let txt; try { txt = runSnapshot(); } catch (_) { return; }
  RUNSAVE.lastLocal = now;
  try { localStorage.setItem(RUNSAVE.key, txt); } catch (_) {}
  if (TGC.ok && (force || now - RUNSAVE.lastCloud > 30000)) {
    RUNSAVE.lastCloud = now;
    const n = Math.ceil(txt.length / 4000);
    (async () => { for (let i = 0; i < n; i++) await tgSet('run_' + i, txt.slice(i * 4000, (i + 1) * 4000)); await tgSet('run_at', String(now)); await tgSet('run_n', String(n)); })();
  }
}
function runClear() {
  RUNSAVE.data = null;
  try { localStorage.removeItem(RUNSAVE.key); } catch (_) {}
  if (TGC.ok) tgSet('run_n', '0');
  renderContinue();
}
async function runLoad() {
  let best = null;
  try { const t = localStorage.getItem(RUNSAVE.key); if (t) best = JSON.parse(t, runReviver); } catch (_) {}
  if (TGC.ok) {
    const head = await tgGet(['run_n', 'run_at']);
    const n = head ? +head.run_n || 0 : 0;
    if (n > 0 && (!best || +head.run_at > best.at)) {
      const parts = await tgGet(Array.from({ length: n }, (_, i) => 'run_' + i));
      try { const c = JSON.parse(Array.from({ length: n }, (_, i) => (parts && parts['run_' + i]) || '').join(''), runReviver); if (c && c.G) best = c; } catch (_) {}
    }
  }
  // a run from an older save format, or more than a week old, isn't offered
  RUNSAVE.data = best && best.V === RUNSAVE.V && best.G && best.P && Date.now() - best.at < 7 * 864e5 ? best : null;
  renderContinue();
}
function runLabel(S) {
  const m = S.G.daily ? 'Daily' : ({ full: 'Full', short: 'Short', siege: 'Siege', story: 'Story ' + (S.G.chapter || '') })[S.G.mode] || S.G.mode;
  return `${m} · ${fmt(S.G.t)} · level ${S.G.level}`;
}
function renderContinue() {
  const b = $('continueBtn'); if (!b) return;
  const S = RUNSAVE.data, show = !!S && state === 'title';
  b.hidden = !show;
  if (show) { b.textContent = ''; b.append('Resume run'); const s = document.createElement('small'); s.textContent = runLabel(S); b.append(s); }
  $('startBtn').classList.toggle('primary', !show);
  const note = $('continueNote'), bar = $('startBtn').parentElement;
  if (note.previousElementSibling !== bar) bar.after(note);
  note.hidden = !show;
}
function resumeRun() {
  const S = RUNSAVE.data; if (!S) return;
  const keep = { mode: META.mode, op: META.op, proto: META.proto, chapter: META.chapter };
  RUN_DAILY = S.G.daily || null;
  if (!RUN_DAILY) { META.mode = S.G.mode; META.op = S.G.op; META.proto = S.G.proto; if (S.G.chapter) META.chapter = S.G.chapter; }
  sfx.init(); sfx.hum(true);
  newRun();
  Object.assign(META, keep);
  for (const k in S.G) G[k] = S.G[k];
  for (const k in S.P) P[k] = S.P[k];
  G.boss = null; G.allies = 0; G.resumed = (G.resumed || 0) + 1;
  for (const type of S.bosses || []) {
    if (type === 'root') { G.rootSpawned = false; G.rootWarned = true; }
    else G.bosses.unshift({ t: 0, type, warned: true });
  }
  recalc(); P.hp = clamp(P.hp, 1, STAT.maxHp); P.inv = 3; cam.x = P.x; cam.y = P.y;
  ['title', 'over', 'pause', 'levelup', 'story'].forEach(id => $(id).hidden = true);
  $('hud').hidden = false; $('bossbar').hidden = true; $('hurtfx').style.opacity = '0';
  $('timer').classList.toggle('ot', !!G.overtime);
  renderSlots(); renderPowers(); updateHud(true);
  beginPlay();
  setTimeout(() => { if (G && state === 'play') banner('Run restored', fmt(G.t) + ' · level ' + G.level, 'gold'); }, 400);
  RUNSAVE.data = null; renderContinue();
  runSave(true);
}
setInterval(() => runSave(false), 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) runSave(true); });
addEventListener('pagehide', () => runSave(true));
