// ================= leaderboard =================
const NET = { db: null, uid: null, user: null, board: [], myScore: 0 };
let localBest = load('last-signal-best', { score: 0, secs: 0, kills: 0, proto: 0 });
function renderLocal() { $('localBest').textContent = localBest.secs ? `Your best on this device: ${fmt(localBest.secs)} on Protocol ${localBest.proto || 0}, ${localBest.kills} purged.` : ''; }
renderLocal();
// ---- shared board on the Firebase database (GitHub Pages and Telegram; the Claude artifact keeps its own) ----
const FBB = { base: String((BUILD.data.telemetry || {}).database_url || '').replace(/\/+$/, ''), timer: 0 };
FBB.on = () => !!FBB.base && !window.claude;
const fbReq = (method, path, body, query = '') => FB.fetch(method, path, body, query).then(r => r && r.ok ? r.json() : null).catch(() => null);
const topQ = n => `?orderBy=${encodeURIComponent('"score"')}&limitToLast=${n}`;
const fbRows = o => Object.entries(o || {}).map(([id, v]) => Object.assign({ id }, v)).filter(r => typeof r.score === 'number').sort((a, b) => b.score - a.score);
const cleanName = s => String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
function lbName() {
  const own = cleanName(SET.lbName); if (own) return own;
  return 'Player ' + TELE.id.slice(-4).toUpperCase();
}
async function fbLoad() {
  const [all, day, mine] = await Promise.all([fbReq('GET', 'scores', undefined, topQ(10)), fbReq('GET', `daily/${dayKey()}`, undefined, topQ(5)), fbReq('GET', `scores/${NET.uid}`)]);
  NET.board = fbRows(all); renderBoard();
  NET.daily = fbRows(day); renderDailyBoard();
  NET.myScore = mine && typeof mine.score === 'number' ? mine.score : 0;
  // signed in under a new id (first time after sign-in was switched on): bring this device's best run across
  if (FB.signed && !mine && localBest.score > 0 && SET.lbShow !== false && !FBB.moved) { FBB.moved = true; fbSubmit(localBest.score, localBest.secs, localBest.kills, undefined, false, localBest.proto || 0, ''); }
}
async function fbSubmit(score, secs, kills, level, won, proto, prog) {
  if (SET.lbShow === false) return { note: 'Saved. You chose not to appear on the leaderboard (Settings).' };
  if (score <= NET.myScore) { const i = NET.board.findIndex(r => r.id === NET.uid); return { rank: i >= 0 ? i + 1 : 0, note: 'Your leaderboard best still stands.' }; }
  const ok = await fbReq('PUT', `scores/${NET.uid}`, { name: lbName(), score, secs, kills, level, won: !!won, proto, prog: prog === undefined ? progText(true) : prog || undefined, at: { '.sv': 'timestamp' } });
  if (!ok) return { note: "Saved on this device. The leaderboard couldn't be reached right now." };
  await fbLoad();
  const i = NET.board.findIndex(r => r.id === NET.uid);
  return { rank: i >= 0 ? i + 1 : 0, note: i >= 0 ? `Posted to the leaderboard as ${lbName()}.` : 'Posted. Not in the top 10 yet.' };
}
async function fbSubmitDaily(key, score, secs, kills, won) {
  if (SET.lbShow === false) return 'Daily result saved. You chose not to appear on the leaderboard (Settings).';
  const cur = await fbReq('GET', `daily/${key}/${NET.uid}`);
  if (cur && cur.score >= score) return 'Your best today still stands on the daily board.';
  const ok = await fbReq('PUT', `daily/${key}/${NET.uid}`, { name: lbName(), score, secs, kills, won: !!won, at: { '.sv': 'timestamp' } });
  if (!ok) return "Daily result saved on this device. The daily board couldn't be reached right now.";
  await fbLoad(); return `Posted to today's daily board as ${lbName()}.`;
}
async function fbRename() {   // keep the posted name in step with the setting
  if (!NET.fb || SET.lbShow === false) return;
  if (NET.myScore) await fbReq('PATCH', `scores/${NET.uid}`, { name: lbName() });
  const d = await fbReq('GET', `daily/${dayKey()}/${NET.uid}`); if (d) await fbReq('PATCH', `daily/${dayKey()}/${NET.uid}`, { name: lbName() });
  fbLoad();
}
async function fbHide() {
  if (!NET.fb) return;
  await Promise.all([fbReq('DELETE', `scores/${NET.uid}`), fbReq('DELETE', `daily/${dayKey()}/${NET.uid}`)]);
  NET.myScore = 0; fbLoad();
}
async function initBoard() {
  const [db, u] = await Promise.all([use('db'), use('user')]);
  const uid = u ? await u.id().catch(() => null) : null;
  if (!db || !uid) {
    NET.sync = false; syncLabel(); $('board').hidden = true;
    if (TGC.ok) tgSyncLoad();
    if (FBB.on()) {
      await TELE.ready; NET.fb = true; NET.uid = TELE.id; $('board').hidden = false; $('lbNameIn').value = lbName();
      $('boardEmpty').textContent = 'No runs on the board yet. Survive as long as you can and yours will be the first.';
      fbLoad(); clearInterval(FBB.timer); FBB.timer = setInterval(() => { if (state === 'title' || state === 'over') fbLoad(); }, 60000);
      return;
    }
    $('boardEmpty').textContent = TG ? 'The shared leaderboard isn\'t available here yet. Your best run is kept on this device.' : 'The shared leaderboard appears when you open this page signed in to Claude. Your best run is still kept on this device.';
    return;
  }
  Object.assign(NET, { db, uid, user: u });
  syncLoad();
  const today = dayKey();
  db.collection('daily').where('date', '==', today).orderBy('score', 'desc').limit(5).onSnapshot(snap => { NET.daily = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderDailyBoard(); }, () => {});
  try { const mine = await db.doc('scores/' + uid).get(); if (mine.exists) NET.myScore = +mine.data().score || 0; } catch (_) {}
  db.collection('scores').orderBy('score', 'desc').limit(10).onSnapshot(snap => {
    NET.board = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => typeof r.score === 'number');
    renderBoard();
  }, () => {});
}
async function renderBoard() {
  const list = $('board'); $('boardEmpty').hidden = NET.board.length > 0;
  const ids = NET.board.map(r => r.id), ps = NET.user && ids.length ? await NET.user.profiles(ids) : {};
  list.textContent = '';
  NET.board.forEach((r, i) => {
    const li = document.createElement('li'); if (r.id === NET.uid) li.className = 'me';
    const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = i + 1;
    const img = document.createElement('img'); img.alt = ''; if (ps[r.id] && ps[r.id].avatarUrl) img.src = ps[r.id].avatarUrl; else img.style.visibility = 'hidden';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = ((ps[r.id] && ps[r.id].name) || cleanName(r.name) || 'Someone') + (r.id === NET.uid ? ' (you)' : '');
    const pr = document.createElement('span'); pr.className = 'pr' + ((r.proto || 0) >= 3 ? ' hot' : ''); pr.textContent = 'P' + (r.proto || 0);
    const tm = document.createElement('span'); tm.className = 'tm' + (r.won ? ' won' : ''); tm.textContent = fmt(r.secs || 0);
    const kl = document.createElement('span'); kl.className = 'kl'; kl.textContent = (r.kills || 0) + ' ✕';
    li.append(rk, img, nm, pr, tm, kl);
    if (typeof r.prog === 'string' && r.prog) { const pg = document.createElement('code'); pg.className = 'pg'; pg.textContent = r.prog.slice(0, 160); pg.title = r.prog.slice(0, 160); li.appendChild(pg); }
    list.appendChild(li);
  });
}
async function renderDailyBoard() {
  const list = $('dailyBoard'), rows = NET.daily || []; list.textContent = '';
  const ps = NET.user && rows.length ? await NET.user.profiles(rows.map(r => r.id)) : {};
  rows.forEach((r, i) => {
    const li = document.createElement('li'); if (r.id === NET.uid) li.className = 'me';
    const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = i + 1;
    const img = document.createElement('img'); img.alt = ''; if (ps[r.id] && ps[r.id].avatarUrl) img.src = ps[r.id].avatarUrl; else img.style.visibility = 'hidden';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = ((ps[r.id] && ps[r.id].name) || cleanName(r.name) || 'Someone') + (r.id === NET.uid ? ' (you)' : '');
    const pr = document.createElement('span'); pr.className = 'pr'; pr.textContent = 'D';
    const tm = document.createElement('span'); tm.className = 'tm' + (r.won ? ' won' : ''); tm.textContent = fmt(r.secs || 0);
    const kl = document.createElement('span'); kl.className = 'kl'; kl.textContent = (r.kills || 0) + ' ✕';
    li.append(rk, img, nm, pr, tm, kl);
    if (typeof r.prog === 'string' && r.prog) { const pg = document.createElement('code'); pg.className = 'pg'; pg.textContent = r.prog.slice(0, 160); pg.title = r.prog.slice(0, 160); li.appendChild(pg); }
    list.appendChild(li);
  });
}
async function submitDaily(score, secs, kills, won) {
  const key = G.daily.key; META.dailyBest = META.dailyBest || {};
  const prev = META.dailyBest[key];
  if (!prev || score > prev.score) { META.dailyBest[key] = { score, secs, kills }; for (const k of Object.keys(META.dailyBest).sort().slice(0, -14)) delete META.dailyBest[k]; saveMeta(); }
  if (NET.fb) return fbSubmitDaily(key, score, secs, kills, won);
  if (!NET.db || !NET.uid) return TG ? 'Daily result saved. The daily board arrives in a later update.' : 'Daily result saved on this device. The daily board needs you signed in.';
  try {
    const ref = NET.db.doc('daily/' + NET.uid), cur = await ref.get();
    const c = cur.exists ? cur.data() : null;
    if (c && c.date === key && c.score >= score) return 'Your best today still stands on the daily board.';
    await ref.set({ date: key, score, secs, kills, won: !!won, at: new Date().toISOString() });
    return 'Posted to today\'s daily board.';
  } catch (_) { return "Your daily run couldn't be posted. You may only have view access to this page."; }
}
// Progress follows your Claude account: newest save wins, but nothing earned is ever lost in a merge
let syncTimer = 0;
function mergeMeta(a, b) { // b is the newer save
  if (!b.savedAt && a.savedAt) [a, b] = [b, a];   // a device that never saved anything doesn't count as newer
  const m = Object.assign({}, a, b);
  if (!a.savedAt || !b.savedAt) m.frag = Math.max(a.frag || 0, b.frag || 0);
  m.ranks = Object.assign({}, a.ranks); for (const k in b.ranks || {}) m.ranks[k] = Math.max(m.ranks[k] || 0, b.ranks[k]);
  for (const f of ['xown', 'skins', 'ach', 'seen', 'bossSeen', 'evoSeen']) m[f] = Object.assign({}, a[f], b[f]);
  for (const f of ['totalKills', 'rootKills', 'bossKills', 'protoMax']) m[f] = Math.max(a[f] || 0, b[f] || 0);
  m.dailyDates = [...new Set([...(a.dailyDates || []), ...(b.dailyDates || [])])].slice(-60);
  m.dailyBest = Object.assign({}, a.dailyBest); for (const k in b.dailyBest || {}) if (!m.dailyBest[k] || b.dailyBest[k].score > m.dailyBest[k].score) m.dailyBest[k] = b.dailyBest[k];
  return m;
}
async function syncLoad() {
  try {
    const snap = await NET.db.doc(`data/users/${NET.uid}/save`).get();
    if (snap.exists) {
      const c = snap.data(), cm = JSON.parse(c.meta || '{}');
      const merged = (c.at || 0) > (META.savedAt || 0) ? mergeMeta(META, cm) : mergeMeta(cm, META);
      for (const k of Object.keys(META)) delete META[k]; Object.assign(META, merged);
      save('last-signal-meta', META); applyStyle(); metaAch(); if (state === 'title') renderTitle();
    }
    NET.sync = true; syncPush(); syncLabel();
  } catch (_) { NET.sync = false; syncLabel(); }
}
function syncPush() {
  if (!NET.db || !NET.uid || !NET.sync) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { NET.db.doc(`data/users/${NET.uid}/save`).set({ meta: JSON.stringify(META), at: META.savedAt || 0 }).then(syncLabel, () => {}); }, 1500);
}
function syncLabel() { const el = $('syncNote'); if (el) el.textContent = NET.tg ? 'On. Fragments, Kernel upgrades and unlocks are saved to your Telegram account and follow you to every device.' : NET.sync ? 'On. Fragments, Kernel upgrades and unlocks follow your Claude account to every device.' : TG ? 'Connecting to Telegram cloud storage…' : 'Off. Progress is kept on this device only. Open the game signed in to Claude to sync it.'; }
// A private record of each run, kept in your own save so the game can be tuned from real play
function logRun(won, frag) {
  if (G.training) return;
  const rnd = v => Math.round(v);
  const how = G.quit ? 'quit' : G.extracted ? 'exit:' + G.extracted : won ? 'won' : 'died';
  const rec = {
    v: 'rewrite-6', at: new Date().toISOString(), mode: G.mode, proto: G.proto, op: G.op, gate: G.gate, chapter: G.chapter || 0,
    secs: rnd(G.t), how, won: !!won, root: !!G.rootDeleted, level: G.level, kills: G.kills, frag, bosses: G.bossKills, elites: G.elites,
    killedBy: how === 'died' ? (G.hitBy || 'unknown') : null, hitsBy: G.hitTally || {}, failovers: G.failovers || 0, threatPeak: +G.threatPeak.toFixed(2),
    weapons: Object.fromEntries(Object.entries(P.W).map(([k, w]) => [k, w.lvl + (P.evo[k] ? '*' : '')])), systems: Object.assign({}, P.Pv), powers: G.pw.map(p => p.id),
    code: Object.entries(P.code).flatMap(([w, ls]) => ls.map(L => ({ w, t: L.t, k: L.k || null, f: L.f, r: L.r + 1, fired: L.fired, dmg: rnd(L.dmg), heal: rnd(L.heal), marks: L.marks }))),
    unused: [...Object.keys(G.inv.t), ...Object.keys(G.inv.f), ...Object.keys(G.inv.k)], rewrites: G.rewrites || 0,
    dmg: Object.fromEntries(Object.entries(G.dmg).map(([k, v]) => [k, rnd(v)])), samples: G.samples || [],
    spec: G.specialization || null, quests: G.questsDone || 0, mutation: G.mutation || null, route: G.routeHistory || [], relics: Object.keys(G.relics || {}), hunt: G.hunt ? G.hunt.completed : 0, overloads: G.hunt ? G.hunt.overloadWins : 0, rival: G.rival ? (G.rival.won ? 'won:' + (G.rival.reward || '') : 'stage' + G.rival.stage) : null, contract: G.contract ? (G.contractSettled ? 'sealed' : 'failed') : null, choices: G.choiceN || 0
  };
  try { const L = JSON.parse(localStorage.getItem('ls-rewrite-runs') || '[]'); L.push(rec); localStorage.setItem('ls-rewrite-runs', JSON.stringify(L.slice(-30))); } catch (_) {}
  if (NET.db && NET.uid) NET.db.doc(`data/users/${NET.uid}/run-${Date.now()}`).set(rec).catch(() => {});
}
async function submitScore(score, secs, kills, level, won, proto) {
  if (NET.fb) return fbSubmit(score, secs, kills, level, won, proto);
  if (!NET.db || !NET.uid) return { note: TG ? 'Saved. The shared leaderboard arrives in a later update.' : 'Saved on this device. The shared leaderboard needs you signed in.' };
  if (score <= NET.myScore) { const i = NET.board.findIndex(r => r.id === NET.uid); return { rank: i >= 0 ? i + 1 : 0, note: 'Your leaderboard best still stands.' }; }
  try {
    await NET.db.doc('scores/' + NET.uid).set({ score, secs, kills, level, won: !!won, proto, prog: progText(true), at: new Date().toISOString() });
    NET.myScore = score;
    await new Promise(r => setTimeout(r, 400));
    const i = NET.board.findIndex(r => r.id === NET.uid);
    return { rank: i >= 0 ? i + 1 : 0, note: i >= 0 ? 'Posted to the leaderboard.' : 'Saved. Not in the top 10 yet.' };
  } catch (_) { return { note: "Your run couldn't be posted. You may only have view access to this page." }; }
}
// leaderboard settings (Firebase board only)
$('lbNameRow').hidden = $('lbShowRow').hidden = !FBB.on();
$('lbNameIn').value = lbName();
$('lbNameIn').addEventListener('change', () => { const n = cleanName($('lbNameIn').value); SET.lbName = n; save('last-signal-settings', SET); $('lbNameIn').value = lbName(); $('lbNameNote').textContent = 'Saved.'; setTimeout(() => $('lbNameNote').textContent = '', 1800); fbRename(); });
$('lbNameIn').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('lbNameIn').blur(); });
const syncLbShow = () => { $('lbShowT').textContent = SET.lbShow === false ? 'Off' : 'On'; $('lbShowT').setAttribute('aria-pressed', SET.lbShow !== false); };
$('lbShowT').addEventListener('click', () => { SET.lbShow = SET.lbShow === false; save('last-signal-settings', SET); syncLbShow(); if (SET.lbShow === false) fbHide(); else fbLoad(); });
syncLbShow();
initBoard();

