// ================= render =================
function render(dt) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1; ctx.fillStyle = '#030b12'; ctx.fillRect(0, 0, W, H);
  if (QL < 2) {
    const atmosphere = ctx.createRadialGradient(W*.5,H*.48,0,W*.5,H*.48,Math.max(W,H)*.7);
    atmosphere.addColorStop(0,'rgba(14,57,69,.36)'); atmosphere.addColorStop(1,'rgba(3,11,18,0)');
    ctx.fillStyle=atmosphere; ctx.fillRect(0,0,W,H);
  }
  if (G && G.sector && state !== 'title') { ctx.fillStyle={foundry:'rgba(255,114,50,.045)',blackout:'rgba(85,45,150,.06)',sanctuary:'rgba(50,210,170,.04)'}[G.sector]; ctx.fillRect(0,0,W,H); }
  const danger = G && G.boss ? (G.boss.type === 'root' ? 0.85 : 0.6) : 0;
  drawRain((state === 'play' || state === 'title') && !(G && G.freezeT > G.t) ? dt * (G && G.slowT > G.t ? 0.3 : 1) : 0, danger);
  if (state === 'title' || !G) { postGlow(); return; }
  const sx = reduced ? 0 : (Math.random() - 0.5) * shake, sy = reduced ? 0 : (Math.random() - 0.5) * shake;
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(ZOOM, ZOOM); ctx.translate(-cam.x, -cam.y);
  const vx0 = cam.x - VW / 2 - 40, vx1 = cam.x + VW / 2 + 40, vy0 = cam.y - VH / 2 - 40, vy1 = cam.y + VH / 2 + 40;
  const FXA = CL ? 0.4 : 1;
  const vis = (x, y, m = 0) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;

  ctx.fillStyle = 'rgba(0,255,106,.16)';
  const gs = 80;
  for (let x = Math.floor(vx0 / gs) * gs; x < vx1; x += gs) for (let y = Math.floor(vy0 / gs) * gs; y < vy1; y += gs) ctx.fillRect(x - 1, y - 1, 2, 2);
  drawRunExtras();
  drawSignalHunt();
  // firewall blocks: neutral grey-teal so they never read as you, an enemy or a reward
  ctx.font = `13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  eachBlockNear(cam.x, cam.y, Math.max(VW, VH) / 2 + 60, b => {
    if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) return;
    const fade = b.till ? clamp((b.till - G.t) / 1.5, 0, 1) : 1;
    ctx.globalAlpha = fade; ctx.fillStyle = b.mine ? 'rgba(0,30,12,.92)' : 'rgba(6,20,16,.94)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = b.mine ? 'rgba(0,255,106,.7)' : 'rgba(140,190,170,.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.strokeStyle = 'rgba(140,190,170,.12)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 14; k < b.w; k += 14) { ctx.moveTo(b.x + k, b.y); ctx.lineTo(b.x + k, b.y + b.h); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(160,210,190,.35)';
    const n = Math.max(1, Math.floor(Math.max(b.w, b.h) / 40));
    ctx.globalAlpha = fade;
    for (let k = 0; k < n; k++) { const f = (k + 0.5) / n; ctx.fillText(b.g[k % b.g.length], b.w > b.h ? b.x + b.w * f : b.x + b.w / 2, b.w > b.h ? b.y + b.h / 2 : b.y + b.h * f); }
    ctx.globalAlpha = 1;
  });

  // gravity wells: black holes with a bright accretion ring. Enemies are drawn on top, so they stay fully visible even in Clarity mode.
  ctx.globalAlpha = CL ? 0.85 : 1;
  for (const w of wells) {
    const f = Math.min(1, w.t / 0.3) * Math.min(1, (w.dur - w.t) / 0.4), c = w.evo ? '127,247,255' : '0,255,106';
    const g = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.R);
    g.addColorStop(0, `rgba(0,0,0,${0.97 * f})`); g.addColorStop(0.28, `rgba(0,6,2,${0.9 * f})`); g.addColorStop(0.34, `rgba(${c},${(CL ? 0.28 : 0.4) * f})`); g.addColorStop(0.55, `rgba(${c},${(CL ? 0.08 : 0.14) * f})`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w.x, w.y, w.R, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(${c},${0.75 * f})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w.x, w.y, w.R * 0.3, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(220,255,230,${0.6 * f})`; ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) { const a = G.t * (3 + k) + k * 2; ctx.beginPath(); ctx.arc(w.x, w.y, w.R * (0.42 + k * 0.17), a, a + 1.4); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  const tiers = [[0, 2, '#3dff8f', 4], [2.0001, 9, '#5ad8ff', 5], [9.0001, 1e9, '#ffd36b', 6]];
  for (const [lo, hi, col, s] of tiers) {
    ctx.fillStyle = col; ctx.beginPath();
    for (const g of gems) { if (g.v < lo || g.v > hi || !vis(g.x, g.y)) continue; ctx.moveTo(g.x, g.y - s); ctx.lineTo(g.x + s * 0.7, g.y); ctx.lineTo(g.x, g.y + s); ctx.lineTo(g.x - s * 0.7, g.y); ctx.closePath(); }
    ctx.fill();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of pickups) {
    if (!vis(p.x, p.y, 20)) continue;
    if (p.hidden && G.sightT < G.t && (P.x - p.x) ** 2 + (P.y - p.y) ** 2 > 90 * 90) continue;
    const b = Math.sin(p.t * 4) * 3, big = p.kind === 'cache' || p.kind === 'core';
    if (!big && p.t > 25 && Math.floor(p.t * 6) % 2) continue;
    const col = p.kind === 'heal' ? '#ff8aa0' : p.kind === 'magnet' ? '#5ad8ff' : p.kind === 'cell' ? '#b48cff' : big ? AMBER : '#ffffff', s = big ? 15 : 11;
    if (big) {
      ctx.strokeStyle = 'rgba(255,176,0,.35)'; ctx.lineWidth = 1;
      for (let k = 0; k < 8; k++) { const a = p.t * 0.8 + k / 8 * TAU; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 20, p.y + b + Math.sin(a) * 20); ctx.lineTo(p.x + Math.cos(a) * 34, p.y + b + Math.sin(a) * 34); ctx.stroke(); }
    }
    ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x - s, p.y - s + b, s * 2, s * 2);
    ctx.fillStyle = col; ctx.font = `${big ? 22 : 18}px ${FONT}`;
    ctx.fillText(p.kind === 'heal' ? '+' : p.kind === 'magnet' ? '∪' : p.kind === 'cell' ? 'ϟ' : big ? '◆' : '✷', p.x, p.y + b + 1);
    ctx.shadowBlur = 0;
  }
  for (const q of G.pools) {
    const f = Math.min(1, q.t / 0.35) * Math.min(1, (q.dur - q.t) / 0.6);
    ctx.fillStyle = `rgba(255,40,70,${0.2 * f})`; ctx.strokeStyle = `rgba(255,90,110,${0.7 * f})`; ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]); ctx.lineDashOffset = -G.t * 20;
    ctx.beginPath(); ctx.arc(q.x, q.y, q.R, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  }
  for (const q of G.cpools) {
    const f = Math.min(1, q.t / 0.2) * Math.min(1, (q.dur - q.t) / 0.4);
    ctx.strokeStyle = `rgba(127,247,255,${0.7 * f})`; ctx.fillStyle = `rgba(127,247,255,${(q.k === 'pool' ? 0.12 : 0.06) * f})`; ctx.lineWidth = 1.5;
    ctx.setLineDash(q.k === 'pool' ? [4, 6] : [2, 8]); ctx.lineDashOffset = (q.k === 'pool' ? -1 : 1) * G.t * 30;
    const R = q.k === 'pull' ? q.R * (1 - 0.35 * (q.t / q.dur)) : q.R;
    ctx.beginPath(); ctx.arc(q.x, q.y, R, 0, TAU); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
  }
  for (const r of rings) {
    const f = 1 - r.r / r.max;
    ctx.strokeStyle = r.col; ctx.globalAlpha = (CL ? 0.3 : 0.65) * f; ctx.lineWidth = CL ? 1.5 : 3;
    ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0, r.r), 0, TAU); ctx.stroke();
    if (!CL) { ctx.globalAlpha = 0.18 * f; ctx.lineWidth = r.w; ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  ctx.font = `16px ${FONT}`;
  ctx.globalAlpha = CL ? 0.45 : 1;
  for (const s of shots) {
    if (!vis(s.x, s.y)) continue;
    if (s.kind === 'boom') {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(G.t * 14); ctx.font = `${s.evo ? 26 : 20}px ${FONT}`;
      ctx.fillStyle = '#effff5'; ctx.shadowColor = s.evo ? CYAN : GREEN; ctx.shadowBlur = 12; ctx.fillText(s.ch, 0, 0); ctx.shadowBlur = 0; ctx.restore();
      ctx.font = `16px ${FONT}`;
    } else if (s.kind === 'code') {
      ctx.fillStyle = '#e8feff'; ctx.shadowColor = CYAN; ctx.shadowBlur = 10; ctx.font = `14px ${FONT}`; ctx.fillText(s.ch, s.x, s.y); ctx.shadowBlur = 0; ctx.font = `16px ${FONT}`;
    } else if (s.kind === 'dshot') {
      ctx.fillStyle = s.evo ? CYAN : '#c8ffe0'; ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, TAU); ctx.fill();
    } else if (s.kind === 'bolt') {
      const v = Math.hypot(s.vx, s.vy);
      ctx.strokeStyle = s.evo ? 'rgba(127,247,255,.5)' : 'rgba(0,255,106,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x - s.vx / v * 22, s.y - s.vy / v * 22); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.fillStyle = '#effff5'; ctx.shadowColor = s.evo ? CYAN : GREEN; ctx.shadowBlur = 12; ctx.fillText(s.ch, s.x, s.y); ctx.shadowBlur = 0;
    } else {
      const a = Math.atan2(s.vy, s.vx);
      for (const r of s.rings) { const p = clamp((G.t - r.t) / 0.6, 0, 1); if (p >= 1) continue; ctx.globalAlpha = (CL ? 0.2 : 0.5) * (1 - p); ctx.strokeStyle = s.evo ? '#c8f8ff' : '#c8ffe0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(r.x, r.y, 3 + p * 6, 6 + p * 18, a, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = CL ? 0.45 : 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = CL ? 2 : 3; ctx.lineCap = 'round'; ctx.shadowColor = s.evo ? CYAN : GREEN; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(s.x - Math.cos(a) * 14, s.y - Math.sin(a) * 14); ctx.lineTo(s.x, s.y); ctx.stroke(); ctx.shadowBlur = 0;
    }
  }
  if (G.traceT > G.t) for (const e of enemies) { if (!e.cache || e.dead || !vis(e.x, e.y)) continue; ctx.strokeStyle = AMBER; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.35 + 16, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  if (G.core) {
    const C = G.core, f = clamp(C.hp / C.max, 0, 1);
    ctx.fillStyle = 'rgba(0,30,12,.9)'; ctx.strokeStyle = f < 0.3 ? HOT : '#c8ffe0'; ctx.lineWidth = 2.5; ctx.shadowColor = GREEN; ctx.shadowBlur = 16;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + G.t * 0.3; ctx[k ? 'lineTo' : 'moveTo'](C.x + Math.cos(a) * 34, C.y + Math.sin(a) * 34); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.font = `20px ${FONT}`; ctx.fillStyle = '#effff5'; ctx.fillText('◆', C.x, C.y + 1);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(C.x - 40, C.y + 44, 80, 5); ctx.fillStyle = f < 0.3 ? HOT : GREEN; ctx.fillRect(C.x - 40, C.y + 44, 80 * f, 5);
    for (const T of G.turrets) { ctx.save(); ctx.translate(T.x, T.y); ctx.rotate((T.a || 0) + Math.PI / 2); ctx.fillStyle = 'rgba(0,20,8,.9)'; ctx.strokeStyle = GREEN; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, 9); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  }
  for (const z of G.anoms) {
    const f = Math.min(1, z.t / 0.6) * Math.min(1, (z.dur - z.t) / 1.5), col = '196,156,255';
    ctx.fillStyle = `rgba(${col},${0.06 * f})`; ctx.beginPath(); ctx.arc(z.x, z.y, z.R, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(${col},${0.6 * f})`; ctx.lineWidth = 1.5; ctx.setLineDash([3, 9]); ctx.lineDashOffset = G.t * (z.kind === 'stasis' ? 4 : 30); ctx.beginPath(); ctx.arc(z.x, z.y, z.R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = `12px ${FONT}`; ctx.fillStyle = `rgba(${col},${0.8 * f})`; ctx.fillText({ stasis: 'STASIS', amplify: 'AMPLIFY', drift: 'DRIFT ×2' }[z.kind], z.x, z.y - z.R - 10);
    if (z.kind === 'drift') for (let k = 0; k < 10; k++) { const a = G.t * 0.6 + k / 10 * TAU, r = (G.t * 40 + k * 31) % z.R; ctx.fillText('·', z.x + Math.cos(a) * r, z.y + Math.sin(a) * r); }
  }
  if (G.rescue) {
    const Q = G.rescue;
    if (Q.stage === 'pod') {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(200,255,224,.12)'; ctx.beginPath(); ctx.ellipse(Q.x, Q.y, 16, 26, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = `12px ${FONT}`; ctx.fillText('z', Q.x + 18, Q.y - 22 - Math.sin(G.t * 2) * 4);
      if (Q.hold > 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(Q.x, Q.y, 34, -Math.PI / 2, -Math.PI / 2 + TAU * Q.hold / 1.5); ctx.stroke(); }
    } else {
      const g2 = ctx.createRadialGradient(Q.ex, Q.ey, 0, Q.ex, Q.ey, 70); g2.addColorStop(0, 'rgba(255,255,255,.3)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(Q.ex, Q.ey, 70, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(Q.ex, Q.ey, 60, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(Q.x, Q.y - 10); ctx.lineTo(Q.x + 7, Q.y); ctx.lineTo(Q.x, Q.y + 10); ctx.lineTo(Q.x - 7, Q.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(Q.x - 15, Q.y + 15, 30, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(Q.x - 15, Q.y + 15, 30 * clamp(Q.hp / Q.max, 0, 1), 3);
    }
  }
  for (const q of G.progs) if (q.x !== undefined) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(q.x, q.y - 7); ctx.lineTo(q.x + 5, q.y); ctx.lineTo(q.x, q.y + 7); ctx.lineTo(q.x - 5, q.y); ctx.closePath(); ctx.fill(); }
  if (G.trader) {
    const T = G.trader; ctx.font = `14px ${FONT}`;
    ctx.strokeStyle = 'rgba(255,176,0,.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(T.x - 14, T.y - 18, 28, 36);
    ctx.fillStyle = AMBER; T.g.forEach((ch, k) => ctx.fillText(ch, T.x, T.y - 12 + k * 7));
    ctx.font = `11px ${FONT}`; ctx.fillText('TRADE', T.x, T.y - 28);
  }
  // exit point: a white column of falling glyphs you stand in to jack out
  if (G.exit) {
    const X = G.exit, inside = (P.x - X.x) ** 2 + (P.y - X.y) ** 2 < 70 * 70, left = X.till - G.t;
    const g = ctx.createRadialGradient(X.x, X.y, 0, X.x, X.y, 80); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X.x, X.y, 80, 0, TAU); ctx.fill();
    ctx.font = `14px ${FONT}`; ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 7; k++) { const cx = X.x - 36 + k * 12, ph = (G.t * 90 + k * 37) % 140; ctx.globalAlpha = 0.25 + 0.6 * (1 - ph / 140); ctx.fillText(X.g[k], cx, X.y - 70 + ph); }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = left < 5 && Math.floor(G.t * 4) % 2 ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.setLineDash([12, 8]); ctx.lineDashOffset = G.t * 40;
    ctx.beginPath(); ctx.arc(X.x, X.y, 70, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (X.hold > 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(X.x, X.y, 70, -Math.PI / 2, -Math.PI / 2 + TAU * X.hold / X.need); ctx.stroke(); }
    if (inside) { ctx.font = `12px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.fillText('HOLD', X.x, X.y + 90); }
  }
  if (G.evt && G.evt.kind === 'beacon') {
    const E = G.evt, inside = (P.x - E.x) ** 2 + (P.y - E.y) ** 2 < 95 * 95;
    ctx.fillStyle = `rgba(255,176,0,${inside ? 0.1 : 0.05})`; ctx.beginPath(); ctx.arc(E.x, E.y, 95, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,176,0,.6)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -G.t * 30; ctx.beginPath(); ctx.arc(E.x, E.y, 95, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = AMBER; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(E.x, E.y, 95, -Math.PI / 2, -Math.PI / 2 + TAU * E.hold / E.need); ctx.stroke();
    ctx.fillStyle = '#fff3d0'; ctx.shadowColor = AMBER; ctx.shadowBlur = 16; ctx.font = `22px ${FONT}`; ctx.fillText('◈', E.x, E.y + Math.sin(G.t * 3) * 3); ctx.shadowBlur = 0;
  }
  // bombs
  for (const m of G.mines) {
    if (!vis(m.x, m.y)) continue;
    const armed = m.t >= 0.6, blink = armed && Math.floor(G.t * 4 + m.x) % 2 === 0;
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = 'rgba(0,20,8,.9)'; ctx.strokeStyle = m.evo ? CYAN : armed ? GREEN : 'rgba(0,255,106,.4)'; ctx.lineWidth = 1.5;
    ctx.fillRect(-6, -6, 12, 12); ctx.strokeRect(-6, -6, 12, 12); ctx.restore();
    ctx.fillStyle = blink ? '#ffffff' : m.evo ? CYAN : GREEN; ctx.beginPath(); ctx.arc(m.x, m.y, 2.2, 0, TAU); ctx.fill();
    if (armed && !CL) { ctx.strokeStyle = 'rgba(0,255,106,.08)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.R, 0, TAU); ctx.stroke(); }
  }
  // drones
  if (P.W.drone && P.W.drone.pos) {
    const evo = P.evo.drone;
    for (const [x, y] of P.W.drone.pos) {
      ctx.fillStyle = 'rgba(0,20,8,.9)'; ctx.strokeStyle = evo ? CYAN : '#c8ffe0'; ctx.lineWidth = 1.5; ctx.shadowColor = evo ? CYAN : GREEN; ctx.shadowBlur = CL ? 0 : 8;
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + G.t * 2; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * 7, y + Math.sin(a) * 7); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = evo ? CYAN : GREEN; ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
    }
  }
  if (P.W.orbit && P.W.orbit.pos) {
    const lv = P.W.orbit.lvl, R = WDEF.orbit.r[lv - 1] * STAT.area, evo = P.evo.orbit;
    ctx.strokeStyle = 'rgba(0,255,106,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); if (evo) { ctx.moveTo(P.x + R * 1.7, P.y); ctx.arc(P.x, P.y, R * 1.7, 0, TAU); } ctx.stroke();
    ctx.font = `22px ${FONT}`; ctx.fillStyle = '#effff5'; ctx.shadowColor = evo ? CYAN : GREEN; ctx.shadowBlur = 16;
    if (CL) { ctx.globalAlpha = 0.45; ctx.shadowBlur = 0; }
    for (const [x, y, a] of P.W.orbit.pos) { ctx.save(); ctx.translate(x, y); ctx.rotate(a * 2); ctx.fillText('✦', 0, 0); ctx.restore(); }
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
  // boss hazards
  for (const m of G.marks) {
    const f = clamp(m.t / m.del, 0, 1);
    if (!m.fired) {
      ctx.fillStyle = `rgba(255,59,92,${0.1 + 0.25 * f})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.R, 0, TAU); ctx.fill();
      ctx.strokeStyle = HOT; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y, m.R * f, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(m.x, m.y, m.R, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    } else { ctx.globalAlpha = 1 - (m.t - m.del) / 0.35; ctx.fillStyle = 'rgba(255,220,230,.5)'; ctx.beginPath(); ctx.arc(m.x, m.y, m.R, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  }
  for (const r of G.erings) {
    ctx.strokeStyle = HOT; ctx.globalAlpha = 0.8 * (1 - r.r / r.max); ctx.lineWidth = 4; ctx.shadowColor = HOT; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0, r.r), 0, TAU); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  if (G.arena) {
    const A = G.arena;
    ctx.fillStyle = 'rgba(255,40,64,.13)'; ctx.beginPath(); ctx.rect(vx0 - 200, vy0 - 200, vx1 - vx0 + 400, vy1 - vy0 + 400); ctx.arc(A.x, A.y, A.R, 0, TAU, true); ctx.fill('evenodd');
    ctx.strokeStyle = HOT; ctx.lineWidth = 3; ctx.shadowColor = HOT; ctx.shadowBlur = 16; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -G.t * 40;
    ctx.beginPath(); ctx.arc(A.x, A.y, A.R, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
  }
  // operator signatures
  if (G.trail.length) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < G.trail.length; i++) { const a = G.trail[i - 1], b = G.trail[i], f = 1 - (G.t - b.t) / 0.9; ctx.strokeStyle = `rgba(150,230,255,${0.55 * f})`; ctx.lineWidth = 10 * f; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  }
  if (G.bulwark) {
    const B = G.bulwark, f = Math.min(1, B.t / 0.3) * Math.min(1, (B.dur - B.t) / 0.5);
    ctx.save(); ctx.translate(B.x, B.y); ctx.rotate(G.t * 0.3); ctx.globalAlpha = f;
    ctx.fillStyle = 'rgba(160,240,255,.07)'; ctx.strokeStyle = '#bff6ff'; ctx.lineWidth = 2.5; ctx.shadowColor = CYAN; ctx.shadowBlur = 16;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * B.R, Math.sin(a) * B.R); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  // enemies and their shots sit above your own effects so they are always readable
  if (CL) {
    ctx.fillStyle = 'rgba(0,4,1,.62)'; ctx.beginPath();
    for (const e of enemies) { if (e.segs || !vis(e.x, e.y, 90)) continue; const rr = (e.elite ? e.r * 1.35 : e.r) + 7; ctx.moveTo(e.x + rr, e.y); ctx.arc(e.x, e.y, rr, 0, TAU); }
    ctx.fill();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const e of enemies) if (vis(e.x, e.y, e.segs ? (e.gap ? 520 : 200) : 90)) drawEnemy(e);
  // Kata slashes
  for (const sl of G.slashes) { const f = 1 - sl.t / 0.18; ctx.strokeStyle = sl.evo ? `rgba(127,247,255,${f})` : `rgba(240,255,248,${f})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sl.x - Math.cos(sl.a) * 20, sl.y - Math.sin(sl.a) * 20); ctx.lineTo(sl.x + Math.cos(sl.a) * 20, sl.y + Math.sin(sl.a) * 20); ctx.stroke(); }
  if (CL) { ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.beginPath(); for (const s of eshots) { if (!vis(s.x, s.y)) continue; ctx.moveTo(s.x + s.r + 4, s.y); ctx.arc(s.x, s.y, s.r + 4, 0, TAU); } ctx.fill(); }
  ctx.fillStyle = '#ff6a86'; ctx.shadowColor = HOT; ctx.shadowBlur = 10;
  ctx.beginPath(); for (const s of eshots) { if (!vis(s.x, s.y)) continue; const rr = s.r * (CL ? 1.3 : 1); ctx.moveTo(s.x + rr, s.y); ctx.arc(s.x, s.y, rr, 0, TAU); } ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); for (const s of eshots) { if (!(s.mir || CL) || !vis(s.x, s.y)) continue; ctx.moveTo(s.x + 2, s.y); ctx.arc(s.x, s.y, 2, 0, TAU); } ctx.fill();
  ctx.shadowBlur = 0;
  // decoy
  if (G.decoy) {
    const dcy = G.decoy, f = 1 - dcy.t / dcy.dur;
    ctx.save(); ctx.translate(dcy.x, dcy.y); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(G.t * 12);
    ctx.fillStyle = '#bfe9ff'; ctx.shadowColor = '#5ad8ff'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -8); ctx.lineTo(-3, 0); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.8; ctx.strokeStyle = '#bfe9ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
  }
  // blink afterimages
  for (const g of ghosts) {
    if (g.t < 0) continue;
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.a); ctx.globalAlpha = 0.5 * (1 - g.t / 0.45);
    ctx.fillStyle = '#bfe9ff'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -8); ctx.lineTo(-3, 0); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.globalAlpha = 1;
  drawPlayer();
  // shell bubble
  if (P.shellT > G.t) {
    const rem = P.shellT - G.t, blinkOut = rem < 1 && Math.floor(G.t * 10) % 2 === 0;
    ctx.save(); ctx.translate(P.x, P.y);
  if(META.aura && AURAS[META.aura]) {ctx.strokeStyle=AURAS[META.aura].col;ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,21,0,TAU);ctx.stroke();} ctx.rotate(G.t * 0.8);
    ctx.globalAlpha = blinkOut ? 0.3 : 0.85; ctx.strokeStyle = '#7ff7ff'; ctx.lineWidth = 2; ctx.shadowColor = '#3ee8ff'; ctx.shadowBlur = 18;
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * 30, Math.sin(a) * 30); } ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = 0.12; ctx.fillStyle = '#7ff7ff'; ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
  }
  for (const z of zaps) {
    const f = 1 - z.t / z.life;
    ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = f * (z.col === HOT ? 1 : FXA); ctx.lineWidth = z.big ? 2.5 : 1.5; ctx.shadowColor = z.col || GREEN; ctx.shadowBlur = CL ? 6 : 16;
    ctx.beginPath(); ctx.moveTo(z.pts[0][0], z.pts[0][1]); for (let k = 1; k < z.pts.length; k++) ctx.lineTo(z.pts[k][0], z.pts[k][1]); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
  ctx.font = `11px ${FONT}`;
  for (const s of sparks) { ctx.globalAlpha = (1 - s.t / s.life) * (CL ? 0.45 : 1); ctx.fillStyle = s.col; ctx.fillText(s.ch, s.x, s.y); }
  if (!CL && QL < 2) for (const t of texts) { ctx.globalAlpha = 1 - t.t / 0.7; ctx.font = `${t.crit ? 20 : t.code ? 13 : 14}px VT323, ${FONT}`; ctx.fillStyle = t.code ? CYAN : t.crit ? '#ffffff' : '#c8ffe0'; ctx.fillText(t.v, t.x, t.y - t.t * 40); }
  ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'top';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!stick.on && coarse && SET.stick === 'fixed') { ctx.strokeStyle = 'rgba(0,255,106,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(SET.side === 'left' ? W - 100 : 100, H - 130, 50, 0, TAU); ctx.stroke(); }
  if (stick.on) {
    ctx.strokeStyle = 'rgba(0,255,106,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(stick.bx, stick.by, 50, 0, TAU); ctx.stroke();
    const dx = stick.x - stick.bx, dy = stick.y - stick.by, d = Math.hypot(dx, dy), m = Math.min(1, 50 / (d || 1));
    ctx.fillStyle = 'rgba(200,255,224,.55)'; ctx.beginPath(); ctx.arc(stick.bx + dx * m, stick.by + dy * m, 18, 0, TAU); ctx.fill();
  }
  const pointer = (x, y, col) => {
    const a = Math.atan2(y - P.y, x - P.x), R = Math.min(W, H) / 2 - 40, px = W / 2 + Math.cos(a) * R, py = H / 2 + Math.sin(a) * R;
    ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -8); ctx.lineTo(-4, 0); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.restore();
  };
  if (G.boss && !vis(G.boss.x, G.boss.y)) pointer(G.boss.x, G.boss.y, HOT);
  { let n = 0; for (const e of enemies) { if (n >= 6) break; if (e.mode === 1 && (e.type === 'lancer' || e.type === 'watcher') && !vis(e.x, e.y)) { pointer(e.x, e.y, e.type === 'lancer' ? '#ffffff' : HOT); n++; } } }
  for (const p of pickups) if ((p.kind === 'cache' || p.kind === 'core') && !vis(p.x, p.y) && (!p.hidden || G.sightT > G.t)) pointer(p.x, p.y, AMBER);
  if (G.traceT > G.t) for (const e of enemies) if (e.cache && !e.dead && !vis(e.x, e.y)) pointer(e.x, e.y, AMBER);
  if (G.exit && !vis(G.exit.x, G.exit.y)) pointer(G.exit.x, G.exit.y, '#ffffff');
  if (G.core && !vis(G.core.x, G.core.y)) pointer(G.core.x, G.core.y, G.core.hp < G.core.max * 0.3 ? HOT : GREEN);
  if (G.rescue) { const Q = G.rescue, tx = Q.stage === 'pod' ? Q.x : Q.ex, ty = Q.stage === 'pod' ? Q.y : Q.ey; if (!vis(tx, ty)) pointer(tx, ty, '#ffffff'); }
  if (G.trader && !vis(G.trader.x, G.trader.y)) pointer(G.trader.x, G.trader.y, AMBER);
  if (G.evt && G.evt.kind === 'beacon' && !vis(G.evt.x, G.evt.y)) pointer(G.evt.x, G.evt.y, AMBER);
  if (G.sightT > G.t) { ctx.fillStyle = 'rgba(0,255,106,.06)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(0,255,106,.08)'; for (let y = (G.t * 60) % 6; y < H; y += 6) ctx.fillRect(0, y, W, 1); }
  if (G.reflexT > G.t) { ctx.fillStyle = `rgba(230,255,240,${0.07 * Math.min(1, G.reflexT - G.t)})`; ctx.fillRect(0, 0, W, H); }
  { // hidden Caches revealed by Code Sight
    if (G.sightT > G.t) for (const p of pickups) if (p.hidden && !vis(p.x, p.y)) pointer(p.x, p.y, AMBER);
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) / 2);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (G.freezeT > G.t) { const rem = G.freezeT - G.t; ctx.fillStyle = `rgba(150,215,255,${0.12 * Math.min(1, rem)})`; ctx.fillRect(0, 0, W, H); }
  else if (G.slowT > G.t) { const rem = G.slowT - G.t; ctx.fillStyle = `rgba(150,110,255,${0.08 * Math.min(1, rem)})`; ctx.fillRect(0, 0, W, H); }
  postGlow();
}
function postGlow() {
  if (!SET.glow || (CL && state === 'play') || QL >= 2 || (QL >= 1 && state === 'play' && SET.quality === 'auto')) return;
  bctx.clearRect(0, 0, bloomCv.width, bloomCv.height); bctx.drawImage(cv, 0, 0, bloomCv.width, bloomCv.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(bloomCv, 0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawPlayer() {
  const t = G.t, blink = P.inv > 0 && P.inv < 50 && !P.leap && Math.floor(t * 20) % 2 === 0, op = G.op;
  // reflex charge ring and overdrive glow sit under the ship
  if (G.reflex > 0 || G.reflexT > t) { ctx.strokeStyle = G.reflex >= 100 ? '#ffffff' : 'rgba(200,255,224,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.x, P.y, 26, -Math.PI / 2, -Math.PI / 2 + TAU * (G.reflexT > t ? 1 : G.reflex / 100)); ctx.stroke(); }
  if (G.od) { ctx.fillStyle = 'rgba(0,255,106,.12)'; ctx.beginPath(); ctx.arc(P.x, P.y, 22 + Math.sin(t * 12) * 2, 0, TAU); ctx.fill(); }
  ctx.save(); ctx.translate(P.x, P.y);
  if (P.leap) { const f = P.leap.t / P.leap.dur, sc = 1 + Math.sin(f * Math.PI) * 0.7; ctx.scale(sc, sc); }
  ctx.globalAlpha = blink ? 0.4 : P.phaseT > t ? 0.45 : 1;
  ctx.strokeStyle = op === 'bastion' ? 'rgba(255,220,140,.7)' : op === 'hex' ? 'rgba(196,156,255,.75)' : 'rgba(0,255,106,.6)'; ctx.lineWidth = op === 'bastion' ? 2.5 : 1.5;
  ctx.beginPath(); ctx.arc(0, 0, 16, t * 2, t * 2 + 1.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 16, t * 2 + Math.PI, t * 2 + Math.PI + 1.6); ctx.stroke();
  ctx.rotate(Math.atan2(P.fy, P.fx));
  if (P.moving) {
    const flame = (G.od ? 68 : 40) + (reduced ? 0 : Math.sin(t * 28) * (G.od ? 7 : 4));
    ctx.save();
    ctx.fillStyle = G.od ? '#ffac46' : '#35d9b0';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = QL < 2 ? 16 : 0;
    ctx.globalAlpha *= .65;
    ctx.beginPath(); ctx.moveTo(-6,-6); ctx.lineTo(-6-flame,0); ctx.lineTo(-6,6); ctx.closePath(); ctx.fill();
    ctx.globalAlpha /= .65;
    ctx.fillStyle = G.od ? '#fff1b5' : '#b5fff0';
    ctx.beginPath(); ctx.moveTo(-6,-3); ctx.lineTo(-6-flame*.68,0); ctx.lineTo(-6,3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const pspr = sprReady('player-' + op) || sprReady('player');
  if (pspr) { drawSprite(pspr, 34 * ((SPRITE_OPTS['player-' + op] || SPRITE_OPTS.player || {}).scale || 1), false); ctx.restore(); }
  else {
  ctx.fillStyle = op === 'lumen' ? '#bfe9ff' : op === 'hex' ? '#e6d8ff' : '#effff5'; ctx.shadowColor = op === 'lumen' ? '#5ad8ff' : op === 'hex' ? '#a66bff' : GREEN; ctx.shadowBlur = 20;
  ctx.beginPath();
  if (op === 'lumen') { ctx.moveTo(14, 0); ctx.lineTo(-8, -6); ctx.lineTo(-2, 0); ctx.lineTo(-8, 6); }
  else if (op === 'hex') { ctx.moveTo(12, 0); ctx.lineTo(0, -9); ctx.lineTo(-9, 0); ctx.lineTo(0, 9); }
  else if (op === 'bastion') { ctx.moveTo(11, 0); ctx.lineTo(3, -9); ctx.lineTo(-8, -7); ctx.lineTo(-8, 7); ctx.lineTo(3, 9); }
  else { ctx.moveTo(12, 0); ctx.lineTo(-7, -8); ctx.lineTo(-3, 0); ctx.lineTo(-7, 8); }
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
  }
  const w = 34, f = clamp(P.hp / STAT.maxHp, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(P.x - w / 2, P.y + 24, w, 4);
  ctx.fillStyle = f < 0.3 ? HOT : GREEN; ctx.fillRect(P.x - w / 2, P.y + 24, w * f, 4);
  if (STAT.shieldMax > 0) {
    const sf = clamp(P.sh / STAT.shieldMax, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(P.x - w / 2, P.y + 30, w, 3);
    ctx.fillStyle = '#5ae8ff'; ctx.fillRect(P.x - w / 2, P.y + 30, w * sf, 3);
    if (sf > 0) { ctx.strokeStyle = `rgba(90,232,255,${0.15 + 0.35 * sf})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P.x, P.y, 20, 0, TAU); ctx.stroke(); }
  }
}
function drawEnemy(e) {
  const fl = e.hf > 0, t = G.t, slowed = e.slowT > t;
  ctx.save(); ctx.translate(e.x, e.y);
  const enemyFade = G.sector === 'blackout' && !isB(e) && !e.elite && Math.hypot(e.x-P.x,e.y-P.y)>280 ? .75 : 1;
  ctx.globalAlpha=enemyFade;
  if (e.markT > t) { ctx.strokeStyle = 'rgba(127,247,255,.75)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(0, 0, e.r + 6, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  if (e.champion) {
    ctx.font='11px '+FONT; ctx.fillStyle=AMBER; ctx.textAlign='center'; ctx.fillText('GATEKEEPER',0,-e.r-22);
    ctx.fillStyle='#261b12'; ctx.fillRect(-25,-e.r-16,50,4); ctx.fillStyle=AMBER; ctx.fillRect(-25,-e.r-16,50*clamp(e.hp/e.max,0,1),4);
  }
  if (e.elite && e.type !== 'eel') {
    ctx.strokeStyle = e.cache ? 'rgba(255,176,0,.8)' : 'rgba(255,90,120,.8)'; ctx.lineWidth = 2; ctx.shadowColor = e.cache ? AMBER : HOT; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, 0, e.r + 7 + Math.sin(t * 6) * 2, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.scale(1.35, 1.35);
  }
  if (e.type === 'ghost') {
    const seen = G.sightT > t;
    ctx.globalAlpha = enemyFade * (seen ? 1 : 0.13 + 0.07 * Math.sin(t * 5 + e.ph));
    ctx.strokeStyle = fl ? '#fff' : seen ? '#e6d8ff' : '#c49cff'; ctx.lineWidth = 1.5; ctx.fillStyle = seen ? 'rgba(60,20,90,.8)' : 'rgba(0,0,0,0)';
    ctx.beginPath(); ctx.arc(0, -2, 10, Math.PI, 0); ctx.lineTo(10, 10); for (let k = 0; k < 4; k++) ctx.lineTo(10 - (k + 0.5) * 5, k % 2 ? 10 : 5); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (seen) { ctx.font = `11px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.fillText(e.ch, 0, 0); }
    ctx.globalAlpha = enemyFade * (1); ctx.restore(); return;
  }
  const spr = (SPRITE_OK.has(e.type) || BUILD.data.enemies[e.type].spawn) && sprReady(e.type);
  if (spr) drawEnemySprite(e, spr, fl, t);
  else switch (e.type) {
    case 'warden': {
      const guard = wardenGuard(e); ctx.strokeStyle = fl ? '#fff' : guard ? '#81d9ff' : AMBER;
      ctx.fillStyle = guard ? '#102b42' : '#382819'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(16,-9); ctx.lineTo(13,10); ctx.lineTo(0,19); ctx.lineTo(-13,10); ctx.lineTo(-16,-9); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (guard) { ctx.beginPath(); ctx.arc(0,0,24,-Math.PI*.85,Math.PI*.85); ctx.stroke(); }
      ctx.fillStyle = guard ? '#81d9ff' : AMBER; ctx.font='10px '+FONT;
      ctx.fillText(guard ? '▣' : '!',0,3);
      break;
    }
    case 'bug': {
      ctx.fillStyle = fl ? '#fff' : slowed ? '#c49cff' : HOT; ctx.font = `16px ${FONT}`;
      if (Math.random() < 0.03) e.ch = pick();
      ctx.globalAlpha = enemyFade * (0.25); ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill(); ctx.globalAlpha = enemyFade * (1);
      ctx.fillText(e.ch, Math.sin(t * 20 + e.ph), 0);
      break;
    }
    case 'daemon': {
      ctx.rotate(t * 1.5 + e.ph);
      ctx.fillStyle = 'rgba(30,0,8,.85)'; ctx.strokeStyle = fl ? '#fff' : slowed ? '#c49cff' : '#ff5a7a'; ctx.lineWidth = 2;
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * 14, Math.sin(a) * 14); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.rotate(-(t * 1.5 + e.ph)); ctx.fillStyle = fl ? '#fff' : '#ff9aac'; ctx.font = `14px ${FONT}`; ctx.fillText(e.ch, 0, 1);
      break;
    }
    case 'drone': {
      ctx.rotate(Math.sin(t * 2 + e.ph) * 0.2);
      ctx.fillStyle = 'rgba(30,0,8,.9)'; ctx.strokeStyle = fl ? '#fff' : slowed ? '#c49cff' : '#ff7a5a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * 12, Math.sin(a) * 12); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-20, -4); ctx.moveTo(12, 0); ctx.lineTo(20, -4); ctx.stroke();
      ctx.fillStyle = e.st < 0.5 ? '#ffffff' : HOT; ctx.shadowColor = HOT; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(0, 1, 3, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      break;
    }
    case 'patcher': {
      if (QL < 2) { ctx.strokeStyle = 'rgba(255,176,0,.22)'; ctx.lineWidth = 1; ctx.setLineDash([3, 7]); ctx.beginPath(); ctx.arc(0, 0, 120, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = 'rgba(30,14,0,.9)'; ctx.strokeStyle = fl ? '#fff' : slowed ? '#c49cff' : AMBER; ctx.lineWidth = 2;
      ctx.fillRect(-12, -12, 24, 24); ctx.strokeRect(-12, -12, 24, 24);
      ctx.fillStyle = fl ? '#fff' : '#ffe2a8'; ctx.font = `13px ${FONT}`; ctx.fillText('[ ]', 0, 1);
      if (e.patch) { ctx.font = `11px ${FONT}`; ctx.fillStyle = AMBER; ctx.fillText('-' + FX[e.patch].fn + '()', 0, -24); }
      break;
    }
    case 'scrubber': {
      ctx.rotate(-t * 4 + e.ph);
      ctx.strokeStyle = fl ? '#fff' : slowed ? '#c49cff' : '#ffcf5a'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(30,20,0,.85)';
      ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, rr = k % 2 ? 7 : 14; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    }
    case 'lancer': {
      const a = e.mode ? Math.atan2(e.dy, e.dx) : Math.atan2(P.y - e.y, P.x - e.x), tele = e.mode === 1;
      if (tele) { ctx.save(); ctx.rotate(a); ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.4 * Math.abs(Math.sin(t * 18))})`; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(290, 0); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(40,0,10,.92)'; ctx.strokeStyle = fl || tele ? '#fff' : slowed ? '#c49cff' : '#ff5a6e'; ctx.lineWidth = 1.8; ctx.shadowColor = HOT; ctx.shadowBlur = e.mode === 2 ? 16 : 6;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -8); ctx.lineTo(-5, 0); ctx.lineTo(-10, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-2, 0); ctx.stroke();
      break;
    }
    case 'watcher': {
      const tele = e.mode === 1;
      if (tele) { ctx.save(); ctx.rotate(Math.atan2(e.dy, e.dx)); ctx.strokeStyle = `rgba(255,59,92,${0.3 + 0.5 * (1 - e.st / 0.75)})`; ctx.lineWidth = 1.5 + 2 * (1 - e.st / 0.75); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(620, 0); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = 'rgba(30,0,14,.92)'; ctx.strokeStyle = fl ? '#fff' : slowed ? '#c49cff' : '#ff4f8a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(13, 0); ctx.lineTo(0, 13); ctx.lineTo(-13, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 4.5, 0, 0, TAU); ctx.stroke();
      const la = Math.atan2(P.y - e.y, P.x - e.x);
      ctx.fillStyle = tele ? '#ffffff' : HOT; ctx.shadowColor = HOT; ctx.shadowBlur = tele ? 16 : 8; ctx.beginPath(); ctx.arc(Math.cos(la) * 3, Math.sin(la) * 2, 2.6, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      break;
    }
    case 'leaker': {
      const wob = Math.sin(t * 5 + e.ph) * 1.5;
      ctx.fillStyle = fl ? '#fff' : slowed ? 'rgba(120,80,200,.85)' : 'rgba(120,10,30,.9)'; ctx.strokeStyle = fl ? '#fff' : '#ff5a6e'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 15 + wob, 15 - wob, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff8aa0';
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + t * 0.8, dd = 17 + ((t * 14 + k * 5) % 9); ctx.beginPath(); ctx.arc(Math.cos(a) * dd, Math.sin(a) * dd, 2, 0, TAU); ctx.fill(); }
      ctx.font = `12px ${FONT}`; ctx.fillStyle = '#ffd0d8'; ctx.fillText(e.ch, 0, 1);
      break;
    }
    case 'split': {
      ctx.font = `13px ${FONT}`;
      for (let k = 0; k < 3; k++) {
        const a = t * 2.4 + e.ph + k / 3 * TAU, x = Math.cos(a) * 7, y = Math.sin(a) * 7;
        ctx.fillStyle = 'rgba(40,0,10,.9)'; ctx.strokeStyle = fl ? '#fff' : slowed ? '#c49cff' : '#ff4f8a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffb0c8'; ctx.fillText(e.ch, x, y + 1);
      }
      break;
    }
    case 'brute': {
      const s = 22;
      ctx.fillStyle = 'rgba(40,10,0,.9)'; ctx.strokeStyle = fl ? '#fff' : slowed ? '#c49cff' : ORANGE; ctx.lineWidth = 2;
      ctx.fillRect(-s, -s, s * 2, s * 2); ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.globalAlpha = enemyFade * (0.6); ctx.lineWidth = 1; ctx.beginPath();
      for (let r = -s + 11; r < s; r += 11) { ctx.moveTo(-s, r); ctx.lineTo(s, r); }
      for (let r = 0; r < 4; r++) { const off = r % 2 ? 0 : 11; for (let c = -s + off; c < s; c += 22) { ctx.moveTo(c, -s + r * 11); ctx.lineTo(c, -s + r * 11 + 11); } }
      ctx.stroke(); ctx.globalAlpha = enemyFade * (1);
      break;
    }
    case 'eel': {
      ctx.restore(); ctx.save();
      ctx.font = `14px ${FONT}`;
      const sc = e.elite ? 1.35 : 1;
      for (let k = e.segs.length - 1; k >= 0; k--) {
        const sg = e.segs[k], f = 1 - k / e.segs.length;
        ctx.globalAlpha = enemyFade * (0.35 + f * 0.65); ctx.fillStyle = fl ? '#fff' : k === 0 ? '#ffd0a0' : e.elite && e.cache ? AMBER : e.elite ? '#ff4f6a' : '#ff7a3b';
        ctx.beginPath(); ctx.arc(sg.x, sg.y, (4 + 7 * Math.sin(Math.PI * Math.min(1, (k + 2) / (e.segs.length + 1)))) * sc, 0, TAU); ctx.fill();
        ctx.fillStyle = '#200800'; ctx.fillText(sg.ch, sg.x, sg.y + 1);
      }
      ctx.globalAlpha = enemyFade * (1); ctx.fillStyle = '#fff'; ctx.shadowColor = HOT; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(e.x + Math.cos(e.a) * 6, e.y + Math.sin(e.a) * 6, 2.5, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      break;
    }
    case 'boss': {
      const r = e.r * (0.92 + 0.08 * Math.sin(t * 6)), tele = e.mode === 1;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.9);
      g.addColorStop(0, 'rgba(0,0,0,.97)'); g.addColorStop(0.5, 'rgba(0,0,0,.9)'); g.addColorStop(0.66, tele ? 'rgba(255,255,255,.6)' : 'rgba(255,40,64,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, TAU); ctx.fill();
      ctx.fillStyle = fl || tele ? '#fff' : HOT; ctx.shadowColor = HOT; ctx.shadowBlur = 16;
      ctx.fillRect(-r * 0.55, -r * 0.14, r * 0.45, r * 0.18); ctx.fillRect(r * 0.1, -r * 0.14, r * 0.45, r * 0.18); ctx.shadowBlur = 0;
      ctx.font = `14px ${FONT}`; ctx.fillStyle = '#ff8aa0';
      e.glyphs.forEach((ch, k) => { const a = t * 1.6 + k / e.glyphs.length * TAU; ctx.fillText(ch, Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25); });
      if (Math.random() < 0.1) e.glyphs[(Math.random() * e.glyphs.length) | 0] = pick();
      if (tele) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(e.dx * 300, e.dy * 300); ctx.stroke(); ctx.setLineDash([]); }
      break;
    }
    case 'auditor': {
      const w = 22, h = 44, scan = Math.sin(t * 3) * h * 0.8;
      ctx.fillStyle = 'rgba(8,0,2,.95)'; ctx.strokeStyle = fl ? '#fff' : HOT; ctx.lineWidth = 2; ctx.shadowColor = HOT; ctx.shadowBlur = 14;
      ctx.fillRect(-w, -h, w * 2, h * 2); ctx.strokeRect(-w, -h, w * 2, h * 2); ctx.shadowBlur = 0;
      ctx.font = `12px ${FONT}`; ctx.fillStyle = 'rgba(255,120,140,.7)';
      for (let k = 0; k < 7; k++) { if (Math.random() < 0.08) e.glyphs[k] = pick(); ctx.fillText(e.glyphs[k], -w * 0.5, -h + 10 + k * 12); ctx.fillText(e.glyphs[k + 7] || 'ｱ', w * 0.5, -h + 10 + k * 12); }
      ctx.fillStyle = '#fff'; ctx.shadowColor = HOT; ctx.shadowBlur = 18; ctx.fillRect(-w - 6, scan - 2, w * 2 + 12, 4); ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,59,92,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, h + 14 + Math.sin(t * 4) * 4, 0, TAU); ctx.stroke();
      break;
    }
    case 'collector': {
      ctx.restore(); ctx.save();
      ctx.font = `16px ${FONT}`;
      for (let k = e.segs.length - 1; k >= 1; k--) {
        const sg = e.segs[k], f = 1 - k / e.segs.length, rr = 8 + 14 * Math.sin(Math.PI * Math.min(1, (k + 3) / (e.segs.length + 2)));
        ctx.globalAlpha = enemyFade * (0.5 + f * 0.5); ctx.fillStyle = fl ? '#fff' : k % 2 ? '#a8401a' : '#ff7a3b'; ctx.strokeStyle = '#ff9a6a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sg.x, sg.y, rr, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#200800'; ctx.fillText(sg.ch, sg.x, sg.y + 1);
      }
      ctx.globalAlpha = enemyFade * (1);
      ctx.translate(e.x, e.y); ctx.rotate(e.a);
      const jaw = 0.35 + 0.3 * Math.abs(Math.sin(t * 6));
      ctx.fillStyle = fl ? '#fff' : '#ff8a4a'; ctx.shadowColor = ORANGE; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, e.r, jaw, TAU - jaw); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#200800'; ctx.beginPath(); ctx.arc(-4, -e.r * 0.45, 3.5, 0, TAU); ctx.arc(-4, e.r * 0.45, 3.5, 0, TAU); ctx.fill();
      ctx.rotate(-e.a); ctx.font = `12px ${FONT}`; ctx.fillStyle = AMBER; ctx.fillText('◆ ' + Math.round(e.eaten), 0, -e.r - 16);
      break;
    }
    case 'phantom': {
      const ph = e.phased, a = Math.atan2(P.y - e.y, P.x - e.x);
      ctx.globalAlpha = enemyFade * (ph ? 0.28 : 1);
      if (ph) ctx.setLineDash([5, 5]);
      ctx.strokeStyle = fl ? '#fff' : ph ? '#c49cff' : '#ff8ab0'; ctx.lineWidth = 2; ctx.fillStyle = ph ? 'rgba(0,0,0,0)' : 'rgba(40,0,30,.9)'; ctx.shadowColor = ph ? '#c49cff' : HOT; ctx.shadowBlur = ph ? 0 : 18;
      ctx.beginPath(); ctx.arc(0, -6, 22, Math.PI, 0); ctx.lineTo(22, 24); for (let k = 0; k < 6; k++) ctx.lineTo(22 - (k + 0.5) * 44 / 6, k % 2 ? 24 : 14 + Math.sin(t * 8 + k) * 3); ctx.lineTo(-22, 24); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
      ctx.fillStyle = ph ? '#c49cff' : '#ffffff'; ctx.beginPath(); ctx.arc(Math.cos(a) * 6 - 7, -6, 3, 0, TAU); ctx.arc(Math.cos(a) * 6 + 7, -6, 3, 0, TAU); ctx.fill();
      ctx.font = `13px ${FONT}`; ctx.fillStyle = ph ? 'rgba(196,156,255,.6)' : '#ffb0c8'; e.glyphs.forEach((ch, k) => { const b = t * (ph ? 2.4 : 0.9) + k / e.glyphs.length * TAU; ctx.fillText(ch, Math.cos(b) * 40, Math.sin(b) * 40); });
      ctx.globalAlpha = enemyFade * (1);
      break;
    }
    case 'mirror': {
      const a = Math.atan2(P.y - e.y, P.x - e.x), fl2 = Math.random() < 0.06;
      ctx.font = `13px ${FONT}`; ctx.fillStyle = 'rgba(255,140,160,.7)';
      e.glyphs.forEach((ch, k) => { const b = -t * 1.2 + k / e.glyphs.length * TAU; ctx.fillText(ch, Math.cos(b) * 46, Math.sin(b) * 46); });
      ctx.rotate(a); ctx.scale(2.4, 2.4);
      ctx.fillStyle = fl || fl2 ? '#ffffff' : '#ffd6de'; ctx.strokeStyle = HOT; ctx.lineWidth = 1; ctx.shadowColor = HOT; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -8); ctx.lineTo(-3, 0); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.globalAlpha = enemyFade * (0.35); ctx.translate(-4 + Math.sin(t * 9) * 2, 0); ctx.strokeStyle = '#7ff7ff'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -8); ctx.lineTo(-3, 0); ctx.lineTo(-7, 8); ctx.closePath(); ctx.stroke(); ctx.globalAlpha = enemyFade * (1);
      break;
    }
    case 'root': {
      const r = e.r, tele = e.mode === 1;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
      g.addColorStop(0, 'rgba(0,0,0,.98)'); g.addColorStop(0.45, 'rgba(10,0,0,.9)'); g.addColorStop(0.6, tele ? 'rgba(255,255,255,.55)' : 'rgba(255,90,40,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, TAU); ctx.fill();
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        ctx.save(); ctx.rotate(t * (0.6 + k * 0.35) * (k % 2 ? -1 : 1));
        const s = r * (0.5 + k * 0.28);
        ctx.strokeStyle = fl || tele ? '#ffffff' : k % 2 ? ORANGE : HOT; ctx.globalAlpha = enemyFade * (0.9 - k * 0.15); ctx.shadowColor = HOT; ctx.shadowBlur = 12;
        ctx.strokeRect(-s, -s, s * 2, s * 2); ctx.restore();
      }
      ctx.globalAlpha = enemyFade * (1); ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = HOT; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(0, 0, 7 + Math.sin(t * 8) * 2, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = `15px ${FONT}`; ctx.fillStyle = '#ffb08a';
      e.glyphs.forEach((ch, k) => { const a = -t * 0.9 + k / e.glyphs.length * TAU; ctx.fillText(ch, Math.cos(a) * r * 1.75, Math.sin(a) * r * 1.75); });
      if (Math.random() < 0.15) e.glyphs[(Math.random() * e.glyphs.length) | 0] = pick();
      if (tele) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(e.dx * 360, e.dy * 360); ctx.stroke(); ctx.setLineDash([]); }
      break;
    }
    default: drawCustomEnemy(e, fl, slowed);
  }
  ctx.restore();
  if (e.conv > 0 && !(e.ally > t)) { ctx.strokeStyle = GREEN; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.35 + 12, -Math.PI / 2, -Math.PI / 2 + TAU * e.conv / 5); ctx.stroke(); }
  if (e.ally > t) { ctx.strokeStyle = e.hexed ? '#c49cff' : GREEN; ctx.lineWidth = 2; ctx.shadowColor = GREEN; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0; }
  else if (G.freezeT > t) { ctx.strokeStyle = 'rgba(190,240,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.rect(e.x - e.r - 4, e.y - e.r - 4, (e.r + 4) * 2, (e.r + 4) * 2); ctx.stroke(); }
  if ((e.type === 'brute' || e.type === 'eel' || e.elite) && e.hp < e.max) {
    const w = e.elite ? 44 : 30, y = e.y - e.r * (e.elite ? 1.4 : 1) - 12;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - w / 2, y, w, 3);
    ctx.fillStyle = e.cache ? AMBER : e.type === 'brute' ? ORANGE : HOT; ctx.fillRect(e.x - w / 2, y, w * clamp(e.hp / e.max, 0, 1), 3);
  }
}

