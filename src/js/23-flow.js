// ================= flow =================
// Jacking in: the camera falls through the code rain into one glyph, which flashes open into the arena
function renderIntro() {
  const p = clamp(G.introT / 2.1, 0, 1), k = 1 + Math.pow(p, 3) * 26;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#000802'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(Math.min(k, 4), Math.min(k, 4)); ctx.translate(-W / 2, -H / 2);
  ctx.globalAlpha = 1 - Math.max(0, p - 0.5) * 2; drawRain(0.05, 0); ctx.restore();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sz = 30 * k; ctx.font = `${sz}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = Math.min(1, p * 3); ctx.fillStyle = '#c8ffe0'; ctx.shadowColor = GREEN; ctx.shadowBlur = 24; ctx.fillText(G.introCh, W / 2, H / 2); ctx.shadowBlur = 0;
  if (p > 0.82) { ctx.globalAlpha = (p - 0.82) / 0.18; ctx.fillStyle = '#e8fff0'; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = Math.max(0, 1 - p * 2); ctx.font = `12px ${FONT}`; ctx.fillStyle = GREEN; ctx.fillText('JACKING IN' + '.'.repeat(1 + Math.floor(G.introT * 4) % 3), W / 2, H - 70); ctx.fillText('tap to skip', W / 2, H - 50);
  ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
}
function renderExitFx() {
  const p = clamp(G.exitAnim / 1.7, 0, 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = Math.min(1, p * 1.4); ctx.fillStyle = '#000802'; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1; drawRain(0.6, 0);
  const sx = W / 2, sy = H / 2;
  ctx.font = `16px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
  for (let k = 0; k < 24; k++) { const a = k / 24 * TAU + p * 2, r = 20 + p * 220; ctx.globalAlpha = 1 - p; ctx.fillText(pick(), sx + Math.cos(a) * r, sy + Math.sin(a) * r - p * 120); }
  if (p > 0.75) { ctx.globalAlpha = (p - 0.75) * 4 * 0.9; ctx.fillStyle = '#e8fff0'; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = 0.9 * (1 - Math.abs(p - 0.5) * 2); ctx.font = `13px ${FONT}`; ctx.fillStyle = GREEN; ctx.fillText('JACKING OUT', sx, H - 70);
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}
function beginPlay() {
  if (G && !G.training && !G.resumed) TELE.run();
  state = 'play'; $('hud').hidden = false; last = performance.now();
  banner(G.daily ? `Daily · ${G.daily.mods.map(m => DAILY_MODS[m].split(':')[0]).join(' · ')}` : `Protocol ${G.proto} · ${OPS[G.op].name}`, 'Hold the signal');
  relayStop(); setTimeout(() => { if (state === 'play') relay(pickL(RELAY.start)); }, 1200);
}
function skipIntro() { if (state === 'intro') beginPlay(); }
function startRun() {
  runClear();
  sfx.init(); sfx.hum(true);
  newRun();
  ['title', 'over', 'pause', 'levelup'].forEach(id => $(id).hidden = true);
  $('hud').hidden = false; $('bossbar').hidden = true; $('hurtfx').style.opacity = '0'; $('timer').classList.remove('ot');
  ['opcall', 'trade'].forEach(id => $(id).hidden = true);
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  G.introCh = '0';
  if (reduced) beginPlay(); else { state = 'intro'; $('hud').hidden = true; last = performance.now(); }
}
function pauseGame() {
  if (state !== 'play') return;
  state = 'pause'; sfx.hum(false); runSave(true); $('pauseTime').textContent = fmt(G.t); renderSlots($('pauseBuild'));
  { // live stats, compared with a fresh run, so every upgrade's effect is visible
    const pc = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + '%';
    const rows = [['Integrity', `${Math.ceil(P.hp)} / ${STAT.maxHp}`], ['Shield', STAT.shieldMax ? String(STAT.shieldMax) : '–'], ['Damage', pc(STAT.dmg - 1)], ['Speed', `${Math.round(STAT.speed)} (${pc(STAT.speed / 165 - 1)})`],
      ['Fire rate', pc(1 / STAT.cd - 1)], ['Area', pc(STAT.area - 1)], ['Pickup range', `${Math.round(STAT.magnet)} px`], ['Double damage', Math.round(STAT.crit * 100) + '%'],
      ['Repair', STAT.regen ? STAT.regen.toFixed(1) + '/s' : '–'], ['Armor', STAT.armor ? String(STAT.armor) : '–'], ['Backtrace', STAT.thorns ? String(STAT.thorns) : '–'], ['Echo', STAT.echo ? Math.round(STAT.echo * 100) + '%' : '–'],
      ['Duration', pc(STAT.dur - 1)], ['Data gain', pc(STAT.xp - 1)]];
    const el = $('pauseStats'); el.textContent = '';
    for (const [k, v] of rows) { const d = document.createElement('div'); const a = document.createElement('span'); a.textContent = k; const b = document.createElement('b'); b.textContent = v; d.append(a, b); el.appendChild(d); }
  }
  renderProgram($('pauseCode'));
  renderRouteStatus();
  const ready = Object.keys(EVO).filter(evoReady).map(id => EVO[id].name);
  const want = Object.keys(P.W).filter(id => !P.evo[id]).map(id => `${WDEF[id].name} → ${EVO[id].name} (max it, own ${PDEF[EVO[id].need].name})`);
  $('pauseHint').textContent = ready.length ? `Ready to evolve: ${ready.join(', ')}. Open a Cache from an elite or the Enforcer.` : want.length ? 'Evolutions: ' + want.join(' · ') : '';
  $('pause').hidden = false;
  setTimeout(() => $('resumeBtn').focus({ preventScroll: true }), 30);
}
function renderProgram(el, end) {
  el.textContent = '';
  const ids = Object.keys(P.W), n = ids.reduce((a, id) => a + (P.code[id] || []).length, 0);
  if (end && !n) return;
  const h = document.createElement('div'); h.className = 'h' + (end ? ' hrow' : ''); h.textContent = `${end ? 'Your program' : 'Program'} · ${n} lines · ${fmtN(G.codeFires)} calls`; el.appendChild(h);
  for (const id of ids) {
    const lines = P.code[id] || []; if (end && !lines.length) continue;
    const c = document.createElement('code');
    const wn = document.createElement('span'); wn.className = 'wn'; wn.textContent = wslug(id); c.appendChild(wn);
    c.appendChild(document.createTextNode(` {  // ${lines.length}/${lineCap(id)}\n`));
    if (!lines.length) c.appendChild(document.createTextNode('  // empty\n'));
    for (const L of lines) {
      c.appendChild(document.createTextNode(`  ${lineTxt(L)}`));
      if (L.r) { const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = `  // rank ${L.r + 1}`; c.appendChild(rk); }
      const st = document.createElement('span'); st.className = 'st'; st.textContent = '  // ' + lineStat(L); c.appendChild(st);
      c.appendChild(document.createTextNode('\n'));
    }
    c.appendChild(document.createTextNode('}'));
    el.appendChild(c);
  }
  if (end) { const b = document.createElement('button'); b.type = 'button'; b.className = 'linkish'; b.textContent = 'Copy program'; b.addEventListener('click', copyProgram); h.appendChild(b); }
  if (!end && (invN('t') || invN('f') || invN('k'))) { const iv = document.createElement('div'); iv.className = 'inv'; iv.textContent = 'Unused: ' + [...Object.entries(G.inv.t).map(([k, v]) => trigTxt(k, 0) + (v > 1 ? ' ×' + v : '')), ...Object.entries(G.inv.f).map(([k, v]) => FX[k].fn + '()' + (v > 1 ? ' ×' + v : '')), ...Object.entries(G.inv.k).map(([k, v]) => condTxt(k) + (v > 1 ? ' ×' + v : ''))].join(', '); el.appendChild(iv); }
}
function resume() { if (state !== 'pause') return; $('pause').hidden = true; state = 'play'; sfx.hum(true); last = performance.now(); }
async function endRun(won) {
  if (state === 'over' || !G) return;
  state = 'over'; sfx.hum(false); won ? sfx.win() : sfx.lose();
  if (!G.training) TELE.end(won, G.t);
  runClear();
  stick.on = false; mouseHold.on = false; keys.clear();
  $('sectorChoice').hidden=true; $('discoveryChoice').hidden=true;
  settleContract();
  $('hud').hidden = true; $('hurtfx').style.opacity = '0'; $('levelup').hidden = true; $('pause').hidden = true;
  const secs = Math.floor(G.t);
  const exitBonus = G.extracted === 'root' ? 0.5 : G.extracted === 'boss' ? 0.25 : 0;
  const frag = G.training ? 0 : Math.round((G.kills / 12 + secs * G.pace / 6 + G.bossKills * 30 + G.elites * 8 + (won ? 150 : 0)) * G.PM.frag * (1 + 0.1 * (META.ranks.greed || 0)) * (1 + (G.threatPeak - 1) * 0.08) * (1 + exitBonus));
  const had = {}; for (const k in OPS) had[k] = OPS[k].unlocked(); const hadProto = META.protoMax;
  const gateWas = G.gate;
  if (!G.training && secs >= 60 && (G.mode === 'full' || G.mode === 'short')) META.runsN = (META.runsN || 0) + 1;
  META.frag += frag; if (!G.training) { META.totalKills += G.kills; META.bossKills = (META.bossKills || 0) + G.bossKills; }
  if (won && G.rootDeleted && !G.training) { META.rootKills++; if (!G.daily && G.mode !== 'story' && G.proto === META.protoMax && META.protoMax < 5) META.protoMax++; }
  let storyBonus = 0;
  if (G.CH && won) { if ((META.story || 0) < G.chapter) { META.story = G.chapter; storyBonus = 150 * G.chapter; META.frag += storyBonus; } if (G.chapter < 5) META.chapter = G.chapter + 1; }
  if (G.daily && secs >= 120 && !(META.dailyDates || []).includes(G.daily.key)) META.dailyDates = [...(META.dailyDates || []), G.daily.key].slice(-60);
  saveMeta();
  const un = $('unlocks'); un.textContent = '';
  const addU = t => { const d = document.createElement('div'); d.textContent = t; un.appendChild(d); };
  for (const k in OPS) if (!had[k] && OPS[k].unlocked()) addU('Operator unlocked: ' + OPS[k].name);
  const R = { siege: G.mode === 'siege', converts: G.converts || 0, rescued: G.rescued, trades: G.trades || 0, od: G.odEver, reflexes: G.reflexN || 0, extracted: G.extracted, opCalls: G.opCalls, won: won && !!G.rootDeleted, secs, kills: G.kills, level: G.level, proto: G.proto, op: G.op, short: G.mode === 'short', full: G.pace === 1, daily: !!G.daily, pace: G.pace,
              lines: Object.values(P.code).reduce((a, l) => a + l.length, 0), maxLines: Math.max(0, ...Object.values(P.code).map(l => l.length)), rank3: Object.values(P.code).some(l => l.some(L => L.r >= 2)), conds: Object.values(P.code).reduce((a, l) => a + l.filter(L => L.k).length, 0), calls: G.codeFires, evos: Object.keys(P.evo).length, evtWins: G.evtWins || 0, powUsed: G.powUsed, weapons: Object.keys(P.W).length, heals: G.heals, clean: G.clean, firstHit: G.firstHit < 0 ? G.t : G.firstHit };
  if (!G.training) for (const a of checkAch(R)) addU(`Achievement: ${a.name} (+◆ ${a.reward})`);
  if (gateWas < 3 && (G.mode === 'full' || G.mode === 'short') && Math.min(3, META.runsN || 0) > gateWas) addU('New next run: ' + ['', 'Operator calls (F), mid-run events, Signal Hunt relays, and boss abilities with a route choice after each boss', 'Anomaly zones, hidden Caches, Reflex (graze shots, then V), Wardens, and a specialization with optional quests at level 5', 'Sleepers to rescue, the rogue trader, converting elites, a mutation choice and the Nemesis rival'][Math.min(3, META.runsN)]);
  logRun(won, frag);
  if (storyBonus) addU(`Chapter ${G.chapter} complete (+◆ ${storyBonus})`);
  saveMeta();
  relayStop(); $('overQuote').textContent = won ? RELAY.win : pickL(RELAY.lose);
  if (META.protoMax > hadProto) addU(`Protocol ${META.protoMax} unlocked`);
  $('overEyebrow').textContent = G.training ? 'Training program' : G.CH ? `Story · chapter ${G.chapter}` : (G.daily ? `Daily challenge · ${G.daily.key}` : won ? `Protocol ${G.proto} cleared` : `Protocol ${G.proto} · run ended`) + (exitBonus ? ` · jacked out, +${Math.round(exitBonus * 100)}% fragments` : '');
  const ttl = $('overTitle'); ttl.textContent = G.training ? 'Training ended' : G.CH && won ? `${G.CH.name}: complete` : won ? (G.extracted ? 'Jacked out clean' : 'Root Process deleted') : G.extracted ? 'Jacked out' : 'Signal lost'; ttl.classList.toggle('won-title', won);
  $('overTime').textContent = fmt(G.t); $('oLevel').textContent = G.level; $('oKills').textContent = G.kills; $('oFrag').textContent = '+' + frag;
  renderSlots($('overBuild')); renderProgram($('overCode'), true);
  renderDebrief(won);
  { // damage breakdown: what actually carried the run
    const wrap = $('dmgBars'); wrap.textContent = '';
    const tot = Object.values(G.dmg).reduce((a, b) => a + b, 0) || 1;
    const rows = Object.entries(G.dmg).filter(([, v]) => v / tot >= 0.01).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (rows.length) { const h = document.createElement('div'); h.className = 'h'; h.textContent = 'Damage dealt'; wrap.appendChild(h); }
    for (const [k, v] of rows) {
      const D = WDEF[k], name = D ? (P.evo[k] ? EVO[k].name : D.name) : { code: 'Code lines', power: 'Powers', thorns: 'Backtrace', other: 'Other', operator: 'Operator', relic: 'Boss abilities', mutation: 'Mutations', ally: 'Rewritten enemies' }[k] || k;
      const r = document.createElement('div'); r.className = 'r';
      const ic = document.createElement('span'); ic.className = 'ic'; setIcon(ic, D ? k : null, D ? D.icon : k === 'code' ? '{}' : '·');
      const bar = document.createElement('div'); bar.className = 'bar'; const fill = document.createElement('i'); fill.style.width = (v / rows[0][1] * 100).toFixed(1) + '%'; const lab = document.createElement('span'); lab.textContent = name; bar.append(fill, lab);
      const pc = document.createElement('span'); pc.className = 'pc'; pc.textContent = Math.round(v / tot * 100) + '%';
      r.append(ic, bar, pc); wrap.appendChild(r);
    }
  }
  const short = G.pace > 1 || G.mode !== 'full';
  const score = G.proto * 1e9 + secs * 1e4 + Math.min(G.kills, 9999);
  const newLocal = !short && !G.daily && score > localBest.score;
  if (newLocal) { localBest = { score, secs, kills: G.kills, proto: G.proto }; save('last-signal-best', localBest); }
  $('oRank').textContent = '–';
  const tail = ` You have ◆ ${META.frag} to spend in the Kernel.`;
  $('overNote').textContent = (newLocal ? 'New personal best.' : '') + (G.threatPeak >= 1.1 ? ` Peak threat ×${G.threatPeak.toFixed(1)}.` : '') + tail;
  $('over').hidden = false;
  setTimeout(() => $('againBtn').focus({ preventScroll: true }), 30);
  if (G.daily) { const r = await submitDaily(secs * 1e4 + Math.min(G.kills, 9999), secs, G.kills, won); $('overNote').textContent = r + tail; renderLocal(); return; }
  if (short) { $('overNote').textContent = (G.training ? 'Training earns nothing.' : G.CH ? (won && G.chapter < 5 ? `Chapter ${G.chapter + 1} is unlocked.` : '') : 'This mode earns fragments but is not ranked.') + (G.training ? '' : tail); renderLocal(); return; }
  const r = await submitScore(score, secs, G.kills, G.level, won, G.proto);
  if (r.rank) $('oRank').textContent = '#' + r.rank;
  if (r.note) $('overNote').textContent = (newLocal ? 'New personal best. ' : '') + r.note + tail;
  renderLocal();
}
const anomAt = (x, y) => { for (const z of G.anoms) if ((x - z.x) ** 2 + (y - z.y) ** 2 < z.R * z.R) return z; return null; };
function updateWorld(dt) {
  // anomalies
  for (const z of G.anoms) z.t += dt;
  G.anoms = G.anoms.filter(z => z.t < z.dur);
  // conversion: an elite kept within 90 px of you for 5 s joins you (2 at most)
  for (const e of enemies) {
    if (!e.elite || e.dead || isB(e) || e.ally > G.t || G.gate < 3) continue;
    const close = (e.x - P.x) ** 2 + (e.y - P.y) ** 2 < 90 * 90 && G.allies < 2;
    e.conv = close ? (e.conv || 0) + dt : Math.max(0, (e.conv || 0) - dt * 0.5);
    if (close && !e.convHint && !G.convHinted) { G.convHinted = true; e.convHint = true; relay(RELAY.world.convert); }
    if (e.conv >= 5) {
      e.ally = 1e9; e.convert = true; e.hp = e.max; G.allies++; G.converts = (G.converts || 0) + 1;
      if (e.cache) { pickups.push({ x: e.x, y: e.y, kind: 'cache', t: 0 }); e.cache = false; }
      burst(e.x, e.y, 16, GREEN, 200); sfx.evolve(); banner('Converted', 'It fights for you', 'gold'); relay(RELAY.world.converted);
    }
  }
  // rescue
  const Q = G.rescue;
  if (Q) {
    if (Q.stage === 'pod') {
      const near2 = (P.x - Q.x) ** 2 + (P.y - Q.y) ** 2 < 60 * 60;
      Q.hold = near2 ? Q.hold + dt : Math.max(0, Q.hold - dt);
      if (Q.hold >= 1.5) {
        Q.stage = 'follow'; const a = rand(0, TAU), o = { x: P.x + Math.cos(a) * 480, y: P.y + Math.sin(a) * 480 }; pushOut(o, 70);
        Q.ex = o.x; Q.ey = o.y; Q.t0 = G.t; relay(RELAY.world.awake, true); banner('Sleeper awake', 'Escort it out', 'gold'); sfx.pickup();
      } else if (G.t - Q.t0 > 75) G.rescue = null;
    } else {
      const dx = P.x - Q.x, dy = P.y - Q.y, d = Math.hypot(dx, dy) || 1;
      if (d > 50) { Q.x += dx / d * Math.min(STAT.speed * 0.95, d * 3) * dt; Q.y += dy / d * Math.min(STAT.speed * 0.95, d * 3) * dt; }
      pushOut(Q, 10);
      Q.shot -= dt;
      if (Q.shot <= 0) { const e = nearest(Q.x, Q.y, 360); if (e) { Q.shot = 0.7; const a = Math.atan2(e.y - Q.y, e.x - Q.x); shots.push({ x: Q.x, y: Q.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 4, dmg: 14 * (1 + G.t * G.pace / 600), pierce: 1, life: 1, ch: '·', kind: 'dshot', hit: new Set(), src: 'ally' }); } }
      near(Q.x, Q.y, 40, e => { if (!(e.ally > G.t) && (e.x - Q.x) ** 2 + (e.y - Q.y) ** 2 < (e.r + 10) ** 2 && G.t - (Q.hitT || 0) > 0.5) { Q.hitT = G.t; Q.hp -= e.dmg; } });
      for (const s of eshots) if ((s.x - Q.x) ** 2 + (s.y - Q.y) ** 2 < 14 * 14) { s.life = 0; Q.hp -= s.dmg; }
      if (Q.hp <= 0 || G.t - Q.t0 > 75) { G.rescue = null; relay(RELAY.world.lost, true); burst(Q.x, Q.y, 12, '#ffffff', 160); }
      else if ((Q.x - Q.ex) ** 2 + (Q.y - Q.ey) ** 2 < 60 * 60) {
        G.rescue = null; G.rescued++; G.progs.push({ a: rand(0, TAU), shot: 0 });
        pickups.push({ x: P.x + P.fx * 40, y: P.y + P.fy * 40, kind: 'cache', t: 0 });
        banner('Rescued', 'Sleeper saved', 'gold'); relay(RELAY.world.saved); sfx.evolve();
      }
    }
  }
  // rescued programs orbit you and shoot
  G.progs.forEach((q, i) => {
    q.a += dt * 0.9; q.x = P.x + Math.cos(q.a + i * Math.PI) * 60; q.y = P.y + Math.sin(q.a + i * Math.PI) * 60; q.shot -= dt;
    if (q.shot <= 0) { const e = nearest(q.x, q.y, 380); if (e) { q.shot = 0.6; const a = Math.atan2(e.y - q.y, e.x - q.x); shots.push({ x: q.x, y: q.y, vx: Math.cos(a) * 540, vy: Math.sin(a) * 540, r: 4, dmg: 16 * (1 + G.t * G.pace / 500), pierce: 2, life: 1, ch: '·', kind: 'dshot', hit: new Set(), src: 'ally' }); } }
  });
  // trader
  const T = G.trader;
  if (T) {
    if (G.t > T.till) G.trader = null;
    else { const nearT = (P.x - T.x) ** 2 + (P.y - T.y) ** 2 < 60 * 60; T.near = nearT ? T.near + dt : 0; if (T.near >= 0.6) openTrade(); }
  }
}
function openTrade() {
  if (state !== 'play' || !G.trader) return;
  state = 'trade'; sfx.level();
  const xpCost = Math.round(G.need * 0.5), wrap = $('tradeCards'); wrap.textContent = '';
  const offers = [
    { id: 'blood', icon: '✚', name: 'Integrity for an upgrade', desc: `Lose 30% of your max integrity now (${Math.round(STAT.maxHp * 0.3)}). Get one upgrade.`, ok: P.hp > STAT.maxHp * 0.3 + 1 },
    { id: 'data', icon: '◆', name: 'Data for a Cache', desc: `Pay ${xpCost} data from this level's progress. Get a Cache.`, ok: G.xp >= xpCost },
    { id: 'frag', icon: '↻', name: 'Fragments for a comeback', desc: `Pay ◆ 150 from your bank. +1 Failover this run.`, ok: META.frag >= 150 && !G.daily },
    { id: 'leave', icon: '→', name: 'No deal', desc: 'Walk away. The trader leaves.', ok: true }
  ];
  offers.forEach((o, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card'; b.disabled = !o.ok;
    const top = document.createElement('div'); top.className = 'top'; const ic = document.createElement('span'); ic.className = 'ic'; ic.textContent = o.icon; top.appendChild(ic);
    const body = document.createElement('div'); body.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-width:0';
    const kd = document.createElement('span'); kd.className = 'kind'; kd.textContent = o.ok ? 'Trade' : 'Not enough'; const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = o.name; const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = o.desc;
    body.append(kd, nm, ds); const key = document.createElement('span'); key.className = 'key'; key.textContent = 'Press ' + (i + 1);
    b.append(top, body, key); b.addEventListener('click', () => doTrade(o.id, o.ok)); wrap.appendChild(b);
  });
  $('trade').hidden = false;
  setTimeout(() => { const f = wrap.querySelector('button:not(:disabled)'); if (f) f.focus({ preventScroll: true }); }, 30);
}
function doTrade(id, ok) {
  if (state !== 'trade' || !ok) return;
  if (id === 'blood') { P.hp -= STAT.maxHp * 0.3; G.pending++; }
  else if (id === 'data') { G.xp -= Math.round(G.need * 0.5); pickups.push({ x: P.x + P.fx * 30, y: P.y + P.fy * 30, kind: 'cache', t: 0 }); }
  else if (id === 'frag') { META.frag -= 150; saveMeta(); G.revives++; }
  if (id !== 'leave') { G.trades = (G.trades || 0) + 1; sfx.buy(); banner('Trade', 'Done', 'gold'); }
  G.trader = null; $('trade').hidden = true; state = 'play'; last = performance.now();
}
