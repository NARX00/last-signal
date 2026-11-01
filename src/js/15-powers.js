// ================= powers =================
const xk = id => 1 + 0.35 * ((P.xl[id] || 1) - 1);
const xdur = id => 1 + 0.2 * ((P.xl[id] || 1) - 1);
function powerMax(id) { return XDEF[id].cd * (1 - 0.15 * ((P.xl[id] || 1) - 1)) * STAT.xcd * (G.mods.overcharged ? 0.5 : 1); }
function usePower(slot) {
  if (state !== 'play' || !G) return;
  const p = G.pw[slot]; if (!p || p.cd > 0) return;
  const id = p.id, k = xk(id), du = xdur(id); codeHurt(null, 'power'); DSRC = 'power'; G.powUsed = true;
  p.max = powerMax(id); p.cd = p.max;
  if(G.mutation==='clone') G.clones.push({x:P.x,y:P.y,t:0});
  if (id === 'blink') {
    const x0 = P.x, y0 = P.y, L = 230 * (0.9 + 0.1 * (P.xl.blink || 1));
    for (let i = 0; i < 5; i++) ghosts.push({ x: x0 + P.fx * L * i / 5, y: y0 + P.fy * L * i / 5, a: Math.atan2(P.fy, P.fx), t: -i * 0.03 });
    P.x += P.fx * L; P.y += P.fy * L; P.inv = Math.max(P.inv, 0.45);
    buildGrid();
    const sx = P.x - x0, sy = P.y - y0, len2 = sx * sx + sy * sy;
    near((x0 + P.x) / 2, (y0 + P.y) / 2, L / 2 + 40, e => {
      const t = clamp(((e.x - x0) * sx + (e.y - y0) * sy) / len2, 0, 1), cx = x0 + sx * t, cy = y0 + sy * t;
      if (Math.hypot(e.x - cx, e.y - cy) < e.r + 30) hurt(e, 45 * k, -sy / Math.sqrt(len2) * 200, sx / Math.sqrt(len2) * 200);
    });
    zaps.push({ pts: [[x0, y0], [P.x, P.y]], t: 0, life: 0.3, col: '#bfe9ff' });
    sfx.zap();
  } else if (id === 'shell') {
    P.shellT = G.t + 5 * du; sfx.evolve(); banner('Power', 'Shell up');
  } else if (id === 'halt') {
    G.freezeT = G.t + 4 * du; sfx.boom(); shake = Math.max(shake, 8); banner('Power', 'Halt');
  } else if (id === 'nova') {
    rings.push({ x: P.x, y: P.y, r: 0, max: Math.hypot(VW, VH) * 0.65, w: 40, dmg: 180 * k, hit: new Set(), t: 0, col: '#ffffff', kb: 520, follow: true });
    shake = Math.max(shake, 18); sfx.boom(); sfx.zap();
  } else if (id === 'slow') {
    G.slowT = G.t + 6 * du; sfx.pulse(); banner('Power', 'Slowdown');
  } else if (id === 'decoy') {
    G.decoy = { x: P.x + P.fx * 40, y: P.y + P.fy * 40, t: 0, dur: 6 * du, k }; sfx.pickup(); banner('Power', 'Decoy deployed');
  } else if (id === 'sight') {
    G.sightT = G.t + 6 * du; sfx.zap(); banner('Power', 'Code Sight');
  } else if (id === 'phase') {
    P.phaseT = G.t + 4 * du; sfx.evolve(); banner('Power', 'Phase');
  } else if (id === 'leap') {
    const L = 280 * (0.9 + 0.1 * (P.xl.leap || 1)), o = { x: P.x + P.fx * L, y: P.y + P.fy * L }; pushOut(o, P.r);
    P.leap = { x0: P.x, y0: P.y, x1: o.x, y1: o.y, t: 0, dur: 0.38, k }; sfx.shot();
  } else if (id === 'emp') {
    G.empT = G.t + 6 * du; G.empSelfT = G.t + 3;
    for (const s of eshots) burst(s.x, s.y, 2, '#bfe9ff', 60); eshots.length = 0;
    for (const q of G.pw) if (q !== p) q.cd += 3;
    rings.push({ x: P.x, y: P.y, r: 0, max: Math.hypot(VW, VH) * 0.6, w: 18, dmg: 0, hit: new Set(), t: 0, col: '#bfe9ff', follow: true });
    shake = Math.max(shake, 8); sfx.zap(); banner('Power', 'EMP');
  } else if (id === 'hijack') {
    let n = 0; const cap = Math.round(10 * k);
    buildGrid();
    near(P.x, P.y, 260, e => { if (n >= cap || isB(e) || e.ally > G.t) return; e.ally = G.t + 8 * du; e.hp = Math.max(e.hp, e.max); n++; burst(e.x, e.y, 4, GREEN); });
    sfx.evolve(); banner('Power', n ? `${n} enemies hijacked` : 'Nothing in range');
  }
  renderPowers();
}
function triggerReflex() {
  if (G.reflex < 100 || G.reflexT > G.t) return;
  G.reflex = 0; G.reflexT = G.t + 2.5; G.reflexN = (G.reflexN || 0) + 1; sfx.evolve(); banner('Reflex', 'Time slows', 'gold'); if (!G.reflexSeen) { G.reflexSeen = true; relay(RELAY.reflex); }
}
function powerReady(p) {
  const el = $('pw' + G.pw.indexOf(p)); if (el) { el.classList.remove('ready'); void el.offsetWidth; el.classList.add('ready'); }
  if (SET.sound) sfx.pickup();
}
