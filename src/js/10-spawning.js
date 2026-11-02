// adaptive threat tuning: from (run time, s), rise (per second when the screen is clear), max (enemy toughness ×), dmg (share of it added to enemy damage)
const THREAT = { from: 150, rise: 0.03, max: 2, dmg: 0.3 };
// ================= spawning =================
function spawnPos(extra = 60) {
  // spawn just past the edge of the visible rectangle (not a circle), so on tall phones enemies arrive from the sides quickly too
  const a = rand(0, TAU), c = Math.abs(Math.cos(a)) || 1e-6, sn = Math.abs(Math.sin(a)) || 1e-6, d = Math.min(VW / 2 / c, VH / 2 / sn) + extra;
  const o = { x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d }; pushOut(o, 24);
  return [o.x, o.y];
}
function spawn(type, x, y, elite) {
  const D = EDEF[type], t = G.t * G.pace, PM = G.PM;
  if (state === 'play') { META.seen = META.seen || {}; META.seen[type] = 1; }
  const hs = (1 + t / 60 * 0.32 + Math.pow(t / 250, 2.3)) * PM.hp;
  const isBoss = BOSSES.has(type);
  const th = G.threat || 1;
  const e = { id: ++eid, type, x, y, r: D.r, hp: D.hp * (isBoss ? (1 + t / 400) * PM.hp * Math.sqrt(th) : hs * th), spd: D.spd * (1 + t / 900 * 0.35) * PM.spd, dmg: D.dmg * (1 + t / 900 * 1.8) * PM.dmg * (1 + (th - 1) * THREAT.dmg),
              xp: D.xp, hitsAt: G.hits, kbr: 1 / (1 + (th - 1) * 0.6), kx: 0, ky: 0, hf: 0, ph: rand(0, TAU), st: rand(1.5, 3), st2: 9, mode: 0, ch: pick(), orbHit: 0, slowT: 0, inWell: -9, elite: !!elite };
  if (G.mods.haste) e.spd *= 1.15;
  if(G.contract && !isBoss) e.spd*=1.1;
  if (G.mods.swarm && !isBoss) e.hp *= 0.8;
  if (elite) { G.eliteN = (G.eliteN || 0) + 1; e.cache = G.eliteN % 2 === 1; e.hp *= 7; e.r *= 1.35; e.spd *= 1.08; e.xp *= 5; e.dmg *= 1.3; }
  e.max = e.hp;
  if (type === 'patcher') { e.patch = topFx(); if (!e.patch) e.type = type = 'daemon'; }
  if (type === 'eel') { e.a = Math.atan2(P.y - y, P.x - x); e.segs = Array.from({ length: 12 }, () => ({ x, y, ch: pick() })); }
  if (isBoss) {
    e.glyphs = Array.from({ length: type === 'root' ? 24 : 16 }, pick); G.boss = e; e.phase = 1;
    if (type === 'collector') { e.a = Math.atan2(P.y - y, P.x - x); e.gap = 22; e.segR = 18; e.eaten = 0; e.segs = Array.from({ length: 22 }, () => ({ x, y, ch: pick() })); }
    $('bossname').textContent = BOSSINFO[type].name; $('bossbar').hidden = false; sfx.boss(); shake = Math.max(shake, 12);
    banner('Boss · ' + BOSSINFO[type].sub, BOSSINFO[type].name, 'hot');
  }
  if (RELAY.meet[type] && !G.met[type] && state === 'play') { G.met[type] = true; setTimeout(() => { if (G && state === 'play') relay(RELAY.meet[type], true); }, 600); }
  enemies.push(e);
  return e;
}
function pickType() {
  const t = G.t * G.pace, w = [['bug', t > 300 ? 6 : 10]];
  if (['full','short'].includes(G.mode) && t > 85 && G.gate >= 2) w.push(['warden', Math.min(1.7, .5+t/400)]);
  if (t > 40) w.push(['daemon', Math.min(6, 2 + t / 50)]);
  if (t > 100) w.push(['drone', Math.min(3.5, 1 + t / 110)]);
  if (t > 150) w.push(['lancer', Math.min(3, 0.8 + t / 140)]);
  if (t > 200) w.push(['split', Math.min(3, 0.6 + t / 160)]);
  if (t > 260) w.push(['watcher', Math.min(2.2, 0.5 + t / 200)]);
  if (t > 300) w.push(['brute', Math.min(2.4, 0.5 + t / 220)]);
  if (t > 380) w.push(['leaker', Math.min(2, 0.4 + t / 260)]);
  if (t > 480) w.push(['eel', Math.min(1.2, 0.3 + t / 600)]);
  if (t > 420) w.push(['ghost', Math.min(1.4, 0.4 + t / 500)]);
  if (t > 240 && codeLines() >= 2 && G.gate >= 1) {
    let np = 0, ns = 0; for (const e of enemies) if (!e.dead) { if (e.type === 'patcher') np++; else if (e.type === 'scrubber') ns++; }
    if (np < 3 && topFx()) w.push(['patcher', Math.min(0.9, 0.2 + t / 900)]);
    if (ns < 4 && hasFx('pool', 'pull', 'split')) w.push(['scrubber', Math.min(1, 0.25 + t / 800)]);
  }
  // data-only enemies from data/enemies.json: "spawn": { "from": seconds, "weight": w, "ramp": per minute, "max": cap }
  for (const [id, D] of CUSTOM_ENEMIES) { const S = D.spawn; if (t > (S.from || 0) && (!S.modes || S.modes.includes(G.mode))) w.push([id, Math.min(S.max ?? 99, (S.weight ?? 1) + (t - (S.from || 0)) / 60 * (S.ramp || 0))]); }
  let sum = 0; for (const [, v] of w) sum += v;
  let r = Math.random() * sum; for (const [k, v] of w) { if ((r -= v) <= 0) return k; } return 'bug';
}
function director(dt) {
  const t = G.t * G.pace, alive = enemies.length;
  if (G.ending) return;   // the Root is gone: nothing new spawns while you head for the exit
  if (G.training) { G.opCharge = 100; return; }
  updateGoal();
  if (state === 'over' || state === 'exiting') return;
  if (G.core && G.CH && G.CH.goal === 'core' && G.t >= G.CH.need) return;
  if (G.opCharge < 100 && G.gate >= 1) { G.opCharge = Math.min(100, G.opCharge + dt * 100 / 150); if (G.opCharge >= 100) opReady(); }
  // Adaptive threat: if your build clears the screen, the system sends tougher code; if you're in trouble, it backs off.
  // Strong builds (a well-upgraded Kernel) used to cruise through Protocol 0: it now starts sooner, rises faster and goes higher.
  G.thrT += dt;
  if (G.thrT >= 0.5) {
    const step = G.thrT; G.thrT = 0;
    if (t > THREAT.from && !G.boss) {
      // count what reaches the inner part of the screen around you; enemies held at the edge don't count
      let on = 0; const R2 = Math.pow(Math.min(VW, VH) * 0.4, 2);
      // enemies already on screen and walking in count partly, so threat doesn't overshoot while they're still on their way
      for (const e of enemies) { if (e.dead || e.ally > G.t) continue; const dx = e.x - P.x, dy = e.y - P.y; if (dx * dx + dy * dy < R2) on++; else if (Math.abs(dx) < VW / 2 && Math.abs(dy) < VH / 2) on += 0.2; }
      const target = Math.min(28, 6 + t / 30), hurtRecent = t - (P.lastHit || -99) < 4;
      if (hurtRecent && P.hp < STAT.maxHp * 0.5) G.threat -= 0.25 * step;
      else if (hurtRecent && P.hp < STAT.maxHp * 0.75) { /* hold steady while you're under pressure */ }
      else if (on < target * 0.5) G.threat += THREAT.rise * (1 - on / (target * 0.5)) * step;
      else if (on > target * 1.3) G.threat -= 0.03 * step;
      G.threat = clamp(G.threat, 1, THREAT.max); G.threatPeak = Math.max(G.threatPeak, G.threat);
      if (!G.thrSeen && G.threat > 1.3) { G.thrSeen = true; relay(RELAY.threat); }
    }
  }
  const tb = 1 + (G.threat - 1) * 0.3;
  const rate = Math.min(26 * Math.min(tb, 1.6), (1.4 + t / 15 + Math.pow(t / 115, 2)) * G.PM.rate * tb) * (G.mods.swarm ? 1.35 : 1);
  G.spawnAcc += dt * rate * sectorRules().spawn * (G.contract ? 1.15 : 1);
  while (G.spawnAcc >= 1) { G.spawnAcc -= 1; if (alive < [440, 340, 260][QL]) { const [x, y] = spawnPos(); spawn(pickType(), x, y); } }
  if (t >= G.nextWave) {
    const n = Math.min(80, 20 + Math.floor(t / 60) * 7), R = Math.hypot(VW, VH) / 2 + 40;
    for (let i = 0; i < n; i++) { const a = i / n * TAU; spawn(t > 360 && i % 3 === 0 ? 'daemon' : 'bug', P.x + Math.cos(a) * R, P.y + Math.sin(a) * R); }
    G.nextWave += 60; G.waveT = G.t; banner('Incoming', 'Purge wave', 'hot'); if (G.waves++ % 3 === 0) relay(pickL(RELAY.wave));
  }
  if (t >= G.nextElite) {
    G.nextElite = t + rand(32, 44) / (1 + G.proto * 0.12) / (G.mods.elites ? 2 : 1);
    const pool = ['daemon', 'drone', 'lancer', 'split', 'watcher', 'brute', 'leaker', 'eel'].filter((k, i) => t > [40, 100, 150, 200, 260, 300, 380, 480][i]);
    const [x, y] = spawnPos(); spawn(pool.length ? pool[(Math.random() * pool.length) | 0] : 'daemon', x, y, true);
    if (!G.eliteSeen) { G.eliteSeen = true; relay(RELAY.elite[0]); }
  }
  // anomaly zones: places where the system's rules break
  if (G.gate >= 2 && t >= G.nextAnom && !G.boss && G.anoms.length < 1) {
    G.nextAnom = t + rand(110, 150);
    const kinds = ['stasis', 'amplify', 'drift'], kind = kinds[(Math.random() * 3) | 0], a = rand(0, TAU), o = { x: P.x + Math.cos(a) * rand(220, 340), y: P.y + Math.sin(a) * rand(220, 340) };
    G.anoms.push({ x: o.x, y: o.y, R: 170, kind, t: 0, dur: 40 }); relay(RELAY.world.anomaly[kind]);
  }
  // rescue: a sleeping program to wake and walk to an exit
  if (G.gate >= 3 && t >= G.nextRescue && !G.boss && !G.rescue && !G.exit && (G.progs.length < 2 || (G.CH && G.CH.goal === 'rescue'))) {
    G.nextRescue = t + (G.CH && G.CH.goal === 'rescue' ? rand(90, 120) : rand(170, 220));
    const a = rand(0, TAU), o = { x: P.x + Math.cos(a) * 420, y: P.y + Math.sin(a) * 420 }; pushOut(o, 60);
    G.rescue = { x: o.x, y: o.y, stage: 'pod', hold: 0, hp: 80, max: 80, t0: G.t, shot: 0 }; relay(RELAY.world.pod);
  }
  // rogue trader
  if (G.gate >= 3 && t >= G.nextTrader && !G.boss && !G.trader && !G.daily) {
    G.nextTrader = t + rand(180, 230);
    const a = rand(0, TAU), o = { x: P.x + Math.cos(a) * 280, y: P.y + Math.sin(a) * 280 }; pushOut(o, 40);
    G.trader = { x: o.x, y: o.y, till: G.t + 30, near: 0, g: Array.from({ length: 5 }, pick) }; relay(RELAY.world.trader);
  }
  if (G.gate >= 2 && t >= G.nextHidden && !G.boss) {
    G.nextHidden = t + rand(110, 150);
    const a = rand(0, TAU), o = { x: P.x + Math.cos(a) * rand(320, 480), y: P.y + Math.sin(a) * rand(320, 480) }; pushOut(o, 30);
    pickups.push({ x: o.x, y: o.y, kind: 'cache', t: 0, hidden: true });
    if (!G.hiddenSeen) { G.hiddenSeen = true; relay(RELAY.hidden); }
  }
  // mid-run events: short objectives that pull you off autopilot
  if (G.gate >= 1 && !G.evt && t >= G.nextEvt && !G.boss && !G.rootSpawned && (!G.bosses[0] || G.bosses[0].t - t > 30)) {
    const kinds = ['purge', 'beacon', 'storm'], kind = kinds[(G.evtN = (G.evtN || 0) + 1) % 3 === 0 ? 2 : Math.random() < 0.5 ? 0 : 1];
    if (kind === 'purge') G.evt = { kind, t0: G.t, dur: 20, k0: G.kills, need: Math.round(50 + t / 5) };
    else if (kind === 'beacon') { const a = rand(0, TAU), o = { x: P.x + Math.cos(a) * 300, y: P.y + Math.sin(a) * 300 }; pushOut(o, 100); G.evt = { kind, t0: G.t, dur: 40, x: o.x, y: o.y, hold: 0, need: 10 }; }
    else G.evt = { kind, t0: G.t, dur: 25 };
    banner('Event', { purge: 'Purge window', beacon: 'Hold the beacon', storm: 'Data storm' }[kind], 'gold'); relay(RELAY.events[kind], true); sfx.pickup();
    G.nextEvt = t + (G.CH && G.CH.goal === 'events' ? rand(110, 140) : rand(110, 150));
  }
  if (G.evt) {
    const E = G.evt, el = G.t - E.t0, left = Math.max(0, Math.ceil(E.dur - el));
    let done = false, txt = '';
    if (E.kind === 'purge') { const k = G.kills - E.k0; txt = `Purge ${Math.min(k, E.need)} / ${E.need} · ${left}s`; done = k >= E.need; }
    else if (E.kind === 'beacon') { if ((P.x - E.x) ** 2 + (P.y - E.y) ** 2 < 95 * 95) E.hold += dt; txt = `Hold the beacon ${Math.floor(E.hold)} / ${E.need}s · ${left}s`; done = E.hold >= E.need; }
    else txt = `Data storm ×2 · ${left}s`;
    G.evtTxt = txt;
    if (done) { G.evtWins = (G.evtWins || 0) + 1; pickups.push({ x: P.x + P.fx * 40, y: P.y + P.fy * 40, kind: 'cache', t: 0 }); if (E.kind === 'beacon') P.hp = Math.min(STAT.maxHp, P.hp + 40); banner('Event complete', 'Cache delivered', 'gold'); relay(RELAY.events.win); sfx.evolve(); G.evt = null; G.evtTxt = ''; }
    else if (el >= E.dur) { if (E.kind !== 'storm') { banner('Event', 'Window closed'); relay(RELAY.events.fail); } G.evt = null; G.evtTxt = ''; }
  }
  const nb = G.bosses[0];
  if (nb) {
    if (!nb.warned && t >= nb.t - 8) { nb.warned = true; relay(RELAY.warn[nb.type], true); }
    if (t >= nb.t && !G.boss) { G.bosses.shift(); const [x, y] = spawnPos(120); spawn(nb.type, x, y); }
  }
  if (!G.rootWarned && t >= ROOT_T - 8) { G.rootWarned = true; relay(RELAY.warn.root, true); }
  if (!G.rootSpawned && t >= ROOT_T) {
    G.rootSpawned = true; G.overtime = true; $('timer').classList.add('ot');
    const [x, y] = spawnPos(160); spawn('root', x, y);
  }
}

