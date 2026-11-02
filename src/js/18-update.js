// ================= update =================
const keys = new Set();
const stick = { on: false, id: null, bx: 0, by: 0, x: 0, y: 0 };
const mouseHold = { on: false, x: 0, y: 0 };
function inputDir() {
  let x = 0, y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  if (stick.on) { const dx = stick.x - stick.bx, dy = stick.y - stick.by, d = Math.hypot(dx, dy); if (d > 6) { const m = Math.min(1, (d - 6) / 24); x = dx / d * m; y = dy / d * m; } }
  else if (mouseHold.on) { const sx = W / 2 + (P.x - cam.x) * ZOOM, sy = H / 2 + (P.y - cam.y) * ZOOM, dx = mouseHold.x - sx, dy = mouseHold.y - sy, d = Math.hypot(dx, dy); if (d > 14) { x = dx / d; y = dy / d; } }
  const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
  return [x, y];
}
function update(dt) {
  G.t += dt;
  updateOpening();
  updateSignalHunt(dt);
  updateBossRelics(dt);
  updateRunExtras(dt);
  const [ix, iy] = inputDir();
  if (ix || iy) { const m = Math.hypot(ix, iy); P.fx = ix / m; P.fy = iy / m; }
  // Overdrive: 10 s of nonstop full-speed movement breaks your limits until you stop or get hit
  const im = Math.hypot(ix, iy);
  if (im > 0.85) { G.runT += dt; G.idleT = 0; if (!G.od && G.runT >= 10) { G.od = true; G.odEver = true; G.odT = G.t; banner('Overdrive', 'Limits off', 'gold'); relay(RELAY.overdrive); sfx.evolve(); } }
  else { G.idleT += dt; if (G.idleT > 0.4) { G.runT = 0; if (G.od) { G.od = false; } } }
  if (G.od && G.t - G.odT > 15) { G.od = false; G.runT = 0; }
  if (P.leap) {
    const L = P.leap; L.t += dt; const f = Math.min(1, L.t / L.dur);
    P.x = L.x0 + (L.x1 - L.x0) * f; P.y = L.y0 + (L.y1 - L.y0) * f; P.inv = Math.max(P.inv, 0.1);
    if (f >= 1) { P.leap = null; pushOut(P, P.r); DSRC = 'power'; rings.push({ x: P.x, y: P.y, r: 0, max: 130 * L.k, w: 26, dmg: 90 * L.k, hit: new Set(), t: 0, col: '#c8ffe0', kb: 320 }); DSRC = 'other'; shake = Math.max(shake, 10); sfx.boom(); burst(P.x, P.y, 14, GREEN, 220); }
  } else {
    const zp = G.anoms.length ? anomAt(P.x, P.y) : null, sp = STAT.speed * (G.od ? 1.25 : 1) * (zp && zp.kind === 'stasis' ? 0.55 : 1);
    P.x += ix * sp * dt; P.y += iy * sp * dt;
    if (P.phaseT < G.t) pushOut(P, P.r);
  }
  P.moving = !!(ix || iy);
  // Reflex: near misses charge it; when full it fires on its own as a hit is about to land (or press V)
  if (G.reflex >= 100 && G.reflexT < G.t) {
    let danger = false;
    for (const s of eshots) { const dx = P.x - s.x, dy = P.y - s.y; if (dx * dx + dy * dy < 80 * 80 && dx * s.vx + dy * s.vy > 0) { danger = true; break; } }
    if (!danger) for (const e of enemies) if (e.type === 'lancer' && e.mode === 2 && (e.x - P.x) ** 2 + (e.y - P.y) ** 2 < 150 * 150) { danger = true; break; }
    if (danger) triggerReflex();
  }
  P.inv -= dt;
  if (P.hp < STAT.maxHp * 0.3) { G.hbT = (G.hbT || 0) - dt; if (G.hbT <= 0) { G.hbT = 0.5 + 0.7 * P.hp / (STAT.maxHp * 0.3); sfx.heart(); } }
  if (STAT.regen && P.hp < STAT.maxHp) P.hp = Math.min(STAT.maxHp, P.hp + STAT.regen * dt);
  if (STAT.shieldMax && P.sh < STAT.shieldMax && G.t - P.lastHit > 4) P.sh = Math.min(STAT.shieldMax, P.sh + STAT.shieldMax * 0.3 * dt);
  for (const p of G.pw) { const was = p.cd > 0; p.cd -= dt; if (was && p.cd <= 0) powerReady(p); }
  ghosts.forEach(g => g.t += dt); ghosts = ghosts.filter(g => g.t < 0.45);
  cam.x += (P.x - cam.x) * Math.min(1, dt * 8); cam.y += (P.y - cam.y) * Math.min(1, dt * 8);

  if (G.tblocks.length && G.tblocks[0].till < G.t) G.tblocks = [];
  director(dt);
  buildGrid();
  fireWeapons(dt);
  updateCode(dt);
  updateHazards(dt);
  updateExit(dt);
  updateWorld(dt);
  updateSiege(dt);
  DSRC = 'other';

  const far = Math.hypot(VW, VH) * 0.85 + 200;
  const frozen = G.freezeT > G.t, gslow = (G.slowT > G.t ? 0.3 : 1) * (G.reflexT > G.t ? 0.3 : 1), shellOn = P.shellT > G.t, dec = G.decoy;
  if (dec) {
    dec.t += dt;
    if (dec.t >= dec.dur) { rings.push({ x: dec.x, y: dec.y, r: 0, max: 240, w: 30, dmg: 120 * dec.k, hit: new Set(), t: 0, col: '#bfe9ff', kb: 420 }); sfx.boom(); shake = Math.max(shake, 10); G.decoy = null; }
  }
  for (const e of enemies) {
    if (e.dead) continue;
    if (frozen && !(e.ally > G.t)) { e.hf -= dt; continue; }
    const pdx = P.x - e.x, pdy = P.y - e.y, pd = Math.hypot(pdx, pdy) || 1;
    if (e.ally) {
      if (e.ally > G.t) {
        let tgt = null; near(e.x, e.y, 340, o => { if (o !== e && !(o.ally > G.t) && o.type !== 'root') { tgt = o; return false; } });
        if (tgt) {
          const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy) || 1;
          e.x += dx / d * e.spd * 1.6 * dt; e.y += dy / d * e.spd * 1.6 * dt;
          if (d < e.r + tgt.r + 4 && G.t - (e.allyHit || 0) > 0.4) { e.allyHit = G.t; e.ally += 0; const sv = tgt.ally; DSRC = 'ally'; hurt(tgt, 18 + e.dmg * 2, dx / d * 200, dy / d * 200); DSRC = 'other'; tgt.ally = sv; }
        } else { e.x += pdx / pd * e.spd * 0.6 * dt; e.y += pdy / pd * e.spd * 0.6 * dt; }
        e.hf -= dt;
        if (e.segs) { e.segs[0].x = e.x; e.segs[0].y = e.y; for (let k = 1; k < e.segs.length; k++) { const p = e.segs[k - 1], q = e.segs[k], ddx = q.x - p.x, ddy = q.y - p.y, dd = Math.hypot(ddx, ddy) || 1; q.x = p.x + ddx / dd * 14; q.y = p.y + ddy / dd * 14; } }
        continue;
      }
      e.ally = 0; rings.push({ x: e.x, y: e.y, r: 0, max: 90, w: 18, dmg: 40, hit: new Set(), t: 0, col: GREEN, kb: 200 }); kill(e); continue;
    }
    const toCore = G.core && !isB(e) && !dec && (e.x - G.core.x) ** 2 + (e.y - G.core.y) ** 2 < pd * pd;
    const tx = dec ? dec.x : toCore ? G.core.x : P.x, ty = dec ? dec.y : toCore ? G.core.y : P.y;
    if (toCore && (e.x - G.core.x) ** 2 + (e.y - G.core.y) ** 2 < (e.r + 36) ** 2) { G.core.hp -= e.dmg * 0.85; e.dead = true; burst(e.x, e.y, 6, HOT, 140); shake = Math.max(shake, 3); continue; }
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1, slow = (e.slowT > G.t ? 0.5 : 1) * gslow, sp = e.spd * slow;
    let vx = dx / d * sp, vy = dy / d * sp;
    if (isB(e)) { const ph = e.hp < e.max * 0.33 ? 3 : e.hp < e.max * 0.66 ? 2 : 1; if (ph > e.phase) { e.phase = ph; bossPhase(e); } }
    if (e.type === 'warden') {
      // Three seconds of armored approach, then a clearly exposed rush.
      const guard = wardenGuard(e);
      vx *= guard ? .65 : 1.65; vy *= guard ? .65 : 1.65;
    } else if (e.type === 'drone') {
      const want = d > 260 ? 1 : d < 200 ? -1 : 0, tx = -dy / d, ty = dx / d, side = Math.sin(G.t * 0.7 + e.ph) > 0 ? 1 : -1;
      vx = dx / d * sp * want + tx * sp * 0.6 * side; vy = dy / d * sp * want + ty * sp * 0.6 * side;
      e.st -= dt;
      if (e.st <= 0 && d < 440 && G.empT < G.t) {
        e.st = rand(1.6, 2.4) / (1 + G.proto * 0.1);
        const n = e.elite ? 3 : 1;
        for (let k = 0; k < n; k++) { const a = Math.atan2(dy, dx) + (k - (n - 1) / 2) * 0.25; eshots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, r: 5, dmg: e.dmg * 0.8, life: 4 }); }
      }
    } else if (e.type === 'patcher') {
      // keeps a little distance and spreads its patch to everything around it
      if (d < 150) { vx *= -0.4; vy *= -0.4; }
      e.st -= dt; if (e.st <= 0) { e.st = 0.5; near(e.x, e.y, 120, o => { if (o !== e && !isB(o)) { o.patchT = G.t + 0.7; o.patchF = e.patch; } }); }
    } else if (e.type === 'scrubber') {
      // goes for your code before it goes for you
      let best = null, bd = 420 * 420;
      for (const q of G.cpools) { const qd = (q.x - e.x) ** 2 + (q.y - e.y) ** 2; if (qd < bd) { bd = qd; best = q; } }
      if (best) {
        const qd = Math.sqrt(bd) || 1; vx = (best.x - e.x) / qd * sp * 1.25; vy = (best.y - e.y) / qd * sp * 1.25;
        if (qd < Math.max(18, best.R * 0.5)) { best.t = best.dur; e.hp = Math.min(e.max, e.hp + e.max * 0.25); burst(best.x, best.y, 8, AMBER, 120); if (Math.random() < 0.5) addText(e.x, e.y - e.r - 8, 'scrubbed', false); }
      }
      e.st -= dt;
      if (e.st <= 0) { e.st = 0.15; for (const sh of shots) if (sh.kind === 'code' && sh.life > 0 && (sh.x - e.x) ** 2 + (sh.y - e.y) ** 2 < 46 * 46) { sh.life = 0; e.hp = Math.min(e.max, e.hp + e.max * 0.04); } }
    } else if (e.type === 'lancer') {
      // approach, freeze and aim (telegraph), then a fast straight charge that can be sidestepped
      e.st -= dt;
      if (e.mode === 0) { if (d < 300 && e.st <= 0) { e.mode = 1; e.st = 0.85; e.dx = dx / d; e.dy = dy / d; } }
      else if (e.mode === 1) { vx = vy = 0; if (e.st <= 0) { e.mode = 2; e.st = 0.5; } }
      else { const v = 560 * gslow; vx = e.dx * v; vy = e.dy * v; if (e.st <= 0) { e.mode = 0; e.st = rand(2.2, 3.2); } }
    } else if (e.type === 'watcher') {
      // keeps its distance, aims down a visible line, then fires one fast shot
      const want = d > 430 ? 1 : d < 330 ? -1 : 0, ttx = -dy / d, tty = dx / d, side = Math.sin(G.t * 0.6 + e.ph) > 0 ? 1 : -1;
      vx = dx / d * sp * want + ttx * sp * 0.4 * side; vy = dy / d * sp * want + tty * sp * 0.4 * side;
      e.st -= dt;
      if (e.mode === 0 && e.st <= 0 && d < 560 && G.empT < G.t) { e.mode = 1; e.st = 0.75; e.dx = dx / d; e.dy = dy / d; }
      else if (e.mode === 1) { vx *= 0.2; vy *= 0.2; if (e.st <= 0) { e.mode = 0; e.st = rand(2.6, 3.4) / (1 + G.proto * 0.1); eshots.push({ x: e.x, y: e.y, vx: e.dx * 460, vy: e.dy * 460, r: 6, dmg: e.dmg, life: 2 }); sfx.shot(); } }
    } else if (e.type === 'leaker') {
      // leaves pools of corrupted data that hurt you while you stand in them
      e.st -= dt;
      if (e.st <= 0) { e.st = 1.3; if (G.pools.length < 50) G.pools.push({ x: e.x, y: e.y, t: 0, dur: 4.5, R: e.elite ? 44 : 32, dmg: e.dmg }); }
    } else if (e.type === 'eel') {
      const want = Math.atan2(dy, dx) + Math.sin(G.t * 3 + e.ph) * 0.7;
      const da = ((want - e.a + Math.PI * 3) % TAU) - Math.PI; e.a += clamp(da, -2.4 * dt, 2.4 * dt);
      vx = Math.cos(e.a) * sp; vy = Math.sin(e.a) * sp;
    } else if (e.type === 'auditor') {
      vx *= 0.8; vy *= 0.8; e.st -= dt;
      if (e.st <= 0) {
        e.st = e.phase >= 3 ? 1.5 : e.phase >= 2 ? 2 : 2.6;
        const n = e.phase >= 3 ? 7 : e.phase >= 2 ? 5 : 3;
        for (let k = 0; k < n; k++) {
          const lead = k === 0 ? 0.55 : 0;
          G.marks.push({ x: P.x + P.fx * STAT.speed * lead * (P.moving ? 1 : 0) + (k ? rand(-170, 170) : 0), y: P.y + P.fy * STAT.speed * lead * (P.moving ? 1 : 0) + (k ? rand(-170, 170) : 0), t: 0, del: 1.15, R: 64, dmg: e.dmg });
        }
        sfx.zap();
      }
    } else if (e.type === 'collector') {
      let g = null, bd = 520 * 520;
      for (const gm of gems) { if (gm.got) continue; const q = (gm.x - e.x) ** 2 + (gm.y - e.y) ** 2; if (q < bd) { bd = q; g = gm; } }
      const gx = g ? g.x : tx, gy = g ? g.y : ty;
      const want = Math.atan2(gy - e.y, gx - e.x) + Math.sin(G.t * 2 + e.ph) * 0.35;
      const da = ((want - e.a + Math.PI * 3) % TAU) - Math.PI; e.a += clamp(da, -2.2 * dt, 2.2 * dt);
      const v2 = sp * (e.phase >= 2 ? 1.35 : 1); vx = Math.cos(e.a) * v2; vy = Math.sin(e.a) * v2;
      for (const gm of gems) if (!gm.got && Math.abs(gm.x - e.x) < e.r + 26 && Math.abs(gm.y - e.y) < e.r + 26) { gm.got = true; gm.eaten = true; e.eaten += gm.v; }
      e.st -= dt;
      if (e.phase >= 2 && e.st <= 0) { e.st = e.phase >= 3 ? 1.6 : 2.6; const tail = e.segs[e.segs.length - 1]; for (let k = 0; k < 3; k++) spawn('bug', tail.x + rand(-20, 20), tail.y + rand(-20, 20)); }
    } else if (e.type === 'mirror') {
      const want = d > 280 ? 1 : d < 200 ? -1 : 0, ttx = -dy / d, tty = dx / d, side = Math.sin(G.t * 0.5 + e.ph) > 0 ? 1 : -1;
      vx = dx / d * sp * want + ttx * sp * 0.7 * side; vy = dy / d * sp * want + tty * sp * 0.7 * side;
      e.st -= dt; e.st2 -= dt;
      if (e.st <= 0) {
        e.st = e.phase >= 3 ? 0.9 : e.phase >= 2 ? 1.2 : 1.6;
        const nW = Object.keys(P.W).length + Object.keys(P.evo).length, n = Math.min(12, 2 + nW * 2), base = Math.atan2(P.y - e.y, P.x - e.x);
        for (let k = 0; k < n; k++) { const a = base + (n === 1 ? 0 : (k / (n - 1) - 0.5) * 1.0); eshots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 5, dmg: e.dmg * 0.45, life: 3.5, mir: true }); }
      }
      if (e.st2 <= 0) { e.st2 = e.phase >= 3 ? 3.5 : 6; G.erings.push({ x: e.x, y: e.y, r: 0, max: 560, hit: false, dmg: e.dmg * 0.8 }); sfx.pulse(); }
    } else if (e.type === 'phantom') {
      // alternates: solid (hittable, fires rings) and phased (immune, fast, passes through you and walls)
      e.st -= dt;
      const solidT = e.phase >= 3 ? 2.2 : e.phase >= 2 ? 2.7 : 3.2;
      if (e.st <= 0) { e.phased = !e.phased; e.st = e.phased ? 2.2 : solidT; e.st2 = 0.4; if (!e.phased) { shake = Math.max(shake, 5); sfx.boss(); } }
      if (e.phased) { vx *= 2.3; vy *= 2.3; }
      else { vx *= 0.35; vy *= 0.35; e.st2 -= dt; if (e.st2 <= 0) { e.st2 = e.phase >= 2 ? 0.8 : 1.15; const n = e.phase >= 3 ? 16 : 12, off = rand(0, TAU); for (let k = 0; k < n; k++) { const a = off + k / n * TAU; eshots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 6, dmg: e.dmg * 0.45, life: 3.5 }); } sfx.pulse(); } }
    } else if (e.type === 'boss' || e.type === 'root') {
      e.st -= dt; e.st2 -= dt;
      const rage = e.hp < e.max * 0.5 ? 1.4 : 1;
      if (e.mode === 0 && e.st <= 0) { e.mode = 1; e.st = e.type === 'root' ? 0.9 : 0.7; e.dx = dx / d; e.dy = dy / d; }
      else if (e.mode === 1) { vx = vy = 0; if (e.st <= 0) { e.mode = 2; e.st = 0.45; shake = Math.max(shake, 5); } }
      else if (e.mode === 2) {
        const v = (e.type === 'root' ? 560 : 640) * gslow; vx = e.dx * v; vy = e.dy * v;
        if (e.st <= 0) {
          if (e.type === 'boss' && e.phase >= 2 && !e.combo) { e.combo = true; e.mode = 1; e.st = 0.35; e.dx = (P.x - e.x) / pd; e.dy = (P.y - e.y) / pd; vx = vy = 0; }
          else { e.combo = false; e.mode = 0; e.st = rand(2.4, 3.6) / rage; }
          const n = e.type === 'root' ? 22 : 10, off = rand(0, TAU);
          if (e.mode === 0) for (let k = 0; k < n; k++) { const a = off + k / n * TAU; eshots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, r: 6, dmg: e.dmg * 0.45, life: 3.5 }); }
        }
      }
      if (e.type === 'root' && e.phase >= 3) { e.st3 = (e.st3 || 2.5) - dt; if (e.st3 <= 0) { e.st3 = 2.5; for (let k = 0; k < 6; k++) G.marks.push({ x: P.x + (k ? rand(-220, 220) : 0), y: P.y + (k ? rand(-220, 220) : 0), t: 0, del: 1.2, R: 60, dmg: e.dmg * 0.7 }); } }
      if (e.type === 'root' && e.st2 <= 0) {
        e.st2 = 8 / rage;
        const n = 18, R = 420;
        for (let k = 0; k < n; k++) { const a = k / n * TAU; spawn(k % 3 ? 'bug' : 'daemon', P.x + Math.cos(a) * R, P.y + Math.sin(a) * R); }
        banner('Root Process', 'Summons a purge', 'hot');
      }
      if (e.type === 'root' && Math.random() < dt * 1.2 * rage) {
        const a = G.t * 2.2; for (let k = 0; k < 3; k++) { const b = a + k / 3 * TAU; eshots.push({ x: e.x, y: e.y, vx: Math.cos(b) * 150, vy: Math.sin(b) * 150, r: 5, dmg: e.dmg * 0.35, life: 4 }); }
      }
    }
    { const z = G.anoms.length ? anomAt(e.x, e.y) : null; if (z) { const f = z.kind === 'stasis' ? 0.4 : z.kind === 'amplify' ? 1.2 : 1; vx *= f; vy *= f; } }
    e.x += (vx + e.kx) * dt; e.y += (vy + e.ky) * dt;
    const kd = Math.pow(0.0008, dt); e.kx *= kd; e.ky *= kd;
    e.hf -= dt;
    if (e.segs) {
      e.segs[0].x = e.x; e.segs[0].y = e.y;
      const gap = e.gap || 14;
      for (let k = 1; k < e.segs.length; k++) { const p = e.segs[k - 1], q = e.segs[k], ddx = q.x - p.x, ddy = q.y - p.y, dd = Math.hypot(ddx, ddy) || 1; q.x = p.x + ddx / dd * gap; q.y = p.y + ddy / dd * gap; }
    }
    if (pd > far && !isB(e)) { const [x, y] = spawnPos(); e.x = x; e.y = y; if (e.segs) e.segs.forEach(s => { s.x = x; s.y = y; }); }
    if (shellOn && pd < e.r + 30) { if (G.t - (e.shellHit || 0) > 0.3) { e.shellHit = G.t; DSRC = 'power'; hurt(e, 25 * xk('shell'), (e.x - P.x) / pd * 300, (e.y - P.y) / pd * 300); } }
    else if (pd < e.r + P.r && !e.phased) damagePlayer(e.dmg, e);
    else if (e.segs) for (let k = 2; k < e.segs.length; k += 2) if (Math.hypot(P.x - e.segs[k].x, P.y - e.segs[k].y) < (e.segR || 10) + P.r) { damagePlayer(e.dmg * 0.6, e); break; }
  }
  for (const a of grid.values()) {
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
      const p = a[i], q = a[j], dx = q.x - p.x, dy = q.y - p.y, rr = p.r + q.r, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 0.01) {
        const d = Math.sqrt(d2), push = (rr - d) * 0.5, ux = dx / d * push, uy = dy / d * push;
        if (!isB(p)) { p.x -= ux; p.y -= uy; }
        if (!isB(q)) { q.x += ux; q.y += uy; }
      }
    }
  }
  for (const e of enemies) {
    if (e.dead || isB(e)) continue;
    if (pushOut(e, e.r) && e.type === 'lancer' && e.mode === 2) { e.mode = 0; e.st = 1.2; }
  }
  if (P.phaseT < G.t && !P.leap) pushOut(P, P.r);

  for (const s of shots) {
    DSRC = s.src || 'other'; CODE_L = s.line || null;
    updateMutationShot(s,dt);
    if (s.kind === 'boom') {
      const v = Math.hypot(s.vx, s.vy) || 1;
      if (s.out) { s.dist += v * dt; if (s.dist >= s.range) { s.out = false; s.hit.clear(); } }
      else { const dx = P.x - s.x, dy = P.y - s.y, d = Math.hypot(dx, dy) || 1; s.vx = dx / d * 520; s.vy = dy / d * 520; if (d < 22) s.life = 0; }
    }
    if (s.homing) {
      if (!s.tgt || s.tgt.dead || Math.random() < 0.05) s.tgt = nearest(s.x, s.y, 320, s.hit);
      if (s.tgt) { const a = Math.atan2(s.vy, s.vx), b = Math.atan2(s.tgt.y - s.y, s.tgt.x - s.x), da = ((b - a + Math.PI * 3) % TAU) - Math.PI, na = a + clamp(da, -7 * dt, 7 * dt); s.vx = Math.cos(na) * 560; s.vy = Math.sin(na) * 560; }
    }
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.kind === 'round') { s.dist += Math.hypot(s.vx, s.vy) * dt; if (s.rings.length === 0 || s.dist - s.rings[s.rings.length - 1].d > 26) { s.rings.push({ x: s.x, y: s.y, d: s.dist, t: G.t }); if (s.rings.length > 8) s.rings.shift(); } }
    near(s.x, s.y, s.r + 40, e => {
      if (s.pierce <= 0 || s.hit.has(e)) return;
      if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r) {
        s.hit.add(e); s.pierce--; const v = Math.hypot(s.vx, s.vy) || 1;
        if (s.slow) e.slowT = G.t + 2;
        hurt(e, s.dmg, s.vx / v * 90, s.vy / v * 90); if (s.pierce <= 0) return false;
      }
    });
  }
  for(const s of shots) if(s.mutReturn && !s.returning && (s.pierce<=0 || s.life<=0)) returnMutationShot(s);
  shots = shots.filter(s => s.life > 0 && s.pierce > 0);
  DSRC = 'other'; CODE_L = null;
  for (const s of eshots) {
    const dd0 = Math.hypot(s.x - P.x, s.y - P.y), defl = G.op === 'signal' && dd0 < 90 ? 0.4 : 1;
    const zs = G.anoms.length && anomAt(s.x, s.y), zf = zs && zs.kind === 'stasis' ? 0.4 : 1;
    if (!frozen) { s.x += s.vx * dt * gslow * defl * zf; s.y += s.vy * dt * gslow * defl * zf; s.life -= dt; if (inBlock(s.x, s.y)) { s.life = 0; burst(s.x, s.y, 2, HOT, 60); continue; } }
    const dd = Math.hypot(s.x - P.x, s.y - P.y);
    if (shellOn && dd < 32) { s.life = 0; shots.push({ x: s.x, y: s.y, vx: -s.vx * 2.4, vy: -s.vy * 2.4, r: 6, dmg: 20 * xk('shell'), pierce: 2, life: 1.2, ch: pick(), kind: 'bolt', hit: new Set() }); continue; }
    if (dd < s.r + P.r) { damagePlayer(s.dmg); s.life = 0; }
    else if (!s.grazed && dd < s.r + P.r + 28) { s.grazed = true; if (G.reflex < 100 && G.gate >= 2) { G.reflex = Math.min(100, G.reflex + 14); if (G.reflex >= 100) { sfx.pickup(); banner('Reflex', 'Charged'); } } }
  }
  eshots = eshots.filter(s => s.life > 0);

  for (const r of rings) {
    if (r.follow) { r.x = P.x; r.y = P.y; }
    DSRC = r.src || 'other'; CODE_L = r.line || null;
    r.t += dt; r.r += (r.max * 2.6) * dt;
    if (r.dmg) near(r.x, r.y, r.r + 30, e => {
      if (r.hit.has(e)) return;
      const d = Math.hypot(e.x - r.x, e.y - r.y);
      if (Math.abs(d - r.r) < r.w + e.r) { r.hit.add(e); if (r.slow) e.slowT = G.t + 2.5; hurt(e, r.dmg, (e.x - r.x) / (d || 1) * (r.kb || 0), (e.y - r.y) / (d || 1) * (r.kb || 0)); }
    });
  }
  rings = rings.filter(r => r.r < r.max); CODE_L = null;
  // bombs: arm, then blow when something comes close
  for (const m of G.mines) {
    m.t += dt;
    if (m.t < 0.6) continue;
    let trig = m.t >= m.life;
    if (!trig) near(m.x, m.y, 44, e => { if ((e.x - m.x) ** 2 + (e.y - m.y) ** 2 < (e.r + 22) ** 2) { trig = true; return false; } });
    if (trig) { m.done = true; rings.push({ x: m.x, y: m.y, r: 0, max: m.R, w: 22, dmg: m.dmg, hit: new Set(), t: 0, col: m.evo ? CYAN : '#c8ffe0', kb: 160, slow: m.evo, src: 'mine' }); burst(m.x, m.y, 6, m.evo ? CYAN : GREEN, 140); sfx.pulse(); }
  }
  G.mines = G.mines.filter(m => !m.done);
  DSRC = 'well';
  for (const w of wells) {
    w.t += dt; w.tick -= dt;
    const doTick = w.tick <= 0; if (doTick) w.tick = 0.25;
    near(w.x, w.y, w.R, e => {
      const dx = w.x - e.x, dy = w.y - e.y, d = Math.hypot(dx, dy);
      if (d > w.R) return;
      const f = (1 - d / w.R), pull = isB(e) ? 30 : 220;
      e.x += (dx / (d || 1) * pull * f - dy / (d || 1) * 90 * f) * dt; e.y += (dy / (d || 1) * pull * f + dx / (d || 1) * 90 * f) * dt;
      e.inWell = G.t;
      if (doTick) hurt(e, w.dmg * 0.25, 0, 0, true);
    });
    if (w.t >= w.dur && w.blast && !w.done) { w.done = true; rings.push({ x: w.x, y: w.y, r: 0, max: w.R * 1.6, w: 20, dmg: 90, hit: new Set(), t: 0, col: '#c8ffe0', kb: 300 }); sfx.boom(); shake = Math.max(shake, 6); }
  }
  wells = wells.filter(w => w.t < w.dur);
  DSRC = 'other';
  G.slashes.forEach(s => s.t += dt); G.slashes = G.slashes.filter(s => s.t < 0.18);
  zaps.forEach(z => z.t += dt); zaps = zaps.filter(z => z.t < z.life);

  const mag = STAT.magnet * (G.sector === 'blackout' ? .75 : 1);
  for (const g of gems) {
    if (g.got) continue;
    const dx = P.x - g.x, dy = P.y - g.y, d = Math.hypot(dx, dy);
    if (!g.mag && d < mag) g.mag = true;
    if (G.anoms.length && !g.mag) { const z = anomAt(g.x, g.y); if (z && z.kind === 'drift') { if (!g.drifted) { g.drifted = true; g.v *= 2; } const zx = z.x - g.x, zy = z.y - g.y, zd = Math.hypot(zx, zy) || 1; if (zd > 12) { g.x += zx / zd * 60 * dt; g.y += zy / zd * 60 * dt; } } }
    if (g.mag) { g.x += dx / (d || 1) * 540 * dt; g.y += dy / (d || 1) * 540 * dt; }
    if (d < P.r + 8) { g.got = true; gainXp(g.v); }
  }
  gems = gems.filter(g => !g.got);
  for (const p of pickups) {
    p.t += dt;
    if (Math.hypot(P.x - p.x, P.y - p.y) < P.r + 16) {
      p.got = true; sfx.pickup();
      if (p.kind === 'heal') { G.heals++; P.hp = Math.min(STAT.maxHp, P.hp + 35); banner('Pickup', 'Integrity restored'); }
      else if (p.kind === 'magnet') { gems.forEach(g => g.mag = true); banner('Pickup', 'All data pulled in'); }
      else if (p.kind === 'purge') { enemies.forEach(e => { if (!e.dead && !isB(e) && !e.elite && Math.abs(e.x - P.x) < VW * 0.6 && Math.abs(e.y - P.y) < VH * 0.6) hurt(e, 99999, 0, 0, true); }); rings.push({ x: P.x, y: P.y, r: 0, max: Math.hypot(VW, VH) * 0.6, w: 10, dmg: 0, hit: new Set(), t: 0, col: '#ffffff' }); shake = Math.max(shake, 14); sfx.boom(); banner('Pickup', 'Purge'); }
      else if (p.kind === 'cell') { G.pw.forEach(q => q.cd *= 0.4); banner('Pickup', 'Powers recharged', 'gold'); }
      else if (p.kind === 'cache') openCache(false);
      else if (p.kind === 'core') openCache(true);
    }
  }
  pickups = pickups.filter(p => !p.got && !(HELP_CD[p.kind] && p.t > 30) && !(p.hidden && p.t > 90));

  for (const s of sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.94; s.vy *= 0.94; }
  sparks = sparks.filter(s => s.t < s.life);
  for (const t of texts) t.t += dt;
  texts = texts.filter(t => t.t < 0.7);
  enemies = enemies.filter(e => !e.dead);
  G.comboT -= dt; if (G.comboT <= 0) G.combo = 0;
  shake *= Math.pow(0.02, dt);
  levelTick(dt);
}
function gainXp(v) {
  G.shardsGathered=(G.shardsGathered||0)+v;
  if (G.opCharge < 100 && G.gate >= 1) { G.opCharge = Math.min(100, G.opCharge + v * STAT.xp / G.need * 8); if (G.opCharge >= 100) opReady(); }
  G.xp += v * STAT.xp * sectorRules().xp * (G.evt && G.evt.kind === 'storm' ? 2 : 1); G.combo++; G.comboT = 0.6; sfx.gem(G.combo);
  while (G.xp >= G.need) { G.xp -= G.need; G.level++; G.pending++; G.need = needFor(G.level); }
}

