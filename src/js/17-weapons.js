// ================= weapons =================
function fireWeapons(dt) {
  for (const id in P.W) {
    const w = P.W[id], i = w.lvl - 1, D = WDEF[id], evo = !!P.evo[id];
    DSRC = id;
    if (id === 'orbit') { orbitTick(w, D, i, dt, evo); continue; }
    if (id === 'drone') droneMove(w, D, i, dt, evo);
    w.t -= dt;
    if (w.t > 0) continue;
    w.t = (D.cd ? D.cd[i] : 1) * STAT.cd * (G.slowT > G.t ? 0.66 : 1) * (evo ? (id === 'bolt' ? 0.55 : id === 'bolt2' ? 0.8 : id === 'mine' ? 0.75 : 1) : 1);
    if (STAT.echo && Math.random() < STAT.echo) w.t = 0.1;  // Echo: fire again almost at once
    if (id === 'bolt') {
      const used = new Set(), n = evo ? 6 : D.n[i];
      for (let k = 0; k < n; k++) {
        const e = nearest(P.x, P.y, 600, used) || nearest(P.x, P.y, 600);
        const a = e ? Math.atan2(e.y - P.y, e.x - P.x) + (evo ? rand(-0.5, 0.5) : 0) : Math.atan2(P.fy, P.fx) + rand(-0.4, 0.4);
        if (e) used.add(e);
        shots.push({ x: P.x, y: P.y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, r: 6, dmg: D.dmg[i] * (evo ? 1.2 : 1), pierce: evo ? 4 : D.pierce[i], life: evo ? 1.8 : 1.2, ch: pick(), kind: 'bolt', hit: new Set(), homing: evo, evo, src: 'bolt' });
      }
      sfx.shot(id);
    } else if (id === 'pulse') {
      const R = D.r[i] * STAT.area * (evo ? 1.6 : 1), dm = D.dmg[i] * (evo ? 1.6 : 1);
      rings.push({ x: P.x, y: P.y, r: 0, max: R, w: 16, dmg: dm, hit: new Set(), t: 0, col: evo ? CYAN : GREEN, kb: i >= 5 ? 340 : 200, follow: true, slow: evo, src: 'pulse' });
      if (i >= 5) setTimeout(() => { if (state === 'play' && P.W.pulse) rings.push({ x: P.x, y: P.y, r: 0, max: R * 1.3, w: 16, dmg: dm * 0.7, hit: new Set(), t: 0, col: evo ? CYAN : GREEN, kb: 340, follow: true, slow: evo, src: 'pulse' }); }, 220);
      sfx.pulse();
    } else if (id === 'bolt2') {
      const used = new Set(), n = evo ? 8 : D.n[i], ch = evo ? 3 : D.chain[i];
      for (let k = 0; k < n; k++) {
        const pool = enemies.filter(e => !e.dead && !used.has(e) && Math.abs(e.x - P.x) < VW * 0.55 && Math.abs(e.y - P.y) < VH * 0.55);
        if (!pool.length) break;
        const e = pool[(Math.random() * pool.length) | 0]; used.add(e);
        strike(e, D.dmg[i]);
        let from = e;
        for (let c = 0; c < ch; c++) {
          const nx = nearest(from.x, from.y, 190, used); if (!nx) break; used.add(nx);
          zaps.push({ pts: jag(from.x, from.y, nx.x, nx.y, 6), t: 0, life: 0.22, col: evo ? CYAN : null });
          hurt(nx, D.dmg[i] * 0.7); from = nx;
        }
      }
      sfx.zap();
    } else if (id === 'well') {
      // open the hole on the thickest nearby crowd, so it lands where it matters and where you can see it
      const pool = enemies.filter(e => !e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 320);
      const crowd = e => { let n = 0; near(e.x, e.y, 90, () => { n++; }); return n; };
      for (let k = 0; k < (evo ? 2 : 1); k++) {
        let tgt = null, best = -1;
        for (let j = 0; j < Math.min(8, pool.length); j++) { const c = pool[(Math.random() * pool.length) | 0], n = crowd(c); if (n > best) { best = n; tgt = c; } }
        const x = tgt ? tgt.x : P.x + P.fx * 140 + rand(-60, 60), y = tgt ? tgt.y : P.y + P.fy * 140 + rand(-60, 60);
        wells.push({ x, y, R: D.r[i] * STAT.area * (evo ? 1.3 : 1), dmg: D.dmg[i] * (evo ? 1.3 : 1), t: 0, dur: D.dur[i] * STAT.dur, tick: 0, blast: i >= 5, evo });
      }
    } else if (id === 'spread') {
      const n = evo ? 10 : D.n[i], base = Math.atan2(P.fy, P.fx), sp = 0.12 + n * 0.045;
      for (let k = 0; k < n; k++) {
        const a = base + (n === 1 ? 0 : (k / (n - 1) - 0.5) * sp * 2);
        shots.push({ x: P.x, y: P.y, vx: Math.cos(a) * 470, vy: Math.sin(a) * 470, r: 5, dmg: D.dmg[i] * (evo ? 1.9 : 1), pierce: evo ? 99 : D.pierce[i], life: 1.0, kind: 'round', hit: new Set(), rings: [], dist: 0, slow: evo, evo, src: 'spread' });
      }
      sfx.shot(id);
    } else if (id === 'mine') {
      const n = evo ? 4 : D.n[i];
      for (let k = 0; k < n; k++) {
        if (G.mines.length >= 16) G.mines.shift();
        const a = k / n * TAU + rand(-0.3, 0.3), off = n > 1 ? 34 : 0;
        G.mines.push({ x: P.x + Math.cos(a) * off, y: P.y + Math.sin(a) * off, t: 0, life: D.life * STAT.dur, R: D.R[i] * STAT.area * (evo ? 1.3 : 1), dmg: D.dmg[i] * (evo ? 1.15 : 1), evo });
      }
    } else if (id === 'boomer') {
      const n = evo ? 6 : D.n[i], range = D.range[i] * (evo ? 1.35 : 1) * STAT.area;
      const e = nearest(P.x, P.y, 500), base = e ? Math.atan2(e.y - P.y, e.x - P.x) : Math.atan2(P.fy, P.fx);
      for (let k = 0; k < n; k++) {
        const a = base + (k - (n - 1) / 2) * (n > 1 ? 0.5 : 0);
        shots.push({ x: P.x, y: P.y, vx: Math.cos(a) * 440, vy: Math.sin(a) * 440, r: evo ? 13 : 9, dmg: D.dmg[i] * (evo ? 1.4 : 1), pierce: 999, life: 4, ch: pick(), kind: 'boom', out: true, dist: 0, range, hit: new Set(), evo, src: 'boomer' });
      }
      sfx.shot(id);
    } else if (id === 'kata') {
      if (G.t - (w.lastHit || -9) > 1.2) w.combo = 0;
      const R = D.r[i] * STAT.area * (evo ? 1.5 : 1), cap = evo ? 15 : 10, list = [];
      near(P.x, P.y, R + 20, e => { const d2 = (e.x - P.x) ** 2 + (e.y - P.y) ** 2; if (d2 < (R + e.r) ** 2) list.push([d2, e]); });
      list.sort((a, b) => a[0] - b[0]);
      const hitN = evo ? list.length : Math.min(D.n[i], list.length);
      for (let k = 0; k < hitN; k++) { const e = list[k][1], d = Math.sqrt(list[k][0]) || 1; hurt(e, D.dmg[i] * (evo ? 1.15 : 1) * (1 + 0.08 * (w.combo || 0)), (e.x - P.x) / d * 60, (e.y - P.y) / d * 60, true); G.slashes.push({ x: e.x, y: e.y, a: Math.atan2(e.y - P.y, e.x - P.x) + rand(-0.6, 0.6), t: 0, evo }); }
      if (hitN) { w.combo = Math.min(cap, (w.combo || 0) + 1); w.lastHit = G.t; sfx.hit(); }
    } else if (id === 'drone') {
      if (G.empSelfT > G.t) continue;
      for (const [x, y] of (w.pos || [])) {
        const e = nearest(x, y, 480); if (!e) continue;
        const a = Math.atan2(e.y - y, e.x - x);
        shots.push({ x, y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 4, dmg: D.dmg[i] * (evo ? 1.4 : 1), pierce: evo ? 3 : i >= 3 ? 2 : 1, life: 1.1, ch: '·', kind: 'dshot', hit: new Set(), evo, src: 'drone' });
      }
      sfx.shot(id);
    }
  }
  DSRC = 'other';
}
function droneMove(w, D, i, dt, evo) {
  w.a = (w.a || 0) + dt * 1.3;
  const n = evo ? 5 : D.n[i];
  w.pos = [];
  for (let k = 0; k < n; k++) { const a = w.a + k / n * TAU; w.pos.push([P.x + Math.cos(a) * 46, P.y + Math.sin(a) * 46 + Math.sin(G.t * 3 + k) * 4]); }
}
function jag(x0, y0, x1, y1, n) {
  const pts = [[x0, y0]];
  for (let k = 1; k < n; k++) { const t = k / n; pts.push([x0 + (x1 - x0) * t + rand(-14, 14), y0 + (y1 - y0) * t + rand(-14, 14)]); }
  pts.push([x1, y1]); return pts;
}
function strike(e, dmg) {
  zaps.push({ pts: jag(e.x + rand(-40, 40), e.y - VH * 0.7, e.x, e.y, 10), t: 0, life: 0.25, big: true, col: P.evo.bolt2 ? CYAN : null });
  hurt(e, dmg);
  near(e.x, e.y, 46, o => { if (o !== e) hurt(o, dmg * 0.35); });
  burst(e.x, e.y, 6, '#d8fff0', 120);
}
function orbitTick(w, D, i, dt, evo) {
  DSRC = 'orbit';
  w.a = (w.a || 0) + D.spin[i] * dt * (w.boost > G.t ? 2 : 1);
  const sets = evo ? [[D.n[i], D.r[i] * STAT.area, 1], [D.n[i], D.r[i] * STAT.area * 1.7, -0.8]] : [[D.n[i], D.r[i] * STAT.area, 1]];
  const dm = D.dmg[i] * (evo ? 1.3 : 1);
  w.pos = [];
  for (const [n, R, dir] of sets) for (let k = 0; k < n; k++) {
    const a = w.a * dir + k / n * TAU, x = P.x + Math.cos(a) * R, y = P.y + Math.sin(a) * R;
    w.pos.push([x, y, a]);
    near(x, y, 30, e => {
      if (Math.hypot(e.x - x, e.y - y) < e.r + 11 && G.t - e.orbHit > 0.3) { e.orbHit = G.t; const d = Math.hypot(e.x - P.x, e.y - P.y) || 1; hurt(e, dm, (e.x - P.x) / d * 120, (e.y - P.y) / d * 120); }
    });
  }
}

