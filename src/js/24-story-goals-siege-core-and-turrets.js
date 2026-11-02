// ================= story goals, siege core and turrets =================
function updateGoal() {
  const C = G.CH;
  if (G.core) {
    const parts = 2 + Math.floor(G.kills / 15) - G.partsUsed;
    G.goalTxt = `Core ${Math.max(0, Math.ceil(G.core.hp))} / ${G.core.max} · Parts ${parts}` + (C && C.goal === 'core' ? ` · ${fmt(Math.max(0, C.need - G.t))} to hold` : '');
    if (G.core.hp <= 0) { G.goalTxt = ''; banner('Core lost', 'Signal lost', 'hot'); endRun(false); return; }
  }
  if (!C) return;
  const left = C.limit ? Math.max(0, C.limit - G.t) : 0;
  if (C.goal === 'survive') { G.goalTxt = `Survive ${fmt(Math.max(0, C.need - G.t))}`; if (G.t >= C.need) chapterWon(); }
  else if (C.goal === 'events') { G.goalTxt = `Objectives ${G.evtWins || 0} / ${C.need} · ${fmt(left)}`; if ((G.evtWins || 0) >= C.need) chapterWon(); else if (!left) endRun(false); }
  else if (C.goal === 'rescue') { G.goalTxt = `Sleepers saved ${G.rescued} / ${C.need} · ${fmt(left)}`; if (G.rescued >= C.need) chapterWon(); else if (!left) endRun(false); }
  else if (C.goal === 'core') { if (G.t >= C.need) chapterWon(); }
  else if (C.goal === 'root') { if (!G.goalTxt) G.goalTxt = 'Delete the Root Process'; }
}
function chapterWon() { if (state !== 'play') return; G.storyWon = true; G.won = true; banner(`Chapter ${G.chapter}`, 'Complete', 'gold'); sfx.win(); state = 'exiting'; G.exitAnim = 0; }
function placeTurret() {
  if (!G || !G.core || state !== 'play') return;
  const parts = 2 + Math.floor(G.kills / 15) - G.partsUsed;
  if (parts <= 0 || G.turrets.length >= 12) { banner('Turret', parts <= 0 ? 'No parts yet' : 'Turret limit'); return; }
  G.partsUsed++; G.turrets.push({ x: P.x, y: P.y, cd: 0 }); sfx.buy(); burst(P.x, P.y, 8, GREEN, 120);
}
function updateSiege(dt) {
  if (!G.core) return;
  // the core repairs itself slowly and fires a defensive pulse every 3 s
  const C = G.core; C.hp = Math.min(C.max, C.hp + 6 * dt); C.pulse -= dt;
  if (C.pulse <= 0) { C.pulse = 3; DSRC = 'turret'; rings.push({ x: C.x, y: C.y, r: 0, max: 130, w: 18, dmg: 20 * (1 + G.t * G.pace / 300), hit: new Set(), t: 0, col: '#c8ffe0', kb: 260 }); DSRC = 'other'; }
  for (const T of G.turrets) {
    T.cd -= dt; if (T.cd > 0) continue;
    const e = nearest(T.x, T.y, 380); if (!e) continue;
    T.cd = 0.45; const a = Math.atan2(e.y - T.y, e.x - T.x); T.a = a;
    shots.push({ x: T.x, y: T.y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, r: 5, dmg: 14 * (1 + G.t * G.pace / 240), pierce: 2, life: 1, ch: pick(), kind: 'bolt', hit: new Set(), src: 'turret' });
  }
}
function openExit(x, y, kind) {
  const a = Math.atan2(P.y - y, P.x - x), o = { x: x + Math.cos(a) * 140, y: y + Math.sin(a) * 140 }; pushOut(o, 80);
  G.exit = { x: o.x, y: o.y, kind, till: G.t + (kind === 'root' ? 30 : 20), hold: 0, need: kind === 'root' ? 1 : 2, g: Array.from({ length: 7 }, pick) };
  relay(RELAY.exit[kind], true); banner(kind === 'root' ? 'Exit open' : 'Exit open · optional', kind === 'root' ? 'Jack out' : 'Leave or stay', 'gold');
}
function updateExit(dt) {
  const X = G.exit; if (!X) return;
  const inside = (P.x - X.x) ** 2 + (P.y - X.y) ** 2 < 70 * 70;
  X.hold = inside ? X.hold + dt : Math.max(0, X.hold - dt * 2);
  G.exitTxt = `Exit ${X.kind === 'root' ? '' : '(optional) '}· ${Math.ceil(X.till - G.t)}s` + (inside ? ' · hold' : '');
  if (X.hold >= X.need) { G.exit = null; G.exitTxt = ''; jackOut(X.kind); return; }
  if (G.t >= X.till) {
    G.exit = null; G.exitTxt = '';
    if (X.kind === 'root') endRun(true); else relay(RELAY.exit.gone);
  }
}
// leaving the system: the world dissolves back into rain, then the summary
function jackOut(kind) {
  G.extracted = kind; state = 'exiting'; G.exitAnim = 0; sfx.win();
  META.exits = (META.exits || 0) + 1;
}
function checkAch(R) {
  META.ach = META.ach || {};
  const got = [];
  for (const a of ACH) { if (META.ach[a.id]) continue; let ok = false; try { ok = !!a.test(R); } catch (_) {} if (ok) { META.ach[a.id] = 1; META.frag += a.reward; got.push(a); } }
  if (got.length) saveMeta();
  return got;
}
function metaAch() { for (const a of checkAch(null)) toast(`Achievement: ${a.name} · +◆ ${a.reward}`); }
function toTitle() { RUN_DAILY = null; relayStop(); ['over', 'pause', 'hud', 'levelup', 'editor', 'sectorChoice', 'discoveryChoice'].forEach(id => $(id).hidden = true); $('title').hidden = false; state = 'title'; G = null; sfx.hum(false); renderTitle(); setTimeout(() => $('startBtn').focus({ preventScroll: true }), 30); }

$('continueBtn').addEventListener('click', resumeRun);
runLoad();
$('startBtn').addEventListener('click', () => { RUN_DAILY = null; if (META.mode === 'story') showChapter(); else startRun(); });
function showChapter() {
  const i = clamp((META.chapter || 1) - 1, 0, 4), C = CHAPTERS[i];
  $('storyEyebrow').textContent = `Story · chapter ${i + 1} of 5`; $('storyTitle').textContent = C.name; $('storyText').textContent = C.text;
  $('storyGoal').textContent = { survive: 'Goal: survive 2:00.', events: 'Goal: complete 3 objectives before 6:00.', rescue: 'Goal: rescue 3 sleepers before 8:00.', core: 'Goal: keep the core alive for 4:00. T or ▲ builds a turret.', root: 'Goal: delete the Root Process at 8:00.' }[C.goal] + ` First clear: +◆ ${150 * (i + 1)}.`;
  $('title').hidden = true; $('over').hidden = true; $('story').hidden = false;
  setTimeout(() => $('storyGo').focus({ preventScroll: true }), 30);
}
$('storyGo').addEventListener('click', () => { $('story').hidden = true; startRun(); });
$('storyBack').addEventListener('click', () => { $('story').hidden = true; toTitle(); });
$('dailyBtn').addEventListener('click', () => { RUN_DAILY = dailyPlan(); startRun(); });
$('againBtn').addEventListener('click', () => { if (RUN_DAILY) RUN_DAILY = dailyPlan(); if (!RUN_DAILY && META.mode === 'story') showChapter(); else startRun(); });
$('menuBtn').addEventListener('click', toTitle);
$('pauseBtn').addEventListener('click', pauseGame);
$('resumeBtn').addEventListener('click', resume);
$('statsRow').hidden = !(BUILD.data.telemetry && BUILD.data.telemetry.database_url) || !!window.claude;
const syncStats = () => { $('statsT').textContent = SET.stats === false ? 'Off' : 'On'; $('statsT').setAttribute('aria-pressed', SET.stats !== false); };
$('statsT').addEventListener('click', () => { SET.stats = SET.stats === false; save('last-signal-settings', SET); syncStats(); TELE.toggle(SET.stats !== false); });
syncStats();
$('exportBtn').addEventListener('click', async () => {
  const code = exportCode(); let ok = false;
  try { await navigator.clipboard.writeText(code); ok = true; } catch (_) {}
  if (!ok) { const ta = $('importCode'); ta.value = code; ta.focus(); ta.select(); try { ok = document.execCommand('copy'); } catch (_) {} }
  toast(ok ? 'Progress code copied.' : 'The code is in the box below. Select it and copy it.');
});
$('importBtn').addEventListener('click', () => { $('importNote').textContent = importCode($('importCode').value); });
$('hapticT').addEventListener('click', () => { SET.haptics = SET.haptics === false; save('last-signal-settings', SET); $('hapticT').textContent = SET.haptics === false ? 'Off' : 'On'; $('hapticT').setAttribute('aria-pressed', SET.haptics !== false); haptic('impact', 'medium', 0); });
$('hapticT').textContent = SET.haptics === false ? 'Off' : 'On'; $('hapticT').setAttribute('aria-pressed', SET.haptics !== false);
if (TG) { try { TG.BackButton.onClick(tgBack); } catch (_) {} }
$('editBtn').addEventListener('click', () => { if (state === 'pause') openEditor('pause'); });
$('edDone').addEventListener('click', closeEditor);
$('rerollBtn').addEventListener('click', reroll);
const TRAIN_BOSSES = ['auditor', 'boss', 'collector', 'mirror', 'phantom', 'root'];
document.querySelectorAll('[data-tr]').forEach(b => b.addEventListener('click', () => {
  if (!G || !G.training || state !== 'play') return;
  const k = b.dataset.tr;
  if (k === 'level') G.pending++;
  else if (k === 'evolve') { const id = Object.keys(P.W).find(w => !P.evo[w] && (P.Pv[EVO[w].need] || Object.keys(P.Pv).length < PSLOTS)); if (id) { P.W[id].lvl = WMAX; P.Pv[EVO[id].need] = Math.max(1, P.Pv[EVO[id].need] || 0); recalc(); openCache(false); renderSlots(); } }
  else if (k === 'crowd') { for (let i = 0; i < 40; i++) { const [x, y] = spawnPos(); spawn(pickType(), x, y); } }
  else if (k === 'elite') { const [x, y] = spawnPos(); spawn(['daemon', 'brute', 'lancer', 'watcher'][(Math.random() * 4) | 0], x, y, true); }
  else if (k === 'boss') { G.tb = ((G.tb ?? -1) + 1) % TRAIN_BOSSES.length; const [x, y] = spawnPos(120); spawn(TRAIN_BOSSES[G.tb], x, y); }
  else if (k === 'time') G.t += 60;
  else if (k === 'clear') { enemies.forEach(e => { if (!(e.ally > G.t)) e.dead = true; }); eshots.length = 0; G.boss = null; $('bossbar').hidden = true; G.marks = []; G.erings = []; G.pools = []; G.arena = null; }
  else if (k === 'end') endRun(false);
  b.blur();
}));
$('banishBtn').addEventListener('click', toggleBanish);
$('skipBtn').addEventListener('click', skipLevel);
$('quitBtn').addEventListener('click', () => { $('pause').hidden = true; state = 'play'; G.quit = true; endRun(false); });
function syncClarity() { const lab = { auto: 'Auto', on: 'On', off: 'Off' }[SET.clarity]; ['clarT', 'clarT2'].forEach(id => { $(id).textContent = 'Clarity: ' + lab; $(id).title = 'Fades your own effects, hides damage numbers and zooms out so enemies stay visible. Auto turns it on for phones.'; }); }
['clarT', 'clarT2'].forEach(id => $(id).addEventListener('click', () => { SET.clarity = { auto: 'on', on: 'off', off: 'auto' }[SET.clarity]; save('last-signal-settings', SET); computeView(); syncClarity(); }));
function syncToggles() { ['soundT', 'soundT2'].forEach(id => $(id).setAttribute('aria-pressed', SET.sound)); ['glowT', 'glowT2'].forEach(id => $(id).setAttribute('aria-pressed', SET.glow)); }
for(const id of ['masterVol','musicVol','effectsVol']) $(id).addEventListener('input',()=>{SET[id]=clamp(Number($(id).value),0,100);save('last-signal-settings',SET);sfx.mix();});
$('audioPreview').addEventListener('click',async()=>{await sfx.preview();$('audioStatus').textContent=sfx.status();});
$('musicPreview').addEventListener('click',async()=>{await sfx.previewMusic();$('audioStatus').textContent=sfx.status();});
$('resetMix').addEventListener('click',async()=>{SET.masterVol=80;SET.musicVol=65;SET.effectsVol=85;SET.sound=true;SET.music=true;setSave();syncToggles();await sfx.init();sfx.mix();await sfx.preview();$('audioStatus').textContent=sfx.status();});
$('restoreGraphics').addEventListener('click',()=>{SET.glow=true;SET.quality='high';SET.clarity='off';QL=0;computeView();syncClarity();syncToggles();setSave();toast('Full graphics restored: high quality, glow on, clarity off.');});
['soundT', 'soundT2'].forEach(id => $(id).addEventListener('click', () => { SET.sound = !SET.sound; save('last-signal-settings', SET); syncToggles(); sfx.init(); sfx.hum(state === 'play'); }));
['glowT', 'glowT2'].forEach(id => $(id).addEventListener('click', () => { SET.glow = !SET.glow; save('last-signal-settings', SET); syncToggles(); }));
syncToggles(); syncClarity();
function syncSettings() {
  for(const [id,def] of [['masterVol',80],['musicVol',65],['effectsVol',85]]) $(id).value=SET[id]??def;
  $('musicT').setAttribute('aria-pressed', SET.music);
  $('qualT').textContent = { auto: 'Auto', high: 'High', low: 'Low' }[SET.quality];
  $('cbT').setAttribute('aria-pressed', SET.cb); $('cbT').textContent = SET.cb ? 'On' : 'Off';
  $('sideT').textContent = SET.side === 'left' ? 'Left' : 'Right';
  $('stickT').textContent = SET.stick === 'fixed' ? 'Fixed' : 'Follow';
  document.documentElement.classList.toggle('cb', !!SET.cb);
  document.body.classList.toggle('lefty', SET.side === 'left');
}
const setSave = () => { save('last-signal-settings', SET); syncSettings(); };
$('musicT').addEventListener('click', () => { SET.music = !SET.music; setSave(); sfx.init(); sfx.hum(state === 'play'); });
$('qualT').addEventListener('click', () => { SET.quality = { auto: 'high', high: 'low', low: 'auto' }[SET.quality]; QL = SET.quality === 'low' ? 2 : SET.quality === 'high' ? 0 : coarse ? 1 : 0; setSave(); });
$('cbT').addEventListener('click', () => { SET.cb = !SET.cb; setSave(); });
$('sideT').addEventListener('click', () => { SET.side = SET.side === 'left' ? 'right' : 'left'; setSave(); });
const LANGS = [['en', 'English'], ['ru', 'Русский'], ['he', 'עברית']].filter(([k]) => k === 'en' || (BUILD.i18n && BUILD.i18n[k]));
$('langT').textContent = (LANGS.find(([k]) => k === LANG) || LANGS[0])[1];
$('langT').addEventListener('click', () => { const i = LANGS.findIndex(([k]) => k === LANG); SET.lang = LANGS[(i + 1) % LANGS.length][0]; save('last-signal-settings', SET); runSave(true); location.reload(); });
$('stickT').addEventListener('click', () => { SET.stick = SET.stick === 'fixed' ? 'float' : 'fixed'; setSave(); });
$('setBtn').addEventListener('click', () => { setTab('settings'); const p = document.querySelector('[data-panel="settings"]'); if (p) p.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
syncSettings();

