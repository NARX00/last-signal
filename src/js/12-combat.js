// ================= combat =================
function hurt(e, base, kx = 0, ky = 0, quiet = false) {
  if (e.dead || e.ally > G.t) return;
  if (e.phased) { if (!quiet && Math.random() < 0.1) addText(e.x, e.y - e.r, 'immune', false); return; }
  const za = G.anoms.length ? anomAt(e.x, e.y) : null;
  let d = base * STAT.dmg * (za && za.kind === 'amplify' ? 1.6 : 1) * (G.od ? 1.25 : 1) * (G.sightT > G.t ? 1.2 : 1); const crit = Math.random() < STAT.crit; if (crit) d *= 2;
  if(G.specialization==='gunslinger'){if(WDEF[DSRC])d*=1.15;else if(DSRC==='code')d*=.85;}
  if(G.specialization==='codebreaker'){if(DSRC==='code')d*=1.25;else if(WDEF[DSRC])d*=.9;}
  if(e.rival && e.counter===DSRC) d*=.65;
  if (wardenGuard(e)) d *= .45;
  if (G.freezeT > G.t) d *= 1.3;
  if (e.markT > G.t) d *= 1.35;
  if (DSRC === 'code' && CODE_L && (e.patch === CODE_L.f || (e.patchT > G.t && e.patchF === CODE_L.f))) { d *= e.patch ? 0.1 : 0.4; if (Math.random() < 0.08) addText(e.x, e.y - e.r - 8, 'patched', false); }
  { const dealt = Math.min(d, Math.max(0, e.hp)); if (G.dmg) G.dmg[DSRC] = (G.dmg[DSRC] || 0) + dealt; if (DSRC === 'code' && CODE_L) CODE_L.dmg += dealt; }
  e.hp -= d; e.hf = 0.1;
  const heavy = isB(e) || e.elite;
  // knockback has a short immunity window so repeated rings can't pin enemies off-screen forever
  if ((kx || ky) && !(e.kbT > G.t)) { const kr = (heavy ? 0.1 : 1) * (e.kbr || 1); e.kx += kx * kr; e.ky += ky * kr; e.kbT = G.t + 0.9; }
  if (!quiet || crit) addText(e.x, e.y - e.r, Math.round(d), crit);
  sfx.hit(crit);
  const src = DSRC, coded = src !== 'code' && P.code[src], dead = e.hp <= 0;
  if (dead) kill(e);
  if (coded && !G.ending) { codeEvent(src, 'hit', e); if (crit) codeEvent(src, 'crit', e); if (dead) codeEvent(src, 'kill', e); DSRC = src; }
}
function kill(e) {
  if (e.dead) return;
  if(e.rival && G.rival.stage===1) {retreatRival(e);return;}
  if(e.rival) {G.rival.won=true; G.discoveryQueue.push('rival'); banner('Nemesis deleted','Its signature is yours','gold');}
  e.dead = true; G.kills++;
  if(e.rival) {ctx.font='11px '+FONT;ctx.fillStyle='#d4a1ff';ctx.textAlign='center';ctx.fillText(e.counter ? 'NEMESIS / RESISTS '+(WDEF[e.counter]?.name || e.counter) : 'NEMESIS / SCOUT',0,-e.r-32);}
  if (e.champion) { G.openingChampionWon=true; banner('Gatekeeper deleted','First cache secured','gold'); }

  burst(e.x, e.y, e.type === 'root' ? 120 : isB(e) ? 70 : e.elite ? 24 : e.type === 'bug' ? 4 : 9, e.cache ? AMBER : e.type === 'brute' ? ORANGE : HOT);
  sfx.kill(isB(e) || e.elite || e.rival);
  if (P.evo.well && G.t - e.inWell < 0.3) P.hp = Math.min(STAT.maxHp, P.hp + 1);
  if (e.type === 'root') {
    G.boss = null; $('bossbar').hidden = true; G.bossKills++;
    rings.push({ x: e.x, y: e.y, r: 0, max: 900, w: 40, dmg: 0, hit: new Set(), t: 0, col: '#ffffff' });
    shake = 30; sfx.boom(); banner('Root Process', 'Deleted', 'gold');
    enemies.forEach(o => { if (!o.dead && o !== e) { o.dead = true; burst(o.x, o.y, 3, HOT); } });
    P.inv = 999; G.ending = true; G.won = true; G.rootDeleted = true; G.evt = null; G.evtTxt = '';
    openExit(e.x, e.y, 'root');
    return;
  }
  if (isB(e)) {
    queueSectorReward(e.type);
    G.boss = enemies.find(o => o !== e && !o.dead && isB(o)) || null; $('bossbar').hidden = !G.boss; G.bossKills++;
    if (!G.training) META.bossSeen = Object.assign({}, META.bossSeen, { [e.type]: 1 });
    if (e.type === 'mirror' && !META.ranks.evo3 && !G.evoBonus) { G.evoBonus = true; setTimeout(() => { if (G && state === 'play') banner('Mirror broken', 'Third evolution unlocked', 'gold'); }, 1400); } if (G.hits === e.hitsAt) G.clean[e.type] = true;
    pickups.push({ x: e.x, y: e.y, kind: e.type === 'auditor' ? 'cache' : 'core', t: 0 });
    rings.push({ x: e.x, y: e.y, r: 0, max: 420, w: 30, dmg: 0, hit: new Set(), t: 0, col: HOT });
    shake = Math.max(shake, 22); sfx.boom(); haptic('notify', 'success', 0); hitStop = Math.max(hitStop, 0.2); banner(BOSSINFO[e.type].name, 'Deleted', 'gold');
    for (let i = 0; i < 24; i++) dropGem(e.x + rand(-60, 60), e.y + rand(-60, 60), 5);
    if (e.type === 'collector' && e.eaten) { const n = Math.min(40, Math.ceil(e.eaten / 4)), v = e.eaten * 1.5 / n; for (let i = 0; i < n; i++) dropGem(e.x + rand(-120, 120), e.y + rand(-120, 120), v); relay(RELAY.collectorDown); }
    else relay(pickL(RELAY.down));
    G.marks = []; G.erings = []; G.pools = [];
    if (!G.daily && !G.training && !(G.CH && G.CH.goal !== 'root')) openExit(e.x, e.y, 'boss');
    return;
  }
  if (e.type === 'leaker' && G.pools.length < 50) G.pools.push({ x: e.x, y: e.y, t: 0, dur: 3, R: 46, dmg: e.dmg });
  if (e.type === 'split') for (let k = 0; k < 3; k++) { const b = spawn('bug', e.x + rand(-14, 14), e.y + rand(-14, 14)); b.kx = rand(-160, 160); b.ky = rand(-160, 160); }
  // every other elite carries a Cache, so free upgrades and evolutions stay special
  if (e.elite) { G.elites++; hitStop = Math.max(hitStop, 0.06); if (e.cache) pickups.push({ x: e.x, y: e.y, kind: 'cache', t: 0 }); else for (let k = 0; k < 6; k++) dropGem(e.x + rand(-30, 30), e.y + rand(-30, 30), e.xp / 6); }
  dropGem(e.x, e.y, e.xp);
  const r = Math.random() / STAT.luck;
  const kind = r < 0.006 ? 'heal' : r < 0.009 ? 'magnet' : r < 0.0105 ? 'purge' : r < 0.0135 && G.pw.length ? 'cell' : null;
  if (kind) dropHelper(e.x, e.y, kind);
}
// Helpers are kept scarce: a cooldown per kind, at most 4 on the field, and they expire if ignored
const HELP_CD = { heal: 14, magnet: 30, purge: 45, cell: 20 };
function dropHelper(x, y, kind) {
  if ((G.dropCd[kind] || 0) > G.t) return;
  if (kind === 'heal' && (G.mods.drought || (P.hp >= STAT.maxHp * 0.9 && Math.random() < 0.7))) return;
  let n = 0; for (const p of pickups) if (HELP_CD[p.kind]) { n++; if (p.kind === kind) return; }
  if (n >= 4) return;
  G.dropCd[kind] = G.t + HELP_CD[kind];
  pickups.push({ x, y, kind, t: 0 });
}
function dropGem(x, y, v) {
  if (gems.length > 420) { const g = gems[(Math.random() * gems.length) | 0]; g.v += v; return; }
  gems.push({ x, y, v, mag: false });
}
function damagePlayer(d, src) {
  if (P.inv > 0 || state !== 'play' || P.shellT > G.t) return;
  if (src && P.phaseT > G.t) return;
  if (G.training) return;
  if (G.od) { G.od = false; G.runT = 0; }
  d = Math.max(1, d - STAT.armor);
  if (src && G.op === 'lumen' && P.moving) d *= 0.35;   // Lumen shrugs off most of any touch while moving
  P.inv = 0.5; P.lastHit = G.t; shake = Math.max(shake, 7); G.hitBy = src && src.type ? src.type : 'shot or hazard'; (G.hitTally = G.hitTally || {})[G.hitBy] = (G.hitTally[G.hitBy] || 0) + 1;
  if (src && STAT.thorns && !src.dead) { DSRC = 'thorns'; const dx = src.x - P.x, dy = src.y - P.y, dd = Math.hypot(dx, dy) || 1; hurt(src, STAT.thorns, dx / dd * 260, dy / dd * 260); }
  if (P.sh > 0) { const a = Math.min(P.sh, d); P.sh -= a; d -= a; sfx.hit(); if (d <= 0) return; }
  P.hp -= d; sfx.hurt(); haptic('impact', 'light', 250); G.hits++; if (P.hp > 0) codeHurt(src); if (G.firstHit < 0) G.firstHit = G.t;
  if (P.hp < STAT.maxHp * 0.25 && P.hp > 0 && G.t - G.lowT > 45) { G.lowT = G.t; relay(pickL(RELAY.low), true); }
  $('hurtfx').style.opacity = '1'; setTimeout(() => { $('hurtfx').style.opacity = P && P.hp < STAT.maxHp * 0.3 ? '0.45' : '0'; }, 160);
  if (P.hp <= 0) {
    if (G.revives > 0) {
      G.revives--; G.failovers = (G.failovers || 0) + 1; P.hp = STAT.maxHp * 0.5; P.inv = 2.5;
      rings.push({ x: P.x, y: P.y, r: 0, max: 520, w: 30, dmg: 400, hit: new Set(), t: 0, col: '#ffffff', kb: 600, follow: true });
      shake = 20; sfx.evolve(); banner('Failover', 'Signal restored', 'gold');
    } else { P.hp = 0; endRun(false); }
  }
}
function openCache(core) {
  const ready = Object.keys(EVO).filter(evoReady);
  if (core) P.hp = STAT.maxHp;
  if (ready.length) {
    const id = ready[0]; P.evo[id] = true; if (!G.training) META.evoSeen = Object.assign({}, META.evoSeen, { [id]: 1 });
    sfx.evolve(); shake = Math.max(shake, 10); hitStop = Math.max(hitStop, 0.12); banner('Evolved', EVO[id].name, 'gold');
    rings.push({ x: P.x, y: P.y, r: 0, max: 360, w: 24, dmg: 60, hit: new Set(), t: 0, col: CYAN, kb: 300, follow: true });
    if (core) G.pending += 1;
    renderSlots(); relay(pickL(RELAY.evolve));
  } else {
    G.pending += core ? 2 : 1; sfx.pickup();
    const capped = Object.keys(P.evo).length >= evoCap();
    banner('Cache opened', (core ? 'Two upgrades' : 'Upgrade') + (capped ? ' · evolutions full' : ''), 'gold');
  }
}

