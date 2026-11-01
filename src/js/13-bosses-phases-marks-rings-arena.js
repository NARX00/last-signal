// ================= bosses: phases, marks, rings, arena =================
function bossPhase(e) {
  const info = BOSSINFO[e.type];
  banner('Phase ' + e.phase, info.name, 'hot'); shake = Math.max(shake, 14); sfx.boss(); hitStop = Math.max(hitStop, 0.14);
  $('bossname').textContent = `${info.name} · phase ${e.phase}`;
  if (e.type === 'root' && e.phase === 2) { G.arena = { x: P.x, y: P.y, R: 900 }; relay(RELAY.rootPhase2, true); }
  else if (e.type === 'root' && e.phase === 3) { relay(RELAY.rootPhase3, true); for (let k = 0; k < 3; k++) { const [x, y] = spawnPos(); spawn(['daemon', 'brute', 'drone'][k], x, y, true); } }
  else { relay(pickL(RELAY.phase), true); if (e.type === 'boss' && e.phase === 3) for (let k = 0; k < 2; k++) { const [x, y] = spawnPos(); spawn('daemon', x, y, true); } }
}
function updateHazards(dt) {
  for (const m of G.marks) {
    m.t += dt;
    if (!m.fired && m.t >= m.del) {
      m.fired = true;
      if (Math.hypot(P.x - m.x, P.y - m.y) < m.R) damagePlayer(m.dmg);
      zaps.push({ pts: jag(m.x + rand(-20, 20), m.y - VH * 0.8, m.x, m.y, 9), t: 0, life: 0.3, big: true, col: HOT });
      burst(m.x, m.y, 8, HOT, 140); shake = Math.max(shake, 3);
    }
  }
  G.marks = G.marks.filter(m => m.t < m.del + 0.35);
  for (const q of G.pools) { q.t += dt; if (q.t > 0.35 && (P.x - q.x) ** 2 + (P.y - q.y) ** 2 < (q.R + P.r * 0.5) ** 2) damagePlayer(q.dmg); }
  G.pools = G.pools.filter(q => q.t < q.dur);
  for (const r of G.erings) {
    r.r += 300 * dt;
    if (!r.hit) { const d = Math.hypot(P.x - r.x, P.y - r.y); if (Math.abs(d - r.r) < 16 + P.r) { r.hit = true; damagePlayer(r.dmg); } }
  }
  G.erings = G.erings.filter(r => r.r < r.max);
  if (G.arena) {
    const A = G.arena; A.R = Math.max(400, A.R - 16 * dt);
    if (Math.hypot(P.x - A.x, P.y - A.y) > A.R) damagePlayer(7);
    if (!G.boss || G.boss.type !== 'root') G.arena = null;
  }
  // operator signatures
  DSRC = 'operator';
  if (G.op === 'lumen') {
    G.trailT -= dt;
    if (P.moving && G.trailT <= 0) { G.trailT = 0.05; G.trail.push({ x: P.x, y: P.y, t: G.t }); }
    G.trail = G.trail.filter(p => G.t - p.t < 0.9);
    G.trailHit -= dt;
    if (G.trailHit <= 0) { G.trailHit = 0.2; for (const p of G.trail) near(p.x, p.y, 30, e => { if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + 12 && e.trailT !== G.t) { e.trailT = G.t; hurt(e, 8, 0, 0, true); } }); }
  } else if (G.op === 'hex') {
    G.hexT += dt;
    if (G.hexT >= 10) {
      const mine = enemies.filter(e => e.hexed && e.ally > G.t).length;
      let best = null, bd = 320 * 320;
      if (mine < 3) for (const e of enemies) { if (e.dead || isB(e) || e.ally > G.t) continue; const q = (e.x - P.x) ** 2 + (e.y - P.y) ** 2; if (q < bd) { bd = q; best = e; } }
      if (best) { G.hexT = 0; best.ally = G.t + 20; best.hexed = true; best.hp = best.max; burst(best.x, best.y, 10, '#c49cff'); zaps.push({ pts: jag(P.x, P.y, best.x, best.y, 6), t: 0, life: 0.3, col: '#c49cff' }); sfx.zap(); }
      else G.hexT = 9.5;
    }
  } else if (G.op === 'bastion') {
    G.bulT -= dt;
    if (G.bulT <= 0) { G.bulT = 14; G.bulwark = { x: P.x, y: P.y, t: 0, dur: 5, R: 100 }; sfx.pulse(); }
    const B = G.bulwark;
    if (B) {
      B.t += dt; if (B.t >= B.dur) G.bulwark = null;
      else {
        near(B.x, B.y, B.R + 40, e => {
          if (e.ally > G.t) return;
          const dx = e.x - B.x, dy = e.y - B.y, d = Math.hypot(dx, dy) || 1;
          if (d < B.R + e.r) { if (!isB(e)) { e.x = B.x + dx / d * (B.R + e.r); e.y = B.y + dy / d * (B.R + e.r); } if (G.t - (e.bulHit || 0) > 0.3) { e.bulHit = G.t; hurt(e, 12, dx / d * 200, dy / d * 200, true); } }
        });
        for (const sh of eshots) if (Math.hypot(sh.x - B.x, sh.y - B.y) < B.R) sh.life = 0;
      }
    }
  }
}

