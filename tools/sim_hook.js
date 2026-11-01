// ---- test bot (tools/sim.py): only present in dist/sim.html, never in the shipped game ----
window.__sim = {
  ev(c) { return eval(c); },
  start(mode) { const mm = (mode || 'full').split(':'); META.mode = mm[0]; META.proto = +(mm[1] || 0); META.protoMax = 5; META.op = mm[2] || 'signal'; META.totalKills = 1e6; META.bossKills = 99; META.rootKills = 9; sfx.init = () => {}; newRun(); state = 'simpause'; $('title') && ($('title').hidden = true); },
  run(secs) {
    const dt = 1 / 30; const n = Math.round(secs / dt);
    state = 'play'; G.revives = 999;
    for (let i = 0; i < n; i++) {
      if (state === 'play' && (openSectorChoice() || openDiscoveryChoice())) {}
      if (state === 'discovery') { chooseDiscovery(0); continue; }
      if (state === 'sector') { chooseSector(Object.keys(SECTORS)[(Math.random()*3)|0]); continue; }
      if (state === 'editor') {
        for (let g = 0; g < 6; g++) { const t = Object.keys(G.inv.t)[0], f = Object.keys(G.inv.f)[0]; if (!t || !f) break; G.sel.t = t; G.sel.f = f; G.sel.k = Object.keys(G.inv.k)[0] || null; const id = Object.keys(P.W).find(w => (P.code[w]||[]).length < lineCap(w)); if (!id) break; edInstall(id, null); }
        if (Object.keys(G.inv.k).length) { const ln = Object.values(P.code).flat().find(L => !L.k); if (ln) { G.sel.t = G.sel.f = null; G.sel.k = Object.keys(G.inv.k)[0]; const w = Object.keys(P.code).find(w => P.code[w].includes(ln)); edInstall(w, P.code[w].indexOf(ln)); } }
        closeEditor(); continue;
      }
      if (state === 'level') {
        const score = o => o.kind === 'p' && Object.keys(P.W).some(w => EVO[w].need === o.id) ? 3.5 : o.kind === 'w' && P.W[o.id] ? 5 : o.kind === 'w' ? 4 : o.kind === 'p' && ['might', 'vital', 'cool', 'area'].includes(o.id) ? 2.5 : o.kind === 'x' ? 2 : o.kind === 'c' ? (window.__noCode ? 0 : o.up ? 3 : 4.5) : 1;
        let bi = 0; curOffers.forEach((o, i) => { if (score(o) > score(curOffers[bi])) bi = i; }); choose(bi);
      }
      if (state === 'over') break;
      // bot: kite away from the local crowd, strafing around it
      let cx = 0, cy = 0, c = 0;
      for (const e of enemies) { const dx = e.x - P.x, dy = e.y - P.y, d2 = dx * dx + dy * dy; if (d2 < 260 * 260) { const w = 1 / (d2 + 400); cx += dx * w; cy += dy * w; c++; } }
      let mx, my;
      if (c) { const d = Math.hypot(cx, cy) || 1; mx = -cx / d * 0.7 - cy / d * 0.7; my = -cy / d * 0.7 + cx / d * 0.7; }
      else { const a = G.t * 0.4; mx = Math.cos(a); my = Math.sin(a); }
      // collect: head for the nearest shard when nothing is right on top of us
      let close = 0; for (const e of enemies) if ((e.x - P.x) ** 2 + (e.y - P.y) ** 2 < 120 * 120) close++;
      if (close < 3) { let g = null, bd = 420 * 420; for (const gm of gems) { const q = (gm.x - P.x) ** 2 + (gm.y - P.y) ** 2; if (q < bd) { bd = q; g = gm; } } if (g) { const d = Math.sqrt(bd) || 1; mx = mx * 0.35 + (g.x - P.x) / d * 0.65; my = my * 0.35 + (g.y - P.y) / d * 0.65; } }
      for (const p of pickups) { const dx = p.x - P.x, dy = p.y - P.y, d = Math.hypot(dx, dy); if (d < 300 && (p.kind === 'cache' || p.kind === 'core')) { mx = dx / d; my = dy / d; } }
      stick.on = true; stick.bx = 0; stick.by = 0; stick.x = mx * 50; stick.y = my * 50;
      if (G.exit && !window.__simExit) G.exit = null;
      if (G.opCharge >= 100 && window.__simOp) { state = 'play'; G.opCharge = 0; G.opCalls++; P.hp = Math.min(STAT.maxHp, P.hp + STAT.maxHp * 0.4); }
      update(dt);
      for (const p of G.pw) if (p.cd <= 0 && enemies.length > 30) { try { usePower && usePower(G.pw.indexOf(p)); } catch (_) {} }
    }
    const used = 999 - G.revives; state = state === 'over' ? 'over' : 'simpause'; stick.on = false;
    return { t: Math.round(G.t), lv: G.level, kills: G.kills, deaths: used, en: enemies.length, threat: +(G.threat || 1).toFixed(2), hp: Math.round(P.hp), W: Object.keys(P.W).map(k => k + P.W[k].lvl + (P.evo[k] ? '*' : '')).join(' '), op: G.opCalls, frag: Math.round((G.kills / 12 + G.t * G.pace / 6 + G.bossKills * 30 + G.elites * 8) * G.PM.frag), bosses: G.bossKills, root: !!G.rootDeleted, Pv: Object.keys(P.Pv).map(k => k + P.Pv[k]).join(' '), evo: Object.keys(P.evo).length, relics: Object.keys(G.relics || {}).length, spec: G.specialization || null, code: Object.keys(P.code).map(k => k + ':' + P.code[k].map(L => L.t + '>' + L.f + (L.k ? '?' + L.k : '') + (L.r+1) + '=' + Math.round(L.dmg/1000)+'k').join(',')).join(' '), inv: invN('t') + '/' + invN('f'), calls: G.codeFires, codePct: Math.round(100 * (G.dmg.code||0) / (Object.values(G.dmg).reduce((a,b)=>a+b,0)||1)) };
  }
};
